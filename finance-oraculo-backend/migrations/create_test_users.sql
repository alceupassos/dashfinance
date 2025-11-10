-- =====================================================
-- Script: Criar usuários de teste
-- Descrição: Cria usuários dev@ifin.app.br (admin) e alceu@angrax.com.br (cliente Volpe)
-- =====================================================

-- 1. Verificar se usuários já existem e deletar se necessário
DELETE FROM user_companies WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('dev@ifin.app.br', 'alceu@angrax.com.br')
);

DELETE FROM profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('dev@ifin.app.br', 'alceu@angrax.com.br')
);

-- Nota: Não podemos deletar diretamente de auth.users via SQL, isso deve ser feito via admin API

-- 2. Inserir usuário admin: dev@ifin.app.br
-- Senha: iFinance@
-- Este usuário terá acesso total (admin)
INSERT INTO profiles (id, email, name, role, default_company_cnpj, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- ID fixo para dev
  'dev@ifin.app.br',
  'Dev Admin',
  'admin',
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Admin tem acesso a todas as empresas (representado por "*")
INSERT INTO user_companies (user_id, company_cnpj, access_level, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '*',
  'admin',
  NOW()
)
ON CONFLICT (user_id, company_cnpj) DO NOTHING;

-- 3. Inserir usuário cliente: alceu@angrax.com.br
-- Senha: Alceu322ie#
-- Este usuário terá acesso ao Grupo Volpe
INSERT INTO profiles (id, email, name, role, default_company_cnpj, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002', -- ID fixo para alceu
  'alceu@angrax.com.br',
  'Alceu Passos',
  'cliente',
  '12.345.678/0001-90', -- CNPJ do Grupo Volpe (ajustar conforme necessário)
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  default_company_cnpj = EXCLUDED.default_company_cnpj,
  updated_at = NOW();

-- Vincular alceu ao Grupo Volpe
-- Nota: Ajustar os CNPJs conforme as empresas reais do Grupo Volpe no banco
INSERT INTO user_companies (user_id, company_cnpj, access_level, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000002', '12.345.678/0001-90', 'view', NOW()),
  ('00000000-0000-0000-0000-000000000002', '12.345.678/0002-71', 'view', NOW()),
  ('00000000-0000-0000-0000-000000000002', '12.345.678/0003-52', 'view', NOW())
ON CONFLICT (user_id, company_cnpj) DO NOTHING;

-- 4. Log de auditoria
INSERT INTO audit_log (user_id, action, resource_type, resource_id, new_value, created_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'create',
    'user',
    '00000000-0000-0000-0000-000000000001',
    '{"email": "dev@ifin.app.br", "role": "admin", "note": "Test user created by migration"}',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'create',
    'user',
    '00000000-0000-0000-0000-000000000002',
    '{"email": "alceu@angrax.com.br", "role": "cliente", "note": "Test user created by migration"}',
    NOW()
  );

-- 5. Verificação
SELECT 
  p.id,
  p.email,
  p.name,
  p.role,
  p.default_company_cnpj,
  array_agg(uc.company_cnpj) as companies
FROM profiles p
LEFT JOIN user_companies uc ON p.id = uc.user_id
WHERE p.email IN ('dev@ifin.app.br', 'alceu@angrax.com.br')
GROUP BY p.id, p.email, p.name, p.role, p.default_company_cnpj;

-- IMPORTANTE: Após executar este script, você deve criar os usuários no Supabase Auth manualmente:
-- 1. Via Dashboard Supabase > Authentication > Users > Add user
--    - Email: dev@ifin.app.br
--    - Password: iFinance@
--    - User UID: 00000000-0000-0000-0000-000000000001
--    - Confirm email: Yes
--
-- 2. Via Dashboard Supabase > Authentication > Users > Add user
--    - Email: alceu@angrax.com.br
--    - Password: Alceu322ie#
--    - User UID: 00000000-0000-0000-0000-000000000002
--    - Confirm email: Yes
--
-- OU via Edge Function admin-users (POST /admin-users)

