-- Script para Importar Clientes F360 do CSV
-- Data: 2025-11-06
-- Fonte: CLIENTES_F360_com_TOKEN.csv (17 clientes)

-- =====================================================
-- 1. ATUALIZAR CNPJs na tabela clientes
-- =====================================================

-- DEX INVEST
UPDATE clientes SET cnpj = '00.052.912/6470-00' WHERE UPPER(razao_social) LIKE '%DEX INVEST%' AND razao_social LIKE '%392%';
UPDATE clientes SET cnpj = '00.052.912/6470-01' WHERE UPPER(razao_social) LIKE '%DEX INVEST%' AND razao_social LIKE '%393%';

-- VOLPE (Grupo)
UPDATE clientes SET cnpj = '00.026.888/0980-00' WHERE UPPER(razao_social) LIKE '%VOLPE%' AND (razao_social LIKE '%DIADEMA%' OR razao_social LIKE '%SAO MATEUS%');
UPDATE clientes SET cnpj = '00.026.888/0980-01' WHERE UPPER(razao_social) LIKE '%VOLPE%' AND (razao_social LIKE '%GRAJAU%' OR razao_social LIKE '%POA%' OR razao_social LIKE '%SANTO ANDRE%');

-- AAS GONCALVES
UPDATE clientes SET cnpj = '00.033.542/5530-00' WHERE UPPER(razao_social) LIKE '%AAS GONCALVES%' OR UPPER(razao_social) LIKE '%AAS%AUTOPECA%';

-- AGS AUTO PECAS
UPDATE clientes SET cnpj = '00.050.716/8820-00' WHERE UPPER(razao_social) LIKE '%AGS%' AND UPPER(razao_social) LIKE '%PARACAMBI%';

-- ACQUA MUNDI
UPDATE clientes SET cnpj = '00.017.100/9020-00' WHERE UPPER(razao_social) LIKE '%ACQUA MUNDI%';

-- DERMOPLASTIK
UPDATE clientes SET cnpj = '00.019.822/7980-00' WHERE UPPER(razao_social) LIKE '%DERMOPLASTIK%';

-- CORPORE
UPDATE clientes SET cnpj = '00.005.792/5800-00' WHERE UPPER(razao_social) LIKE '%CORPORE%';

-- A3 SOLUTION
UPDATE clientes SET cnpj = '00.022.702/7260-00' WHERE UPPER(razao_social) LIKE '%A3 SOLUTION%';

-- CLUBE DE CACA E TIRO
UPDATE clientes SET cnpj = '00.041.794/9110-00' WHERE UPPER(razao_social) LIKE '%CLUBE%CACA%TIRO%';

-- SANTA LOLLA
UPDATE clientes SET cnpj = '00.057.220/8440-00' WHERE UPPER(razao_social) LIKE '%SANTA LOLLA%' AND UPPER(razao_social) LIKE '%FLORIANO%';

-- ALL IN SP
UPDATE clientes SET cnpj = '00.043.212/2200-00' WHERE UPPER(razao_social) LIKE '%ALL IN%' AND UPPER(razao_social) LIKE '%HAMBURGUERIA%';

-- =====================================================
-- 2. INSERIR CONFIGURAÇÕES F360
-- =====================================================

-- DEX INVEST (2 lojas, mesmo token)
INSERT INTO f360_config (company_cnpj, api_key, is_active)
VALUES
  ('00.052.912/6470-00', '174d090d-50f4-4e82-bf7b-1831b74680bf', true),
  ('00.052.912/6470-01', '174d090d-50f4-4e82-bf7b-1831b74680bf', true)
ON CONFLICT (company_cnpj) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- VOLPE (5 lojas, mesmo token)
INSERT INTO f360_config (company_cnpj, api_key, is_active)
VALUES
  ('00.026.888/0980-00', '223b065a-1873-4cfe-a36b-f092c602a03e', true),
  ('00.026.888/0980-01', '223b065a-1873-4cfe-a36b-f092c602a03e', true)
ON CONFLICT (company_cnpj) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- AAS GONCALVES
INSERT INTO f360_config (company_cnpj, api_key, is_active)
VALUES ('00.033.542/5530-00', '258a60f7-12bb-44c1-825e-7e9160c41c0d', true)
ON CONFLICT (company_cnpj) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- AGS AUTO PECAS
INSERT INTO f360_config (company_cnpj, api_key, is_active)
VALUES ('00.050.716/8820-00', '258a60f7-12bb-44c1-825e-7e9160c41c0d', true)
ON CONFLICT (company_cnpj) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- ACQUA MUNDI
INSERT INTO f360_config (company_cnpj, api_key, is_active)
VALUES ('00.017.100/9020-00', '5440d062-b2e9-4554-b33f-f1f783a85472', true)
ON CONFLICT (company_cnpj) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- DERMOPLASTIK
INSERT INTO f360_config (company_cnpj, api_key, is_active)
VALUES ('00.019.822/7980-00', '61b9bc06-1ada-485c-963b-69a4d7d91866', true)
ON CONFLICT (company_cnpj) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- CORPORE
INSERT INTO f360_config (company_cnpj, api_key, is_active)
VALUES ('00.005.792/5800-00', '7c006009-c8d4-4e15-99b5-8956148c710e', true)
ON CONFLICT (company_cnpj) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- A3 SOLUTION
INSERT INTO f360_config (company_cnpj, api_key, is_active)
VALUES ('00.022.702/7260-00', '9cab76ea-8476-4dc6-aec7-0d7247a13bae', true)
ON CONFLICT (company_cnpj) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- CLUBE DE CACA E TIRO
INSERT INTO f360_config (company_cnpj, api_key, is_active)
VALUES ('00.041.794/9110-00', '9f00c3fa-3dfe-4d7d-ac4d-dfc3f06ca982', true)
ON CONFLICT (company_cnpj) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- SANTA LOLLA
INSERT INTO f360_config (company_cnpj, api_key, is_active)
VALUES ('00.057.220/8440-00', 'c021af1d-a524-4170-8270-c44da14f7be1', true)
ON CONFLICT (company_cnpj) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- ALL IN SP
INSERT INTO f360_config (company_cnpj, api_key, is_active)
VALUES ('00.043.212/2200-00', 'd4077081-e407-4126-bf50-875aa63177a2', true)
ON CONFLICT (company_cnpj) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- =====================================================
-- 3. VERIFICAR RESULTADOS
-- =====================================================

-- Ver clientes com CNPJ agora
SELECT
  cnpj,
  razao_social,
  status,
  (SELECT COUNT(*) FROM f360_config WHERE company_cnpj = clientes.cnpj) as tem_f360
FROM clientes
WHERE cnpj IS NOT NULL AND cnpj != ''
ORDER BY razao_social;

-- Ver configurações F360 inseridas
SELECT
  company_cnpj,
  LEFT(api_key, 8) || '...' as token_preview,
  is_active,
  created_at
FROM f360_config
ORDER BY created_at DESC;
