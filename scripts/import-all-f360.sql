-- Script SQL completo para importar todos os clientes F360
-- Execute este script no SQL Editor do Supabase
-- Ambiente local - sem criptografia

BEGIN;

-- Importar todos os registros do CSV CLIENTES_F360_com_TOKEN.csv
SELECT public.upsert_integration_f360_company('DEX INVEST COMERCIO E VAREJO LTDA (loja 392)', '00052912647000', '174d090d-50f4-4e82-bf7b-1831b74680bf', NULL);
SELECT public.upsert_integration_f360_company('DEX INVEST COMERCIO E VAREJO LTDA (loja 393)', '00052912647001', '174d090d-50f4-4e82-bf7b-1831b74680bf', NULL);
SELECT public.upsert_integration_f360_company('VOLPE DIADEMA (GRUPO VOLPE)', '00026888098000', '223b065a-1873-4cfe-a36b-f092c602a03e', NULL);
SELECT public.upsert_integration_f360_company('VOLPE GRAJAU (GRUPO VOLPE)', '00026888098001', '223b065a-1873-4cfe-a36b-f092c602a03e', NULL);
SELECT public.upsert_integration_f360_company('VOLPE POA (GRUPO VOLPE)', '00026888098001', '223b065a-1873-4cfe-a36b-f092c602a03e', NULL);
SELECT public.upsert_integration_f360_company('VOLPE SANTO ANDRE (GRUPO VOLPE)', '00026888098001', '223b065a-1873-4cfe-a36b-f092c602a03e', NULL);
SELECT public.upsert_integration_f360_company('VOLPE SAO MATEUS (GRUPO VOLPE)', '00026888098000', '223b065a-1873-4cfe-a36b-f092c602a03e', NULL);
SELECT public.upsert_integration_f360_company('AAS GONCALVES AUTOPECA', '00033542553000', '258a60f7-12bb-44c1-825e-7e9160c41c0d', NULL);
SELECT public.upsert_integration_f360_company('AGS AUTO PECAS PARACAMBI', '00050716882000', '258a60f7-12bb-44c1-825e-7e9160c41c0d', NULL);
SELECT public.upsert_integration_f360_company('ACQUA MUNDI ACADEMIA - FILIAL', '00017100902000', '5440d062-b2e9-4554-b33f-f1f783a85472', NULL);
SELECT public.upsert_integration_f360_company('ACQUA MUNDI ACADEMIA - MATRIZ', '00017100902000', '5440d062-b2e9-4554-b33f-f1f783a85472', NULL);
SELECT public.upsert_integration_f360_company('DERMOPLASTIK CENTRO MEDICO LTDA', '00019822798000', '61b9bc06-1ada-485c-963b-69a4d7d91866', NULL);
SELECT public.upsert_integration_f360_company('CORPORE SUPLEMENTOS', '00005792580000', '7c006009-c8d4-4e15-99b5-8956148c710e', NULL);
SELECT public.upsert_integration_f360_company('A3 SOLUTION LTDA', '00022702726000', '9cab76ea-8476-4dc6-aec7-0d7247a13bae', NULL);
SELECT public.upsert_integration_f360_company('CLUBE DE CACA E TIRO', '00041794911000', '9f00c3fa-3dfe-4d7d-ac4d-dfc3f06ca982', NULL);
SELECT public.upsert_integration_f360_company('SANTA LOLLA - FLORIANO (GRUPO FOX 11)', '00057220844000', 'c021af1d-a524-4170-8270-c44da14f7be1', NULL);
SELECT public.upsert_integration_f360_company('ALL IN SP HAMBURGUERIA LTDA', '00043212220000', 'd4077081-e407-4126-bf50-875aa63177a2', NULL);

-- Verificar importação
SELECT 
  COUNT(*) as total_registros,
  COUNT(DISTINCT cnpj) as empresas_unicas,
  COUNT(DISTINCT token) as tokens_unicos
FROM integration_f360;

-- Listar empresas importadas
SELECT 
  cnpj,
  cliente_nome,
  LEFT(token, 20) || '...' as token_preview,
  (SELECT COUNT(*) FROM integration_f360_aliases WHERE integration_id = integration_f360.id) as aliases_count
FROM integration_f360
ORDER BY cnpj, cliente_nome;

COMMIT;

