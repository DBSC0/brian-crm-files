// Caja Screen
function CajaScreen({ data, onNav, onDataChange }) {
  const { cashMovements, clients, operations, creditCards } = data;
  const [showNew, setShowNew] = React.useState(false);
  const [newMov, setNewMov] = React.useState({ tipo: 'Ajuste manual', monto: '', descripcion: '', fecha: new Date().toISOString().slice(0,10) });
  const setNM = (k, v) => setNewMov(m => ({ ...m, [k]: v }));
  const [filters, setFilters] = React.useState({});

  const entradas = cashMovements.filter(m => m.monto > 0).reduce((s, m) => s + m.monto, 0);
  const salidas = cashMovements.filter(m => m.monto < 0).reduce((s, m) => s + Math.abs(m.monto), 0);
  const saldo = entradas - salidas;
  const capitalEnLaCalle = data.installments.reduce((s, i) => s + i.saldoPendiente, 0);
  const gananciaCobrada = entradas - data.operations.reduce((s, o) => s + o.costoReal, 0);
  const compromisoTarjetas = data.creditCardMovements.reduce((s, m) => s + m.monto, 0);

  const filtered = [...cashMovements].filter(m => {
    if (filters.tipo && m.tipo !== filters.tipo) return false;
    return true;
  });

  const tipos = ['Salida por préstamo','Salida por compra de producto','Entrada por pago','Entrada por anticipo','Salida por pago de tarjeta','Gasto','Ajuste manual'];

  async function saveMov() {
    const monto = newMov.tipo.startsWith('Salida') || newMov.tipo === 'Gasto'
      ? -Math.abs(parseFloat(newMov.monto) || 0)
      :  Math.abs(parseFloat(newMov.monto) || 0);
    const sb = window.__supabase;
    const { data: inserted, error } = await sb.from('cash_movements')
      .insert({ tipo: newMov.tipo, monto, client_id: null, operation_id: null, payment_id: null, credit_card_id: null, descripcion: newMov.descripcion, fecha: newMov.fecha })
      .select().single();
    if (error) { alert('Error al guardar movimiento: ' + error.message); return; }
    onDataChange('cashMovements', [...cashMovements, toCamel(inserted)]);
    setShowNew(false);
    setNewMov({ tipo: 'Ajuste manual', monto: '', descripcion: '', fecha: new Date().toISOString().slice(0,10) });
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
      <SectionHeader title="Caja" actions={<Btn onClick={() => setShowNew(true)}>+ Movimiento manual</Btn>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPICard label="Total entradas"      value={formatCurrency(entradas)}                    accent="green"                       icon="📥" />
        <KPICard label="Total salidas"       value={formatCurrency(salidas)}                     accent="red"                         icon="📤" />
        <KPICard label="Saldo neto"          value={formatCurrency(saldo)}                       accent={saldo >= 0 ? 'green' : 'red'} icon="⚖️" />
        <KPICard label="Capital en la calle" value={formatCurrency(capitalEnLaCalle)}             accent="blue"  sub="saldo pendiente total"    icon="⏳" />
        <KPICard label="Ganancia cobrada"    value={formatCurrency(Math.max(0, gananciaCobrada))} accent="purple"                      icon="💹" />
        <KPICard label="Compromiso tarjetas" value={formatCurrency(compromisoTarjetas)}           accent="amber" sub="total financiado en TC"   icon="💳" />
      </div>
      <Card>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={filters.tipo || ''} onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todos los tipos</option>
            {tipos.map(t => <option key={t}>{t}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center', fontFamily: 'DM Sans, sans-serif' }}>{filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <DataTable
          columns={[
            { key: 'fecha', label: 'Fecha', render: v => formatDate(v), nowrap: true },
            { key: 'tipo', label: 'Tipo', render: v => (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: tipoColors[v] || '#374151', fontFamily: 'DM Sans, sans-serif' }}>{v}</span>
            )},
            { key: 'descripcion', label: 'Descripción' },
            { key: 'clientId', label: 'Cliente', render: v => v ? clients.find(c => c.id === v)?.nombre || '—' : '—' },
            { key: 'creditCardId', label: 'Tarjeta', render: v => v ? creditCards.find(c => c.id === v)?.nombre || '—' : '—' },
            { key: 'monto', label: 'Monto', mono: true, render: v => (
              <span style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace', color: v > 0 ? '#16a34a' : '#dc2626' }}>
                {v > 0 ? '+' : ''}{formatCurrency(v)}
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
  const { clients, operations, installments, clientNotes } = data;
  const today = new Date();
  const [filters, setFilters] = React.useState({});

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

  const totalVencido = overdueInst.reduce((s, i) => s + i.saldoPendiente, 0);
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
          <input value={filters.cliente || ''} onChange={e => setFilters(f => ({ ...f, cliente: e.target.value }))} placeholder="🔍 Filtrar por cliente..." style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif', minWidth: 160 }} />
          <select value={filters.rango || ''} onChange={e => setFilters(f => ({ ...f, rango: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todos los rangos</option>
            <option value="1-7">1 a 7 días</option>
            <option value="8-15">8 a 15 días</option>
            <option value="16-30">16 a 30 días</option>
            <option value="30+">Más de 30 días</option>
          </select>
          <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>{maskSensitiveNumber(filtered.length)} cuota{filtered.length !== 1 ? 's' : ''} vencida{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <DataTable
          columns={[
            { key: 'clientId', label: 'Cliente', render: v => {
              const c = clients.find(cl => cl.id === v);
              return <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{c?.nombre || '—'}</span>;
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
            { key: 'montoProgramado', label: 'Original', mono: true, render: v => formatCurrency(v) },
            { key: 'montoPagado', label: 'Pagado', mono: true, render: v => formatCurrency(v) },
            { key: 'saldoPendiente', label: 'Saldo vencido', mono: true, render: v => <span style={{ fontWeight: 700, color: '#dc2626', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</span> },
            { key: '_ult', label: 'Últ. contacto', sortable: false, render: (_, row) => {
              const note = (clientNotes || []).filter(n => n.clientId === row.clientId).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
              return note ? <span style={{ fontSize: 11, color: '#64748b' }}>{formatDate(note.fecha)}</span> : <span style={{ color: '#94a3b8', fontSize: 11 }}>Sin contacto</span>;
            }},
            { key: '_acc', label: '', sortable: false, render: (_, row) => {
              const c = clients.find(cl => cl.id === row.clientId);
              return (
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <WAButton phone={c?.telefono || ''} message={`Hola ${c?.nombre}, te escribo por la cuota vencida del día ${formatDate(row.fechaVencimiento)}. El saldo pendiente es de ${formatCurrencyRaw(row.saldoPendiente)}. ¿Podemos coordinar el pago?`} />
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

Object.assign(window, { CajaScreen, MoraScreen });
