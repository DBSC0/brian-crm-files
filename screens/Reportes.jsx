// Reportes Screen

const REPORT_ACCENTS = {
  indigo: { color: '#4f46e5', bg: '#eef2ff' },
  purple: { color: '#7c3aed', bg: '#f5f3ff' },
  green: { color: '#059669', bg: '#dcfce7' },
  red: { color: '#dc2626', bg: '#fee2e2' },
  amber: { color: '#d97706', bg: '#ffedd5' },
  blue: { color: '#2563eb', bg: '#dbeafe' },
  slate: { color: '#475569', bg: '#f1f5f9' },
};

const REPORT_CARD_GRADIENTS = [
  'linear-gradient(135deg, #1e3a8a 0%, #4f46e5 100%)',
  'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #111827 0%, #374151 100%)',
  'linear-gradient(135deg, #0f766e 0%, #2563eb 100%)',
];

function reportNum(value) {
  return Number(value || 0);
}

function reportDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  const text = String(dateStr);
  return new Date(text.includes('T') ? text : `${text.slice(0, 10)}T00:00:00`);
}

function reportMonthKey(date) {
  const d = date instanceof Date ? date : reportDate(date);
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function reportMonthLabel(key, long = false) {
  if (!key) return '';
  return new Date(`${key}-01T00:00:00`).toLocaleDateString('es-AR', {
    month: long ? 'long' : 'short',
    year: 'numeric',
  });
}

function reportMonthShift(key, offset) {
  const d = new Date(`${key}-01T00:00:00`);
  d.setMonth(d.getMonth() + offset);
  return reportMonthKey(d);
}

function reportLastMonths(key, count = 6) {
  return Array.from({ length: count }, (_, i) => reportMonthShift(key, i - count + 1));
}

function reportAddDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function reportEndOfNextMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 2, 0, 23, 59, 59, 999);
}

function reportIsBeforeToday(dateStr, today) {
  const d = reportDate(dateStr);
  return d && d < today;
}

// effectiveInstallmentState e isFinanciallyActiveInstallment viven en index.html (globales)

function reportPct(value, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function reportPctLabel(value, total) {
  return maskSensitiveNumber(reportPct(value, total).toLocaleString('es-AR', { maximumFractionDigits: 1 }), '%');
}

function reportDelta(current, previous) {
  if (!previous) {
    return { text: 'Sin comparación', tone: 'slate', raw: null };
  }
  const raw = ((current - previous) / Math.abs(previous)) * 100;
  const arrow = raw >= 0 ? '↑' : '↓';
  return {
    raw,
    text: `${arrow} ${Math.abs(raw).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`,
    tone: raw >= 0 ? 'green' : 'red',
  };
}

function reportDeltaWithMonth(current, previous, prevKey) {
  const delta = reportDelta(current, previous);
  return delta.raw == null ? delta : { ...delta, text: `${delta.text} vs ${reportMonthLabel(prevKey)}` };
}

function reportInitials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase() || '?';
}

function reportCsvEscape(value) {
  const text = String(value ?? '');
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function reportDownloadCsv(filename, rows) {
  if (!rows || rows.length === 0) {
    alert('No hay datos para exportar en esta vista.');
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(';'),
    ...rows.map(row => headers.map(h => reportCsvEscape(row[h])).join(';')),
  ].join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fallbackBillingPeriods(card, movements) {
  const periods = {};
  (movements || [])
    .filter(m => m.creditCardId === card.id && m.estado !== 'Cancelado')
    .forEach(mov => {
      const cuotas = Math.max(1, Number(mov.cuotasTarjeta || 1));
      const cuotaMonto = moneyBase(mov, 'monto') / cuotas;
      const compra = reportDate(mov.fechaCompra) || new Date();
      let y = compra.getFullYear();
      let mo = compra.getMonth();
      if (compra.getDate() > Number(card.diaCierre || 15)) {
        mo += 1;
        if (mo > 11) { mo = 0; y += 1; }
      }
      for (let i = 0; i < cuotas; i++) {
        let py = y;
        let pm = mo + i;
        while (pm > 11) { pm -= 12; py += 1; }
        const key = `${py}-${String(pm + 1).padStart(2, '0')}`;
        const venc = `${key}-${String(card.diaVencimiento || 25).padStart(2, '0')}`;
        if (!periods[key]) periods[key] = { key, year: py, month: pm + 1, fechaVencimiento: venc, monto: 0, detalle: [] };
        periods[key].monto += cuotaMonto;
        periods[key].detalle.push({ mov, cuotaNum: i + 1, monto: cuotaMonto });
      }
    });
  return Object.values(periods).sort((a, b) => a.key.localeCompare(b.key));
}

function fallbackDisponible(card, movements, stmtPayments) {
  const periods = fallbackBillingPeriods(card, movements);
  const cardPayments = (stmtPayments || []).filter(p => p.creditCardId === card.id);
  const totalCargado = (movements || [])
    .filter(m => m.creditCardId === card.id && m.estado !== 'Cancelado')
    .reduce((s, m) => s + moneyBase(m, 'monto'), 0);
  const totalPagado = periods
    .filter(period => cardPayments.some(p => p.año === period.year && p.mes === period.month))
    .reduce((s, p) => s + p.monto, 0);
  return { disponible: reportNum(card.limiteTotal) - totalCargado + totalPagado, totalCargado, totalPagado };
}

function Badge({ children, tone = 'slate' }) {
  const c = REPORT_ACCENTS[tone] || REPORT_ACCENTS.slate;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 800, color: c.color, background: c.bg, border: `1px solid ${c.bg}` }}>
      {children}
    </span>
  );
}

