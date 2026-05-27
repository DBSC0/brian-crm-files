// Dashboard financiero ARS/USD

function SummaryIcon({ type, color = '#4f46e5', size = 22 }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  const icons = {
    bars: <svg {...common}><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-8" /><path d="M22 19V3" /></svg>,
    bell: <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>,
    coin: <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 7v10" /><path d="M15 9.5A3 3 0 0 0 12 8c-1.7 0-3 1-3 2.3S10.3 12.2 12 12.5s3 .9 3 2.2S13.7 17 12 17a3.4 3.4 0 0 1-3.2-1.8" /></svg>,
    calendar: <svg {...common}><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /></svg>,
    hourglass: <svg {...common}><path d="M6 2h12" /><path d="M6 22h12" /><path d="M7 2c0 5 4 6 5 10-1 4-5 5-5 10" /><path d="M17 2c0 5-4 6-5 10 1 4 5 5 5 10" /></svg>,
    check: <svg {...common}><path d="m5 12 4 4L19 6" /></svg>,
    trend: <svg {...common}><path d="m3 17 6-6 4 4 7-8" /><path d="M14 7h6v6" /></svg>,
    wallet: <svg {...common}><path d="M4 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14" /><path d="M18 13h.01" /></svg>,
    card: <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /></svg>,
    sliders: <svg {...common}><path d="M4 21v-7" /><path d="M4 10V3" /><path d="M12 21v-9" /><path d="M12 8V3" /><path d="M20 21v-5" /><path d="M20 12V3" /><path d="M2 14h4" /><path d="M10 8h4" /><path d="M18 16h4" /></svg>,
  };
  return icons[type] || icons.bars;
}

function CurrencyBadge({ currency }) {
  const curr = normalizeCurrency(currency);
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, borderRadius: 8, padding: '4px 9px',
      color: curr === 'USD' ? '#1d4ed8' : '#1e40af',
      background: curr === 'USD' ? '#e0f2fe' : '#dbeafe',
      fontFamily: 'DM Sans, sans-serif',
      whiteSpace: 'nowrap',
    }}>
      {curr}
    </span>
  );
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

function emptyMoneyBucket() {
  return { ARS: 0, USD: 0, base: 0, currentBase: 0 };
}

function addMoney(bucket, row, key, usdRate, multiplier = 1) {
  const curr = normalizeCurrency(row?.moneda);
  const amount = Number(row?.[key] || 0) * multiplier;
  bucket[curr] += amount;
  bucket.base += moneyBase(row, key) * multiplier;
  bucket.currentBase += toBaseAmount(amount, curr, curr === 'USD' ? usdRate : 1);
  return bucket;
}

function addRawMoney(bucket, amount, currency, usdRate) {
  const curr = normalizeCurrency(currency);
  const n = Number(amount || 0);
  bucket[curr] += n;
  bucket.base += toBaseAmount(n, curr, curr === 'USD' ? usdRate : 1);
  bucket.currentBase += toBaseAmount(n, curr, curr === 'USD' ? usdRate : 1);
  return bucket;
}

function bucketFromRows(rows, key, usdRate, filterFn = null) {
  return (rows || [])
    .filter(row => !filterFn || filterFn(row))
    .reduce((bucket, row) => addMoney(bucket, row, key, usdRate), emptyMoneyBucket());
}

function subtractBuckets(a, b) {
  return {
    ARS: a.ARS - b.ARS,
    USD: a.USD - b.USD,
    base: a.base - b.base,
    currentBase: a.currentBase - b.currentBase,
  };
}

