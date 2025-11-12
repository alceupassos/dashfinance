# Integração Omie + Supabase

Este documento descreve como usar a integração entre a API Omie e o Supabase para sincronizar dados de clientes e ERP.

## Configuração Inicial

### 1. Variáveis de Ambiente

Certifique-se de que seu arquivo `.env.local` contém:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Estrutura do Banco de Dados

As seguintes tabelas foram criadas no Supabase:

#### `erp_tokens`
Armazena as credenciais de acesso aos ERPs (Omie, Bling, F360, etc).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| company_name | TEXT | Nome da empresa |
| erp_type | TEXT | Tipo de ERP (omie, bling, f360, outros) |
| app_key | TEXT | App Key do ERP |
| app_secret | TEXT | App Secret do ERP |
| cnpj | TEXT | CNPJ da empresa |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Data de atualização |

#### `omie_clients`
Armazena clientes sincronizados do Omie.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| omie_id | BIGINT | ID do cliente no Omie |
| company_name | TEXT | Nome da empresa (FK virtual para erp_tokens) |
| cnpj | TEXT | CNPJ do cliente |
| razao_social | TEXT | Razão social |
| nome_fantasia | TEXT | Nome fantasia |
| email | TEXT | Email |
| telefone | TEXT | Telefone |
| endereco | TEXT | Endereço completo |
| cidade | TEXT | Cidade |
| estado | TEXT | Estado (UF) |
| cep | TEXT | CEP |
| status | TEXT | Status (ativo/inativo) |
| synced_at | TIMESTAMPTZ | Data da última sincronização |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Data de atualização |

#### `omie_contas_receber`
Armazena contas a receber do Omie.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| omie_id | BIGINT | ID da conta no Omie |
| company_name | TEXT | Nome da empresa |
| codigo_cliente_omie | BIGINT | ID do cliente no Omie |
| nome_cliente | TEXT | Nome do cliente |
| numero_documento | TEXT | Número do documento |
| tipo_documento | TEXT | Tipo do documento |
| valor_documento | NUMERIC(15,2) | Valor do documento |
| valor_pago | NUMERIC(15,2) | Valor pago |
| data_vencimento | DATE | Data de vencimento |
| data_emissao | DATE | Data de emissão |
| data_previsao | DATE | Data de previsão |
| status_titulo | TEXT | Status do título |
| observacao | TEXT | Observações |
| synced_at | TIMESTAMPTZ | Data da última sincronização |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Data de atualização |

## Scripts Disponíveis

### 1. Criar Tabelas no Supabase
```bash
cd finance-oraculo-frontend
npx tsx scripts/setup-db-postgres.ts
```
Cria todas as tabelas necessárias no banco de dados Supabase.

**Nota:** Se o script não conseguir executar via RPC, você pode aplicar a migração manualmente:
```bash
cd finance-oraculo-backend
supabase migration list
# A migração create_omie_integration_tables já foi aplicada
```

### 2. Testar Conexão Supabase
```bash
cd finance-oraculo-frontend
npx tsx scripts/test-supabase.ts
```
Valida a conexão com o Supabase e verifica se as tabelas foram criadas corretamente.

### 3. Testar API Omie
```bash
cd finance-oraculo-frontend
npx tsx scripts/test-omie.ts
```
Testa a conexão com a API Omie usando as credenciais configuradas e exibe estatísticas.

### 4. Importar Tokens e Sincronizar Clientes
```bash
cd finance-oraculo-frontend
npx tsx scripts/omie-import.ts
```
- Importa os tokens do Omie para a tabela `erp_tokens`
- Sincroniza todos os clientes do Omie para a tabela `omie_clients`
- Usa upsert, então pode ser executado múltiplas vezes sem duplicação

## Uso do Cliente Supabase no Código

### Cliente Básico (Browser)
```typescript
import { supabase } from '@/lib/supabaseClient';

// Buscar todos os clientes
const { data: clients, error } = await supabase
  .from('omie_clients')
  .select('*')
  .eq('company_name', 'MANA POKE HOLDING LTDA');
```

