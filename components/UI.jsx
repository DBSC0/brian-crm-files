// Modal component
function Modal({ open, onClose, title, children, size = 'md', footer }) {
  if (!open) return null;
  const widths = { sm: 480, md: 640, lg: 800, xl: 1000, full: '95vw' };
  const w = widths[size] || 640;
  const [showConfirm, setShowConfirm] = React.useState(false);

  function handleClose() {
    setShowConfirm(true);
  }

  function confirmClose() {
    setShowConfirm(false);
    onClose();
  }

  function cancelClose() {
    setShowConfirm(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 12, width: w, maxWidth: '100%',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(15,23,42,0.22)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>{title}</h3>
          <button onClick={handleClose} style={{
            border: 'none', background: 'var(--bg-subtle)', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
          }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
          {children}
        </div>
        {footer && (
          <div style={{
            padding: '14px 24px', borderTop: '1px solid var(--border-subtle)',
            display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>

      {/* Confirm close dialog */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={e => e.stopPropagation()}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 12, padding: '28px 32px',
            boxShadow: '0 24px 80px rgba(15,23,42,0.22)',
            maxWidth: 360, width: '100%', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>
              ¿Cerrar sin guardar?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, fontFamily: 'DM Sans, sans-serif' }}>
              Vas a perder los cambios que no guardaste.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={cancelClose} style={{
                padding: '9px 20px', borderRadius: 8, border: '1.5px solid var(--border)',
                background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}>
                Seguir editando
              </button>
              <button onClick={confirmClose} style={{
                padding: '9px 20px', borderRadius: 8, border: '1.5px solid #fecaca',
                background: '#fee2e2', color: '#991b1b', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}>
                Sí, cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Generic form field
function Field({ label, required, error, children, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: '#ef4444' }}>{error}</span>}
    </div>
  );
}

// Input
function Input({ value, onChange, placeholder, type = 'text', style: extraStyle, disabled, ...rest }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      disabled={disabled} {...rest}
      style={{
        padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
        fontSize: 14, color: 'var(--text-primary)', outline: 'none', background: disabled ? 'var(--bg-page)' : 'var(--bg-surface)',
        fontFamily: 'DM Sans, sans-serif', width: '100%', boxSizing: 'border-box',
        transition: 'border-color 0.15s', ...extraStyle,
      }}
      onFocus={e => { e.target.style.borderColor = '#6366f1'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
    />
  );
}

// Select
function Select({ value, onChange, children, style: extraStyle, disabled }) {
  return (
    <select
      value={value} onChange={onChange} disabled={disabled}
      style={{
        padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
        fontSize: 14, color: 'var(--text-primary)', outline: 'none', background: disabled ? 'var(--bg-page)' : 'var(--bg-surface)',
        fontFamily: 'DM Sans, sans-serif', width: '100%', boxSizing: 'border-box',
        cursor: 'pointer', ...extraStyle,
      }}
    >
      {children}
    </select>
  );
}

// Textarea
function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{
        padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
        fontSize: 14, color: 'var(--text-primary)', outline: 'none', background: 'var(--bg-surface)',
        fontFamily: 'DM Sans, sans-serif', width: '100%', boxSizing: 'border-box',
        resize: 'vertical',
      }}
      onFocus={e => { e.target.style.borderColor = '#6366f1'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
    />
  );
}

// Button
function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, style: extraStyle, type = 'button' }) {
  const variants = {
    primary: { bg: '#4f46e5', color: '#fff', border: '#4f46e5', hover: '#4338ca' },
    secondary: { bg: 'var(--bg-surface)', color: 'var(--text-secondary)', border: 'var(--border)', hover: 'var(--bg-page)' },
    danger: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', hover: '#fecaca' },
    success: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', hover: '#bbf7d0' },
    ghost: { bg: 'transparent', color: 'var(--text-muted)', border: 'transparent', hover: 'var(--bg-subtle)' },
  };
  const v = variants[variant] || variants.primary;
  const pad = size === 'sm' ? '5px 12px' : size === 'lg' ? '11px 24px' : '8px 16px';
  const fs = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;
  const [hov, setHov] = React.useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: pad, background: hov && !disabled ? v.hover : v.bg,
        color: v.color, border: `1.5px solid ${v.border}`,
        borderRadius: 8, fontSize: fs, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'DM Sans, sans-serif', display: 'inline-flex', alignItems: 'center',
        gap: 6, whiteSpace: 'nowrap', transition: 'background 0.15s',
        opacity: disabled ? 0.5 : 1, ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

// Tabs
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 2, borderBottom: '1px solid var(--border)',
      overflowX: 'auto', flexShrink: 0,
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          padding: '10px 16px', border: 'none', background: 'none',
          fontSize: 13, fontWeight: active === tab.id ? 700 : 500,
          color: active === tab.id ? '#4f46e5' : 'var(--text-muted)',
          borderBottom: active === tab.id ? '2px solid #4f46e5' : '2px solid transparent',
          cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif',
          transition: 'all 0.15s',
        }}>
          {tab.label}
          {tab.count != null && (
            <span style={{
              marginLeft: 6, padding: '1px 6px', background: active === tab.id ? '#eef2ff' : 'var(--bg-subtle)',
              color: active === tab.id ? '#4f46e5' : 'var(--text-faint)', borderRadius: 10, fontSize: 10, fontWeight: 700,
            }}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// Card
function Card({ children, style: extraStyle }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-subtle)',
      boxShadow: '0 1px 4px rgba(15,23,42,0.06)', ...extraStyle,
    }}>
      {children}
    </div>
  );
}

// KPI Card
function KPICard({ label, value, sub, accent, icon, trend }) {
  const colors = {
    blue: '#4f46e5', green: '#16a34a', red: '#dc2626', amber: '#d97706',
    purple: '#7c3aed', slate: '#475569',
  };
  const lightBg = {
    blue: '#eff6ff', green: '#f0fdf4', red: '#fef2f2',
    amber: '#fffbeb', purple: '#faf5ff', slate: '#f8fafc',
  };
  const c = colors[accent] || colors.slate;
  const bg = lightBg[accent] || '#f8fafc';
  const displayValue = typeof maskSensitiveText === 'function' ? maskSensitiveText(value) : value;
  const displaySub = typeof maskSensitiveText === 'function' ? maskSensitiveText(sub) : sub;
  return (
    <Card style={{ padding: '16px 20px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.4 }}>{label}</span>
        {icon && (
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, flexShrink: 0, marginLeft: 6,
          }}>{icon}</div>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: c, fontFamily: 'DM Mono, monospace', letterSpacing: '-0.02em' }}>{displayValue}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{displaySub}</div>}
    </Card>
  );
}