function AvatarInitials({ name, tone = 'indigo' }) {
  const c = REPORT_ACCENTS[tone] || REPORT_ACCENTS.indigo;
  return (
    <span style={{ width: 34, height: 34, borderRadius: '50%', background: c.bg, color: c.color, border: `1px solid ${c.color}33`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
      {reportInitials(name)}
    </span>
  );
}

function ReportMoneyValue({ value, tone = 'indigo', size = 'md' }) {
  const c = REPORT_ACCENTS[tone] || REPORT_ACCENTS.indigo;
  const text = String(value ?? '');
  const fontSize =
    size === 'hero'
      ? text.length > 16 ? 28 : text.length > 12 ? 34 : 42
      : text.length > 15 ? 16 : text.length > 11 ? 18 : 22;
  return (
    <div style={{
      color: c.color,
      fontSize,
      lineHeight: 1.05,
      fontWeight: 900,
      fontFamily: 'DM Mono, monospace',
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: 0,
    }}>
      {value}
    </div>
  );
}

function ReportKpiCard({ label, value, sub, tone = 'indigo', mark = '$', delta, onClick, selected }) {
  const c = REPORT_ACCENTS[tone] || REPORT_ACCENTS.indigo;
  return (
    <div onClick={onClick} style={{ padding: '18px 16px', background: selected ? c.bg : '#fff', borderRadius: 12, border: `1px solid ${selected ? c.color : '#e2e8f0'}`, boxShadow: selected ? `0 0 0 3px ${c.bg}` : '0 10px 28px rgba(15,23,42,0.05)', minWidth: 0, cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s' }}>
      <div style={{ display: 'flex', gap: 11, alignItems: 'center', minWidth: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: 14, background: selected ? c.color : c.bg, color: selected ? '#fff' : c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
          {mark}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 900, lineHeight: 1.25 }}>{label}</div>
          <div style={{ marginTop: 6 }}><ReportMoneyValue value={value} tone={tone} /></div>
          {sub && <div style={{ marginTop: 7, fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
          {delta && <div style={{ marginTop: 8, fontSize: 12, color: (REPORT_ACCENTS[delta.tone] || REPORT_ACCENTS.slate).color, fontWeight: 800 }}>{delta.text}</div>}
        </div>
      </div>
    </div>
  );
}

function PortfolioHeroCard({ portfolio }) {
  const summary = [
    ['Capital invertido', formatCurrency(portfolio.totalInvertido), 'green'],
    ['Total esperado', formatCurrency(portfolio.totalEsperado), 'blue'],
    ['Pendiente total', formatCurrency(portfolio.saldoPendiente), 'amber'],
    ['Ganancia esperada', formatCurrency(portfolio.gananciaEsperada), 'indigo'],
  ];
  return (
    <Card style={{ padding: 22, border: '1px solid var(--border)', boxShadow: '0 14px 34px rgba(15,23,42,0.07)', minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'DM Mono, monospace' }}>TA</div>
            <div>
              <div style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 900 }}>Total a recuperar</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Foto completa de la cartera</div>
            </div>
          </div>
          <ReportMoneyValue value={formatCurrency(portfolio.totalEsperado)} tone="indigo" size="hero" />
          <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 13 }}>Incluye capital, intereses y cuotas futuras ya pactadas.</div>
        </div>
        <Badge tone={portfolio.saldoVencido > 0 ? 'red' : 'green'}>{portfolio.saldoVencido > 0 ? 'Con mora activa' : 'Sin mora activa'}</Badge>
      </div>

      <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 14 }}>
        {summary.map(([label, value, tone]) => (
          <div key={label} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ marginTop: 7 }}><ReportMoneyValue value={value} tone={tone} /></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PortfolioMiniKpi({ label, value, sub, tone = 'indigo', mark }) {
  const c = REPORT_ACCENTS[tone] || REPORT_ACCENTS.indigo;
  return (
    <Card style={{ padding: 16, border: '1px solid var(--border)', boxShadow: '0 10px 28px rgba(15,23,42,0.05)', minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{mark}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>{label}</div>
          <div style={{ marginTop: 7 }}><ReportMoneyValue value={value} tone={tone} /></div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.3 }}>{sub}</div>
        </div>
      </div>
    </Card>
  );
}

function ReportInsightStrip({ title, mark = 'i', tone = 'indigo', items = [], layout = 'wide' }) {
  const main = REPORT_ACCENTS[tone] || REPORT_ACCENTS.indigo;
  const isCompact = layout === 'compact';
  return (
    <Card style={{ padding: '18px 22px', border: '1px solid var(--border)', boxShadow: '0 10px 28px rgba(15,23,42,0.04)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: isCompact ? 16 : 18, alignItems: isCompact ? 'start' : 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: main.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, fontFamily: 'DM Mono, monospace', flexShrink: 0, marginTop: isCompact ? 44 : 0 }}>
          {mark}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 900, marginBottom: 14 }}>{title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: isCompact ? `repeat(${items.length}, 1fr)` : 'repeat(auto-fit, minmax(210px, 1fr))', alignItems: 'stretch', rowGap: isCompact ? 18 : 0 }}>
            {items.map((item, i) => {
              const c = REPORT_ACCENTS[item.tone] || REPORT_ACCENTS.indigo;
              return (
                <div key={`${item.mark}-${i}`} style={{ minWidth: 0, padding: isCompact ? '0 10px' : '4px 20px', borderLeft: isCompact ? (i > 0 ? '1px solid var(--border)' : 'none') : (i > 0 ? '1px solid var(--border)' : 'none'), display: 'flex', flexDirection: isCompact ? 'column' : 'row', alignItems: isCompact ? 'center' : 'center', textAlign: isCompact ? 'center' : 'left', gap: isCompact ? 8 : 14 }}>
                  <div style={{ width: isCompact ? 32 : 42, height: isCompact ? 32 : 42, borderRadius: '50%', background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isCompact ? 11 : 13, fontWeight: 900, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
                    {item.mark}
                  </div>
                  <div style={{ minWidth: 0, fontSize: isCompact ? 12 : 14, lineHeight: 1.45, color: '#334155' }}>
                    {item.value && <div style={{ fontSize: isCompact ? 14 : 16, lineHeight: 1.2, color: 'var(--text-primary)', fontWeight: 900, marginBottom: 4 }}>{item.value}</div>}
                    <div>{item.content || item.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReportCardHeader({ title, action, sub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)' }}>{title}</div>
        {sub && <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function ProgressBar({ value, max, color = '#4f46e5', height = 7 }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
    </div>
  );
}

function DonutChart({ segments, centerValue, centerLabel, size = 190 }) {
  const total = segments.reduce((s, seg) => s + reportNum(seg.value), 0);
  let acc = 0;
  const gradient = total > 0
    ? segments.map(seg => {
      const start = (acc / total) * 100;
      acc += reportNum(seg.value);
      const end = (acc / total) * 100;
      return `${seg.color} ${start}% ${end}%`;
    }).join(', ')
    : '#e2e8f0 0% 100%';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `conic-gradient(${gradient})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: size * 0.54, height: size * 0.54, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px #f1f5f9' }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>{centerValue}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{centerLabel}</div>
      </div>
    </div>
  );
}

function HorizontalBars({ rows, max, valueLabel = row => formatCurrency(row.value), color = row => row.color || '#4f46e5' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map(row => (
        <div key={row.key || row.label}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) 80px 120px 72px', gap: 12, alignItems: 'center', fontSize: 12 }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 800, minWidth: 0 }}>{row.label}</div>
            <div style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{maskSensitiveNumber(row.count || 0)}</div>
            <div style={{ color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace', fontWeight: 800, textAlign: 'right' }}>{valueLabel(row)}</div>
            <div style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{reportPctLabel(row.value, max)}</div>
          </div>
          <div style={{ marginTop: 7 }}><ProgressBar value={row.value} max={max} color={color(row)} /></div>
        </div>
      ))}
    </div>
  );
}

function VerticalBars({ rows, max, height = 190, color = row => row.color || '#94a3b8', valueLabel = v => formatCurrency(v) }) {
  return (
    <div style={{ height, display: 'grid', gridTemplateColumns: `repeat(${Math.max(rows.length, 1)}, 1fr)`, gap: 12, alignItems: 'end', borderBottom: '1px solid var(--border)', padding: '12px 4px 0' }}>
      {rows.map(row => {
        const pct = max > 0 ? Math.max(3, (row.value / max) * 100) : 3;
        return (
          <div key={row.key} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{valueLabel(row.value)}</div>
            <div title={row.label} style={{ width: '58%', minWidth: 18, maxWidth: 52, height: `${pct}%`, borderRadius: '8px 8px 0 0', background: color(row), boxShadow: '0 10px 24px rgba(79,70,229,0.12)' }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>{row.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function MiniTable({ columns, rows, empty = 'Sin datos', onRowClick, compact = false }) {
  if (!rows.length) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>{empty}</div>;
  }
  return (
    <div style={{ overflowX: compact ? 'visible' : 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? 12 : 13, minWidth: compact ? 0 : 560, tableLayout: compact ? 'fixed' : 'auto' }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ padding: compact ? '8px 7px' : '10px 10px', textAlign: col.align || 'left', color: 'var(--text-muted)', fontSize: 10, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', width: col.width || undefined }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id || idx} onClick={() => onRowClick && onRowClick(row)} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: onRowClick ? 'pointer' : 'default' }}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: compact ? '10px 7px' : '12px 10px', textAlign: col.align || 'left', color: 'var(--text-primary)', verticalAlign: 'middle', whiteSpace: compact ? 'nowrap' : undefined, overflow: compact ? 'hidden' : undefined, textOverflow: compact ? 'ellipsis' : undefined }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreditCardPreview({ card, stats, index, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ padding: 0, border: 'none', background: 'transparent', textAlign: 'left', cursor: onClick ? 'pointer' : 'default', width: '100%' }}>
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 12px 28px rgba(15,23,42,0.08)', background: 'var(--bg-surface)' }}>
        <div style={{ background: REPORT_CARD_GRADIENTS[index % REPORT_CARD_GRADIENTS.length], color: '#fff', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>{card.banco || 'Tarjeta'}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{card.nombre || 'Crédito'}</div>
            </div>
            <Badge tone={card.estado === 'Activa' ? 'green' : 'slate'}>{card.estado || 'Activa'}</Badge>
          </div>
          <div style={{ fontSize: 16, letterSpacing: '0.14em', fontFamily: 'DM Mono, monospace', fontWeight: 900 }}>•••• •••• •••• {card.ultimosDigitos || '----'}</div>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 900 }}>Límite</div><div style={{ marginTop: 3, color: 'var(--text-primary)', fontWeight: 900, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(card.limiteTotal)}</div></div>
            <div><div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 900 }}>Usado</div><div style={{ marginTop: 3, color: '#059669', fontWeight: 900, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(stats.netDebt)}</div></div>
          </div>
          <ProgressBar value={stats.netDebt} max={card.limiteTotal} color={stats.usagePct > 80 ? '#dc2626' : stats.usagePct > 60 ? '#d97706' : '#4f46e5'} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Cierre día {card.diaCierre || '-'}</span>
            <span>Vence día {card.diaVencimiento || '-'}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ReportesScreen({ data, onNav }) {
  const {
    clients = [],
    operations = [],
    installments = [],
    payments = [],
    creditCards = [],
    creditCardMovements = [],
    creditCardStatementPayments = [],
    cashMovements = [],
    settings = {},
  } = data || {};

  const [activeTab, setActiveTab] = React.useState('cartera');
  const [period, setPeriod] = React.useState(() => reportMonthKey(new Date()));
  const [selectedMonthlyKpi, setSelectedMonthlyKpi] = React.useState('cobrado');
  const [clientSearch, setClientSearch] = React.useState('');
  const [clientEstado, setClientEstado] = React.useState('todos');
  const [clientRiesgo, setClientRiesgo] = React.useState('todos');
  const [clientSort, setClientSort] = React.useState('saldoPendiente');
  const [clientPage, setClientPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [moraSearch, setMoraSearch] = React.useState('');
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const tabs = [
    { id: 'cartera', label: 'Cartera', sub: 'Analizá cartera, cobros, mora, caja y tarjetas.' },
    { id: 'mensual', label: 'Mensual', sub: 'Analizá el rendimiento mensual de tu cartera y cobros.' },
    { id: 'clientes', label: 'Por cliente', sub: 'Rendimiento y estado de tu cartera agrupado por cliente.' },
    { id: 'mora', label: 'Mora', sub: 'Análisis de mora y cuotas vencidas.' },
    { id: 'caja', label: 'Caja', sub: 'Flujo de entradas, salidas y saldo operativo.' },
    { id: 'tarjetas', label: 'Tarjetas', sub: 'Gestión y resumen de tus tarjetas de crédito.' },
  ];

  const activeTabMeta = tabs.find(t => t.id === activeTab) || tabs[0];

  const indexes = React.useMemo(() => {
    const clientById = new Map(clients.map(c => [c.id, c]));
    const operationById = new Map(operations.map(o => [o.id, o]));
    const cardById = new Map(creditCards.map(c => [c.id, c]));
    const opsByClient = new Map();
    const instByClient = new Map();
    const instByOperation = new Map();
    const payByClient = new Map();
    const movByCard = new Map();
    operations.forEach(o => {
      if (!opsByClient.has(o.clientId)) opsByClient.set(o.clientId, []);
      opsByClient.get(o.clientId).push(o);
    });
    installments.forEach(i => {
      if (!instByClient.has(i.clientId)) instByClient.set(i.clientId, []);
      instByClient.get(i.clientId).push(i);
      if (!instByOperation.has(i.operationId)) instByOperation.set(i.operationId, []);
      instByOperation.get(i.operationId).push(i);
    });
    payments.forEach(p => {
      if (!payByClient.has(p.clientId)) payByClient.set(p.clientId, []);
      payByClient.get(p.clientId).push(p);
    });
    creditCardMovements.forEach(m => {
      if (!movByCard.has(m.creditCardId)) movByCard.set(m.creditCardId, []);
      movByCard.get(m.creditCardId).push(m);
    });
    return { clientById, operationById, cardById, opsByClient, instByClient, instByOperation, payByClient, movByCard };
  }, [clients, operations, installments, payments, creditCards, creditCardMovements]);

  const overdueInstallments = React.useMemo(
    () => installments.filter(i => isFinanciallyActiveInstallment(i) && effectiveInstallmentState(i, today) === 'Vencida'),
    [installments, today]
  );

  const upcomingInstallments = React.useMemo(() => {
    const max = new Date(today);
    max.setDate(max.getDate() + 15);
    return installments
      .filter(i => {
        const d = reportDate(i.fechaVencimiento);
        return isFinanciallyActiveInstallment(i) && d && d >= today && d <= max && reportNum(i.saldoPendiente) > 0;
      })
      .sort((a, b) => String(a.fechaVencimiento).localeCompare(String(b.fechaVencimiento)))
      .map(i => ({
        ...i,
        client: indexes.clientById.get(i.clientId),
        operation: indexes.operationById.get(i.operationId),
      }));
  }, [installments, today, indexes]);

  const portfolio = React.useMemo(() => {
    const endOfNextMonth = reportEndOfNextMonth(today);
    const plus60 = reportAddDays(today, 60);
    const pendingInstallments = installments.filter(i => isFinanciallyActiveInstallment(i) && reportNum(i.saldoPendiente) > 0);
    const totalInvertido = operations.reduce((s, o) => s + moneyBase(o, 'costoReal'), 0);
    const totalFinanciado = operations.reduce((s, o) => s + moneyBase(o, 'montoFinanciado'), 0);
    const totalEsperado = operations.reduce((s, o) => s + moneyBase(o, 'totalEsperado'), 0);
    const saldoPendiente = pendingInstallments.reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
    const saldoVencido = overdueInstallments.reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
    const saldoAlDia = Math.max(0, saldoPendiente - saldoVencido);
    const proximoACobrar = pendingInstallments
      .filter(i => {
        const d = reportDate(i.fechaVencimiento);
        return d && d >= today && d <= endOfNextMonth;
      })
      .reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
    const proximos60 = pendingInstallments
      .filter(i => {
        const d = reportDate(i.fechaVencimiento);
        return d && d >= today && d <= plus60;
      })
      .reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
    const exigible60 = saldoVencido + proximos60;
    const gananciaEsperada = operations.reduce((s, o) => s + moneyBase(o, 'gananciaEsperada'), 0);
    const totalCobrado = payments.reduce((s, p) => s + moneyBase(p, 'monto'), 0);
    const faltaRecuperarCapital = Math.max(0, totalInvertido - totalCobrado);
    const gananciaRealizada = Math.max(0, totalCobrado - totalInvertido);
    const typeSource = settings?.tiposOperacion?.length ? settings.tiposOperacion : ['Préstamo en efectivo', 'Venta financiada', 'Compra con tarjeta', 'Otro'];
    const typeRows = Array.from(new Set([...typeSource, ...operations.map(o => o.tipo || 'Otro')])).map(tipo => {
      const ops = operations.filter(o => (o.tipo || 'Otro') === tipo);
      const monto = ops.reduce((s, o) => s + moneyBase(o, 'totalEsperado'), 0);
      return { key: tipo, label: tipo, count: ops.length, value: monto };
    }).sort((a, b) => b.value - a.value);
    const states = ['Pagada', 'Pendiente', 'Parcial', 'Vencida', 'Anulada', 'Refinanciada'];
    const stateColors = { Pagada: '#22c55e', Pendiente: '#4f46e5', Parcial: '#f59e0b', Vencida: '#ef4444', Anulada: '#94a3b8', Refinanciada: '#7c3aed' };
    const stateRows = states.map(estado => {
      const rows = installments.filter(i => effectiveInstallmentState(i, today) === estado);
      const amountKey = estado === 'Pagada' ? 'montoPagado' : 'saldoPendiente';
      return { key: estado, label: estado, count: rows.length, value: rows.reduce((s, i) => s + moneyBase(i, amountKey), 0), color: stateColors[estado] || '#94a3b8' };
    });
    const topType = typeRows[0];
    const topClients = clients.map(c => {
      const insts = indexes.instByClient.get(c.id) || [];
      return { client: c, saldo: insts.reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0) };
    }).sort((a, b) => b.saldo - a.saldo).slice(0, 5);
    const latestPayments = [...payments].sort((a, b) => String(b.fechaPago).localeCompare(String(a.fechaPago))).slice(0, 5).map(p => ({ ...p, client: indexes.clientById.get(p.clientId) }));
    return { totalInvertido, totalFinanciado, totalEsperado, saldoPendiente, saldoVencido, saldoAlDia, proximoACobrar, proximos60, exigible60, gananciaEsperada, totalCobrado, faltaRecuperarCapital, gananciaRealizada, typeRows, stateRows, topType, topClients, latestPayments };
  }, [operations, installments, overdueInstallments, payments, clients, indexes, settings, today]);

  const monthly = React.useMemo(() => {
    const prev = reportMonthShift(period, -1);
    const months = reportLastMonths(period, 6);
    const monthStats = (key) => {
      const opsMes = operations.filter(o => reportMonthKey(o.fechaInicio) === key);
      const clientesMes = clients.filter(c => reportMonthKey(c.createdAt) === key);
      const pays = payments.filter(p => reportMonthKey(p.fechaPago) === key);
      const insts = installments.filter(i => reportMonthKey(i.fechaVencimiento) === key);
      const mora = insts.filter(i => effectiveInstallmentState(i, today) === 'Vencida');
      return {
        key,
        ops: opsMes.length,
        clients: clientesMes.length,
        cobrado: pays.reduce((s, p) => s + moneyBase(p, 'monto'), 0),
        vencimientos: insts.length,
        moraCount: mora.length,
        moraMonto: mora.reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0),
      };
    };
    const current = monthStats(period);
    const previous = monthStats(prev);
    const history = months.map(m => monthStats(m));
    return { current, previous, history, prev };
  }, [period, operations, clients, payments, installments, today]);

  const clientStats = React.useMemo(() => clients.map(c => {
    const ops = indexes.opsByClient.get(c.id) || [];
    const pays = indexes.payByClient.get(c.id) || [];
    const insts = indexes.instByClient.get(c.id) || [];
    const overdue = insts.filter(i => reportIsBeforeToday(i.fechaVencimiento, today) && reportNum(i.saldoPendiente) > 0);
    const totalPend = insts.reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
    const totalVenc = overdue.reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
    const totalPagado = pays.reduce((s, p) => s + moneyBase(p, 'monto'), 0);
    const avgDias = overdue.length ? Math.round(overdue.reduce((s, i) => s + calculateOverdueDays(i.fechaVencimiento), 0) / overdue.length) : 0;
    const lastPayment = pays.slice().sort((a, b) => String(b.fechaPago).localeCompare(String(a.fechaPago)))[0];
    return { ...c, totalOps: ops.length, totalPagado, totalPend, totalVenc, avgDias, lastPaymentDate: lastPayment?.fechaPago || '', overdueCount: overdue.length };
  }), [clients, indexes, today]);

  const filteredClients = React.useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const sorted = clientStats
      .filter(c => !q || [c.nombre, c.telefono, c.codigo, c.dni].some(v => String(v || '').toLowerCase().includes(q)))
      .filter(c => clientEstado === 'todos' || c.estado === clientEstado)
      .filter(c => clientRiesgo === 'todos' || c.riesgo === clientRiesgo)
      .sort((a, b) => {
        const map = { saldoPendiente: 'totalPend', saldoVencido: 'totalVenc', totalCobrado: 'totalPagado', operaciones: 'totalOps', diasAtraso: 'avgDias' };
        return reportNum(b[map[clientSort] || 'totalPend']) - reportNum(a[map[clientSort] || 'totalPend']);
      });
    return sorted;
  }, [clientStats, clientSearch, clientEstado, clientRiesgo, clientSort]);

  const clientPages = Math.max(1, Math.ceil(filteredClients.length / rowsPerPage));
  const visibleClients = filteredClients.slice((clientPage - 1) * rowsPerPage, clientPage * rowsPerPage);

  React.useEffect(() => { setClientPage(1); }, [clientSearch, clientEstado, clientRiesgo, clientSort, rowsPerPage]);

  const mora = React.useMemo(() => {
    const uniqueClients = new Set(overdueInstallments.map(i => i.clientId));
    const totalVencido = overdueInstallments.reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
    const avgDias = overdueInstallments.length ? Math.round(overdueInstallments.reduce((s, i) => s + calculateOverdueDays(i.fechaVencimiento), 0) / overdueInstallments.length) : 0;
    const prevMonth = reportMonthShift(period, -1);
    const currentMonthOverdue = overdueInstallments.filter(i => reportMonthKey(i.fechaVencimiento) <= period).reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
    const prevMonthOverdue = installments
      .filter(i => reportMonthKey(i.fechaVencimiento) <= prevMonth && reportNum(i.saldoPendiente) > 0)
      .reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
    const recoveredThisMonth = payments.filter(p => reportMonthKey(p.fechaPago) === period && uniqueClients.has(p.clientId)).reduce((s, p) => s + moneyBase(p, 'monto'), 0);
    const ranges = [
      { label: '1-15 días', min: 1, max: 15, color: '#ef4444' },
      { label: '16-30 días', min: 16, max: 30, color: '#f97316' },
      { label: '31-60 días', min: 31, max: 60, color: '#f59e0b' },
      { label: '61-90 días', min: 61, max: 90, color: '#7c3aed' },
      { label: 'Más de 90 días', min: 91, max: 9999, color: '#991b1b' },
    ].map(r => {
      const rows = overdueInstallments.filter(i => {
        const d = calculateOverdueDays(i.fechaVencimiento);
        return d >= r.min && d <= r.max;
      });
      return { ...r, key: r.label, count: rows.length, value: rows.reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0) };
    });
    const byClient = Array.from(uniqueClients).map(clientId => {
      const client = indexes.clientById.get(clientId);
      const rows = overdueInstallments.filter(i => i.clientId === clientId);
      const amount = rows.reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
      const avg = rows.length ? Math.round(rows.reduce((s, i) => s + calculateOverdueDays(i.fechaVencimiento), 0) / rows.length) : 0;
      const last = rows.slice().sort((a, b) => String(b.fechaVencimiento).localeCompare(String(a.fechaVencimiento)))[0];
      return { id: clientId, client, count: rows.length, amount, avg, lastDue: last?.fechaVencimiento || '', risk: client?.riesgo || 'Medio' };
    }).sort((a, b) => b.amount - a.amount);
    const history = reportLastMonths(period, 6).map(key => {
      const value = installments
        .filter(i => reportMonthKey(i.fechaVencimiento) <= key && reportNum(i.saldoPendiente) > 0 && reportIsBeforeToday(i.fechaVencimiento, new Date(`${key}-28T00:00:00`)))
        .reduce((s, i) => s + moneyBase(i, 'saldoPendiente'), 0);
      return { key, label: reportMonthLabel(key), value, color: key === period ? '#ef4444' : '#fca5a5' };
    });
    return { totalVencido, uniqueClients: uniqueClients.size, avgDias, recoveredThisMonth, variation: reportDelta(currentMonthOverdue, prevMonthOverdue), ranges, byClient, history };
  }, [overdueInstallments, payments, period, installments, indexes]);

  const caja = React.useMemo(() => {
    const entradas = cashMovements.filter(m => moneyBase(m, 'monto') > 0).reduce((s, m) => s + moneyBase(m, 'monto'), 0);
    const salidas = cashMovements.filter(m => moneyBase(m, 'monto') < 0).reduce((s, m) => s + Math.abs(moneyBase(m, 'monto')), 0);
    const saldo = entradas - salidas;
    const capitalEnLaCalle = portfolio.saldoPendiente;
    const gananciaCobrada = Math.max(0, portfolio.totalCobrado - portfolio.totalInvertido);
    const compromisoTarjetas = creditCardMovements.filter(m => m.estado !== 'Cancelado').reduce((s, m) => s + moneyBase(m, 'monto'), 0);
    const byTypeMap = new Map();
    cashMovements.forEach(m => {
      const key = m.tipo || 'Sin tipo';
      const current = byTypeMap.get(key) || { key, label: key, count: 0, value: 0, abs: 0, color: moneyBase(m, 'monto') >= 0 ? '#059669' : '#dc2626' };
      current.count += 1;
      current.value += moneyBase(m, 'monto');
      current.abs += Math.abs(moneyBase(m, 'monto'));
      byTypeMap.set(key, current);
    });
    const byType = Array.from(byTypeMap.values()).sort((a, b) => b.abs - a.abs);
    const history = reportLastMonths(period, 6).map(key => {
      const movs = cashMovements.filter(m => reportMonthKey(m.fecha) === key);
      const value = movs.reduce((s, m) => s + moneyBase(m, 'monto'), 0);
      return { key, label: reportMonthLabel(key), value: Math.abs(value), signed: value, color: value >= 0 ? '#059669' : '#dc2626' };
    });
    return { entradas, salidas, saldo, capitalEnLaCalle, gananciaCobrada, compromisoTarjetas, byType, history };
  }, [cashMovements, portfolio, creditCardMovements, period]);

  const tarjetas = React.useMemo(() => {
    const getPeriods = (card) => typeof computeBillingPeriods === 'function' ? computeBillingPeriods(card, creditCardMovements) : fallbackBillingPeriods(card, creditCardMovements);
    const getDisponible = (card) => typeof computeDisponible === 'function' ? computeDisponible(card, creditCardMovements, creditCardStatementPayments) : fallbackDisponible(card, creditCardMovements, creditCardStatementPayments);
    const stats = creditCards.map((card, idx) => {
      const periods = getPeriods(card);
      const disp = getDisponible(card);
      const netDebt = Math.max(0, disp.totalCargado - disp.totalPagado);
      const usagePct = reportNum(card.limiteTotal) > 0 ? (netDebt / reportNum(card.limiteTotal)) * 100 : 0;
      return { card, index: idx, periods, ...disp, netDebt, usagePct };
    });
    const limiteTotal = creditCards.reduce((s, c) => s + reportNum(c.limiteTotal), 0);
    const usadoTotal = stats.reduce((s, st) => s + st.netDebt, 0);
    const disponibleTotal = stats.reduce((s, st) => s + st.disponible, 0);
    const paidSet = new Set(creditCardStatementPayments.map(p => `${p.creditCardId}-${p.año}-${p.mes}`));
    const allPeriods = stats.flatMap(st => st.periods.map(p => ({ ...p, card: st.card, paid: paidSet.has(`${st.card.id}-${p.year}-${p.month}`) })));
    const pendientes = allPeriods.filter(p => !p.paid && p.monto > 0).sort((a, b) => String(a.fechaVencimiento).localeCompare(String(b.fechaVencimiento)));
    const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 15);
    const proximos = pendientes.filter(p => {
      const d = reportDate(p.fechaVencimiento);
      return d && d <= maxDate;
    });
    const pagadoEsteMes = allPeriods.filter(p => p.paid && `${p.year}-${String(p.month).padStart(2, '0')}` === period).reduce((s, p) => s + p.monto, 0);
    const pagosHistory = reportLastMonths(period, 6).map(key => {
      const [year, month] = key.split('-').map(Number);
      const amount = allPeriods.filter(p => p.paid && p.year === year && p.month === month).reduce((s, p) => s + p.monto, 0);
      return { key, label: reportMonthLabel(key), value: amount, color: key === period ? '#7c3aed' : '#cbd5e1' };
    });
    return { stats, limiteTotal, usadoTotal, disponibleTotal, pendientes, proximos, pagadoEsteMes, pagosHistory };
  }, [creditCards, creditCardMovements, creditCardStatementPayments, today, period]);

  function handleExport() {
    if (activeTab === 'clientes') {
      reportDownloadCsv('reporte-clientes.csv', filteredClients.map(c => ({
        Cliente: c.nombre,
        Estado: c.estado,
        Riesgo: c.riesgo,
        Operaciones: c.totalOps,
        TotalCobrado: c.totalPagado,
        SaldoPendiente: c.totalPend,
        Vencido: c.totalVenc,
        DiasAtraso: c.avgDias,
        UltimoPago: c.lastPaymentDate,
      })));
      return;
    }
    if (activeTab === 'mora') {
      reportDownloadCsv('reporte-mora.csv', mora.byClient.map(r => ({
        Cliente: r.client?.nombre || 'Sin cliente',
        CuotasVencidas: r.count,
        MontoVencido: r.amount,
        DiasPromedio: r.avg,
        UltimoVencimiento: r.lastDue,
        Riesgo: r.risk,
      })));
      return;
    }
    if (activeTab === 'tarjetas') {
      reportDownloadCsv('reporte-tarjetas.csv', tarjetas.stats.map(st => ({
        Tarjeta: st.card.nombre,
        Banco: st.card.banco,
        Limite: st.card.limiteTotal,
        Usado: st.netDebt,
        Disponible: st.disponible,
        Estado: st.card.estado,
      })));
      return;
    }
    alert('Exportación CSV detallada disponible para Por cliente, Mora y Tarjetas. PDF próximamente.');
  }

  const commonKpiGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 };
  const portfolioHeroGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 14, alignItems: 'stretch' };
  const twoColGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 };

  function renderUpcomingTable(rows = upcomingInstallments.slice(0, 5)) {
    return (
      <MiniTable
        rows={rows}
        compact
        empty="Sin próximos vencimientos"
        onRowClick={row => row.operationId && onNav && onNav('operaciones', row.operationId)}
        columns={[
          { key: 'client', label: 'Cliente', width: '28%', render: (_, row) => row.client?.nombre || 'Sin cliente' },
          { key: 'operation', label: 'Operación', width: '23%', render: (_, row) => row.operation?.codigo || row.operation?.descripcion || '-' },
          { key: 'numeroCuota', label: 'Cuota', width: '13%', render: (_, row) => `${row.numeroCuota}/${row.totalCuotas}` },
          { key: 'fechaVencimiento', label: 'Vence', width: '16%', render: v => formatDate(v) },
          { key: 'saldoPendiente', label: 'Monto', width: '20%', align: 'right', render: (_, row) => <strong style={{ fontFamily: 'DM Mono, monospace' }}>{formatCurrency(moneyBase(row, 'saldoPendiente'))}</strong> },
        ]}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--text-primary)' }}>Reportes</h2>
          <div style={{ marginTop: 6, color: '#475569', fontSize: 14 }}>{activeTabMeta.sub}</div>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 14px 34px rgba(15,23,42,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', flexWrap: 'wrap' }}>
            <Input type="month" value={period} onChange={e => setPeriod(e.target.value || reportMonthKey(new Date()))} style={{ width: 155, height: 34, fontSize: 12 }} />
            <Btn variant="secondary" size="sm" onClick={() => alert('Filtros avanzados próximamente.')}>Filtros</Btn>
            <Btn variant="secondary" size="sm" onClick={handleExport}>Exportar</Btn>
          </div>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activeTab === 'cartera' && (
            <>
              <div style={portfolioHeroGrid}>
                <PortfolioHeroCard portfolio={portfolio} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(170px, 1fr))', gap: 12 }}>
                  <PortfolioMiniKpi label="Vencido hoy" value={formatCurrency(portfolio.saldoVencido)} sub="Cuotas atrasadas a la fecha" tone="red" mark="VH" />
                  <PortfolioMiniKpi label="Próximo a cobrar" value={formatCurrency(portfolio.proximoACobrar)} sub="Desde hoy hasta fin del mes próximo" tone="amber" mark="PC" />
                  <PortfolioMiniKpi label="Exigible 60 días" value={formatCurrency(portfolio.exigible60)} sub="Vencido + próximos 60 días" tone="blue" mark="60" />
                  <PortfolioMiniKpi
                    label={portfolio.gananciaRealizada > 0 ? 'Ganancia realizada' : 'Falta recuperar capital'}
                    value={formatCurrency(portfolio.gananciaRealizada > 0 ? portfolio.gananciaRealizada : portfolio.faltaRecuperarCapital)}
                    sub={portfolio.gananciaRealizada > 0 ? 'Capital ya recuperado' : 'Antes de mostrar ganancia real'}
                    tone={portfolio.gananciaRealizada > 0 ? 'green' : 'slate'}
                    mark={portfolio.gananciaRealizada > 0 ? 'GR' : 'FR'}
                  />
                </div>
              </div>

              <div style={twoColGrid}>
                <Card style={{ padding: 20, border: '1px solid var(--border)' }}>
                  <ReportCardHeader title="Distribución por tipo de operación" />
                  <HorizontalBars rows={portfolio.typeRows} max={portfolio.totalEsperado} color={() => '#4f46e5'} />
                </Card>
                <Card style={{ padding: 20, border: '1px solid var(--border)' }}>
                  <ReportCardHeader title="Estado de cuotas" />
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <DonutChart segments={portfolio.stateRows.map(r => ({ value: r.count, color: r.color }))} centerValue={maskSensitiveNumber(installments.length)} centerLabel="cuotas totales" />
                    <div style={{ flex: 1, minWidth: 240 }}>
                      {portfolio.stateRows.map(row => (
                        <div key={row.key} style={{ display: 'grid', gridTemplateColumns: '1fr 55px 120px', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: row.color }} />{row.label}</div>
                          <strong style={{ textAlign: 'right' }}>{maskSensitiveNumber(row.count)}</strong>
                          <strong style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(row.value)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              <ReportInsightStrip
                title="Lectura rápida de tu cartera"
                mark="i"
                tone="indigo"
                items={[
                  {
                    tone: 'purple',
                    mark: '$',
                    content: <>La mayor parte de tu cartera está en <strong style={{ color: 'var(--text-primary)' }}>{portfolio.topType?.label || 'sin operaciones'} ({portfolio.topType ? reportPctLabel(portfolio.topType.value, portfolio.totalEsperado) : '0%'}).</strong></>,
                  },
                  {
                    tone: 'amber',
                    mark: '60',
                    content: <>El <strong style={{ color: 'var(--text-primary)' }}>{reportPctLabel(portfolio.proximos60, portfolio.saldoPendiente)}</strong> del pendiente total vence en los próximos 60 días.</>,
                  },
                  {
                    tone: 'red',
                    mark: '!',
                    content: <>La mora representa el <strong style={{ color: 'var(--text-primary)' }}>{reportPctLabel(portfolio.saldoVencido, portfolio.saldoPendiente)}</strong> del saldo total de la cartera.</>,
                  },
                ]}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
                <Card style={{ padding: 18 }}><ReportCardHeader title="Próximos vencimientos (15 días)" />{renderUpcomingTable(upcomingInstallments.slice(0, 5))}</Card>
                <Card style={{ padding: 18 }}>
                  <ReportCardHeader title="Clientes con mayor saldo pendiente" />
                  <MiniTable compact rows={portfolio.topClients} empty="Sin saldos pendientes" onRowClick={r => onNav && onNav('clientes', r.client.id)} columns={[
                    { key: 'client', label: 'Cliente', width: '58%', render: c => c?.nombre || '-' },
                    { key: 'saldo', label: 'Saldo pendiente', width: '42%', align: 'right', render: v => <strong style={{ fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</strong> },
                  ]} />
                </Card>
                <Card style={{ padding: 18 }}>
                  <ReportCardHeader title="Últimos pagos registrados" />
                  <MiniTable compact rows={portfolio.latestPayments} empty="Sin pagos" columns={[
                    { key: 'client', label: 'Cliente', width: '42%', render: c => c?.nombre || '-' },
                    { key: 'fechaPago', label: 'Fecha', width: '24%', render: v => formatDate(v) },
                    { key: 'monto', label: 'Monto', width: '34%', align: 'right', render: (_, r) => <strong style={{ color: '#059669', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(moneyBase(r, 'monto'))}</strong> },
                  ]} />
                </Card>
              </div>
            </>
          )}

          {activeTab === 'mensual' && (
            <>
              <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 900 }}>Reporte de {reportMonthLabel(period, true)}</div>
              <div style={commonKpiGrid}>
                <ReportKpiCard label="Operaciones nuevas" value={maskSensitiveNumber(monthly.current.ops)} sub="este mes" tone="indigo" mark="OP" delta={reportDeltaWithMonth(monthly.current.ops, monthly.previous.ops, monthly.prev)} onClick={() => setSelectedMonthlyKpi('ops')} selected={selectedMonthlyKpi === 'ops'} />
                <ReportKpiCard label="Clientes nuevos" value={maskSensitiveNumber(monthly.current.clients)} sub="este mes" tone="green" mark="CL" delta={reportDeltaWithMonth(monthly.current.clients, monthly.previous.clients, monthly.prev)} onClick={() => setSelectedMonthlyKpi('clients')} selected={selectedMonthlyKpi === 'clients'} />
                <ReportKpiCard label="Cobrado en el mes" value={formatCurrency(monthly.current.cobrado)} sub="cobrado" tone="green" mark="$" delta={reportDeltaWithMonth(monthly.current.cobrado, monthly.previous.cobrado, monthly.prev)} onClick={() => setSelectedMonthlyKpi('cobrado')} selected={selectedMonthlyKpi === 'cobrado'} />
                <ReportKpiCard label="Vencimientos del mes" value={maskSensitiveNumber(monthly.current.vencimientos)} sub="cuotas" tone="blue" mark="VC" delta={reportDeltaWithMonth(monthly.current.vencimientos, monthly.previous.vencimientos, monthly.prev)} onClick={() => setSelectedMonthlyKpi('vencimientos')} selected={selectedMonthlyKpi === 'vencimientos'} />
                <ReportKpiCard label="En mora este mes" value={maskSensitiveNumber(monthly.current.moraCount)} sub="cuotas vencidas" tone="amber" mark="MO" delta={reportDeltaWithMonth(monthly.current.moraCount, monthly.previous.moraCount, monthly.prev)} onClick={() => setSelectedMonthlyKpi('moraCount')} selected={selectedMonthlyKpi === 'moraCount'} />
                <ReportKpiCard label="Mora $" value={formatCurrency(monthly.current.moraMonto)} sub="deuda vencida" tone="red" mark="MR" delta={reportDeltaWithMonth(monthly.current.moraMonto, monthly.previous.moraMonto, monthly.prev)} onClick={() => setSelectedMonthlyKpi('moraMonto')} selected={selectedMonthlyKpi === 'moraMonto'} />
              </div>
              {(() => {
                const MKPI = [
                  { key: 'cobrado',      label: 'Cobrado',              fmt: formatCurrency,      tone: 'green',  accentColor: REPORT_ACCENTS.green.color  },
                  { key: 'ops',          label: 'Operaciones nuevas',   fmt: maskSensitiveNumber, tone: 'indigo', accentColor: REPORT_ACCENTS.indigo.color },
                  { key: 'clients',      label: 'Clientes nuevos',      fmt: maskSensitiveNumber, tone: 'green',  accentColor: REPORT_ACCENTS.green.color  },
                  { key: 'vencimientos', label: 'Vencimientos del mes', fmt: maskSensitiveNumber, tone: 'blue',   accentColor: REPORT_ACCENTS.blue.color   },
                  { key: 'moraCount',    label: 'Cuotas en mora',       fmt: maskSensitiveNumber, tone: 'amber',  accentColor: REPORT_ACCENTS.amber.color  },
                  { key: 'moraMonto',    label: 'Mora $',               fmt: formatCurrency,      tone: 'red',    accentColor: REPORT_ACCENTS.red.color    },
                ];
                const kpi = MKPI.find(k => k.key === selectedMonthlyKpi) || MKPI[0];
                return (
                  <div style={twoColGrid}>
                    <Card style={{ padding: 20 }}>
                      <ReportCardHeader title={`${kpi.label} (últimos 6 meses)`} action={<Badge tone={kpi.tone}>{kpi.label}</Badge>} />
                      <VerticalBars rows={monthly.history.map(m => ({ key: m.key, label: reportMonthLabel(m.key), value: m[kpi.key], color: m.key === period ? kpi.accentColor : '#cbd5e1' }))} max={Math.max(...monthly.history.map(m => m[kpi.key]), 1)} valueLabel={kpi.fmt} />
                    </Card>
                    <Card style={{ padding: 20 }}>
                      <ReportCardHeader title="Comparación con el mes anterior" sub={reportMonthLabel(monthly.prev, true)} />
                      {MKPI.map(({ key, label, fmt }) => {
                        const curr = monthly.current[key];
                        const prev = monthly.previous[key];
                        const d = reportDelta(curr, prev);
                        return (
                          <div key={key} onClick={() => setSelectedMonthlyKpi(key)} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 14, alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                            <div><strong>{label}</strong><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Anterior: {fmt(prev)}</div></div>
                            <strong style={{ fontFamily: 'DM Mono, monospace' }}>{fmt(curr)}</strong>
                            <Badge tone={d.tone}>{d.text}</Badge>
                          </div>
                        );
                      })}
                    </Card>
                  </div>
                );
              })()}
              <div style={twoColGrid}>
                <ReportInsightStrip
                  title="Insights del mes"
                  mark="i"
                  tone="indigo"
                  layout="compact"
                  items={[
                    {
                      tone: monthly.current.cobrado >= monthly.previous.cobrado ? 'green' : 'red',
                      mark: '$',
                      content: <>Los cobros <strong style={{ color: 'var(--text-primary)' }}>{monthly.current.cobrado >= monthly.previous.cobrado ? 'aumentaron' : 'disminuyeron'} {reportDelta(monthly.current.cobrado, monthly.previous.cobrado).text.replace(/[↑↓]\s*/, '')}</strong> respecto al mes anterior.</>,
                    },
                    {
                      tone: 'blue',
                      mark: 'CL',
                      content: <>Este mes se incorporaron <strong style={{ color: 'var(--text-primary)' }}>{maskSensitiveNumber(monthly.current.clients)} nuevos clientes</strong>.</>,
                    },
                    {
                      tone: monthly.current.moraMonto <= monthly.previous.moraMonto ? 'green' : 'red',
                      mark: '!',
                      content: <>La mora <strong style={{ color: 'var(--text-primary)' }}>{monthly.current.moraMonto <= monthly.previous.moraMonto ? 'disminuyó' : 'aumentó'} {reportDelta(monthly.current.moraMonto, monthly.previous.moraMonto).text.replace(/[↑↓]\s*/, '')}</strong>.</>,
                    },
                  ]}
                />
                <Card style={{ padding: 20 }}><ReportCardHeader title="Próximos vencimientos (próximos 15 días)" />{renderUpcomingTable(upcomingInstallments.slice(0, 4))}</Card>
              </div>
            </>
          )}

          {activeTab === 'clientes' && (
            <>
              <div style={commonKpiGrid}>
                <ReportKpiCard label="Clientes totales" value={maskSensitiveNumber(clients.length)} sub="Activos y registrados" tone="indigo" mark="CL" />
                <ReportKpiCard label="Operaciones" value={maskSensitiveNumber(operations.length)} sub="Total activas" tone="blue" mark="OP" />
                <ReportKpiCard label="Total cobrado" value={formatCurrency(portfolio.totalCobrado)} sub="Acumulado" tone="green" mark="$" />
                <ReportKpiCard label="Saldo pendiente" value={formatCurrency(portfolio.saldoPendiente)} sub="Por cobrar" tone="amber" mark="SP" />
                <ReportKpiCard label="Saldo vencido" value={formatCurrency(portfolio.saldoVencido)} sub="En mora" tone="red" mark="SV" />
                <ReportKpiCard label="Días prom. atraso" value={maskSensitiveNumber(mora.avgDias)} sub="Promedio general" tone="purple" mark="D" />
              </div>
              <Card style={{ padding: 18, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  <Input placeholder="Buscar cliente..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} style={{ maxWidth: 280 }} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Select value={clientEstado} onChange={e => setClientEstado(e.target.value)} style={{ width: 150 }}><option value="todos">Todos</option><option>Activo</option><option>Moroso</option><option>Bloqueado</option><option>Inactivo</option></Select>
                    <Select value={clientRiesgo} onChange={e => setClientRiesgo(e.target.value)} style={{ width: 140 }}><option value="todos">Riesgo</option><option>Bajo</option><option>Medio</option><option>Alto</option></Select>
                    <Select value={clientSort} onChange={e => setClientSort(e.target.value)} style={{ width: 190 }}><option value="saldoPendiente">Saldo pendiente</option><option value="saldoVencido">Saldo vencido</option><option value="totalCobrado">Total cobrado</option><option value="operaciones">Operaciones</option><option value="diasAtraso">Días atraso</option></Select>
                  </div>
                </div>
                <MiniTable
                  rows={visibleClients}
                  empty="No se encontraron clientes"
                  onRowClick={row => onNav && onNav('clientes', row.id)}
                  columns={[
                    { key: 'nombre', label: 'Cliente', render: (_, row) => <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><AvatarInitials name={row.nombre} tone={row.totalVenc > 0 ? 'red' : 'indigo'} /><div><strong>{row.nombre}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.telefono || row.codigo || '-'}</div></div></div> },
                    { key: 'estado', label: 'Estado', render: v => <Badge tone={v === 'Activo' ? 'green' : v === 'Moroso' ? 'red' : 'slate'}>{v}</Badge> },
                    { key: 'totalOps', label: 'Operaciones', align: 'right', render: v => maskSensitiveNumber(v) },
                    { key: 'totalPagado', label: 'Total cobrado', align: 'right', render: v => <strong style={{ color: '#059669', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</strong> },
                    { key: 'totalPend', label: 'Saldo pendiente', align: 'right', render: v => <strong style={{ fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</strong> },
                    { key: 'totalVenc', label: 'Vencido', align: 'right', render: v => <strong style={{ color: v > 0 ? '#dc2626' : '#94a3b8', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</strong> },
                    { key: 'avgDias', label: 'Días atraso', align: 'right', render: v => v > 0 ? <strong style={{ color: '#d97706' }}>{maskSensitiveNumber(v, ' días')}</strong> : <span style={{ color: 'var(--text-faint)' }}>—</span> },
                    { key: 'riesgo', label: 'Riesgo', render: v => <Badge tone={v === 'Alto' ? 'red' : v === 'Medio' ? 'amber' : 'green'}>{v || 'Bajo'}</Badge> },
                    { key: 'lastPaymentDate', label: 'Último pago', render: v => v ? formatDate(v) : '—' },
                  ]}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 16, flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: 13 }}>
                  <span>Mostrando {filteredClients.length ? ((clientPage - 1) * rowsPerPage) + 1 : 0} a {Math.min(clientPage * rowsPerPage, filteredClients.length)} de {filteredClients.length} clientes</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Btn size="sm" variant="secondary" disabled={clientPage <= 1} onClick={() => setClientPage(p => Math.max(1, p - 1))}>‹</Btn>
                    <Badge tone="indigo">{clientPage} / {clientPages}</Badge>
                    <Btn size="sm" variant="secondary" disabled={clientPage >= clientPages} onClick={() => setClientPage(p => Math.min(clientPages, p + 1))}>›</Btn>
                    <Select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} style={{ width: 74 }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></Select>
                  </div>
                </div>
              </Card>
            </>
          )}

          {activeTab === 'mora' && (
            <>
              <div style={commonKpiGrid}>
                <ReportKpiCard label="Total vencido" value={formatCurrency(mora.totalVencido)} sub={`${maskSensitiveNumber(overdueInstallments.length)} cuotas vencidas`} tone="red" mark="!" />
                <ReportKpiCard label="Días prom. atraso" value={maskSensitiveNumber(mora.avgDias, ' días')} sub="Promedio general" tone="purple" mark="D" />
                <ReportKpiCard label="Clientes en mora" value={maskSensitiveNumber(mora.uniqueClients)} sub="Con cuotas vencidas" tone="amber" mark="CL" />
                <ReportKpiCard label="Variación vs mes anterior" value={mora.variation.text} sub="Deuda vencida" tone={mora.variation.raw > 0 ? 'red' : 'green'} mark="VA" />
                <ReportKpiCard label="Recuperado este mes" value={formatCurrency(mora.recoveredThisMonth)} sub="Desde mora" tone="green" mark="$" />
              </div>
              <div style={twoColGrid}>
                <Card style={{ padding: 20 }}>
                  <ReportCardHeader title="Mora por rango de días" />
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <DonutChart segments={mora.ranges.map(r => ({ value: r.value, color: r.color }))} centerValue={formatCurrency(mora.totalVencido)} centerLabel="Total vencido" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <MiniTable compact rows={mora.ranges} empty="Sin mora" columns={[
                        { key: 'label', label: 'Rango de días', width: '45%', render: (_, r) => <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: r.color, flexShrink: 0 }} />{r.label}</span> },
                        { key: 'count', label: 'Cuotas', width: '20%', align: 'right', render: v => maskSensitiveNumber(v) },
                        { key: 'value', label: 'Monto', width: '35%', align: 'right', render: v => <strong style={{ fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</strong> },
                      ]} />
                    </div>
                  </div>
                </Card>
                <Card style={{ padding: 20 }}>
                  <ReportCardHeader title="Clientes en mora" />
                  <Input placeholder="Buscar cliente en mora..." value={moraSearch} onChange={e => setMoraSearch(e.target.value)} style={{ marginBottom: 12 }} />
                  <MiniTable rows={mora.byClient.filter(r => !moraSearch || String(r.client?.nombre || '').toLowerCase().includes(moraSearch.toLowerCase()))} empty="Sin clientes en mora" onRowClick={row => onNav && onNav('clientes', row.id)} columns={[
                    { key: 'client', label: 'Cliente', render: c => <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><AvatarInitials name={c?.nombre} tone="red" /><strong>{c?.nombre || '-'}</strong></div> },
                    { key: 'count', label: 'Cuotas vencidas', align: 'right', render: v => maskSensitiveNumber(v) },
                    { key: 'amount', label: 'Monto vencido', align: 'right', render: v => <strong style={{ color: '#dc2626', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</strong> },
                    { key: 'avg', label: 'Días prom.', align: 'right', render: v => <strong style={{ color: '#d97706' }}>{maskSensitiveNumber(v, ' días')}</strong> },
                    { key: 'lastDue', label: 'Último venc.', render: v => formatDate(v) },
                    { key: 'risk', label: 'Riesgo', render: v => <Badge tone={v === 'Alto' ? 'red' : v === 'Medio' ? 'amber' : 'green'}>{v}</Badge> },
                  ]} />
                </Card>
              </div>
              <div style={twoColGrid}>
                <ReportInsightStrip
                  title="Resumen de mora"
                  mark="i"
                  tone="red"
                  layout="compact"
                  items={[
                    { tone: 'purple', mark: '%', value: reportPctLabel(Math.max(...mora.ranges.map(r => r.value), 0), mora.totalVencido), label: 'concentrado en rango principal' },
                    { tone: 'red', mark: '$', value: formatCurrency(mora.totalVencido), label: 'monto total en mora' },
                    { tone: 'amber', mark: 'CL', value: mora.uniqueClients === 0 ? 'Sin clientes' : mora.uniqueClients === 1 ? '1 cliente' : `${maskSensitiveNumber(mora.uniqueClients)} clientes`, label: 'con cuotas vencidas' },
                    { tone: 'green', mark: 'OK', value: formatCurrency(mora.recoveredThisMonth), label: 'recuperados este mes' },
                  ]}
                />
                <Card style={{ padding: 20 }}><ReportCardHeader title="Evolución de la mora (últimos 6 meses)" /><VerticalBars rows={mora.history} max={Math.max(...mora.history.map(h => h.value), 1)} /></Card>
              </div>
              <div style={{ background: mora.variation.raw > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${mora.variation.raw > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 10, padding: '12px 14px', color: mora.variation.raw > 0 ? '#991b1b' : '#166534', fontSize: 13, fontWeight: 800 }}>
                {mora.variation.raw == null ? 'No hay datos suficientes para comparar la mora con el mes anterior.' : `La mora total ${mora.variation.raw > 0 ? 'aumentó' : 'disminuyó'} ${Math.abs(mora.variation.raw).toLocaleString('es-AR', { maximumFractionDigits: 1 })}% respecto al mes anterior.`}
              </div>
            </>
          )}

          {activeTab === 'caja' && (
            <>
              <div style={commonKpiGrid}>
                <ReportKpiCard label="Entradas totales" value={formatCurrency(caja.entradas)} sub="Movimientos positivos" tone="green" mark="IN" />
                <ReportKpiCard label="Salidas totales" value={formatCurrency(caja.salidas)} sub="Movimientos negativos" tone="red" mark="OUT" />
                <ReportKpiCard label="Saldo neto" value={formatCurrency(caja.saldo)} sub="Entradas - salidas" tone={caja.saldo >= 0 ? 'green' : 'red'} mark="SN" />
                <ReportKpiCard label="Capital en la calle" value={formatCurrency(caja.capitalEnLaCalle)} sub="Saldo pendiente total" tone="blue" mark="CAP" />
                <ReportKpiCard label="Ganancia cobrada" value={formatCurrency(caja.gananciaCobrada)} sub="Cobrado - invertido" tone="purple" mark="GC" />
                <ReportKpiCard label="Compromiso tarjetas" value={formatCurrency(caja.compromisoTarjetas)} sub="Total cargado en TC" tone="amber" mark="TC" />
              </div>
              <div style={twoColGrid}>
                <Card style={{ padding: 20 }}><ReportCardHeader title="Movimientos por tipo" /><HorizontalBars rows={caja.byType.map(r => ({ ...r, value: r.abs }))} max={Math.max(...caja.byType.map(r => r.abs), 1)} valueLabel={r => <span style={{ color: r.value >= 0 ? '#059669' : '#dc2626' }}>{formatCurrency(r.abs)}</span>} color={r => r.color} /></Card>
                <Card style={{ padding: 20 }}><ReportCardHeader title="Flujo neto mensual" /><VerticalBars rows={caja.history} max={Math.max(...caja.history.map(h => h.value), 1)} color={r => r.color} /></Card>
              </div>
              <Card style={{ padding: 20 }}>
                <ReportCardHeader title="Lectura rápida de caja" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
                  <div>La principal entrada de caja viene de <strong>{(caja.byType.find(t => t.value > 0)?.label || 'sin entradas registradas').toLowerCase()}</strong>.</div>
                  <div>El saldo neto fue <strong style={{ color: caja.saldo >= 0 ? '#059669' : '#dc2626' }}>{caja.saldo >= 0 ? 'positivo' : 'negativo'}</strong>.</div>
                  <div>Los pagos de tarjeta representan <strong>{reportPctLabel(Math.abs(caja.byType.find(t => t.key === 'Salida por pago de tarjeta')?.value || 0), caja.salidas)}</strong> de las salidas.</div>
                </div>
              </Card>
            </>
          )}

          {activeTab === 'tarjetas' && (
            <>
              <div style={commonKpiGrid}>
                <ReportKpiCard label="Límite total" value={formatCurrency(tarjetas.limiteTotal)} sub="100% del límite total" tone="indigo" mark="LT" />
                <ReportKpiCard label="Usado total" value={formatCurrency(tarjetas.usadoTotal)} sub={`${reportPctLabel(tarjetas.usadoTotal, tarjetas.limiteTotal)} del límite total`} tone="blue" mark="US" />
                <ReportKpiCard label="Disponible total" value={formatCurrency(tarjetas.disponibleTotal)} sub={`${reportPctLabel(tarjetas.disponibleTotal, tarjetas.limiteTotal)} disponible`} tone="green" mark="DI" />
                <ReportKpiCard label="Pendiente de pago" value={formatCurrency(tarjetas.pendientes.reduce((s, p) => s + p.monto, 0))} sub="Resúmenes pendientes" tone="amber" mark="PP" />
                <ReportKpiCard label="Próximos vencimientos" value={maskSensitiveNumber(tarjetas.proximos.length)} sub="En próximos 15 días" tone="red" mark="PV" />
                <ReportKpiCard label="Pagado este mes" value={formatCurrency(tarjetas.pagadoEsteMes)} sub="Resúmenes pagados" tone="green" mark="$" />
              </div>
              <div style={twoColGrid}>
                <Card style={{ padding: 20 }}>
                  <ReportCardHeader title="Tarjetas de crédito" action={<button type="button" onClick={() => onNav && onNav('tarjetas')} style={{ border: 'none', background: 'transparent', color: '#4f46e5', fontWeight: 900, cursor: 'pointer' }}>Ver todas →</button>} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    {tarjetas.stats.slice(0, 3).map(st => <CreditCardPreview key={st.card.id} card={st.card} stats={st} index={st.index} onClick={() => onNav && onNav('tarjetas', st.card.id)} />)}
                    {!tarjetas.stats.length && <div style={{ color: 'var(--text-faint)', padding: 24 }}>Sin tarjetas registradas</div>}
                  </div>
                </Card>
                <Card style={{ padding: 20 }}>
                  <ReportCardHeader title="Uso del límite por tarjeta" />
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <DonutChart segments={tarjetas.stats.map((st, i) => ({ value: st.netDebt, color: ['#2563eb', '#7c3aed', '#111827', '#059669'][i % 4] }))} centerValue={formatCurrency(tarjetas.usadoTotal)} centerLabel="Usado total" />
                    <div style={{ flex: 1, minWidth: 260 }}>
                      {tarjetas.stats.map((st, i) => (
                        <div key={st.card.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 120px', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: ['#2563eb', '#7c3aed', '#111827', '#059669'][i % 4], marginRight: 8 }} />{st.card.nombre} ({st.card.ultimosDigitos})</span>
                          <strong>{reportPctLabel(st.netDebt, tarjetas.usadoTotal)}</strong>
                          <strong style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(st.netDebt)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
              <div style={twoColGrid}>
                <Card style={{ padding: 20 }}>
                  <ReportCardHeader title="Resúmenes pendientes de pago" />
                  <MiniTable rows={tarjetas.pendientes.slice(0, 6)} empty="Sin resúmenes pendientes" columns={[
                    { key: 'card', label: 'Tarjeta', render: c => `${c?.nombre || 'Tarjeta'} •••• ${c?.ultimosDigitos || ''}` },
                    { key: 'key', label: 'Período', render: v => reportMonthLabel(v, true) },
                    { key: 'fechaVencimiento', label: 'Vencimiento', render: v => formatDate(v) },
                    { key: 'monto', label: 'Monto', align: 'right', render: v => <strong style={{ color: '#dc2626', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</strong> },
                    { key: 'fechaVencimiento', label: 'Días', render: v => { const d = Math.ceil(((reportDate(v) || today) - today) / 86400000); return <Badge tone={d <= 3 ? 'red' : d <= 10 ? 'amber' : 'green'}>{d < 0 ? 'Vencido' : `${d} días`}</Badge>; } },
                  ]} />
                </Card>
                <Card style={{ padding: 20 }}><ReportCardHeader title="Pagos de resúmenes últimos 6 meses" /><VerticalBars rows={tarjetas.pagosHistory} max={Math.max(...tarjetas.pagosHistory.map(h => h.value), 1)} /></Card>
              </div>
              <Card style={{ padding: 20 }}>
                <ReportCardHeader title="Próximos vencimientos (próximos 15 días)" />
                <MiniTable rows={tarjetas.proximos.slice(0, 4)} empty="Sin próximos vencimientos de tarjeta" columns={[
                  { key: 'card', label: 'Tarjeta', render: c => `${c?.nombre || 'Tarjeta'} (${c?.ultimosDigitos || '----'})` },
                  { key: 'fechaVencimiento', label: 'Vencimiento', render: v => formatDate(v) },
                  { key: 'monto', label: 'Monto', align: 'right', render: v => <strong style={{ color: '#dc2626', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</strong> },
                  { key: 'fechaVencimiento', label: 'Restan', render: v => { const d = Math.ceil(((reportDate(v) || today) - today) / 86400000); return <Badge tone={d <= 3 ? 'red' : d <= 10 ? 'amber' : 'green'}>{d < 0 ? 'Vencido' : `${d} días`}</Badge>; } },
                ]} />
              </Card>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { ReportesScreen });
