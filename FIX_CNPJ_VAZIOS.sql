-- =====================================================
-- FIX: Empresas com CNPJ Vazio
-- =====================================================
-- Problema: 10 empresas ativas sem CNPJ
-- Solução: Marcar como inativas (já que não temos CNPJ)
-- =====================================================

-- 1. VERIFICAR QUANTAS EMPRESAS ESTÃO SEM CNPJ
SELECT COUNT(*) as total_sem_cnpj, 
       COUNT(DISTINCT company_cnpj) as unique_cnpj
FROM clientes
WHERE status = 'Ativo' AND (cnpj IS NULL OR cnpj = '' OR cnpj ~ '^\s*$');

-- 2. LISTAR QUAIS SÃO
SELECT id, nome, razao_social, cnpj, status, created_at
FROM clientes
WHERE status = 'Ativo' AND (cnpj IS NULL OR cnpj = '' OR cnpj ~ '^\s*$')
ORDER BY created_at DESC;

-- 3. MARCAR COMO INATIVAS (com histórico de mudança)
BEGIN;

-- Atualizar status para 'Inativo'
UPDATE clientes
SET 
  status = 'Inativo',
  updated_at = NOW()
WHERE status = 'Ativo' AND (cnpj IS NULL OR cnpj = '' OR cnpj ~ '^\s*$');

-- Log da mudança em uma tabela de auditoria (se existir)
-- INSERT INTO audit_log (table_name, action, before_value, after_value, timestamp)
-- SELECT 
--   'clientes' as table_name,
--   'status_update' as action,
--   'Ativo' as before_value,
--   'Inativo' as after_value,
--   NOW() as timestamp
-- WHERE ...

COMMIT;

-- 4. VERIFICAR RESULTADO
SELECT status, COUNT(*) as total
FROM clientes
GROUP BY status
ORDER BY status;

