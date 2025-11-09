# 🧪 GUIA DE TESTE - ERP Lazy Loading

**Data:** 09/11/2025  
**Objetivo:** Testar sincronização de extratos bancários via F360/OMIE

---

## 📋 CHECKLIST PRÉ-TESTE

- [ ] Supabase Functions deployadas
- [ ] F360 integrado com pelo menos 1 empresa
- [ ] OMIE integrado com pelo menos 1 empresa
- [ ] Frontend rodando localmente
- [ ] Banco de dados atualizado com migration 018

---

## ✅ TESTE 1: SINCRONIZAR METADADOS

### Passo 1: Acessar página
```
URL: http://localhost:3000/financeiro/extratos/sincronizar
```

### Passo 2: Clicar "Sincronizar Agora"

**Esperado:**
```
✅ Sincronização concluída com sucesso!
  F360: 3 contas sincronizadas
  OMIE: 2 contas sincronizadas
```

### Passo 3: Verificar banco de dados

```sql
-- Checar metadados armazenados
SELECT 
  company_cnpj,
  banco_codigo,
  agencia,
  conta,
  COUNT(*) as total
FROM bank_statements
GROUP BY company_cnpj, banco_codigo, agencia, conta;

-- Resultado esperado: 5 registros de metadados
```

---

## ✅ TESTE 2: BUSCAR MOVIMENTAÇÕES EM TEMPO REAL

### Opção A: Via Terminal

```bash
# Substituir values
SUPABASE_URL="https://your-project.supabase.co"
SERVICE_ROLE_KEY="eyJhbGc..."
COMPANY_CNPJ="12.345.678/0001-90"

# Chamar função
curl -X POST "${SUPABASE_URL}/functions/v1/get-bank-statements-from-erp" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"company_cnpj\": \"${COMPANY_CNPJ}\",
    \"days_back\": 30
  }"

# Resultado esperado:
{
  "success": true,
  "total": 145,
  "statements": [
    {
      "company_cnpj": "12.345.678/0001-90",
      "banco_codigo": "033",
      "data_movimento": "2025-11-01",
      "tipo": "credito",
      "valor": 1500.00,
      "descricao": "Recebimento",
      "documento": "F360-123"
    },
    ...
  ]
}
```

### Opção B: Via Frontend (código no console)

```typescript
// Abrir DevTools Console

import { getBankStatementsFromERP } from '@/lib/api';

// Testar
const result = await getBankStatementsFromERP('12.345.678/0001-90', {
  days_back: 30
});

console.log('Total de movimentos:', result.total);
console.log('Primeiros 3:', result.statements.slice(0, 3));
```

---

## ✅ TESTE 3: VALIDAÇÃO DE TAXAS COM DADOS REAL-TIME

### Passo 1: Chamar validação

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/validate-fees" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{ \"company_cnpj\": \"${COMPANY_CNPJ}\" }"
```

### Passo 2: Verificar resultado

**Esperado:**
```json
{
  "success": true,
  "validated": 45,
  "alerts_created": 3,
  "results": [
    {
      "company_cnpj": "12.345.678/0001-90",
      "data_validacao": "2025-11-09",
      "taxas_validadas": 45,
      "divergencias_encontradas": 3
    }
  ]
}
```

### Passo 3: Checar alerts criados

```sql
SELECT 
  id,
  tipo,
  prioridade,
  titulo,
  status,
  created_at
FROM financial_alerts
WHERE company_cnpj = '12.345.678/0001-90'
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ TESTE 4: CONCILIAÇÃO BANCÁRIA COM DADOS REAL-TIME

### Passo 1: Chamar conciliação

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/reconcile-bank" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{ \"company_cnpj\": \"${COMPANY_CNPJ}\" }"
```

### Passo 2: Verificar resultado

**Esperado:**
```json
{
  "success": true,
  "reconciled": 38,
  "alerts_created": 2
}
```

### Passo 3: Checar reconciliações

```sql
SELECT 
  id,
  bank_statement_id,
  cashflow_entry_id,
  confidence_score,
  status,
  created_at
