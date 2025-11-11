# Lógica de Importação de Dados do ERP F360

Este documento descreve a lógica de importação de dados do ERP F360 para o nosso sistema DashFinance. A importação é gerenciada por uma Edge Function no Supabase chamada `sync-f360`, que consulta endpoints da API F360, mapeia os dados e os armazena no nosso banco de dados.

## Visão Geral do Processo
1. **Consulta de Integrações:** A função consulta a tabela `integration_f360` para obter tokens criptografados de clientes.
2. **Descriptografia:** Tokens são descriptografados usando chaves de segurança (PGP).
3. **Fetch de Dados:** Para cada cliente, faz chamadas paginadas à API F360 usando o token.
4. **Mapeamento:** Transações são mapeadas para entradas de DRE (Demonstrativo de Resultado do Exercício) e Cashflow.
5. **Upsert no Banco:** Dados mapeados são inseridos/atualizados nas tabelas `dre_entries` e `cashflow_entries` (ou equivalentes).
6. **Tratamento de Erros:** Registra falhas e continua com os próximos clientes.

A função é projetada para ser idempotente, evitando duplicatas via chaves únicas (ex: CNPJ + data da transação).

## Importação inicial via CSV

Para popular ou atualizar os tokens F360 vindos do ERP, utilize o arquivo `CLIENTES_F360_com_TOKEN.csv` e execute o script `scripts/import-f360-clients.mjs`.

1. Exporte as credenciais necessárias:
   ```bash
   export SUPABASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
   export APP_KMS="<chave_kms>"
   ```
2. Rode a rotina (modo dry-run opcional):
   ```bash
   node scripts/import-f360-clients.mjs            # executa a sincronização
   node scripts/import-f360-clients.mjs --dry-run  # apenas simula/loga sem gravar
   ```

O script chama duas RPCs criadas para este fluxo:

- `sync_cliente_identifiers_from_csv`: atualiza (ou cria) registros na tabela `clientes`, preenchendo campos `cnpj`, `token_f360` e `token_status`.
- `upsert_integration_f360_company`: criptografa o token com `APP_KMS` e mantém a tabela `integration_f360` com uma linha por empresa (suportando agrupamentos como Grupo Volpe).

Ao final, é exibido um resumo com contagem de empresas por token, facilitando a conferência de agrupamentos.

## Endpoints da API F360 Utilizados
Baseado na integração padrão com F360, usamos os seguintes endpoints (assumindo API v2 ou similar; confirme com documentação oficial da F360):

- **Endpoint Principal de Transações:** 
  - `GET /api/transactions` (ou `/api/financial-entries`)
  - Parâmetros: 
    - `token`: Chave de autenticação do cliente.
    - `cursor`: Para paginação (próxima página de resultados).
    - `limit`: Número máximo de itens por página (ex: 100).
    - `start_date` e `end_date`: Filtros opcionais para período.
  - Resposta: Array de transações com campos como `id`, `date`, `amount`, `category`, `description`, `type` (receita/despesa).

- **Endpoint de Autenticação/Validação (opcional):**
  - `POST /api/auth/validate`
  - Usado para verificar se o token é válido antes do sync.

Exemplo de chamada (via fetch):
```
fetch('https://api.f360.com.br/api/transactions?token=<TOKEN>&cursor=<CURSOR>&limit=100', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});
```

## Mapeamento de Dados
Os dados da F360 são mapeados para nossas estruturas internas. Aqui vai um exemplo de mapeamento em TypeScript (da Edge Function):

### Para DRE (mapF360ToDre)
- Entrada: Objeto `F360Transaction` { id: string, date: string, amount: number, category: string, description: string, type: 'revenue' | 'expense' }
- Saída: `DreEntry` ou null (se não mapeável)
- Lógica:
  - Se `type === 'revenue'`, mapear para `receita_bruta`.
  - Se `category` inclui 'custo', mapear para `custo_vendas`.
  - Calcular `lucro_bruto = receita_bruta - custo_vendas`.
  - Incluir campos: `cnpj`, `cliente_nome`, `periodo` (extraído de `date`).

Exemplo:
```
// ... existing code ...
function mapF360ToDre(transaction: F360Transaction, cnpj: string, nome?: string): DreEntry | null {
  if (!transaction.amount) return null;
  return {
    id: transaction.id,
    cnpj,
    cliente_nome: nome || 'Desconhecido',
    periodo: new Date(transaction.date).toISOString().slice(0,7), // YYYY-MM
    receita_bruta: transaction.type === 'revenue' ? transaction.amount : 0,
    custo_vendas: transaction.category.includes('custo') ? transaction.amount : 0,
    // ... mais campos calculados como lucro_bruto, despesas_operacionais, etc.
  };
}
// ... existing code ...
```

### Para Cashflow (mapF360ToCashflow)
- Similar ao DRE, mas focado em fluxo de caixa.
- Mapear `amount` positivo/negativo para entradas/saídas.
- Categorias: Operacional, Investimento, Financiamento.

Exemplo:
```
// ... existing code ...
function mapF360ToCashflow(transaction: F360Transaction, cnpj: string, nome?: string): CashflowEntry | null {
  if (!transaction.amount) return null;
  return {
    id: transaction.id,
    cnpj,
    cliente_nome: nome || 'Desconhecido',
    data: transaction.date,
    valor: transaction.amount,
    descricao: transaction.description,
    categoria: transaction.category, // ex: 'operacional', 'investimento'
    tipo: transaction.amount > 0 ? 'entrada' : 'saida'
  };
}
// ... existing code ...
```

## Processo de Sync (na Edge Function)
A função principal lida com requisições POST e executa o sync:

```
// ... existing code ...
serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 });

  // Consulta integrações
  const integrations = await db.from('integration_f360').select('*');

  for (const integ of integrations) {
    const token = decryptToken(integ.token_enc); // Função helper para descriptografar
    let cursor: string | undefined;
    do {
      const response = await fetchF360Data(token, cursor);
      for (const tx of response.transactions) {
        const dre = mapF360ToDre(tx, integ.cnpj, integ.cliente_nome);
        if (dre) await db.from('dre_entries').upsert(dre);

        const cashflow = mapF360ToCashflow(tx, integ.cnpj, integ.cliente_nome);
        if (cashflow) await db.from('cashflow_entries').upsert(cashflow);
      }
      cursor = response.next_cursor;
    } while (cursor);
  }

  return new Response('Sync concluído', { status: 200 });
});
// ... existing code ...
```

## Como Acionar o Sync
- **Via CURL (para testes):**
  ```
  curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/sync-f360 \
    -H "Authorization: Bearer <ANON_KEY>" \
    -H "Content-Type: application/json" \
    -d '{}'
  ```

- **Agendamento:** Pode ser integrado com Supabase Scheduler ou cron jobs para rodar diariamente.

## Notas de Segurança
- Tokens são armazenados criptografados no banco.
- Acesso à Edge Function é protegido por RLS e JWT.
- Limite paginação para evitar sobrecarga na API F360.

Para atualizações, edite a Edge Function em `finance-oraculo-backend/functions/sync-f360/index.ts` e deploy com `supabase functions deploy sync-f360`.
