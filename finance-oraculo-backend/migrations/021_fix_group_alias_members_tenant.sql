-- =====================================================
-- FIX: Tornar tenant_id opcional em group_alias_members
-- Data: 2025-11-10
-- =====================================================

BEGIN;

-- Tornar tenant_id opcional
ALTER TABLE group_alias_members ALTER COLUMN tenant_id DROP NOT NULL;

-- Adicionar valor padrão para tenant_id se não existir
ALTER TABLE group_alias_members ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

COMMIT;
