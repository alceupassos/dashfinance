# 🚀 GUIA RÁPIDO DE DEPLOY: SISTEMA DE CONCILIAÇÃO

**Tempo estimado:** 15 minutos  
**Pré-requisitos:** Supabase CLI, acesso ao projeto

---

## ⚡ DEPLOY EM 5 PASSOS

### Passo 1: Clone da Codebase (Se necessário)

```bash
cd /Users/alceualvespasssosmac/dashfinance
git status  # Verificar mudanças
```

### Passo 2: Aplicar Migration no Banco

```bash
cd finance-oraculo-backend

# Opção A: Via Supabase CLI
supabase db push

# Opção B: Manual via psql
psql -d supabase_production -f migrations/018_reconciliation_system.sql
```

**Esperado:**
```
✓ Created schema "public"
✓ Created table "contract_fees"
✓ Created table "bank_statements"
✓ Created table "reconciliations"
✓ Created table "fee_validations"
✓ Created table "financial_alerts"
✓ Created table "card_transactions"
✓ Created views (3)
✓ Created functions (2)
✓ Created indexes (16)
```

### Passo 3: Deploy das Edge Functions

```bash
# Validate-fees
supabase functions deploy validate-fees

# Import-bank-statement
supabase functions deploy import-bank-statement

# Reconcile-bank
supabase functions deploy reconcile-bank

# Reconcile-card
supabase functions deploy reconcile-card
```

**Verificar:**
```bash
supabase functions list
# Deve mostrar as 4 functions com status "Active"
```

### Passo 4: Configurar Secrets (Se necessário)

```bash
# Se usar WhatsApp notifications, configurar:
supabase secrets set WASENDER_API_KEY=<sua_api_key>

# Verificar secrets:
supabase secrets list
```

### Passo 5: Testar Endpoints

```bash
# Testar validate-fees
curl -X POST https://PROJECT_ID.supabase.co/functions/v1/validate-fees \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"company_cnpj": null}'

# Testar import-bank-statement
curl -X POST https://PROJECT_ID.supabase.co/functions/v1/import-bank-statement \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -F "file=@extrato.csv" \
  -F "company_cnpj=12345678000190" \
  -F "banco_codigo=033"

# Testar reconcile-bank
curl -X POST https://PROJECT_ID.supabase.co/functions/v1/reconcile-bank \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"company_cnpj": "12345678000190"}'

# Testar reconcile-card
curl -X POST https://PROJECT_ID.supabase.co/functions/v1/reconcile-card \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"company_cnpj": "12345678000190"}'
```

---

## 📋 CHECKLIST DE VALIDAÇÃO

Após deploy, verificar:

- [ ] Todas as 4 Edge Functions estão ativas no Supabase
- [ ] Banco de dados contém 6 tabelas novas
- [ ] 3 Views estão criadas
- [ ] 16 Índices foram criados
- [ ] Frontend consegue fazer chamadas às novas APIs
- [ ] Mock data funciona como fallback

### Verificar no Supabase Dashboard:

1. **Ir para:** Database > Tables
2. **Procurar:** `contract_fees`, `bank_statements`, etc
3. **Verificar:** Todas as 6 tabelas listadas

1. **Ir para:** SQL Editor
2. **Executar:**
```sql
select count(*) as total_tabelas from information_schema.tables 
where table_schema = 'public' 
and table_name in ('contract_fees', 'bank_statements', 'reconciliations', 'fee_validations', 'financial_alerts', 'card_transactions');
```
3. **Resultado esperado:** `total_tabelas: 6`

### Verificar Views:

```sql
select table_name from information_schema.views 
where table_schema = 'public' 
and table_name like 'v_%';
```

**Resultado esperado:**
```
v_alertas_pendentes
v_taxas_divergentes
v_conciliacoes_pendentes
```

---

## 🔧 TROUBLESHOOTING

### Erro: "Function not found"

**Solução:**
```bash
# Verificar se function foi deployada
supabase functions list

# Se não aparecer, fazer deploy manual:
supabase functions deploy validate-fees --force
```

### Erro: "Table already exists"

