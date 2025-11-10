# 🚀 Próximas Ações Finais (1h)
## 11 de Novembro de 2025

---

## ✅ STATUS ATUAL

| Componente | Status |
|------------|--------|
| Dashboard Cards | ✅ |
| Relatórios DRE | ✅ |
| Oracle (ChatGPT 5) | ✅ |
| Autenticação JWT | ✅ |
| Enter para Enviar | ✅ |
| Backend Deployado | ✅ |
| Frontend Pronto | ✅ |

---

## 🎯 AÇÃO 1: Executar Deduplicação SQL (10 min)

### Local: Dashboard Supabase > SQL Editor

**Copie e cole este SQL:**

```sql
-- Deduplicação DRE
WITH d AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_cnpj, date, account, nature, amount
           ORDER BY id
         ) AS rn
  FROM dre_entries
)
DELETE FROM dre_entries USING d WHERE dre_entries.id = d.id AND d.rn > 1;

-- Deduplicação Cashflow
WITH c AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_cnpj, date, amount, kind, category
           ORDER BY id
         ) AS rn
  FROM cashflow_entries
)
DELETE FROM cashflow_entries USING c WHERE cashflow_entries.id = c.id AND c.rn > 1;

-- Criar índices únicos
CREATE UNIQUE INDEX IF NOT EXISTS ux_dre_entries_unique
ON dre_entries(company_cnpj, date, account, nature, amount);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cashflow_entries_unique
ON cashflow_entries(company_cnpj, date, amount, kind, category);

-- Verificar contagens após dedup
SELECT 'DRE VOLPE DIADEMA após dedup:' as status, COUNT(*) as total FROM dre_entries WHERE company_cnpj = '00026888098000'
UNION ALL
SELECT 'DRE VOLPE GRAJAU após dedup:' as status, COUNT(*) as total FROM dre_entries WHERE company_cnpj = '00026888098001'
UNION ALL
SELECT 'CASHFLOW VOLPE DIADEMA após dedup:' as status, COUNT(*) as total FROM cashflow_entries WHERE company_cnpj = '00026888098000'
UNION ALL
SELECT 'CASHFLOW VOLPE GRAJAU após dedup:' as status, COUNT(*) as total FROM cashflow_entries WHERE company_cnpj = '00026888098001';
```

**Resultado esperado:**
- DRE VOLPE DIADEMA: 7 registros
- DRE VOLPE GRAJAU: 7 registros
- CASHFLOW VOLPE DIADEMA: 7 registros
- CASHFLOW VOLPE GRAJAU: 7 registros

---

## 🎯 AÇÃO 2: Configurar Chave F360 (30 min)

### Passo 1: Identificar a chave F360 correta

**No SQL Editor, execute:**

```sql
-- Verificar tokens criptografados
SELECT id, company_cnpj, token_enc FROM integration_f360 LIMIT 5;
```

**Você receberá IDs dos tokens. Guarde um deles.**

### Passo 2: Testar descriptografia com chaves conhecidas

**No SQL Editor, execute:**

```sql
-- Testar decrypt_f360_token
SELECT decrypt_f360_token('63520d44-fe1d-4c45-a127-d9abfb6dc85f');
```

**Se retornar NULL, a chave está incorreta.**

### Passo 3: Configurar a chave correta

**No Terminal, execute:**

```bash
# Substitua 'CHAVE_CORRETA' pela chave real
supabase secrets set app.encryption_key='CHAVE_CORRETA' --project-ref xzrmzmcoslomtzkzgskn
```

### Passo 4: Validar

**No SQL Editor, execute novamente:**

```sql
SELECT decrypt_f360_token('63520d44-fe1d-4c45-a127-d9abfb6dc85f');
```

**Deve retornar um token válido (não NULL).**

---

## 🎯 AÇÃO 3: Deploy Frontend (15 min)

### Passo 1: Build

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend
npm run build
```

### Passo 2: Deploy

**Escolha uma opção:**

#### Opção A: Vercel (Recomendado)
```bash
vercel deploy --prod
```

#### Opção B: Netlify
```bash
netlify deploy --prod
```

#### Opção C: Manual
```bash
npm run deploy
```

**Resultado esperado:**
- Build OK ✅
- Deploy realizado ✅
- URL do site ✅

---

## 🎯 AÇÃO 4: Configurar Agendamentos (5 min)

### Local: Dashboard Supabase > Functions > scheduled-sync-erp

**Passo 1:** Clique em `scheduled-sync-erp`

**Passo 2:** Clique em "Cron Job"

**Passo 3:** Configure:
- **Cron Expression:** `0 */6 * * *` (a cada 6 horas)
- **Timezone:** UTC-3 (ou sua timezone)

**Passo 4:** Salvar

**Resultado esperado:**
- Sincronização automática a cada 6 horas ✅
- Dados atualizados regularmente ✅

---

## 📊 RESUMO DAS AÇÕES

| Ação | Tempo | Status |
|------|-------|--------|
| 1. Deduplicação SQL | 10 min | ⏳ Manual no Dashboard |
| 2. Chave F360 | 30 min | ⏳ Manual no Terminal |
| 3. Deploy Frontend | 15 min | ⏳ Manual no Terminal |
| 4. Agendamentos | 5 min | ⏳ Manual no Dashboard |
| **TOTAL** | **1h** | ⏳ |

---

## ✅ CHECKLIST FINAL

Após completar as 4 ações:

- [ ] Deduplicação executada (contagens verificadas)
- [ ] Chave F360 configurada (decrypt testado)
- [ ] Frontend deployado (URL obtida)
- [ ] Agendamentos configurados (cron ativo)
- [ ] Dashboard funcionando com dados reais
- [ ] DRE exibindo dados corretos
- [ ] Oracle respondendo com ChatGPT 5
- [ ] Enter enviando mensagens no chat

---

## 🎉 RESULTADO FINAL

✅ **Sistema DashFinance 100% operacional em produção!**

- Dados reais sincronizados
- Dashboards atualizados
- Oracle com ChatGPT 5
- Sincronização automática
- Pronto para usar

---

## 📞 SUPORTE

Se encontrar erros:

1. **Erro na deduplicação:** Verificar se há duplicatas reais
2. **Erro na chave F360:** Confirmar chave com time de integração
3. **Erro no deploy:** Verificar credenciais de Vercel/Netlify
4. **Erro no cron:** Verificar sintaxe da expressão cron

---

**Data:** 11 de novembro de 2025, 18:55 UTC-3  
**Status:** ⏳ AGUARDANDO EXECUÇÃO MANUAL  
**Desenvolvedor:** Cascade AI
