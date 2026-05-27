-- ============================================================
-- MIGRACIÓN 2: organization_id en tablas existentes
-- Brian CRM — 2026-05-24
-- Ejecutar en: Supabase SQL Editor (Console)
-- Orden: 2 de 4 (después de auth_multitenancy)
-- PRECAUCIÓN: Verificar duplicados de código antes de ejecutar.
--   SELECT codigo, COUNT(*) FROM clients GROUP BY codigo HAVING COUNT(*) > 1;
--   SELECT codigo, COUNT(*) FROM operations GROUP BY codigo HAVING COUNT(*) > 1;
-- ============================================================

-- ─── AGREGAR COLUMNAS A TABLAS OPERATIVAS ────────────────────────────────────

-- clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS created_by      uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by      uuid REFERENCES auth.users(id);

-- operations
ALTER TABLE operations
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS created_by      uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by      uuid REFERENCES auth.users(id);

-- installments
ALTER TABLE installments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS created_by      uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by      uuid REFERENCES auth.users(id);

-- payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS created_by      uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by      uuid REFERENCES auth.users(id);

-- payment_allocations
ALTER TABLE payment_allocations
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- receipts
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS created_by      uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by      uuid REFERENCES auth.users(id);

-- internal_operation_vouchers
ALTER TABLE internal_operation_vouchers
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- credit_cards
ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS created_by      uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by      uuid REFERENCES auth.users(id);

-- credit_card_movements
ALTER TABLE credit_card_movements
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS created_by      uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by      uuid REFERENCES auth.users(id);

-- cash_movements
ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS created_by      uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by      uuid REFERENCES auth.users(id);

-- client_notes
ALTER TABLE client_notes
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- attachments
ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- app_settings
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- credit_card_statement_payments
ALTER TABLE credit_card_statement_payments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- ─── BACKFILL: asignar todos los registros existentes a la org de Brian ───────

UPDATE clients                     SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE operations                  SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE installments                SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE payments                    SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE payment_allocations         SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE receipts                    SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE internal_operation_vouchers SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE credit_cards                SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE credit_card_movements       SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE cash_movements              SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE client_notes                SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE attachments                 SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE app_settings                SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE credit_card_statement_payments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- ─── NOT NULL después del backfill ────────────────────────────────────────────

ALTER TABLE clients                     ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE operations                  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE installments                ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE payments                    ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE payment_allocations         ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE receipts                    ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE internal_operation_vouchers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE credit_cards                ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE credit_card_movements       ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE cash_movements              ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE client_notes                ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE attachments                 ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE app_settings                ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE credit_card_statement_payments ALTER COLUMN organization_id SET NOT NULL;

