# 🔍 INVESTIGAÇÃO: Grupos Empresariais com Token Compartilhado

## 🎯 PROBLEMA IDENTIFICADO

### Caso: Grupo Volpe
**Token único:** `223b065a-1873-4cfe-a36b-f092c602a03e`

**Empresas que compartilham este token:**
1. VOLPE DIADEMA (GRUPO VOLPE) - CNPJ: 00.026.888/0980-00
2. VOLPE GRAJAÚ (GRUPO VOLPE) - CNPJ: 00.026.888/0980-01
3. VOLPE POA (GRUPO VOLPE) - CNPJ: 00.026.888/0980-01
4. VOLPE SANTO ANDRÉ (GRUPO VOLPE) - CNPJ: 00.026.888/0980-01
5. VOLPE SÃO MATEUS (GRUPO VOLPE) - CNPJ: 00.026.888/0980-00

### Outros casos encontrados:
- **DEX INVEST** (lojas 392 e 393) - Token: `174d090d-50f4-4e82-bf7b-1831b74680bf`
- **AAS GONCALVES** e **AGS AUTO PECAS** - Token: `258a60f7-12bb-44c1-825e-7e9160c41c0d`
- **ACQUA MUNDI** (matriz e filial) - Token: `5440d062-b2e9-4554-b33f-f1f783a85472`

## 🔬 ANÁLISE TÉCNICA

### Como F360 funciona com tokens compartilhados

Quando um token F360 está associado a múltiplas empresas/CNPJs:

1. **Uma chamada à API retorna transações de TODAS as empresas**
2. **Cada transação vem com identificador da empresa** (campo `cnpj` ou `empresa_id`)
3. **O sistema precisa separar as transações por CNPJ**

### Estrutura da resposta F360 (provável)

```json
{
  "data": [
    {
      "id": "txn_123",
      "cnpj": "00026888098000",  // ← CAMPO CRÍTICO!
      "empresa_nome": "VOLPE DIADEMA",
      "data_vencimento": "2025-11-01",
      "valor": 15000.00,
      "tipo": "receita",
      "categoria": "Vendas"
    },
    {
      "id": "txn_124",
      "cnpj": "00026888098001",  // ← EMPRESA DIFERENTE!
      "empresa_nome": "VOLPE GRAJAÚ",
      "data_vencimento": "2025-11-01",
      "valor": 12000.00,
      "tipo": "receita",
      "categoria": "Vendas"
    }
  ],
  "next_cursor": "cursor_xyz"
}
```

## ⚠️ PROBLEMA NO CÓDIGO ATUAL

### No arquivo `scheduled-sync-erp/index.ts`:

```typescript
async function syncF360Integration(id: string, clienteNome: string, cnpj: string, token: string) {
  // Problema: Cada empresa no banco chama a API separadamente
  // com o MESMO token, resultando em:
  // 1. Múltiplas chamadas desnecessárias
  // 2. Possível duplicação de dados
  // 3. Desperdício de quota da API
  
  const response = await fetchF360Data(token, cursor);
  
  for (const transaction of response.data) {
    const dreEntry = mapF360ToDre(transaction, cnpj, clienteNome);
    // Problema: Está usando o CNPJ da integração, não o CNPJ da transação!
  }
}
```

### Consequências:

1. **5 chamadas à API** (uma por empresa do Grupo Volpe)
2. **Dados duplicados** (cada chamada retorna as mesmas transações)
3. **Dados misturados** (transações de uma empresa podem ficar marcadas com CNPJ de outra)

## ✅ SOLUÇÃO PROPOSTA

### Opção 1: Agrupar por Token (Recomendada) 🌟

**Estratégia:**
1. Buscar integrações do banco
2. **Agrupar por token** (tokens iguais = uma chamada só)
3. Chamar API F360 uma vez por token
4. Separar transações pelo CNPJ retornado pela API
5. Salvar cada transação com o CNPJ correto

**Benefícios:**
- ✅ Uma chamada à API por token
- ✅ Sem duplicação
- ✅ CNPJ correto de cada transação
- ✅ Economia de quota da API
- ✅ Performance melhor

