-- ============================================================
-- MIGRACIÓN 1: Auth + Multi-Tenancy
-- Brian CRM — 2026-05-24
-- Ejecutar en: Supabase SQL Editor (Console)
-- Orden: 1 de 4 (antes de add_org_to_tables)
-- ============================================================

-- ─── TABLAS NUEVAS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE,
  status      text NOT NULL DEFAULT 'active',
  plan        text NOT NULL DEFAULT 'internal',
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  phone       text,
  avatar_url  text,
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             text NOT NULL DEFAULT 'solo_lectura',
  status           text NOT NULL DEFAULT 'active',
  invited_by       uuid REFERENCES auth.users(id),
  invited_at       timestamptz DEFAULT now(),
  joined_at        timestamptz,
  last_seen_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS permissions (
  key         text PRIMARY KEY,
  label       text NOT NULL,
  module      text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL = global para todas las orgs
  role             text NOT NULL,
  permission_key   text NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  UNIQUE (organization_id, role, permission_key)
);

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key   text NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  allowed          boolean NOT NULL,
  UNIQUE (organization_id, user_id, permission_key)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id    uuid REFERENCES auth.users(id),
  action           text NOT NULL,
  entity_type      text,
  entity_id        uuid,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Índices de búsqueda frecuente
CREATE INDEX IF NOT EXISTS idx_org_members_user   ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org    ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_org          ON audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor        ON audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_role_perm_role     ON role_permissions(role, organization_id);
CREATE INDEX IF NOT EXISTS idx_upo_user           ON user_permission_overrides(organization_id, user_id);

-- ─── ORGANIZACIÓN INICIAL "Brian CRM" ────────────────────────────────────────
-- UUID fija para poder referenciarla en migraciones posteriores

