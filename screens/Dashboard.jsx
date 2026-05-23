// Financial summary components
function SummaryIcon({ type, color = '#4f46e5', size = 22 }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  const icons = {
    bars: (
      <svg {...common}>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-8" />
        <path d="M22 19V3" />
      </svg>
    ),
    bell: (
      <svg {...common}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    ),
    alert: (
      <svg {...common}>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.7L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
    ),
    coin: (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v10" />
        <path d="M15 9.5A3 3 0 0 0 12 8c-1.7 0-3 1-3 2.3S10.3 12.2 12 12.5s3 .9 3 2.2S13.7 17 12 17a3.4 3.4 0 0 1-3.2-1.8" />
      </svg>
    ),
    calendar: (
      <svg {...common}>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 14h.01" />
        <path d="M12 14h.01" />
        <path d="M16 14h.01" />
      </svg>
    ),
    hourglass: (
      <svg {...common}>
        <path d="M6 2h12" />
        <path d="M6 22h12" />
        <path d="M7 2c0 5 4 6 5 10-1 4-5 5-5 10" />
        <path d="M17 2c0 5-4 6-5 10 1 4 5 5 5 10" />
      </svg>
    ),
    check: (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    ),
    trend: (
      <svg {...common}>
        <path d="m3 17 6-6 4 4 7-8" />
        <path d="M14 7h6v6" />
      </svg>
    ),
    wallet: (
      <svg {...common}>
        <path d="M4 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14" />
        <path d="M18 13h.01" />
      </svg>
    ),
    card: (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </svg>
    ),
    sliders: (
      <svg {...common}>
        <path d="M4 21v-7" />
        <path d="M4 10V3" />
        <path d="M12 21v-9" />
        <path d="M12 8V3" />
        <path d="M20 21v-5" />
        <path d="M20 12V3" />
        <path d="M2 14h4" />
        <path d="M10 8h4" />
        <path d="M18 16h4" />
      </svg>
    ),
  };
  return icons[type] || icons.bars;
}

function SummaryToggle({ id, hidden, editMode, onToggle }) {
  if (!editMode) return null;
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(id); }}
      style={{
        position: 'absolute', top: 12, right: 12, zIndex: 5,
        height: 28, padding: '0 10px', borderRadius: 8,
        border: hidden ? '1px solid #c7d2fe' : '1px solid #fecaca',
        background: hidden ? '#eef2ff' : '#fef2f2',
        color: hidden ? '#4338ca' : '#b91c1c',
        fontSize: 11, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {hidden ? 'Mostrar' : 'Ocultar'}
    </button>
  );
}

