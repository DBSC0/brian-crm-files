// Dashboard Screen
function DashboardScreen({ data, onNav }) {
  const { clients, operations, installments, payments, creditCards, creditCardMovements, cashMovements } = data;
  const metrics = getDashboardMetrics(clients, operations, installments, payments, creditCards, creditCardMovements);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // ── KPI catalog ──────────────────────────────────────────────
  const kpiCatalog = [
    { id: 'capitalInvertido',  label: 'Capital invertido',  icon: '💰', accent: 'slate',  getValue: m => formatCurrency(m.capitalInvertido) },
    { id: 'totalEsperado',     label: 'Total esperado',     icon: '📊', accent: 'blue',   getValue: m => formatCurrency(m.totalEsperado) },
    { id: 'saldoPendiente',    label: 'Saldo pendiente',    icon: '⏳', accent: 'blue',   getValue: m => formatCurrency(m.saldoPendiente) },
    { id: 'montoVencido',      label: 'Monto vencido',      icon: '⚠️', accent: 'red',    getValue: m => formatCurrency(m.montoVencido) },
    { id: 'cobradoEsteMes',    label: 'Cobrado este mes',   icon: '✅', accent: 'green',  getValue: m => formatCurrency(m.cobradoEsteMes) },
    { id: 'gananciaEsperada',  label: 'Ganancia esperada',  icon: '📈', accent: 'purple', getValue: m => formatCurrency(m.gananciaEsperada) },
    { id: 'clientesEnMora',    label: 'Clientes en mora',   icon: '🔴', accent: 'red',    getValue: m => m.clientesEnMora, sub: 'con cuotas vencidas' },
    { id: 'capitalEfectivo',   label: 'Capital efectivo',   icon: '💵', accent: 'slate',  getValue: m => formatCurrency(m.capitalEfectivo) },
    { id: 'capitalTarjeta',    label: 'Capital en tarjeta', icon: '💳', accent: 'purple', getValue: m => formatCurrency(m.capitalTarjeta) },
    { id: 'gananciaRealizada', label: 'Ganancia realizada', icon: '💹', accent: 'green',  getValue: m => formatCurrency(Math.max(0, m.gananciaRealizada)) },
    { id: 'opActivas',         label: 'Op. activas',        icon: '🔄', accent: 'blue',   getValue: (m, ops) => ops.filter(o => o.estado === 'Activa').length, sub: 'operaciones' },
    { id: 'proxVencimientos',  label: 'Próx. vencimientos', icon: '📅', accent: 'amber',  getValue: m => m.proxVencimientos.length, sub: 'en 15 días' },
  ];

  // ── Layout persistence ────────────────────────────────────────
  const LS_KEY = 'crm-dashboard-layout';
  function loadLayout() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
  function saveLayout(patch) { try { localStorage.setItem(LS_KEY, JSON.stringify({ ...loadLayout(), ...patch })); } catch {} }

  const defaultOrder = kpiCatalog.map(k => k.id);
  const [order,   setOrder]   = React.useState(() => { const s = loadLayout(); return s.order   || defaultOrder; });
  const [hidden,  setHidden]  = React.useState(() => { const s = loadLayout(); return new Set(s.hidden || []); });
  const [editMode, setEditMode] = React.useState(false);
  const [dragId,   setDragId]   = React.useState(null);
  const [dragOver, setDragOver] = React.useState(null);

  function toggleHide(id) {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveLayout({ hidden: [...next] });
      return next;
    });
  }

  function handleDrop(targetId) {
    if (!dragId || dragId === targetId) return;
    setOrder(prev => {
      const arr = [...prev];
      const from = arr.indexOf(dragId);
      const to   = arr.indexOf(targetId);
      arr.splice(from, 1);
      arr.splice(to, 0, dragId);
      saveLayout({ order: arr });
      return arr;
    });
    setDragId(null); setDragOver(null);
  }

  // ── Urgency helper (same as Cronograma) ──────────────────────
  function instUrgency(inst) {
    if (inst.saldoPendiente === 0) return null;
    const due = new Date(inst.fechaVencimiento + 'T00:00:00');
    const days = Math.ceil((due - today) / 86400000);
    if (days < 0)  return { border: '#dc2626', bg: '#fff5f5', dateColor: '#dc2626' };
    if (days <= 3) return { border: '#f97316', bg: '#fff8f2', dateColor: '#c2410c' };
    if (due.getMonth() === today.getMonth() && due.getFullYear() === today.getFullYear())
      return { border: '#ca8a04', bg: '#fefef0', dateColor: '#854d0e' };
    return { border: '#e2e8f0', bg: '#f8fafc', dateColor: '#94a3b8' };
  }

  // Recent payments
  const recentPayments = [...payments].sort((a, b) => b.fechaPago.localeCompare(a.fechaPago)).slice(0, 5);

  // Clients in mora
  const overdueByClient = {};
  metrics.vencidas.forEach(i => {
    if (!overdueByClient[i.clientId]) overdueByClient[i.clientId] = { monto: 0, cuotas: [], maxDays: 0 };
    overdueByClient[i.clientId].monto += i.saldoPendiente;
    overdueByClient[i.clientId].cuotas.push(i);
    const days = calculateOverdueDays(i.fechaVencimiento);
    if (days > overdueByClient[i.clientId].maxDays) overdueByClient[i.clientId].maxDays = days;
  });

  // Upcoming card payments
  const upcomingCards = creditCardMovements.filter(m => {
    const d = new Date(m.fechaVencimientoEstimada);
    const next30 = new Date(); next30.setDate(next30.getDate() + 30);
    return d >= today && d <= next30;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── KPI grid ─────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Sans, sans-serif' }}>
            {editMode ? 'Modo edición — arrastrá para reordenar' : 'Resumen'}
          </span>
          <Btn size="sm" variant={editMode ? 'primary' : 'secondary'} onClick={() => setEditMode(e => !e)}>
            {editMode ? '✓ Listo' : '⚙ Personalizar'}
          </Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          {order.map(id => {
            const item = kpiCatalog.find(k => k.id === id);
            if (!item) return null;
            const isHidden = hidden.has(id);
            if (!editMode && isHidden) return null;
            const isDragging = dragId === id;
            const isTarget   = dragOver === id && dragId !== id;
            return (
              <div
                key={id}
                draggable={editMode}
                onDragStart={() => setDragId(id)}
                onDragOver={e => { e.preventDefault(); setDragOver(id); }}
                onDrop={() => handleDrop(id)}
                onDragEnd={() => { setDragId(null); setDragOver(null); }}
                style={{
                  position: 'relative',
                  opacity: isHidden ? 0.45 : isDragging ? 0.5 : 1,
                  outline: isTarget ? '2px dashed #4f46e5' : 'none',
                  outlineOffset: 2,
                  borderRadius: 12,
                  cursor: editMode ? 'grab' : 'default',
                  transition: 'opacity 0.15s',
                }}
              >
                <KPICard
                  label={item.label}
                  value={isHidden && editMode ? '—' : item.getValue(metrics, operations)}
                  accent={item.accent}
                  icon={item.icon}
                  sub={item.sub}
                />
                {editMode && (
                  <button
                    onClick={e => { e.stopPropagation(); toggleHide(id); }}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      background: isHidden ? '#e2e8f0' : '#fef2f2',
                      color: isHidden ? '#475569' : '#dc2626',
                      border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      padding: '2px 6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {isHidden ? '+ Mostrar' : '✕ Ocultar'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Two-column: próximos vencimientos + clientes en mora ─ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Upcoming installments */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Sans, sans-serif' }}>📅 Próximos vencimientos (15 días)</span>
              {metrics.proxVencimientos.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: 6 }}>
                  {formatCurrency(metrics.proxVencimientos.reduce((s, i) => s + i.saldoPendiente, 0))}
                </span>
              )}
            </div>
            <Btn size="sm" variant="ghost" onClick={() => onNav('cuotas')}>Ver todo →</Btn>
          </div>
          {metrics.proxVencimientos.length === 0 ? (
            <EmptyState title="Sin vencimientos próximos" icon="✅" />
          ) : (
            <div>
              {metrics.proxVencimientos.slice(0, 6).map(inst => {
                const client = clients.find(c => c.id === inst.clientId);
                const op     = operations.find(o => o.id === inst.operationId);
                const urg    = instUrgency(inst);
                return (
                  <div key={inst.id} style={{
                    padding: '10px 16px', borderBottom: '1px solid #f8fafc',
                    display: 'flex', alignItems: 'center', gap: 12,
                    borderLeft: `3px solid ${urg?.border || '#e2e8f0'}`,
                    background: urg?.bg || 'transparent',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client?.nombre}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{op?.codigo} · Cuota {inst.numeroCuota}/{inst.totalCuotas}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(inst.saldoPendiente)}</div>
                      <div style={{ fontSize: 11, color: urg?.dateColor || '#94a3b8', fontWeight: urg?.dateColor !== '#94a3b8' ? 600 : 400 }}>{formatDate(inst.fechaVencimiento)}</div>
                    </div>
                    <StatusBadge status={inst.estado} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Clients in mora */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Sans, sans-serif' }}>⚠️ Clientes en mora</span>
              {Object.keys(overdueByClient).length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 6 }}>
                  {formatCurrency(Object.values(overdueByClient).reduce((s, c) => s + c.monto, 0))}
                </span>
              )}
            </div>
            <Btn size="sm" variant="ghost" onClick={() => onNav('mora')}>Ver todo →</Btn>
          </div>
          {Object.keys(overdueByClient).length === 0 ? (
            <EmptyState title="Sin clientes en mora" icon="✅" />
          ) : (
            <div>
              {Object.entries(overdueByClient).slice(0, 5).map(([clientId, info]) => {
                const client   = clients.find(c => c.id === clientId);
                const lastNote = data.clientNotes?.filter(n => n.clientId === clientId).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
                return (
                  <div key={clientId} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: 'DM Sans, sans-serif' }}>{client?.nombre}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{info.cuotas.length} cuota(s) · {info.maxDays} días de atraso</div>
                      {lastNote && <div style={{ fontSize: 10, color: '#94a3b8' }}>Último contacto: {formatDate(lastNote.fecha)}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(info.monto)}</div>
                    </div>
                    <WAButton phone={client?.telefono || ''} message={`Hola ${client?.nombre}, te escribo por cuotas vencidas por ${formatCurrency(info.monto)}. ¿Podemos coordinar el pago?`} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Two-column: upcoming cards + recent activity ─────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Upcoming card payments */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Sans, sans-serif' }}>💳 Tarjetas próximas a vencer</span>
              {upcomingCards.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#7c3aed', background: '#f3e8ff', padding: '2px 8px', borderRadius: 6 }}>
                  {formatCurrency(upcomingCards.reduce((s, m) => s + m.monto, 0))}
                </span>
              )}
            </div>
            <Btn size="sm" variant="ghost" onClick={() => onNav('tarjetas')}>Ver todo →</Btn>
          </div>
          {upcomingCards.length === 0 ? (
            <EmptyState title="Sin vencimientos de tarjeta próximos" icon="✅" />
          ) : (
            <div>
              {upcomingCards.map(mv => {
                const card   = creditCards.find(c => c.id === mv.creditCardId);
                const client = clients.find(c => c.id === mv.clientId);
                return (
                  <div key={mv.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{card?.nombre}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{mv.descripcion}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{client?.nombre}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#7c3aed' }}>{formatCurrency(mv.monto)}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Vence {formatDate(mv.fechaVencimientoEstimada)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Sans, sans-serif' }}>🕐 Actividad reciente</span>
            <Btn size="sm" variant="ghost" onClick={() => onNav('pagos')}>Ver pagos →</Btn>
          </div>
          {recentPayments.length === 0 ? (
            <EmptyState title="Sin actividad reciente" icon="📭" />
          ) : recentPayments.map(p => {
            const client = clients.find(c => c.id === p.clientId);
            return (
              <div key={p.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#dcfce7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0,
                }}>💰</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Pago recibido · {client?.nombre}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.codigo} · {p.metodoPago} · {formatDate(p.fechaPago)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', fontFamily: 'DM Mono, monospace' }}>+{formatCurrency(p.monto)}</div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen });
