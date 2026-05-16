// Cuotas Screen
function CuotasScreen({ data, onNav }) {
  const { clients, operations, installments } = data;
  const [filters, setFilters] = React.useState({});
  const today = new Date();

  const filtered = installments.filter(i => {
    if (filters.estado && i.estado !== filters.estado) return false;
    if (filters.cliente) {
      const c = clients.find(cl => cl.id === i.clientId);
      if (!c?.nombre.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
    }
    return true;
  });

  const columns = [
    { key: 'codigo', label: 'Código', mono: true, nowrap: true },
    { key: 'clientId', label: 'Cliente', render: v => {
      const c = clients.find(cl => cl.id === v);
      return <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{c?.nombre || '—'}</span>;
    }},
    { key: 'operationId', label: 'Operación', render: v => {
      const op = operations.find(o => o.id === v);
      return <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#4f46e5' }}>{op?.codigo || '—'}</span>;
    }},
    { key: 'numeroCuota', label: 'Cuota', render: (v, row) => `${v}/${row.totalCuotas}` },
    { key: 'fechaVencimiento', label: 'Vencimiento', render: v => formatDate(v), nowrap: true },
    { key: 'montoProgramado', label: 'Programado', mono: true, render: v => formatCurrency(v) },
    { key: 'montoPagado', label: 'Pagado', mono: true, render: v => <span style={{ color: v > 0 ? '#16a34a' : '#94a3b8', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</span> },
    { key: 'saldoPendiente', label: 'Saldo', mono: true, render: v => <span style={{ color: v > 0 ? '#dc2626' : '#16a34a', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</span> },
    { key: '_dias', label: 'Atraso', sortValue: row => calculateOverdueDays(row.fechaVencimiento), render: (_, row) => {
      const days = calculateOverdueDays(row.fechaVencimiento);
      return days > 0 && row.saldoPendiente > 0
        ? <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', fontFamily: 'DM Mono, monospace' }}>{days}d</span>
        : <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>;
    }},
    { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
    { key: '_acc', label: '', sortable: false, render: (_, row) => (
      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        <Btn size="sm" variant="ghost" onClick={() => onNav('pagos', null, 'nuevo', row.clientId)}>💳</Btn>
        <Btn size="sm" variant="ghost" onClick={() => onNav('operaciones', row.operationId)}>Ver op.</Btn>
      </div>
    )},
  ];

  const stats = {
    pendientes: installments.filter(i => i.estado === 'Pendiente').length,
    vencidas: installments.filter(i => i.estado === 'Vencida').length,
    parciales: installments.filter(i => i.estado === 'Parcial').length,
    pagadas: installments.filter(i => i.estado === 'Pagada').length,
  };

  function cuotaRowStyle(row) {
    if (row.estado === 'Pagada' || row.saldoPendiente === 0) return {};
    const due  = new Date(row.fechaVencimiento + 'T00:00:00');
    const now  = new Date(); now.setHours(0,0,0,0);
    const days = Math.ceil((due - now) / 86400000);
    if (days < 0)  return { background: '#fff5f5' };
    if (days <= 3) return { background: '#fff8f2' };
    if (due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear())
      return { background: '#fefef0' };
    return {};
  }

  return (
    <div>
      <SectionHeader title="Cuotas" />
      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
        <KPICard label="Pendientes" value={stats.pendientes} accent="blue"  icon="📋" />
        <KPICard label="Vencidas"   value={stats.vencidas}   accent="red"   icon="⚠️" />
        <KPICard label="Parciales"  value={stats.parciales}  accent="amber" icon="🟡" />
        <KPICard label="Pagadas"    value={stats.pagadas}    accent="green" icon="✅" />
        <KPICard label="Total saldo" value={formatCurrency(installments.reduce((s, i) => s + i.saldoPendiente, 0))} accent="blue" icon="💰" />
      </div>
      <Card>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={filters.cliente || ''} onChange={e => setFilters(f => ({ ...f, cliente: e.target.value }))} placeholder="🔍 Filtrar por cliente..." style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif', minWidth: 180 }} />
          <select value={filters.estado || ''} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todos los estados</option>
            {['Pendiente','Parcial','Pagada','Vencida','Refinanciada','Anulada'].map(s => <option key={s}>{s}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center', fontFamily: 'DM Sans, sans-serif' }}>{filtered.length} cuota{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <DataTable columns={columns} data={filtered} emptyMessage="Sin cuotas" defaultSortKey="fechaVencimiento" defaultSortDir="asc" tableId="cuotas" rowStyle={cuotaRowStyle} />
      </Card>
    </div>
  );
}

// ============================================================
// PAGOS SCREEN + MODAL REGISTRAR PAGO
// ============================================================
function RegistrarPagoModal({ open, onClose, onSave, data, preselectedClientId, preselectedOpId }) {
  const { clients, installments } = data;
  const [form, setForm] = React.useState({
    clientId: preselectedClientId || '',
    fechaPago: new Date().toISOString().slice(0,10),
    monto: '',
    metodoPago: 'Efectivo',
    notas: '',
    imputacion: 'auto',
    selectedInstIds: [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [errors, setErrors] = React.useState({});

  React.useEffect(() => {
    if (open) setForm(f => ({ ...f, clientId: preselectedClientId || '', selectedInstIds: [] }));
  }, [open, preselectedClientId]);

  const clientInst = React.useMemo(() => {
    if (!form.clientId) return [];
    return installments.filter(i => i.clientId === form.clientId && i.saldoPendiente > 0)
      .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
  }, [form.clientId, installments]);

  const monto = parseFloat(form.monto) || 0;
  const imputaciones = React.useMemo(() => {
    if (!monto || !form.clientId) return [];
    if (form.imputacion === 'auto') {
      let rem = monto;
      const result = [];
      for (const inst of clientInst) {
        if (rem <= 0) break;
        const aplicado = Math.min(rem, inst.saldoPendiente);
        result.push({ installmentId: inst.id, montoAplicado: aplicado, inst });
        rem -= aplicado;
      }
      return result;
    }
    if (form.imputacion === 'manual') {
      return form.selectedInstIds.map(iid => {
        const inst = clientInst.find(i => i.id === iid);
        return inst ? { installmentId: iid, montoAplicado: Math.min(monto / form.selectedInstIds.length, inst.saldoPendiente), inst } : null;
      }).filter(Boolean);
    }
    return [];
  }, [form.clientId, form.imputacion, form.selectedInstIds, monto, clientInst]);

  const totalImputado = imputaciones.reduce((s, a) => s + a.montoAplicado, 0);
  const restante = monto - totalImputado;

  function validate() {
    const e = {};
    if (!form.clientId) e.clientId = 'Seleccioná un cliente';
    if (!form.monto || monto <= 0) e.monto = 'Ingresá un monto válido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const today = new Date();
    const allocsPayload = imputaciones.map(a => ({
      installment_id: a.installmentId,
      monto_aplicado: a.montoAplicado,
    }));
    const instUpdates = imputaciones.map(a => {
      const inst = data.installments.find(i => i.id === a.installmentId);
      const newPagado = inst.montoPagado + a.montoAplicado;
      const newSaldo  = Math.max(0, inst.montoProgramado - newPagado);
      const due = new Date(inst.fechaVencimiento);
      let newEstado = 'Pendiente';
      if (newSaldo <= 0) newEstado = 'Pagada';
      else if (newPagado > 0) newEstado = due < today ? 'Vencida' : 'Parcial';
      else newEstado = due < today ? 'Vencida' : 'Pendiente';
      return { id: inst.id, monto_pagado: newPagado, saldo_pendiente: newSaldo, estado: newEstado };
    });
    const sb = window.__supabase;
    const { error } = await sb.rpc('register_payment', {
      p_payment: {
        client_id:   form.clientId,
        fecha_pago:  form.fechaPago,
        monto,
        metodo_pago: form.metodoPago,
        notas:       form.notas || null,
      },
      p_receipt:             {},
      p_allocations:         allocsPayload,
      p_installment_updates: instUpdates,
      p_cash_movement: {
        monto,
        descripcion: `Pago de ${clients.find(c => c.id === form.clientId)?.nombre}`,
      },
    });
    if (error) { alert('Error al registrar pago: ' + error.message); return; }
    onSave();
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar pago" size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn onClick={handleSave}>✅ Registrar pago</Btn></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Cliente" required error={errors.clientId}>
            <Select value={form.clientId} onChange={e => set('clientId', e.target.value)}>
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.codigo}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Fecha de pago">
          <Input type="date" value={form.fechaPago} onChange={e => set('fechaPago', e.target.value)} />
        </Field>
        <Field label="Método de pago">
          <Select value={form.metodoPago} onChange={e => set('metodoPago', e.target.value)}>
            {['Efectivo','Transferencia','Mercado Pago','Cheque','Otro'].map(m => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Monto recibido" required error={errors.monto}>
            <Input type="number" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0" />
          </Field>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Observación">
            <Input value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Notas opcionales..." />
          </Field>
        </div>

        {/* Imputación */}
        {form.clientId && (
          <div style={{ gridColumn: '1/-1' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Imputación</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {[
                { id: 'auto', label: 'Auto (más antiguo primero)' },
                { id: 'manual', label: 'Elegir cuotas manualmente' },
                { id: 'anticipo', label: 'Anticipo sin imputar' },
              ].map(opt => (
                <button key={opt.id} onClick={() => set('imputacion', opt.id)} style={{
                  padding: '6px 12px', borderRadius: 8,
                  border: `2px solid ${form.imputacion === opt.id ? '#4f46e5' : '#e2e8f0'}`,
                  background: form.imputacion === opt.id ? '#eef2ff' : '#fff',
                  color: form.imputacion === opt.id ? '#4f46e5' : '#374151',
                  cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'DM Sans, sans-serif',
                }}>{opt.label}</button>
              ))}
            </div>

            {clientInst.length === 0 ? (
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>Sin cuotas pendientes para este cliente</div>
            ) : (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Cuotas pendientes:</div>
                {clientInst.map(inst => {
                  const op = data.operations.find(o => o.id === inst.operationId);
                  const isSelected = form.selectedInstIds.includes(inst.id);
                  return (
                    <div key={inst.id} onClick={() => {
                      if (form.imputacion !== 'manual') return;
                      set('selectedInstIds', isSelected
                        ? form.selectedInstIds.filter(id => id !== inst.id)
                        : [...form.selectedInstIds, inst.id]);
                    }} style={{
                      padding: '8px 12px', borderRadius: 6, marginBottom: 4,
                      background: isSelected ? '#eef2ff' : '#f8fafc',
                      border: `1px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`,
                      cursor: form.imputacion === 'manual' ? 'pointer' : 'default',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{inst.codigo} · {op?.codigo}</span>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Cuota {inst.numeroCuota}/{inst.totalCuotas} — vence {formatDate(inst.fechaVencimiento)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(inst.saldoPendiente)}</span>
                        <StatusBadge status={inst.estado} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            {monto > 0 && (
              <div style={{ marginTop: 14, background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Resumen de imputación</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Monto recibido</span>
                  <span style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(monto)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Imputado a cuotas</span>
                  <span style={{ fontWeight: 700, color: '#16a34a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(totalImputado)}</span>
                </div>
                {restante !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>Sin imputar / anticipo</span>
                    <span style={{ fontWeight: 700, color: restante > 0 ? '#d97706' : '#dc2626', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(Math.abs(restante))}</span>
                  </div>
                )}
                {imputaciones.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                    {imputaciones.map((a, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                        → {formatCurrency(a.montoAplicado)} aplicado a {a.inst.codigo} (cuota {a.inst.numeroCuota}/{a.inst.totalCuotas})
                        {a.montoAplicado >= a.inst.saldoPendiente && <span style={{ color: '#16a34a', fontWeight: 700 }}> ✓ quedará PAGADA</span>}
                        {a.montoAplicado < a.inst.saldoPendiente && <span style={{ color: '#d97706', fontWeight: 700 }}> ~ quedará PARCIAL</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function PagosScreen({ data, onNav, onDataChange, openNewModal, preselectedClientId }) {
  const { clients, payments, receipts } = data;
  const [showNew, setShowNew] = React.useState(false);
  const [filters, setFilters] = React.useState({});
  const [success, setSuccess] = React.useState(false);
  const [anularPago, setAnularPago] = React.useState(null);
  const [anulando, setAnulando] = React.useState(false);

  React.useEffect(() => { if (openNewModal) setShowNew(true); }, [openNewModal]);

  const filtered = [...payments].filter(p => {
    if (filters.metodo && p.metodoPago !== filters.metodo) return false;
    if (filters.cliente) {
      const c = clients.find(cl => cl.id === p.clientId);
      if (!c?.nombre.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
    }
    return true;
  });

  async function handleSave() {
    const sb = window.__supabase;
    const [
      { data: updPays },
      { data: updRecs },
      { data: updAllocs },
      { data: updInsts },
      { data: updCash },
    ] = await Promise.all([
      sb.from('payments').select('*').order('fecha_pago'),
      sb.from('receipts').select('*').order('fecha'),
      sb.from('payment_allocations').select('*'),
      sb.from('installments').select('*').order('fecha_vencimiento'),
      sb.from('cash_movements').select('*').order('fecha'),
    ]);
    onDataChange('payments',           rowsToCamel(updPays));
    onDataChange('receipts',           rowsToCamel(updRecs));
    onDataChange('paymentAllocations', rowsToCamel(updAllocs));
    onDataChange('installments',       rowsToCamel(updInsts));
    onDataChange('cashMovements',      rowsToCamel(updCash));
    setShowNew(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  const columns = [
    { key: 'codigo', label: 'Código', mono: true, nowrap: true },
    { key: 'clientId', label: 'Cliente', render: v => {
      const c = clients.find(cl => cl.id === v);
      return <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{c?.nombre || '—'}</span>;
    }},
    { key: 'fechaPago', label: 'Fecha', render: v => formatDate(v), nowrap: true },
    { key: 'monto', label: 'Monto', mono: true, render: v => <span style={{ fontWeight: 700, color: '#16a34a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</span> },
    { key: 'metodoPago', label: 'Método' },
    { key: 'notas', label: 'Notas' },
    { key: 'receiptId', label: 'Recibo', render: (v) => {
      const rec = data.receipts.find(r => r.id === v);
      return rec ? <button onClick={e => { e.stopPropagation(); onNav('recibos', rec.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 12, fontFamily: 'DM Mono, monospace', fontWeight: 700, padding: 0 }}>{rec.codigo}</button> : <span style={{ color: '#94a3b8' }}>—</span>;
    }},
    { key: '_acc', label: '', sortable: false, render: (_, row) => (
      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        <Btn size="sm" variant="ghost" onClick={() => onNav('recibos', data.receipts.find(r => r.paymentId === row.id)?.id)}>🧾 Recibo</Btn>
        <Btn size="sm" variant="danger" onClick={() => setAnularPago(row)}>✕ Anular</Btn>
      </div>
    )},
  ];

  const totalCobrado = filtered.reduce((s, p) => s + p.monto, 0);

  return (
    <div>
      <SectionHeader title="Pagos" actions={<Btn onClick={() => setShowNew(true)}>+ Registrar pago</Btn>} />
      {success && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
          ✅ Pago registrado con éxito. Cuotas actualizadas y recibo generado.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
        <KPICard label="Total cobrado"     value={formatCurrency(payments.reduce((s, p) => s + p.monto, 0))} accent="green" icon="💰" />
        <KPICard label="Pagos registrados" value={payments.length} accent="blue" sub="registros" icon="📝" />
        <KPICard label="Este mes"          value={formatCurrency(payments.filter(p => p.fechaPago.startsWith(new Date().toISOString().slice(0,7))).reduce((s, p) => s + p.monto, 0))} accent="green" icon="📅" sub={new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' })} />
      </div>
      <Card>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={filters.cliente || ''} onChange={e => setFilters(f => ({ ...f, cliente: e.target.value }))} placeholder="🔍 Filtrar por cliente..." style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif', minWidth: 180 }} />
          <select value={filters.metodo || ''} onChange={e => setFilters(f => ({ ...f, metodo: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todos los métodos</option>
            {['Efectivo','Transferencia','Mercado Pago','Cheque','Otro'].map(m => <option key={m}>{m}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center', fontFamily: 'DM Sans, sans-serif' }}>{filtered.length} pago{filtered.length !== 1 ? 's' : ''} · {formatCurrency(totalCobrado)}</span>
        </div>
        <DataTable columns={columns} data={filtered} emptyMessage="Sin pagos" defaultSortKey="fechaPago" defaultSortDir="desc" tableId="pagos" />
      </Card>
      <RegistrarPagoModal open={showNew} onClose={() => setShowNew(false)} onSave={handleSave} data={data} preselectedClientId={preselectedClientId} />
      <ConfirmModal
        open={!!anularPago}
        onClose={() => setAnularPago(null)}
        loading={anulando}
        title="Anular pago"
        message={anularPago ? `¿Anular el pago ${anularPago.codigo} de ${formatCurrency(anularPago.monto)}? Se revertirán las cuotas imputadas y se eliminará el recibo. Esta acción no se puede deshacer.` : ''}
        confirmLabel="Anular pago"
        onConfirm={async () => {
          setAnulando(true);
          const sb = window.__supabase;
          const { error } = await sb.rpc('reverse_payment', { p_payment_id: anularPago.id });
          setAnulando(false);
          if (error) { alert('Error al anular pago: ' + error.message); return; }
          const [{ data: updPays },{ data: updRecs },{ data: updAllocs },{ data: updInsts },{ data: updCash }] = await Promise.all([
            sb.from('payments').select('*').order('fecha_pago'),
            sb.from('receipts').select('*').order('fecha'),
            sb.from('payment_allocations').select('*'),
            sb.from('installments').select('*').order('fecha_vencimiento'),
            sb.from('cash_movements').select('*').order('fecha'),
          ]);
          onDataChange('payments',           rowsToCamel(updPays));
          onDataChange('receipts',           rowsToCamel(updRecs));
          onDataChange('paymentAllocations', rowsToCamel(updAllocs));
          onDataChange('installments',       rowsToCamel(updInsts));
          onDataChange('cashMovements',      rowsToCamel(updCash));
          setAnularPago(null);
        }}
      />
    </div>
  );
}

// ============================================================
// RECIBOS SCREEN
// ============================================================
function ReceiptPreview({ receipt, data, onDataChange }) {
  const [confirmAnular, setConfirmAnular] = React.useState(false);
  const [anulando, setAnulando] = React.useState(false);
  const payment = data.payments.find(p => p.id === receipt.paymentId);
  const client = data.clients.find(c => c.id === receipt.clientId);
  const allocs = data.paymentAllocations.filter(a => a.paymentId === receipt.paymentId);
  const allocInst = allocs.map(a => ({
    ...a,
    inst: data.installments.find(i => i.id === a.installmentId),
    op: null,
  })).map(a => ({
    ...a,
    op: a.inst ? data.operations.find(o => o.id === a.inst.operationId) : null,
  }));

  if (!receipt || !payment || !client) return <EmptyState title="Recibo no encontrado" />;

  const bal = calculateClientBalance(client.id, data.installments, data.payments, data.operations);

  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <div id="receipt-print" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 28, fontFamily: 'DM Sans, sans-serif' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #0f172a' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>RECIBO DE PAGO</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Brian Facciano · Sistema de gestión financiera</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#4f46e5', fontFamily: 'DM Mono, monospace' }}>N° {String(receipt.numero).padStart(6, '0')}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{receipt.codigo}</div>
          </div>
        </div>

        {/* Client & payment info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Recibido de</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{client.nombre}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>DNI: {client.dni}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{client.telefono}</div>
            {client.direccion && <div style={{ fontSize: 12, color: '#64748b' }}>{client.direccion}</div>}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Datos del pago</div>
            <div style={{ fontSize: 12, color: '#374151', marginBottom: 3 }}>Fecha: <strong>{formatDate(payment.fechaPago)}</strong></div>
            <div style={{ fontSize: 12, color: '#374151', marginBottom: 3 }}>Método: <strong>{payment.metodoPago}</strong></div>
            <div style={{ fontSize: 12, color: '#374151', marginBottom: 3 }}>Código: <strong style={{ fontFamily: 'DM Mono, monospace' }}>{payment.codigo}</strong></div>
            <StatusBadge status={receipt.estado} />
          </div>
        </div>

        {/* Amount */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, color: '#166534', fontWeight: 700 }}>MONTO ABONADO</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#166534', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(payment.monto)}</div>
        </div>

        {/* Allocations */}
        {allocInst.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Detalle de cuotas canceladas / abonadas</div>
            {allocInst.map((a, i) => a.inst && (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                <span style={{ color: '#374151' }}>{a.op?.codigo} — Cuota {a.inst.numeroCuota}/{a.inst.totalCuotas} ({formatDate(a.inst.fechaVencimiento)})</span>
                <span style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(a.montoAplicado)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Balance */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 6, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Saldo restante del cliente</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: bal.saldoPendiente > 0 ? '#dc2626' : '#16a34a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(bal.saldoPendiente)}</span>
        </div>

        {payment.notas && (
          <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 16, padding: '8px 12px', background: '#f8fafc', borderRadius: 6 }}>
            Observaciones: {payment.notas}
          </div>
        )}

        {/* Footer */}
        <div style={{ paddingTop: 16, borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', maxWidth: 260 }}>
            Brian Facciano<br />
            {data.settings?.datosPrestamista?.telefono || ''}<br />
            Recibo válido como constancia de pago.
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #374151', paddingTop: 4, fontSize: 10, color: '#64748b', width: 140 }}>Firma / Aclaración</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Btn size="sm" variant="secondary" onClick={() => window.print()}>🖨️ Imprimir</Btn>
        <Btn size="sm" variant="secondary" onClick={() => {
          const el = document.getElementById('receipt-print');
          html2pdf().set({
            margin: 8,
            filename: `recibo-${receipt.codigo}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          }).from(el).save();
        }}>⬇️ Descargar PDF</Btn>
        {receipt.estado !== 'Anulado' && onDataChange && (
          <Btn size="sm" variant="danger" onClick={() => setConfirmAnular(true)}>Anular recibo</Btn>
        )}
      </div>
      <ConfirmModal
        open={confirmAnular}
        onClose={() => setConfirmAnular(false)}
        loading={anulando}
        title="Anular recibo"
        message={`¿Anular el recibo ${receipt.codigo}? Se revertirán las cuotas imputadas y se eliminará el pago asociado. Esta acción no se puede deshacer.`}
        confirmLabel="Anular recibo"
        onConfirm={async () => {
          setAnulando(true);
          const sb = window.__supabase;
          const { error } = await sb.rpc('reverse_payment', { p_payment_id: receipt.paymentId });
          setAnulando(false);
          if (error) { alert('Error al anular: ' + error.message); return; }
          const [{ data: updPays },{ data: updRecs },{ data: updAllocs },{ data: updInsts },{ data: updCash }] = await Promise.all([
            sb.from('payments').select('*').order('fecha_pago'),
            sb.from('receipts').select('*').order('fecha'),
            sb.from('payment_allocations').select('*'),
            sb.from('installments').select('*').order('fecha_vencimiento'),
            sb.from('cash_movements').select('*').order('fecha'),
          ]);
          onDataChange('payments',           rowsToCamel(updPays));
          onDataChange('receipts',           rowsToCamel(updRecs));
          onDataChange('paymentAllocations', rowsToCamel(updAllocs));
          onDataChange('installments',       rowsToCamel(updInsts));
          onDataChange('cashMovements',      rowsToCamel(updCash));
          setConfirmAnular(false);
        }}
      />
    </div>
  );
}

function RecibosScreen({ data, onNav, onDataChange, receiptsFilter }) {
  const { clients, receipts, payments } = data;
  const [selectedReceipt, setSelectedReceipt] = React.useState(receiptsFilter || null);
  const [filters, setFilters] = React.useState({});

  const filtered = [...receipts].filter(r => {
    if (filters.cliente) {
      const c = clients.find(cl => cl.id === r.clientId);
      if (!c?.nombre.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
    }
    if (filters.estado && r.estado !== filters.estado) return false;
    return true;
  });

  const viewReceipt = data.receipts.find(r => r.id === selectedReceipt);

  if (selectedReceipt && viewReceipt) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Btn variant="ghost" size="sm" onClick={() => setSelectedReceipt(null)}>← Volver a recibos</Btn>
        </div>
        <ReceiptPreview receipt={viewReceipt} data={data} onDataChange={onDataChange} />
      </div>
    );
  }

  const columns = [
    { key: 'codigo', label: 'N° Recibo', mono: true, nowrap: true },
    { key: 'clientId', label: 'Cliente', render: v => clients.find(c => c.id === v)?.nombre || '—' },
    { key: 'fecha', label: 'Fecha', render: v => formatDate(v) },
    { key: 'paymentId', label: 'Monto', mono: true, render: v => {
      const p = payments.find(pay => pay.id === v);
      return p ? <span style={{ fontWeight: 700, color: '#16a34a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(p.monto)}</span> : '—';
    }},
    { key: 'paymentId', label: 'Método', render: v => payments.find(p => p.id === v)?.metodoPago || '—' },
    { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
    { key: '_acc', label: '', sortable: false, render: (_, row) => (
      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        <Btn size="sm" variant="ghost" onClick={() => setSelectedReceipt(row.id)}>Ver recibo</Btn>
        <Btn size="sm" variant="ghost" onClick={() => { setSelectedReceipt(row.id); setTimeout(() => window.print(), 400); }}>🖨️</Btn>
      </div>
    )},
  ];

  return (
    <div>
      <SectionHeader title="Recibos" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
        <KPICard label="Recibos emitidos"   value={receipts.filter(r => r.estado !== 'Anulado').length}                                                                                 accent="blue"  icon="🧾" />
        <KPICard label="Total documentado"   value={formatCurrency(receipts.filter(r => r.estado !== 'Anulado').reduce((s, r) => { const p = payments.find(pay => pay.id === r.paymentId); return s + (p?.monto || 0); }, 0))} accent="green" icon="💰" />
        <KPICard label="Anulados"            value={receipts.filter(r => r.estado === 'Anulado').length}                                                                                  accent="amber" icon="✕" sub="recibos" />
      </div>
      <Card>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={filters.cliente || ''} onChange={e => setFilters(f => ({ ...f, cliente: e.target.value }))} placeholder="🔍 Filtrar por cliente..." style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif', minWidth: 180 }} />
          <select value={filters.estado || ''} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">Todos los estados</option>
            {['Emitido','Anulado'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <DataTable columns={columns} data={filtered} onRowClick={row => setSelectedReceipt(row.id)} emptyMessage="Sin recibos" defaultSortKey="fecha" defaultSortDir="desc" tableId="recibos" />
      </Card>
    </div>
  );
}

Object.assign(window, { CuotasScreen, PagosScreen, RecibosScreen, RegistrarPagoModal, ReceiptPreview });