### Cliente Admin (Server-side)
```typescript
import { createAdminClient } from '@/lib/supabaseClient';

const adminClient = createAdminClient();

// Inserir novos tokens
const { data, error } = await adminClient
  .from('erp_tokens')
  .insert({
    company_name: 'Nova Empresa',
    erp_type: 'omie',
    app_key: 'xxx',
    app_secret: 'yyy',
    cnpj: '00000000000000'
  });
```

## Segurança

- **Row Level Security (RLS)** está habilitado em todas as tabelas
- Apenas o `service_role` tem acesso total aos dados
- As chaves de API Omie são armazenadas de forma segura na tabela `erp_tokens`
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no código client-side

## Estrutura de Arquivos

```
finance-oraculo-frontend/
├── lib/
│   └── supabaseClient.ts          # Cliente Supabase configurado
├── scripts/
│   ├── setup-db-postgres.ts       # Script para criar tabelas
│   ├── test-supabase.ts           # Teste de conexão Supabase
│   ├── test-omie.ts               # Teste de integração Omie
│   └── omie-import.ts             # Importação de tokens e sincronização

finance-oraculo-backend/
└── supabase/
    └── migrations/
        └── [timestamp]_create_omie_integration_tables.sql
```

## Empresas Configuradas

Atualmente, as seguintes empresas estão configuradas para sincronização:

1. **MANA POKE HOLDING LTDA**
2. **MED SOLUTIONS S.A. - SKY DERM**
3. **BRX IMPORTADORA - 0001-20 (ASR NEGOCIOS)**
4. **BEAUTY SOLUTIONS COMERCIO DE PRODUTOS COSMETICOS E CORRELATOS S.A.**
5. **KDPLAST**
6. **HEALTH PLAST**
7. **ORAL UNIC**

## Status da Integração

### ✅ Implementado
- [x] Tabelas criadas no Supabase
- [x] Cliente Supabase (browser e admin)
- [x] Scripts de teste e importação
- [x] Sincronização de clientes Omie
- [x] RLS habilitado para segurança

### ⚠️ Problemas Conhecidos
- **Omie API retornando 404**: Alguns endpoints da API Omie estão retornando 404
  - Endpoint testado: `/geral/clientes/` (ListarClientes) - ✅ Funcional
  - Endpoint com problema: `/financas/contacorrentelancamentos/` (ListarMovimentos) - ❌ 404
  - **Solução**: Usar endpoints alternativos ou consultar suporte Omie

### 🔄 Próximos Passos
- [ ] Implementar sincronização de contas a receber (quando API estiver disponível)
- [ ] Criar dashboard para visualização dos dados
- [ ] Adicionar paginação completa para sincronizar todos os clientes
- [ ] Implementar sincronização incremental (apenas mudanças)
- [ ] Adicionar logs de sincronização
- [ ] Criar API endpoints para acesso aos dados

## Troubleshooting

### Erro: "Missing Supabase environment variables"
Verifique se o arquivo `.env.local` existe e contém todas as variáveis necessárias.

### Erro: "Could not find the table..."
As tabelas já foram criadas via migração no backend. Verifique com:
```bash
cd finance-oraculo-backend
supabase migration list
```

### Erro: "duplicate key value violates unique constraint"
Os tokens já foram importados. Isso é esperado na segunda execução (upsert funciona corretamente).

### Erro API Omie: "404 Not Found"
Alguns endpoints da API Omie podem não estar disponíveis para todas as contas. Verifique:
1. Se o módulo está habilitado na conta Omie
2. Se as credenciais têm permissão para acessar o endpoint
3. Consulte a documentação oficial da Omie

### Erro: "SUPABASE_SERVICE_ROLE_KEY is not set"
O `service_role` key só deve ser usado em scripts server-side. Certifique-se de:
1. Ter a variável definida em `.env.local`
2. Não expor essa chave no código client-side
3. Usar apenas em scripts Node.js/Deno

## Suporte

Para problemas ou dúvidas, consulte:
- [Documentação API Omie](https://developer.omie.com.br/)
- [Documentação Supabase](https://supabase.com/docs)
- [Status do Projeto](../docs/STATUS_COMPLETO_20250115.md)

## Changelog

### 2025-01-15
- ✅ Criação inicial da integração
- ✅ Tabelas criadas no Supabase
- ✅ Scripts de teste e importação implementados
- ✅ Sincronização de clientes funcionando
- ⚠️ Identificado problema com endpoint de movimentos (404)

