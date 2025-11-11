-- Script: Preparar Estrutura de Sincronização
-- Descrição: Deduplicação, índices únicos e limpeza de sync_state
-- Data: 11 de Novembro de 2025

-- ============================================
-- PASSO 1: Backup de Segurança (Recomendado)
-- ============================================

-- Criar tabela temporária com backup
CREATE TABLE IF NOT EXISTS dre_entries_backup AS
SELECT * FROM dre_entries;

CREATE TABLE IF NOT EXISTS cashflow_entries_backup AS
SELECT * FROM cashflow_entries;

-- RESULTADO: Backup criado

-- ============================================
-- PASSO 2: Deduplicação DRE
-- ============================================

-- Contar duplicatas antes
SELECT 'DRE - Antes da deduplicação' as etapa, COUNT(*) as total
FROM dre_entries;

-- Identificar duplicatas
WITH duplicates AS (
  SELECT
    company_cnpj,
    date,
    account,
    nature,
    amount,
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY id) as ids
  FROM dre_entries
  GROUP BY company_cnpj, date, account, nature, amount
  HAVING COUNT(*) > 1
)
SELECT
  company_cnpj,
  date,
  account,
  count,
  count - 1 as sera_removido
FROM duplicates
ORDER BY company_cnpj, date;

-- Executar deduplicação
WITH d AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_cnpj, date, account, nature, amount
           ORDER BY id
         ) AS rn
  FROM dre_entries
)
DELETE FROM dre_entries
USING d
WHERE dre_entries.id = d.id AND d.rn > 1;

-- RESULTADO: DELETE X (X = número de duplicatas removidas)

-- Contar após deduplicação
SELECT 'DRE - Após deduplicação' as etapa, COUNT(*) as total
FROM dre_entries;

-- ============================================
-- PASSO 3: Deduplicação Cashflow
-- ============================================

-- Contar duplicatas antes
SELECT 'Cashflow - Antes da deduplicação' as etapa, COUNT(*) as total
FROM cashflow_entries;

-- Identificar duplicatas
WITH duplicates AS (
  SELECT
    company_cnpj,
    date,
    amount,
    kind,
    category,
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY id) as ids
  FROM cashflow_entries
  GROUP BY company_cnpj, date, amount, kind, category
  HAVING COUNT(*) > 1
)
SELECT
  company_cnpj,
  date,
  kind,
  category,
  count,
  count - 1 as sera_removido
FROM duplicates
ORDER BY company_cnpj, date;

-- Executar deduplicação
WITH c AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_cnpj, date, amount, kind, category
           ORDER BY id
         ) AS rn
  FROM cashflow_entries
)
DELETE FROM cashflow_entries
USING c
WHERE cashflow_entries.id = c.id AND c.rn > 1;

-- RESULTADO: DELETE Y (Y = número de duplicatas removidas)

-- Contar após deduplicação
SELECT 'Cashflow - Após deduplicação' as etapa, COUNT(*) as total
FROM cashflow_entries;

-- ============================================
-- PASSO 4: Criar Índices Únicos (Prevenção)
-- ============================================

-- Índice único para DRE
CREATE UNIQUE INDEX IF NOT EXISTS ux_dre_entries_unique
ON dre_entries(company_cnpj, date, account, nature, amount);

-- RESULTADO: CREATE INDEX ou "relation already exists" (OK)

-- Índice único para Cashflow
CREATE UNIQUE INDEX IF NOT EXISTS ux_cashflow_entries_unique
ON cashflow_entries(company_cnpj, date, amount, kind, category);

-- RESULTADO: CREATE INDEX ou "relation already exists" (OK)

-- Verificar índices criados
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('dre_entries', 'cashflow_entries')
  AND indexname LIKE 'ux_%'
ORDER BY tablename, indexname;

-- ============================================
-- PASSO 5: Limpar sync_state
-- ============================================

-- Backup sync_state
CREATE TABLE IF NOT EXISTS sync_state_backup AS
SELECT * FROM sync_state;

-- Contar registros antes
SELECT 'sync_state - Antes da limpeza' as etapa, COUNT(*) as total
FROM sync_state;

-- Limpar estados de sincronização F360 antigos
DELETE FROM sync_state WHERE source = 'F360';

-- RESULTADO: DELETE Z

-- Contar após limpeza
SELECT 'sync_state - Após limpeza' as etapa, COUNT(*) as total
FROM sync_state;

-- ============================================
-- PASSO 6: Validar Contagens Atuais
-- ============================================

-- Contagem total
SELECT
  'TOTAL' as tipo,
  (SELECT COUNT(*) FROM dre_entries) as dre_total,
  (SELECT COUNT(*) FROM cashflow_entries) as cf_total;

-- Contagem por CNPJ
SELECT
  'Por CNPJ' as tipo,
  company_cnpj,
  COUNT(*) as dre_count
FROM dre_entries
GROUP BY company_cnpj
ORDER BY company_cnpj;

