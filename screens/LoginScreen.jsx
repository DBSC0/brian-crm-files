// Pantalla de login — Auth via Supabase
function LoginScreen({ onLogin }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [resetMode, setResetMode] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError('Ingresá tu email.'); return; }
    if (!resetMode && !password) { setError('Ingresá tu contraseña.'); return; }
    setError('');
    setLoading(true);
    try {
      const sb = window.__supabase;
      if (resetMode) {
        const { error: err } = await sb.auth.resetPasswordForEmail(email.trim());
        if (err) throw err;
        setResetSent(true);
      } else {
        const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        await onLogin();
      }
    } catch (err) {
      const msg = err.message || 'Error al iniciar sesión.';
      if (msg.includes('Invalid login credentials')) setError('Email o contraseña incorrectos.');
      else if (msg.includes('Email not confirmed')) setError('Confirmá tu email antes de ingresar.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1.5px solid #334155', background: '#1e293b', color: '#f1f5f9',
    fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' };

  if (resetSent) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', fontFamily:'DM Sans, sans-serif' }}>
        <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:16, padding:'48px 40px', width:'100%', maxWidth:400, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>📧</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', marginBottom:8 }}>Revisá tu email</div>
          <div style={{ fontSize:13, color:'#94a3b8', marginBottom:24 }}>Te enviamos un enlace para restablecer tu contraseña a <strong style={{ color:'#a5b4fc' }}>{email}</strong>.</div>
          <button onClick={() => { setResetMode(false); setResetSent(false); }} style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontSize:13, fontFamily:'DM Sans, sans-serif', textDecoration:'underline' }}>
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily:'DM Sans, sans-serif',
    }}>
      <div style={{
        background:'#1e293b', border:'1px solid #334155', borderRadius:16,
        padding:'48px 40px', width:'100%', maxWidth:400,
        boxShadow:'0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom:32, textAlign:'center' }}>
          <div style={{ fontSize:24, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', marginBottom:4 }}>
            Facciano <span style={{ color:'#818cf8' }}>CRM</span>
          </div>
          <div style={{ fontSize:11, color:'#475569', fontFamily:'DM Mono, monospace' }}>
            {resetMode ? 'Recuperar contraseña' : 'Sistema financiero'}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          {!resetMode && (
            <div>
              <label style={labelStyle}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 42 }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0,
                    width: 42, background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: showPassword ? '#818cf8' : '#475569',
                    fontSize: 16, padding: 0,
                  }}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)',
              borderRadius:8, padding:'10px 14px', fontSize:13, color:'#fca5a5',
              fontFamily:'DM Sans, sans-serif',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#334155' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color:'#fff', border:'none', borderRadius:8, padding:'11px 0',
              fontSize:14, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily:'DM Sans, sans-serif', display:'flex', alignItems:'center',
              justifyContent:'center', gap:8, transition:'all 0.15s',
            }}
          >
            {loading && (
              <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
            )}
            {loading ? 'Ingresando…' : resetMode ? 'Enviar enlace' : 'Ingresar'}
          </button>
        </form>

        <div style={{ marginTop:20, textAlign:'center' }}>
          <button
            onClick={() => { setResetMode(r => !r); setError(''); }}
            style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontSize:12, fontFamily:'DM Sans, sans-serif', textDecoration:'underline' }}
          >
            {resetMode ? '← Volver al login' : 'Olvidé mi contraseña'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

window.LoginScreen = LoginScreen;
