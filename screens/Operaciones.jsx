// Operaciones Screen + Detalle + Nueva Operación Wizard

function fmtInput(raw) {
  const n = String(raw || '').replace(/[^\d]/g, '');
  if (!n) return '';
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseDatePaste(str) {
  str = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const m = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  return null;
}

function nextSequentialCode(items, prefix, field) {
  const key = field || 'codigo';
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + escaped + '-(\\d+)$');
  const max = (items || []).reduce((highest, item) => {
    const m = String((item && item[key]) || '').match(re);
    return m ? Math.max(highest, Number(m[1]) || 0) : highest;
  }, 0);
  return prefix + '-' + String(max + 1).padStart(3, '0');
}

function nextSequentialCodes(items, prefix, count, field) {
  const key = field || 'codigo';
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + escaped + '-(\\d+)$');
  const max = (items || []).reduce((highest, item) => {
    const m = String((item && item[key]) || '').match(re);
    return m ? Math.max(highest, Number(m[1]) || 0) : highest;
  }, 0);
  return Array.from({ length: count }, (_, i) => prefix + '-' + String(max + i + 1).padStart(3, '0'));
}

function NuevaOperacionModal({
  open,
  onClose,
  onSave,
  data,
  preselectedClientId,
  isEdit = false,
  initialValues = null,
  hasPayments = false,
}) {
  const { clients, creditCards, settings: cfg } = data;

  function toISODateLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function todayISO() {
    return toISODateLocal(new Date());
  }

  function addMonthsISO(isoDate, months) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() + months);
    return toISODateLocal(date);
  }

  function firstDayNextMonthISO(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() + 1);
    date.setDate(1);
    return toISODateLocal(date);
  }

  function formatMoneyInput(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('es-AR');
  }

  function moneyToNumber(value) {
    const clean = String(value ?? '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');

    const n = Number(clean);
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeMoneyFields(values) {
    return {
      ...values,
      costoReal:
        values.costoReal !== '' && values.costoReal != null
          ? formatMoneyInput(values.costoReal)
          : '',
      montoPactado:
        values.montoPactado !== '' && values.montoPactado != null
          ? formatMoneyInput(values.montoPactado)
          : '',
      entrega:
        values.entrega !== '' && values.entrega != null
          ? formatMoneyInput(values.entrega)
          : '0',
    };
  }

  function parsePastedDateToISO(raw) {
    const value = String(raw ?? '').trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const match = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
    if (!match) return '';

    let [, dd, mm, yyyy] = match;

    if (yyyy.length === 2) {
      yyyy = `20${yyyy}`;
    }

    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);

    const date = new Date(year, month - 1, day);

    const isValid =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;

    if (!isValid) return '';

    return toISODateLocal(date);
  }

  function roundUpTo(value, step = 1000) {
    const n = Number(value) || 0;
    if (n <= 0) return 0;
    return Math.ceil(n / step) * step;
  }

  const initialToday = todayISO();

  const [step, setStep] = React.useState(1);

  const defaultForm = {
    clientId: preselectedClientId || '',
    tipo: 'Préstamo en efectivo',
    descripcion: '',
    fechaInicio: initialToday,
    primerVencimiento: firstDayNextMonthISO(initialToday),
    costoReal: '',
    montoPactado: '',
    entrega: '0',
    moneda: 'ARS',
    tipoCambio: '1',
    tipoCambioFuente: 'manual',
    cantidadCuotas: 3,
    tasaInteres: 34.68,
    tasaManual: false,
    redondearCuotas: true,
    fuenteFinanciacion: 'Efectivo',
    creditCardId: '',
    fechaCompraTC: initialToday,
    cuotasTarjeta: 12,
    notas: '',
  };

  const [form, setForm] = React.useState(defaultForm);
  const [usdRates, setUsdRates] = React.useState([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const currency = normalizeCurrency(form.moneda);
  const exchangeRate = normalizeExchangeRate(form.tipoCambio);
  const baseOf = amount => toBaseAmount(amount, currency, exchangeRate);

  const selectRateSource = (source) => {
    const rate = usdRates.find(r => r.key === source);
    setForm(f => ({
      ...f,
      tipoCambioFuente: source,
      tipoCambio: rate ? String(rate.rate) : f.tipoCambio,
    }));
  };

  const setMoney = (k, v) => {
    setForm(f => ({
      ...f,
      [k]: formatMoneyInput(v),
    }));
  };

  const handleDatePaste = (k) => (e) => {
    const pasted = e.clipboardData.getData('text');
    const iso = parsePastedDateToISO(pasted);

    if (iso) {
      e.preventDefault();
      set(k, iso);
    }
  };

  const setFundingSource = (fuente) => {
    setForm(f => ({
      ...f,
      fuenteFinanciacion: fuente,
      fechaCompraTC:
        fuente === 'Tarjeta de crédito'
          ? f.fechaInicio
          : f.fechaCompraTC,
    }));
  };

  const [errors, setErrors] = React.useState({});
  const isInitialLoad = React.useRef(false);

  React.useEffect(() => {
    if (open) {
      fetchUsdRates().then(setUsdRates);
      setStep(1);
      setErrors({});

      if (isEdit && initialValues) {
        isInitialLoad.current = true;
        setForm(
          normalizeMoneyFields({
            ...defaultForm,
            ...initialValues,
            tasaManual:
              initialValues.tasaManual !== undefined
                ? initialValues.tasaManual
                : true,
            redondearCuotas:
              initialValues.redondearCuotas !== undefined
                ? initialValues.redondearCuotas
                : true,
          })
        );
      } else {
        setForm(
          normalizeMoneyFields({
            ...defaultForm,
            clientId: preselectedClientId || '',
          })
        );
      }
    }
  }, [open, preselectedClientId, isEdit]);

  React.useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    if (!form.fechaInicio) return;

    set('primerVencimiento', addMonthsISO(form.fechaInicio, 1));
  }, [form.fechaInicio]);

  const activeConfiguredRate = React.useMemo(
    () => findActiveRate(cfg, currency, form.cantidadCuotas, form.fechaInicio),
    [cfg, currency, form.cantidadCuotas, form.fechaInicio]
  );

  const missingRateMessage =
    !hasPayments && !form.tasaManual && !activeConfiguredRate
      ? `No hay una tasa activa configurada para ${form.cantidadCuotas} cuotas en ${currency}. Podés cargar una tasa manual o configurar el plan en Configuración > Tasas.`
      : '';

  React.useEffect(() => {
    if (form.tasaManual) return;
    if (hasPayments) return;

    if (activeConfiguredRate) {
      set('tasaInteres', activeConfiguredRate.tasa);
    } else {
      set('tasaInteres', '');
    }
  }, [activeConfiguredRate, form.tasaManual]);

  React.useEffect(() => {
    if (form.moneda === 'ARS') {
      setForm(f => ({ ...f, tipoCambio: '1', tipoCambioFuente: 'historico_ars' }));
    } else if (form.moneda === 'USD' && (!form.tipoCambio || Number(form.tipoCambio) <= 1)) {
      const preferred = usdRates.find(r => r.key === 'blue') || usdRates[0];
      if (preferred) {
        setForm(f => ({ ...f, tipoCambio: String(preferred.rate), tipoCambioFuente: preferred.key }));
      }
    }
  }, [form.moneda, usdRates]);

  const totals = React.useMemo(() => {
    const c = moneyToNumber(form.costoReal);
    const m = moneyToNumber(form.montoPactado);
    const e = moneyToNumber(form.entrega);
    const cuotas = parseInt(form.cantidadCuotas) || 1;
    const tasa = parseFloat(form.tasaInteres) || 0;

    const baseTotals = calculateOperationTotals(c, m, e, cuotas, tasa);

    const roundingStep = currency === 'USD' ? 10 : 1000;

    if (!form.redondearCuotas || cuotas === 1 || baseTotals.valorCuota % roundingStep === 0) {
      return {
        ...baseTotals,
        ajusteRedondeo: 0,
      };
    }
    const valorCuotaRedondeado = roundUpTo(baseTotals.valorCuota, roundingStep);
    const totalFinanciadoRedondeado = valorCuotaRedondeado * cuotas;
    const interesCalculadoRedondeado = totalFinanciadoRedondeado - baseTotals.montoFinanciado;
    const totalEsperadoRedondeado = totalFinanciadoRedondeado + e;
    const gananciaEsperadaRedondeada = totalEsperadoRedondeado - c;
    const ajusteRedondeo = totalFinanciadoRedondeado - baseTotals.totalFinanciado;

    return {
      ...baseTotals,
      valorCuota: valorCuotaRedondeado,
      totalFinanciado: totalFinanciadoRedondeado,
      interesCalculado: interesCalculadoRedondeado,
      totalEsperado: totalEsperadoRedondeado,
      gananciaEsperada: gananciaEsperadaRedondeada,
      ajusteRedondeo,
    };
  }, [
    form.costoReal,
    form.montoPactado,
    form.entrega,
    form.cantidadCuotas,
    form.tasaInteres,
    form.redondearCuotas,
    form.moneda,
  ]);

  const schedule = React.useMemo(() => {
    if (!form.primerVencimiento || !totals.totalFinanciado) return [];

    const cuotas = parseInt(form.cantidadCuotas) || 1;

    if (form.redondearCuotas) {
      return Array.from({ length: cuotas }, (_, i) => ({
        numero: i + 1,
        fecha: addMonths(form.primerVencimiento, i),
        monto: totals.valorCuota,
      }));
    }

    const base = Math.floor(totals.totalFinanciado / cuotas);
    const rem = totals.totalFinanciado - base * cuotas;

    return Array.from({ length: cuotas }, (_, i) => ({
      numero: i + 1,
      fecha: addMonths(form.primerVencimiento, i),
      monto: i === cuotas - 1 ? base + rem : base,
    }));
  }, [form.primerVencimiento, form.cantidadCuotas, form.redondearCuotas, totals]);

  function validateStep1() {
    const e = {};

    if (!form.clientId) e.clientId = 'Seleccioná un cliente';
    if (!form.descripcion.trim()) e.descripcion = 'Requerido';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e = {};

    const costoReal = moneyToNumber(form.costoReal);
    const montoPactado = moneyToNumber(form.montoPactado);
    const entrega = moneyToNumber(form.entrega);

    if (!form.costoReal || costoReal < 0) {
      e.costoReal = 'Ingresá el costo real';
    }

    if (!form.montoPactado || montoPactado <= 0) {
      e.montoPactado = 'Ingresá el monto pactado';
    }

    if (entrega > montoPactado) {
      e.entrega = 'La entrega no puede superar el monto pactado';
    }

    if (form.moneda === 'USD' && normalizeExchangeRate(form.tipoCambio) <= 1) {
      e.tipoCambio = 'Ingresá una cotización válida';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3() {
    const e = {};

    if (form.fuenteFinanciacion === 'Tarjeta de crédito' && !form.creditCardId) {
      e.creditCardId = 'Seleccioná una tarjeta';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) setStep(4);
    else if (step === 4) setStep(5);
  }

  function handleConfirm() {
    const costoReal = moneyToNumber(form.costoReal);
    const montoPactado = moneyToNumber(form.montoPactado);
    const entrega = moneyToNumber(form.entrega);

    const newOp = {
      id: 'op_' + Date.now(),
      codigo: nextSequentialCode(data.operations, 'OP'),
      clientId: form.clientId,
      tipo: form.tipo,
      descripcion: form.descripcion,
      costoReal,
      montoPactado,
      entrega,
      moneda: currency,
      tipoCambio: exchangeRate,
      tipoCambioFuente: form.tipoCambioFuente || (currency === 'ARS' ? 'historico_ars' : 'manual'),
      montoFinanciado: totals.montoFinanciado,
      cantidadCuotas: parseInt(form.cantidadCuotas),
      tasaInteres: parseFloat(form.tasaInteres),
      interesCalculado: totals.interesCalculado,
      totalFinanciado: totals.totalFinanciado,
      valorCuota: totals.valorCuota,
      totalEsperado: totals.totalEsperado,
      gananciaEsperada: totals.gananciaEsperada,
      costoRealBase: baseOf(costoReal),
      montoPactadoBase: baseOf(montoPactado),
      entregaBase: baseOf(entrega),
      montoFinanciadoBase: baseOf(totals.montoFinanciado),
      interesCalculadoBase: baseOf(totals.interesCalculado),
      totalFinanciadoBase: baseOf(totals.totalFinanciado),
      valorCuotaBase: baseOf(totals.valorCuota),
      totalEsperadoBase: baseOf(totals.totalEsperado),
      gananciaEsperadaBase: baseOf(totals.gananciaEsperada),
      redondearCuotas: !!form.redondearCuotas,
      fuenteFinanciacion: form.fuenteFinanciacion,
      creditCardId:
        form.fuenteFinanciacion === 'Tarjeta de crédito'
          ? form.creditCardId
          : null,
      fechaInicio: form.fechaInicio,
      primerVencimiento: form.primerVencimiento,
      estado: 'Activa',
      notas: form.notas,
    };

    const cuotaCodes = nextSequentialCodes(data.installments, 'CUO', schedule.length);
    const newInsts = schedule.map((s, i) => ({
      id: 'inst_' + Date.now() + '_' + i,
      codigo: cuotaCodes[i],
      operationId: newOp.id,
      clientId: form.clientId,
      numeroCuota: s.numero,
      totalCuotas: parseInt(form.cantidadCuotas),
      fechaVencimiento: s.fecha,
      montoProgramado: s.monto,
      montoPagado: 0,
      saldoPendiente: s.monto,
      moraAplicada: 0,
      moneda: currency,
      tipoCambio: exchangeRate,
      tipoCambioFuente: form.tipoCambioFuente || (currency === 'ARS' ? 'historico_ars' : 'manual'),
      montoProgramadoBase: baseOf(s.monto),
      montoPagadoBase: 0,
      saldoPendienteBase: baseOf(s.monto),
      moraAplicadaBase: 0,
      estado: 'Pendiente',
    }));

    const newCash = {
      id: 'cash_' + Date.now(),
      tipo:
        form.tipo === 'Préstamo en efectivo'
          ? 'Salida por préstamo'
          : 'Salida por compra de producto',
      monto: -costoReal,
      moneda: currency,
      tipoCambio: exchangeRate,
      tipoCambioFuente: form.tipoCambioFuente || (currency === 'ARS' ? 'historico_ars' : 'manual'),
      montoBase: -baseOf(costoReal),
      clientId: form.clientId,
      operationId: newOp.id,
      paymentId: null,
      creditCardId: null,
      descripcion: `${newOp.codigo} — ${form.descripcion}`,
      fecha: form.fechaInicio,
    };

    const newVoucher = {
      id: 'vou_' + Date.now(),
      codigo: nextSequentialCode(data.internalOperationVouchers, 'COMP'),
      operationId: newOp.id,
      clientId: form.clientId,
      estado: 'Emitido',
      fecha: form.fechaInicio,
    };

    const newCCMovs =
      form.fuenteFinanciacion === 'Tarjeta de crédito' && form.creditCardId
        ? [
            {
              id: 'ccm_' + Date.now(),
              creditCardId: form.creditCardId,
              operationId: newOp.id,
              clientId: form.clientId,
              fechaCompra: form.fechaCompraTC,
              descripcion: form.descripcion,
              monto: costoReal,
              moneda: currency,
              tipoCambio: exchangeRate,
              tipoCambioFuente: form.tipoCambioFuente || (currency === 'ARS' ? 'historico_ars' : 'manual'),
              montoBase: baseOf(costoReal),
              cuotasTarjeta: parseInt(form.cuotasTarjeta),
              cuotaActualTarjeta: 1,
              fechaCierreEstimada: addMonths(form.fechaCompraTC, 1),
              fechaVencimientoEstimada: addMonths(form.fechaCompraTC, 1),
              estado: 'Activo',
            },
          ]
        : [];

    onSave(newOp, newInsts, newCash, newVoucher, newCCMovs);
  }

  const stepLabels = [
    'Cliente y tipo',
    'Montos',
    'Financiación',
    'Preview',
    'Confirmar',
  ];

  const CalcRow = ({ label, value, bold, accent }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: bold ? 700 : 500,
          color: accent || '#0f172a',
          fontFamily: 'DM Mono, monospace',
        }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar operación' : 'Nueva operación'}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div>
            {step > 1 && (
              <Btn variant="secondary" onClick={() => setStep(s => s - 1)}>
                ← Atrás
              </Btn>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={onClose}>
              Cancelar
            </Btn>

            {step < 5 ? (
              <Btn onClick={handleNext}>Siguiente →</Btn>
            ) : (
              <Btn onClick={handleConfirm}>
                {isEdit ? '💾 Guardar cambios' : '✅ Confirmar operación'}
              </Btn>
            )}
          </div>
        </div>
      }
    >
      {isEdit && hasPayments && (
        <div
          style={{
            background: '#fef9c3',
            border: '1px solid #fde047',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: '#854d0e',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          ⚠️ Esta operación tiene pagos registrados. Solo podés editar el{' '}
          <strong>tipo, descripción, fuente de financiación y notas</strong>. Los montos y el cronograma no se pueden modificar.
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        {stepLabels.map((label, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                margin: '0 auto 4px',
                background:
                  step > i + 1
                    ? '#16a34a'
                    : step === i + 1
                      ? '#4f46e5'
                      : '#e2e8f0',
                color: step >= i + 1 ? '#fff' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {step > i + 1 ? '✓' : i + 1}
            </div>

            <div
              style={{
                fontSize: 10,
                color: step === i + 1 ? '#4f46e5' : '#94a3b8',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: step === i + 1 ? 700 : 400,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Cliente" required error={errors.clientId}>
              <Select
                value={form.clientId}
                onChange={e => set('clientId', e.target.value)}
                disabled={isEdit}
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} — {c.codigo}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Tipo de operación">
            <Select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {['Préstamo en efectivo', 'Venta financiada', 'Compra con tarjeta', 'Otro'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>

          <Field label="Fecha de inicio">
            <Input
              type="date"
              value={form.fechaInicio}
              onChange={e => set('fechaInicio', e.target.value)}
              onPaste={handleDatePaste('fechaInicio')}
              disabled={hasPayments}
            />
          </Field>

          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Descripción" required error={errors.descripcion}>
              <Input
                value={form.descripcion}
                onChange={e => set('descripcion', e.target.value)}
                placeholder="Ej. Préstamo personal para..."
              />
            </Field>
          </div>

          <Field
            label="Primer vencimiento"
            hint={
              hasPayments
                ? 'No modificable con pagos activos'
                : 'Se calcula automáticamente un mes después del inicio'
            }
          >
            <Input
              type="date"
              value={form.primerVencimiento}
              onChange={e => set('primerVencimiento', e.target.value)}
              onPaste={handleDatePaste('primerVencimiento')}
              disabled={hasPayments}
            />
          </Field>

          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Notas">
              <Textarea
                value={form.notas}
                onChange={e => set('notas', e.target.value)}
                placeholder="Observaciones opcionales..."
                rows={2}
              />
            </Field>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Moneda de la operación" required>
            <Select value={form.moneda} onChange={e => set('moneda', e.target.value)} disabled={hasPayments}>
              <option value="ARS">ARS - Pesos argentinos</option>
              <option value="USD">USD - Dólares</option>
            </Select>
          </Field>

          <Field label="Cotización aplicada" error={errors.tipoCambio} hint={form.moneda === 'USD' ? 'Queda congelada al guardar' : 'ARS base'}>
            <div style={{ display: 'flex', gap: 8 }}>
              {form.moneda === 'USD' && (
                <Select value={form.tipoCambioFuente || 'manual'} onChange={e => selectRateSource(e.target.value)} disabled={hasPayments} style={{ maxWidth: 130 }}>
                  <option value="manual">Manual</option>
                  {usdRates.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </Select>
              )}
              <Input
                type="number"
                step="0.01"
                value={form.tipoCambio}
                onChange={e => set('tipoCambio', e.target.value)}
                disabled={form.moneda === 'ARS' || hasPayments}
              />
            </div>
          </Field>

          {hasPayments && (
            <div
              style={{
                gridColumn: '1/-1',
                background: 'var(--bg-subtle)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--text-muted)',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              🔒 Campos bloqueados — esta operación tiene pagos registrados.
            </div>
          )}

          <Field label="Costo real" required error={errors.costoReal} hint={`Lo que vos gastás/entregás en ${currency}`}>
            <Input
              type="text"
              inputMode="numeric"
              value={form.costoReal}
              onChange={e => setMoney('costoReal', e.target.value)}
              placeholder={currency === 'USD' ? '1.000' : '200.000'}
              disabled={hasPayments}
            />
          </Field>

          <Field label="Monto pactado" required error={errors.montoPactado} hint={`Lo que acordaste cobrar en ${currency}`}>
            <Input
              type="text"
              inputMode="numeric"
              value={form.montoPactado}
              onChange={e => setMoney('montoPactado', e.target.value)}
              placeholder={currency === 'USD' ? '1.200' : '200.000'}
              disabled={hasPayments}
            />
          </Field>

          <Field label="Entrega (pago inicial)" error={errors.entrega} hint="Anticipo recibido al inicio">
            <Input
              type="text"
              inputMode="numeric"
              value={form.entrega}
              onChange={e => setMoney('entrega', e.target.value)}
              placeholder="0"
              disabled={hasPayments}
            />
          </Field>

          <Field label="Cantidad de cuotas">
            <Select
              value={form.cantidadCuotas}
              onChange={e => set('cantidadCuotas', Number(e.target.value))}
              disabled={hasPayments}
            >
              {[1, 2, 3, 4, 6, 9, 12].map(n => (
                <option key={n} value={n}>
                  {n} cuota{n > 1 ? 's' : ''}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tasa de interés (%)" hint={form.tasaManual ? 'Manual' : `Auto desde configuración (${currency})`}>
            <Input
              type="number"
              value={form.tasaInteres}
              onChange={e => set('tasaInteres', e.target.value)}
              disabled={!form.tasaManual || hasPayments}
            />
          </Field>

          {missingRateMessage && (
            <div style={{ gridColumn: '1/-1', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.4 }}>
              {missingRateMessage}
            </div>
          )}

          <Field label=" ">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="tasaManual"
                  checked={form.tasaManual}
                  onChange={e => set('tasaManual', e.target.checked)}
                  disabled={hasPayments}
                />
                <label
                  htmlFor="tasaManual"
                  style={{
                    fontSize: 13,
                    color: hasPayments ? '#94a3b8' : '#374151',
                    cursor: hasPayments ? 'default' : 'pointer',
                  }}
                >
                  Modificar tasa manualmente
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="redondearCuotas"
                  checked={!!form.redondearCuotas}
                  onChange={e => set('redondearCuotas', e.target.checked)}
                  disabled={hasPayments}
                />
                <label
                  htmlFor="redondearCuotas"
                  style={{
                    fontSize: 13,
                    color: hasPayments ? '#94a3b8' : '#374151',
                    cursor: hasPayments ? 'default' : 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Redondear cuotas hacia arriba
                </label>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-faint)', paddingLeft: 22 }}>
                {currency === 'USD' ? 'Ej.: 43,20 → 50,00' : 'Ej.: 99.535 → 100.000'}
              </div>
            </div>
          </Field>

          <div style={{ gridColumn: '1/-1', background: 'var(--bg-page)', borderRadius: 10, padding: 14 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 10,
              }}
            >
              Cálculo automático
            </div>

            <CalcRow label="Monto financiado" value={formatMoneyWithEquivalent(totals.montoFinanciado, currency, exchangeRate, { compact: true })} />
            <CalcRow label="Interés calculado" value={formatMoneyWithEquivalent(totals.interesCalculado, currency, exchangeRate, { compact: true })} />
            <CalcRow label="Total financiado" value={formatMoneyWithEquivalent(totals.totalFinanciado, currency, exchangeRate, { compact: true })} />
            <CalcRow label="Valor de cuota" value={formatMoneyWithEquivalent(totals.valorCuota, currency, exchangeRate, { compact: true })} bold />
            {form.redondearCuotas && totals.ajusteRedondeo > 0 && (
              <CalcRow label="Ajuste por redondeo" value={formatMoney(totals.ajusteRedondeo, currency)} />
            )}
            <CalcRow label="Total esperado (con entrega)" value={formatMoneyWithEquivalent(totals.totalEsperado, currency, exchangeRate, { compact: true })} bold />
            <CalcRow label="Ganancia esperada" value={formatMoneyWithEquivalent(totals.gananciaEsperada, currency, exchangeRate, { compact: true })} bold accent="#16a34a" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Fuente de financiación">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['Efectivo', 'Transferencia', 'Tarjeta de crédito', 'Mixta'].map(f => (
                <button
                  key={f}
                  onClick={() => setFundingSource(f)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '2px solid',
                    borderColor: form.fuenteFinanciacion === f ? '#4f46e5' : '#e2e8f0',
                    background: form.fuenteFinanciacion === f ? '#eef2ff' : '#fff',
                    color: form.fuenteFinanciacion === f ? '#4f46e5' : '#374151',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </Field>

          {form.fuenteFinanciacion === 'Tarjeta de crédito' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                background: 'var(--bg-page)',
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Tarjeta" required error={errors.creditCardId}>
                  <Select
                    value={form.creditCardId}
                    onChange={e => set('creditCardId', e.target.value)}
                  >
                    <option value="">Seleccionar tarjeta...</option>
                    {creditCards
                      .filter(cc => cc.estado === 'Activa')
                      .map(cc => (
                        <option key={cc.id} value={cc.id}>
                          {cc.nombre} — ···{cc.ultimosDigitos} ({cc.banco})
                        </option>
                      ))}
                  </Select>
                </Field>
              </div>

              <Field label="Fecha de compra">
                <Input
                  type="date"
                  value={form.fechaCompraTC}
                  onChange={e => set('fechaCompraTC', e.target.value)}
                  onPaste={handleDatePaste('fechaCompraTC')}
                />
              </Field>

              <Field label="Cuotas de la tarjeta">
                <Select
                  value={form.cuotasTarjeta}
                  onChange={e => set('cuotasTarjeta', Number(e.target.value))}
                >
                  {[1, 3, 6, 9, 12, 18, 24].map(n => (
                    <option key={n} value={n}>
                      {n} cuota{n > 1 ? 's' : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Comprobante (mock)">
                <Btn variant="secondary" size="sm">
                  📎 Adjuntar archivo (mock)
                </Btn>
              </Field>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--bg-page)', borderRadius: 10, padding: 16 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 12,
              }}
            >
              Resumen de la operación
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['Cliente', clients.find(c => c.id === form.clientId)?.nombre || '—'],
                ['Tipo', form.tipo],
                ['Descripción', form.descripcion],
                ['Moneda', currency === 'USD' ? `USD @ ${maskSensitiveNumber(exchangeRate)}` : 'ARS'],
                ['Costo real', formatMoneyWithEquivalent(moneyToNumber(form.costoReal), currency, exchangeRate, { compact: true })],
                ['Monto pactado', formatMoneyWithEquivalent(moneyToNumber(form.montoPactado), currency, exchangeRate, { compact: true })],
                ['Entrega inicial', formatMoneyWithEquivalent(moneyToNumber(form.entrega), currency, exchangeRate, { compact: true })],
                ['Cuotas', form.cantidadCuotas],
                ['Tasa', form.tasaInteres + '%'],
                ['Cuotas redondeadas', form.redondearCuotas ? 'Sí' : 'No'],
                ['Total a cobrar', formatMoneyWithEquivalent(totals.totalEsperado, currency, exchangeRate, { compact: true })],
                ['Ganancia esperada', formatMoneyWithEquivalent(totals.gananciaEsperada, currency, exchangeRate, { compact: true })],
                ['Fuente', form.fuenteFinanciacion],
                ['Primer venc.', formatDate(form.primerVencimiento)],
              ].map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 10,
              }}
            >
              Cronograma de cuotas
            </div>

            {schedule.map(s => (
              <div
                key={s.numero}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--bg-page)',
                  borderRadius: 6,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#4f46e5',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {maskSensitiveNumber(s.numero)}
                  </span>

                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Cuota {maskSensitiveNumber(s.numero)}/{maskSensitiveNumber(form.cantidadCuotas)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    {formatDate(s.fecha)}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {formatMoneyWithEquivalent(s.monto, currency, exchangeRate, { compact: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>

          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 8,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Listo para confirmar
          </div>

          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
            {isEdit
              ? `Se van a actualizar los datos de la operación: ${maskSensitiveNumber(form.cantidadCuotas)} cuota(s) recalculadas, movimientos de caja y tarjeta actualizados.`
              : `Se va a crear la operación con ${maskSensitiveNumber(form.cantidadCuotas)} cuota(s), un comprobante interno y el movimiento de caja correspondiente.`}
          </div>

          <div
            style={{
              background: 'var(--bg-page)',
              borderRadius: 10,
              padding: 16,
              textAlign: 'left',
              maxWidth: 360,
              margin: '0 auto',
            }}
          >
            <CalcRow label="Cliente" value={clients.find(c => c.id === form.clientId)?.nombre || '—'} />
            <CalcRow label="Tipo" value={form.tipo} />
            <CalcRow label="Redondeo de cuotas" value={form.redondearCuotas ? 'Activado' : 'Desactivado'} />
            <CalcRow label="Moneda" value={currency === 'USD' ? `USD @ ${maskSensitiveNumber(exchangeRate)}` : 'ARS'} />
            <CalcRow label="Total a cobrar" value={formatMoneyWithEquivalent(totals.totalEsperado, currency, exchangeRate, { compact: true })} bold />
            <CalcRow label="Cuotas" value={`${maskSensitiveNumber(form.cantidadCuotas)} x ${formatMoney(totals.valorCuota, currency)}`} />
            <CalcRow label="Ganancia esperada" value={formatMoneyWithEquivalent(totals.gananciaEsperada, currency, exchangeRate, { compact: true })} bold accent="#16a34a" />
          </div>
        </div>
      )}
    </Modal>
  );
}

function OperacionesScreen({ data, onNav, onDataChange, openNewModal, preselectedClientId, auth }) {
  const { clients, operations, installments, creditCards } = data;
  const hp = window.hasPermission || (() => true);
  const orgId = auth?.currentOrganization?.id;
  const userId = auth?.user?.id;
  const [showNew, setShowNew] = React.useState(false);
  const [filters, setFilters] = React.useState({});
  const [success, setSuccess] = React.useState(false);
  const [pendingClientId, setPendingClientId] = React.useState(null);

  React.useEffect(() => {
    if (openNewModal) {
      setPendingClientId(preselectedClientId || null);
      setShowNew(true);
    }
  }, [openNewModal, preselectedClientId]);

  const filtered = operations.filter(op => {
    if (filters.estado && op.estado !== filters.estado) return false;
    if (filters.tipo && op.tipo !== filters.tipo) return false;
    if (filters.fuente && op.fuenteFinanciacion !== filters.fuente) return false;
    if (filters.cliente) {
      const client = clients.find(c => c.id === op.clientId);
      if (!client?.nombre.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
    }
    return true;
  });

  async function handleSave(newOp, newInsts, newCash, newVoucher, newCCMovs) {
    const sb = window.__supabase;
    const [
      { data: currentOps, error: currentOpsError },
      { data: currentInsts, error: currentInstsError },
      { data: currentVouchers, error: currentVouchersError },
    ] = await Promise.all([
      sb.from('operations').select('codigo'),
      sb.from('installments').select('codigo'),
      sb.from('internal_operation_vouchers').select('codigo'),
    ]);
    if (currentOpsError) { alert('Error verificando operaciones: ' + currentOpsError.message); return; }
    if (currentInstsError) { alert('Error verificando cuotas: ' + currentInstsError.message); return; }
    if (currentVouchersError) { alert('Error verificando comprobantes: ' + currentVouchersError.message); return; }

    const operationCode = nextSequentialCode(currentOps || data.operations, 'OP');
    const installmentCodes = nextSequentialCodes(currentInsts || data.installments, 'CUO', newInsts.length);
    const voucherCode = nextSequentialCode(currentVouchers || data.internalOperationVouchers, 'COMP');

    const opPayload = toSnake({
      codigo:            operationCode,
      organizationId:    orgId,
      createdBy:         userId,
      clientId:          newOp.clientId,
      tipo:              newOp.tipo,
      descripcion:       newOp.descripcion,
      costoReal:         newOp.costoReal,
      montoPactado:      newOp.montoPactado,
      entrega:           newOp.entrega,
      moneda:            newOp.moneda || 'ARS',
      tipoCambio:        newOp.tipoCambio || 1,
      tipoCambioFuente:  newOp.tipoCambioFuente || 'historico_ars',
      montoFinanciado:   newOp.montoFinanciado,
      cantidadCuotas:    newOp.cantidadCuotas,
      tasaInteres:       newOp.tasaInteres,
      interesCalculado:  newOp.interesCalculado,
      totalFinanciado:   newOp.totalFinanciado,
      valorCuota:        newOp.valorCuota,
      totalEsperado:     newOp.totalEsperado,
      gananciaEsperada:  newOp.gananciaEsperada,
      costoRealBase:     newOp.costoRealBase,
      montoPactadoBase:  newOp.montoPactadoBase,
      entregaBase:       newOp.entregaBase,
      montoFinanciadoBase: newOp.montoFinanciadoBase,
      interesCalculadoBase: newOp.interesCalculadoBase,
      totalFinanciadoBase: newOp.totalFinanciadoBase,
      valorCuotaBase:    newOp.valorCuotaBase,
      totalEsperadoBase: newOp.totalEsperadoBase,
      gananciaEsperadaBase: newOp.gananciaEsperadaBase,
      fuenteFinanciacion: newOp.fuenteFinanciacion,
      creditCardId:      newOp.creditCardId || null,
      fechaInicio:       newOp.fechaInicio,
      primerVencimiento: newOp.primerVencimiento,
      estado:            'Activa',
      notas:             newOp.notas || null,
    });
    const instsPayload = newInsts.map((i, idx) => ({
      organization_id:   orgId,
      created_by:        userId,
      codigo:            installmentCodes[idx],
      client_id:         newOp.clientId,
      numero_cuota:      i.numeroCuota,
      total_cuotas:      i.totalCuotas,
      fecha_vencimiento: i.fechaVencimiento,
      monto_programado:  i.montoProgramado,
      monto_pagado:      i.montoPagado || 0,
      saldo_pendiente:   i.saldoPendiente,
      mora_aplicada:     i.moraAplicada || 0,
      estado:            i.estado || 'Pendiente',
      moneda:            i.moneda || newOp.moneda || 'ARS',
      tipo_cambio:       i.tipoCambio || newOp.tipoCambio || 1,
      tipo_cambio_fuente: i.tipoCambioFuente || newOp.tipoCambioFuente || 'historico_ars',
      monto_programado_base: i.montoProgramadoBase,
      monto_pagado_base: i.montoPagadoBase || 0,
      saldo_pendiente_base: i.saldoPendienteBase,
      mora_aplicada_base: i.moraAplicadaBase || 0,
    }));
    const cashPayload = {
      organization_id: orgId,
      created_by:      userId,
      client_id:       newOp.clientId,
      tipo: newCash.tipo,
      monto: newCash.monto,
      descripcion: `${operationCode} — ${newOp.descripcion}`,
      fecha: newCash.fecha || newOp.fechaInicio,
      moneda: newCash.moneda || newOp.moneda || 'ARS',
      tipo_cambio: newCash.tipoCambio || newOp.tipoCambio || 1,
      tipo_cambio_fuente: newCash.tipoCambioFuente || newOp.tipoCambioFuente || 'historico_ars',
      monto_base: newCash.montoBase ?? newCash.monto,
    };
    const voucherPayload = { organization_id: orgId, client_id: newOp.clientId, codigo: voucherCode, fecha: newVoucher.fecha || newOp.fechaInicio };
    const ccPayload = newCCMovs.length > 0 ? {
      organization_id:             orgId,
      created_by:                  userId,
      client_id:                   newOp.clientId,
      credit_card_id:              newCCMovs[0].creditCardId,
      fecha_compra:                newCCMovs[0].fechaCompra,
      descripcion:                 newCCMovs[0].descripcion,
      monto:                       newCCMovs[0].monto,
      moneda:                      newCCMovs[0].moneda || newOp.moneda || 'ARS',
      tipo_cambio:                 newCCMovs[0].tipoCambio || newOp.tipoCambio || 1,
      tipo_cambio_fuente:          newCCMovs[0].tipoCambioFuente || newOp.tipoCambioFuente || 'historico_ars',
      monto_base:                  newCCMovs[0].montoBase ?? newCCMovs[0].monto,
      cuotas_tarjeta:              newCCMovs[0].cuotasTarjeta,
      fecha_cierre_estimada:       newCCMovs[0].fechaCierreEstimada,
      fecha_vencimiento_estimada:  newCCMovs[0].fechaVencimientoEstimada,
    } : null;

    const { error } = await sb.rpc('create_operation', {
      p_operation:     opPayload,
      p_installments:  instsPayload,
      p_cash_movement: cashPayload,
      p_voucher:       voucherPayload,
      p_cc_movement:   ccPayload,
    });
    if (error) { alert('Error al crear operación: ' + error.message); return; }

    const [
      { data: updOps },
      { data: updInsts },
      { data: updCash },
      { data: updVouchers },
      { data: updCCMovs },
    ] = await Promise.all([
      sb.from('operations').select('*').order('fecha_inicio'),
      sb.from('installments').select('*').order('fecha_vencimiento'),
      sb.from('cash_movements').select('*').order('fecha'),
      sb.from('internal_operation_vouchers').select('*').order('fecha'),
      sb.from('credit_card_movements').select('*').order('fecha_compra'),
    ]);
    onDataChange('operations',                rowsToCamel(updOps));
    onDataChange('installments',              rowsToCamel(updInsts));
    onDataChange('cashMovements',             rowsToCamel(updCash));
    onDataChange('internalOperationVouchers', rowsToCamel(updVouchers));
    onDataChange('creditCardMovements',       rowsToCamel(updCCMovs));
    setShowNew(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  const columns = [
    { key: 'codigo', label: 'Código', mono: true, nowrap: true, render: (v, row) => (
      <button onClick={e => { e.stopPropagation(); onNav('operaciones', row.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#4f46e5', fontFamily: 'DM Mono, monospace', padding: 0 }}>{v}</button>
    )},
    { key: 'clientId', label: 'Cliente', render: v => {
      const c = clients.find(cl => cl.id === v);
      return <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{c?.nombre || '—'}</span>;
    }},
    { key: 'tipo', label: 'Tipo', render: v => <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg-subtle)', borderRadius: 6, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>{v}</span> },
    { key: 'moneda', label: 'Moneda', render: v => <StatusBadge status={v || 'ARS'} /> },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'cantidadCuotas', label: 'Cuotas', render: (v, row) => `${maskSensitiveNumber(v)} x ${formatMoney(row.valorCuota, row.moneda)}` },
    { key: 'tasaInteres', label: 'Tasa', render: v => maskSensitiveNumber(v, '%') },
    { key: 'totalEsperado', label: 'Total', mono: true, render: (v, row) => <span style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace', color: 'var(--text-primary)' }}>{formatMoneyWithEquivalent(v, row.moneda, row.tipoCambio, { compact: true })}</span> },
    { key: 'gananciaEsperada', label: 'Ganancia', mono: true, render: (v, row) => <span style={{ fontWeight: 600, fontFamily: 'DM Mono, monospace', color: '#16a34a' }}>{formatMoneyWithEquivalent(v, row.moneda, row.tipoCambio, { compact: true })}</span> },
    { key: 'fuenteFinanciacion', label: 'Fuente', render: v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span> },
    { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
    { key: '_acc', label: '', sortable: false, render: (_, row) => (
      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        <Btn size="sm" variant="ghost" onClick={() => onNav('operaciones', row.id)}>Ver</Btn>
        {hp('payments.create') && <Btn size="sm" variant="ghost" onClick={() => onNav('pagos', null, 'nuevo', null, row.id)}>💳</Btn>}
      </div>
    )},
  ];

  return (
    <div>
      <SectionHeader title="Operaciones" actions={
        hp('operations.create') && <Btn onClick={() => { setPendingClientId(null); setShowNew(true); }}>+ Nueva operación</Btn>
      } />
      {success && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
          ✅ Operación creada con éxito. Cuotas, comprobante y movimiento de caja generados.
        </div>
      )}
      <Card>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={filters.cliente || ''} onChange={e => setFilters(f => ({ ...f, cliente: e.target.value }))} placeholder="🔍 Filtrar por cliente..." style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', minWidth: 180 }} />
          <select value={filters.estado || ''} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todos los estados</option>
            {['Activa','Completada','Anulada','Refinanciada'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filters.tipo || ''} onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todos los tipos</option>
            {['Préstamo en efectivo','Venta financiada','Compra con tarjeta','Otro'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filters.fuente || ''} onChange={e => setFilters(f => ({ ...f, fuente: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todas las fuentes</option>
            {['Efectivo','Transferencia','Tarjeta de crédito','Mixta'].map(s => <option key={s}>{s}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-faint)', alignSelf: 'center', fontFamily: 'DM Sans, sans-serif' }}>{filtered.length} operacion{filtered.length !== 1 ? 'es' : ''}</span>
        </div>
        <DataTable columns={columns} data={filtered} onRowClick={row => onNav('operaciones', row.id)} emptyMessage="Sin operaciones" defaultSortKey="codigo" defaultSortDir="asc" tableId="operaciones" />
      </Card>
      <NuevaOperacionModal open={showNew} onClose={() => { setShowNew(false); setPendingClientId(null); }} onSave={handleSave} data={data} preselectedClientId={pendingClientId} />
    </div>
  );
}

// ============================================================
// DETALLE DE OPERACIÓN
// ============================================================
function OperationIcon({ name, color = '#4f46e5', size = 18 }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const icons = {
    chart: (<><path {...common} d="M4 19V11" /><path {...common} d="M10 19V5" /><path {...common} d="M16 19V8" /><path {...common} d="M21 19H3" /></>),
    calendar: (<><rect {...common} x="3" y="4" width="18" height="18" rx="2" /><path {...common} d="M16 2v4M8 2v4M3 10h18" /></>),
    card: (<><rect {...common} x="3" y="5" width="18" height="14" rx="2" /><path {...common} d="M3 10h18" /></>),
    file: (<><path {...common} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path {...common} d="M14 2v6h6M8 13h8M8 17h6" /></>),
    paperclip: <path {...common} d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l8.5-8.5a4 4 0 1 1 5.7 5.7l-8.5 8.5a2 2 0 1 1-2.8-2.8l8.5-8.5" />,
    edit: <path {...common} d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
    trash: (<><path {...common} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /><path {...common} d="M10 11v6M14 11v6" /></>),
    user: (<><path {...common} d="M20 21a8 8 0 0 0-16 0" /><circle {...common} cx="12" cy="7" r="4" /></>),
    wallet: (<><path {...common} d="M3 7h18v12H3z" /><path {...common} d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" /></>),
    money: (<><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="M12 7v10M15 9.5A3 3 0 0 0 12 8c-1.7 0-3 1-3 2.3s1.1 2 3 2.2 3 .9 3 2.2S13.7 17 12 17a3.3 3.3 0 0 1-3.2-1.8" /></>),
    check: (<><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="m8 12 3 3 5-6" /></>),
    clock: (<><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="M12 7v5l3 2" /></>),
    alert: (<><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="M12 8v5M12 16h.01" /></>),
    chevron: <path {...common} d="m9 18 6-6-6-6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>{icons[name] || icons.chart}</svg>;
}

function OperationHeaderCard({ op, client, ccCard, onNav, onRegisterPayment, onVoucher, onEdit, onDelete, isMobile }) {
  return (
    <Card style={{ padding: isMobile ? 18 : '22px 26px', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 10px 26px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
        <div style={{ minWidth: 0, flex: '1 1 420px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{op.codigo}</span>
            <StatusBadge status={op.estado} size="md" />
            <span style={{ fontSize: 12, padding: '5px 12px', background: 'var(--bg-subtle)', borderRadius: 999, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontWeight: 700 }}>{op.tipo}</span>
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: isMobile ? 22 : 26, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', letterSpacing: 0 }}>{op.descripcion}</h2>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => onNav('clientes', op.clientId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <OperationIcon name="user" color="#4f46e5" size={15} /> {client?.nombre || 'Cliente'}
            </button>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><OperationIcon name="calendar" color="#64748b" size={15} />Inicio: {formatDate(op.fechaInicio)}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><OperationIcon name="calendar" color="#64748b" size={15} />Primer venc.: {formatDate(op.primerVencimiento)}</span>
            {ccCard && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><OperationIcon name="card" color="#64748b" size={15} />{ccCard.nombre} ...{ccCard.ultimosDigitos}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
          <Btn size="md" onClick={onRegisterPayment}><OperationIcon name="card" color="#fff" size={16} /> Registrar pago</Btn>
          <Btn size="md" variant="secondary" onClick={onVoucher}><OperationIcon name="file" color="#374151" size={16} /> Comprobante</Btn>
          <Btn size="md" variant="secondary"><OperationIcon name="paperclip" color="#374151" size={16} /> Subir comprobante</Btn>
          <Btn size="md" variant="secondary" onClick={onEdit}><OperationIcon name="edit" color="#374151" size={16} /> Editar</Btn>
          <Btn size="md" variant="danger" onClick={onDelete} style={{ background: '#fff1f2', borderColor: '#fecaca', color: '#b91c1c' }}><OperationIcon name="trash" color="#b91c1c" size={16} /> Eliminar</Btn>
        </div>
      </div>
    </Card>
  );
}

function OperationFinancialSummaryCard({ op, totalPagado, saldoPendiente, gananciaObtenida, progressPct, isMobile }) {
  const paidPct = Math.max(0, Math.min(100, progressPct));
  const pendingPct = Math.max(0, 100 - paidPct);
  const items = [
    { label: 'Total a recuperar', value: formatCurrency(op.totalEsperado), color: '#4f46e5' },
    { label: 'Cobrado', value: formatCurrency(totalPagado), color: '#059669' },
    { label: 'Ganancia obtenida', value: formatCurrency(gananciaObtenida), color: '#059669' },
    { label: 'Ganancia proyectada', value: formatCurrency(op.gananciaEsperada), color: '#4f46e5' },
  ];
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-surface)', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 10px 28px rgba(15,23,42,0.06)', padding: isMobile ? 20 : 26 }}>
      <div style={{ position: 'absolute', right: -70, top: -100, width: 280, height: 250, borderRadius: '45%', background: 'rgba(99,102,241,0.12)' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <OperationIcon name="chart" color="#4f46e5" size={24} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>Resumen financiero</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Saldo pendiente</div>
          </div>
        </div>
        <div style={{ fontSize: isMobile ? 34 : 42, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace', lineHeight: 1, marginBottom: 24 }}>{formatCurrency(saldoPendiente)}</div>
        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 18 }} />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: isMobile ? 14 : 0, marginBottom: 18 }}>
          {items.map((item, idx) => (
            <div key={item.label} style={{ padding: isMobile ? 0 : '0 18px', borderLeft: !isMobile && idx > 0 ? '1px solid #e5e7eb' : 'none' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 9 }}>{item.label}</div>
              <div style={{ fontSize: isMobile ? 17 : 21, color: item.color, fontWeight: 900, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#16a34a' }}>Cobrado {maskSensitiveNumber(Math.round(paidPct), '%')}</span>
          <div style={{ height: 9, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}><div style={{ width: paidPct + '%', height: '100%', borderRadius: 999, background: '#16a34a' }} /></div>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)' }}>Pendiente {maskSensitiveNumber(Math.round(pendingPct), '%')}</span>
        </div>
      </div>
    </div>
  );
}

function OperationScheduleStatusCard({ cuotasPagadas, cuotasPendientes, cuotasVencidas, totalCuotas, nextInst, onViewCuotas, onPay, isMobile }) {
  const nextLabel = nextInst ? `Cuota ${maskSensitiveNumber(nextInst.numeroCuota)}/${maskSensitiveNumber(nextInst.totalCuotas)}` : 'Sin próxima cuota';
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 10px 28px rgba(15,23,42,0.06)', padding: isMobile ? 20 : 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <OperationIcon name="calendar" color="#4f46e5" size={22} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>Estado del cronograma</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18, alignItems: 'center', marginBottom: 22 }}>
        <div style={{ display: 'grid', gap: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><OperationIcon name="check" color="#16a34a" size={18} /><span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700 }}>{maskSensitiveNumber(cuotasPagadas)} / {maskSensitiveNumber(totalCuotas)} cuotas pagadas</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><OperationIcon name="clock" color="#2563eb" size={18} /><span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700 }}>{maskSensitiveNumber(cuotasPendientes)} pendientes</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><OperationIcon name="alert" color={cuotasVencidas ? '#dc2626' : '#16a34a'} size={18} /><span style={{ fontSize: 14, color: cuotasVencidas ? '#991b1b' : '#0f172a', fontWeight: 700 }}>{maskSensitiveNumber(cuotasVencidas)} vencidas</span></div>
        </div>
        <div style={{ borderLeft: isMobile ? 'none' : '1px solid #e5e7eb', paddingLeft: isMobile ? 0 : 24 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 5 }}>Próxima cuota</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 10 }}>{nextLabel}</div>
          {nextInst && (
            <div style={{ display: 'grid', gap: 8, fontSize: 14, color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><OperationIcon name="calendar" color="#64748b" size={16} /> {formatDate(nextInst.fechaVencimiento)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><OperationIcon name="money" color="#64748b" size={16} /> {formatCurrency(nextInst.saldoPendiente || nextInst.montoProgramado)}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.1fr', gap: 10 }}>
        <Btn variant="secondary" onClick={onViewCuotas} style={{ justifyContent: 'center' }}><OperationIcon name="file" color="#475569" size={16} /> Ver cuotas</Btn>
        <Btn onClick={onPay} style={{ justifyContent: 'center' }}><OperationIcon name="card" color="#fff" size={16} /> Registrar pago</Btn>
      </div>
    </div>
  );
}

function OperationMetricCard({ icon, label, value, sub, color, bg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: 'var(--bg-surface)', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 8px 22px rgba(15,23,42,0.05)', minWidth: 0 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <OperationIcon name={icon} color={color} size={21} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#334155', fontWeight: 700, marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 21, color, fontWeight: 900, fontFamily: 'DM Mono, monospace', lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function FinancialDetailsPanel({ op, totalPagado, saldoPendiente, gananciaObtenida }) {
  const blocks = [
    { title: 'Inversión', icon: 'money', color: '#7c3aed', bg: '#f3e8ff', rows: [['Costo real', formatCurrency(op.costoReal)], ['Entrega inicial', formatCurrency(op.entrega)], ['Fuente', op.fuenteFinanciacion]] },
    { title: 'Financiación', icon: 'card', color: '#2563eb', bg: '#dbeafe', rows: [['Monto pactado', formatCurrency(op.montoPactado)], ['Monto financiado', formatCurrency(op.montoFinanciado)], ['Tasa de interés', maskSensitiveNumber(op.tasaInteres, '%')], ['Valor de cuota', formatCurrency(op.valorCuota)], ['Total financiado', formatCurrency(op.totalFinanciado)]] },
    { title: 'Resultado', icon: 'chart', color: '#16a34a', bg: '#dcfce7', rows: [['Cobrado', formatCurrency(totalPagado)], ['Saldo pendiente', formatCurrency(saldoPendiente)], ['Ganancia obtenida', formatCurrency(gananciaObtenida)], ['Ganancia proyectada', formatCurrency(op.gananciaEsperada)]] },
  ];
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, background: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12 }}><OperationIcon name="calendar" color="#475569" size={18} /> Detalles financieros</div>
      <div style={{ display: 'grid', gap: 10 }}>
        {blocks.map(block => (
          <div key={block.title} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: block.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><OperationIcon name={block.icon} color={block.color} size={16} /></span>
              <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 900 }}>{block.title}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              {block.rows.map(([label, value]) => (
                <div key={label} style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 900, fontFamily: 'DM Mono, monospace' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InstallmentTimelinePanel({ installments, nextInst, isMobile }) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  function styleFor(inst) {
    if (inst.estado === 'Pagada' || inst.saldoPendiente <= 0) return { bg: '#f0fdf4', border: '#16a34a', dot: '#16a34a' };
    if (inst.estado === 'Parcial') return { bg: '#fff7ed', border: '#f97316', dot: '#f97316' };
    if (new Date(inst.fechaVencimiento + 'T00:00:00') < now) return { bg: '#fef2f2', border: '#dc2626', dot: '#dc2626' };
    return { bg: '#fff', border: '#e5e7eb', dot: '#cbd5e1' };
  }
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, background: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12 }}><OperationIcon name="calendar" color="#475569" size={18} /> Cronograma</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {installments.slice().sort((a, b) => a.numeroCuota - b.numeroCuota).map(inst => {
          const s = styleFor(inst);
          const isNext = nextInst && inst.id === nextInst.id;
          return (
            <div key={inst.id} style={{ position: 'relative', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr auto auto', gap: isMobile ? 8 : 14, alignItems: 'center', padding: '10px 12px 10px 42px', background: s.bg, border: `1px solid ${isNext ? '#a5b4fc' : s.border}`, borderRadius: 10, boxShadow: isNext ? '0 0 0 2px rgba(99,102,241,0.10)' : 'none' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, borderRadius: '50%', background: inst.estado === 'Pagada' || inst.saldoPendiente <= 0 ? s.dot : '#fff', border: `2px solid ${isNext ? '#4f46e5' : s.dot}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(inst.estado === 'Pagada' || inst.saldoPendiente <= 0) && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--bg-surface)' }} />}
              </span>
              <div>
                <div style={{ fontSize: 13, color: isNext ? '#4f46e5' : '#475569', fontWeight: 900 }}>Cuota {maskSensitiveNumber(inst.numeroCuota)}/{maskSensitiveNumber(inst.totalCuotas)}</div>
                {isNext && <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 800, marginTop: 2 }}>Próxima cuota</div>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>{formatDate(inst.fechaVencimiento)}</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 900, fontFamily: 'DM Mono, monospace', textAlign: isMobile ? 'left' : 'right' }}>{formatCurrency(inst.montoProgramado)}</div>
              <StatusBadge status={inst.estado} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OperacionDetalleScreen({ operationId, data, onNav, onDataChange, auth }) {
  const { clients, operations, installments, payments, paymentAllocations, internalOperationVouchers, creditCards, creditCardMovements } = data;
  const hp = window.hasPermission || (() => true);
  const orgId = auth?.currentOrganization?.id;
  const userId = auth?.user?.id;
  const op = operations.find(o => o.id === operationId);
  const [activeTab, setActiveTab] = React.useState('resumen');
  const [showVoucher, setShowVoucher] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState(false);
  const [viewportWidth, setViewportWidth] = React.useState(() => (window.innerWidth || 1200));

  React.useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth || 1200);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!op) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Operación no encontrada.</div>;

  const client = clients.find(c => c.id === op.clientId);
  const opInst = installments.filter(i => i.operationId === operationId);
  const voucher = internalOperationVouchers.find(v => v.operationId === operationId);
  const ccCard = op.creditCardId ? creditCards.find(c => c.id === op.creditCardId) : null;
  const ccMov = creditCardMovements.find(m => m.operationId === operationId);

  const opPaymentIds = new Set();
  paymentAllocations.forEach(a => { if (opInst.find(i => i.id === a.installmentId)) opPaymentIds.add(a.paymentId); });
  const opPayments = payments.filter(p => opPaymentIds.has(p.id));

  const totalPagado = opInst.reduce((s, i) => s + i.montoPagado, 0);
  const saldoPendiente = opInst.reduce((s, i) => s + i.saldoPendiente, 0);
  const moraGenerada = opInst.reduce((s, i) => s + toBaseAmount(getInstallmentMoraBalance(i).aplicada, i.moneda, i.tipoCambio), 0);
  const moraCobrada = opInst.reduce((s, i) => s + toBaseAmount(getInstallmentMoraBalance(i).pagada, i.moneda, i.tipoCambio), 0);
  const totalCobrableActual = opInst.reduce((s, i) => s + moneyBase(i, 'saldoPendiente') + toBaseAmount(getInstallmentMoraBalance(i).pendiente, i.moneda, i.tipoCambio), 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sortedPendingInst = opInst
    .filter(i => i.saldoPendiente > 0)
    .slice()
    .sort((a, b) => String(a.fechaVencimiento).localeCompare(String(b.fechaVencimiento)));
  const nextInst = sortedPendingInst[0] || null;
  const totalCuotas = opInst.length || op.cantidadCuotas || 0;
  const cuotasPagadas = opInst.filter(i => i.estado === 'Pagada' || i.saldoPendiente <= 0).length;
  const cuotasPendientes = opInst.filter(i => i.saldoPendiente > 0).length;
  const cuotasVencidas = opInst.filter(i => new Date(i.fechaVencimiento + 'T00:00:00') < today && i.saldoPendiente > 0).length;
  const progressPct = op.totalEsperado > 0 ? (totalPagado / op.totalEsperado) * 100 : 0;
  const gananciaObtenida = totalCuotas > 0 ? Math.round((op.gananciaEsperada || 0) * (cuotasPagadas / totalCuotas)) : 0;
  const isMobile = viewportWidth < 720;
  const isTablet = viewportWidth < 1120;
  const summaryGrid = isTablet ? '1fr' : '2fr 1fr';
  const metricGrid = isMobile ? '1fr' : isTablet ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))';
  const detailGrid = viewportWidth < 980 ? '1fr' : '1fr 1fr';

  const editInitial = React.useMemo(() => ({
    clientId: op.clientId,
    tipo: op.tipo,
    descripcion: op.descripcion,
    fechaInicio: op.fechaInicio,
    primerVencimiento: op.primerVencimiento,
    costoReal: String(op.costoReal),
    montoPactado: String(op.montoPactado),
    entrega: String(op.entrega || 0),
    moneda: op.moneda || 'ARS',
    tipoCambio: String(op.tipoCambio || 1),
    tipoCambioFuente: op.tipoCambioFuente || (op.moneda === 'USD' ? 'manual' : 'historico_ars'),
    cantidadCuotas: op.cantidadCuotas,
    tasaInteres: op.tasaInteres,
    tasaManual: true,
    fuenteFinanciacion: op.fuenteFinanciacion,
    creditCardId: op.creditCardId || '',
    fechaCompraTC: ccMov?.fechaCompra || new Date().toISOString().slice(0,10),
    cuotasTarjeta: ccMov?.cuotasTarjeta || 12,
    notas: op.notas || '',
  }), [op, ccMov]);

  async function handleEditSave(newOp, newInsts, newCash, newVoucher, newCCMovs) {
    const sb = window.__supabase;

    if (opPayments.length > 0) {
      // Partial update: only fields that don't affect installments or payment allocations
      const { error } = await sb.from('operations').update({
        tipo:                newOp.tipo,
        descripcion:         newOp.descripcion,
        fuente_financiacion: newOp.fuenteFinanciacion,
        credit_card_id:      newOp.creditCardId || null,
        notas:               newOp.notas || null,
        updated_by:          userId,
      }).eq('id', operationId);
      if (error) { alert('Error al editar operación: ' + error.message); return; }

      // Replace CC movements to match the updated source
      await sb.from('credit_card_movements').delete().eq('operation_id', operationId);
      if (newCCMovs && newCCMovs.length > 0) {
        await sb.from('credit_card_movements').insert({
          organization_id:            orgId,
          created_by:                 userId,
          operation_id:               operationId,
          client_id:                  op.clientId,
          credit_card_id:             newCCMovs[0].creditCardId,
          fecha_compra:               newCCMovs[0].fechaCompra,
          descripcion:                newCCMovs[0].descripcion,
          monto:                      newCCMovs[0].monto,
          moneda:                     newCCMovs[0].moneda || op.moneda || 'ARS',
          tipo_cambio:                newCCMovs[0].tipoCambio || op.tipoCambio || 1,
          tipo_cambio_fuente:         newCCMovs[0].tipoCambioFuente || op.tipoCambioFuente || 'historico_ars',
          monto_base:                 newCCMovs[0].montoBase ?? moneyBase(op, 'costoReal'),
          cuotas_tarjeta:             newCCMovs[0].cuotasTarjeta,
          fecha_cierre_estimada:      newCCMovs[0].fechaCierreEstimada,
          fecha_vencimiento_estimada: newCCMovs[0].fechaVencimientoEstimada,
          estado:                     'Activo',
        });
      }

      const [{ data: updOps }, { data: updCCMovs2 }] = await Promise.all([
        sb.from('operations').select('*').order('fecha_inicio'),
        sb.from('credit_card_movements').select('*').order('fecha_compra'),
      ]);
      onDataChange('operations',          rowsToCamel(updOps));
      onDataChange('creditCardMovements', rowsToCamel(updCCMovs2));
      setShowEdit(false);
      return;
    }

    // Full update (no payments): rebuild installments + movements via RPC
    const opPayload = toSnake({
      organizationId: orgId,
      updatedBy: userId,
      tipo: newOp.tipo, descripcion: newOp.descripcion,
      costoReal: newOp.costoReal, montoPactado: newOp.montoPactado, entrega: newOp.entrega,
      moneda: newOp.moneda || 'ARS', tipoCambio: newOp.tipoCambio || 1, tipoCambioFuente: newOp.tipoCambioFuente || 'historico_ars',
      montoFinanciado: newOp.montoFinanciado, cantidadCuotas: newOp.cantidadCuotas,
      tasaInteres: newOp.tasaInteres, interesCalculado: newOp.interesCalculado,
      totalFinanciado: newOp.totalFinanciado, valorCuota: newOp.valorCuota,
      totalEsperado: newOp.totalEsperado, gananciaEsperada: newOp.gananciaEsperada,
      costoRealBase: newOp.costoRealBase, montoPactadoBase: newOp.montoPactadoBase, entregaBase: newOp.entregaBase,
      montoFinanciadoBase: newOp.montoFinanciadoBase, interesCalculadoBase: newOp.interesCalculadoBase,
      totalFinanciadoBase: newOp.totalFinanciadoBase, valorCuotaBase: newOp.valorCuotaBase,
      totalEsperadoBase: newOp.totalEsperadoBase, gananciaEsperadaBase: newOp.gananciaEsperadaBase,
      fuenteFinanciacion: newOp.fuenteFinanciacion,
      creditCardId: newOp.creditCardId || null,
      fechaInicio: newOp.fechaInicio, primerVencimiento: newOp.primerVencimiento,
      notas: newOp.notas || null,
    });
    const instsPayload = newInsts.map(i => ({
      client_id: i.clientId,
      numero_cuota: i.numeroCuota, total_cuotas: i.totalCuotas,
      fecha_vencimiento: i.fechaVencimiento, monto_programado: i.montoProgramado,
      monto_pagado: i.montoPagado || 0, saldo_pendiente: i.saldoPendiente, mora_aplicada: i.moraAplicada || 0,
      estado: i.estado || 'Pendiente', moneda: i.moneda || newOp.moneda || 'ARS',
      tipo_cambio: i.tipoCambio || newOp.tipoCambio || 1, tipo_cambio_fuente: i.tipoCambioFuente || newOp.tipoCambioFuente || 'historico_ars',
      monto_programado_base: i.montoProgramadoBase, monto_pagado_base: i.montoPagadoBase || 0,
      saldo_pendiente_base: i.saldoPendienteBase, mora_aplicada_base: i.moraAplicadaBase || 0,
    }));
    const cashPayload = {
      tipo: newCash.tipo, monto: newCash.monto, descripcion: newCash.descripcion, fecha: newOp.fechaInicio,
      moneda: newCash.moneda || newOp.moneda || 'ARS',
      tipo_cambio: newCash.tipoCambio || newOp.tipoCambio || 1,
      tipo_cambio_fuente: newCash.tipoCambioFuente || newOp.tipoCambioFuente || 'historico_ars',
      monto_base: newCash.montoBase ?? newCash.monto,
    };
    const ccPayload = newCCMovs && newCCMovs.length > 0 ? {
      credit_card_id: newCCMovs[0].creditCardId,
      fecha_compra: newCCMovs[0].fechaCompra,
      descripcion: newCCMovs[0].descripcion,
      monto: newCCMovs[0].monto,
      moneda: newCCMovs[0].moneda || newOp.moneda || 'ARS',
      tipo_cambio: newCCMovs[0].tipoCambio || newOp.tipoCambio || 1,
      tipo_cambio_fuente: newCCMovs[0].tipoCambioFuente || newOp.tipoCambioFuente || 'historico_ars',
      monto_base: newCCMovs[0].montoBase ?? newCCMovs[0].monto,
      cuotas_tarjeta: newCCMovs[0].cuotasTarjeta,
      fecha_cierre_estimada: newCCMovs[0].fechaCierreEstimada,
      fecha_vencimiento_estimada: newCCMovs[0].fechaVencimientoEstimada,
    } : null;

    const { error } = await sb.rpc('update_operation', {
      p_operation_id:  operationId,
      p_operation:     opPayload,
      p_installments:  instsPayload,
      p_cash_movement: cashPayload,
      p_cc_movement:   ccPayload,
    });
    if (error) { alert('Error al editar operación: ' + error.message); return; }
    const [{ data: updOps }, { data: updInsts }, { data: updCash }, { data: updCCMovs }] = await Promise.all([
      sb.from('operations').select('*').order('fecha_inicio'),
      sb.from('installments').select('*').order('fecha_vencimiento'),
      sb.from('cash_movements').select('*').order('fecha'),
      sb.from('credit_card_movements').select('*').order('fecha_compra'),
    ]);
    onDataChange('operations',          rowsToCamel(updOps));
    onDataChange('installments',        rowsToCamel(updInsts));
    onDataChange('cashMovements',       rowsToCamel(updCash));
    onDataChange('creditCardMovements', rowsToCamel(updCCMovs));
    setShowEdit(false);
  }

  const tabs = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'cuotas', label: 'Cuotas', count: opInst.length },
    { id: 'pagos', label: 'Pagos', count: opPayments.length },
    { id: 'comprobante', label: 'Comprobante interno' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-faint)', fontFamily: 'DM Sans, sans-serif' }}>
        <button onClick={() => onNav('operaciones')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>Operaciones</button>
        <span>›</span><span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{op.codigo}</span>
      </div>

      <OperationHeaderCard
        op={op}
        client={client}
        ccCard={ccCard}
        onNav={onNav}
        isMobile={isMobile}
        onRegisterPayment={() => {
          if (!hp('payments.create')) { alert('No tenés permiso para registrar pagos.'); return; }
          onNav('pagos', null, 'nuevo', op.clientId, op.id);
        }}
        onVoucher={() => { setShowVoucher(true); setActiveTab('comprobante'); }}
        onEdit={() => {
          if (!hp('operations.edit')) { alert('No tenés permiso para editar operaciones.'); return; }
          setShowEdit(true);
        }}
        onDelete={() => {
          if (!hp('operations.delete')) { alert('No tenés permiso para eliminar operaciones.'); return; }
          if (opPayments.length > 0) {
            alert('No se puede eliminar una operación con pagos registrados. Anulá los pagos primero.');
            return;
          }
          setConfirmDelete(true);
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: summaryGrid, gap: 16 }}>
        <OperationFinancialSummaryCard
          op={op}
          totalPagado={totalPagado}
          saldoPendiente={saldoPendiente}
          gananciaObtenida={gananciaObtenida}
          progressPct={progressPct}
          isMobile={isMobile}
        />
        <OperationScheduleStatusCard
          cuotasPagadas={cuotasPagadas}
          cuotasPendientes={cuotasPendientes}
          cuotasVencidas={cuotasVencidas}
          totalCuotas={totalCuotas}
          nextInst={nextInst}
          isMobile={isMobile}
          onViewCuotas={() => setActiveTab('cuotas')}
          onPay={() => onNav('pagos', null, 'nuevo', op.clientId, op.id)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: metricGrid, gap: 14 }}>
        <OperationMetricCard icon="money" label="Costo real" value={formatCurrency(op.costoReal)} color="#475569" bg="#f1f5f9" />
        <OperationMetricCard icon="card" label="Valor cuota" value={formatCurrency(op.valorCuota)} sub={`${maskSensitiveNumber(op.cantidadCuotas)} cuotas`} color="#2563eb" bg="#dbeafe" />
        <OperationMetricCard icon="chart" label="Ganancia obtenida" value={formatCurrency(gananciaObtenida)} color="#059669" bg="#dcfce7" />
        <OperationMetricCard icon="chart" label="Ganancia proyectada" value={formatCurrency(op.gananciaEsperada)} color="#4f46e5" bg="#ede9fe" />
      </div>

      {false && (<>
      {/* Header */}
      <Card style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', fontFamily: 'DM Mono, monospace' }}>{op.codigo}</span>
              <StatusBadge status={op.estado} size="md" />
              <span style={{ fontSize: 12, padding: '2px 8px', background: 'var(--bg-subtle)', borderRadius: 6, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>{op.tipo}</span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>{op.descripcion}</h2>
            <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <button onClick={() => onNav('clientes', op.clientId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, padding: 0 }}>👤 {client?.nombre}</button>
              <span>📅 Inicio: {formatDate(op.fechaInicio)}</span>
              <span>🔢 Primer venc.: {formatDate(op.primerVencimiento)}</span>
              {ccCard && <span>💳 {ccCard.nombre} ···{ccCard.ultimosDigitos}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn size="sm" onClick={() => onNav('pagos', null, 'nuevo', op.clientId, op.id)}>💳 Registrar pago</Btn>
            <Btn size="sm" variant="secondary" onClick={() => { setShowVoucher(true); setActiveTab('comprobante'); }}>📋 Comprobante</Btn>
            <Btn size="sm" variant="secondary">📎 Subir comprobante</Btn>
            <Btn size="sm" variant="secondary" onClick={() => setShowEdit(true)}>✏️ Editar</Btn>
            <Btn size="sm" variant="danger" onClick={() => {
              if (opPayments.length > 0) { alert('No se puede eliminar una operación con pagos registrados. Anulá los pagos primero.'); return; }
              setConfirmDelete(true);
            }}>🗑 Eliminar</Btn>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <KPICard label="Costo Real"    value={formatCurrency(op.costoReal)}         accent="slate"                               icon="💰" />
        <KPICard label="Tot. Esperado" value={formatCurrency(op.totalEsperado)}      accent="blue"                                icon="📊" />
        <KPICard label="Cobrado"       value={formatCurrency(totalPagado)}            accent="green"                               icon="✅" />
        <KPICard label="Saldo P."      value={formatCurrency(saldoPendiente)}         accent={saldoPendiente > 0 ? 'blue' : 'green'} icon="⏳" />
        <KPICard label="Mora generada" value={formatCurrency(moraGenerada)}           accent="amber"                               icon="%" sub={`Cobrada ${formatCurrency(moraCobrada)}`} />
        <KPICard label="Total cobrable" value={formatCurrency(totalCobrableActual)}    accent="purple"                              icon="$" sub="saldo + mora" />
        <KPICard label="Gan. Esp."     value={formatCurrency(op.gananciaEsperada)}    accent="purple"                              icon="📈" />
        <KPICard label="V. Cuota"      value={formatCurrency(op.valorCuota)}          accent="slate" sub={`${op.cantidadCuotas} cuotas · ${op.tasaInteres}%`} icon="📋" />
      </div>

      </>)}

      {/* Tabs */}
      <Card style={{ padding: 0, overflow: 'hidden', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 10px 26px rgba(15,23,42,0.05)' }}>
        <div style={{ padding: '0 16px', overflowX: 'auto' }}><Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} /></div>
        <div style={{ padding: isMobile ? 12 : 16 }}>
          {activeTab === 'resumen' && (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: detailGrid, gap: 16 }}>
              <FinancialDetailsPanel
                op={op}
                totalPagado={totalPagado}
                saldoPendiente={saldoPendiente}
                gananciaObtenida={gananciaObtenida}
              />
              <InstallmentTimelinePanel installments={opInst} nextInst={nextInst} isMobile={isMobile} />
            </div>
            {false && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Detalles financieros</div>
                {[
                  ['Costo real', formatCurrency(op.costoReal)],
                  ['Monto pactado', formatCurrency(op.montoPactado)],
                  ['Entrega inicial', formatCurrency(op.entrega)],
                  ['Monto financiado', formatCurrency(op.montoFinanciado)],
                  ['Tasa de interés', op.tasaInteres + '%'],
                  ['Interés calculado', formatCurrency(op.interesCalculado)],
                  ['Total financiado', formatCurrency(op.totalFinanciado)],
                  ['Valor de cuota', formatCurrency(op.valorCuota)],
                  ['Total esperado', formatCurrency(op.totalEsperado)],
                  ['Ganancia esperada', formatCurrency(op.gananciaEsperada)],
                  ['Fuente', op.fuenteFinanciacion],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>{k}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Cronograma</div>
                {(() => {
                  const now = new Date(); now.setHours(0,0,0,0);
                  function instStyle(inst) {
                    const paid = inst.estado === 'Pagada' || inst.saldoPendiente === 0;
                    if (paid) return { bg: '#f0fdf4', border: '#16a34a', dateColor: '#94a3b8' };
                    const due = new Date(inst.fechaVencimiento + 'T00:00:00');
                    const daysUntil = Math.ceil((due - now) / 86400000);
                    if (daysUntil < 0)  return { bg: '#fee2e2', border: '#dc2626', dateColor: '#dc2626' };
                    if (daysUntil <= 3) return { bg: '#fff7ed', border: '#f97316', dateColor: '#c2410c' };
                    if (due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear())
                      return { bg: '#fefce8', border: '#ca8a04', dateColor: '#854d0e' };
                    return { bg: '#f8fafc', border: '#6366f1', dateColor: '#94a3b8' };
                  }
                  return opInst.sort((a, b) => a.numeroCuota - b.numeroCuota).map(inst => {
                    const s = instStyle(inst);
                    return (
                      <div key={inst.id} style={{
                        padding: '8px 12px', background: s.bg, borderRadius: 6, marginBottom: 4,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderLeft: `3px solid ${s.border}`,
                      }}>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Cuota {maskSensitiveNumber(inst.numeroCuota)}/{maskSensitiveNumber(inst.totalCuotas)}</span>
                          <div style={{ fontSize: 11, color: s.dateColor, fontWeight: s.dateColor !== '#94a3b8' ? 600 : 400 }}>{formatDate(inst.fechaVencimiento)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: 'var(--text-primary)' }}>{formatCurrency(inst.montoProgramado)}</div>
                          <StatusBadge status={inst.estado} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            )}
            </>
          )}

          {activeTab === 'cuotas' && (
            <DataTable
              tableId="op-cuotas"
              defaultSortKey="fechaVencimiento"
              columns={[
                { key: 'codigo', label: 'Código', mono: true },
                { key: 'numeroCuota', label: 'Cuota', render: (v, row) => `${v}/${row.totalCuotas}` },
                { key: 'fechaVencimiento', label: 'Vencimiento', render: v => formatDate(v) },
                { key: 'montoProgramado', label: 'Programado', mono: true, render: v => formatCurrency(v) },
                { key: 'montoPagado', label: 'Pagado', mono: true, render: v => formatCurrency(v) },
                { key: 'saldoPendiente', label: 'Saldo', mono: true, render: v => <span style={{ color: v > 0 ? '#dc2626' : '#16a34a', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</span> },
                { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
              ]}
              data={opInst}
            />
          )}

          {activeTab === 'pagos' && (
            <DataTable
              tableId="op-pagos"
              defaultSortKey="fechaPago" defaultSortDir="desc"
              columns={[
                { key: 'codigo', label: 'Código', mono: true },
                { key: 'fechaPago', label: 'Fecha', render: v => formatDate(v) },
                { key: 'monto', label: 'Monto', mono: true, render: v => <span style={{ fontWeight: 700, color: '#16a34a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</span> },
                { key: 'metodoPago', label: 'Método' },
                { key: 'notas', label: 'Notas' },
                { key: 'id', label: 'Recibo', render: v => {
                  const rec = data.receipts.find(r => r.paymentId === v);
                  return rec ? <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#4f46e5' }}>{rec.codigo}</span> : <span style={{ color: 'var(--text-faint)' }}>—</span>;
                }},
              ]}
              data={opPayments}
              onRowClick={row => {
                const rec = data.receipts.find(r => r.paymentId === row.id);
                if (rec) onNav('recibos', rec.id);
              }}
              emptyMessage="Sin pagos registrados"
            />
          )}

          {activeTab === 'comprobante' && (
            <InternalVoucherPreview op={op} client={client} voucher={voucher} installments={installments} />
          )}
        </div>
      </Card>
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        loading={deleting}
        title="Eliminar operación"
        message={`¿Eliminar la operación ${op.codigo} — "${op.descripcion}"? Se eliminarán las cuotas, el comprobante y el movimiento de caja. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar operación"
        onConfirm={async () => {
          setDeleting(true);
          const sb = window.__supabase;
          const { error } = await sb.rpc('delete_operation', { p_operation_id: operationId });
          setDeleting(false);
          if (error) { alert('Error al eliminar: ' + error.message); return; }
          const [{ data: updOps },{ data: updInsts },{ data: updCash },{ data: updVouch },{ data: updCCMovs }] = await Promise.all([
            sb.from('operations').select('*').order('fecha_inicio'),
            sb.from('installments').select('*').order('fecha_vencimiento'),
            sb.from('cash_movements').select('*').order('fecha'),
            sb.from('internal_operation_vouchers').select('*').order('fecha'),
            sb.from('credit_card_movements').select('*').order('fecha_compra'),
          ]);
          onDataChange('operations',                rowsToCamel(updOps));
          onDataChange('installments',              rowsToCamel(updInsts));
          onDataChange('cashMovements',             rowsToCamel(updCash));
          onDataChange('internalOperationVouchers', rowsToCamel(updVouch));
          onDataChange('creditCardMovements',       rowsToCamel(updCCMovs));
          onNav('operaciones');
        }}
      />
      <NuevaOperacionModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={handleEditSave}
        data={data}
        isEdit={true}
        initialValues={editInitial}
        hasPayments={opPayments.length > 0}
      />
    </div>
  );
}

// Internal Voucher Preview component
function InternalVoucherPreview({ op, client, voucher, installments, settings }) {
  if (!op || !client) return <EmptyState title="Sin comprobante" />;
  const vBranding     = settings?.branding || {};
  const vPrest        = settings?.datosPrestamista || {};
  const vFirmante     = vBranding.appName || vPrest.nombre || 'Prestamista';
  const vTexto        = vPrest.textoComprobantes || 'Uso exclusivo interno. No constituye contrato ni obligación legal.';
  const vLogoUrl      = vBranding.logoUrl || '';
  const vInitials     = vBranding.initials || vFirmante.slice(0, 2).toUpperCase();
  const vAccent       = vBranding.accentColor || '#818cf8';
  const vMostrarLogo  = vBranding.mostrarLogoEnRecibos !== false;
  const vCuit         = vPrest.cuit || '';
  const vMostrarCuit  = !!vBranding.mostrarIdentificacionFiscal;
  const opInst = (installments || []).filter(i => i.operationId === op.id);
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ background: 'var(--bg-page)', border: '1px dashed #cbd5e1', borderRadius: 10, padding: 28, fontFamily: 'DM Sans, sans-serif' }} id="voucher-print">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '2px dashed #e2e8f0' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>COMPROBANTE INTERNO DE OPERACIÓN</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Documento de control administrativo</div>
          <div style={{ marginTop: 8, padding: '6px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, display: 'inline-block', fontSize: 11, color: '#854d0e', fontWeight: 600 }}>
            ⚠️ No constituye contrato ni documento legal
          </div>
        </div>

        {/* Metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            ['N° Comprobante', voucher?.codigo || 'COMP-XXX'],
            ['Fecha', formatDate(voucher?.fecha || op.fechaInicio)],
            ['Cliente', client.nombre],
            ['DNI', client.dni],
            ['Teléfono', client.telefono],
            ['Código operación', op.codigo],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginTop: 2, fontFamily: 'DM Mono, monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Operation details */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)', padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Detalle de la operación</div>
          {[
            ['Tipo', op.tipo],
            ['Descripción', op.descripcion],
            ['Costo real', formatCurrency(op.costoReal)],
            ['Monto pactado', formatCurrency(op.montoPactado)],
            ['Entrega inicial', formatCurrency(op.entrega)],
            ['Monto financiado', formatCurrency(op.montoFinanciado)],
            ['Cantidad de cuotas', op.cantidadCuotas],
            ['Tasa aplicada', op.tasaInteres + '%'],
            ['Total a cobrar', formatCurrency(op.totalEsperado)],
            ['Valor de cuota', formatCurrency(op.valorCuota)],
            ['Fuente de financiación', op.fuenteFinanciacion],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Schedule */}
        {opInst.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Cronograma de vencimientos</div>
            {opInst.sort((a, b) => a.numeroCuota - b.numeroCuota).map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cuota {maskSensitiveNumber(i.numeroCuota)}/{maskSensitiveNumber(i.totalCuotas)}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{formatDate(i.fechaVencimiento)}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(i.montoProgramado)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ paddingTop: 16, borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {vMostrarLogo && (
              vLogoUrl
                ? <img src={vLogoUrl} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0, marginTop: 2 }} alt="" />
                : <div style={{ width: 36, height: 36, borderRadius: 8, background: vAccent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0, marginTop: 2, letterSpacing: '-0.01em' }}>{vInitials}</div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text-faint)', maxWidth: 300 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{vFirmante}</span>
              {vMostrarCuit && vCuit && <><br />CUIT/DNI: {vCuit}</>}
              <br />{vTexto}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ borderTop: '1px solid #374151', paddingTop: 4, fontSize: 10, color: 'var(--text-muted)', width: 140, textAlign: 'center' }}>{vPrest.firma || 'Firma prestamista'}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Btn size="sm" variant="secondary" onClick={() => window.print()}>🖨️ Imprimir</Btn>
        <Btn size="sm" variant="secondary" onClick={() => {
          const el = document.getElementById('voucher-print');
          html2pdf().set({
            margin: 8,
            filename: `comprobante-${op.codigo}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          }).from(el).save();
        }}>⬇️ Descargar PDF</Btn>
      </div>
    </div>
  );
}

Object.assign(window, { OperacionesScreen, OperacionDetalleScreen, InternalVoucherPreview, NuevaOperacionModal });
