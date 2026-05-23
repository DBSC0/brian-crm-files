// Clientes Screen + Ficha de Cliente

(function() {
  if (document.getElementById('crm-clientes-styles')) return;
  const s = document.createElement('style');
  s.id = 'crm-clientes-styles';
  s.textContent = '@keyframes riskPulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)} 50%{box-shadow:0 0 0 5px rgba(239,68,68,0)} }';
  document.head.appendChild(s);
})();

function formatDNI(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 3) return d;
  const rev = d.split('').reverse().join('');
  return rev.match(/.{1,3}/g).join('.').split('').reverse().join('');
}

function formatPhone(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)} ${d.slice(3)}`;
  return `${d.slice(0,3)} ${d.slice(3,6)}-${d.slice(6)}`;
}

const ESTADO_OPTIONS = [
  { value: 'Activo',    label: 'Activo',    bg: '#dcfce7', color: '#166534', border: '#86efac' },
  { value: 'Moroso',    label: 'Moroso',    bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  { value: 'Bloqueado', label: 'Bloqueado', bg: '#e5e7eb', color: '#374151', border: '#9ca3af' },
  { value: 'Inactivo',  label: 'Inactivo',  bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
];

const RIESGO_OPTIONS = [
  { value: 'Bajo',  label: 'Bajo',  bg: '#dcfce7', color: '#166534', border: '#86efac' },
  { value: 'Medio', label: 'Medio', bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  { value: 'Alto',  label: 'Alto',  bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', pulse: true },
];

function SegmentedPicker({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)} style={{
            flex: 1, padding: '7px 6px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            border: `1.5px solid ${active ? opt.border : '#e2e8f0'}`,
            background: active ? opt.bg : '#f8fafc',
            color: active ? opt.color : '#94a3b8',
            transition: 'all 0.15s',
            ...(active && opt.pulse ? { animation: 'riskPulse 1.8s ease-in-out infinite' } : {}),
          }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

function ClienteFormModal({ open, onClose, onSave, initial }) {
  const empty = { codigo:'', nombre:'', dni:'', telefono:'', telefonoSecundario:'', direccion:'', ciudad:'Rosario', referencia:'', estado:'Activo', riesgo:'Bajo', notas:'' };
  const [form, setForm] = React.useState(initial || empty);
  React.useEffect(() => { setForm(initial || empty); }, [open]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [errors, setErrors] = React.useState({});

  function validate() {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.dni.trim()) e.dni = 'Requerido';
    if (!form.telefono.trim()) e.telefono = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar cliente' : 'Nuevo cliente'} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn onClick={() => { if (validate()) onSave(form); }}>Guardar cliente</Btn></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Nombre completo" required error={errors.nombre}>
            <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. María González" />
          </Field>
        </div>
        <Field label="Código" hint={initial ? '' : 'Dejar vacío para generar automático'}>
          <Input value={form.codigo || ''} onChange={e => set('codigo', e.target.value)} placeholder="CLI-001" style={{ fontFamily: 'DM Mono, monospace' }} />
        </Field>
        <Field label="DNI" required error={errors.dni}>
          <Input value={form.dni} onChange={e => set('dni', formatDNI(e.target.value))} placeholder="42.326.470" />
        </Field>
        <Field label="Estado">
          <SegmentedPicker value={form.estado} onChange={v => set('estado', v)} options={ESTADO_OPTIONS} />
        </Field>
        <Field label="Teléfono principal" required error={errors.telefono}>
          <Input value={form.telefono} onChange={e => set('telefono', formatPhone(e.target.value))} placeholder="341 712-3351" />
        </Field>
        <Field label="Teléfono secundario">
          <Input value={form.telefonoSecundario} onChange={e => set('telefonoSecundario', formatPhone(e.target.value))} placeholder="341 652-6743" />
        </Field>
        <Field label="Dirección">
          <Input value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Calle y número" />
        </Field>
        <Field label="Ciudad">
          <Input value={form.ciudad} onChange={e => set('ciudad', e.target.value)} placeholder="Rosario" />
        </Field>
        <Field label="Riesgo">
          <SegmentedPicker value={form.riesgo} onChange={v => set('riesgo', v)} options={RIESGO_OPTIONS} />
        </Field>
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Referencia / Cómo llegó">
            <Input value={form.referencia || ''} onChange={e => set('referencia', e.target.value)} placeholder="Referido por..." />
          </Field>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Notas internas">
            <Textarea value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones sobre el cliente..." rows={2} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function ClientesScreen({ data, onNav, onDataChange }) {
  const { clients, installments, operations, payments } = data;
  const [search, setSearch] = React.useState('');
  const [filters, setFilters] = React.useState({});
  const [showForm, setShowForm] = React.useState(false);
  const [editClient, setEditClient] = React.useState(null);
  const today = new Date();

  const filtered = clients.filter(c => {
    if (search && !c.nombre.toLowerCase().includes(search.toLowerCase()) && !c.dni.includes(search) && !c.telefono.includes(search) && !c.codigo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.estado && c.estado !== filters.estado) return false;
    if (filters.riesgo && c.riesgo !== filters.riesgo) return false;
    return true;
  });

  async function handleSave(form) {
    const sb = window.__supabase;
    if (editClient) {
      const { error } = await sb.from('clients').update(toSnake(form)).eq('id', editClient.id);
      if (error) { alert('Error al guardar: ' + error.message); return; }
      onDataChange('clients', data.clients.map(c => c.id === editClient.id ? { ...c, ...form } : c));
    } else {
      const { data: inserted, error } = await sb.from('clients')
        .insert(toSnake({ ...form, createdAt: new Date().toISOString().slice(0,10) }))
        .select().single();
      if (error) { alert('Error al crear cliente: ' + error.message); return; }
      onDataChange('clients', [...data.clients, toCamel(inserted)]);
    }
    setShowForm(false);
    setEditClient(null);
  }

  const columns = [
    { key: 'codigo', label: 'Código', mono: true, nowrap: true },
    { key: 'nombre', label: 'Nombre', render: (v, row) => (
      <button onClick={e => { e.stopPropagation(); onNav('clientes', row.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#4f46e5', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>{v}</button>
    )},
    { key: 'dni', label: 'DNI', mono: true },
    { key: 'telefono', label: 'Teléfono', nowrap: true },
    { key: 'direccion', label: 'Domicilio', nowrap: true },
    { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
    { key: 'riesgo', label: 'Riesgo', render: v => <StatusBadge status={v} /> },
    { key: '_saldo', label: 'Saldo pendiente', mono: true, nowrap: true,
      sortValue: row => calculateClientBalance(row.id, installments, payments, operations).saldoPendiente,
      render: (_, row) => {
        const bal = calculateClientBalance(row.id, installments, payments, operations);
        return <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: bal.saldoPendiente > 0 ? '#0f172a' : '#94a3b8' }}>{formatCurrency(bal.saldoPendiente)}</span>;
      }},
    { key: '_vencido', label: 'Vencido', mono: true, nowrap: true,
      sortValue: row => calculateClientBalance(row.id, installments, payments, operations).montoVencido,
      render: (_, row) => {
        const bal = calculateClientBalance(row.id, installments, payments, operations);
        return <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: bal.montoVencido > 0 ? '#dc2626' : '#94a3b8' }}>{formatCurrency(bal.montoVencido)}</span>;
      }},
    { key: '_acciones', label: 'Acciones', sortable: false, render: (_, row) => (
      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        <Btn size="sm" variant="ghost" onClick={() => onNav('clientes', row.id)}>Ver</Btn>
        <Btn size="sm" variant="ghost" onClick={() => { setEditClient(row); setShowForm(true); }}>✏️</Btn>
        <Btn size="sm" variant="ghost" onClick={() => onNav('operaciones', null, 'nuevo', row.id)}>+ Op</Btn>
        <WAButton phone={row.telefono} message={`Hola ${row.nombre}!`} />
      </div>
    )},
  ];

  return (
    <div>
      <SectionHeader title="Clientes" actions={
        <Btn onClick={() => { setEditClient(null); setShowForm(true); }}>+ Nuevo cliente</Btn>
      } />
      <Card>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f8fafc' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, DNI, teléfono..." style={{
                width: '100%', padding: '7px 10px 7px 28px', borderRadius: 8,
                border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
                boxSizing: 'border-box', outline: 'none',
              }} />
            </div>
            <select value={filters.estado || ''} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
              <option value="">Todos los estados</option>
              {['Activo','Moroso','Bloqueado','Inactivo'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filters.riesgo || ''} onChange={e => setFilters(f => ({ ...f, riesgo: e.target.value }))} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
              <option value="">Todos los riesgos</option>
              {['Bajo','Medio','Alto'].map(r => <option key={r}>{r}</option>)}
            </select>
            <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'DM Sans, sans-serif' }}>{maskSensitiveNumber(filtered.length)} cliente{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <DataTable columns={columns} data={filtered} onRowClick={row => onNav('clientes', row.id)} emptyMessage="No se encontraron clientes" defaultSortKey="codigo" defaultSortDir="asc" tableId="clientes" />
      </Card>
      <ClienteFormModal open={showForm} onClose={() => { setShowForm(false); setEditClient(null); }} onSave={handleSave} initial={editClient} />
    </div>
  );
}

function ClientIcon({ name, color = '#4f46e5', size = 18 }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    chart: (
      <>
        <path {...common} d="M4 19V11" />
        <path {...common} d="M10 19V5" />
        <path {...common} d="M16 19V8" />
        <path {...common} d="M21 19H3" />
      </>
    ),
    user: (
      <>
        <path {...common} d="M20 21a8 8 0 0 0-16 0" />
        <circle {...common} cx="12" cy="7" r="4" />
      </>
    ),
    shield: <path {...common} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
    briefcase: (
      <>
        <rect {...common} x="3" y="7" width="18" height="13" rx="2" />
        <path {...common} d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path {...common} d="M3 13h18" />
      </>
    ),
    calendar: (
      <>
        <rect {...common} x="3" y="4" width="18" height="18" rx="2" />
        <path {...common} d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    wallet: (
      <>
        <path {...common} d="M3 7h18v12H3z" />
        <path {...common} d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" />
      </>
    ),
    check: (
      <>
        <rect {...common} x="4" y="4" width="16" height="16" rx="3" />
        <path {...common} d="m8 12 3 3 5-6" />
      </>
    ),
    hourglass: (
      <>
        <path {...common} d="M6 3h12M6 21h12M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />
      </>
    ),
    alert: (
      <>
        <path {...common} d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path {...common} d="M12 9v4M12 17h.01" />
      </>
    ),
    phone: <path {...common} d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1A19.5 19.5 0 0 1 5.2 13 19.8 19.8 0 0 1 2.1 4.4 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />,
    edit: <path {...common} d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
    note: (
      <>
        <path {...common} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path {...common} d="M14 2v6h6M8 13h8M8 17h6" />
      </>
    ),
    trash: (
      <>
        <path {...common} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        <path {...common} d="M10 11v6M14 11v6" />
      </>
    ),
    chevron: <path {...common} d="m9 18 6-6-6-6" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      {paths[name] || paths.chart}
    </svg>
  );
}

function ClientMetricCard({ icon, label, value, color, bg, onClick }) {
  const content = (
    <>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <ClientIcon name={icon} color={color} size={21} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 22, color, fontWeight: 800, fontFamily: 'DM Mono, monospace', lineHeight: 1.1 }}>{value}</div>
      </div>
      {onClick && <ClientIcon name="chevron" color="#64748b" size={18} />}
    </>
  );
  const style = {
    display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
    boxShadow: '0 8px 22px rgba(15,23,42,0.05)', width: '100%', minWidth: 0,
    fontFamily: 'DM Sans, sans-serif', textAlign: 'left',
  };
  if (!onClick) return <div style={style}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#fbfdff'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}
      style={{ ...style, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s' }}
    >
      {content}
    </button>
  );
}

function ClientFinancialSummaryCard({ bal, gananciaObtenida, isMobile }) {
  const metrics = [
    { label: 'Total a recuperar', value: formatCurrency(bal.totalPactado), color: '#4f46e5' },
    { label: 'Total pagado', value: formatCurrency(bal.totalPagado), color: '#059669' },
    { label: 'Ganancia obtenida', value: formatCurrency(gananciaObtenida), color: '#059669' },
    { label: 'Ganancia proyectada', value: formatCurrency(bal.gananciaEsperada), color: '#4f46e5' },
  ];
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: 16, boxShadow: '0 10px 28px rgba(15,23,42,0.06)', padding: isMobile ? 20 : 26,
    }}>
      <div style={{ position: 'absolute', right: -70, top: -95, width: 260, height: 250, borderRadius: '45%', background: 'rgba(99,102,241,0.12)' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClientIcon name="chart" color="#4f46e5" size={24} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Resumen financiero</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Capital activo</div>
          </div>
        </div>
        <div style={{ fontSize: isMobile ? 34 : 44, fontWeight: 900, color: '#0f172a', fontFamily: 'DM Mono, monospace', lineHeight: 1, marginBottom: 26 }}>
          {formatCurrency(bal.capitalInvertido)}
        </div>
        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 18 }} />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: isMobile ? 14 : 0 }}>
          {metrics.map((m, idx) => (
            <div key={m.label} style={{ padding: isMobile ? 0 : '0 18px', borderLeft: !isMobile && idx > 0 ? '1px solid #e5e7eb' : 'none' }}>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 700, marginBottom: 10 }}>{m.label}</div>
              <div style={{ fontSize: isMobile ? 17 : 22, color: m.color, fontWeight: 900, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientStatusCard({ client, bal, overdueInst, nextInst, onViewCuotas, onPay, isMobile }) {
  const statusRows = [
    { icon: 'user', label: 'Estado', value: client.estado, color: client.estado === 'Activo' ? '#16a34a' : '#64748b' },
    { icon: 'shield', label: 'Riesgo', value: client.riesgo, color: client.riesgo === 'Alto' ? '#dc2626' : client.riesgo === 'Medio' ? '#f97316' : '#16a34a' },
    { icon: 'briefcase', label: 'Operaciones activas', value: maskSensitiveNumber(bal.opActivas), color: '#2563eb' },
    { icon: 'calendar', label: 'Cuotas vencidas', value: maskSensitiveNumber(overdueInst.length), color: overdueInst.length ? '#dc2626' : '#16a34a' },
    { icon: 'alert', label: 'Vencido', value: formatCurrency(bal.montoVencido), color: bal.montoVencido > 0 ? '#dc2626' : '#16a34a' },
    { icon: 'calendar', label: 'Próximo vencimiento', value: nextInst ? `${formatDate(nextInst.fechaVencimiento)} (${nextInst.codigo})` : 'Sin vencimientos', color: nextInst ? '#f97316' : '#64748b' },
  ];
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 10px 28px rgba(15,23,42,0.06)', padding: isMobile ? 20 : 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ClientIcon name="user" color="#0f172a" size={22} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Estado del cliente</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 22 }}>
        {statusRows.map(row => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
            <ClientIcon name={row.icon} color={row.color} size={18} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</div>
              <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 700, marginTop: 3, overflowWrap: 'anywhere' }}>{row.value}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.15fr', gap: 10 }}>
        <Btn variant="secondary" onClick={onViewCuotas} style={{ justifyContent: 'center' }}><ClientIcon name="calendar" color="#475569" size={16} /> Ver cuotas</Btn>
        <Btn onClick={onPay} style={{ justifyContent: 'center' }}><ClientIcon name="wallet" color="#fff" size={16} /> Registrar pago</Btn>
      </div>
    </div>
  );
}

// ============================================================
// FICHA DE CLIENTE
// ============================================================
function ClienteDetalleScreen({ clientId, data, onNav, onDataChange }) {
  const { clients, operations, installments, payments, receipts, internalOperationVouchers, clientNotes, attachments, creditCards, creditCardMovements } = data;
  const client = clients.find(c => c.id === clientId);
  const [activeTab, setActiveTab] = React.useState('resumen');
  const [showEditForm, setShowEditForm] = React.useState(false);
  const [showNoteForm, setShowNoteForm] = React.useState(false);
  const [newNote, setNewNote] = React.useState({ tipo: 'Observación interna', contenido: '', recordatorio: '' });
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [viewportWidth, setViewportWidth] = React.useState(() => window.innerWidth || 1200);

  React.useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth || 1200);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!client) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cliente no encontrado.</div>;

  const clientOps = operations.filter(o => o.clientId === clientId);
  const clientInst = installments.filter(i => i.clientId === clientId);
  const clientPays = payments.filter(p => p.clientId === clientId);
  const clientReceipts = receipts.filter(r => r.clientId === clientId);
  const clientVouchers = internalOperationVouchers.filter(v => v.clientId === clientId);
  const clientNotesData = (clientNotes || []).filter(n => n.clientId === clientId);
  const clientAttachments = (attachments || []).filter(a => a.clientId === clientId);
  const bal = calculateClientBalance(clientId, installments, payments, operations);
  const today = new Date();
  const overdueInst = clientInst.filter(i => new Date(i.fechaVencimiento) < today && i.saldoPendiente > 0);
  const activeOps = clientOps.filter(o => o.estado === 'Activa');
  const gananciaObtenida = Math.max(0, bal.totalPagado - bal.capitalInvertido);
  const nextInst = bal.nextInst;
  const isMobile = viewportWidth < 720;
  const isTablet = viewportWidth < 1120;
  const dashboardGrid = isTablet ? '1fr' : '2fr 1fr';
  const metricGrid = isMobile ? '1fr' : isTablet ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))';
  const resumenGrid = viewportWidth < 980 ? '1fr' : '1fr 1fr';

  async function addNote() {
    if (!newNote.contenido.trim()) return;
    const sb = window.__supabase;
    const { data: inserted, error } = await sb.from('client_notes')
      .insert(toSnake({ clientId, operationId: null, tipo: newNote.tipo, contenido: newNote.contenido, fecha: new Date().toISOString().slice(0,10), recordatorio: newNote.recordatorio || null }))
      .select().single();
    if (error) { alert('Error al guardar nota: ' + error.message); return; }
    onDataChange('clientNotes', [...(data.clientNotes || []), toCamel(inserted)]);
    setNewNote({ tipo: 'Observación interna', contenido: '', recordatorio: '' });
    setShowNoteForm(false);
  }

  const tabs = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'operaciones', label: 'Operaciones', count: clientOps.length },
    { id: 'cuotas', label: 'Cuotas', count: clientInst.length },
    { id: 'pagos', label: 'Pagos', count: clientPays.length },
    { id: 'recibos', label: 'Recibos', count: clientReceipts.length },
    { id: 'comprobantes', label: 'Comprobantes', count: clientVouchers.length },
    { id: 'notas', label: 'Notas', count: clientNotesData.length },
    { id: 'archivos', label: 'Archivos', count: clientAttachments.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', fontFamily: 'DM Sans, sans-serif' }}>
        <button onClick={() => onNav('clientes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>Clientes</button>
        <span>›</span>
        <span style={{ color: '#374151', fontWeight: 600 }}>{client.nombre}</span>
      </div>

      <Card style={{ padding: isMobile ? 18 : '22px 26px', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 10px 26px rgba(15,23,42,0.06)' }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 22, flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, fontWeight: 800, color: '#fff', fontFamily: 'DM Sans, sans-serif',
            boxShadow: '0 12px 24px rgba(79,70,229,0.22)',
          }}>{client.nombre[0]}</div>
          <div style={{ flex: '1 1 360px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? 24 : 28, fontWeight: 900, color: '#0f172a', fontFamily: 'DM Sans, sans-serif', letterSpacing: 0 }}>{client.nombre}</h2>
              <StatusBadge status={client.estado} size="md" />
              <StatusBadge status={client.riesgo} size="md" />
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 10 : 18, flexWrap: 'wrap', fontSize: 13, color: '#475569', fontFamily: 'DM Sans, sans-serif', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ClientIcon name="note" color="#64748b" size={15} />{client.codigo}</span>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ClientIcon name="user" color="#64748b" size={15} />{client.dni}</span>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ClientIcon name="phone" color="#64748b" size={15} />{client.telefono}</span>
              {client.direccion && <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ClientIcon name="shield" color="#64748b" size={15} />{client.direccion}</span>}
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ClientIcon name="calendar" color="#64748b" size={15} />Cliente desde {formatDate(client.createdAt)}</span>
            </div>
            {client.notas && <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>"{client.notas}"</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end', flex: isMobile ? '1 1 100%' : '0 1 540px' }}>
            <WAButton phone={client.telefono} message={`Hola ${client.nombre}!`} size="md" />
            <Btn size="md" variant="secondary" onClick={() => setShowEditForm(true)}><ClientIcon name="edit" color="#374151" size={15} /> Editar</Btn>
            <Btn size="md" onClick={() => onNav('operaciones', null, 'nuevo', clientId)}>+ Operación</Btn>
            <Btn size="md" variant="secondary" onClick={() => onNav('pagos', null, 'nuevo', clientId)}><ClientIcon name="wallet" color="#475569" size={15} /> Registrar pago</Btn>
            <Btn size="md" variant="secondary" onClick={() => { setActiveTab('notas'); setShowNoteForm(true); }}><ClientIcon name="note" color="#475569" size={15} /> Nota</Btn>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: dashboardGrid, gap: 16 }}>
        <ClientFinancialSummaryCard bal={bal} gananciaObtenida={gananciaObtenida} isMobile={isMobile} />
        <ClientStatusCard
          client={client}
          bal={bal}
          overdueInst={overdueInst}
          nextInst={nextInst}
          isMobile={isMobile}
          onViewCuotas={() => setActiveTab('cuotas')}
          onPay={() => onNav('pagos', null, 'nuevo', clientId)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: metricGrid, gap: 14 }}>
        <ClientMetricCard icon="hourglass" label="Pendiente de cobro" value={formatCurrency(bal.saldoPendiente)} color="#4f46e5" bg="#ede9fe" onClick={() => setActiveTab('cuotas')} />
        <ClientMetricCard icon="check" label="Ganancia obtenida" value={formatCurrency(gananciaObtenida)} color="#059669" bg="#dcfce7" onClick={() => setActiveTab('pagos')} />
        <ClientMetricCard icon="briefcase" label="Operaciones activas" value={maskSensitiveNumber(bal.opActivas)} color="#2563eb" bg="#dbeafe" onClick={() => setActiveTab('operaciones')} />
        <ClientMetricCard icon="calendar" label="Cuotas vencidas" value={maskSensitiveNumber(overdueInst.length)} color={overdueInst.length ? '#dc2626' : '#059669'} bg={overdueInst.length ? '#fee2e2' : '#dcfce7'} onClick={() => setActiveTab('cuotas')} />
      </div>

      <div style={{ display: 'none' }}>
      {/* Header Card */}
      <Card style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: 'DM Sans, sans-serif',
          }}>{client.nombre[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Sans, sans-serif' }}>{client.nombre}</h2>
              <StatusBadge status={client.estado} size="md" />
              <StatusBadge status={client.riesgo} size="md" />
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#64748b', fontFamily: 'DM Sans, sans-serif' }}>
              <span>📋 {client.codigo}</span>
              <span>🪪 {client.dni}</span>
              <span>📞 {client.telefono}</span>
              {client.direccion && <span>📍 {client.direccion}</span>}
              <span>📅 Cliente desde {formatDate(client.createdAt)}</span>
            </div>
            {client.notas && <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>"{client.notas}"</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <WAButton phone={client.telefono} message={`Hola ${client.nombre}!`} size="md" />
            <Btn size="sm" variant="secondary" onClick={() => setShowEditForm(true)}>✏️ Editar</Btn>
            <Btn size="sm" onClick={() => onNav('operaciones', null, 'nuevo', clientId)}>+ Operación</Btn>
            <Btn size="sm" variant="secondary" onClick={() => onNav('pagos', null, 'nuevo', clientId)}>💳 Registrar pago</Btn>
            <Btn size="sm" variant="ghost" onClick={() => { setActiveTab('notas'); setShowNoteForm(true); }}>📝 Nota</Btn>
          </div>
        </div>
      </Card>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <KPICard label="Capital invertido" value={formatCurrency(bal.capitalInvertido)} accent="slate"  icon="💰" />
        <KPICard label="Total esperado"    value={formatCurrency(bal.totalPactado)}     accent="blue"   icon="📊" />
        <KPICard label="Saldo pendiente"   value={formatCurrency(bal.saldoPendiente)}   accent="blue"   icon="⏳" />
        <KPICard label="Monto vencido"     value={formatCurrency(bal.montoVencido)}     accent="red"    icon="⚠️" />
        <KPICard label="Total pagado"      value={formatCurrency(bal.totalPagado)}      accent="green"  icon="✅" />
        <KPICard label="Ganancia esperada" value={formatCurrency(bal.gananciaEsperada)} accent="purple" icon="📈" />
        <KPICard label="Op. activas"       value={bal.opActivas}                        accent="blue"   icon="🔄" sub="operaciones" />
        <KPICard label="Cuotas vencidas"   value={overdueInst.length}                  accent={overdueInst.length > 0 ? 'red' : 'green'} icon="📅" sub="cuotas" />
      </div>

      </div>

      {/* Tabs */}
      <Card style={{ padding: 0, overflow: 'hidden', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 10px 26px rgba(15,23,42,0.05)' }}>
        <div style={{ padding: '0 16px' }}>
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
        <div style={{ padding: isMobile ? 12 : 16 }}>
          {activeTab === 'resumen' && (
            <div style={{ display: 'grid', gridTemplateColumns: resumenGrid, gap: 16 }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                  <ClientIcon name="briefcase" color="#2563eb" size={18} /> Operaciones activas
                </div>
                {activeOps.length === 0 ? <EmptyState title="Sin operaciones activas" icon="📋" /> :
                  activeOps.map(op => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => onNav('operaciones', op.id)}
                      title={`Abrir ${op.codigo}`}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#eef2ff'; }}
                      style={{
                        width: '100%', padding: '12px 14px', background: '#fff', border: '1px solid #eef2ff',
                        borderRadius: 10, marginBottom: 8, cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s, border-color 0.15s',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#4f46e5', fontFamily: 'DM Mono, monospace' }}>{op.codigo}</div>
                        <div style={{ fontSize: 14, color: '#0f172a', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{op.descripcion}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(op.totalEsperado)}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{maskSensitiveNumber(op.cantidadCuotas)} cuotas</div>
                      </div>
                      <ClientIcon name="chevron" color="#64748b" size={17} />
                    </button>
                  ))
                }
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                  <ClientIcon name="calendar" color="#475569" size={18} /> Cuotas próximas / vencidas
                </div>
                {(() => {
                  const now = new Date(); now.setHours(0,0,0,0);
                  const rows = [...clientInst].filter(i => i.saldoPendiente > 0)
                    .sort((a, b) => {
                      const ao = new Date(a.fechaVencimiento) < now ? 0 : 1;
                      const bo = new Date(b.fechaVencimiento) < now ? 0 : 1;
                      return ao - bo || a.fechaVencimiento.localeCompare(b.fechaVencimiento);
                    })
                    .slice(0, 6);
                  if (rows.length === 0) return <EmptyState title="Sin cuotas pendientes" icon="📅" />;
                  return rows.map(inst => {
                    const due = new Date(inst.fechaVencimiento + 'T00:00:00');
                    const isOverdue = due < now;
                    const rowBg = isOverdue ? '#fef2f2' : '#f8fafc';
                    return (
                      <div key={inst.id} style={{ padding: '11px 13px', background: rowBg, borderRadius: 10, marginBottom: 8, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr auto', gap: isMobile ? 8 : 12, alignItems: 'center', borderLeft: `3px solid ${isOverdue ? '#dc2626' : '#4f46e5'}` }}>
                        <div>
                          <span style={{ fontSize: 13, color: '#4f46e5', fontWeight: 900, fontFamily: 'DM Mono, monospace' }}>{inst.codigo}</span>
                          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>Cuota {maskSensitiveNumber(inst.numeroCuota)}/{maskSensitiveNumber(inst.totalCuotas)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? 800 : 600 }}>Vence: {formatDate(inst.fechaVencimiento)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                          <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'DM Mono, monospace', color: '#0f172a' }}>{formatCurrency(inst.saldoPendiente)}</span>
                          <StatusBadge status={inst.estado} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {false && activeTab === 'resumen' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Operaciones activas</div>
                {clientOps.filter(o => o.estado === 'Activa').length === 0 ? <EmptyState title="Sin operaciones activas" icon="📋" /> :
                  clientOps.filter(o => o.estado === 'Activa').map(op => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => onNav('operaciones', op.id)}
                      title={`Abrir ${op.codigo}`}
                      onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'transparent'; }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: '#f8fafc',
                        border: '1px solid transparent',
                        borderRadius: 8,
                        marginBottom: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'DM Sans, sans-serif',
                        transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', fontFamily: 'DM Mono, monospace' }}>{op.codigo}</span>
                          <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{op.descripcion}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(op.totalEsperado)}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{op.cantidadCuotas} cuotas</div>
                        </div>
                      </div>
                    </button>
                  ))
                }
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Cuotas próximas / vencidas</div>
                {(() => {
                  const now = new Date(); now.setHours(0,0,0,0);
                  function instStyle(inst) {
                    const due = new Date(inst.fechaVencimiento + 'T00:00:00');
                    const daysUntil = Math.ceil((due - now) / 86400000);
                    if (daysUntil < 0)  return { bg: '#fee2e2', border: '#dc2626', dateColor: '#dc2626', dateBold: true };
                    if (daysUntil <= 3) return { bg: '#fff7ed', border: '#f97316', dateColor: '#c2410c', dateBold: true };
                    if (due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear())
                      return { bg: '#fefce8', border: '#ca8a04', dateColor: '#854d0e', dateBold: true };
                    return { bg: '#f8fafc', border: 'transparent', dateColor: '#374151', dateBold: false };
                  }
                  return [...clientInst].filter(i => i.saldoPendiente > 0)
                    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))
                    .slice(0, 5)
                    .map(inst => {
                      const s = instStyle(inst);
                      return (
                        <div key={inst.id} style={{ padding: '8px 12px', background: s.bg, borderRadius: 8, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${s.border}` }}>
                          <div>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{inst.codigo} · Cuota {maskSensitiveNumber(inst.numeroCuota)}/{maskSensitiveNumber(inst.totalCuotas)}</span>
                            <div style={{ fontSize: 12, color: s.dateColor, fontWeight: s.dateBold ? 600 : 400 }}>Vence: {formatDate(inst.fechaVencimiento)}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#0f172a' }}>{formatCurrency(inst.saldoPendiente)}</span>
                            <StatusBadge status={inst.estado} />
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </div>
          )}

          {activeTab === 'operaciones' && (
            <DataTable
              tableId="cliente-ops"
              columns={[
                { key: 'codigo', label: 'Código', mono: true },
                { key: 'tipo', label: 'Tipo' },
                { key: 'descripcion', label: 'Descripción' },
                { key: 'cantidadCuotas', label: 'Cuotas', render: (v, row) => `${maskSensitiveNumber(v)}c / ${formatCurrency(row.valorCuota)}` },
                { key: 'totalEsperado', label: 'Total', mono: true, render: v => formatCurrency(v) },
                { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
                { key: '_acc', label: '', sortable: false, render: (_, row) => <Btn size="sm" variant="ghost" onClick={() => onNav('operaciones', row.id)}>Ver →</Btn> },
              ]}
              data={clientOps}
              emptyMessage="Sin operaciones"
            />
          )}

          {activeTab === 'cuotas' && (
            <DataTable
              tableId="cliente-cuotas"
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
              data={clientInst}
              emptyMessage="Sin cuotas"
            />
          )}

          {activeTab === 'pagos' && (
            <DataTable
              tableId="cliente-pagos"
              defaultSortKey="fechaPago" defaultSortDir="desc"
              columns={[
                { key: 'codigo', label: 'Código', mono: true },
                { key: 'fechaPago', label: 'Fecha', render: v => formatDate(v) },
                { key: 'monto', label: 'Monto', mono: true, render: v => <span style={{ fontWeight: 700, color: '#16a34a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</span> },
                { key: 'metodoPago', label: 'Método' },
                { key: 'notas', label: 'Notas' },
              ]}
              data={clientPays}
              emptyMessage="Sin pagos"
            />
          )}

          {activeTab === 'recibos' && (
            <DataTable
              tableId="cliente-recibos"
              defaultSortKey="fecha" defaultSortDir="desc"
              columns={[
                { key: 'codigo', label: 'Número', mono: true },
                { key: 'fecha', label: 'Fecha', render: v => formatDate(v) },
                { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
                { key: '_monto', label: 'Monto', mono: true, render: (_, row) => {
                  const pay = data.payments.find(p => p.id === row.paymentId);
                  return formatCurrency(pay?.monto);
                }},
                { key: '_acc', label: '', sortable: false, render: (_, row) => (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn size="sm" variant="ghost" onClick={() => onNav('recibos', row.id)}>Ver recibo</Btn>
                  </div>
                )},
              ]}
              data={clientReceipts}
              emptyMessage="Sin recibos"
            />
          )}

          {activeTab === 'comprobantes' && (
            <DataTable
              tableId="cliente-comprobantes"
              columns={[
                { key: 'codigo', label: 'Código', mono: true },
                { key: 'fecha', label: 'Fecha', render: v => formatDate(v) },
                { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
                { key: '_op', label: 'Operación', render: (_, row) => {
                  const op = operations.find(o => o.id === row.operationId);
                  return op ? <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{op.codigo}</span> : '—';
                }},
                { key: '_acc', label: '', sortable: false, render: (_, row) => <Btn size="sm" variant="ghost" onClick={() => onNav('comprobantes', row.id)}>Ver</Btn> },
              ]}
              data={clientVouchers}
              emptyMessage="Sin comprobantes"
            />
          )}

          {activeTab === 'notas' && (
            <div>
              {showNoteForm && (
                <Card style={{ padding: 16, marginBottom: 16, background: '#f8fafc' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>Nueva nota</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <Field label="Tipo">
                      <Select value={newNote.tipo} onChange={e => setNewNote(n => ({ ...n, tipo: e.target.value }))}>
                        {['WhatsApp','Llamada','Visita','Promesa de pago','Problema','Acuerdo','Observación interna','Otro'].map(t => <option key={t}>{t}</option>)}
                      </Select>
                    </Field>
                    <Field label="Recordatorio (opcional)">
                      <Input type="date" value={newNote.recordatorio} onChange={e => setNewNote(n => ({ ...n, recordatorio: e.target.value }))} />
                    </Field>
                    <div style={{ gridColumn: '1/-1' }}>
                      <Field label="Contenido">
                        <Textarea value={newNote.contenido} onChange={e => setNewNote(n => ({ ...n, contenido: e.target.value }))} placeholder="Describe el contacto..." />
                      </Field>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn onClick={addNote}>Guardar nota</Btn>
                    <Btn variant="secondary" onClick={() => setShowNoteForm(false)}>Cancelar</Btn>
                  </div>
                </Card>
              )}
              {!showNoteForm && <div style={{ marginBottom: 12 }}><Btn size="sm" onClick={() => setShowNoteForm(true)}>+ Agregar nota</Btn></div>}
              {clientNotesData.length === 0 ? <EmptyState title="Sin notas" icon="📝" sub="Agregá notas de contacto para registrar el historial." /> :
                [...clientNotesData].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(note => (
                  <div key={note.id} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 8, marginBottom: 8, borderLeft: '3px solid #6366f1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{note.tipo}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'DM Mono, monospace' }}>{formatDate(note.fecha)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>{note.contenido}</div>
                    {note.recordatorio && <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>⏰ Recordatorio: {formatDate(note.recordatorio)}</div>}
                  </div>
                ))
              }
            </div>
          )}

          {activeTab === 'archivos' && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <Btn size="sm" variant="secondary">📎 Subir archivo (mock)</Btn>
              </div>
              {clientAttachments.length === 0 ? <EmptyState title="Sin archivos" icon="📁" sub="Subí comprobantes o documentos del cliente." /> :
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {clientAttachments.map(att => (
                    <div key={att.id} style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{att.nombreArchivo}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{att.tipo}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(att.fecha)}</div>
                      {att.descripcion && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>{att.descripcion}</div>}
                    </div>
                  ))}
                </div>
              }
            </div>
          )}
        </div>
      </Card>

      <ClienteFormModal open={showEditForm} onClose={() => setShowEditForm(false)} onSave={async form => {
        const sb = window.__supabase;
        const { error } = await sb.from('clients').update(toSnake(form)).eq('id', clientId);
        if (error) { alert('Error al guardar: ' + error.message); return; }
        onDataChange('clients', data.clients.map(c => c.id === clientId ? { ...c, ...form } : c));
        setShowEditForm(false);
      }} initial={client} />

      {/* Zona peligrosa */}
      <div style={{ borderTop: '1px solid #fecaca', paddingTop: 16, marginTop: 4 }}>
        <Btn variant="danger" onClick={() => {
          const hasOps = data.operations.some(o => o.clientId === clientId);
          if (hasOps) { alert('No se puede eliminar un cliente con operaciones registradas. Eliminá las operaciones primero.'); return; }
          setConfirmDelete(true);
        }} style={{ borderColor: '#fca5a5', background: '#fff1f2', color: '#b91c1c' }}><ClientIcon name="trash" color="#b91c1c" size={15} /> Eliminar cliente</Btn>
      </div>
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        loading={deleting}
        title="Eliminar cliente"
        message={`¿Eliminar al cliente "${client.nombre}"? También se eliminarán sus notas y archivos. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar cliente"
        onConfirm={async () => {
          setDeleting(true);
          const sb = window.__supabase;
          await sb.from('client_notes').delete().eq('client_id', clientId);
          await sb.from('attachments').delete().eq('client_id', clientId);
          const { error } = await sb.from('clients').delete().eq('id', clientId);
          setDeleting(false);
          if (error) { alert('Error al eliminar: ' + error.message); return; }
          onDataChange('clientNotes', (data.clientNotes || []).filter(n => n.clientId !== clientId));
          onDataChange('attachments', (data.attachments || []).filter(a => a.clientId !== clientId));
          onDataChange('clients', data.clients.filter(c => c.id !== clientId));
          onNav('clientes');
        }}
      />
    </div>
  );
}

Object.assign(window, { ClientesScreen, ClienteDetalleScreen });