### Opção 2: Adicionar campo `grupo_token` e processar em lote

**Modificar tabela:**
```sql
alter table integration_f360 
add column grupo_token text,
add column is_token_principal boolean default true;
```

**Marcar tokens compartilhados:**
```sql
update integration_f360 
set grupo_token = 'GRUPO_VOLPE'
where cnpj like '00026888098%';
```

## 🔧 IMPLEMENTAÇÃO DA SOLUÇÃO

### Mudanças necessárias:

1. **Modificar interface F360Transaction:**
```typescript
interface F360Transaction {
  cnpj?: string;  // CNPJ vem da API
  empresa_id?: string;  // Ou ID da empresa
  data_vencimento: string;
  valor: number;
  tipo: 'receita' | 'despesa' | 'custo';
  categoria: string;
  descricao?: string;
  data_pagamento?: string;
}
```

2. **Modificar lógica de sincronização:**
```typescript
// Agrupar integrações por token
const tokenGroups = new Map<string, Array<{id, cnpj, nome}>>();

for (const integration of f360Integrations) {
  const token = await decryptToken(integration.id);
  if (!tokenGroups.has(token)) {
    tokenGroups.set(token, []);
  }
  tokenGroups.get(token).push({
    id: integration.id,
    cnpj: integration.cnpj,
    nome: integration.cliente_nome
  });
}

// Processar um token por vez
for (const [token, empresas] of tokenGroups) {
  const response = await fetchF360Data(token);
  
  for (const transaction of response.data) {
    // Usar CNPJ que vem da transação, não da integração!
    const cnpjTransacao = onlyDigits(transaction.cnpj || '');
    
    // Encontrar empresa correspondente
    const empresa = empresas.find(e => e.cnpj === cnpjTransacao);
    
    const dreEntry = mapF360ToDre(
      transaction, 
      cnpjTransacao,
      empresa?.nome || 'Desconhecido'
    );
  }
}
```

## 📊 IMPACTO

### Antes da correção:
- Grupo Volpe: **5 chamadas à API** (uma por empresa)
- Total para todos os grupos: **~20-25 chamadas**

### Depois da correção:
- Grupo Volpe: **1 chamada à API** (token único)
- Total para todos os grupos: **~10-15 chamadas**

**Redução: ~50% nas chamadas à API!**

## 🧪 TESTE NECESSÁRIO

Para implementar corretamente, precisamos:

1. **Verificar estrutura real da API F360:**
   - Como o CNPJ vem nos dados?
   - Qual campo identifica a empresa?
   - Há algum filtro por CNPJ na API?

2. **Testar com token do Grupo Volpe:**
   ```bash
   curl -X GET "https://api.f360.com.br/v1/lancamentos" \
     -H "Authorization: Bearer 223b065a-1873-4cfe-a36b-f092c602a03e"
   ```

3. **Validar separação:**
   - Confirmar que transações são corretamente separadas por CNPJ
   - Validar que nenhuma transação fica órfã

## 🎯 PRÓXIMOS PASSOS

1. ✅ Documentar o problema (este arquivo)
2. ⏳ Consultar documentação da API F360
3. ⏳ Testar resposta real da API com token compartilhado
4. ⏳ Implementar agrupamento por token
5. ⏳ Atualizar Edge Function
6. ⏳ Testar com Grupo Volpe
7. ⏳ Validar dados no banco

## 📝 INFORMAÇÕES ADICIONAIS NECESSÁRIAS

Para completar a solução, precisamos saber:

1. **Estrutura exata da API F360:**
   - Documentação da API
   - Exemplo de resposta real
   - Como filtrar por CNPJ (se possível)

2. **Credenciais de teste:**
   - Token do Grupo Volpe para testar
   - Acesso à documentação F360

3. **Validação com o cliente:**
   - Confirmar que token compartilhado é intencional
   - Verificar se há separação lógica no F360

---

**Status:** 🔴 PROBLEMA IDENTIFICADO - REQUER INVESTIGAÇÃO E CORREÇÃO
**Prioridade:** 🔥 ALTA - Pode causar dados incorretos
**Próxima ação:** Consultar API F360 e implementar agrupamento por token