-- ─── ÍNDICES POR organization_id ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_clients_org               ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_operations_org            ON operations(organization_id);
CREATE INDEX IF NOT EXISTS idx_installments_org          ON installments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org              ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocs_org        ON payment_allocations(organization_id);
CREATE INDEX IF NOT EXISTS idx_receipts_org              ON receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_org              ON internal_operation_vouchers(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_org          ON credit_cards(organization_id);
CREATE INDEX IF NOT EXISTS idx_cc_movements_org          ON credit_card_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_org        ON cash_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_org          ON client_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_attachments_org           ON attachments(organization_id);
CREATE INDEX IF NOT EXISTS idx_cc_stmt_payments_org      ON credit_card_statement_payments(organization_id);

-- ─── app_settings: único por organización ────────────────────────────────────
-- Reemplaza el singleton id=1 por singleton per-org

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_org ON app_settings(organization_id);

-- ─── CÓDIGOS ÚNICOS POR ORGANIZACIÓN ─────────────────────────────────────────
-- Cambiar unique global a unique (organization_id, codigo)
-- NOTA: Si existiera un unique constraint sobre 'codigo' a nivel global,
-- lo eliminamos y reemplazamos por la versión por-org.

DO $$
DECLARE
  rec record;
BEGIN
  -- clients
  FOR rec IN SELECT conname FROM pg_constraint WHERE conrelid = 'clients'::regclass AND contype = 'u' AND conname LIKE '%codigo%' LOOP
    EXECUTE 'ALTER TABLE clients DROP CONSTRAINT IF EXISTS ' || rec.conname;
  END LOOP;
  -- operations
  FOR rec IN SELECT conname FROM pg_constraint WHERE conrelid = 'operations'::regclass AND contype = 'u' AND conname LIKE '%codigo%' LOOP
    EXECUTE 'ALTER TABLE operations DROP CONSTRAINT IF EXISTS ' || rec.conname;
  END LOOP;
  -- installments
  FOR rec IN SELECT conname FROM pg_constraint WHERE conrelid = 'installments'::regclass AND contype = 'u' AND conname LIKE '%codigo%' LOOP
    EXECUTE 'ALTER TABLE installments DROP CONSTRAINT IF EXISTS ' || rec.conname;
  END LOOP;
  -- payments
  FOR rec IN SELECT conname FROM pg_constraint WHERE conrelid = 'payments'::regclass AND contype = 'u' AND conname LIKE '%codigo%' LOOP
    EXECUTE 'ALTER TABLE payments DROP CONSTRAINT IF EXISTS ' || rec.conname;
  END LOOP;
  -- receipts
  FOR rec IN SELECT conname FROM pg_constraint WHERE conrelid = 'receipts'::regclass AND contype = 'u' AND conname LIKE '%codigo%' LOOP
    EXECUTE 'ALTER TABLE receipts DROP CONSTRAINT IF EXISTS ' || rec.conname;
  END LOOP;
  -- internal_operation_vouchers
  FOR rec IN SELECT conname FROM pg_constraint WHERE conrelid = 'internal_operation_vouchers'::regclass AND contype = 'u' AND conname LIKE '%codigo%' LOOP
    EXECUTE 'ALTER TABLE internal_operation_vouchers DROP CONSTRAINT IF EXISTS ' || rec.conname;
  END LOOP;
END $$;

-- Crear unique (organization_id, codigo) en cada tabla que usa codigos
ALTER TABLE clients
  ADD CONSTRAINT clients_org_codigo_unique UNIQUE (organization_id, codigo);
ALTER TABLE operations
  ADD CONSTRAINT operations_org_codigo_unique UNIQUE (organization_id, codigo);
ALTER TABLE installments
  ADD CONSTRAINT installments_org_codigo_unique UNIQUE (organization_id, codigo);
ALTER TABLE payments
  ADD CONSTRAINT payments_org_codigo_unique UNIQUE (organization_id, codigo);
ALTER TABLE receipts
  ADD CONSTRAINT receipts_org_codigo_unique UNIQUE (organization_id, codigo);
ALTER TABLE internal_operation_vouchers
  ADD CONSTRAINT vouchers_org_codigo_unique UNIQUE (organization_id, codigo);

-- ─── _crm_next_code ACTUALIZADO: scoped por organización ─────────────────────

CREATE OR REPLACE FUNCTION _crm_next_code(
  p_org_id  uuid,
  p_table   text,
  p_prefix  text,
  p_column  text DEFAULT 'codigo'
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_max int;
  v_sql text;
BEGIN
  v_sql := format(
    'SELECT COALESCE(MAX(CAST(SUBSTRING(%I FROM %L) AS int)), 0)
     FROM %I
     WHERE organization_id = $1
       AND %I ~ %L',
    p_column,
    p_prefix || '-([0-9]+)$',
    p_table,
    p_column,
    '^' || p_prefix || '-[0-9]+$'
  );
  EXECUTE v_sql INTO v_max USING p_org_id;
  RETURN p_prefix || '-' || LPAD((v_max + 1)::text, 3, '0');
END;
$$;

-- _crm_next_number también scoped por org (para campos tipo 'numero')
CREATE OR REPLACE FUNCTION _crm_next_number(
  p_org_id uuid,
  p_table  text,
  p_column text
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_max int;
  v_sql text;
BEGIN
  v_sql := format(
    'SELECT COALESCE(MAX(%I::int), 0) FROM %I WHERE organization_id = $1',
    p_column, p_table
  );
  EXECUTE v_sql INTO v_max USING p_org_id;
  RETURN v_max + 1;
END;
$$;

-- ─── VERIFICACIÓN POST-MIGRACIÓN ──────────────────────────────────────────────
-- Ejecutar estas queries para confirmar que todo está correcto:
--
-- SELECT COUNT(*) FROM clients WHERE organization_id IS NULL;          -- debe ser 0
-- SELECT COUNT(*) FROM operations WHERE organization_id IS NULL;       -- debe ser 0
-- SELECT COUNT(*) FROM payments WHERE organization_id IS NULL;         -- debe ser 0
-- SELECT organization_id, COUNT(*) FROM app_settings GROUP BY 1;      -- una fila por org
-- SELECT _crm_next_code('00000000-0000-0000-0000-000000000001'::uuid, 'clients', 'CLI');  -- próximo código
