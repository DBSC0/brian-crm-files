-- ============================================================
-- PATCH: emails visibles + protección de propietario
-- Brian CRM — 2026-05-24
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- Asegura que profiles tenga email visible para la pantalla de miembros.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill: los perfiles creados antes de agregar profiles.email toman el email real de Supabase Auth.
UPDATE profiles p
SET email = u.email,
    updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR btrim(p.email) = '');

-- No permitir degradar, desactivar, mover, reasignar ni borrar propietarios.
-- Se permite actualizar campos operativos inocuos como last_seen_at/updated_at.
CREATE OR REPLACE FUNCTION guard_owner_membership_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'owner' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'No se puede modificar el rol, estado u organización del propietario';
    END IF;
  END IF;

  IF OLD.role IS DISTINCT FROM 'owner' AND NEW.role = 'owner' THEN
    RAISE EXCEPTION 'No se puede asignar el rol propietario desde administración';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION guard_owner_membership_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'owner' THEN
    RAISE EXCEPTION 'No se puede eliminar al propietario';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_owner_membership_update ON organization_members;
CREATE TRIGGER trg_guard_owner_membership_update
BEFORE UPDATE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION guard_owner_membership_update();

DROP TRIGGER IF EXISTS trg_guard_owner_membership_delete ON organization_members;
CREATE TRIGGER trg_guard_owner_membership_delete
BEFORE DELETE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION guard_owner_membership_delete();
