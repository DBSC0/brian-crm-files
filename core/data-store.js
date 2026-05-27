// Brian CRM data store core.
// Encapsulates Supabase table loading and snake_case/camelCase mapping.
(function initCRMData(global) {
  'use strict';

  var KEY_MAP = {
    organization_id: 'organizationId',
    created_by: 'createdBy',
    updated_by: 'updatedBy',
    invited_by: 'invitedBy',
    invited_at: 'invitedAt',
    joined_at: 'joinedAt',
    last_seen_at: 'lastSeenAt',
    permission_key: 'permissionKey',
    full_name: 'fullName',
    avatar_url: 'avatarUrl',

    telefono_secundario: 'telefonoSecundario',
    created_at: 'createdAt',

    client_id: 'clientId',
    costo_real: 'costoReal',
    monto_pactado: 'montoPactado',
    monto_financiado: 'montoFinanciado',
    cantidad_cuotas: 'cantidadCuotas',
    tasa_interes: 'tasaInteres',
    interes_calculado: 'interesCalculado',
    total_financiado: 'totalFinanciado',
    valor_cuota: 'valorCuota',
    total_esperado: 'totalEsperado',
    ganancia_esperada: 'gananciaEsperada',
    fuente_financiacion: 'fuenteFinanciacion',
    credit_card_id: 'creditCardId',
    fecha_inicio: 'fechaInicio',
    primer_vencimiento: 'primerVencimiento',
    tipo_cambio: 'tipoCambio',
    tipo_cambio_fuente: 'tipoCambioFuente',
    costo_real_base: 'costoRealBase',
    monto_pactado_base: 'montoPactadoBase',
    entrega_base: 'entregaBase',
    monto_financiado_base: 'montoFinanciadoBase',
    interes_calculado_base: 'interesCalculadoBase',
    total_financiado_base: 'totalFinanciadoBase',
    valor_cuota_base: 'valorCuotaBase',
    total_esperado_base: 'totalEsperadoBase',
    ganancia_esperada_base: 'gananciaEsperadaBase',

    operation_id: 'operationId',
    numero_cuota: 'numeroCuota',
    total_cuotas: 'totalCuotas',
    fecha_vencimiento: 'fechaVencimiento',
    monto_programado: 'montoProgramado',
    monto_pagado: 'montoPagado',
    saldo_pendiente: 'saldoPendiente',
    mora_aplicada: 'moraAplicada',
    mora_pagada: 'moraPagada',
    mora_condonada: 'moraCondonada',
    mora_actualizada_hasta: 'moraActualizadaHasta',
    mora_tasa_diaria: 'moraTasaDiaria',
    mora_dias_gracia: 'moraDiasGracia',
    mora_base_calculo: 'moraBaseCalculo',
    mora_tipo_calculo: 'moraTipoCalculo',
    mora_congelada: 'moraCongelada',
    monto_programado_base: 'montoProgramadoBase',
    monto_pagado_base: 'montoPagadoBase',
    saldo_pendiente_base: 'saldoPendienteBase',
    mora_aplicada_base: 'moraAplicadaBase',

    fecha_pago: 'fechaPago',
    metodo_pago: 'metodoPago',
    receipt_id: 'receiptId',
    monto_base: 'montoBase',

    payment_id: 'paymentId',
    installment_id: 'installmentId',
    monto_aplicado: 'montoAplicado',
    payment_moneda: 'paymentMoneda',
    installment_moneda: 'installmentMoneda',
    tipo_cambio_pago: 'tipoCambioPago',
    tipo_cambio_installment: 'tipoCambioInstallment',
    monto_pago_aplicado: 'montoPagoAplicado',
    monto_aplicado_base: 'montoAplicadoBase',
    monto_cuota_aplicado_base: 'montoCuotaAplicadoBase',
    monto_cuota_aplicado: 'montoCuotaAplicado',
    monto_mora_aplicado: 'montoMoraAplicado',
    monto_mora_aplicado_base: 'montoMoraAplicadoBase',

    dias_aplicados: 'diasAplicados',
    tasa_diaria: 'tasaDiaria',
    base_calculo: 'baseCalculo',
    tipo_calculo: 'tipoCalculo',
    monto_mora: 'montoMora',
    monto_anterior: 'montoAnterior',
    monto_nuevo: 'montoNuevo',

    ultimos_digitos: 'ultimosDigitos',
    limite_total: 'limiteTotal',
    limite_disponible_estimado: 'limiteDisponibleEstimado',
    dia_cierre: 'diaCierre',
    dia_vencimiento: 'diaVencimiento',

    fecha_compra: 'fechaCompra',
    cuotas_tarjeta: 'cuotasTarjeta',
    cuota_actual_tarjeta: 'cuotaActualTarjeta',
    fecha_cierre_estimada: 'fechaCierreEstimada',
    fecha_vencimiento_estimada: 'fechaVencimientoEstimada',

    nombre_archivo: 'nombreArchivo',
    url_mock: 'urlMock',
    credit_card_movement_id: 'creditCardMovementId',

    tasas_por_cuotas: 'tasasPorCuotas',
    metodos_pago: 'metodosPago',
    estados_cliente: 'estadosCliente',
    estados_operacion: 'estadosOperacion',
    estados_cuota: 'estadosCuota',
    estados_tarjeta: 'estadosTarjeta',
    tipos_operacion: 'tiposOperacion',
    datos_prestamista: 'datosPrestamista',
    plantillas_whatsapp: 'plantillasWhatsapp',
    parametros_financieros: 'parametrosFinancieros',
    ui_preferences: 'uiPreferences',
  };

  var KEY_MAP_REVERSE = Object.fromEntries(
    Object.entries(KEY_MAP).map(function reverse(entry) { return [entry[1], entry[0]]; })
  );

  function toCamel(row) {
    if (!row || typeof row !== 'object') return row;
    var out = {};
    Object.entries(row).forEach(function mapEntry(entry) {
      out[KEY_MAP[entry[0]] || entry[0]] = entry[1];
    });
    return out;
  }

  function rowsToCamel(rows) {
    return (rows || []).map(toCamel);
  }

  function toSnake(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    var out = {};
    Object.entries(obj).forEach(function mapEntry(entry) {
      out[KEY_MAP_REVERSE[entry[0]] || entry[0]] = entry[1];
    });
    return out;
  }

  function tableQuery(sb, table, orgId) {
    return sb.from(table).select('*').eq('organization_id', orgId);
  }

  async function loadAllData(orgId) {
    if (!orgId) throw new Error('organization_id requerido para cargar datos');
    var sb = global.__supabase;
    if (!sb) throw new Error('Supabase no inicializado');

    var result = await Promise.all([
      tableQuery(sb, 'clients', orgId).order('created_at'),
      tableQuery(sb, 'operations', orgId).order('fecha_inicio'),
      tableQuery(sb, 'installments', orgId).order('fecha_vencimiento'),
      tableQuery(sb, 'payments', orgId).order('fecha_pago'),
      tableQuery(sb, 'payment_allocations', orgId),
      tableQuery(sb, 'receipts', orgId).order('fecha'),
      tableQuery(sb, 'internal_operation_vouchers', orgId).order('fecha'),
      tableQuery(sb, 'credit_cards', orgId),
      tableQuery(sb, 'credit_card_movements', orgId).order('fecha_compra'),
      tableQuery(sb, 'cash_movements', orgId).order('fecha'),
      tableQuery(sb, 'client_notes', orgId).order('fecha'),
      tableQuery(sb, 'attachments', orgId).order('fecha'),
      tableQuery(sb, 'app_settings', orgId).maybeSingle(),
      tableQuery(sb, 'credit_card_statement_payments', orgId).order('a\u00f1o').order('mes'),
      tableQuery(sb, 'installment_mora_events', orgId).order('fecha', { ascending: false }).limit(500),
    ]);

    var tableNames = [
      'clients',
      'operations',
      'installments',
      'payments',
      'payment_allocations',
      'receipts',
      'internal_operation_vouchers',
      'credit_cards',
      'credit_card_movements',
      'cash_movements',
      'client_notes',
      'attachments',
      'app_settings',
      'credit_card_statement_payments',
      'installment_mora_events',
    ];
    var firstErrorIndex = result.findIndex(function hasError(r) { return r.error; });
    if (firstErrorIndex >= 0) {
      throw new Error('[' + tableNames[firstErrorIndex] + '] ' + result[firstErrorIndex].error.message);
    }

    var settingsRow = result[12].data;
    var sr = settingsRow ? toCamel(settingsRow) : {};
    var normalizePaymentMethods = global.CRMFinance && global.CRMFinance.normalizePaymentMethods
      ? global.CRMFinance.normalizePaymentMethods
      : function identityMethods(v) { return v || []; };
    var settings = {
      tasasPorCuotas: sr.tasasPorCuotas || [],
      metodosPago: normalizePaymentMethods(sr.metodosPago || []),
      estadosCliente: sr.estadosCliente || [],
      estadosOperacion: sr.estadosOperacion || [],
      estadosCuota: sr.estadosCuota || [],
      estadosTarjeta: sr.estadosTarjeta || [],
      tiposOperacion: sr.tiposOperacion || [],
      datosPrestamista: sr.datosPrestamista || {},
      plantillasWhatsapp: sr.plantillasWhatsapp || [],
      parametrosFinancieros: sr.parametrosFinancieros || {},
      branding: sr.branding || {},
      uiPreferences: sr.uiPreferences || {},
    };

    return {
      settings: settings,
      clients: rowsToCamel(result[0].data),
      operations: rowsToCamel(result[1].data),
      installments: rowsToCamel(result[2].data),
      payments: rowsToCamel(result[3].data),
      paymentAllocations: rowsToCamel(result[4].data),
      receipts: rowsToCamel(result[5].data),
      internalOperationVouchers: rowsToCamel(result[6].data),
      creditCards: rowsToCamel(result[7].data),
      creditCardMovements: rowsToCamel(result[8].data),
      creditCardStatementPayments: rowsToCamel(result[13].data || []),
      installmentMoraEvents: rowsToCamel(result[14].data || []),
      cashMovements: rowsToCamel(result[9].data),
      clientNotes: rowsToCamel(result[10].data),
      attachments: rowsToCamel(result[11].data),
    };
  }

  async function reloadTables(orgId, tableNames) {
    var sb = global.__supabase;
    if (!sb) throw new Error('Supabase no inicializado');
    if (!orgId) throw new Error('organization_id requerido para recargar datos');
    var entries = await Promise.all((tableNames || []).map(async function loadTable(tableName) {
      var res = await tableQuery(sb, tableName, orgId);
      if (res.error) throw new Error('[' + tableName + '] ' + res.error.message);
      return [tableName, rowsToCamel(res.data)];
    }));
    return Object.fromEntries(entries);
  }

  var api = {
    KEY_MAP: KEY_MAP,
    KEY_MAP_REVERSE: KEY_MAP_REVERSE,
    toCamel: toCamel,
    rowsToCamel: rowsToCamel,
    toSnake: toSnake,
    loadAllData: loadAllData,
    reloadTables: reloadTables,
  };

  global.CRMData = api;
})(typeof window !== 'undefined' ? window : globalThis);
