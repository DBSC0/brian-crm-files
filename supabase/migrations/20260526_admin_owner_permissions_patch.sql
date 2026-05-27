-- ============================================================
-- PATCH: admin = owner para permisos operativos
-- Brian CRM - 2026-05-26
-- Ejecutar en Supabase SQL Editor si ya aplicaste migraciones de auth.
-- Mantiene las protecciones especiales del rol owner en triggers aparte.
-- ============================================================

CREATE OR REPLACE FUNCTION has_permission(
  p_org_id          uuid,
  p_user_id         uuid,
  p_permission_key  text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role      text;
  v_has_base  boolean := false;
  v_override  boolean;
BEGIN
  v_role := get_org_role(p_org_id, p_user_id);
  IF v_role IS NULL THEN RETURN false; END IF;

  -- Propietario y administrador tienen todos los permisos operativos.
  -- Las restricciones del propietario (no degradar/no borrar/no asignar owner)
  -- viven en guard_owner_membership_update/delete y no se relajan aca.
  IF v_role IN ('owner', 'admin', 'administrador') THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM role_permissions
    WHERE role = v_role
      AND permission_key = p_permission_key
      AND (organization_id = p_org_id OR organization_id IS NULL)
  ) INTO v_has_base;

  SELECT allowed
  FROM user_permission_overrides
  WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND permission_key = p_permission_key
  INTO v_override;

  IF v_override IS NOT NULL THEN RETURN v_override; END IF;
  RETURN v_has_base;
END;
$$;

-- Backfill defensivo por si alguna pantalla carga permisos desde role_permissions.
INSERT INTO role_permissions (organization_id, role, permission_key)
SELECT NULL, 'admin', key FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (organization_id, role, permission_key)
SELECT NULL, 'administrador', key FROM permissions
ON CONFLICT DO NOTHING;

