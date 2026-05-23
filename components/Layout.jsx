// Sidebar + Header Layout
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'clientes', label: 'Clientes', icon: '👥' },
  { id: 'operaciones', label: 'Operaciones', icon: '📋' },
  { id: 'cuotas', label: 'Cuotas', icon: '📅' },
  { id: 'pagos', label: 'Pagos', icon: '💳' },
  { id: 'recibos', label: 'Recibos', icon: '🧾' },
  { id: 'tarjetas', label: 'Tarjetas', icon: '💳' },
  { id: 'caja', label: 'Caja', icon: '🏦' },
  { id: 'mora', label: 'Mora', icon: '⚠️' },
  { id: 'reportes', label: 'Reportes', icon: '📊' },
  { id: 'configuracion', label: 'Configuración', icon: '⚙️' },
  { id: 'importar', label: 'Importar Excel', icon: '📥' },
];

function Sidebar({ current, onNav, collapsed, onToggle }) {
  return (
    <aside style={{
      width: collapsed ? 60 : 220,
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease',
      flexShrink: 0, zIndex: 100,
      boxShadow: '2px 0 12px rgba(15,23,42,0.18)',
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: 'DM Sans, sans-serif' }}>
              Facciano <span style={{ color: '#818cf8' }}>CRM</span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>Sistema financiero</div>
          </div>
        )}
        <button onClick={onToggle} style={{
          background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6,
          color: '#94a3b8', cursor: 'pointer', padding: '4px 6px', fontSize: 14,
          display: 'flex', alignItems: 'center',
        }}>
          {collapsed ? '▶' : '◀'}
        </button>
      </div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const active = current === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 10, padding: collapsed ? '10px 0' : '10px 16px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              border: 'none', background: active ? 'rgba(99,102,241,0.15)' : 'none',
              borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
              color: active ? '#a5b4fc' : '#94a3b8',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e2e8f0'; }}}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {!collapsed && <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: 'DM Sans, sans-serif' }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>
      {/* User */}
      {!collapsed && (
        <div style={{
          padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>B</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', fontFamily: 'DM Sans, sans-serif' }}>Brian Facciano</div>
            <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'DM Mono, monospace' }}>Administrador</div>
          </div>
        </div>
      )}
    </aside>
  );
}

function Header({ onNav, searchData }) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [showResults, setShowResults] = React.useState(false);

  React.useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); setShowResults(false); return; }
    const q = query.toLowerCase();
    const found = [];
    (searchData.clients || []).forEach(c => {
      if (c.nombre.toLowerCase().includes(q) || c.dni.includes(q) || c.telefono.includes(q) || c.codigo.toLowerCase().includes(q)) {
        found.push({ type: 'Cliente', label: c.nombre, sub: c.dni + ' · ' + c.codigo, id: c.id, nav: 'clientes', navId: c.id });
      }
    });
    (searchData.operations || []).forEach(o => {
      const client = (searchData.clients || []).find(c => c.id === o.clientId);
      if (o.codigo.toLowerCase().includes(q) || o.descripcion.toLowerCase().includes(q)) {
        found.push({ type: 'Operación', label: o.codigo + ' — ' + o.descripcion, sub: client?.nombre || '', id: o.id, nav: 'operaciones', navId: o.id });
      }
    });
    (searchData.installments || []).forEach(i => {
      if (i.codigo.toLowerCase().includes(q)) {
        found.push({ type: 'Cuota', label: i.codigo, sub: `Cuota ${i.numeroCuota}/${i.totalCuotas}`, id: i.id, nav: 'cuotas', navId: null });
      }
    });
    (searchData.creditCards || []).forEach(cc => {
      if (cc.nombre.toLowerCase().includes(q) || cc.ultimosDigitos.includes(q) || cc.banco.toLowerCase().includes(q)) {
        found.push({ type: 'Tarjeta', label: cc.nombre, sub: cc.banco + ' ···' + cc.ultimosDigitos, id: cc.id, nav: 'tarjetas', navId: cc.id });
      }
    });
    setResults(found.slice(0, 8));
    setShowResults(true);
  }, [query]);

  return (
    <header style={{
      height: 56, background: '#fff', borderBottom: '1px solid #f1f5f9',
      display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
      flexShrink: 0, zIndex: 50, boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
    }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
        <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14, pointerEvents: 'none' }}>🔍</div>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Buscar clientes, operaciones, cuotas..."
          style={{
            width: '100%', padding: '7px 12px 7px 32px', borderRadius: 8,
            border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a',
            fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box',
          }}
        />
        {showResults && results.length > 0 && (
          <div style={{
            position: 'absolute', top: '110%', left: 0, right: 0,
            background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0',
            boxShadow: '0 8px 32px rgba(15,23,42,0.15)', zIndex: 200, overflow: 'hidden',
          }}>
            {results.map((r, i) => (
              <div key={i} onClick={() => { onNav(r.nav, r.navId); setQuery(''); setShowResults(false); }} style={{
                padding: '10px 14px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid #f8fafc' : 'none',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  background: '#eef2ff', color: '#4f46e5', fontFamily: 'DM Mono, monospace',
                }}>{r.type}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{r.label}</div>
                  {r.sub && <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn size="sm" onClick={() => onNav('clientes', null, 'nuevo')}>+ Cliente</Btn>
        <Btn size="sm" onClick={() => onNav('operaciones', null, 'nuevo')}>+ Operación</Btn>
        <Btn size="sm" variant="secondary" onClick={() => onNav('pagos', null, 'nuevo')}>💳 Pago</Btn>
      </div>
    </header>
  );
}

function AppLayout({ children, current, onNav, searchData }) {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar current={current} onNav={(id) => onNav(id)} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Header onNav={onNav} searchData={searchData} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { AppLayout, Sidebar, Header });
