// Pantalla para usuarios autenticados sin organización activa
function UnauthorizedScreen({ onLogout, userEmail }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily:'DM Sans, sans-serif',
    }}>
      <div style={{
        background:'#1e293b', border:'1px solid #334155', borderRadius:16,
        padding:'48px 40px', width:'100%', maxWidth:440, textAlign:'center',
        boxShadow:'0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
        <div style={{ fontSize:20, fontWeight:700, color:'#f1f5f9', marginBottom:8 }}>
          Sin acceso
        </div>
        <div style={{ fontSize:13, color:'#94a3b8', marginBottom:6, lineHeight:1.6 }}>
          Tu cuenta{userEmail ? <> (<strong style={{ color:'#a5b4fc' }}>{userEmail}</strong>)</> : ''} no pertenece a ninguna organización activa.
        </div>
        <div style={{ fontSize:12, color:'#64748b', marginBottom:32, lineHeight:1.5 }}>
          Contactá al administrador de tu organización para que te agregue como miembro.
        </div>
        <button
          onClick={onLogout}
          style={{
            background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)',
            color:'#a5b4fc', borderRadius:8, padding:'9px 24px',
            fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif',
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

window.UnauthorizedScreen = UnauthorizedScreen;
