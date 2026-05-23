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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
      setStep(1);
      setErrors({});

      if (isEdit && initialValues) {
        isInitialLoad.current = true;
        setForm(
          normalizeMoneyFields({
            ...defaultForm,
            ...initialValues,
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

  React.useEffect(() => {
    if (!form.tasaManual) {
      const found = (cfg?.tasasPorCuotas || []).find(
        t => t.cuotas === Number(form.cantidadCuotas) && t.activa
      );

      if (found) set('tasaInteres', found.tasa);
    }
  }, [form.cantidadCuotas, form.tasaManual]);

  const totals = React.useMemo(() => {
    const c = moneyToNumber(form.costoReal);
    const m = moneyToNumber(form.montoPactado);
    const e = moneyToNumber(form.entrega);
    const cuotas = parseInt(form.cantidadCuotas) || 1;
    const tasa = parseFloat(form.tasaInteres) || 0;

    const baseTotals = calculateOperationTotals(c, m, e, cuotas, tasa);

    if (!form.redondearCuotas) {
      return {
        ...baseTotals,
        ajusteRedondeo: 0,
      };
    }

    const valorCuotaRedondeado = roundUpTo(baseTotals.valorCuota, 1000);
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
      montoFinanciado: totals.montoFinanciado,
      cantidadCuotas: parseInt(form.cantidadCuotas),
      tasaInteres: parseFloat(form.tasaInteres),
      interesCalculado: totals.interesCalculado,
      totalFinanciado: totals.totalFinanciado,
      valorCuota: totals.valorCuota,
      totalEsperado: totals.totalEsperado,
      gananciaEsperada: totals.gananciaEsperada,
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
      estado: 'Pendiente',
    }));

    const newCash = {
      id: 'cash_' + Date.now(),
      tipo:
        form.tipo === 'Préstamo en efectivo'
          ? 'Salida por préstamo'
          : 'Salida por compra de producto',
      monto: -costoReal,
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
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: '#64748b',
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
          {hasPayments && (
            <div
              style={{
                gridColumn: '1/-1',
                background: '#f1f5f9',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: '#64748b',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              🔒 Campos bloqueados — esta operación tiene pagos registrados.
            </div>
          )}

          <Field label="Costo real" required error={errors.costoReal} hint="Lo que vos gastás/entregás">
            <Input
              type="text"
              inputMode="numeric"
              value={form.costoReal}
              onChange={e => setMoney('costoReal', e.target.value)}
              placeholder="200.000"
              disabled={hasPayments}
            />
          </Field>

          <Field label="Monto pactado" required error={errors.montoPactado} hint="Lo que acordaste cobrar">
            <Input
              type="text"
              inputMode="numeric"
              value={form.montoPactado}
              onChange={e => setMoney('montoPactado', e.target.value)}
              placeholder="200.000"
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

          <Field label="Tasa de interés (%)" hint={form.tasaManual ? 'Manual' : 'Auto desde configuración'}>
            <Input
              type="number"
              value={form.tasaInteres}
              onChange={e => set('tasaInteres', e.target.value)}
              disabled={!form.tasaManual || hasPayments}
            />
          </Field>

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

              <div style={{ fontSize: 12, color: '#94a3b8', paddingLeft: 22 }}>
                Ej.: 99.535 → 100.000
              </div>
            </div>
          </Field>

          <div style={{ gridColumn: '1/-1', background: '#f8fafc', borderRadius: 10, padding: 14 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 10,
              }}
            >
              Cálculo automático
            </div>

            <CalcRow label="Monto financiado" value={formatCurrency(totals.montoFinanciado)} />
            <CalcRow label="Interés calculado" value={formatCurrency(totals.interesCalculado)} />
            <CalcRow label="Total financiado" value={formatCurrency(totals.totalFinanciado)} />
            <CalcRow label="Valor de cuota" value={formatCurrency(totals.valorCuota)} bold />
            {form.redondearCuotas && totals.ajusteRedondeo > 0 && (
              <CalcRow label="Ajuste por redondeo" value={formatCurrency(totals.ajusteRedondeo)} />
            )}
            <CalcRow label="Total esperado (con entrega)" value={formatCurrency(totals.totalEsperado)} bold />
            <CalcRow label="Ganancia esperada" value={formatCurrency(totals.gananciaEsperada)} bold accent="#16a34a" />
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
                background: '#f8fafc',
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
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#94a3b8',
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
                ['Costo real', formatCurrency(moneyToNumber(form.costoReal))],
                ['Monto pactado', formatCurrency(moneyToNumber(form.montoPactado))],
                ['Entrega inicial', formatCurrency(moneyToNumber(form.entrega))],
                ['Cuotas', form.cantidadCuotas],
                ['Tasa', form.tasaInteres + '%'],
                ['Cuotas redondeadas', form.redondearCuotas ? 'Sí' : 'No'],
                ['Total a cobrar', formatCurrency(totals.totalEsperado)],
                ['Ganancia esperada', formatCurrency(totals.gananciaEsperada)],
                ['Fuente', form.fuenteFinanciacion],
                ['Primer venc.', formatDate(form.primerVencimiento)],
              ].map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#0f172a',
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
                color: '#94a3b8',
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
                  background: '#f8fafc',
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
                      color: '#374151',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Cuota {maskSensitiveNumber(s.numero)}/{maskSensitiveNumber(form.cantidadCuotas)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {formatDate(s.fecha)}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0f172a',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {formatCurrency(s.monto)}
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
              color: '#0f172a',
              marginBottom: 8,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Listo para confirmar
          </div>

          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
            {isEdit
              ? `Se van a actualizar los datos de la operación: ${maskSensitiveNumber(form.cantidadCuotas)} cuota(s) recalculadas, movimientos de caja y tarjeta actualizados.`
              : `Se va a crear la operación con ${maskSensitiveNumber(form.cantidadCuotas)} cuota(s), un comprobante interno y el movimiento de caja correspondiente.`}
          </div>

          <div
            style={{
              background: '#f8fafc',
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
            <CalcRow label="Total a cobrar" value={formatCurrency(totals.totalEsperado)} bold />
            <CalcRow label="Cuotas" value={`${maskSensitiveNumber(form.cantidadCuotas)} x ${formatCurrency(totals.valorCuota)}`} />
            <CalcRow label="Ganancia esperada" value={formatCurrency(totals.gananciaEsperada)} bold accent="#16a34a" />
          </div>
        </div>
      )}
    </Modal>
  );
}

function OperacionesScreen({ data, onNav, onDataChange, openNewModal, preselectedClientId }) {
  const { clients, operations, installments, creditCards } = data;
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
      clientId:          newOp.clientId,
      tipo:              newOp.tipo,
      descripcion:       newOp.descripcion,
      costoReal:         newOp.costoReal,
      montoPactado:      newOp.montoPactado,
      entrega:           newOp.entrega,
      montoFinanciado:   newOp.montoFinanciado,
      cantidadCuotas:    newOp.cantidadCuotas,
      tasaInteres:       newOp.tasaInteres,
      interesCalculado:  newOp.interesCalculado,
      totalFinanciado:   newOp.totalFinanciado,
      valorCuota:        newOp.valorCuota,
      totalEsperado:     newOp.totalEsperado,
      gananciaEsperada:  newOp.gananciaEsperada,
      fuenteFinanciacion: newOp.fuenteFinanciacion,
      creditCardId:      newOp.creditCardId || null,
      fechaInicio:       newOp.fechaInicio,
      primerVencimiento: newOp.primerVencimiento,
      estado:            'Activa',
      notas:             newOp.notas || null,
    });
    const instsPayload = newInsts.map((i, idx) => ({
      codigo:            installmentCodes[idx],
      numero_cuota:      i.numeroCuota,
      total_cuotas:      i.totalCuotas,
      fecha_vencimiento: i.fechaVencimiento,
      monto_programado:  i.montoProgramado,
    }));
    const cashPayload = {
      tipo: newCash.tipo,
      monto: newCash.monto,
      descripcion: `${operationCode} — ${newOp.descripcion}`,
      fecha: newCash.fecha || newOp.fechaInicio,
    };
    const voucherPayload = { codigo: voucherCode, fecha: newVoucher.fecha || newOp.fechaInicio };
    const ccPayload = newCCMovs.length > 0 ? {
      credit_card_id:              newCCMovs[0].creditCardId,
      fecha_compra:                newCCMovs[0].fechaCompra,
      descripcion:                 newCCMovs[0].descripcion,
      monto:                       newCCMovs[0].monto,
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
      return <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{c?.nombre || '—'}</span>;
    }},
    { key: 'tipo', label: 'Tipo', render: v => <span style={{ fontSize: 11, padding: '2px 8px', background: '#f1f5f9', borderRadius: 6, color: '#475569', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>{v}</span> },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'cantidadCuotas', label: 'Cuotas', render: (v, row) => `${maskSensitiveNumber(v)} x ${formatCurrency(row.valorCuota)}` },
    { key: 'tasaInteres', label: 'Tasa', render: v => maskSensitiveNumber(v, '%') },
    { key: 'totalEsperado', label: 'Total', mono: true, render: v => <span style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#0f172a' }}>{formatCurrency(v)}</span> },
    { key: 'gananciaEsperada', label: 'Ganancia', mono: true, render: v => <span style={{ fontWeight: 600, fontFamily: 'DM Mono, monospace', color: '#16a34a' }}>{formatCurrency(v)}</span> },
    { key: 'fuenteFinanciacion', label: 'Fuente', render: v => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span> },
    { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
    { key: '_acc', label: '', sortable: false, render: (_, row) => (
      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        <Btn size="sm" variant="ghost" onClick={() => onNav('operaciones', row.id)}>Ver</Btn>
        <Btn size="sm" variant="ghost" onClick={() => onNav('pagos', null, 'nuevo', null, row.id)}>💳</Btn>
      </div>
    )},
  ];

  return (
    <div>
      <SectionHeader title="Operaciones" actions={
        <Btn onClick={() => { setPendingClientId(null); setShowNew(true); }}>+ Nueva operación</Btn>
      } />
      {success && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
          ✅ Operación creada con éxito. Cuotas, comprobante y movimiento de caja generados.
        </div>
      )}
      <Card>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={filters.cliente || ''} onChange={e => setFilters(f => ({ ...f, cliente: e.target.value }))} placeholder="🔍 Filtrar por cliente..." style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif', minWidth: 180 }} />
          <select value={filters.estado || ''} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todos los estados</option>
            {['Activa','Completada','Anulada','Refinanciada'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filters.tipo || ''} onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todos los tipos</option>
            {['Préstamo en efectivo','Venta financiada','Compra con tarjeta','Otro'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filters.fuente || ''} onChange={e => setFilters(f => ({ ...f, fuente: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todas las fuentes</option>
            {['Efectivo','Transferencia','Tarjeta de crédito','Mixta'].map(s => <option key={s}>{s}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center', fontFamily: 'DM Sans, sans-serif' }}>{filtered.length} operacion{filtered.length !== 1 ? 'es' : ''}</span>
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
function OperacionDetalleScreen({ operationId, data, onNav, onDataChange }) {
  const { clients, operations, installments, payments, paymentAllocations, internalOperationVouchers, creditCards, creditCardMovements } = data;
  const op = operations.find(o => o.id === operationId);
  const [activeTab, setActiveTab] = React.useState('resumen');
  const [showVoucher, setShowVoucher] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState(false);

  if (!op) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Operación no encontrada.</div>;

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

  const editInitial = React.useMemo(() => ({
    clientId: op.clientId,
    tipo: op.tipo,
    descripcion: op.descripcion,
    fechaInicio: op.fechaInicio,
    primerVencimiento: op.primerVencimiento,
    costoReal: String(op.costoReal),
    montoPactado: String(op.montoPactado),
    entrega: String(op.entrega || 0),
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
      }).eq('id', operationId);
      if (error) { alert('Error al editar operación: ' + error.message); return; }

      // Replace CC movements to match the updated source
      await sb.from('credit_card_movements').delete().eq('operation_id', operationId);
      if (newCCMovs && newCCMovs.length > 0) {
        await sb.from('credit_card_movements').insert({
          operation_id:               operationId,
          client_id:                  op.clientId,
          credit_card_id:             newCCMovs[0].creditCardId,
          fecha_compra:               newCCMovs[0].fechaCompra,
          descripcion:                newCCMovs[0].descripcion,
          monto:                      newCCMovs[0].monto,
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
      tipo: newOp.tipo, descripcion: newOp.descripcion,
      costoReal: newOp.costoReal, montoPactado: newOp.montoPactado, entrega: newOp.entrega,
      montoFinanciado: newOp.montoFinanciado, cantidadCuotas: newOp.cantidadCuotas,
      tasaInteres: newOp.tasaInteres, interesCalculado: newOp.interesCalculado,
      totalFinanciado: newOp.totalFinanciado, valorCuota: newOp.valorCuota,
      totalEsperado: newOp.totalEsperado, gananciaEsperada: newOp.gananciaEsperada,
      fuenteFinanciacion: newOp.fuenteFinanciacion,
      creditCardId: newOp.creditCardId || null,
      fechaInicio: newOp.fechaInicio, primerVencimiento: newOp.primerVencimiento,
      notas: newOp.notas || null,
    });
    const instsPayload = newInsts.map(i => ({
      numero_cuota: i.numeroCuota, total_cuotas: i.totalCuotas,
      fecha_vencimiento: i.fechaVencimiento, monto_programado: i.montoProgramado,
    }));
    const cashPayload = { tipo: newCash.tipo, monto: newCash.monto, descripcion: newCash.descripcion, fecha: newOp.fechaInicio };
    const ccPayload = newCCMovs && newCCMovs.length > 0 ? {
      credit_card_id: newCCMovs[0].creditCardId,
      fecha_compra: newCCMovs[0].fechaCompra,
      descripcion: newCCMovs[0].descripcion,
      monto: newCCMovs[0].monto,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', fontFamily: 'DM Sans, sans-serif' }}>
        <button onClick={() => onNav('operaciones')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>Operaciones</button>
        <span>›</span><span style={{ color: '#374151', fontWeight: 600 }}>{op.codigo}</span>
      </div>

      {/* Header */}
      <Card style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', fontFamily: 'DM Mono, monospace' }}>{op.codigo}</span>
              <StatusBadge status={op.estado} size="md" />
              <span style={{ fontSize: 12, padding: '2px 8px', background: '#f1f5f9', borderRadius: 6, color: '#475569', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>{op.tipo}</span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Sans, sans-serif' }}>{op.descripcion}</h2>
            <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
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
        <KPICard label="Gan. Esp."     value={formatCurrency(op.gananciaEsperada)}    accent="purple"                              icon="📈" />
        <KPICard label="V. Cuota"      value={formatCurrency(op.valorCuota)}          accent="slate" sub={`${op.cantidadCuotas} cuotas · ${op.tasaInteres}%`} icon="📋" />
      </div>

      {/* Tabs */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0 16px' }}><Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} /></div>
        <div style={{ padding: 16 }}>
          {activeTab === 'resumen' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Detalles financieros</div>
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
                    <span style={{ color: '#64748b', fontFamily: 'DM Sans, sans-serif' }}>{k}</span>
                    <span style={{ color: '#0f172a', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Cronograma</div>
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
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Cuota {maskSensitiveNumber(inst.numeroCuota)}/{maskSensitiveNumber(inst.totalCuotas)}</span>
                          <div style={{ fontSize: 11, color: s.dateColor, fontWeight: s.dateColor !== '#94a3b8' ? 600 : 400 }}>{formatDate(inst.fechaVencimiento)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#0f172a' }}>{formatCurrency(inst.montoProgramado)}</div>
                          <StatusBadge status={inst.estado} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
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
                  return rec ? <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#4f46e5' }}>{rec.codigo}</span> : <span style={{ color: '#94a3b8' }}>—</span>;
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
function InternalVoucherPreview({ op, client, voucher, installments }) {
  if (!op || !client) return <EmptyState title="Sin comprobante" />;
  const opInst = (installments || []).filter(i => i.operationId === op.id);
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10, padding: 28, fontFamily: 'DM Sans, sans-serif' }} id="voucher-print">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '2px dashed #e2e8f0' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>COMPROBANTE INTERNO DE OPERACIÓN</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Documento de control administrativo</div>
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
            <div key={k} style={{ padding: '6px 10px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
              <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, marginTop: 2, fontFamily: 'DM Mono, monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Operation details */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Detalle de la operación</div>
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
              <span style={{ color: '#64748b' }}>{k}</span>
              <span style={{ color: '#0f172a', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Schedule */}
        {opInst.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Cronograma de vencimientos</div>
            {opInst.sort((a, b) => a.numeroCuota - b.numeroCuota).map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: 12, borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#374151' }}>Cuota {maskSensitiveNumber(i.numeroCuota)}/{maskSensitiveNumber(i.totalCuotas)}</span>
                <span style={{ color: '#374151' }}>{formatDate(i.fechaVencimiento)}</span>
                <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(i.montoProgramado)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ paddingTop: 16, borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', maxWidth: 300 }}>
            Brian Facciano<br />
            Uso exclusivo interno. No constituye contrato ni obligación legal.
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ borderTop: '1px solid #374151', paddingTop: 4, fontSize: 10, color: '#64748b', width: 140, textAlign: 'center' }}>Firma prestamista</div>
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
