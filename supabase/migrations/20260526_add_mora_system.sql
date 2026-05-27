-- ============================================================
-- MIGRACION: Sistema real de mora
-- Brian CRM - 2026-05-26
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1) Columnas de mora en cuotas
ALTER TABLE installments
  ADD COLUMN IF NOT EXISTS mora_pagada numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mora_condonada numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mora_actualizada_hasta date,
  ADD COLUMN IF NOT EXISTS mora_tasa_diaria numeric(18,6),
  ADD COLUMN IF NOT EXISTS mora_dias_gracia integer,
  ADD COLUMN IF NOT EXISTS mora_base_calculo text,
  ADD COLUMN IF NOT EXISTS mora_tipo_calculo text,
  ADD COLUMN IF NOT EXISTS mora_congelada boolean NOT NULL DEFAULT false;

UPDATE installments
SET
  mora_pagada = COALESCE(mora_pagada, 0),
  mora_condonada = COALESCE(mora_condonada, 0),
  mora_congelada = COALESCE(mora_congelada, false),
  mora_aplicada = COALESCE(mora_aplicada, 0),
  mora_aplicada_base = COALESCE(mora_aplicada_base, COALESCE(mora_aplicada, 0) * CASE WHEN moneda = 'USD' THEN COALESCE(tipo_cambio, 1) ELSE 1 END);

-- 2) Desglose de imputaciones
ALTER TABLE payment_allocations
  ADD COLUMN IF NOT EXISTS monto_cuota_aplicado numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_mora_aplicado numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_mora_aplicado_base numeric(18,2) NOT NULL DEFAULT 0;

UPDATE payment_allocations
SET
  monto_cuota_aplicado = CASE WHEN COALESCE(monto_cuota_aplicado, 0) = 0 AND COALESCE(monto_mora_aplicado, 0) = 0 THEN COALESCE(monto_aplicado, 0) ELSE COALESCE(monto_cuota_aplicado, 0) END,
  monto_mora_aplicado = COALESCE(monto_mora_aplicado, 0),
  monto_mora_aplicado_base = COALESCE(monto_mora_aplicado_base, 0);

-- 3) Historial/auditoria de mora
CREATE TABLE IF NOT EXISTS installment_mora_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  installment_id uuid NOT NULL REFERENCES installments(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('auto','manual','condonacion','anulacion','recalculo','congelar','descongelar')),
  fecha timestamptz NOT NULL DEFAULT now(),
  dias_aplicados integer NOT NULL DEFAULT 0,
  tasa_diaria numeric(18,6) NOT NULL DEFAULT 0,
  base_calculo text,
  tipo_calculo text,
  monto_mora numeric(18,2) NOT NULL DEFAULT 0,
  monto_anterior numeric(18,2) NOT NULL DEFAULT 0,
  monto_nuevo numeric(18,2) NOT NULL DEFAULT 0,
  notas text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mora_events_org ON installment_mora_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_mora_events_installment ON installment_mora_events(installment_id);
CREATE INDEX IF NOT EXISTS idx_mora_events_client ON installment_mora_events(client_id);
CREATE INDEX IF NOT EXISTS idx_mora_events_fecha ON installment_mora_events(fecha DESC);

ALTER TABLE installment_mora_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mora_events_select ON installment_mora_events;
CREATE POLICY mora_events_select ON installment_mora_events FOR SELECT
  USING (is_org_member(organization_id, auth.uid()) AND has_permission(organization_id, auth.uid(), 'mora.ver'));

DROP POLICY IF EXISTS mora_events_insert ON installment_mora_events;
CREATE POLICY mora_events_insert ON installment_mora_events FOR INSERT
  WITH CHECK (is_org_member(organization_id, auth.uid()));

-- 4) Permisos
INSERT INTO permissions (key, label, module) VALUES
  ('mora.ver', 'Ver mora', 'mora'),
  ('mora.aplicar', 'Aplicar mora', 'mora'),
  ('mora.condonar', 'Condonar mora', 'mora'),
  ('mora.configurar', 'Configurar mora', 'mora'),
  ('mora.congelar', 'Congelar mora', 'mora'),
  ('mora.historial', 'Ver historial de mora', 'mora')