FROM reconciliations
WHERE company_cnpj = '12.345.678/0001-90'
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ TESTE 5: FLUXO COMPLETO

### Passo 1: Sincronizar
```
UI: /financeiro/extratos/sincronizar → Clique "Sincronizar Agora"
✅ Resultado: Metadados armazenados
```

### Passo 2: Validar Taxas
```
API: validate-fees
✅ Resultado: Alertas de divergência criados
```

### Passo 3: Conciliar Banco
```
API: reconcile-bank
✅ Resultado: Reconciliações criadas
```

### Passo 4: Verificar Dashboard
```
UI: /financeiro/alertas
✅ Esperado: Alertas aparecem em tempo real
```

---

## 🔍 TROUBLESHOOTING

### Erro: "Missing Supabase credentials"

**Solução:**
```bash
# Verificar env vars
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Devem estar preenchidos
```

---

### Erro: "F360 API error: 401"

**Solução:**
```sql
-- Verificar se F360 está integrado
SELECT * FROM integration_f360 LIMIT 1;

-- Se vazio, não há integração
-- Pode ignorar este erro e testar com OMIE
```

---

### Erro: "No statements found"

**Possíveis causas:**
1. Nenhum movimento nos últimos 30 dias
2. F360/OMIE não retornando dados
3. Integração não configurada corretamente

**Solução:**
```sql
-- Simular dados de teste no cashflow_entries
INSERT INTO cashflow_entries (
  company_cnpj,
  company_nome,
  date,
  kind,
  category,
  amount
) VALUES (
  '12.345.678/0001-90',
  'Empresa Teste',
  '2025-11-05',
  'in',
  'Recebimento',
  1500.00
);

-- Tentar novamente
```

---

### Erro: "Function not found"

**Solução:**
```bash
# Deployer as funções
supabase functions deploy sync-bank-metadata
supabase functions deploy get-bank-statements-from-erp

# Aguardar ~30s para inicializar
sleep 30

# Testar novamente
```

---

## 📊 VERIFICAÇÃO VISUAL

### Dashboard de Alertas
```
URL: http://localhost:3000/financeiro/alertas

Verificar:
  ✅ Alertas aparecem em tempo real
  ✅ Prioridade é calculada corretamente
  ✅ Botão "Resolver" funciona
```

### Configuração de Taxas
```
URL: http://localhost:3000/financeiro/configuracoes/taxas

Verificar:
  ✅ Lista de taxas aparece
  ✅ Pode adicionar nova taxa
  ✅ Pode editar taxa existente
```

---

## 📈 MÉTRICAS DE SUCESSO

| Métrica | Target | Resultado |
|---------|--------|-----------|
| Metadados sincronizados | > 0 | ✅ ___ |
| Movimentações recuperadas | > 0 | ✅ ___ |
| Taxas validadas | > 0 | ✅ ___ |
| Conciliações criadas | > 0 | ✅ ___ |
| Alertas gerados | > 0 | ✅ ___ |
| Tempo de resposta | < 5s | ✅ ___ |

---

## 🚀 TESTE DE CARGA (Opcional)

```bash
# Simular 100 requisições simultâneas
ab -n 100 -c 10 \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -p payload.json \
  https://your-project.supabase.co/functions/v1/get-bank-statements-from-erp

# Esperado:
# - Sem erros de timeout
# - Tempo médio < 5s
# - Taxa de sucesso 100%
```

---

## 📝 ANOTAÇÕES DE TESTE

```
Teste realizado em: _______________
Tester: _______________

Passou em todos os testes?  ☐ SIM  ☐ NÃO

Problemas encontrados:
_________________________________
_________________________________

Observações:
_________________________________
_________________________________
```

---

**Próximo passo:** Após testes bem-sucedidos → Deploy em produção 🚀


