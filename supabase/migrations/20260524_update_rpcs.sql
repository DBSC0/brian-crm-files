-- ============================================================
-- MIGRACIÓN 4: RPCs financieras con Auth + Permisos + organization_id
-- Brian CRM — 2026-05-24
-- Ejecutar en: Supabase SQL Editor (Console)
-- Orden: 4 de 4 (última migración)
-- NOTA: Estas funciones reemplazan las de 20260523_add_ars_usd_support.sql
-- Usan SECURITY DEFINER para poder escribir en tablas con RLS desde dentro
-- de la transacción, habiendo ya validado auth + permisos explícitamente.
-- ============================================================

-- ─── create_operation ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_operation(
  p_operation    jsonb,
  p_installments jsonb,
  p_cash_movement jsonb DEFAULT NULL,
  p_voucher       jsonb DEFAULT NULL,
  p_cc_movement   jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_org_id       uuid;
  v_operation_id uuid;
  v_inst         jsonb;
  v_moneda       text;
  v_rate         numeric;
  v_source       text;
BEGIN
  -- ── Auth ──────────────────────────────────────────────────────────────────
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  v_org_id := (p_operation ->> 'organization_id')::uuid;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id requerido';
  END IF;

  IF NOT is_org_member(v_org_id, v_uid) THEN
    RAISE EXCEPTION 'No sos miembro de esta organización';
  END IF;

  IF NOT has_permission(v_org_id, v_uid, 'operations.create') THEN
    RAISE EXCEPTION 'Sin permiso: operations.create';
  END IF;

  -- ── Lógica financiera (idéntica a versión original) ──────────────────────
  v_moneda := _crm_json_text(p_operation, 'moneda', 'ARS');
  v_rate   := GREATEST(_crm_json_num(p_operation, 'tipo_cambio', 1), 0.000001);
  v_source := _crm_json_text(p_operation, 'tipo_cambio_fuente',
               CASE WHEN v_moneda = 'ARS' THEN 'historico_ars' ELSE 'manual' END);

  INSERT INTO operations (
    organization_id, created_by,
    codigo, client_id, tipo, descripcion, costo_real, monto_pactado, entrega,
    monto_financiado, cantidad_cuotas, tasa_interes, interes_calculado,
    total_financiado, valor_cuota, total_esperado, ganancia_esperada,
    fuente_financiacion, credit_card_id, fecha_inicio, primer_vencimiento,
    estado, notas, moneda, tipo_cambio, tipo_cambio_fuente,
    costo_real_base, monto_pactado_base, entrega_base, monto_financiado_base,
    interes_calculado_base, total_financiado_base, valor_cuota_base,
    total_esperado_base, ganancia_esperada_base
  )
  VALUES (
    v_org_id, v_uid,
    _crm_json_text(p_operation, 'codigo', _crm_next_code(v_org_id, 'operations', 'OP')),
    (p_operation ->> 'client_id')::uuid,
    p_operation ->> 'tipo',
    p_operation ->> 'descripcion',
    _crm_json_num(p_operation, 'costo_real'),
    _crm_json_num(p_operation, 'monto_pactado'),
    _crm_json_num(p_operation, 'entrega'),
    _crm_json_num(p_operation, 'monto_financiado'),
    COALESCE((p_operation ->> 'cantidad_cuotas')::integer, 1),
    _crm_json_num(p_operation, 'tasa_interes'),
    _crm_json_num(p_operation, 'interes_calculado'),
    _crm_json_num(p_operation, 'total_financiado'),
    _crm_json_num(p_operation, 'valor_cuota'),
    _crm_json_num(p_operation, 'total_esperado'),
    _crm_json_num(p_operation, 'ganancia_esperada'),
    _crm_json_text(p_operation, 'fuente_financiacion', 'Efectivo'),
    NULLIF(p_operation ->> 'credit_card_id', '')::uuid,
    (p_operation ->> 'fecha_inicio')::date,
    (p_operation ->> 'primer_vencimiento')::date,
    _crm_json_text(p_operation, 'estado', 'Activa'),
    p_operation ->> 'notas',
    v_moneda, v_rate, v_source,
    COALESCE(_crm_json_num(p_operation,'costo_real_base',NULL),       _crm_json_num(p_operation,'costo_real')       * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    COALESCE(_crm_json_num(p_operation,'monto_pactado_base',NULL),    _crm_json_num(p_operation,'monto_pactado')    * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    COALESCE(_crm_json_num(p_operation,'entrega_base',NULL),          _crm_json_num(p_operation,'entrega')          * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    COALESCE(_crm_json_num(p_operation,'monto_financiado_base',NULL), _crm_json_num(p_operation,'monto_financiado') * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    COALESCE(_crm_json_num(p_operation,'interes_calculado_base',NULL),_crm_json_num(p_operation,'interes_calculado')* CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    COALESCE(_crm_json_num(p_operation,'total_financiado_base',NULL), _crm_json_num(p_operation,'total_financiado') * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    COALESCE(_crm_json_num(p_operation,'valor_cuota_base',NULL),      _crm_json_num(p_operation,'valor_cuota')      * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    COALESCE(_crm_json_num(p_operation,'total_esperado_base',NULL),   _crm_json_num(p_operation,'total_esperado')   * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    COALESCE(_crm_json_num(p_operation,'ganancia_esperada_base',NULL),_crm_json_num(p_operation,'ganancia_esperada')* CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END)
  )
  RETURNING id INTO v_operation_id;

  FOR v_inst IN SELECT * FROM jsonb_array_elements(COALESCE(p_installments, '[]'::jsonb))
  LOOP
    INSERT INTO installments (
      organization_id, created_by,
      codigo, operation_id, client_id, numero_cuota, total_cuotas,
      fecha_vencimiento, monto_programado, monto_pagado, saldo_pendiente,
      mora_aplicada, estado, moneda, tipo_cambio, tipo_cambio_fuente,
      monto_programado_base, monto_pagado_base, saldo_pendiente_base, mora_aplicada_base
    )
    VALUES (
      v_org_id, v_uid,
      _crm_json_text(v_inst, 'codigo', _crm_next_code(v_org_id, 'installments', 'CUO')),
      v_operation_id,
      COALESCE(NULLIF(v_inst ->> 'client_id','')::uuid, (p_operation ->> 'client_id')::uuid),
      COALESCE((v_inst ->> 'numero_cuota')::integer, 1),
      COALESCE((v_inst ->> 'total_cuotas')::integer, 1),
      (v_inst ->> 'fecha_vencimiento')::date,
      _crm_json_num(v_inst, 'monto_programado'),
      _crm_json_num(v_inst, 'monto_pagado'),
      _crm_json_num(v_inst, 'saldo_pendiente'),
      _crm_json_num(v_inst, 'mora_aplicada'),
      _crm_json_text(v_inst, 'estado', 'Pendiente'),
      _crm_json_text(v_inst, 'moneda', v_moneda),
      GREATEST(_crm_json_num(v_inst, 'tipo_cambio', v_rate), 0.000001),
      _crm_json_text(v_inst, 'tipo_cambio_fuente', v_source),
      COALESCE(_crm_json_num(v_inst,'monto_programado_base',NULL), _crm_json_num(v_inst,'monto_programado') * CASE WHEN _crm_json_text(v_inst,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END),
      COALESCE(_crm_json_num(v_inst,'monto_pagado_base',NULL),     _crm_json_num(v_inst,'monto_pagado')     * CASE WHEN _crm_json_text(v_inst,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END),
      COALESCE(_crm_json_num(v_inst,'saldo_pendiente_base',NULL),  _crm_json_num(v_inst,'saldo_pendiente')  * CASE WHEN _crm_json_text(v_inst,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END),
      COALESCE(_crm_json_num(v_inst,'mora_aplicada_base',NULL),    _crm_json_num(v_inst,'mora_aplicada')    * CASE WHEN _crm_json_text(v_inst,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END)
    );
  END LOOP;

  IF p_voucher IS NOT NULL THEN
    INSERT INTO internal_operation_vouchers (
      organization_id, codigo, operation_id, client_id, estado, fecha
    )
    VALUES (
      v_org_id,
      _crm_json_text(p_voucher,'codigo', _crm_next_code(v_org_id,'internal_operation_vouchers','COMP')),
      v_operation_id,
      COALESCE(NULLIF(p_voucher ->> 'client_id','')::uuid, (p_operation ->> 'client_id')::uuid),
      _crm_json_text(p_voucher, 'estado', 'Emitido'),
      COALESCE((p_voucher ->> 'fecha')::date, CURRENT_DATE)
    );
  END IF;

  IF p_cash_movement IS NOT NULL THEN
    INSERT INTO cash_movements (
      organization_id, created_by,
      tipo, monto, client_id, operation_id, payment_id, credit_card_id,
      descripcion, fecha, moneda, tipo_cambio, tipo_cambio_fuente, monto_base
    )
    VALUES (
      v_org_id, v_uid,
      p_cash_movement ->> 'tipo',
      _crm_json_num(p_cash_movement, 'monto'),
      COALESCE(NULLIF(p_cash_movement ->> 'client_id','')::uuid, (p_operation ->> 'client_id')::uuid),
      v_operation_id,
      NULLIF(p_cash_movement ->> 'payment_id','')::uuid,
      NULLIF(p_cash_movement ->> 'credit_card_id','')::uuid,
      p_cash_movement ->> 'descripcion',
      COALESCE((p_cash_movement ->> 'fecha')::date, CURRENT_DATE),
      _crm_json_text(p_cash_movement, 'moneda', v_moneda),
      GREATEST(_crm_json_num(p_cash_movement, 'tipo_cambio', v_rate), 0.000001),
      _crm_json_text(p_cash_movement, 'tipo_cambio_fuente', v_source),
      COALESCE(_crm_json_num(p_cash_movement,'monto_base',NULL), _crm_json_num(p_cash_movement,'monto') * CASE WHEN _crm_json_text(p_cash_movement,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END)
    );
  END IF;

  IF p_cc_movement IS NOT NULL THEN
    INSERT INTO credit_card_movements (
      organization_id, created_by,
      credit_card_id, operation_id, client_id, fecha_compra, descripcion, monto,
      cuotas_tarjeta, cuota_actual_tarjeta, fecha_cierre_estimada,
      fecha_vencimiento_estimada, estado, moneda, tipo_cambio, tipo_cambio_fuente, monto_base
    )
    VALUES (
      v_org_id, v_uid,
      (p_cc_movement ->> 'credit_card_id')::uuid,
      v_operation_id,
      COALESCE(NULLIF(p_cc_movement ->> 'client_id','')::uuid, (p_operation ->> 'client_id')::uuid),
      COALESCE((p_cc_movement ->> 'fecha_compra')::date, CURRENT_DATE),
      p_cc_movement ->> 'descripcion',
      _crm_json_num(p_cc_movement, 'monto'),
      COALESCE((p_cc_movement ->> 'cuotas_tarjeta')::integer, 1),
      COALESCE((p_cc_movement ->> 'cuota_actual_tarjeta')::integer, 1),
      NULLIF(p_cc_movement ->> 'fecha_cierre_estimada','')::date,
      NULLIF(p_cc_movement ->> 'fecha_vencimiento_estimada','')::date,
      _crm_json_text(p_cc_movement, 'estado', 'Activo'),
      _crm_json_text(p_cc_movement, 'moneda', v_moneda),
      GREATEST(_crm_json_num(p_cc_movement, 'tipo_cambio', v_rate), 0.000001),
      _crm_json_text(p_cc_movement, 'tipo_cambio_fuente', v_source),
      COALESCE(_crm_json_num(p_cc_movement,'monto_base',NULL), _crm_json_num(p_cc_movement,'monto') * CASE WHEN _crm_json_text(p_cc_movement,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END)
    );
  END IF;

  -- Audit log (no bloquea si falla)
  BEGIN
    INSERT INTO audit_log (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (v_org_id, v_uid, 'operation_created', 'operations', v_operation_id,
            jsonb_build_object('codigo', _crm_json_text(p_operation,'codigo',''), 'client_id', p_operation ->> 'client_id'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_operation_id;
END;
$$;

-- ─── update_operation ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_operation(
  p_operation_id  uuid,
  p_operation     jsonb,
  p_installments  jsonb,
  p_cash_movement jsonb DEFAULT NULL,
  p_cc_movement   jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_org_id   uuid;
  v_op_org   uuid;
  v_inst     jsonb;
  v_moneda   text;
  v_rate     numeric;
  v_source   text;
BEGIN
  -- ── Auth ──────────────────────────────────────────────────────────────────
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Verificar que la operación existe y obtener su org real
  SELECT organization_id INTO v_op_org FROM operations WHERE id = p_operation_id;
  IF v_op_org IS NULL THEN
    RAISE EXCEPTION 'Operación no encontrada';
  END IF;

  v_org_id := v_op_org;

  IF NOT is_org_member(v_org_id, v_uid) THEN
    RAISE EXCEPTION 'No sos miembro de esta organización';
  END IF;

  IF NOT has_permission(v_org_id, v_uid, 'operations.edit') THEN
    RAISE EXCEPTION 'Sin permiso: operations.edit';
  END IF;

  -- ── Lógica financiera ─────────────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM payment_allocations pa
    JOIN installments i ON i.id = pa.installment_id
    WHERE i.operation_id = p_operation_id
  ) THEN
    RAISE EXCEPTION 'No se puede reconstruir una operacion con pagos existentes';
  END IF;

  v_moneda := _crm_json_text(p_operation, 'moneda', 'ARS');
  v_rate   := GREATEST(_crm_json_num(p_operation, 'tipo_cambio', 1), 0.000001);
  v_source := _crm_json_text(p_operation, 'tipo_cambio_fuente',
               CASE WHEN v_moneda = 'ARS' THEN 'historico_ars' ELSE 'manual' END);

  UPDATE operations SET
    tipo               = p_operation ->> 'tipo',
    descripcion        = p_operation ->> 'descripcion',
    costo_real         = _crm_json_num(p_operation, 'costo_real'),
    monto_pactado      = _crm_json_num(p_operation, 'monto_pactado'),
    entrega            = _crm_json_num(p_operation, 'entrega'),
    monto_financiado   = _crm_json_num(p_operation, 'monto_financiado'),
    cantidad_cuotas    = COALESCE((p_operation ->> 'cantidad_cuotas')::integer, 1),
    tasa_interes       = _crm_json_num(p_operation, 'tasa_interes'),
    interes_calculado  = _crm_json_num(p_operation, 'interes_calculado'),
    total_financiado   = _crm_json_num(p_operation, 'total_financiado'),
    valor_cuota        = _crm_json_num(p_operation, 'valor_cuota'),
    total_esperado     = _crm_json_num(p_operation, 'total_esperado'),
    ganancia_esperada  = _crm_json_num(p_operation, 'ganancia_esperada'),
    fuente_financiacion = _crm_json_text(p_operation, 'fuente_financiacion', 'Efectivo'),
    credit_card_id     = NULLIF(p_operation ->> 'credit_card_id','')::uuid,
    fecha_inicio       = (p_operation ->> 'fecha_inicio')::date,
    primer_vencimiento = (p_operation ->> 'primer_vencimiento')::date,
    estado             = _crm_json_text(p_operation, 'estado', 'Activa'),
    notas              = p_operation ->> 'notas',
    moneda             = v_moneda,
    tipo_cambio        = v_rate,
    tipo_cambio_fuente = v_source,
    updated_by         = v_uid,
    costo_real_base         = COALESCE(_crm_json_num(p_operation,'costo_real_base',NULL),       _crm_json_num(p_operation,'costo_real')       * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    monto_pactado_base      = COALESCE(_crm_json_num(p_operation,'monto_pactado_base',NULL),    _crm_json_num(p_operation,'monto_pactado')    * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    entrega_base            = COALESCE(_crm_json_num(p_operation,'entrega_base',NULL),          _crm_json_num(p_operation,'entrega')          * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    monto_financiado_base   = COALESCE(_crm_json_num(p_operation,'monto_financiado_base',NULL), _crm_json_num(p_operation,'monto_financiado') * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    interes_calculado_base  = COALESCE(_crm_json_num(p_operation,'interes_calculado_base',NULL),_crm_json_num(p_operation,'interes_calculado')* CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    total_financiado_base   = COALESCE(_crm_json_num(p_operation,'total_financiado_base',NULL), _crm_json_num(p_operation,'total_financiado') * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    valor_cuota_base        = COALESCE(_crm_json_num(p_operation,'valor_cuota_base',NULL),      _crm_json_num(p_operation,'valor_cuota')      * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    total_esperado_base     = COALESCE(_crm_json_num(p_operation,'total_esperado_base',NULL),   _crm_json_num(p_operation,'total_esperado')   * CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END),
    ganancia_esperada_base  = COALESCE(_crm_json_num(p_operation,'ganancia_esperada_base',NULL),_crm_json_num(p_operation,'ganancia_esperada')* CASE WHEN v_moneda='USD' THEN v_rate ELSE 1 END)
  WHERE id = p_operation_id;

  DELETE FROM installments WHERE operation_id = p_operation_id;
  DELETE FROM cash_movements WHERE operation_id = p_operation_id AND payment_id IS NULL;
  DELETE FROM credit_card_movements WHERE operation_id = p_operation_id;

  FOR v_inst IN SELECT * FROM jsonb_array_elements(COALESCE(p_installments, '[]'::jsonb))
  LOOP
    INSERT INTO installments (
      organization_id, created_by,
      codigo, operation_id, client_id, numero_cuota, total_cuotas,
      fecha_vencimiento, monto_programado, monto_pagado, saldo_pendiente,
      mora_aplicada, estado, moneda, tipo_cambio, tipo_cambio_fuente,
      monto_programado_base, monto_pagado_base, saldo_pendiente_base, mora_aplicada_base
    )
    VALUES (
      v_org_id, v_uid,
      _crm_json_text(v_inst,'codigo', _crm_next_code(v_org_id,'installments','CUO')),
      p_operation_id,
      COALESCE(NULLIF(v_inst ->> 'client_id','')::uuid, (p_operation ->> 'client_id')::uuid),
      COALESCE((v_inst ->> 'numero_cuota')::integer, 1),
      COALESCE((v_inst ->> 'total_cuotas')::integer, 1),
      (v_inst ->> 'fecha_vencimiento')::date,
      _crm_json_num(v_inst,'monto_programado'), _crm_json_num(v_inst,'monto_pagado'),
      _crm_json_num(v_inst,'saldo_pendiente'),  _crm_json_num(v_inst,'mora_aplicada'),
      _crm_json_text(v_inst,'estado','Pendiente'),
      _crm_json_text(v_inst,'moneda',v_moneda),
      GREATEST(_crm_json_num(v_inst,'tipo_cambio',v_rate), 0.000001),
      _crm_json_text(v_inst,'tipo_cambio_fuente',v_source),
      COALESCE(_crm_json_num(v_inst,'monto_programado_base',NULL), _crm_json_num(v_inst,'monto_programado') * CASE WHEN _crm_json_text(v_inst,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END),
      COALESCE(_crm_json_num(v_inst,'monto_pagado_base',NULL),     _crm_json_num(v_inst,'monto_pagado')     * CASE WHEN _crm_json_text(v_inst,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END),
      COALESCE(_crm_json_num(v_inst,'saldo_pendiente_base',NULL),  _crm_json_num(v_inst,'saldo_pendiente')  * CASE WHEN _crm_json_text(v_inst,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END),
      COALESCE(_crm_json_num(v_inst,'mora_aplicada_base',NULL),    _crm_json_num(v_inst,'mora_aplicada')    * CASE WHEN _crm_json_text(v_inst,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END)
    );
  END LOOP;

  IF p_cash_movement IS NOT NULL THEN
    INSERT INTO cash_movements (
      organization_id, created_by,
      tipo, monto, client_id, operation_id, descripcion, fecha,
      moneda, tipo_cambio, tipo_cambio_fuente, monto_base
    )
    VALUES (
      v_org_id, v_uid,
      p_cash_movement ->> 'tipo',
      _crm_json_num(p_cash_movement,'monto'),
      COALESCE(NULLIF(p_cash_movement ->> 'client_id','')::uuid, (p_operation ->> 'client_id')::uuid),
      p_operation_id,
      p_cash_movement ->> 'descripcion',
      COALESCE((p_cash_movement ->> 'fecha')::date, CURRENT_DATE),
      _crm_json_text(p_cash_movement,'moneda',v_moneda),
      GREATEST(_crm_json_num(p_cash_movement,'tipo_cambio',v_rate), 0.000001),
      _crm_json_text(p_cash_movement,'tipo_cambio_fuente',v_source),
      COALESCE(_crm_json_num(p_cash_movement,'monto_base',NULL), _crm_json_num(p_cash_movement,'monto') * CASE WHEN _crm_json_text(p_cash_movement,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END)
    );
  END IF;

  IF p_cc_movement IS NOT NULL THEN
    INSERT INTO credit_card_movements (
      organization_id, created_by,
      credit_card_id, operation_id, client_id, fecha_compra, descripcion, monto,
      cuotas_tarjeta, cuota_actual_tarjeta, fecha_cierre_estimada,
      fecha_vencimiento_estimada, estado, moneda, tipo_cambio, tipo_cambio_fuente, monto_base
    )
    VALUES (
      v_org_id, v_uid,
      (p_cc_movement ->> 'credit_card_id')::uuid,
      p_operation_id,
      COALESCE(NULLIF(p_cc_movement ->> 'client_id','')::uuid, (p_operation ->> 'client_id')::uuid),
      COALESCE((p_cc_movement ->> 'fecha_compra')::date, CURRENT_DATE),
      p_cc_movement ->> 'descripcion',
      _crm_json_num(p_cc_movement,'monto'),
      COALESCE((p_cc_movement ->> 'cuotas_tarjeta')::integer, 1),
      COALESCE((p_cc_movement ->> 'cuota_actual_tarjeta')::integer, 1),
      NULLIF(p_cc_movement ->> 'fecha_cierre_estimada','')::date,
      NULLIF(p_cc_movement ->> 'fecha_vencimiento_estimada','')::date,
      _crm_json_text(p_cc_movement,'estado','Activo'),
      _crm_json_text(p_cc_movement,'moneda',v_moneda),
      GREATEST(_crm_json_num(p_cc_movement,'tipo_cambio',v_rate), 0.000001),
      _crm_json_text(p_cc_movement,'tipo_cambio_fuente',v_source),
      COALESCE(_crm_json_num(p_cc_movement,'monto_base',NULL), _crm_json_num(p_cc_movement,'monto') * CASE WHEN _crm_json_text(p_cc_movement,'moneda',v_moneda)='USD' THEN v_rate ELSE 1 END)
    );
  END IF;

  BEGIN
    INSERT INTO audit_log (organization_id, actor_user_id, action, entity_type, entity_id)
    VALUES (v_org_id, v_uid, 'operation_updated', 'operations', p_operation_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- ─── delete_operation ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION delete_operation(p_operation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_org_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT organization_id INTO v_org_id FROM operations WHERE id = p_operation_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Operación no encontrada'; END IF;

  IF NOT is_org_member(v_org_id, v_uid) THEN
    RAISE EXCEPTION 'No sos miembro de esta organización';
  END IF;

  IF NOT has_permission(v_org_id, v_uid, 'operations.delete') THEN
    RAISE EXCEPTION 'Sin permiso: operations.delete';
  END IF;

  IF EXISTS (
    SELECT 1 FROM payment_allocations pa
    JOIN installments i ON i.id = pa.installment_id
    WHERE i.operation_id = p_operation_id
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar una operacion con pagos existentes';
  END IF;

  DELETE FROM credit_card_movements WHERE operation_id = p_operation_id;
  DELETE FROM cash_movements WHERE operation_id = p_operation_id;
  DELETE FROM internal_operation_vouchers WHERE operation_id = p_operation_id;
  DELETE FROM installments WHERE operation_id = p_operation_id;
  DELETE FROM operations WHERE id = p_operation_id;

  BEGIN
    INSERT INTO audit_log (organization_id, actor_user_id, action, entity_type, entity_id)
    VALUES (v_org_id, v_uid, 'operation_deleted', 'operations', p_operation_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- ─── register_payment ─────────────────────────────────────────────────────────

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

  IF NOT is_org_member(v_org_id, v_uid) THEN
    RAISE EXCEPTION 'No sos miembro de esta organización';
  END IF;

  IF NOT has_permission(v_org_id, v_uid, 'payments.create') THEN
    RAISE EXCEPTION 'Sin permiso: payments.create';
  END IF;

  v_moneda := _crm_json_text(p_payment, 'moneda', 'ARS');
  v_rate   := GREATEST(_crm_json_num(p_payment, 'tipo_cambio', 1), 0.000001);
  v_source := _crm_json_text(p_payment, 'tipo_cambio_fuente',
               CASE WHEN v_moneda = 'ARS' THEN 'historico_ars' ELSE 'manual' END);

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
      monto_pago_aplicado, monto_aplicado_base, monto_cuota_aplicado_base
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
      COALESCE(_crm_json_num(v_alloc,'monto_pago_aplicado',NULL),        _crm_json_num(v_alloc,'monto_aplicado')),
      COALESCE(_crm_json_num(v_alloc,'monto_aplicado_base',NULL),        _crm_json_num(v_alloc,'monto_aplicado')),
      COALESCE(_crm_json_num(v_alloc,'monto_cuota_aplicado_base',NULL),  _crm_json_num(v_alloc,'monto_aplicado'))
    );
  END LOOP;

  FOR v_inst IN SELECT * FROM jsonb_array_elements(COALESCE(p_installment_updates,'[]'::jsonb))
  LOOP
    UPDATE installments SET
      monto_pagado       = _crm_json_num(v_inst,'monto_pagado'),
      saldo_pendiente    = _crm_json_num(v_inst,'saldo_pendiente'),
      estado             = _crm_json_text(v_inst,'estado',estado),
      monto_pagado_base  = COALESCE(_crm_json_num(v_inst,'monto_pagado_base',NULL),    _crm_json_num(v_inst,'monto_pagado')    * CASE WHEN moneda='USD' THEN tipo_cambio ELSE 1 END),
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
    INSERT INTO audit_log (organization_id, actor_user_id, action, entity_type, entity_id,
                            metadata)
    VALUES (v_org_id, v_uid, 'payment_registered', 'payments', v_payment_id,
            jsonb_build_object('monto', _crm_json_num(p_payment,'monto'), 'moneda', v_moneda,
                               'client_id', p_payment ->> 'client_id'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_payment_id;
END;
$$;

-- ─── reverse_payment ──────────────────────────────────────────────────────────

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

  IF NOT is_org_member(v_org_id, v_uid) THEN
    RAISE EXCEPTION 'No sos miembro de esta organización';
  END IF;

  IF NOT has_permission(v_org_id, v_uid, 'payments.reverse') THEN
    RAISE EXCEPTION 'Sin permiso: payments.reverse';
  END IF;

  -- Revertir imputaciones en cuotas
  FOR v_alloc IN
    SELECT * FROM payment_allocations WHERE payment_id = p_payment_id
  LOOP
    SELECT * INTO v_inst FROM installments WHERE id = v_alloc.installment_id FOR UPDATE;
    UPDATE installments SET
      monto_pagado   = GREATEST(0, COALESCE(v_inst.monto_pagado,0)   - COALESCE(v_alloc.monto_aplicado,0)),
      saldo_pendiente = COALESCE(v_inst.saldo_pendiente,0)            + COALESCE(v_alloc.monto_aplicado,0),
      monto_pagado_base    = GREATEST(0, COALESCE(v_inst.monto_pagado_base,0)   - COALESCE(v_alloc.monto_cuota_aplicado_base, v_alloc.monto_aplicado_base, v_alloc.monto_aplicado,0)),
      saldo_pendiente_base = COALESCE(v_inst.saldo_pendiente_base,0)            + COALESCE(v_alloc.monto_cuota_aplicado_base, v_alloc.monto_aplicado_base, v_alloc.monto_aplicado,0),
      estado = CASE
        WHEN GREATEST(0, COALESCE(v_inst.monto_pagado,0) - COALESCE(v_alloc.monto_aplicado,0)) <= 0 THEN
          CASE WHEN v_inst.fecha_vencimiento < CURRENT_DATE THEN 'Vencida' ELSE 'Pendiente' END
        WHEN COALESCE(v_inst.saldo_pendiente,0) + COALESCE(v_alloc.monto_aplicado,0) > 0 THEN 'Parcial'
        ELSE 'Pagada'
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
