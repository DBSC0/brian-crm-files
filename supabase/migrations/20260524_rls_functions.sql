-- ============================================================
-- MIGRACIÓN 3: Funciones helper + Row Level Security
-- Brian CRM — 2026-05-24
-- Ejecutar en: Supabase SQL Editor (Console)
-- Orden: 3 de 4 (después de add_org_to_tables)
-- ============================================================

-- ─── FUNCIONES HELPER (SECURITY DEFINER = bypassan RLS para consultarse a sí mismas) ──

CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = p_user_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION get_org_role(p_org_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM organization_members
  WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION has_permission(
  p_org_id        uuid,
  p_user_id       uuid,
  p_permission_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role     text;
  v_has_base boolean := false;
  v_override boolean;
BEGIN
  -- Obtener rol activo del usuario en la organización
  v_role := get_org_role(p_org_id, p_user_id);
  IF v_role IS NULL THEN RETURN false; END IF;

  -- owner y admin tienen todos los permisos sin consultar tablas
  IF v_role IN ('owner', 'admin') THEN RETURN true; END IF;

  -- Verificar permiso base del rol (org-específico tiene prioridad sobre global)
  SELECT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role = v_role
      AND permission_key = p_permission_key
      AND (organization_id = p_org_id OR organization_id IS NULL)
  ) INTO v_has_base;

  -- Verificar override individual del usuario
  SELECT allowed
  FROM user_permission_overrides
  WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND permission_key = p_permission_key
  INTO v_override;

  -- Override tiene prioridad sobre el rol base
  IF v_override IS NOT NULL THEN RETURN v_override; END IF;
  RETURN v_has_base;
END;
$$;

-- Devuelve las organizaciones activas del usuario autenticado
CREATE OR REPLACE FUNCTION current_user_orgs()
RETURNS SETOF organizations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
  FROM organizations o
  JOIN organization_members m ON m.organization_id = o.id
  WHERE m.user_id = auth.uid()
    AND m.status = 'active'
    AND o.status = 'active';
$$;

-- ─── RLS EN TABLAS DE AUTENTICACIÓN Y CONTROL ────────────────────────────────

ALTER TABLE organizations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                 ENABLE ROW LEVEL SECURITY;

-- profiles: cada usuario ve y modifica solo su propio perfil
CREATE POLICY profiles_self_select ON profiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY profiles_self_update ON profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY profiles_self_insert ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- organizations: solo miembros activos pueden ver la org
CREATE POLICY orgs_member_select ON organizations FOR SELECT
  USING (is_org_member(id, auth.uid()));

-- organization_members: miembros ven a otros miembros de su org;
--   solo admins pueden escribir
CREATE POLICY members_select ON organization_members FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY members_insert ON organization_members FOR INSERT
  WITH CHECK (has_permission(organization_id, auth.uid(), 'users.invite'));

CREATE POLICY members_update ON organization_members FOR UPDATE
  USING (has_permission(organization_id, auth.uid(), 'users.edit_permissions'));

CREATE POLICY members_delete ON organization_members FOR DELETE
  USING (has_permission(organization_id, auth.uid(), 'users.disable'));

-- role_permissions: miembros pueden leer (para cargar permisos en frontend)
CREATE POLICY rp_select ON role_permissions FOR SELECT
  USING (
    organization_id IS NULL
    OR is_org_member(organization_id, auth.uid())
  );
CREATE POLICY rp_write ON role_permissions FOR ALL
  USING (has_permission(organization_id, auth.uid(), 'users.edit_permissions'));

-- user_permission_overrides: solo admins
CREATE POLICY upo_select ON user_permission_overrides FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY upo_write ON user_permission_overrides FOR ALL
  USING (has_permission(organization_id, auth.uid(), 'users.edit_permissions'));

-- audit_log: solo quienes tienen audit.view pueden leer; insertar si es miembro
CREATE POLICY audit_select ON audit_log FOR SELECT
  USING (has_permission(organization_id, auth.uid(), 'audit.view'));
CREATE POLICY audit_insert ON audit_log FOR INSERT
  WITH CHECK (is_org_member(organization_id, auth.uid()));

-- ─── RLS EN TABLAS OPERATIVAS ────────────────────────────────────────────────

-- CLIENTS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select ON clients FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY clients_insert ON clients FOR INSERT
  WITH CHECK (
    is_org_member(organization_id, auth.uid())
    AND has_permission(organization_id, auth.uid(), 'clients.create')
  );

CREATE POLICY clients_update ON clients FOR UPDATE
  USING (is_org_member(organization_id, auth.uid()))
  WITH CHECK (has_permission(organization_id, auth.uid(), 'clients.edit'));

CREATE POLICY clients_delete ON clients FOR DELETE
  USING (has_permission(organization_id, auth.uid(), 'clients.delete'));

-- OPERATIONS
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY operations_select ON operations FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY operations_insert ON operations FOR INSERT
  WITH CHECK (
    is_org_member(organization_id, auth.uid())
    AND has_permission(organization_id, auth.uid(), 'operations.create')
  );

CREATE POLICY operations_update ON operations FOR UPDATE
  USING (is_org_member(organization_id, auth.uid()))
  WITH CHECK (has_permission(organization_id, auth.uid(), 'operations.edit'));

CREATE POLICY operations_delete ON operations FOR DELETE
  USING (has_permission(organization_id, auth.uid(), 'operations.delete'));

-- INSTALLMENTS
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY installments_select ON installments FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

-- Cuotas se crean/modifican solo vía RPCs (que usan SECURITY DEFINER)
-- Política permisiva para miembros activos con permiso mínimo
CREATE POLICY installments_insert ON installments FOR INSERT
  WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY installments_update ON installments FOR UPDATE
  USING (is_org_member(organization_id, auth.uid()))
  WITH CHECK (has_permission(organization_id, auth.uid(), 'installments.edit'));

CREATE POLICY installments_delete ON installments FOR DELETE
  USING (has_permission(organization_id, auth.uid(), 'operations.delete'));

-- PAYMENTS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select ON payments FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY payments_insert ON payments FOR INSERT
  WITH CHECK (
    is_org_member(organization_id, auth.uid())
    AND has_permission(organization_id, auth.uid(), 'payments.create')
  );

CREATE POLICY payments_update ON payments FOR UPDATE
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY payments_delete ON payments FOR DELETE
  USING (has_permission(organization_id, auth.uid(), 'payments.reverse'));

-- PAYMENT_ALLOCATIONS
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY pa_select ON payment_allocations FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

-- Sólo via RPCs
CREATE POLICY pa_insert ON payment_allocations FOR INSERT
  WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY pa_delete ON payment_allocations FOR DELETE
  USING (is_org_member(organization_id, auth.uid()));

-- RECEIPTS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY receipts_select ON receipts FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY receipts_insert ON receipts FOR INSERT
  WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY receipts_delete ON receipts FOR DELETE
  USING (has_permission(organization_id, auth.uid(), 'receipts.reverse'));

-- INTERNAL_OPERATION_VOUCHERS
ALTER TABLE internal_operation_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY vouchers_select ON internal_operation_vouchers FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY vouchers_insert ON internal_operation_vouchers FOR INSERT
  WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY vouchers_delete ON internal_operation_vouchers FOR DELETE
  USING (is_org_member(organization_id, auth.uid()));

-- CREDIT_CARDS
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY cards_select ON credit_cards FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY cards_insert ON credit_cards FOR INSERT
  WITH CHECK (
    is_org_member(organization_id, auth.uid())
    AND has_permission(organization_id, auth.uid(), 'cards.create')
  );

CREATE POLICY cards_update ON credit_cards FOR UPDATE
  USING (is_org_member(organization_id, auth.uid()))
  WITH CHECK (has_permission(organization_id, auth.uid(), 'cards.edit'));

CREATE POLICY cards_delete ON credit_cards FOR DELETE
  USING (has_permission(organization_id, auth.uid(), 'cards.delete'));

-- CREDIT_CARD_MOVEMENTS
ALTER TABLE credit_card_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY cc_mov_select ON credit_card_movements FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY cc_mov_insert ON credit_card_movements FOR INSERT
  WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY cc_mov_update ON credit_card_movements FOR UPDATE
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY cc_mov_delete ON credit_card_movements FOR DELETE
  USING (is_org_member(organization_id, auth.uid()));

-- CASH_MOVEMENTS
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY cash_select ON cash_movements FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY cash_insert ON cash_movements FOR INSERT
  WITH CHECK (
    is_org_member(organization_id, auth.uid())
    AND (
      -- Movimientos automáticos vía RPCs siempre pasan (son SECURITY DEFINER)
      -- Movimientos manuales requieren permiso
      has_permission(organization_id, auth.uid(), 'cash.create_manual_movement')
    )
  );

CREATE POLICY cash_update ON cash_movements FOR UPDATE
  USING (is_org_member(organization_id, auth.uid()))
  WITH CHECK (has_permission(organization_id, auth.uid(), 'cash.edit_manual_movement'));

CREATE POLICY cash_delete ON cash_movements FOR DELETE
  USING (has_permission(organization_id, auth.uid(), 'cash.edit_manual_movement'));

-- CLIENT_NOTES
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_notes_select ON client_notes FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY client_notes_insert ON client_notes FOR INSERT
  WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY client_notes_update ON client_notes FOR UPDATE
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY client_notes_delete ON client_notes FOR DELETE
  USING (is_org_member(organization_id, auth.uid()));

-- ATTACHMENTS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY attachments_select ON attachments FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY attachments_insert ON attachments FOR INSERT
  WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY attachments_delete ON attachments FOR DELETE
  USING (is_org_member(organization_id, auth.uid()));

-- APP_SETTINGS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_select ON app_settings FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY settings_write ON app_settings FOR ALL
  USING (has_permission(organization_id, auth.uid(), 'settings.edit'));

-- CREDIT_CARD_STATEMENT_PAYMENTS
ALTER TABLE credit_card_statement_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY cc_stmt_select ON credit_card_statement_payments FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY cc_stmt_insert ON credit_card_statement_payments FOR INSERT
  WITH CHECK (
    is_org_member(organization_id, auth.uid())
    AND has_permission(organization_id, auth.uid(), 'cards.mark_statement_paid')
  );

CREATE POLICY cc_stmt_update ON credit_card_statement_payments FOR UPDATE
  USING (is_org_member(organization_id, auth.uid()))
  WITH CHECK (has_permission(organization_id, auth.uid(), 'cards.mark_statement_paid'));

CREATE POLICY cc_stmt_delete ON credit_card_statement_payments FOR DELETE
  USING (has_permission(organization_id, auth.uid(), 'cards.mark_statement_paid'));

-- ─── PERMISSIONS TABLE: lectura pública autenticada (no sensible) ─────────────
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY perms_read ON permissions FOR SELECT TO authenticated USING (true);
