# ✅ Corrigir Erro SQL - Deduplicação

## ❌ Erro Recebido:
```
ERROR: 42601: syntax error at or near "```" LINE 2: ```sql ^
```

## 🔧 Solução:

O problema é que você colou o SQL **COM os marcadores de código** (```sql e ```).

---

## ✅ COMO FAZER CORRETAMENTE:

### Passo 1: Copiar APENAS o SQL (sem marcadores)

**Arquivo:** `/tmp/deduplicacao_limpo.sql`

**Conteúdo (copie tudo abaixo, SEM as linhas com ```sql):**

```
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

### Passo 2: Abrir SQL Editor

1. Acesse: **Dashboard Supabase**
2. Clique em: **SQL Editor**
3. Clique em: **New Query**

### Passo 3: Colar SQL

1. **Limpe** o editor (Ctrl+A, Delete)
2. **Cole** o SQL acima (Ctrl+V)
3. **Verifique** que NÃO há ```sql no início
4. **Verifique** que NÃO há ``` no final

### Passo 4: Executar

1. Clique em: **Run** (ou Ctrl+Enter)
2. Aguarde a conclusão

### Passo 5: Verificar Resultado

Você deve ver:
```
DRE VOLPE DIADEMA após dedup: | 7
DRE VOLPE GRAJAU após dedup: | 7
CASHFLOW VOLPE DIADEMA após dedup: | 7
CASHFLOW VOLPE GRAJAU após dedup: | 7
```

---

## ⚠️ IMPORTANTE:

- ❌ NÃO cole: ```sql
- ❌ NÃO cole: ```
- ✅ COLE APENAS: O SQL puro

---

## 🎯 Se ainda der erro:

Execute em **3 partes separadas**:

### Parte 1: Deduplicação DRE
```sql
WITH d AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_cnpj, date, account, nature, amount
           ORDER BY id
         ) AS rn
  FROM dre_entries
)
DELETE FROM dre_entries USING d WHERE dre_entries.id = d.id AND d.rn > 1;
```

### Parte 2: Deduplicação Cashflow
```sql
WITH c AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_cnpj, date, amount, kind, category
           ORDER BY id
         ) AS rn
  FROM cashflow_entries
)
DELETE FROM cashflow_entries USING c WHERE cashflow_entries.id = c.id AND c.rn > 1;
```

### Parte 3: Criar Índices
```sql
CREATE UNIQUE INDEX IF NOT EXISTS ux_dre_entries_unique
ON dre_entries(company_cnpj, date, account, nature, amount);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cashflow_entries_unique
ON cashflow_entries(company_cnpj, date, amount, kind, category);
```

---

**Status:** ✅ Pronto para executar  
**Tempo:** 10 minutos