function countByCurrency(rows) {
  return (rows || []).reduce((acc, row) => {
    const curr = normalizeCurrency(row?.moneda);
    acc[curr] = (acc[curr] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { ARS: 0, USD: 0, total: 0 });
}

function bucketSubtitle(bucket, selectedCurrency) {
  if (selectedCurrency === 'consolidado') {
    const parts = [];
    if (Math.abs(bucket.ARS) > 0) parts.push(`ARS ${formatMoney(bucket.ARS, 'ARS')}`);
    if (Math.abs(bucket.USD) > 0) parts.push(`USD ${formatMoney(bucket.USD, 'USD')}`);
    return parts.join(' • ');
  }
  if (selectedCurrency === 'USD' && Math.abs(bucket.USD) > 0) return `Equiv. ${formatCurrency(bucket.currentBase)}`;
  if (selectedCurrency === 'ARS' && Math.abs(bucket.USD) > 0) return `No incluye USD ${formatMoney(bucket.USD, 'USD')}`;
  return '';
}

function bucketValue(bucket, selectedCurrency) {
  if (selectedCurrency === 'ARS') return formatMoney(bucket.ARS, 'ARS');
  if (selectedCurrency === 'USD') return formatMoney(bucket.USD, 'USD');
  return formatCurrency(bucket.base);
}

function bucketAmount(bucket, selectedCurrency) {
  if (selectedCurrency === 'ARS') return bucket.ARS;
  if (selectedCurrency === 'USD') return bucket.USD;
  return bucket.base;
}

function filterRowsByCurrency(rows, selectedCurrency) {
  if (selectedCurrency === 'consolidado') return rows || [];
  return (rows || []).filter(row => normalizeCurrency(row?.moneda) === selectedCurrency);
}

function buildCurrencyDashboardModel(data, selectedCurrency, usdRate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const next15 = new Date(); next15.setDate(next15.getDate() + 15);
  const liveOps = (data.operations || []).filter(o => o.estado !== 'Anulada');
  const pendingInst = (data.installments || []).filter(i => i.saldoPendiente > 0 && i.estado !== 'Anulada');
  const overdueInst = pendingInst.filter(i => new Date(i.fechaVencimiento) < today);
  const upcomingInst = pendingInst
    .filter(i => {
      const d = new Date(i.fechaVencimiento);
      return d >= today && d <= next15;
    })
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
  const monthPayments = (data.payments || []).filter(p => String(p.fechaPago || '').startsWith(thisMonth));
  const cardMovs = (data.creditCardMovements || []).filter(m => m.estado !== 'Cancelado');
  const cashMovs = data.cashMovements || [];

  const capital = bucketFromRows(liveOps, 'costoReal', usdRate);
  const totalExpected = bucketFromRows(liveOps, 'totalEsperado', usdRate);
  const projectedGain = bucketFromRows(liveOps, 'gananciaEsperada', usdRate);
  const pending = bucketFromRows(pendingInst, 'saldoPendiente', usdRate);
  const overdue = bucketFromRows(overdueInst, 'saldoPendiente', usdRate);
  const collectedMonth = bucketFromRows(monthPayments, 'monto', usdRate);
  const collectedAll = bucketFromRows(data.payments || [], 'monto', usdRate);
  const realizedGain = subtractBuckets(collectedAll, capital);
  const cash = bucketFromRows(cashMovs, 'monto', usdRate);
  const card = bucketFromRows(cardMovs, 'monto', usdRate);
  const upcoming = bucketFromRows(upcomingInst, 'saldoPendiente', usdRate);
  const upcomingCounts = countByCurrency(upcomingInst);
  const usdUpcoming = upcomingInst.filter(i => normalizeCurrency(i.moneda) === 'USD');

  return {
    selectedCurrency,
    usdRate,
    today,
    upcomingInst,
    overdueInst,
    activeOperations: liveOps.filter(o => o.estado === 'Activa').length,
    clientesEnMora: new Set(overdueInst.map(i => i.clientId)).size,
    usdUpcomingCount: usdUpcoming.length,
    upcomingCounts,
    buckets: {
      capital,
      totalExpected,
      projectedGain,
      pending,
      overdue,
      collectedMonth,
      realizedGain,
      cash,
      card,
      upcoming,
    },
  };
}

function SegmentControl({ value, onChange, isMobile }) {
  const options = [
    { id: 'consolidado', label: 'Consolidado' },
    { id: 'ARS', label: 'ARS' },
    { id: 'USD', label: 'USD' },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
      border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
      background: 'var(--bg-surface)', minWidth: isMobile ? '100%' : 360,
      boxShadow: '0 6px 16px rgba(15,23,42,0.04)',
    }}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          style={{
            height: 42, border: 0, borderRight: !isMobile && opt.id !== 'USD' ? '1px solid var(--border)' : 'none',
            background: value === opt.id ? '#4f46e5' : '#fff',
            color: value === opt.id ? '#fff' : 'var(--text-primary)',
            fontSize: 13, fontWeight: 800, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            boxShadow: value === opt.id ? 'inset 0 0 0 2px rgba(255,255,255,0.18)' : 'none',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function RateChip({ rateInfo }) {
  const rate = rateInfo?.rate || 0;
  const time = rateInfo?.updatedAt
    ? new Date(rateInfo.updatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      height: 52, padding: '0 14px', borderRadius: 10,
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      boxShadow: '0 6px 16px rgba(15,23,42,0.04)',
      minWidth: 210,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 17, background: '#dcfce7',
        color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 18,
      }}>$</div>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 900 }}>
          USD Blue <span style={{ fontFamily: 'DM Mono, monospace' }}>{rate > 1 ? formatCurrencyRaw(rate).replace(/\s/g, '') : 'Sin cotización'}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{time ? `Actualizado hoy ${time}` : 'Usando cache/local'}</div>
      </div>
    </div>
  );
}

