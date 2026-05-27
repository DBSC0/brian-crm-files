// Caja Screen
function CajaScreen({ data, onNav, onDataChange, auth }) {
  const hp = window.hasPermission || (() => true);
  const { cashMovements, clients, operations, creditCards } = data;
  const [showNew, setShowNew] = React.useState(false);
  const [newMov, setNewMov] = React.useState({ tipo: 'Ajuste manual', monto: '', moneda: 'ARS', tipoCambio: '1', tipoCambioFuente: 'historico_ars', descripcion: '', fecha: new Date().toISOString().slice(0,10) });
  const setNM = (k, v) => setNewMov(m => ({ ...m, [k]: v }));
  const [filters, setFilters] = React.useState({});

  const entradas = cashMovements.filter(m => moneyBase(m, 'monto') > 0).reduce((s, m) => s + moneyBase(m, 'monto'), 0);
  const salidas = cashMovements.filter(m => moneyBase(m, 'monto') < 0).reduce((s, m) => s + Math.abs(moneyBase(m, 'monto')), 0);
  const saldo = entradas - salidas;
  const cajaARS = cashMovements.filter(m => normalizeCurrency(m.moneda) === 'ARS').reduce((s, m) => s + Number(m.monto || 0), 0);
  const cajaUSD = cashMovements.filter(m => normalizeCurrency(m.moneda) === 'USD').reduce((s, m) => s + Number(m.monto || 0), 0);
  const capitalEnLaCalle = data.installments.reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
  const gananciaCobrada = entradas - data.operations.reduce((s, o) => s + moneyBase(o, 'costoReal'), 0);
  const compromisoTarjetas = data.creditCardMovements.reduce((s, m) => s + moneyBase(m, 'monto'), 0);

  const filtered = [...cashMovements].filter(m => {
    if (filters.tipo && m.tipo !== filters.tipo) return false;
    return true;
  });

  const tipos = ['Salida por préstamo','Salida por compra de producto','Entrada por pago','Entrada por anticipo','Salida por pago de tarjeta','Gasto','Ajuste manual'];

  async function saveMov() {
    const monto = newMov.tipo.startsWith('Salida') || newMov.tipo === 'Gasto'
      ? -Math.abs(parseFloat(newMov.monto) || 0)
      :  Math.abs(parseFloat(newMov.monto) || 0);
    const moneda = normalizeCurrency(newMov.moneda);
    const tipoCambio = normalizeExchangeRate(newMov.tipoCambio);
    const sb = window.__supabase;
    if (!hp('cash.create_manual_movement')) { alert('No tenés permiso para crear movimientos manuales.'); return; }
    const orgId = auth?.currentOrganization?.id;
    const userId = auth?.user?.id;
    const { data: inserted, error } = await sb.from('cash_movements')
      .insert({ organization_id: orgId, created_by: userId || undefined, tipo: newMov.tipo, monto, moneda, tipo_cambio: tipoCambio, tipo_cambio_fuente: newMov.tipoCambioFuente || (moneda === 'ARS' ? 'historico_ars' : 'manual'), monto_base: toBaseAmount(monto, moneda, tipoCambio), client_id: null, operation_id: null, payment_id: null, credit_card_id: null, descripcion: newMov.descripcion, fecha: newMov.fecha })
      .select().single();
    if (error) { alert('Error al guardar movimiento: ' + error.message); return; }
    onDataChange('cashMovements', [...cashMovements, toCamel(inserted)]);
    setShowNew(false);
    setNewMov({ tipo: 'Ajuste manual', monto: '', moneda: 'ARS', tipoCambio: '1', tipoCambioFuente: 'historico_ars', descripcion: '', fecha: new Date().toISOString().slice(0,10) });
  }

  const tipoColors = {
    'Entrada por pago': '#16a34a',
    'Entrada por anticipo': '#16a34a',
    'Salida por préstamo': '#dc2626',
    'Salida por compra de producto': '#dc2626',
    'Salida por pago de tarjeta': '#7c3aed',
    'Gasto': '#d97706',
    'Ajuste manual': '#64748b',
  };

  return (
    <div>
      <SectionHeader title="Caja" actions={hp('cash.create_manual_movement') && <Btn onClick={() => setShowNew(true)}>+ Movimiento manual</Btn>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPICard label="Caja ARS"            value={formatMoney(cajaARS, 'ARS')}                 accent={cajaARS >= 0 ? 'green' : 'red'} icon="📥" />
        <KPICard label="Caja USD"            value={formatMoney(cajaUSD, 'USD')}                 accent={cajaUSD >= 0 ? 'green' : 'red'} icon="📤" />
        <KPICard label="Equiv. total ARS"    value={formatCurrency(saldo)}                       accent={saldo >= 0 ? 'green' : 'red'} icon="⚖️" />
        <KPICard label="Capital en la calle" value={formatCurrency(capitalEnLaCalle)}             accent="blue"  sub="saldo pendiente total"    icon="⏳" />
        <KPICard label="Ganancia cobrada"    value={formatCurrency(Math.max(0, gananciaCobrada))} accent="purple"                      icon="💹" />
        <KPICard label="Compromiso tarjetas" value={formatCurrency(compromisoTarjetas)}           accent="amber" sub="total financiado en TC"   icon="💳" />
      </div>
      <Card>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={filters.tipo || ''} onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todos los tipos</option>
            {tipos.map(t => <option key={t}>{t}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-faint)', alignSelf: 'center', fontFamily: 'DM Sans, sans-serif' }}>{filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <DataTable
          columns={[
            { key: 'fecha', label: 'Fecha', render: v => formatDate(v), nowrap: true },
            { key: 'tipo', label: 'Tipo', render: v => (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-subtle)', color: tipoColors[v] || '#374151', fontFamily: 'DM Sans, sans-serif' }}>{v}</span>
            )},
            { key: 'descripcion', label: 'Descripción' },
            { key: 'clientId', label: 'Cliente', render: v => v ? clients.find(c => c.id === v)?.nombre || '—' : '—' },
            { key: 'creditCardId', label: 'Tarjeta', render: v => v ? creditCards.find(c => c.id === v)?.nombre || '—' : '—' },
            { key: 'monto', label: 'Monto', mono: true, render: (v, row) => (
              <span style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace', color: v > 0 ? '#16a34a' : '#dc2626' }}>
                {v > 0 ? '+' : ''}{formatMoneyWithEquivalent(v, row.moneda, row.tipoCambio, { compact: true })}
              </span>
            )},
          ]}
          data={filtered}
          emptyMessage="Sin movimientos de caja"
          defaultSortKey="fecha"
          defaultSortDir="desc"
          tableId="caja"
        />
      </Card>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nuevo movimiento manual" size="sm"
        footer={<><Btn variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Btn><Btn onClick={saveMov}>Guardar</Btn></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Tipo"><Select value={newMov.tipo} onChange={e => setNM('tipo', e.target.value)}>{tipos.map(t => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Moneda"><Select value={newMov.moneda} onChange={e => setNM('moneda', e.target.value)}><option value="ARS">ARS</option><option value="USD">USD</option></Select></Field>
          {newMov.moneda === 'USD' && <Field label="Cotización"><Input type="number" step="0.01" value={newMov.tipoCambio} onChange={e => setNM('tipoCambio', e.target.value)} /></Field>}
          <Field label="Monto"><Input type="number" value={newMov.monto} onChange={e => setNM('monto', e.target.value)} placeholder="0" /></Field>
          <Field label="Fecha"><Input type="date" value={newMov.fecha} onChange={e => setNM('fecha', e.target.value)} /></Field>
          <Field label="Descripción"><Input value={newMov.descripcion} onChange={e => setNM('descripcion', e.target.value)} placeholder="Descripción del movimiento..." /></Field>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// MORA SCREEN
// ============================================================
function MoraScreen({ data, onNav }) {
  const { clients, operations, installments, clientNotes, settings } = data;
  const today = new Date();
  const [filters, setFilters] = React.useState({});

  const moraTemplate = React.useMemo(() => {
    const templates = settings?.plantillasWhatsapp || [];
    return templates.find(t =>
      (t.nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes('mora')
    ) || null;
  }, [settings]);

  function fillMoraTemplate(client, row) {
    const op = operations.find(o => o.id === row.operationId);
    const tpl = moraTemplate?.texto ||
      'Hola {cliente}, te escribo por la cuota vencida del día {fecha}. El saldo pendiente es de {monto}. ¿Podemos coordinar el pago?';
    const vars = {
      cliente: client?.nombre || '',
      cliente_informal: (client?.nombre || '').split(' ')[0],
      fecha: formatDate(row.fechaVencimiento),
      monto: formatCurrencyRaw(row.saldoPendiente),
      cuota: row.numeroCuota ? String(row.numeroCuota) : (row.codigo || ''),
      operacion: op?.codigo || '',
      saldo: formatCurrencyRaw(row.saldoPendiente),
    };
    return Object.entries(vars).reduce((msg, [k, v]) => msg.replaceAll(`{${k}}`, v), tpl);
  }

  const overdueInst = installments.filter(i => new Date(i.fechaVencimiento) < today && i.saldoPendiente > 0);

  const filtered = overdueInst.filter(i => {
    const days = calculateOverdueDays(i.fechaVencimiento);
    if (filters.rango) {
      if (filters.rango === '1-7' && !(days >= 1 && days <= 7)) return false;
      if (filters.rango === '8-15' && !(days >= 8 && days <= 15)) return false;
      if (filters.rango === '16-30' && !(days >= 16 && days <= 30)) return false;
      if (filters.rango === '30+' && days <= 30) return false;
    }
    if (filters.cliente) {
      const c = clients.find(cl => cl.id === i.clientId);
      if (!c?.nombre.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
    }
    return true;
  });

  const totalVencido = overdueInst.reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
  const clientesEnMora = new Set(overdueInst.map(i => i.clientId)).size;
  const avgDias = overdueInst.length > 0 ? Math.round(overdueInst.reduce((s, i) => s + calculateOverdueDays(i.fechaVencimiento), 0) / overdueInst.length) : 0;

  return (
    <div>
      <SectionHeader title="Mora" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPICard label="Total vencido"     value={formatCurrency(totalVencido)} accent="red"   icon="⚠️" />
        <KPICard label="Clientes en mora"  value={clientesEnMora}               accent="red"   icon="🔴" sub="clientes" />
        <KPICard label="Cuotas vencidas"   value={overdueInst.length}           accent="amber" icon="📋" sub="cuotas" />
        <KPICard label="Prom. días atraso" value={avgDias + 'd'}                accent="amber" icon="📅" />
      </div>
      <Card>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={filters.cliente || ''} onChange={e => setFilters(f => ({ ...f, cliente: e.target.value }))} placeholder="🔍 Filtrar por cliente..." style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', minWidth: 160 }} />
          <select value={filters.rango || ''} onChange={e => setFilters(f => ({ ...f, rango: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todos los rangos</option>
            <option value="1-7">1 a 7 días</option>
            <option value="8-15">8 a 15 días</option>
            <option value="16-30">16 a 30 días</option>
            <option value="30+">Más de 30 días</option>
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-faint)', alignSelf: 'center' }}>{maskSensitiveNumber(filtered.length)} cuota{filtered.length !== 1 ? 's' : ''} vencida{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <DataTable
          columns={[
            { key: 'clientId', label: 'Cliente', render: v => {
              const c = clients.find(cl => cl.id === v);
              return <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c?.nombre || '—'}</span>;
            }},
            { key: 'operationId', label: 'Operación', render: v => {
              const op = operations.find(o => o.id === v);
              return <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#4f46e5' }}>{op?.codigo}</span>;
            }},
            { key: 'codigo', label: 'Cuota', mono: true },
            { key: 'numeroCuota', label: 'N°', render: (v, row) => `${v}/${row.totalCuotas}` },
            { key: 'fechaVencimiento', label: 'Venció', render: v => formatDate(v) },
            { key: '_dias', label: 'Atraso', sortValue: row => calculateOverdueDays(row.fechaVencimiento), render: (_, row) => {
              const d = calculateOverdueDays(row.fechaVencimiento);
              return <span style={{ fontWeight: 700, color: d > 30 ? '#7f1d1d' : d > 15 ? '#dc2626' : '#d97706', fontFamily: 'DM Mono, monospace' }}>{d}d</span>;
            }},
            { key: 'montoProgramado', label: 'Original', mono: true, render: (v, row) => formatMoney(v, row.moneda) },
            { key: 'montoPagado', label: 'Pagado', mono: true, render: (v, row) => formatMoney(v, row.moneda) },
            { key: 'saldoPendiente', label: 'Saldo vencido', mono: true, render: (v, row) => <span style={{ fontWeight: 700, color: '#dc2626', fontFamily: 'DM Mono, monospace' }}>{formatMoneyWithEquivalent(v, row.moneda, row.tipoCambio, { compact: true })}</span> },
            { key: '_ult', label: 'Últ. contacto', sortable: false, render: (_, row) => {
              const note = (clientNotes || []).filter(n => n.clientId === row.clientId).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
              return note ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(note.fecha)}</span> : <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Sin contacto</span>;
            }},
            { key: '_acc', label: '', sortable: false, render: (_, row) => {
              const c = clients.find(cl => cl.id === row.clientId);
              return (
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <WAButton phone={c?.telefono || ''} message={fillMoraTemplate(c, row)} />
                  <Btn size="sm" variant="ghost" onClick={() => onNav('pagos', null, 'nuevo', row.clientId)}>💳</Btn>
                </div>
              );
            }},
          ]}
          data={filtered}
          emptyMessage="No hay cuotas vencidas 🎉"
          defaultSortKey="_dias"
          defaultSortDir="desc"
          tableId="mora"
        />
      </Card>
    </div>
  );
}

function MoraScreenV2({ data, onNav, onDataChange, auth }) {
  const hp = window.hasPermission || (() => true);
  const sb = window.__supabase;
  const orgId = auth?.currentOrganization?.id;
  const userId = auth?.user?.id;
  const { clients, operations, installments, settings, installmentMoraEvents = [], payments = [], paymentAllocations = [] } = data;
  const [tab, setTab] = React.useState('cuotas');
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const [quickCfg, setQuickCfg] = React.useState(() => normalizeMoraSettings(settings));
  const autoAppliedRef = React.useRef(false);

  React.useEffect(() => setQuickCfg(normalizeMoraSettings(settings)), [settings]);

  const moraCfg = React.useMemo(() => normalizeMoraSettings(settings), [settings]);
  const today = new Date().toISOString().slice(0, 10);
  const clientById = React.useMemo(() => Object.fromEntries((clients || []).map(c => [c.id, c])), [clients]);
  const opById = React.useMemo(() => Object.fromEntries((operations || []).map(o => [o.id, o])), [operations]);

  const rows = React.useMemo(() => {
    return (installments || [])
      .map(inst => {
        const client = clientById[inst.clientId];
        const op = opById[inst.operationId];
        const pending = calculatePendingMoraUpdate(inst, settings, today);
        const bal = getInstallmentMoraBalance(inst);
        const total = calculateTotalCollectable(inst);
        const days = calculateOverdueDays(inst.fechaVencimiento);
        return { inst, client, op, pending, bal, total, days };
      })
      .filter(r => r.days > 0 && (Number(r.inst.saldoPendiente || 0) > 0 || r.bal.pendiente > 0))
      .filter(r => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (r.client?.nombre || '').toLowerCase().includes(q)
          || (r.op?.codigo || '').toLowerCase().includes(q)
          || (r.inst.codigo || '').toLowerCase().includes(q);
      })
      .sort((a, b) => b.days - a.days);
  }, [installments, settings, today, clientById, opById, query]);

  const pendingRows = rows.filter(r => r.pending.amount > 0);
  const selected = rows.find(r => r.inst.id === selectedId) || rows[0] || null;

  const totalVencidoSinMora = rows.reduce((s, r) => s + moneyBase(r.inst, 'saldoPendiente'), 0);
  const moraPendiente = pendingRows.reduce((s, r) => s + toBaseAmount(r.pending.amount, r.inst.moneda, r.inst.tipoCambio), 0);
  const moraAplicada = rows.reduce((s, r) => s + toBaseAmount(r.bal.aplicada, r.inst.moneda, r.inst.tipoCambio), 0);
  const moraCobradaMes = paymentAllocations
    .filter(a => {
      const p = payments.find(pay => pay.id === a.paymentId);
      return p && String(p.fechaPago || '').slice(0, 7) === today.slice(0, 7);
    })
    .reduce((s, a) => s + Number(a.montoMoraAplicadoBase || toBaseAmount(a.montoMoraAplicado || 0, a.installmentMoneda, a.tipoCambioInstallment)), 0);
  const clientesEnMora = new Set(rows.map(r => r.inst.clientId)).size;
  const avgDias = rows.length ? Math.round(rows.reduce((s, r) => s + r.days, 0) / rows.length) : 0;

  const clientRows = React.useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      const id = r.inst.clientId;
      if (!map.has(id)) map.set(id, { client: r.client, cuotas: 0, vencido: 0, mora: 0, pendiente: 0, total: 0, maxDays: 0 });
      const item = map.get(id);
      item.cuotas += 1;
      item.vencido += moneyBase(r.inst, 'saldoPendiente');
      item.mora += toBaseAmount(r.bal.pendiente, r.inst.moneda, r.inst.tipoCambio);
      item.pendiente += toBaseAmount(r.pending.amount, r.inst.moneda, r.inst.tipoCambio);
      item.total += moneyBase(r.inst, 'saldoPendiente') + toBaseAmount(r.bal.pendiente + r.pending.amount, r.inst.moneda, r.inst.tipoCambio);
      item.maxDays = Math.max(item.maxDays, r.days);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  async function refreshMoraData() {
    if (!orgId) return;
    const [{ data: updInst }, { data: updEvents }] = await Promise.all([
      sb.from('installments').select('*').eq('organization_id', orgId).order('fecha_vencimiento'),
      sb.from('installment_mora_events').select('*').eq('organization_id', orgId).order('fecha', { ascending: false }).limit(500),
    ]);
    if (updInst) onDataChange?.('installments', rowsToCamel(updInst));
    if (updEvents) onDataChange?.('installmentMoraEvents', rowsToCamel(updEvents));
  }

  async function applyMora(row, tipo = 'manual') {
    if (!row || !orgId) return;
    if (!hp('mora.aplicar')) { alert('No tenes permiso para aplicar mora.'); return; }
    setBusy(true);
    const { error } = await sb.rpc('apply_installment_mora', {
      p_organization_id: orgId,
      p_installment_id: row.inst.id,
      p_today: today,
      p_notas: tipo === 'auto' ? 'Aplicacion automatica desde Mora' : 'Aplicacion manual desde Mora',
      p_tipo_evento: tipo,
    });
    setBusy(false);
    if (error) { alert('Error al aplicar mora: ' + error.message); return; }
    setNotice('Mora aplicada correctamente.');
    await refreshMoraData();
  }

  async function applyBulk(tipo = 'auto') {
    if (!pendingRows.length || !orgId) return;
    if (!hp('mora.aplicar')) { alert('No tenes permiso para aplicar mora.'); return; }
    setBusy(true);
    const { data: res, error } = await sb.rpc('apply_bulk_mora', {
      p_organization_id: orgId,
      p_items: pendingRows.map(r => ({ installment_id: r.inst.id, notas: 'Actualizacion masiva desde Mora', tipo_evento: tipo })),
      p_today: today,
    });
    setBusy(false);
    if (error) { alert('Error al aplicar mora: ' + error.message); return; }
    setNotice(`Actualizacion aplicada: ${res?.cuotas_actualizadas || pendingRows.length} cuotas.`);
    await refreshMoraData();
  }

  async function condone(row) {
    if (!row || !orgId) return;
    if (!hp('mora.condonar')) { alert('No tenes permiso para condonar mora.'); return; }
    const max = row.bal.pendiente;
    if (max <= 0) { alert('Esta cuota no tiene mora pendiente para condonar.'); return; }
    const raw = prompt(`Monto a condonar. Maximo: ${formatMoney(max, row.inst.moneda)}`, String(Math.round(max)));
    if (raw == null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusy(true);
    const { error } = await sb.rpc('condone_installment_mora', {
      p_organization_id: orgId,
      p_installment_id: row.inst.id,
      p_monto: amount,
      p_notas: 'Condonacion desde pantalla Mora',
    });
    setBusy(false);
    if (error) { alert('Error al condonar mora: ' + error.message); return; }
    await refreshMoraData();
  }

  async function setFrozen(row, frozen) {
    if (!row || !orgId) return;
    if (!hp('mora.congelar')) { alert('No tenes permiso para congelar mora.'); return; }
    setBusy(true);
    const { error } = await sb.rpc('set_installment_mora_frozen', {
      p_organization_id: orgId,
      p_installment_id: row.inst.id,
      p_frozen: frozen,
      p_notas: frozen ? 'Congelada desde Mora' : 'Descongelada desde Mora',
    });
    setBusy(false);
    if (error) { alert('Error al actualizar mora: ' + error.message); return; }
    await refreshMoraData();
  }

  async function saveQuickConfig() {
    if (!orgId) return;
    if (!hp('mora.configurar')) { alert('No tenes permiso para configurar mora.'); return; }
    const nextSettings = {
      ...settings,
      parametrosFinancieros: {
        ...(settings.parametrosFinancieros || {}),
        mora: normalizeMoraSettings({ parametrosFinancieros: { mora: quickCfg } }),
      },
    };
    const payload = toSnake({
      organizationId: orgId,
      tasasPorCuotas: nextSettings.tasasPorCuotas || [],
      metodosPago: nextSettings.metodosPago || [],
      estadosCliente: nextSettings.estadosCliente || [],
      estadosOperacion: nextSettings.estadosOperacion || [],
      estadosCuota: nextSettings.estadosCuota || [],
      estadosTarjeta: nextSettings.estadosTarjeta || [],
      tiposOperacion: nextSettings.tiposOperacion || [],
      datosPrestamista: nextSettings.datosPrestamista || {},
      plantillasWhatsapp: nextSettings.plantillasWhatsapp || [],
      parametrosFinancieros: nextSettings.parametrosFinancieros || {},
      branding: nextSettings.branding || {},
      uiPreferences: nextSettings.uiPreferences || {},
    });
    const { error } = await sb.from('app_settings').upsert(payload, { onConflict: 'organization_id' });
    if (error) { alert('Error al guardar configuracion: ' + error.message); return; }
    onDataChange?.('settings', nextSettings);
    setNotice('Configuracion de mora guardada.');
  }

  React.useEffect(() => {
    if (autoAppliedRef.current || !moraCfg.activa || moraCfg.modo !== 'automatica' || !moraCfg.aplicarAlAbrirMora || !pendingRows.length) return;
    autoAppliedRef.current = true;
    applyBulk('auto');
  }, [moraCfg.activa, moraCfg.modo, moraCfg.aplicarAlAbrirMora, pendingRows.length]);

  const chip = (label, value, tone = '#4f46e5') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
      <span style={{ fontWeight: 700 }}>{label}:</span>
      <span style={{ color: tone, fontWeight: 800 }}>{value}</span>
    </div>
  );
  const kpi = (label, value, sub, color, mark) => (
    <Card style={{ padding: 18, minHeight: 108 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 46, height: 46, borderRadius: 16, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{mark}</div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
        </div>
      </div>
    </Card>
  );
  const actionBtn = (label, onClick, color = '#4f46e5') => (
    <button disabled={busy} onClick={onClick} style={{ border: `1px solid ${color}40`, background: `${color}0f`, color, borderRadius: 8, padding: '8px 10px', fontSize: 12, fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>{label}</button>
  );

  const recentEvents = selected ? installmentMoraEvents.filter(e => e.installmentId === selected.inst.id).slice(0, 5) : [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>Mora y atrasos</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Control de cuotas vencidas, recargos diarios y cobranza</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn variant="secondary" onClick={() => setTab('config')}>Configuracion de mora</Btn>
          <Btn onClick={() => setTab('config')}>Editar configuracion</Btn>
        </div>
      </div>

      <Card style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', alignItems: 'center' }}>
          {chip('Modo de mora', moraCfg.modo.replaceAll('_', ' '))}
          {chip('Tasa diaria', `${moraCfg.tasaDiaria.toFixed(2)}%`)}
          {chip('Dias de gracia', `${moraCfg.diasGracia} dias`)}
          {chip('Base de calculo', moraCfg.baseCalculo === 'saldo_pendiente' ? 'Saldo pendiente' : 'Monto programado')}
          {chip('Tipo', moraCfg.tipoCalculo)}
          {chip('Estado', moraCfg.activa ? 'Activa' : 'Inactiva', moraCfg.activa ? '#16a34a' : '#dc2626')}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 14 }}>
        {kpi('Total vencido sin mora', formatCurrency(totalVencidoSinMora), `${rows.length} cuotas vencidas`, '#7c3aed', '$')}
        {kpi('Mora pendiente', formatCurrency(moraPendiente), `${pendingRows.length} cuotas por actualizar`, '#f97316', 'UP')}
        {kpi('Clientes en mora', maskSensitiveNumber(clientesEnMora), `De ${clients.length} clientes`, '#ef4444', 'CL')}
        {kpi('Mora cobrada este mes', formatCurrency(moraCobradaMes), 'Por pagos reales', '#16a34a', 'OK')}
        {kpi('Dias promedio de atraso', `${maskSensitiveNumber(avgDias)} dias`, 'Promedio general', '#3b82f6', 'D')}
      </div>

      {pendingRows.length > 0 && moraCfg.activa && (
        <Card style={{ padding: 18, marginBottom: 16, borderColor: '#ddd6fe', background: 'linear-gradient(135deg, #fff 0%, #faf5ff 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#4f46e5', marginBottom: 4 }}>Actualizacion de mora pendiente</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Hay {maskSensitiveNumber(pendingRows.length)} cuotas con mora pendiente de actualizar.</div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 12, fontSize: 13 }}>
                <strong>Mora nueva estimada: {formatCurrency(moraPendiente)}</strong>
                <span>Clientes afectados: <strong>{maskSensitiveNumber(new Set(pendingRows.map(r => r.inst.clientId)).size)}</strong></span>
                <span>Dias promedio: <strong>{maskSensitiveNumber(avgDias)}</strong></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="secondary" onClick={() => setTab('cuotas')}>Revisar detalle</Btn>
              <Btn disabled={busy} onClick={() => applyBulk(moraCfg.modo === 'manual' ? 'manual' : 'auto')}>Aplicar actualizacion</Btn>
            </div>
          </div>
        </Card>
      )}

      {notice && <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#166534', fontSize: 13, fontWeight: 700 }}>{notice}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 14, alignItems: 'start' }}>
        <Card>
          <div style={{ borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
            <Tabs
              tabs={[
                { id: 'cuotas', label: 'Cuotas en mora' },
                { id: 'clientes', label: 'Clientes' },
                { id: 'historial', label: 'Historial de mora' },
                { id: 'config', label: 'Configuracion rapida' },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>

          {tab === 'cuotas' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: 14, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cliente, operacion o cuota..." style={{ maxWidth: 320 }} />
                <Btn variant="secondary" onClick={() => alert('Exportacion de mora proximamente')}>Exportar</Btn>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 930 }}>
                  <thead>
                    <tr style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {['Cliente','Operacion','Cuota','Vencimiento','Dias','Saldo','Mora aplicada','Mora pendiente','Total','Acciones'].map(h => <th key={h} style={{ textAlign: h === 'Acciones' ? 'center' : 'left', padding: '12px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.inst.id} onClick={() => setSelectedId(r.inst.id)} style={{ cursor: 'pointer', background: selected?.inst.id === r.inst.id ? '#f5f3ff' : 'transparent' }}>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}><strong>{r.client?.nombre || 'Sin cliente'}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.client?.telefono || ''}</div></td>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: '#4f46e5', fontWeight: 800 }}>{r.op?.codigo || '-'}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>{maskSensitiveNumber(r.inst.numeroCuota)}/{maskSensitiveNumber(r.inst.totalCuotas)}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>{formatDate(r.inst.fechaVencimiento)}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}><span style={{ color: r.days > 30 ? '#dc2626' : '#d97706', fontWeight: 800 }}>{maskSensitiveNumber(r.days)}d</span></td>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontFamily: 'DM Mono, monospace' }}>{formatMoney(r.inst.saldoPendiente, r.inst.moneda)}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono, monospace' }}>{formatMoney(r.bal.pendiente, r.inst.moneda)}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: r.pending.amount > 0 ? '#f97316' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontWeight: 800 }}>{formatMoney(r.pending.amount, r.inst.moneda)}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', fontWeight: 900, fontFamily: 'DM Mono, monospace' }}>{formatMoney(r.total + r.pending.amount, r.inst.moneda)}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                            {actionBtn('Pago', () => onNav('pagos', null, 'nuevo', r.inst.clientId), '#16a34a')}
                            {actionBtn('Aplicar', () => applyMora(r), '#f97316')}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan="10" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No hay cuotas en mora.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'clientes' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <thead><tr>{['Cliente','Cuotas','Vencido sin mora','Mora aplicada','Mora pendiente','Total a cobrar','Acciones'].map(h => <th key={h} style={{ padding: 12, borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                <tbody>{clientRows.map(r => <tr key={r.client?.id}>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}><strong>{r.client?.nombre || 'Sin cliente'}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.client?.telefono || ''}</div></td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>{maskSensitiveNumber(r.cuotas)}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{formatCurrency(r.vencido)}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>{formatCurrency(r.mora)}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)', color: '#f97316', fontWeight: 800 }}>{formatCurrency(r.pendiente)}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)', fontWeight: 900 }}>{formatCurrency(r.total)}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}><Btn size="sm" variant="secondary" onClick={() => onNav('clientes', r.client?.id)}>Ver cliente</Btn></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}

          {tab === 'historial' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                <thead><tr>{['Fecha','Cliente','Operacion','Cuota','Tipo','Dias','Tasa','Monto','Notas'].map(h => <th key={h} style={{ padding: 12, borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                <tbody>{installmentMoraEvents.map(e => {
                  const c = clientById[e.clientId];
                  const op = opById[e.operationId];
                  return <tr key={e.id}>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>{formatDate(String(e.fecha || '').slice(0, 10))}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>{c?.nombre || '-'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)', color: '#4f46e5', fontWeight: 800 }}>{op?.codigo || '-'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>{e.installmentId?.slice(0, 8)}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>{e.tipo}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>{maskSensitiveNumber(e.diasAplicados || 0)}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>{maskSensitiveNumber(e.tasaDiaria || 0)}%</td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)', fontWeight: 800 }}>{formatCurrency(e.montoMora || 0)}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>{e.notas || '-'}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}

          {tab === 'config' && (
            <div style={{ padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <Field label="Mora activa"><Select value={quickCfg.activa ? 'si' : 'no'} onChange={e => setQuickCfg(c => ({ ...c, activa: e.target.value === 'si' }))}><option value="si">Activa</option><option value="no">Inactiva</option></Select></Field>
                <Field label="Modo"><Select value={quickCfg.modo} onChange={e => setQuickCfg(c => ({ ...c, modo: e.target.value }))}><option value="manual">Manual</option><option value="automatica_confirmacion">Automatica con confirmacion</option><option value="automatica">Automatica</option></Select></Field>
                <Field label="Tasa diaria (%)"><Input type="number" step="0.01" min="0" value={quickCfg.tasaDiaria} onChange={e => setQuickCfg(c => ({ ...c, tasaDiaria: Number(e.target.value) }))} /></Field>
                <Field label="Dias de gracia"><Input type="number" min="0" value={quickCfg.diasGracia} onChange={e => setQuickCfg(c => ({ ...c, diasGracia: parseInt(e.target.value, 10) || 0 }))} /></Field>
                <Field label="Base de calculo"><Select value={quickCfg.baseCalculo} onChange={e => setQuickCfg(c => ({ ...c, baseCalculo: e.target.value }))}><option value="saldo_pendiente">Saldo pendiente</option><option value="monto_programado">Monto programado</option></Select></Field>
                <Field label="Tipo de calculo"><Select value={quickCfg.tipoCalculo} onChange={e => setQuickCfg(c => ({ ...c, tipoCalculo: e.target.value }))}><option value="simple">Simple</option><option value="compuesto">Compuesto</option></Select></Field>
                <Field label="Redondeo"><Select value={quickCfg.redondeo} onChange={e => setQuickCfg(c => ({ ...c, redondeo: e.target.value }))}><option value="sin_redondeo">Sin redondeo</option><option value="100">A 100</option><option value="500">A 500</option><option value="1000">A 1000</option></Select></Field>
                <Field label="Prioridad de pago"><Select value={quickCfg.prioridadPago} onChange={e => setQuickCfg(c => ({ ...c, prioridadPago: e.target.value }))}><option value="mora_primero">Mora primero</option><option value="cuota_primero">Cuota primero</option><option value="manual">Manual</option></Select></Field>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={quickCfg.aplicarAlAbrirMora} onChange={e => setQuickCfg(c => ({ ...c, aplicarAlAbrirMora: e.target.checked }))} /> Aplicar al abrir Mora</label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={quickCfg.aplicarAlRegistrarPago} onChange={e => setQuickCfg(c => ({ ...c, aplicarAlRegistrarPago: e.target.checked }))} /> Aplicar al registrar pago</label>
              </div>
              <div style={{ marginTop: 16 }}><Btn onClick={saveQuickConfig}>Guardar configuracion de mora</Btn></div>
            </div>
          )}
        </Card>

        <Card style={{ padding: 18, position: 'sticky', top: 12 }}>
          {selected ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{selected.client?.nombre || 'Sin cliente'}</div>
                  <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 800 }}>{selected.op?.codigo || '-'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cuota {maskSensitiveNumber(selected.inst.numeroCuota)} de {maskSensitiveNumber(selected.inst.totalCuotas)} - vence {formatDate(selected.inst.fechaVencimiento)}</div>
                </div>
                <StatusBadge status={selected.inst.moraCongelada ? 'Congelada' : 'Vencida'} />
              </div>
              {[
                ['Saldo pendiente', formatMoney(selected.inst.saldoPendiente, selected.inst.moneda)],
                ['Mora aplicada', formatMoney(selected.bal.aplicada, selected.inst.moneda)],
                ['Mora pagada', formatMoney(selected.bal.pagada, selected.inst.moneda)],
                ['Mora condonada', formatMoney(selected.bal.condonada, selected.inst.moneda)],
                ['Mora pendiente', formatMoney(selected.pending.amount, selected.inst.moneda)],
                ['Dias de atraso', `${maskSensitiveNumber(selected.days)} dias`],
                ['Dias de gracia', `${maskSensitiveNumber(moraCfg.diasGracia)} dias`],
              ].map(([l, v]) => <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>{l}</span><strong>{v}</strong></div>)}
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: '#f5f3ff', color: '#4f46e5', display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
                <span>Total a cobrar</span>
                <span>{formatMoney(selected.total + selected.pending.amount, selected.inst.moneda)}</span>
              </div>
              <div style={{ marginTop: 16, fontWeight: 900, fontSize: 13 }}>Acciones rapidas</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                {actionBtn('Registrar pago', () => onNav('pagos', null, 'nuevo', selected.inst.clientId), '#16a34a')}
                {actionBtn('WhatsApp', () => {
                  const msg = `Hola ${selected.client?.nombre || ''}, tenes una cuota vencida de ${formatMoney(selected.inst.saldoPendiente, selected.inst.moneda)} con mora de ${formatMoney(selected.bal.pendiente + selected.pending.amount, selected.inst.moneda)}. Total actualizado: ${formatMoney(selected.total + selected.pending.amount, selected.inst.moneda)}.`;
                  window.open(`https://wa.me/${String(selected.client?.telefono || '').replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
                }, '#22c55e')}
                {actionBtn('Aplicar mora', () => applyMora(selected), '#f97316')}
                {actionBtn('Condonar mora', () => condone(selected), '#7c3aed')}
                {actionBtn(selected.inst.moraCongelada ? 'Descongelar' : 'Congelar', () => setFrozen(selected, !selected.inst.moraCongelada), '#ef4444')}
                {actionBtn('Ver historial', () => setTab('historial'), '#64748b')}
              </div>
              <div style={{ marginTop: 18, fontWeight: 900, fontSize: 13 }}>Historial reciente</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {recentEvents.length ? recentEvents.map(e => (
                  <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{formatDate(String(e.fecha || '').slice(0, 10))}</strong><strong style={{ color: '#16a34a' }}>{formatCurrency(e.montoMora || 0)}</strong></div>
                    <div style={{ color: 'var(--text-muted)' }}>{e.tipo} - {maskSensitiveNumber(e.diasAplicados || 0)} dias</div>
                  </div>
                )) : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sin eventos para esta cuota.</div>}
              </div>
            </>
          ) : <EmptyState title="Sin cuotas en mora" />}
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { CajaScreen, MoraScreen: MoraScreenV2 });