SELECT
  'Por CNPJ' as tipo,
  company_cnpj,
  COUNT(*) as cf_count
FROM cashflow_entries
GROUP BY company_cnpj
ORDER BY company_cnpj;

-- Contagem do Grupo Volpe (se já cadastrado)
SELECT
  'Grupo Volpe' as tipo,
  c.cnpj,
  c.razao_social,
  (SELECT COUNT(*) FROM dre_entries WHERE company_cnpj = c.cnpj) as dre_count,
  (SELECT COUNT(*) FROM cashflow_entries WHERE company_cnpj = c.cnpj) as cf_count
FROM clientes c
WHERE c.grupo_economico = 'Grupo Volpe'
  AND c.cnpj IS NOT NULL
ORDER BY c.cnpj;

-- ============================================
-- PASSO 7: Verificar Integridade Referencial
-- ============================================

-- Verificar se todos os CNPJs em dre_entries existem em clientes
SELECT
  'CNPJs sem cadastro em clientes' as problema,
  d.company_cnpj,
  COUNT(*) as registros_orfaos
FROM dre_entries d
LEFT JOIN clientes c ON d.company_cnpj = c.cnpj
WHERE c.cnpj IS NULL
GROUP BY d.company_cnpj;

-- RESULTADO ESPERADO: 0 linhas (sem órfãos)
-- Se houver órfãos, são CNPJs de teste que podem ser mantidos ou removidos

-- Verificar se todos os CNPJs em cashflow_entries existem em clientes
SELECT
  'CNPJs sem cadastro em clientes' as problema,
  cf.company_cnpj,
  COUNT(*) as registros_orfaos
FROM cashflow_entries cf
LEFT JOIN clientes c ON cf.company_cnpj = c.cnpj
WHERE c.cnpj IS NULL
GROUP BY cf.company_cnpj;

-- RESULTADO ESPERADO: 0 linhas (sem órfãos)

-- ============================================
-- PASSO 8: Validar Cálculos DRE
-- ============================================

-- Validar que receita - custo - despesa está coerente
SELECT
  company_cnpj,
  SUM(CASE WHEN nature = 'receita' THEN amount ELSE 0 END) as receita,
  SUM(CASE WHEN nature = 'custo' THEN amount ELSE 0 END) as custo,
  SUM(CASE WHEN nature = 'despesa' THEN amount ELSE 0 END) as despesa,
  SUM(CASE WHEN nature = 'receita' THEN amount
           WHEN nature = 'custo' THEN -amount
           WHEN nature = 'despesa' THEN -amount
           ELSE 0 END) as lucro_liquido,
  -- Validação
  CASE
    WHEN SUM(CASE WHEN nature = 'receita' THEN amount ELSE 0 END) > 0 THEN '✅ OK'
    ELSE '⚠️ Sem receita'
  END as status
FROM dre_entries
GROUP BY company_cnpj
ORDER BY company_cnpj;

-- ============================================
-- PASSO 9: Limpar Dados de Teste (Opcional)
-- ============================================

-- Se quiser remover dados de teste com UUIDs como CNPJ:
/*
DELETE FROM dre_entries
WHERE company_cnpj ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

DELETE FROM cashflow_entries
WHERE company_cnpj ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
*/

-- ============================================
-- PASSO 10: Resumo Final
-- ============================================

SELECT
  '=== RESUMO DA PREPARAÇÃO ===' as titulo;

SELECT
  'DRE Entries' as tabela,
  COUNT(*) as total_registros,
  COUNT(DISTINCT company_cnpj) as empresas_distintas,
  MIN(date) as data_mais_antiga,
  MAX(date) as data_mais_recente
FROM dre_entries
UNION ALL
SELECT
  'Cashflow Entries' as tabela,
  COUNT(*) as total_registros,
  COUNT(DISTINCT company_cnpj) as empresas_distintas,
  MIN(date) as data_mais_antiga,
  MAX(date) as data_mais_recente
FROM cashflow_entries
UNION ALL
SELECT
  'Sync State' as tabela,
  COUNT(*) as total_registros,
  COUNT(DISTINCT company_cnpj) as empresas_distintas,
  MIN(last_success_at::date) as data_mais_antiga,
  MAX(last_success_at::date) as data_mais_recente
FROM sync_state;

-- ============================================
-- CONCLUSÃO
-- ============================================

-- Após executar este script com sucesso:
-- ✅ Duplicatas removidas (DRE e Cashflow)
-- ✅ Índices únicos criados (prevenção)
-- ✅ sync_state limpo
-- ✅ Backups de segurança criados
-- ✅ Validações executadas

-- Próximo passo: Executar sincronização F360
-- Script: 04-test-f360-sync.sh

-- Para remover backups (após confirmar sucesso):
-- DROP TABLE IF EXISTS dre_entries_backup;
-- DROP TABLE IF EXISTS cashflow_entries_backup;
-- DROP TABLE IF EXISTS sync_state_backup;