function SummaryHeroCard({ model, isMobile }) {
  const { buckets, selectedCurrency, usdRate } = model;
  const detailGrid = isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))';
  const subGrid = isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))';
  const details = [
    { label: 'Total a recuperar', value: bucketValue(buckets.totalExpected, selectedCurrency) },
    { label: 'Ganancia proyectada', value: bucketValue(buckets.projectedGain, selectedCurrency) },
    { label: 'Operaciones activas', value: maskSensitiveNumber(model.activeOperations) },
  ];
  const breakdown = [
    { label: 'ARS', value: formatMoney(buckets.capital.ARS, 'ARS') },
    { label: 'USD', value: formatMoney(buckets.capital.USD, 'USD') },
    { label: 'Equiv. ARS', value: `≈ ${formatCurrency(toBaseAmount(buckets.capital.USD, 'USD', usdRate))}` },
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
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>Capital activo</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Resumen consolidado de operaciones</div>
          </div>
        </div>

        <div style={{
          fontSize: isMobile ? 36 : 48, lineHeight: 1.05,
          fontWeight: 900, color: 'var(--text-primary)',
          fontFamily: 'DM Mono, monospace', letterSpacing: 0,
          marginBottom: 22, overflowWrap: 'anywhere',
        }}>
          {bucketValue(buckets.capital, selectedCurrency)}
        </div>

        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: subGrid, gap: isMobile ? 12 : 0, marginBottom: 16 }}>
          {breakdown.map((item, index) => (
            <div key={item.label} style={{ paddingLeft: isMobile || index === 0 ? 0 : 28, borderLeft: isMobile || index === 0 ? 'none' : '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#334155', fontWeight: 800, marginBottom: 7 }}>{item.label}</div>
              <div style={{ fontSize: 20, color: '#4338ca', fontWeight: 900, fontFamily: 'DM Mono, monospace' }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: detailGrid, gap: isMobile ? 16 : 0 }}>
          {details.map((item, index) => (
            <div key={item.label} style={{ paddingLeft: isMobile || index === 0 ? 0 : 28, borderLeft: isMobile || index === 0 ? 'none' : '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8 }}>{item.label}</div>
              <div style={{ fontSize: item.label === 'Operaciones activas' ? 25 : 21, fontWeight: 900, color: '#4338ca', fontFamily: item.label === 'Operaciones activas' ? 'DM Sans, sans-serif' : 'DM Mono, monospace' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function AlertCard({ model, onNav, hidden, editMode, onToggle, isMobile }) {
  if (hidden && !editMode) return null;
  const { buckets } = model;
  const alertRows = [
    { icon: 'bell', label: `${maskSensitiveNumber(model.clientesEnMora)} cliente${model.clientesEnMora === 1 ? '' : 's'} en mora`, color: '#dc2626', bg: '#fef2f2' },
    { icon: 'coin', label: `${bucketValue(buckets.overdue, 'consolidado')} vencidos`, color: '#dc2626', bg: '#fef2f2' },
    { icon: 'calendar', label: `${maskSensitiveNumber(model.upcomingInst.length)} vencimientos próximos en ${maskSensitiveNumber(15)} días`, color: '#ea580c', bg: '#fff7ed' },
    { icon: 'coin', label: `${maskSensitiveNumber(model.usdUpcomingCount)} cuotas en USD próximas a vencer`, color: '#2563eb', bg: '#eff6ff' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SummaryIcon type="bell" color="#dc2626" size={24} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>Alertas</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {alertRows.map((row, index) => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: index < alertRows.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 17, background: row.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <SummaryIcon type={row.icon} color={row.color} size={17} />
              </div>
              <div style={{ color: row.color, fontSize: 14, fontWeight: 900, lineHeight: 1.35 }}>{row.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginTop: 16 }}>
          <Btn size="sm" variant="secondary" onClick={() => onNav('mora')} style={{ justifyContent: 'center', height: 38 }}>Ver mora</Btn>
          <Btn size="sm" onClick={() => onNav('cuotas')} style={{ justifyContent: 'center', height: 38 }}>Ver vencimientos</Btn>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ id, title, value, sub, icon, color, bg, hidden, editMode, onToggle }) {
  if (hidden && !editMode) return null;
  return (
    <div style={{ position: 'relative', minWidth: 0, opacity: hidden ? 0.45 : 1 }}>
      <SummaryToggle id={id} hidden={hidden} editMode={editMode} onToggle={onToggle} />
      <Card style={{
        borderRadius: 14, border: '1px solid #e5e7eb',
        boxShadow: '0 8px 22px rgba(15,23,42,0.07)',
        padding: '20px 22px', minHeight: 112,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <SummaryIcon type={icon} color={color} size={26} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#334155', marginBottom: 8, lineHeight: 1.25 }}>{title}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: 'DM Mono, monospace', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, fontWeight: 600, lineHeight: 1.3 }}>{sub}</div>}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, flexShrink: 0 }}>&rsaquo;</div>
      </Card>
    </div>
  );
}

function SummarySection({ model, selectedCurrency, setSelectedCurrency, rateInfo, onNav }) {
  const LS_KEY = 'crm-dashboard-layout';
  function loadLayout() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
  function saveLayout(patch) { try { localStorage.setItem(LS_KEY, JSON.stringify({ ...loadLayout(), ...patch })); } catch {} }

  const [hidden, setHidden] = React.useState(() => new Set((loadLayout().hidden || [])));
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

  const isMobile = viewportWidth < 740;
  const isTablet = viewportWidth >= 740 && viewportWidth < 1120;
  const showAlerts = !hidden.has('alerts') || editMode;
  const metricColumns = isMobile ? '1fr' : isTablet ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))';
  const topColumns = !showAlerts || isTablet || isMobile ? '1fr' : 'minmax(0, 2fr) minmax(320px, 1fr)';

  const metricRows = [
    [
      { id: 'saldoPendiente', title: 'Pendiente de cobro', bucket: model.buckets.pending, icon: 'hourglass', color: '#4f46e5', bg: '#f3e8ff' },
      { id: 'cobradoEsteMes', title: 'Cobrado en el mes', bucket: model.buckets.collectedMonth, icon: 'check', color: '#059669', bg: '#dcfce7' },
      { id: 'gananciaRealizada', title: 'Ganancia realizada', bucket: model.buckets.realizedGain, icon: 'trend', color: '#059669', bg: '#dcfce7', clampPositive: true },
    ],
    [
      { id: 'capitalEfectivo', title: 'Disponible en efectivo', bucket: model.buckets.cash, icon: 'wallet', color: '#0f766e', bg: '#dcfce7' },
      { id: 'capitalTarjeta', title: 'Disponible en tarjeta', bucket: model.buckets.card, icon: 'card', color: '#2563eb', bg: '#dbeafe' },
      {
        id: 'proxVencimientos',
        title: 'Vencimientos próximos',
        value: `${maskSensitiveNumber(model.upcomingCounts.total)} cuotas en ${maskSensitiveNumber(15)} días`,
        sub: `${maskSensitiveNumber(model.upcomingCounts.ARS)} ARS • ${maskSensitiveNumber(model.upcomingCounts.USD)} USD`,
        icon: 'calendar',
        color: '#ea580c',
        bg: '#ffedd5',
      },
    ],
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto auto auto', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {editMode ? 'RESUMEN FINANCIERO - PERSONALIZAR' : 'RESUMEN FINANCIERO'}
        </span>
        <RateChip rateInfo={rateInfo} />
        <SegmentControl value={selectedCurrency} onChange={setSelectedCurrency} isMobile={isMobile} />
        <Btn size="sm" variant={editMode ? 'primary' : 'secondary'} onClick={() => setEditMode(e => !e)} style={{ height: 42 }}>
          <SummaryIcon type={editMode ? 'check' : 'sliders'} color={editMode ? '#fff' : '#334155'} size={15} />
          {editMode ? 'Listo' : 'Personalizar'}
        </Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: topColumns, gap: 18, marginBottom: 18 }}>
        <SummaryHeroCard model={model} isMobile={isMobile} />
        <AlertCard model={model} onNav={onNav} hidden={hidden.has('alerts')} editMode={editMode} onToggle={toggleHide} isMobile={isMobile} />
      </div>

      {metricRows.map((row, index) => (
        <div key={index} style={{ display: 'grid', gridTemplateColumns: metricColumns, gap: 18, marginTop: index === 0 ? 0 : 18 }}>
          {row.map(item => {
            const rawBucket = item.bucket;
            const bucket = item.clampPositive
              ? { ...rawBucket, ARS: Math.max(0, rawBucket.ARS), USD: Math.max(0, rawBucket.USD), base: Math.max(0, rawBucket.base), currentBase: Math.max(0, rawBucket.currentBase) }
              : rawBucket;
            return (
              <MetricCard
                key={item.id}
                {...item}
                value={item.value || bucketValue(bucket, selectedCurrency)}
                sub={item.sub || bucketSubtitle(bucket, selectedCurrency)}
                hidden={hidden.has(item.id)}
                editMode={editMode}
                onToggle={toggleHide}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function formatListAmount(row, selectedCurrency) {
  if (selectedCurrency === 'consolidado') return formatMoneyWithEquivalent(row.saldoPendiente ?? row.monto, row.moneda, row.tipoCambio, { compact: true });
  const key = row.saldoPendiente != null ? 'saldoPendiente' : 'monto';
  return formatMoney(row[key], row.moneda);
}

function DashboardScreen({ data, onNav }) {
  const { clients, operations, installments, payments, creditCards, creditCardMovements } = data;
  const [selectedCurrency, setSelectedCurrency] = React.useState('consolidado');
  const [usdRates, setUsdRates] = React.useState([]);
  const [viewportWidth, setViewportWidth] = React.useState(() => window.innerWidth || 1280);

  React.useEffect(() => {
    fetchUsdRates().then(setUsdRates);
    function handleResize() { setViewportWidth(window.innerWidth || 1280); }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rateInfo = usdRates.find(r => r.key === 'blue') || usdRates[0] || { key: 'blue', label: 'Blue', rate: 1, updatedAt: null };
  const usdRate = normalizeExchangeRate(rateInfo.rate);
  const model = buildCurrencyDashboardModel(data, selectedCurrency, usdRate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isMobile = viewportWidth < 820;
  const lowerGrid = isMobile ? '1fr' : '1fr 1fr';

  function instUrgency(inst) {
    if (inst.saldoPendiente === 0) return null;
    const due = new Date(inst.fechaVencimiento + 'T00:00:00');
    const days = Math.ceil((due - today) / 86400000);
    if (days < 0) return { border: '#dc2626', bg: '#fff5f5', dateColor: '#dc2626' };
    if (days <= 3) return { border: '#f97316', bg: '#fff8f2', dateColor: '#c2410c' };
    if (due.getMonth() === today.getMonth() && due.getFullYear() === today.getFullYear()) return { border: '#ca8a04', bg: '#fefef0', dateColor: '#854d0e' };
    return { border: '#e2e8f0', bg: '#f8fafc', dateColor: '#94a3b8' };
  }

  const visibleUpcoming = filterRowsByCurrency(model.upcomingInst, selectedCurrency).slice(0, 6);
  const visibleRecentPayments = filterRowsByCurrency([...payments].sort((a, b) => b.fechaPago.localeCompare(a.fechaPago)), selectedCurrency).slice(0, 5);
  const upcomingCards = filterRowsByCurrency((creditCardMovements || []).filter(m => {
    const d = new Date(m.fechaVencimientoEstimada);
    const next30 = new Date(); next30.setDate(next30.getDate() + 30);
    return d >= today && d <= next30;
  }), selectedCurrency);

  const overdueByClient = {};
  filterRowsByCurrency(model.overdueInst, selectedCurrency).forEach(inst => {
    const key = `${inst.clientId}-${selectedCurrency === 'consolidado' ? normalizeCurrency(inst.moneda) : selectedCurrency}`;
    if (!overdueByClient[key]) overdueByClient[key] = { clientId: inst.clientId, currency: normalizeCurrency(inst.moneda), amount: 0, base: 0, cuotas: [], maxDays: 0 };
    overdueByClient[key].amount += Number(inst.saldoPendiente || 0);
    overdueByClient[key].base += moneyBase(inst, 'saldoPendiente');
    overdueByClient[key].cuotas.push(inst);
    overdueByClient[key].maxDays = Math.max(overdueByClient[key].maxDays, calculateOverdueDays(inst.fechaVencimiento));
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SummarySection model={model} selectedCurrency={selectedCurrency} setSelectedCurrency={setSelectedCurrency} rateInfo={rateInfo} onNav={onNav} />

      <div style={{ display: 'grid', gridTemplateColumns: lowerGrid, gap: 20 }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>Próximos vencimientos ({maskSensitiveNumber(15)} días)</span>
              {model.upcomingInst.length > 0 && <span style={{ fontSize: 12, fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: 6 }}>{bucketValue(model.buckets.upcoming, selectedCurrency)}</span>}
            </div>
            <Btn size="sm" variant="ghost" onClick={() => onNav('cuotas')}>Ver todo →</Btn>
          </div>
          {visibleUpcoming.length === 0 ? (
            <EmptyState title="Sin vencimientos próximos" icon="✓" />
          ) : (
            <div>
              {visibleUpcoming.map(inst => {
                const client = clients.find(c => c.id === inst.clientId);
                const op = operations.find(o => o.id === inst.operationId);
                const urg = instUrgency(inst);
                return (
                  <div key={inst.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto auto', gap: 10, alignItems: 'center', borderLeft: `3px solid ${urg?.border || '#e2e8f0'}`, background: urg?.bg || 'transparent' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client?.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{op?.codigo} · Cuota {maskSensitiveNumber(inst.numeroCuota)}/{maskSensitiveNumber(inst.totalCuotas)}</div>
                    </div>
                    <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>{formatListAmount(inst, selectedCurrency)}</div>
                      <div style={{ fontSize: 11, color: urg?.dateColor || '#94a3b8', fontWeight: 700 }}>{formatDate(inst.fechaVencimiento)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: isMobile ? 'flex-start' : 'flex-end', alignItems: 'center' }}>
                      <CurrencyBadge currency={inst.moneda} />
                      <StatusBadge status={inst.estado} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>Clientes en mora</span>
              {Object.keys(overdueByClient).length > 0 && <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 6 }}>{bucketValue(model.buckets.overdue, selectedCurrency)}</span>}
            </div>
            <Btn size="sm" variant="ghost" onClick={() => onNav('mora')}>Ver todo →</Btn>
          </div>
          {Object.keys(overdueByClient).length === 0 ? (
            <EmptyState title="Sin clientes en mora" icon="✓" />
          ) : (
            <div>
              {Object.values(overdueByClient).slice(0, 5).map(info => {
                const client = clients.find(c => c.id === info.clientId);
                return (
                  <div key={`${info.clientId}-${info.currency}`} style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto auto', gap: 10, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>{client?.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{maskSensitiveNumber(info.cuotas.length)} cuota(s) · {maskSensitiveNumber(info.maxDays)} días de atraso</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#dc2626', fontFamily: 'DM Mono, monospace', textAlign: isMobile ? 'left' : 'right' }}>
                      {selectedCurrency === 'consolidado' ? formatMoneyWithEquivalent(info.amount, info.currency, usdRate, { compact: true }) : formatMoney(info.amount, info.currency)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: isMobile ? 'flex-start' : 'flex-end', alignItems: 'center' }}>
                      <CurrencyBadge currency={info.currency} />
                      <WAButton phone={client?.telefono || ''} message={`Hola ${client?.nombre}, te escribo por cuotas vencidas por ${formatMoneyRaw(info.amount, info.currency)}. ¿Podemos coordinar el pago?`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: lowerGrid, gap: 20 }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>Tarjetas próximas a vencer</span>
            <Btn size="sm" variant="ghost" onClick={() => onNav('tarjetas')}>Ver todo →</Btn>
          </div>
          {upcomingCards.length === 0 ? (
            <EmptyState title="Sin vencimientos de tarjeta próximos" icon="✓" />
          ) : upcomingCards.map(mv => {
            const card = creditCards.find(c => c.id === mv.creditCardId);
            const client = clients.find(c => c.id === mv.clientId);
            return (
              <div key={mv.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{card?.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{mv.descripcion}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{client?.nombre}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'DM Mono, monospace', color: '#7c3aed' }}>{formatMoneyWithEquivalent(mv.monto, mv.moneda, mv.tipoCambio, { compact: true })}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Vence {formatDate(mv.fechaVencimientoEstimada)}</div>
                </div>
                <CurrencyBadge currency={mv.moneda} />
              </div>
            );
          })}
        </Card>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>Actividad reciente</span>
            <Btn size="sm" variant="ghost" onClick={() => onNav('pagos')}>Ver pagos →</Btn>
          </div>
          {visibleRecentPayments.length === 0 ? (
            <EmptyState title="Sin actividad reciente" icon="-" />
          ) : visibleRecentPayments.map(p => {
            const client = clients.find(c => c.id === p.clientId);
            return (
              <div key={p.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: '#dcfce7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>$</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Pago recibido · {client?.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{p.codigo} · {p.metodoPago} · {formatDate(p.fechaPago)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#16a34a', fontFamily: 'DM Mono, monospace' }}>+{formatMoneyWithEquivalent(p.monto, p.moneda, p.tipoCambio, { compact: true })}</div>
                <CurrencyBadge currency={p.moneda} />
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen });
