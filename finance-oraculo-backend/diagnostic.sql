-- Script de Diagnóstico
-- Execute este script no SQL Editor para identificar o problema

-- 1. Verificar se a tabela clientes existe e suas colunas
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clientes'
ORDER BY ordinal_position;

-- 2. Verificar se existe uma primary key na tabela clientes
SELECT
  tc.constraint_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'clientes'
  AND tc.constraint_type = 'PRIMARY KEY';

-- 3. Testar se a tabela group_alias_members pode ser criada
-- (esta é uma verificação de sintaxe)
DO $$
BEGIN
  RAISE NOTICE 'Verificando estrutura...';

  -- Tentar criar temporariamente
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='group_alias_members') THEN
    RAISE NOTICE 'group_alias_members não existe ainda';
  ELSE
    RAISE NOTICE 'group_alias_members já existe';

    -- Verificar colunas
    PERFORM column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'group_alias_members'
      AND column_name = 'cliente_id';

    IF FOUND THEN
      RAISE NOTICE 'Coluna cliente_id existe em group_alias_members';
    ELSE
      RAISE NOTICE 'Coluna cliente_id NÃO existe em group_alias_members';
    END IF;
  END IF;
END $$;
