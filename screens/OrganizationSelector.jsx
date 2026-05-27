// Selector de organización para usuarios con múltiples orgs
function OrganizationSelector({ organizations, onSelect, onLogout, userName }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily:'DM Sans, sans-serif',
    }}>
      <div style={{
        background:'#1e293b', border:'1px solid #334155', borderRadius:16,
        padding:'48px 40px', width:'100%', maxWidth:440,
        boxShadow:'0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:24, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', marginBottom:4 }}>
            Facciano <span style={{ color:'#818cf8' }}>CRM</span>
          </div>
          <div style={{ fontSize:13, color:'#94a3b8', marginTop:8 }}>
            {userName ? <>Hola, <strong style={{ color:'#f1f5f9' }}>{userName}</strong>. </> : ''}
            Seleccioná la organización con la que querés trabajar:
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {organizations.map(org => (
            <button
              key={org.id}
              onClick={() => onSelect(org)}
              style={{
                background:'rgba(255,255,255,0.04)', border:'1.5px solid #334155',
                borderRadius:10, padding:'14px 18px', cursor:'pointer', textAlign:'left',
                display:'flex', alignItems:'center', gap:14, transition:'all 0.15s',
                fontFamily:'DM Sans, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.12)'; e.currentTarget.style.borderColor='rgba(99,102,241,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='#334155'; }}
            >
              <div style={{
                width:40, height:40, borderRadius:10,
                background:'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:16, fontWeight:700, color:'#fff', flexShrink:0,
              }}>
                {(org.name || 'O').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#f1f5f9' }}>{org.name}</div>
                {org.slug && <div style={{ fontSize:11, color:'#64748b', fontFamily:'DM Mono, monospace' }}>{org.slug}</div>}
              </div>
              <div style={{ color:'#475569', fontSize:16 }}>›</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop:24, textAlign:'center' }}>
          <button
            onClick={onLogout}
            style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:12, fontFamily:'DM Sans, sans-serif', textDecoration:'underline' }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

window.OrganizationSelector = OrganizationSelector;