ON CONFLICT (key) DO NOTHING;

DO $$
DECLARE
  perm text;
BEGIN
  FOREACH perm IN ARRAY ARRAY['mora.ver','mora.aplicar','mora.condonar','mora.configurar','mora.congelar','mora.historial'] LOOP
    INSERT INTO role_permissions (organization_id, role, permission_key) VALUES (NULL, 'owner', perm) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions (organization_id, role, permission_key) VALUES (NULL, 'admin', perm) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions (organization_id, role, permission_key) VALUES (NULL, 'manager', perm) ON CONFLICT DO NOTHING;
  END LOOP;
  INSERT INTO role_permissions (organization_id, role, permission_key) VALUES (NULL, 'cobrador', 'mora.ver') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (organization_id, role, permission_key) VALUES (NULL, 'cobrador', 'mora.aplicar') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (organization_id, role, permission_key) VALUES (NULL, 'contador', 'mora.ver') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (organization_id, role, permission_key) VALUES (NULL, 'contador', 'mora.historial') ON CONFLICT DO NOTHING;
END $$;

-- 5) Helpers SQL privados
CREATE OR REPLACE FUNCTION _crm_mora_config(p_org_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH s AS (
    SELECT COALESCE(
      (SELECT parametros_financieros->'mora'
       FROM app_settings
       WHERE organization_id = p_org_id
       LIMIT 1),
      '{}'::jsonb
    ) AS cfg
  )
  SELECT jsonb_build_object(
    'activa', COALESCE((cfg->>'activa')::boolean, true),
    'modo', COALESCE(NULLIF(cfg->>'modo',''), 'automatica_confirmacion'),
    'tasaDiaria', COALESCE(NULLIF(cfg->>'tasaDiaria','')::numeric, 1),
    'diasGracia', COALESCE(NULLIF(cfg->>'diasGracia','')::int, 3),
    'baseCalculo', COALESCE(NULLIF(cfg->>'baseCalculo',''), 'saldo_pendiente'),
    'tipoCalculo', COALESCE(NULLIF(cfg->>'tipoCalculo',''), 'simple'),
    'topePorcentaje', NULLIF(cfg->>'topePorcentaje','')::numeric,
    'redondeo', COALESCE(NULLIF(cfg->>'redondeo',''), 'sin_redondeo')
  )
  FROM s;
$$;

CREATE OR REPLACE FUNCTION _crm_round_mora(p_amount numeric, p_round text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  step numeric;
BEGIN
  step := CASE p_round WHEN '100' THEN 100 WHEN '500' THEN 500 WHEN '1000' THEN 1000 ELSE 0 END;
  IF step <= 0 THEN
    RETURN ROUND(COALESCE(p_amount, 0), 2);
  END IF;
  RETURN CEIL(COALESCE(p_amount, 0) / step) * step;
END;
$$;

CREATE OR REPLACE FUNCTION _crm_pending_mora_amount(p_inst installments, p_cfg jsonb, p_today date)
RETURNS TABLE(monto numeric, dias integer, base numeric, tasa numeric, base_calculo text, tipo_calculo text)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_activa boolean := COALESCE((p_cfg->>'activa')::boolean, true);
  v_gracia int := COALESCE((p_cfg->>'diasGracia')::int, 3);
  v_tasa numeric := COALESCE((p_cfg->>'tasaDiaria')::numeric, 1);
  v_base_calc text := COALESCE(p_cfg->>'baseCalculo', 'saldo_pendiente');
  v_tipo_calc text := COALESCE(p_cfg->>'tipoCalculo', 'simple');
  v_tope numeric := NULLIF(p_cfg->>'topePorcentaje','')::numeric;
  v_round text := COALESCE(p_cfg->>'redondeo', 'sin_redondeo');
  v_due date;
  v_start date;
  v_total_days int;
  v_new_days int;
  v_base numeric;
  v_raw numeric;
  v_cap numeric;
  v_available numeric;
BEGIN
  IF NOT v_activa
    OR p_inst.estado IN ('Pagada','Anulada','Refinanciada')
    OR COALESCE(p_inst.saldo_pendiente, 0) <= 0
    OR COALESCE(p_inst.mora_congelada, false)
  THEN
    RETURN QUERY SELECT 0::numeric, 0::int, 0::numeric, v_tasa, v_base_calc, v_tipo_calc;
    RETURN;
  END IF;

  v_due := p_inst.fecha_vencimiento::date;
  IF p_today <= v_due THEN
    RETURN QUERY SELECT 0::numeric, 0::int, 0::numeric, v_tasa, v_base_calc, v_tipo_calc;
    RETURN;
  END IF;

  v_total_days := GREATEST(0, (p_today - v_due) - v_gracia);
  IF v_total_days <= 0 THEN
    RETURN QUERY SELECT 0::numeric, 0::int, 0::numeric, v_tasa, v_base_calc, v_tipo_calc;
    RETURN;
  END IF;

  v_start := GREATEST(v_due + v_gracia, COALESCE(p_inst.mora_actualizada_hasta, v_due + v_gracia));
  v_new_days := GREATEST(0, p_today - v_start);
  IF v_new_days <= 0 THEN
    RETURN QUERY SELECT 0::numeric, 0::int, 0::numeric, v_tasa, v_base_calc, v_tipo_calc;
    RETURN;
  END IF;

  v_base := CASE WHEN v_base_calc = 'monto_programado' THEN COALESCE(p_inst.monto_programado, 0) ELSE COALESCE(p_inst.saldo_pendiente, 0) END;
  IF v_tipo_calc = 'compuesto' THEN
    v_raw := v_base * (POWER(1 + (v_tasa / 100), v_new_days) - 1);
  ELSE
    v_raw := v_base * (v_tasa / 100) * v_new_days;
  END IF;

  IF v_tope IS NOT NULL THEN
    v_cap := v_base * v_tope / 100;
    v_available := GREATEST(0, v_cap - COALESCE(p_inst.mora_aplicada, 0));
    v_raw := LEAST(v_raw, v_available);
  END IF;

  RETURN QUERY SELECT _crm_round_mora(v_raw, v_round), v_new_days, v_base, v_tasa, v_base_calc, v_tipo_calc;
END;
$$;

-- 6) RPCs de mora
CREATE OR REPLACE FUNCTION apply_installment_mora(
  p_organization_id uuid,
  p_installment_id uuid,
  p_today date DEFAULT CURRENT_DATE,
  p_notas text DEFAULT NULL,
  p_tipo_evento text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inst installments%rowtype;
  v_cfg jsonb;
  v_calc record;
  v_new numeric;
  v_base_amount numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT is_org_member(p_organization_id, v_uid) THEN RAISE EXCEPTION 'No sos miembro de esta organizacion'; END IF;
  IF NOT has_permission(p_organization_id, v_uid, 'mora.aplicar') THEN RAISE EXCEPTION 'Sin permiso: mora.aplicar'; END IF;

  SELECT * INTO v_inst FROM installments WHERE id = p_installment_id AND organization_id = p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuota no encontrada'; END IF;

  v_cfg := _crm_mora_config(p_organization_id);
  SELECT * INTO v_calc FROM _crm_pending_mora_amount(v_inst, v_cfg, COALESCE(p_today, CURRENT_DATE));

  IF COALESCE(v_calc.monto, 0) <= 0 THEN
    RETURN jsonb_build_object('updated', false, 'monto_mora', 0, 'dias_aplicados', 0);
  END IF;

  v_new := COALESCE(v_inst.mora_aplicada, 0) + v_calc.monto;
  v_base_amount := v_calc.monto * CASE WHEN v_inst.moneda = 'USD' THEN COALESCE(v_inst.tipo_cambio, 1) ELSE 1 END;

  UPDATE installments
  SET
    mora_aplicada = v_new,
    mora_aplicada_base = COALESCE(mora_aplicada_base, 0) + v_base_amount,
    mora_actualizada_hasta = COALESCE(p_today, CURRENT_DATE),
    mora_tasa_diaria = v_calc.tasa,
    mora_dias_gracia = COALESCE((v_cfg->>'diasGracia')::int, 3),
    mora_base_calculo = v_calc.base_calculo,
    mora_tipo_calculo = v_calc.tipo_calculo,
    estado = CASE WHEN estado NOT IN ('Anulada','Refinanciada','Pagada') THEN 'Vencida' ELSE estado END
  WHERE id = p_installment_id;

  INSERT INTO installment_mora_events (
    organization_id, client_id, operation_id, installment_id, tipo,
    dias_aplicados, tasa_diaria, base_calculo, tipo_calculo,
    monto_mora, monto_anterior, monto_nuevo, notas, created_by
  )
  VALUES (
    p_organization_id, v_inst.client_id, v_inst.operation_id, v_inst.id,
    CASE WHEN p_tipo_evento = 'auto' THEN 'auto' ELSE 'manual' END,
    v_calc.dias, v_calc.tasa, v_calc.base_calculo, v_calc.tipo_calculo,
    v_calc.monto, COALESCE(v_inst.mora_aplicada, 0), v_new, p_notas, v_uid
  );

  RETURN jsonb_build_object('updated', true, 'monto_mora', v_calc.monto, 'dias_aplicados', v_calc.dias, 'installment_id', p_installment_id);
END;
$$;

CREATE OR REPLACE FUNCTION apply_bulk_mora(
  p_organization_id uuid,
  p_items jsonb,
  p_today date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_res jsonb;
  v_count int := 0;
  v_total numeric := 0;
  v_clients uuid[] := ARRAY[]::uuid[];
  v_inst installments%rowtype;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    v_res := apply_installment_mora(
      p_organization_id,
      (v_item->>'installment_id')::uuid,
      COALESCE(p_today, CURRENT_DATE),
      v_item->>'notas',
      COALESCE(v_item->>'tipo_evento', 'auto')
    );
    IF COALESCE((v_res->>'updated')::boolean, false) THEN
      v_count := v_count + 1;
      v_total := v_total + COALESCE((v_res->>'monto_mora')::numeric, 0);
      SELECT * INTO v_inst FROM installments WHERE id = (v_item->>'installment_id')::uuid;
      IF v_inst.client_id IS NOT NULL AND NOT v_inst.client_id = ANY(v_clients) THEN
        v_clients := array_append(v_clients, v_inst.client_id);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('cuotas_actualizadas', v_count, 'monto_total_mora', v_total, 'clientes_afectados', COALESCE(array_length(v_clients, 1), 0));
END;
$$;

CREATE OR REPLACE FUNCTION condone_installment_mora(
  p_organization_id uuid,
  p_installment_id uuid,
  p_monto numeric,
  p_notas text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inst installments%rowtype;
  v_amount numeric;
  v_prev numeric;
  v_new numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT is_org_member(p_organization_id, v_uid) THEN RAISE EXCEPTION 'No sos miembro de esta organizacion'; END IF;
  IF NOT has_permission(p_organization_id, v_uid, 'mora.condonar') THEN RAISE EXCEPTION 'Sin permiso: mora.condonar'; END IF;

  SELECT * INTO v_inst FROM installments WHERE id = p_installment_id AND organization_id = p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuota no encontrada'; END IF;

  v_prev := COALESCE(v_inst.mora_condonada, 0);
  v_amount := LEAST(GREATEST(COALESCE(p_monto, 0), 0), GREATEST(0, COALESCE(v_inst.mora_aplicada, 0) - COALESCE(v_inst.mora_pagada, 0) - v_prev));
  v_new := v_prev + v_amount;

  UPDATE installments SET mora_condonada = v_new WHERE id = p_installment_id;

  INSERT INTO installment_mora_events (
    organization_id, client_id, operation_id, installment_id, tipo,
    monto_mora, monto_anterior, monto_nuevo, notas, created_by
  )
  VALUES (p_organization_id, v_inst.client_id, v_inst.operation_id, v_inst.id, 'condonacion', v_amount, v_prev, v_new, p_notas, v_uid);

  RETURN jsonb_build_object('updated', true, 'monto_condonado', v_amount, 'installment_id', p_installment_id);
END;
$$;

CREATE OR REPLACE FUNCTION set_installment_mora_frozen(
  p_organization_id uuid,
  p_installment_id uuid,
  p_frozen boolean,
  p_notas text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inst installments%rowtype;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT is_org_member(p_organization_id, v_uid) THEN RAISE EXCEPTION 'No sos miembro de esta organizacion'; END IF;
  IF NOT has_permission(p_organization_id, v_uid, 'mora.congelar') THEN RAISE EXCEPTION 'Sin permiso: mora.congelar'; END IF;

  SELECT * INTO v_inst FROM installments WHERE id = p_installment_id AND organization_id = p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuota no encontrada'; END IF;

  UPDATE installments SET mora_congelada = COALESCE(p_frozen, false) WHERE id = p_installment_id;

  INSERT INTO installment_mora_events (
    organization_id, client_id, operation_id, installment_id, tipo,
    monto_mora, monto_anterior, monto_nuevo, notas, created_by
  )
  VALUES (p_organization_id, v_inst.client_id, v_inst.operation_id, v_inst.id, CASE WHEN COALESCE(p_frozen,false) THEN 'congelar' ELSE 'descongelar' END, 0, 0, 0, p_notas, v_uid);

  RETURN jsonb_build_object('updated', true, 'frozen', COALESCE(p_frozen, false), 'installment_id', p_installment_id);
END;
$$;

-- 7) register_payment extendido con mora
CREATE OR REPLACE FUNCTION register_payment(
  p_payment            jsonb,
  p_receipt            jsonb,
  p_allocations        jsonb,
  p_installment_updates jsonb,
  p_cash_movement      jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_org_id     uuid;
  v_payment_id uuid;
  v_receipt_id uuid;
  v_alloc      jsonb;
  v_inst       jsonb;
  v_moneda     text;
  v_rate       numeric;
  v_source     text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  v_org_id := (p_payment ->> 'organization_id')::uuid;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'organization_id requerido'; END IF;
  IF NOT is_org_member(v_org_id, v_uid) THEN RAISE EXCEPTION 'No sos miembro de esta organizacion'; END IF;
  IF NOT has_permission(v_org_id, v_uid, 'payments.create') THEN RAISE EXCEPTION 'Sin permiso: payments.create'; END IF;

  v_moneda := _crm_json_text(p_payment, 'moneda', 'ARS');
  v_rate   := GREATEST(_crm_json_num(p_payment, 'tipo_cambio', 1), 0.000001);
  v_source := _crm_json_text(p_payment, 'tipo_cambio_fuente', CASE WHEN v_moneda = 'ARS' THEN 'historico_ars' ELSE 'manual' END);

  INSERT INTO payments (
    organization_id, created_by,
    codigo, client_id, fecha_pago, monto, metodo_pago, notas,
    moneda, tipo_cambio, tipo_cambio_fuente, monto_base
  )
  VALUES (
    v_org_id, v_uid,
    _crm_json_text(p_payment,'codigo', _crm_next_code(v_org_id,'payments','PAG')),
    (p_payment ->> 'client_id')::uuid,
    COALESCE((p_payment ->> 'fecha_pago')::date, CURRENT_DATE),
    _crm_json_num(p_payment,'monto'),
    p_payment ->> 'metodo_pago',
    p_payment ->> 'notas',
    v_moneda, v_rate, v_source,
    COALESCE(_crm_json_num(p_payment,'monto_base',NULL), _crm_json_num(p_payment,'monto') * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END)
  )
  RETURNING id INTO v_payment_id;

  INSERT INTO receipts (
    organization_id, created_by,
    codigo, payment_id, client_id, numero, estado, fecha,
    moneda, tipo_cambio, tipo_cambio_fuente, monto_base
  )
  VALUES (
    v_org_id, v_uid,
    _crm_json_text(p_receipt,'codigo', _crm_next_code(v_org_id,'receipts','REC')),
    v_payment_id,
    COALESCE(NULLIF(p_receipt ->> 'client_id','')::uuid, (p_payment ->> 'client_id')::uuid),
    COALESCE(_crm_json_text(p_receipt,'numero',NULL), _crm_next_number(v_org_id,'receipts','numero')::text),
    _crm_json_text(p_receipt,'estado','Emitido'),
    COALESCE((p_receipt ->> 'fecha')::date, CURRENT_DATE),
    _crm_json_text(p_receipt,'moneda',v_moneda),
    GREATEST(_crm_json_num(p_receipt,'tipo_cambio',v_rate), 0.000001),
    _crm_json_text(p_receipt,'tipo_cambio_fuente',v_source),
    COALESCE(_crm_json_num(p_receipt,'monto_base',NULL), _crm_json_num(p_payment,'monto') * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END)
  )
  RETURNING id INTO v_receipt_id;

  UPDATE payments SET receipt_id = v_receipt_id WHERE id = v_payment_id;

  FOR v_alloc IN SELECT * FROM jsonb_array_elements(COALESCE(p_allocations,'[]'::jsonb))
  LOOP
    INSERT INTO payment_allocations (
      organization_id,
      payment_id, installment_id, monto_aplicado,
      payment_moneda, installment_moneda, tipo_cambio_pago, tipo_cambio_installment,
      monto_pago_aplicado, monto_aplicado_base, monto_cuota_aplicado_base,
      monto_cuota_aplicado, monto_mora_aplicado, monto_mora_aplicado_base
    )
    VALUES (
      v_org_id,
      v_payment_id,
      (v_alloc ->> 'installment_id')::uuid,
      _crm_json_num(v_alloc,'monto_aplicado'),
      _crm_json_text(v_alloc,'payment_moneda',v_moneda),
      _crm_json_text(v_alloc,'installment_moneda','ARS'),
      GREATEST(_crm_json_num(v_alloc,'tipo_cambio_pago',v_rate), 0.000001),
      GREATEST(_crm_json_num(v_alloc,'tipo_cambio_installment',1), 0.000001),
      COALESCE(_crm_json_num(v_alloc,'monto_pago_aplicado',NULL), _crm_json_num(v_alloc,'monto_aplicado')),
      COALESCE(_crm_json_num(v_alloc,'monto_aplicado_base',NULL), _crm_json_num(v_alloc,'monto_aplicado')),
      COALESCE(_crm_json_num(v_alloc,'monto_cuota_aplicado_base',NULL), _crm_json_num(v_alloc,'monto_aplicado')),
      COALESCE(_crm_json_num(v_alloc,'monto_cuota_aplicado',NULL), _crm_json_num(v_alloc,'monto_aplicado')),
      _crm_json_num(v_alloc,'monto_mora_aplicado'),
      COALESCE(_crm_json_num(v_alloc,'monto_mora_aplicado_base',NULL), _crm_json_num(v_alloc,'monto_mora_aplicado'))
    );
  END LOOP;

  FOR v_inst IN SELECT * FROM jsonb_array_elements(COALESCE(p_installment_updates,'[]'::jsonb))
  LOOP
    UPDATE installments SET
      monto_pagado       = _crm_json_num(v_inst,'monto_pagado'),
      saldo_pendiente    = _crm_json_num(v_inst,'saldo_pendiente'),
      mora_pagada        = COALESCE(_crm_json_num(v_inst,'mora_pagada',NULL), mora_pagada),
      estado             = _crm_json_text(v_inst,'estado',estado),
      monto_pagado_base  = COALESCE(_crm_json_num(v_inst,'monto_pagado_base',NULL), _crm_json_num(v_inst,'monto_pagado') * CASE WHEN moneda='USD' THEN tipo_cambio ELSE 1 END),
      saldo_pendiente_base = COALESCE(_crm_json_num(v_inst,'saldo_pendiente_base',NULL), _crm_json_num(v_inst,'saldo_pendiente') * CASE WHEN moneda='USD' THEN tipo_cambio ELSE 1 END)
    WHERE id = (v_inst ->> 'id')::uuid;
  END LOOP;

  INSERT INTO cash_movements (
    organization_id, created_by,
    tipo, monto, client_id, operation_id, payment_id, credit_card_id,
    descripcion, fecha, moneda, tipo_cambio, tipo_cambio_fuente, monto_base
  )
  VALUES (
    v_org_id, v_uid,
    p_cash_movement ->> 'tipo',
    _crm_json_num(p_cash_movement,'monto'),
    COALESCE(NULLIF(p_cash_movement ->> 'client_id','')::uuid, (p_payment ->> 'client_id')::uuid),
    NULLIF(p_cash_movement ->> 'operation_id','')::uuid,
    v_payment_id,
    NULLIF(p_cash_movement ->> 'credit_card_id','')::uuid,
    p_cash_movement ->> 'descripcion',
    COALESCE((p_cash_movement ->> 'fecha')::date, CURRENT_DATE),
    _crm_json_text(p_cash_movement,'moneda',v_moneda),
    GREATEST(_crm_json_num(p_cash_movement,'tipo_cambio',v_rate), 0.000001),
    _crm_json_text(p_cash_movement,'tipo_cambio_fuente',v_source),
    COALESCE(_crm_json_num(p_cash_movement,'monto_base',NULL), _crm_json_num(p_cash_movement,'monto') * CASE WHEN _crm_json_text(p_cash_movement,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END)
  );

  BEGIN
    INSERT INTO audit_log (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (v_org_id, v_uid, 'payment_registered', 'payments', v_payment_id,
            jsonb_build_object('monto', _crm_json_num(p_payment,'monto'), 'moneda', v_moneda, 'client_id', p_payment ->> 'client_id'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_payment_id;
END;
$$;

-- 8) reverse_payment extendido con mora
CREATE OR REPLACE FUNCTION reverse_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_org_id uuid;
  v_alloc  record;
  v_inst   record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT organization_id INTO v_org_id FROM payments WHERE id = p_payment_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
  IF NOT is_org_member(v_org_id, v_uid) THEN RAISE EXCEPTION 'No sos miembro de esta organizacion'; END IF;
  IF NOT has_permission(v_org_id, v_uid, 'payments.reverse') THEN RAISE EXCEPTION 'Sin permiso: payments.reverse'; END IF;

  FOR v_alloc IN SELECT * FROM payment_allocations WHERE payment_id = p_payment_id
  LOOP
    SELECT * INTO v_inst FROM installments WHERE id = v_alloc.installment_id FOR UPDATE;
    UPDATE installments SET
      monto_pagado = GREATEST(0, COALESCE(v_inst.monto_pagado,0) - COALESCE(v_alloc.monto_cuota_aplicado, v_alloc.monto_aplicado, 0)),
      saldo_pendiente = COALESCE(v_inst.saldo_pendiente,0) + COALESCE(v_alloc.monto_cuota_aplicado, v_alloc.monto_aplicado, 0),
      mora_pagada = GREATEST(0, COALESCE(v_inst.mora_pagada,0) - COALESCE(v_alloc.monto_mora_aplicado, 0)),
      monto_pagado_base = GREATEST(0, COALESCE(v_inst.monto_pagado_base,0) - COALESCE(v_alloc.monto_cuota_aplicado_base, v_alloc.monto_aplicado_base, v_alloc.monto_aplicado, 0)),
      saldo_pendiente_base = COALESCE(v_inst.saldo_pendiente_base,0) + COALESCE(v_alloc.monto_cuota_aplicado_base, v_alloc.monto_aplicado_base, v_alloc.monto_aplicado, 0),
      estado = CASE
        WHEN (COALESCE(v_inst.saldo_pendiente,0) + COALESCE(v_alloc.monto_cuota_aplicado, v_alloc.monto_aplicado, 0)) <= 0
          AND (COALESCE(v_inst.mora_aplicada,0) - GREATEST(0, COALESCE(v_inst.mora_pagada,0) - COALESCE(v_alloc.monto_mora_aplicado,0)) - COALESCE(v_inst.mora_condonada,0)) <= 0
          THEN 'Pagada'
        WHEN v_inst.fecha_vencimiento < CURRENT_DATE THEN 'Vencida'
        WHEN GREATEST(0, COALESCE(v_inst.monto_pagado,0) - COALESCE(v_alloc.monto_cuota_aplicado, v_alloc.monto_aplicado, 0)) > 0 THEN 'Parcial'
        ELSE 'Pendiente'
      END
    WHERE id = v_alloc.installment_id;
  END LOOP;

  DELETE FROM cash_movements WHERE payment_id = p_payment_id;
  DELETE FROM payment_allocations WHERE payment_id = p_payment_id;
  DELETE FROM receipts WHERE payment_id = p_payment_id;
  DELETE FROM payments WHERE id = p_payment_id;

  BEGIN
    INSERT INTO audit_log (organization_id, actor_user_id, action, entity_type, entity_id)
    VALUES (v_org_id, v_uid, 'payment_reversed', 'payments', p_payment_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;