function SummaryHeroCard({ metrics, activeOperations, isMobile }) {
  const detailGrid = isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))';
  const details = [
    { label: 'Total a recuperar', value: formatCurrency(metrics.totalEsperado) },
    { label: 'Ganancia proyectada', value: formatCurrency(metrics.gananciaEsperada) },
    { label: 'Operaciones activas', value: activeOperations },
  ];
  return (
    <Card style={{
      position: 'relative', overflow: 'hidden',
      borderRadius: 16, border: '1px solid #e5e7eb',
      boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
      padding: isMobile ? 22 : 28,
      minHeight: isMobile ? 'auto' : 250,
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle at 86% 0%, rgba(99,102,241,0.14), transparent 34%), radial-gradient(circle at 95% 32%, rgba(124,58,237,0.08), transparent 28%)',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div style={{
            width: 58, height: 58, borderRadius: 14,
            background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.08)',
          }}>
            <SummaryIcon type="bars" color="#4f46e5" size={30} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', fontFamily: 'DM Sans, sans-serif' }}>Capital activo</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Resumen de operaciones vigentes</div>
          </div>
        </div>

        <div style={{
          fontSize: isMobile ? 36 : 48,
          lineHeight: 1.05, fontWeight: 800, color: '#0f172a',
          fontFamily: 'DM Mono, monospace', letterSpacing: 0,
          marginBottom: 28, overflowWrap: 'anywhere',
        }}>
          {formatCurrency(metrics.capitalInvertido)}
        </div>

        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: detailGrid, gap: isMobile ? 16 : 0 }}>
          {details.map((item, index) => (
            <div key={item.label} style={{
              paddingLeft: isMobile || index === 0 ? 0 : 28,
              borderLeft: isMobile || index === 0 ? 'none' : '1px solid #e5e7eb',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>{item.label}</div>
              <div style={{
                fontSize: item.label === 'Operaciones activas' ? 26 : 25,
                fontWeight: 800, color: '#4338ca',
                fontFamily: item.label === 'Operaciones activas' ? 'DM Sans, sans-serif' : 'DM Mono, monospace',
                overflowWrap: 'anywhere',
              }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function AlertCard({ metrics, onNav, hidden, editMode, onToggle, isMobile }) {
  if (hidden && !editMode) return null;
  const alertRows = [
    { icon: 'bell', label: `${metrics.clientesEnMora} cliente${metrics.clientesEnMora === 1 ? '' : 's'} en mora`, color: '#dc2626', bg: '#fef2f2' },
    { icon: 'coin', label: `${formatCurrency(metrics.montoVencido)} vencidos`, color: '#dc2626', bg: '#fef2f2' },
    { icon: 'calendar', label: `${metrics.proxVencimientos.length} vencimientos pr\u00f3ximos en 15 d\u00edas`, color: '#ea580c', bg: '#fff7ed' },
  ];
  return (
    <div style={{ position: 'relative', opacity: hidden ? 0.45 : 1 }}>
      <SummaryToggle id="alerts" hidden={hidden} editMode={editMode} onToggle={onToggle} />
      <Card style={{
        borderRadius: 16, border: '1px solid #e5e7eb',
        boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
        padding: isMobile ? 20 : 24, minHeight: isMobile ? 'auto' : 250,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: '#fef2f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SummaryIcon type="bell" color="#dc2626" size={24} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Alertas</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
          {alertRows.map((row, index) => (
            <div key={row.label} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 0',
              borderBottom: index < alertRows.length - 1 ? '1px solid #e5e7eb' : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18, background: row.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <SummaryIcon type={row.icon} color={row.color} size={18} />
              </div>
              <div style={{ color: row.color, fontSize: 14, fontWeight: 800, lineHeight: 1.35 }}>
                {row.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginTop: 18 }}>
          <Btn size="sm" variant="secondary" onClick={() => onNav('mora')} style={{ justifyContent: 'center', height: 38 }}>
            Ver mora
          </Btn>
          <Btn size="sm" onClick={() => onNav('cuotas')} style={{ justifyContent: 'center', height: 38 }}>
            Ver vencimientos
          </Btn>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ id, title, value, icon, color, bg, hidden, editMode, onToggle }) {
  if (hidden && !editMode) return null;
  return (
    <div style={{ position: 'relative', minWidth: 0, opacity: hidden ? 0.45 : 1 }}>
      <SummaryToggle id={id} hidden={hidden} editMode={editMode} onToggle={onToggle} />
      <Card style={{
        borderRadius: 14, border: '1px solid #e5e7eb',
        boxShadow: '0 8px 22px rgba(15,23,42,0.07)',
        padding: '22px 24px', minHeight: 112,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <SummaryIcon type={icon} color={color} size={26} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#334155', marginBottom: 8, lineHeight: 1.25 }}>
            {title}
          </div>
          <div style={{
            fontSize: 25, fontWeight: 800, color,
            fontFamily: 'DM Mono, monospace', lineHeight: 1.15,
            overflowWrap: 'anywhere',
          }}>
            {value}
          </div>
        </div>
        <div style={{ color: '#94a3b8', fontSize: 22, lineHeight: 1, flexShrink: 0 }}>&rsaquo;</div>
      </Card>
    </div>
  );
}

function SummarySection({ metrics, operations, onNav }) {
  const LS_KEY = 'crm-dashboard-layout';
  function loadLayout() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
  function saveLayout(patch) { try { localStorage.setItem(LS_KEY, JSON.stringify({ ...loadLayout(), ...patch })); } catch {} }

  const [hidden, setHidden] = React.useState(() => {
    const s = loadLayout();
    return new Set(s.hidden || []);
  });
  const [editMode, setEditMode] = React.useState(false);
  const [viewportWidth, setViewportWidth] = React.useState(() => window.innerWidth || 1280);

  React.useEffect(() => {
    function handleResize() { setViewportWidth(window.innerWidth || 1280); }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function toggleHide(id) {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveLayout({ hidden: [...next] });
      return next;
    });
  }

  const isMobile = viewportWidth < 700;
  const isTablet = viewportWidth >= 700 && viewportWidth < 1100;
  const activeOperations = operations.filter(o => o.estado === 'Activa').length;
  const showAlerts = !hidden.has('alerts') || editMode;
  const metricColumns = isMobile ? '1fr' : isTablet ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))';
  const topColumns = !showAlerts || isTablet || isMobile ? '1fr' : 'minmax(0, 2fr) minmax(320px, 1fr)';

  const metricRows = [
    [
      { id: 'saldoPendiente', title: 'Pendiente de cobro', value: formatCurrency(metrics.saldoPendiente), icon: 'hourglass', color: '#4f46e5', bg: '#f3e8ff' },
      { id: 'cobradoEsteMes', title: 'Cobrado en el mes', value: formatCurrency(metrics.cobradoEsteMes), icon: 'check', color: '#059669', bg: '#dcfce7' },
      { id: 'gananciaRealizada', title: 'Ganancia realizada', value: formatCurrency(Math.max(0, metrics.gananciaRealizada)), icon: 'trend', color: '#059669', bg: '#dcfce7' },
    ],
    [
      { id: 'capitalEfectivo', title: 'Disponible en efectivo', value: formatCurrency(metrics.capitalEfectivo), icon: 'wallet', color: '#0f766e', bg: '#dcfce7' },
      { id: 'capitalTarjeta', title: 'Disponible en tarjeta', value: formatCurrency(metrics.capitalTarjeta), icon: 'card', color: '#2563eb', bg: '#dbeafe' },
      { id: 'proxVencimientos', title: 'Vencimientos pr\u00f3ximos', value: `${metrics.proxVencimientos.length} cuotas en 15 d\u00edas`, icon: 'calendar', color: '#ea580c', bg: '#ffedd5' },
    ],
  ];

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center',
        gap: 12, marginBottom: 16, flexDirection: isMobile ? 'column' : 'row',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 800, color: '#64748b',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {editMode ? 'Resumen financiero - personalizar' : 'Resumen financiero'}
        </span>
        <Btn size="sm" variant={editMode ? 'primary' : 'secondary'} onClick={() => setEditMode(e => !e)}>
          <SummaryIcon type={editMode ? 'check' : 'sliders'} color={editMode ? '#fff' : '#334155'} size={15} />
          {editMode ? 'Listo' : 'Personalizar'}
        </Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: topColumns, gap: 18, marginBottom: 20 }}>
        <SummaryHeroCard metrics={metrics} activeOperations={activeOperations} isMobile={isMobile} />
        <AlertCard
          metrics={metrics}
          onNav={onNav}
          hidden={hidden.has('alerts')}
          editMode={editMode}
          onToggle={toggleHide}
          isMobile={isMobile}
        />
      </div>

      {metricRows.map((row, index) => (
        <div key={index} style={{
          display: 'grid', gridTemplateColumns: metricColumns, gap: 18,
          marginTop: index === 0 ? 0 : 18,
        }}>
          {row.map(item => (
            <MetricCard
              key={item.id}
              {...item}
              hidden={hidden.has(item.id)}
              editMode={editMode}
              onToggle={toggleHide}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Dashboard Screen
function DashboardScreen({ data, onNav }) {
  const { clients, operations, installments, payments, creditCards, creditCardMovements, cashMovements } = data;
  const metrics = getDashboardMetrics(clients, operations, installments, payments, creditCards, creditCardMovements);
  const today = new Date(); today.setHours(0, 0, 0, 0);

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

      <SummarySection metrics={metrics} operations={operations} onNav={onNav} />

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
