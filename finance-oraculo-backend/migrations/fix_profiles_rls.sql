-- =====================================================
-- FIX: Corrigir recursão infinita nas políticas RLS de profiles
-- Data: 2025-11-10
-- Problema: profiles_admins_all causa recursão infinita
-- =====================================================

BEGIN;

-- Remover políticas antigas que causam recursão
DROP POLICY IF EXISTS profiles_admins_all ON profiles;
DROP POLICY IF EXISTS profiles_users_own ON profiles;

-- Política 1: Usuários podem ver e editar seu próprio perfil
CREATE POLICY profiles_users_own ON profiles
  FOR ALL 
  USING (auth.uid() = id);

-- Política 2: Admins podem ver todos os perfis
-- CORRIGIDO: Usar auth.jwt() ao invés de SELECT recursivo
CREATE POLICY profiles_admins_all ON profiles
  FOR SELECT 
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

COMMIT;

-- =====================================================
-- Comentários
-- =====================================================
-- A recursão infinita acontecia porque a política profiles_admins_all
-- fazia um SELECT na tabela profiles dentro da própria condição USING.
-- 
-- Solução: Usar auth.jwt() que acessa diretamente o JWT do usuário
-- sem precisar fazer query na tabela profiles.
-- =====================================================
