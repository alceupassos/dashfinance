-- Script: Atualizar Dados do Grupo Volpe
-- Descrição: Adiciona CNPJs únicos às 13 empresas do Grupo Volpe
-- Data: 11 de Novembro de 2025

-- ============================================
-- IMPORTANTE: Ajuste os CNPJs reais antes de executar!
-- ============================================

-- PASSO 1: Listar empresas Volpe atuais
SELECT
  id,
  razao_social,
  cnpj,
  token_f360,
  token_status,
  numero_contrato
FROM clientes
WHERE razao_social ILIKE '%volpe%'
ORDER BY numero_contrato NULLS LAST, created_at;

-- RESULTADO: 13 registros com CNPJs NULL

-- ============================================
-- PASSO 2: Preparar dados para atualização
-- ============================================

-- ATENÇÃO: Substitua os CNPJs abaixo pelos CNPJs REAIS do Grupo Volpe
-- Formato: apenas números (sem pontos, traços ou barras)

-- Exemplo de estrutura (AJUSTAR COM DADOS REAIS):
/*
VOLPE MATRIZ:     00026888000019
VOLPE DIADEMA:    00026888000100
VOLPE GRAJAU:     00026888000281
VOLPE UNIDADE 3:  00026888000362
VOLPE UNIDADE 4:  00026888000443
VOLPE UNIDADE 5:  00026888000524
VOLPE UNIDADE 6:  00026888000605
VOLPE UNIDADE 7:  00026888000686
VOLPE UNIDADE 8:  00026888000767
VOLPE UNIDADE 9:  00026888000848
VOLPE UNIDADE 10: 00026888000929
VOLPE UNIDADE 11: 00026888001009
VOLPE UNIDADE 12: 00026888001181
*/

-- ============================================
-- PASSO 3: Atualização em massa
-- ============================================

-- Template para atualização individual
-- Substitua 'UUID_AQUI' e 'CNPJ_AQUI' pelos valores reais

/*
UPDATE clientes SET
  cnpj = '00026888000019',
  grupo_economico = 'Grupo Volpe',
  token_f360 = '223b065a-1873-4cfe-a36b-f092c602a03e',
  token_status = 'ativo',
  updated_at = NOW()
WHERE id = 'UUID_DA_EMPRESA_1'::uuid;

UPDATE clientes SET
  cnpj = '00026888000100',
  grupo_economico = 'Grupo Volpe',
  token_f360 = '223b065a-1873-4cfe-a36b-f092c602a03e',
  token_status = 'ativo',
  updated_at = NOW()
WHERE id = 'UUID_DA_EMPRESA_2'::uuid;

-- Repetir para as 13 empresas...
*/

-- ============================================
-- PASSO 4: Script Dinâmico (se IDs forem sequenciais)
-- ============================================

-- Se você tem os IDs em ordem, pode usar este bloco:

/*
DO $$
DECLARE
  volpe_ids uuid[] := ARRAY[
    'UUID_1'::uuid,
    'UUID_2'::uuid,
    'UUID_3'::uuid,
    'UUID_4'::uuid,
    'UUID_5'::uuid,
    'UUID_6'::uuid,
    'UUID_7'::uuid,
    'UUID_8'::uuid,
    'UUID_9'::uuid,
    'UUID_10'::uuid,
    'UUID_11'::uuid,
    'UUID_12'::uuid,
    'UUID_13'::uuid
  ];

  volpe_cnpjs text[] := ARRAY[
    '00026888000019',
    '00026888000100',
    '00026888000281',
    '00026888000362',
    '00026888000443',
    '00026888000524',
    '00026888000605',
    '00026888000686',
    '00026888000767',
    '00026888000848',
    '00026888000929',
    '00026888001009',
    '00026888001181'
  ];

  idx integer;
BEGIN
  FOR idx IN 1..array_length(volpe_ids, 1) LOOP
    UPDATE clientes SET
      cnpj = volpe_cnpjs[idx],
      grupo_economico = 'Grupo Volpe',
      token_f360 = '223b065a-1873-4cfe-a36b-f092c602a03e',
      token_status = 'ativo',
      updated_at = NOW()
    WHERE id = volpe_ids[idx];

    RAISE NOTICE 'Atualizado: % -> %', volpe_ids[idx], volpe_cnpjs[idx];
  END LOOP;
END $$;
*/

-- ============================================
-- PASSO 5: Validação
-- ============================================

-- Verificar CNPJs atualizados
SELECT
  cnpj,
  razao_social,
  grupo_economico,
  token_f360,
  token_status
FROM clientes
WHERE grupo_economico = 'Grupo Volpe'
ORDER BY cnpj;

-- RESULTADO ESPERADO:
-- 13 linhas com CNPJs únicos e não-nulos
-- Todos com token_f360 = '223b065a-1873-4cfe-a36b-f092c602a03e'
-- Todos com token_status = 'ativo'

-- Verificar duplicatas
SELECT cnpj, COUNT(*) as duplicatas
FROM clientes
WHERE cnpj IS NOT NULL
GROUP BY cnpj
HAVING COUNT(*) > 1;

-- RESULTADO ESPERADO: 0 linhas (sem duplicatas)

-- ============================================
-- PASSO 6: Re-criptografar Token do Grupo Volpe
-- ============================================

-- IMPORTANTE: Execute APÓS configurar app.encryption_key

-- Se o token 223b065a já existe, atualizar:
/*
UPDATE integration_f360 SET
  token_enc = pgp_sym_encrypt(
    'TOKEN_F360_PLAINTEXT_AQUI',
    current_setting('app.encryption_key')
  ),
  cliente_nome = 'Grupo Volpe',
  cnpj = '00026888000019',  -- CNPJ da matriz
  created_at = NOW()
WHERE id = '223b065a-1873-4cfe-a36b-f092c602a03e'::uuid;
*/

-- Se o token NÃO existe, inserir:
/*
INSERT INTO integration_f360 (id, cliente_nome, cnpj, token_enc, created_at)
VALUES (
  '223b065a-1873-4cfe-a36b-f092c602a03e'::uuid,
  'Grupo Volpe',
  '00026888000019',
  pgp_sym_encrypt(
    'TOKEN_F360_PLAINTEXT_AQUI',
    current_setting('app.encryption_key')
  ),
  NOW()
);
*/

-- ============================================
-- PASSO 7: Testar Descriptografia
-- ============================================

-- Testar decrypt_f360_token
SELECT decrypt_f360_token('223b065a-1873-4cfe-a36b-f092c602a03e'::uuid) as decrypted_token;

-- RESULTADO ESPERADO: token em texto plano (não NULL)

-- ============================================
-- CONCLUSÃO
-- ============================================

-- Após executar este script com sucesso:
-- ✅ 13 empresas Volpe com CNPJs únicos
-- ✅ Token 223b065a vinculado ao Grupo
-- ✅ Token criptografado e testado
-- ✅ Pronto para sincronização F360

-- Próximo passo: Executar script 03-prepare-sync-structure.sql