INSERT INTO organizations (id, name, slug, status, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Brian CRM', 'brian-crm', 'active', 'internal')
ON CONFLICT (id) DO NOTHING;

-- ─── PERMISOS ────────────────────────────────────────────────────────────────

INSERT INTO permissions (key, label, module) VALUES
  -- Dashboard
  ('dashboard.view',              'Ver dashboard',                  'dashboard'),
  -- Clientes
  ('clients.view',                'Ver clientes',                   'clients'),
  ('clients.create',              'Crear clientes',                 'clients'),
  ('clients.edit',                'Editar clientes',                'clients'),
  ('clients.delete',              'Eliminar clientes',              'clients'),
  -- Operaciones
  ('operations.view',             'Ver operaciones',                'operations'),
  ('operations.create',           'Crear operaciones',              'operations'),
  ('operations.edit',             'Editar operaciones',             'operations'),
  ('operations.delete',           'Eliminar operaciones',           'operations'),
  -- Cuotas
  ('installments.view',           'Ver cuotas',                     'installments'),
  ('installments.edit',           'Editar cuotas',                  'installments'),
  -- Pagos
  ('payments.view',               'Ver pagos',                      'payments'),
  ('payments.create',             'Registrar pagos',                'payments'),
  ('payments.reverse',            'Anular pagos',                   'payments'),
  -- Recibos
  ('receipts.view',               'Ver recibos',                    'receipts'),
  ('receipts.download',           'Descargar recibos',              'receipts'),
  ('receipts.reverse',            'Anular recibos',                 'receipts'),
  -- Caja
  ('cash.view',                   'Ver caja',                       'cash'),
  ('cash.create_manual_movement', 'Crear movimiento manual de caja','cash'),
  ('cash.edit_manual_movement',   'Editar movimiento manual de caja','cash'),
  -- Tarjetas
  ('cards.view',                  'Ver tarjetas',                   'cards'),
  ('cards.create',                'Crear tarjetas',                 'cards'),
  ('cards.edit',                  'Editar tarjetas',                'cards'),
  ('cards.delete',                'Eliminar tarjetas',              'cards'),
  ('cards.mark_statement_paid',   'Marcar resumen como pagado',     'cards'),
  -- Reportes
  ('reports.view',                'Ver reportes',                   'reports'),
  ('reports.export',              'Exportar reportes',              'reports'),
  -- Configuración
  ('settings.view',               'Ver configuración',              'settings'),
  ('settings.edit',               'Editar configuración',           'settings'),
  -- Usuarios
  ('users.view',                  'Ver usuarios',                   'users'),
  ('users.invite',                'Invitar usuarios',               'users'),
  ('users.edit_permissions',      'Editar permisos de usuarios',    'users'),
  ('users.disable',               'Deshabilitar usuarios',          'users'),
  -- Importar
  ('import.run',                  'Importar desde Excel',           'import'),
  -- Auditoría
  ('audit.view',                  'Ver log de auditoría',           'audit')
ON CONFLICT (key) DO NOTHING;

-- ─── ASIGNACIÓN BASE DE PERMISOS POR ROL (organización_id = NULL → global) ──

-- Todos los permisos disponibles para referencia
DO $$
DECLARE
  all_perms text[] := ARRAY[
    'dashboard.view',
    'clients.view','clients.create','clients.edit','clients.delete',
    'operations.view','operations.create','operations.edit','operations.delete',
    'installments.view','installments.edit',
    'payments.view','payments.create','payments.reverse',
    'receipts.view','receipts.download','receipts.reverse',
    'cash.view','cash.create_manual_movement','cash.edit_manual_movement',
    'cards.view','cards.create','cards.edit','cards.delete','cards.mark_statement_paid',
    'reports.view','reports.export',
    'settings.view','settings.edit',
    'users.view','users.invite','users.edit_permissions','users.disable',
    'import.run',
    'audit.view'
  ];
  perm text;
BEGIN
  -- owner: todos los permisos
  FOREACH perm IN ARRAY all_perms LOOP
    INSERT INTO role_permissions (organization_id, role, permission_key)
    VALUES (NULL, 'owner', perm) ON CONFLICT DO NOTHING;
  END LOOP;

  -- admin: todos los permisos
  FOREACH perm IN ARRAY all_perms LOOP
    INSERT INTO role_permissions (organization_id, role, permission_key)
    VALUES (NULL, 'admin', perm) ON CONFLICT DO NOTHING;
  END LOOP;

  -- manager: sin settings.edit, users.invite, users.edit_permissions, users.disable, import.run, audit.view
  FOREACH perm IN ARRAY all_perms LOOP
    IF perm NOT IN ('settings.edit','users.invite','users.edit_permissions','users.disable','import.run','audit.view') THEN
      INSERT INTO role_permissions (organization_id, role, permission_key)
      VALUES (NULL, 'manager', perm) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- cobrador: solo lo necesario para cobrar
  FOREACH perm IN ARRAY ARRAY[
    'dashboard.view',
    'clients.view',
    'installments.view',
    'payments.view','payments.create',
    'receipts.view','receipts.download',
    'cash.view'
  ] LOOP
    INSERT INTO role_permissions (organization_id, role, permission_key)
    VALUES (NULL, 'cobrador', perm) ON CONFLICT DO NOTHING;
  END LOOP;

  -- ventas: gestión de clientes y operaciones (sin financiero)
  FOREACH perm IN ARRAY ARRAY[
    'dashboard.view',
    'clients.view','clients.create','clients.edit',
    'operations.view','operations.create',
    'installments.view'
  ] LOOP
    INSERT INTO role_permissions (organization_id, role, permission_key)
    VALUES (NULL, 'ventas', perm) ON CONFLICT DO NOTHING;
  END LOOP;

  -- contador: lectura financiera completa + export
  FOREACH perm IN ARRAY ARRAY[
    'dashboard.view',
    'clients.view',
    'operations.view',
    'installments.view',
    'payments.view',
    'receipts.view','receipts.download',
    'cash.view',
    'cards.view',
    'reports.view','reports.export'
  ] LOOP
    INSERT INTO role_permissions (organization_id, role, permission_key)
    VALUES (NULL, 'contador', perm) ON CONFLICT DO NOTHING;
  END LOOP;

  -- solo_lectura: todos los *.view
  FOREACH perm IN ARRAY ARRAY[
    'dashboard.view',
    'clients.view',
    'operations.view',
    'installments.view',
    'payments.view',
    'receipts.view','receipts.download',
    'cash.view',
    'cards.view',
    'reports.view',
    'settings.view',
    'users.view'
  ] LOOP
    INSERT INTO role_permissions (organization_id, role, permission_key)
    VALUES (NULL, 'solo_lectura', perm) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ─── INSTRUCCIONES PARA VINCULAR A BRIAN ─────────────────────────────────────
-- PASO MANUAL REQUERIDO después de que Brian cree su cuenta en Supabase Auth:
--
-- 1. En Supabase Dashboard → Authentication → Users, crear usuario con el email de Brian.
-- 2. Copiar el UUID del usuario creado.
-- 3. Ejecutar las siguientes sentencias reemplazando '<BRIAN_AUTH_USER_ID>':
--
--   INSERT INTO profiles (id, full_name, status)
--   VALUES ('<BRIAN_AUTH_USER_ID>', 'Brian Facciano', 'active')
--   ON CONFLICT (id) DO NOTHING;
--
--   INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
--   VALUES (
--     '00000000-0000-0000-0000-000000000001',
--     '<BRIAN_AUTH_USER_ID>',
--     'owner',
--     'active',
--     now()
--   ) ON CONFLICT (organization_id, user_id) DO NOTHING;
--
-- Una vez ejecutado, Brian podrá iniciar sesión como owner de "Brian CRM".
-- ─────────────────────────────────────────────────────────────────────────────
