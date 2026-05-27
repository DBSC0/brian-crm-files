-- ============================================================
-- PATCH: Profiles — email column + RLS para admins de org
-- Brian CRM — 2026-05-24
-- Ejecutar en: Supabase SQL Editor (Console)
-- ============================================================

-- Agregar email a profiles para mostrarlo en el listado de miembros
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Reemplazar RLS de profiles para permitir:
--   SELECT: propio perfil o miembro de la misma org
--   UPDATE: propio perfil o admin con permiso users.edit_permissions
DROP POLICY IF EXISTS profiles_self_select ON profiles;
DROP POLICY IF EXISTS profiles_self_update ON profiles;
DROP POLICY IF EXISTS profiles_self_insert ON profiles;
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = profiles.id
        AND is_org_member(om.organization_id, auth.uid())
    )
  );

CREATE POLICY profiles_self_insert ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = profiles.id
        AND has_permission(om.organization_id, auth.uid(), 'users.edit_permissions')
    )
  );