// Empty State
function EmptyState({ icon = '📭', title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-faint)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
    </div>
  );
}

// WhatsApp Button
function WAButton({ phone, message, size = 'sm' }) {
  const url = `https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: size === 'sm' ? '4px 10px' : '7px 14px',
      background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0',
      borderRadius: 8, fontSize: size === 'sm' ? 11 : 13, fontWeight: 600,
      textDecoration: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
    }}>
      <span>💬</span> WA
    </a>
  );
}

// Section Header
function SectionHeader({ title, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>{title}</h2>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  );
}

// Data Table
function DataTable({ columns, data, onRowClick, emptyMessage = 'Sin datos', defaultSortKey = null, defaultSortDir = 'asc', tableId = null, rowStyle = null }) {
  const lsKey = tableId ? `crm-tbl-${tableId}` : null;
  function loadLS() { try { return lsKey ? (JSON.parse(localStorage.getItem(lsKey)) || {}) : {}; } catch { return {}; } }
  function saveLS(patch) { if (!lsKey) return; try { localStorage.setItem(lsKey, JSON.stringify({ ...loadLS(), ...patch })); } catch {} }

  const [sortKey, setSortKey] = React.useState(() => { const s = loadLS(); return s.sortKey ?? defaultSortKey; });
  const [sortDir, setSortDir] = React.useState(() => { const s = loadLS(); return s.sortDir ?? defaultSortDir; });
  const [colWidths, setColWidths] = React.useState(() => { const s = loadLS(); return s.colWidths ?? {}; });
  const tableRef = React.useRef(null);

  const sorted = React.useMemo(() => {
    if (!sortKey || !data) return data;
    const col = columns.find(c => c.key === sortKey);
    return [...data].sort((a, b) => {
      const av = col?.sortValue ? col.sortValue(a) : (a[sortKey] ?? '');
      const bv = col?.sortValue ? col.sortValue(b) : (b[sortKey] ?? '');
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  function handleSort(col) {
    if (col.sortable === false) return;
    let newKey = sortKey, newDir;
    if (sortKey === col.key) { newDir = sortDir === 'asc' ? 'desc' : 'asc'; setSortDir(newDir); }
    else { newKey = col.key; newDir = 'asc'; setSortKey(newKey); setSortDir(newDir); }
    saveLS({ sortKey: newKey, sortDir: newDir });
  }

  function handleResizeStart(e, colKey) {
    e.preventDefault();
    e.stopPropagation();
    const colIndex = columns.findIndex(c => c.key === colKey);
    const nextCol = columns[colIndex + 1];
    if (!nextCol) return;
    // Snapshot current widths from DOM (always authoritative)
    const ths = tableRef.current?.querySelectorAll('thead th') || [];
    const snap = {};
    columns.forEach((col, i) => { snap[col.key] = ths[i]?.offsetWidth || 80; });
    setColWidths(snap);
    const startX = e.clientX;
    const startA = snap[colKey];
    const startB = snap[nextCol.key];
    const style = document.createElement('style');
    style.id = 'crm-col-resize-cursor';
    style.textContent = '* { cursor: col-resize !important; user-select: none !important; }';
    document.head.appendChild(style);
    function onMove(ev) {
      const delta = ev.clientX - startX;
      let newA = startA + delta, newB = startB - delta;
      if (newA < 50) { newA = 50; newB = startB + (startA - 50); }
      else if (newB < 50) { newB = 50; newA = startA + (startB - 50); }
      const updated = { ...snap, [colKey]: newA, [nextCol.key]: newB };
      setColWidths(updated);
      saveLS({ colWidths: updated });
    }
    function onUp() {
      document.getElementById('crm-col-resize-cursor')?.remove();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  if (!data || data.length === 0) return <EmptyState title={emptyMessage} />;

  const hasWidths = Object.keys(colWidths).length > 0;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table ref={tableRef} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'DM Sans, sans-serif', tableLayout: hasWidths ? 'fixed' : 'auto' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map((col, colIndex) => {
              const isSortable = col.sortable !== false;
              const isActive = sortKey === col.key;
              const isLast = colIndex === columns.length - 1;
              return (
                <th key={col.key} style={{
                  padding: '9px 12px', textAlign: 'left', fontSize: 11,
                  fontWeight: 700, color: isActive ? '#4f46e5' : 'var(--text-faint)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  whiteSpace: 'nowrap', background: 'var(--bg-page)',
                  position: 'relative', userSelect: 'none',
                  width: colWidths[col.key] || undefined,
                }}>
                  <div onClick={() => handleSort(col)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, paddingRight: 6, cursor: isSortable ? 'pointer' : 'default' }}>
                    {col.label}
                    {isSortable && <span style={{ fontSize: 10, opacity: isActive ? 1 : 0.3 }}>{isActive ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>}
                  </div>
                  {!isLast && <div onMouseDown={e => handleResizeStart(e, col.key)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, cursor: 'col-resize', zIndex: 1 }} />}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const rs = rowStyle ? rowStyle(row) : {};
            return (
            <tr key={i}
              onClick={() => onRowClick && onRowClick(row)}
              style={{ borderBottom: '1px solid var(--border-subtle)', cursor: onRowClick ? 'pointer' : 'default', transition: 'background 0.1s', ...rs }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-page)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = rs.background || ''; }}
            >
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '10px 12px', color: col.mono ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontFamily: col.mono ? 'DM Mono, monospace' : 'DM Sans, sans-serif',
                  fontSize: col.mono ? 12 : 13, whiteSpace: col.nowrap ? 'nowrap' : 'normal',
                  overflow: hasWidths ? 'hidden' : undefined, textOverflow: hasWidths ? 'ellipsis' : undefined,
                }}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : (col.sensitive && typeof maskSensitiveText === 'function' ? maskSensitiveText(row[col.key]) : row[col.key])}
                </td>
              ))}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Filter Bar
function FilterBar({ filters, values, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {filters.map(f => {
        if (f.type === 'select') {
          return (
            <select key={f.key} value={values[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} style={{
              padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)',
              fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-surface)', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', minWidth: 120,
            }}>
              <option value="">{f.placeholder || f.label}</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          );
        }
        if (f.type === 'text') {
          return (
            <input key={f.key} value={values[f.key] || ''} onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder || f.label} style={{
                padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)',
                fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-surface)',
                fontFamily: 'DM Sans, sans-serif', minWidth: 160,
              }} />
          );
        }
        return null;
      })}
      {Object.values(values).some(v => v) && (
        <button onClick={() => filters.forEach(f => onChange(f.key, ''))} style={{
          padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
          fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-page)', cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
        }}>✕ Limpiar</button>
      )}
    </div>
  );
}

function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', loading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Btn>
          <Btn variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando...' : confirmLabel}
          </Btn>
        </>
      }>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

Object.assign(window, {
  Modal, Field, Input, Select, Textarea, Btn, Tabs, Card, KPICard,
  EmptyState, WAButton, SectionHeader, DataTable, FilterBar, ConfirmModal,
});