**Solução:**
```bash
# Deletar tabela antiga (cuidado com dados!)
supabase db pull  # Se tiver conflito

# Ou dropar manualmente:
DROP TABLE IF EXISTS contract_fees CASCADE;
```

### Erro: "CORS issue"

**Solução:** Já configurado nas Edge Functions com headers CORS corretos. Se persistir:

```bash
# Verificar CORS nas functions
curl -X OPTIONS https://PROJECT_ID.supabase.co/functions/v1/validate-fees \
  -H "Access-Control-Allow-Origin: *"
```

### Erro: "Missing Supabase credentials"

**Solução:**
```bash
# Verificar env vars
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Se vazios, configurar:
export SUPABASE_URL="https://PROJECT_ID.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."
```

---

## 📊 DADOS DE TESTE

### Criar Taxa de Teste

```sql
insert into contract_fees (company_cnpj, tipo, banco_codigo, taxa_fixa, vigencia_inicio, ativo)
values ('12345678000190', 'pix', '001', 0.032, '2025-01-01', true);
```

### Criar Alerta de Teste

```sql
insert into financial_alerts (company_cnpj, tipo_alerta, prioridade, titulo, mensagem, status)
values ('12345678000190', 'taxa_divergente', 'alta', 'Teste de alerta', 'Mensagem de teste', 'pendente');
```

### Testar Via Frontend

1. Abrir: `/financeiro/alertas`
2. Deve mostrar alertas do banco (ou mock se desconectado)
3. Testar botões de ação

---

## ⏰ CONFIGURAR AUTOMAÇÃO (Cron Jobs)

### Validação de Taxas Diária (07:00 BRT)

```bash
# Criar job via Supabase SQL
supabase db execute << 'EOF'
SELECT cron.schedule(
  'validate-fees-daily',
  '0 7 * * *',  -- 07:00 UTC (equivalente a 04:00 BRT, ajustar conforme)
  $$
  SELECT http_post(
    'https://PROJECT_ID.supabase.co/functions/v1/validate-fees',
    jsonb_build_object('company_cnpj', null),
    'Bearer SERVICE_ROLE_KEY'
  )
  $$
);
EOF
```

### Conciliação Bancária Diária (08:00 BRT)

```bash
SELECT cron.schedule(
  'reconcile-bank-daily',
  '0 8 * * *',
  $$
  SELECT http_post(
    'https://PROJECT_ID.supabase.co/functions/v1/reconcile-bank',
    jsonb_build_object('company_cnpj', null),
    'Bearer SERVICE_ROLE_KEY'
  )
  $$
);
```

### Conciliação de Cartão Diária (09:00 BRT)

```bash
SELECT cron.schedule(
  'reconcile-card-daily',
  '0 9 * * *',
  $$
  SELECT http_post(
    'https://PROJECT_ID.supabase.co/functions/v1/reconcile-card',
    jsonb_build_object('company_cnpj', null),
    'Bearer SERVICE_ROLE_KEY'
  )
  $$
);
```

---

## 📱 TESTAR WHATSAPP INTEGRATION

Se configurado com WASender:

```typescript
// Testar notificação via frontend
import { validateFees } from '@/lib/api';

const result = await validateFees('12345678000190');
console.log(result);
// Deve retornar: { success: true, validated: X, alerts_created: Y }
```

Verificar WhatsApp do cliente para mensagens de alerta.

---

## 🎯 PRÓXIMAS AÇÕES

### Hoje

- [ ] Deploy das migrations e functions
- [ ] Testar endpoints
- [ ] Validar no frontend

### Amanhã

- [ ] Configurar cron jobs
- [ ] Testar com dados reais
- [ ] Validar integração WhatsApp

### Próxima Semana

- [ ] Deploy em produção
- [ ] Monitoramento 24/7
- [ ] Feedback de usuários

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verificar logs das Edge Functions: Supabase > Functions > Logs
2. Verificar erros SQL: Supabase > SQL Editor > Run problematic query
3. Verificar conectividade: `curl -I SUPABASE_URL`

---

**Status:** ✅ PRONTO PARA DEPLOY  
**Última atualização:** 09/11/2025  
**Desenvolvido por:** Claude + Alceu Passos

