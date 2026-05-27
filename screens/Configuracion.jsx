// Configuración Screen
const WA_VARIABLES = ['{cliente}', '{cliente_informal}', '{monto}', '{cuota}', '{fecha}', '{operacion}', '{saldo}'];

const WA_SAMPLE_VALUES = {
  '{cliente}': 'Juan Pérez',
  '{cliente_informal}': 'Juan',
  '{monto}': '$45.000',
  '{cuota}': '2',
  '{fecha}': '25/05/2026',
  '{operacion}': 'Pintura exterior',
  '{saldo}': '$120.000',
};

const WA_DEFAULT_TEMPLATES = [
  { id: 'wtp1', nombre: 'Recordatorio vencimiento', texto: 'Hola {cliente}, te recuerdo que mañana vence la cuota {cuota} de {monto} correspondiente a {operacion}. Saludos!' },
  { id: 'wtp2', nombre: 'Mora', texto: 'Hola {cliente}, te escribo por la cuota vencida del día {fecha}. El saldo pendiente es de {monto}. Podemos coordinar el pago? Gracias!' },
  { id: 'wtp3', nombre: 'Confirmación de pago', texto: 'Hola {cliente}, confirmamos la recepción de tu pago de {monto}. Saldo restante: {saldo}. Muchas gracias!' },
  { id: 'wtp4', nombre: 'Saludo general', texto: 'Hola {cliente}! Te contacto de parte de Brian para coordinar tu cuota. Cuando podés realizar el pago? Gracias!' },
];

const DEFAULT_BRANDING = {
  appName: '', appSubtitle: 'Sistema financiero', nombreComercial: '', logoUrl: '', initials: '',
  accentColor: '#818cf8', secondaryColor: '#6366f1',
  showSidebarTitle: true, showSidebarSubtitle: true,
  mostrarLogoEnRecibos: true, mostrarTelefonoEnRecibos: true,
  mostrarDireccionEnRecibos: false, mostrarFirmaAlPie: true, mostrarIdentificacionFiscal: false,
};
const DEFAULT_UI_PREFS = {
  primaryColor: '#4f46e5', compactMode: false, showQuickActions: true,
  modoPrivacidad: 'activado', sidebarPorDefecto: 'expandida',
  densidadVisual: 'comoda', tema: 'claro', pantallaInicial: 'dashboard',
  accionesRapidas: ['cliente', 'operacion', 'pago'],
};

function normalizeTemplateText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function normalizeWhatsappTemplates(templates) {
  if (!Array.isArray(templates) || templates.length === 0) return WA_DEFAULT_TEMPLATES;
  return templates.map((tpl, idx) => ({
    id: tpl.id || `wa-${idx + 1}`,
    nombre: tpl.nombre || `Plantilla ${idx + 1}`,
    texto: tpl.texto || '',
    ...tpl,
  }));
}

function getWhatsappTemplateMeta(tpl) {
  const key = normalizeTemplateText(`${tpl.id || ''} ${tpl.nombre || ''}`);
  if (key.includes('wtp1') || key.includes('recordatorio')) {
    return { title: 'Recordatorio vencimiento', description: 'Para cuotas próximas a vencer', useCase: 'Cuotas próximas a vencer', mark: 'RV', bg: '#eef2ff', color: '#4f46e5' };
  }
  if (key.includes('wtp2') || key.includes('mora')) {
    return { title: 'Mora', description: 'Para clientes con cuotas vencidas', useCase: 'Clientes con cuotas vencidas', mark: 'MO', bg: '#fff7ed', color: '#f97316' };
  }
  if (key.includes('wtp3') || key.includes('confirm')) {
    return { title: 'Confirmación de pago', description: 'Después de registrar un pago', useCase: 'Pagos registrados', mark: 'CP', bg: '#f0fdf4', color: '#16a34a' };
  }
  if (key.includes('wtp4') || key.includes('saludo')) {
    return { title: 'Saludo general', description: 'Mensaje libre de contacto', useCase: 'Contacto general', mark: 'SG', bg: '#eff6ff', color: '#2563eb' };
  }
  return { title: tpl.nombre || 'Plantilla', description: 'Plantilla personalizada', useCase: 'Contacto con clientes', mark: 'WA', bg: '#f5f3ff', color: '#7c3aed' };
}

function getUnknownWhatsappVariables(text) {
  const found = String(text || '').match(/\{[^{}\s]+\}/g) || [];
  return Array.from(new Set(found.filter(v => !WA_VARIABLES.includes(v))));
}

function renderWhatsappPreview(text) {
  return String(text || '').replace(/\{[^{}\s]+\}/g, match => WA_SAMPLE_VALUES[match] || match);
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-page)', borderRadius: 8 }}>
      <div>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>{label}</span>
        {hint && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{hint}</div>}
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0, cursor: 'pointer' }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: 12, background: checked ? '#4f46e5' : '#cbd5e1', transition: 'background 0.2s' }}>
          <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-surface)', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
        </span>
      </label>
    </div>
  );
}

function MiniToggle({ checked, onChange }) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20, cursor: 'pointer', flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 10, background: checked ? '#4f46e5' : '#cbd5e1', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg-surface)', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </span>
    </label>
  );
}

function PaymentMethodsEditor({ methods, onChange }) {
  function setMethod(index, key, value) {
    onChange(methods.map((m, i) => i === index ? { ...m, [key]: value } : m));
  }
  function addMethod() {
    onChange([...methods, { id: `method-${Date.now()}`, nombre: 'Nuevo método', activo: true, predeterminado: false, impactaCaja: true, requiereReferencia: false }]);
  }
  function removeMethod(index) {
    onChange(methods.filter((_, i) => i !== index));
  }
  function getMethodStyle(nombre) {
    const n = (nombre || '').toLowerCase();
    if (n.includes('efectivo')) return { bg: '#f0fdf4', color: '#16a34a', mark: '💵' };
    if (n.includes('transfer')) return { bg: '#eff6ff', color: '#2563eb', mark: '🏦' };
    if (n.includes('mercado') || n === 'mp') return { bg: '#ecfeff', color: '#0e7490', mark: '📱' };
    if (n.includes('cheque')) return { bg: '#fffbeb', color: '#d97706', mark: '📝' };
    return { bg: '#f5f3ff', color: '#7c3aed', mark: '💳' };
  }
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {methods.map((m, i) => {
          const ms = getMethodStyle(m.nombre);
          return (
            <div key={m.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: ms.bg, color: ms.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{ms.mark}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  value={m.nombre}
                  onChange={e => {
                    const next = methods.map((x, j) => j === i ? { ...x, nombre: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '-') || x.id } : x);
                    onChange(next);
                  }}
                  style={{ border: '1.5px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-surface)', color: 'var(--text-primary)', width: '100%', maxWidth: 180 }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                  {m.activo
                    ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>Activo</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Inactivo</span>
                  }
                  {m.predeterminado && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>Predeterminado</span>}
                  {m.impactaCaja && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>Impacta caja</span>}
                  {m.requiereReferencia && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>Req. referencia</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 600 }}>Activo</span>
                  <MiniToggle checked={!!m.activo} onChange={v => setMethod(i, 'activo', v)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 600 }}>Pred.</span>
                  <input type="radio" name="metodo-predeterminado" checked={!!m.predeterminado} onChange={() => onChange(methods.map((x, j) => ({ ...x, predeterminado: j === i })))} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 600 }}>Caja</span>
                  <MiniToggle checked={!!m.impactaCaja} onChange={v => setMethod(i, 'impactaCaja', v)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 600 }}>Ref.</span>
                  <MiniToggle checked={!!m.requiereReferencia} onChange={v => setMethod(i, 'requiereReferencia', v)} />
                </div>
                <button onClick={() => removeMethod(i)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <Btn size="sm" variant="secondary" onClick={addMethod}>+ Agregar método</Btn>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Los métodos inactivos no aparecen al registrar pagos nuevos.</span>
      </div>
    </div>
  );
}

function PersonalizacionPreview({ settings }) {
  const branding     = settings?.branding          || {};
  const datPrest     = settings?.datosPrestamista  || {};
  const uiPrefs      = settings?.uiPreferences     || {};
  const appName      = branding.appName     || 'Facciano CRM';
  const appSub       = branding.appSubtitle || 'Sistema financiero';
  const accent       = branding.accentColor || '#818cf8';
  const primary      = uiPrefs.primaryColor || '#4f46e5';
  const initials     = branding.initials || appName.slice(0, 2).toUpperCase() || 'FA';
  const logoUrl      = branding.logoUrl    || '';
  const showTitle    = branding.showSidebarTitle    !== false;
  const showSub      = branding.showSidebarSubtitle !== false;
  const firmante     = datPrest.firma || datPrest.nombre || branding.nombreComercial || appName || 'Prestamista';
  const tel          = datPrest.telefono || '';
  const mostrarTel   = branding.mostrarTelefonoEnRecibos !== false;
  const mostrarFirma = branding.mostrarFirmaAlPie !== false;
  const metActivos   = (settings?.metodosPago || []).filter(m => m.activo).length;

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>

      {/* Bloque 1: Marca */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3 }}>Vista previa de marca</div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 10 }}>Así se verá tu equipo en el sistema.</div>
        <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden', padding: '10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 11px 9px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 4 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: 7, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>{initials}</div>
            )}
            <div style={{ minWidth: 0 }}>
              {showTitle && <div style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appName}</div>}
              {showSub   && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{appSub}</div>}
            </div>
          </div>
          {['Dashboard', 'Clientes', 'Operaciones'].map(item => (
            <div key={item} style={{ padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 10 }}>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#475569', flexShrink: 0 }} />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Bloque 2: Recibo */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>Vista previa de recibo</div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-page)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>{firmante}</div>
              {mostrarTel && tel && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tel}</div>}
            </div>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--bg-surface)' }}>
            {[['Cliente', 'Juan Pérez'], ['Método', 'Transferencia']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 10 }}>
                <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>{k}</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 4px', borderTop: '2px solid var(--border)', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>Importe</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: primary, fontFamily: 'DM Mono, monospace' }}>$ 45.000</span>
            </div>
            {mostrarFirma && (
              <div style={{ fontSize: 10, color: 'var(--text-faint)', fontStyle: 'italic', marginTop: 4 }}>Firma: {firmante}</div>
            )}
          </div>
        </div>
      </div>

      {/* Bloque 3: Impacto */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>Impacto de los cambios</div>
        {[
          'Sidebar — todos los usuarios',
          'Recibos de pago',
          'Comprobantes internos',
          `Métodos de pago — ${metActivos} activos`,
        ].map((text, idx, arr) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderBottom: idx < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>✓</div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IdentidadHeroCard({ settings, setSetting, editing, onEdit, onClose, isMobile }) {
  const branding     = settings?.branding    || {};
  const metodosPago  = settings?.metodosPago || [];
  const datPrest     = settings?.datosPrestamista || {};
  const appName      = branding.appName      || '';
  const appSub       = branding.appSubtitle  || 'Sistema financiero';
  const nomCom       = branding.nombreComercial || '';
  const accent       = branding.accentColor  || '#818cf8';
  const initials     = branding.initials || (appName || 'FA').slice(0, 2).toUpperCase();
  const logoUrl      = branding.logoUrl || '';
  const textoRecibos = datPrest.textoRecibos || '';
  const metActivos   = metodosPago.filter(m => m.activo).length;
  const displayName  = appName || 'Facciano CRM';

  return (
    <div style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 40%, #faf5ff 100%)', borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden', border: '1px solid rgba(139,92,246,0.15)', boxShadow: '0 4px 20px rgba(139,92,246,0.08)' }}>
      <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 60, bottom: -60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.05)', pointerEvents: 'none' }} />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, position: 'relative' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Identidad del CRM</div>
        <Btn size="sm" variant="secondary" onClick={editing ? onClose : onEdit}>{editing ? 'Cerrar' : '✏ Editar marca'}</Btn>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: 1, minWidth: 0 }}>
          {/* Badge */}
          <div style={{ flexShrink: 0 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="logo" style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }} onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 16, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, border: '3px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>{initials}</div>
            )}
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{displayName}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{appSub}</div>
            {nomCom && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{nomCom}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>Marca activa</span>
              {logoUrl
                ? <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' }}>Logo configurado</span>
                : <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.6)', color: '#64748b', border: '1px solid #e2e8f0' }}>Sin logo</span>
              }
              {textoRecibos
                ? <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>Recibos personalizados</span>
                : <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.6)', color: '#64748b', border: '1px solid #e2e8f0' }}>Texto por defecto</span>
              }
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>{metActivos} métodos activos</span>
            </div>
          </div>
        </div>
        {/* Mini sidebar preview */}
        {!isMobile && !editing && (
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview sidebar</div>
            <div style={{ background: '#1e293b', borderRadius: 8, overflow: 'hidden', padding: '8px 0', width: 130 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 9px 7px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 3 }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="" style={{ width: 22, height: 22, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: 5, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, flexShrink: 0 }}>{initials}</div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName.slice(0, 14)}</div>
                  <div style={{ fontSize: 7, color: '#94a3b8' }}>{appSub.slice(0, 18)}</div>
                </div>
              </div>
              {['Dashboard', 'Clientes', 'Operaciones'].map(item => (
                <div key={item} style={{ padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: 9 }}>
                  <div style={{ width: 2, height: 2, borderRadius: '50%', background: '#475569', flexShrink: 0 }} />{item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(139,92,246,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <Field label="Nombre del CRM">
              <Input value={branding.appName || ''} onChange={e => setSetting('branding.appName', e.target.value)} placeholder="Ej: Facciano CRM" />
            </Field>
            <Field label="Subtítulo del CRM">
              <Input value={branding.appSubtitle || ''} onChange={e => setSetting('branding.appSubtitle', e.target.value)} placeholder="Sistema financiero" />
            </Field>
            <Field label="Nombre comercial">
              <Input value={branding.nombreComercial || ''} onChange={e => setSetting('branding.nombreComercial', e.target.value)} placeholder="Tu nombre / empresa" />
            </Field>
            <Field label="Iniciales (logo compacto)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: branding.accentColor || '#818cf8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
                  {branding.initials || initials}
                </div>
                <Input value={branding.initials || ''} onChange={e => setSetting('branding.initials', e.target.value)} placeholder="FA" maxLength={3} />
              </div>
            </Field>
            <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
              <Field label="URL del logo (PNG/JPG)">
                <Input value={branding.logoUrl || ''} onChange={e => setSetting('branding.logoUrl', e.target.value)} placeholder="https://..." />
              </Field>
            </div>
            <Field label="Color principal">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={branding.accentColor || '#818cf8'} onChange={e => setSetting('branding.accentColor', e.target.value)} style={{ width: 40, height: 34, border: 'none', cursor: 'pointer', borderRadius: 8, padding: 2 }} />
                <Input value={branding.accentColor || '#818cf8'} onChange={e => setSetting('branding.accentColor', e.target.value)} />
              </div>
            </Field>
            <Field label="Color secundario">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={branding.secondaryColor || '#6366f1'} onChange={e => setSetting('branding.secondaryColor', e.target.value)} style={{ width: 40, height: 34, border: 'none', cursor: 'pointer', borderRadius: 8, padding: 2 }} />
                <Input value={branding.secondaryColor || '#6366f1'} onChange={e => setSetting('branding.secondaryColor', e.target.value)} />
              </div>
            </Field>
            <div style={{ gridColumn: isMobile ? undefined : '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ToggleRow label="Mostrar nombre en sidebar" checked={branding.showSidebarTitle !== false} onChange={v => setSetting('branding.showSidebarTitle', v)} />
              <ToggleRow label="Mostrar subtítulo en sidebar" checked={branding.showSidebarSubtitle !== false} onChange={v => setSetting('branding.showSidebarSubtitle', v)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({ iconBg, iconColor, iconMark, title, description, editing, onEdit, onClose, summaryRows, noEditToggle, children }) {
  const hasSummary = summaryRows && summaryRows.length > 0;
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{iconMark}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</div>
          {description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>}
        </div>
        {!noEditToggle && (
          <Btn size="sm" variant={editing ? 'ghost' : 'secondary'} onClick={editing ? onClose : onEdit}>
            {editing ? 'Cerrar' : 'Editar'}
          </Btn>
        )}
      </div>
      {hasSummary && (
        <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-subtle)' }}>
          {summaryRows.map(({ label, value }, idx) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: idx < summaryRows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</span>
            </div>
          ))}
        </div>
      )}
      {children && (editing || noEditToggle) && (
        <div style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--border-subtle)', background: !noEditToggle ? 'var(--bg-page)' : 'var(--bg-surface)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function ConfiguracionScreen({ data, onDataChange, auth }) {
  const { settings: cfg } = data;
  const hp = window.hasPermission || (() => true);
  const [activeTab, setActiveTab] = React.useState('tasas');
  const [editingSection, setEditingSection] = React.useState(null);
  const [editedSettings, setEditedSettings] = React.useState(() => {
    const safeSettings = {
      ...cfg,
      branding:              { ...DEFAULT_BRANDING, ...(cfg.branding || {}) },
      uiPreferences:         { ...DEFAULT_UI_PREFS,  ...(cfg.uiPreferences || {}) },
      metodosPago:           normalizePaymentMethods(cfg.metodosPago || []),
      datosPrestamista:      cfg.datosPrestamista || {},
      parametrosFinancieros: cfg.parametrosFinancieros || {},
    };
    return JSON.parse(JSON.stringify(safeSettings));
  });
  const [saved, setSaved] = React.useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState(null);
  const [showVariablesHelp, setShowVariablesHelp] = React.useState(false);
  const [waTestNotice, setWaTestNotice] = React.useState('');
  const [viewportWidth, setViewportWidth] = React.useState(() => window.innerWidth || 1200);
  const [selectedRateCurrency, setSelectedRateCurrency] = React.useState('ARS');
  const [ratePlanModal, setRatePlanModal] = React.useState(null);
  const [ratePlanForm, setRatePlanForm] = React.useState(null);
  const [ratePlanErrors, setRatePlanErrors] = React.useState({});
  const [rateMenuId, setRateMenuId] = React.useState(null);
  const [simulatorAmount, setSimulatorAmount] = React.useState('100000');
  const [simulatorPlanKey, setSimulatorPlanKey] = React.useState('');
  const waTextareaRef = React.useRef(null);

  React.useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth || 1200);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  async function save() {
    if (!hp('settings.edit')) { alert('No tenés permiso para editar la configuración.'); return; }
    const sb = window.__supabase;
    const orgId = auth?.currentOrganization?.id;
    const normalizedSettings = {
      ...editedSettings,
      tasasPorCuotas: normalizeRatePlans(editedSettings.tasasPorCuotas),
      parametrosFinancieros: {
        ...(editedSettings.parametrosFinancieros || {}),
        mora: normalizeMoraSettings(editedSettings),
      },
    };
    const { error } = await sb.from('app_settings').upsert({
      organization_id:         orgId,
      tasas_por_cuotas:        normalizedSettings.tasasPorCuotas,
      metodos_pago:            normalizedSettings.metodosPago,
      estados_cliente:         normalizedSettings.estadosCliente,
      estados_operacion:       normalizedSettings.estadosOperacion,
      estados_cuota:           normalizedSettings.estadosCuota,
      estados_tarjeta:         normalizedSettings.estadosTarjeta,
      tipos_operacion:         normalizedSettings.tiposOperacion,
      datos_prestamista:       normalizedSettings.datosPrestamista,
      plantillas_whatsapp:     normalizedSettings.plantillasWhatsapp,
      parametros_financieros:  normalizedSettings.parametrosFinancieros,
      branding:                normalizedSettings.branding,
      ui_preferences:          normalizedSettings.uiPreferences,
    }, { onConflict: 'organization_id' });
    if (error) { alert('Error al guardar configuración: ' + error.message); return; }
    setEditedSettings(normalizedSettings);
    onDataChange('settings', normalizedSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const setSetting = (path, value) => {
    setEditedSettings(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const tabs = [
    { id: 'tasas',           label: 'Tasas' },
    { id: 'personalizacion', label: 'Personalización' },
    { id: 'whatsapp',        label: 'WhatsApp' },
    { id: 'equipo',          label: 'Equipo y seguridad' },
  ];

  const Section = ({ title, hint, children }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>{title}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );

  const SCard = ({ n, title, hint, children }) => (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{n}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</div>
          {hint && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{hint}</div>}
        </div>
      </div>
      {children}
    </div>
  );

  const allRatePlans = React.useMemo(
    () => normalizeRatePlans(editedSettings.tasasPorCuotas).map((plan, index) => ({ ...plan, _index: index })),
    [editedSettings.tasasPorCuotas]
  );
  const rateCurrencyLabel = selectedRateCurrency === 'USD' ? 'dólares' : 'pesos argentinos';
  const currentRatePlans = allRatePlans
    .filter(plan => plan.moneda === selectedRateCurrency)
    .sort((a, b) => a.cuotas - b.cuotas);
  const activeRatePlans = currentRatePlans.filter(plan => plan.activa);
  const minRatePlan = activeRatePlans.slice().sort((a, b) => a.tasa - b.tasa)[0] || null;
  const maxRatePlan = activeRatePlans.slice().sort((a, b) => b.tasa - a.tasa)[0] || null;
  const simulatorActivePlans = activeRatePlans;
  const simulatorPlan = simulatorActivePlans.find(plan => String(plan.cuotas) === String(simulatorPlanKey)) || simulatorActivePlans[0] || null;
  const simulatorAmountNumber = Number(String(simulatorAmount || '').replace(/\./g, '').replace(',', '.')) || 0;
  const simulatorInterest = simulatorPlan ? simulatorAmountNumber * simulatorPlan.tasa / 100 : 0;
  const simulatorTotal = simulatorAmountNumber + simulatorInterest;
  const simulatorInstallment = simulatorPlan ? Math.ceil(simulatorTotal / simulatorPlan.cuotas) : 0;

  React.useEffect(() => {
    setSimulatorAmount(selectedRateCurrency === 'USD' ? '1000' : '100000');
    setSimulatorPlanKey('');
    setRateMenuId(null);
  }, [selectedRateCurrency]);

  React.useEffect(() => {
    if (!simulatorPlan && simulatorActivePlans[0]) {
      setSimulatorPlanKey(String(simulatorActivePlans[0].cuotas));
    }
  }, [simulatorActivePlans, simulatorPlan]);

  function ratePercent(value) {
    const n = Number(value || 0);
    return `${n.toLocaleString('es-AR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}%`;
  }

  function rateDate(value) {
    return value ? formatDate(value) : 'Sin vencimiento';
  }

  function setRatePlans(nextPlans) {
    setSetting('tasasPorCuotas', normalizeRatePlans(nextPlans));
  }

  function defaultRateForm(currency = selectedRateCurrency) {
    return {
      moneda: currency,
      cuotas: '',
      tasa: '',
      activa: true,
      desde: new Date().toISOString().slice(0, 10),
      hasta: '',
      notas: '',
      _index: null,
    };
  }

  function openRateModal(mode, plan = null) {
    setRateMenuId(null);
    setRatePlanErrors({});
    setRatePlanModal({ mode, sourceIndex: plan?._index ?? null });
    setRatePlanForm(plan ? {
      moneda: plan.moneda || 'ARS',
      cuotas: String(plan.cuotas || ''),
      tasa: String(plan.tasa ?? ''),
      activa: plan.activa !== false,
      desde: plan.desde || new Date().toISOString().slice(0, 10),
      hasta: plan.hasta || '',
      notas: plan.notas || '',
      _index: plan._index,
    } : defaultRateForm());
  }

  function duplicateRatePlan(plan) {
    openRateModal('duplicate', { ...plan, _index: null });
  }

  function validateRatePlanForm() {
    const e = {};
    const moneda = normalizeCurrency(ratePlanForm?.moneda);
    const cuotas = parseInt(ratePlanForm?.cuotas, 10);
    const tasa = Number(String(ratePlanForm?.tasa || '').replace(',', '.'));
    const active = ratePlanForm?.activa !== false;
    if (!moneda) e.moneda = 'Seleccioná una moneda';
    if (!Number.isInteger(cuotas) || cuotas <= 0) e.cuotas = 'Ingresá cuotas válidas';
    if (!Number.isFinite(tasa) || tasa < 0) e.tasa = 'Ingresá una tasa válida';
    if (active) {
      const duplicate = allRatePlans.find(plan =>
        plan._index !== ratePlanModal?.sourceIndex &&
        plan.activa &&
        plan.moneda === moneda &&
        Number(plan.cuotas) === cuotas
      );
      if (duplicate) e.cuotas = 'Ya existe un plan activo para esa moneda y cantidad de cuotas';
    }
    setRatePlanErrors(e);
    return Object.keys(e).length === 0;
  }

  function saveRatePlan() {
    if (!validateRatePlanForm()) return;
    const nextPlan = normalizeRatePlan({
      moneda: ratePlanForm.moneda,
      cuotas: parseInt(ratePlanForm.cuotas, 10),
      tasa: Number(String(ratePlanForm.tasa).replace(',', '.')),
      activa: ratePlanForm.activa !== false,
      desde: ratePlanForm.desde || new Date().toISOString().slice(0, 10),
      hasta: ratePlanForm.hasta || null,
      notas: ratePlanForm.notas || '',
    });
    const nextPlans = normalizeRatePlans(editedSettings.tasasPorCuotas);
    if (ratePlanModal?.mode === 'edit' && ratePlanModal.sourceIndex != null) {
      nextPlans[ratePlanModal.sourceIndex] = nextPlan;
    } else {
      nextPlans.push(nextPlan);
    }
    setRatePlans(nextPlans);
    setSelectedRateCurrency(nextPlan.moneda);
    setRatePlanModal(null);
    setRatePlanForm(null);
  }

  function toggleRatePlan(plan) {
    const nextPlans = normalizeRatePlans(editedSettings.tasasPorCuotas);
    if (!plan.activa) {
      const duplicate = allRatePlans.find(other =>
        other._index !== plan._index &&
        other.activa &&
        other.moneda === plan.moneda &&
        Number(other.cuotas) === Number(plan.cuotas)
      );
      if (duplicate) {
        alert('Ya existe un plan activo para esa moneda y cantidad de cuotas.');
        setRateMenuId(null);
        return;
      }
    }
    nextPlans[plan._index] = { ...nextPlans[plan._index], activa: !plan.activa };
    setRatePlans(nextPlans);
    setRateMenuId(null);
  }

  function viewRatePlanInSimulator(plan) {
    setSelectedRateCurrency(plan.moneda);
    setSimulatorPlanKey(String(plan.cuotas));
    setRateMenuId(null);
  }

  const whatsappTemplates = React.useMemo(
    () => normalizeWhatsappTemplates(editedSettings.plantillasWhatsapp),
    [editedSettings.plantillasWhatsapp]
  );

  React.useEffect(() => {
    if (activeTab !== 'whatsapp' || whatsappTemplates.length === 0) return;
    const exists = whatsappTemplates.some(tpl => tpl.id === selectedTemplateId);
    if (!exists) {
      const preferred = whatsappTemplates.find(tpl => normalizeTemplateText(tpl.nombre).includes('recordatorio')) || whatsappTemplates[0];
      setSelectedTemplateId(preferred.id);
    }
  }, [activeTab, whatsappTemplates, selectedTemplateId]);

  const selectedTemplate = whatsappTemplates.find(tpl => tpl.id === selectedTemplateId) || whatsappTemplates[0] || null;
  const selectedMeta = selectedTemplate ? getWhatsappTemplateMeta(selectedTemplate) : null;
  const unknownWaVariables = selectedTemplate ? getUnknownWhatsappVariables(selectedTemplate.texto) : [];
  const waPreviewText = selectedTemplate ? renderWhatsappPreview(selectedTemplate.texto) : '';
  const isMobile = viewportWidth < 860;
  const summaryCount = whatsappTemplates.length;

  function setWhatsappTemplates(nextTemplates) {
    setSetting('plantillasWhatsapp', nextTemplates.map(tpl => ({
      id: tpl.id,
      nombre: tpl.nombre,
      texto: tpl.texto,
    })));
  }

  function updateSelectedTemplateText(nextText) {
    if (!selectedTemplate) return;
    const next = whatsappTemplates.map(tpl => (
      tpl.id === selectedTemplate.id ? { ...tpl, texto: nextText } : tpl
    ));
    setWhatsappTemplates(next);
  }

  function insertWhatsappVariable(variable) {
    if (!selectedTemplate) return;
    const current = selectedTemplate.texto || '';
    const node = waTextareaRef.current;
    let start = current.length;
    let end = current.length;

    if (node && typeof node.selectionStart === 'number') {
      start = node.selectionStart;
      end = node.selectionEnd;
    }

    const needsLeftSpace = start > 0 && !/\s$/.test(current.slice(0, start));
    const needsRightSpace = end < current.length && !/^\s/.test(current.slice(end));
    const insert = `${needsLeftSpace ? ' ' : ''}${variable}${needsRightSpace ? ' ' : ''}`;
    const nextText = current.slice(0, start) + insert + current.slice(end);
    updateSelectedTemplateText(nextText);

    setTimeout(() => {
      if (!waTextareaRef.current) return;
      const cursor = start + insert.length;
      waTextareaRef.current.focus();
      waTextareaRef.current.setSelectionRange(cursor, cursor);
    }, 0);
  }

  function showTemplateComingSoon() {
    setWaTestNotice('La creación de plantillas dinámicas llega próximamente.');
    setTimeout(() => setWaTestNotice(''), 3000);
  }

  function testWhatsappOpen() {
    setWaTestNotice('Para probar el envío necesitás elegir un cliente con teléfono.');
    setTimeout(() => setWaTestNotice(''), 3500);
  }

  return (
    <div>
      <SectionHeader title="Configuración" actions={
        <Btn onClick={save}>💾 Guardar cambios</Btn>
      } />
      {saved && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
          ✅ Configuración guardada correctamente.
        </div>
      )}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0 16px' }}><Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} /></div>
        <div style={{ padding: 24 }}>

          {/* TASAS */}
          {activeTab === 'tasas' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 320px', gap: 18, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 14, flexDirection: isMobile ? 'column' : 'row' }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>Tasas y financiación</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Configurá las tasas que se aplican automáticamente al crear nuevas operaciones.</div>
                  </div>
                  <Btn onClick={() => openRateModal('new')}>+ Agregar plan</Btn>
                </div>

                <div style={{ display: 'inline-grid', gridTemplateColumns: '1fr 1fr', maxWidth: 520, border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden', background: 'var(--bg-surface)' }}>
                  {[
                    ['ARS', 'Pesos argentinos (ARS)'],
                    ['USD', 'Dólares (USD)'],
                  ].map(([curr, label]) => (
                    <button key={curr} type="button" onClick={() => setSelectedRateCurrency(curr)} style={{ border: 'none', padding: '10px 18px', background: selectedRateCurrency === curr ? '#4f46e5' : '#fff', color: selectedRateCurrency === curr ? '#fff' : '#334155', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                  {[
                    { title: 'Planes activos', value: activeRatePlans.length, text: `planes en ${selectedRateCurrency}`, bg: '#eef2ff', color: '#4f46e5', mark: 'PL' },
                    { title: 'Tasa mínima', value: minRatePlan ? ratePercent(minRatePlan.tasa) : '0', text: minRatePlan ? `${minRatePlan.cuotas} cuota${minRatePlan.cuotas > 1 ? 's' : ''}` : 'sin planes', bg: '#dcfce7', color: '#16a34a', mark: 'MIN' },
                    { title: 'Tasa máxima', value: maxRatePlan ? ratePercent(maxRatePlan.tasa) : '0', text: maxRatePlan ? `${maxRatePlan.cuotas} cuota${maxRatePlan.cuotas > 1 ? 's' : ''}` : 'sin planes', bg: '#fef3c7', color: '#f59e0b', mark: 'MAX' },
                    { title: 'Aplicación', value: 'Solo nuevas', text: 'operaciones', bg: '#dbeafe', color: '#2563eb', mark: 'USO' },
                  ].map(card => (
                    <Card key={card.title} style={{ padding: 16, border: '1px solid var(--border)', boxShadow: '0 8px 22px rgba(15,23,42,0.04)' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 42, height: 42, borderRadius: 14, background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{card.mark}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: '#475569', fontWeight: 900 }}>{card.title}</div>
                          <div style={{ fontSize: 22, color: 'var(--text-primary)', fontWeight: 900, lineHeight: 1.1, marginTop: 3 }}>{card.value}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{card.text}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fbbf24', color: '#854d0e', borderRadius: 9, padding: '11px 13px' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>!</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>Cambios no retroactivos</div>
                    <div style={{ fontSize: 12, marginTop: 2 }}>Las tasas modificadas solo se aplican a operaciones nuevas. Las operaciones ya creadas conservan sus condiciones originales.</div>
                  </div>
                </div>

                <Card style={{ border: '1px solid var(--border)', boxShadow: '0 10px 28px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>Planes de cuotas en {rateCurrencyLabel}</div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800 }}>{selectedRateCurrency}</span>
                  </div>

                  {currentRatePlans.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>No hay planes configurados en {selectedRateCurrency}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>Agregá un plan para que las operaciones en {selectedRateCurrency === 'USD' ? 'dólares' : 'pesos'} puedan sugerir tasas automáticamente.</div>
                      <Btn onClick={() => openRateModal('new')}>+ Agregar primer plan {selectedRateCurrency}</Btn>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'DM Sans, sans-serif', minWidth: 780 }}>
                        <thead>
                          <tr>
                            {['Plan', 'Tasa (%)', 'Estado', 'Vigente desde', 'Vigente hasta', 'Uso', 'Acciones'].map(h => (
                              <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentRatePlans.map(plan => (
                            <tr key={`${plan.moneda}-${plan.cuotas}-${plan._index}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 900 }}>{plan.cuotas} cuota{plan.cuotas > 1 ? 's' : ''}</td>
                              <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 800, fontFamily: 'DM Mono, monospace' }}>{ratePercent(plan.tasa)}</td>
                              <td style={{ padding: '10px 14px' }}><span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 800, background: plan.activa ? '#f0fdf4' : '#f1f5f9', color: plan.activa ? '#15803d' : '#64748b', border: `1px solid ${plan.activa ? '#bbf7d0' : '#e2e8f0'}` }}>{plan.activa ? 'Activo' : 'Inactivo'}</span></td>
                              <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{rateDate(plan.desde)}</td>
                              <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{rateDate(plan.hasta)}</td>
                              <td style={{ padding: '10px 14px', color: plan.activa ? '#334155' : '#94a3b8' }}>{plan.activa ? 'Nueva operación' : 'No disponible'}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
                                  <Btn size="sm" variant="secondary" onClick={() => plan.activa ? openRateModal('edit', plan) : toggleRatePlan(plan)} style={{ color: plan.activa ? '#334155' : '#4f46e5' }}>{plan.activa ? 'Editar' : 'Reactivar'}</Btn>
                                  <button type="button" onClick={() => setRateMenuId(rateMenuId === plan._index ? null : plan._index)} style={{ width: 32, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 900 }}>...</button>
                                  {rateMenuId === plan._index && (
                                    <div style={{ position: 'absolute', right: 0, top: 34, minWidth: 190, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 32px rgba(15,23,42,0.14)', zIndex: 20, overflow: 'hidden' }}>
                                      {[
                                        ['Editar plan', () => openRateModal('edit', plan)],
                                        ['Duplicar plan', () => duplicateRatePlan(plan)],
                                        [plan.activa ? 'Desactivar' : 'Reactivar', () => toggleRatePlan(plan)],
                                        ['Ver impacto en simulador', () => viewRatePlanInSimulator(plan)],
                                      ].map(([label, action]) => (
                                        <button key={label} type="button" onClick={action} style={{ width: '100%', display: 'block', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'var(--bg-surface)', color: '#334155', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{label}</button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 12 }}>Todas las tasas se expresan en porcentaje sobre el monto financiado.</div>
                </Card>

                <Card style={{ padding: 18, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto', gap: 16, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 900 }}>Cómo funcionan las tasas</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.45 }}>El plan seleccionado se aplicará automáticamente al crear nuevas operaciones según la cantidad de cuotas y la moneda. Si no existe un plan activo, podrás cargar una tasa manual.</div>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <div><div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 900 }}>$ Pesos argentinos (ARS)</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Moneda local</div></div>
                      <div><div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 900 }}>U$S Dólares (USD)</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Moneda extranjera</div></div>
                    </div>
                    <button type="button" onClick={() => alert('Las tasas son independientes por moneda y solo se aplican a operaciones nuevas.')} style={{ border: 'none', background: 'transparent', color: '#4f46e5', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>Ver más información →</button>
                  </div>
                </Card>
              </div>

              <Card style={{ padding: 18, border: '1px solid var(--border)', boxShadow: '0 10px 28px rgba(15,23,42,0.05)', alignSelf: 'start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'DM Mono, monospace' }}>SIM</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)' }}>Simulador rápido</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.35 }}>Calculá el impacto de una tasa antes de crear la operación.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Field label="Moneda">
                    <Select value={selectedRateCurrency} onChange={e => setSelectedRateCurrency(e.target.value)}>
                      <option value="ARS">Pesos argentinos (ARS)</option>
                      <option value="USD">Dólares (USD)</option>
                    </Select>
                  </Field>
                  <Field label="Monto a financiar">
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 900 }}>{selectedRateCurrency === 'USD' ? 'U$S' : '$'}</span>
                      <Input value={simulatorAmount} onChange={e => setSimulatorAmount(e.target.value)} style={{ paddingLeft: selectedRateCurrency === 'USD' ? 48 : 30 }} />
                    </div>
                  </Field>
                  <Field label="Plan de cuotas">
                    <Select value={simulatorPlan ? String(simulatorPlan.cuotas) : ''} onChange={e => setSimulatorPlanKey(e.target.value)} disabled={!simulatorActivePlans.length}>
                      {simulatorActivePlans.map(plan => <option key={`${plan.moneda}-${plan.cuotas}`} value={plan.cuotas}>{plan.cuotas} cuotas · {ratePercent(plan.tasa)}</option>)}
                    </Select>
                  </Field>

                  {simulatorPlan ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 13, color: '#166534', fontWeight: 900, marginBottom: 10 }}>Resultado estimado</div>
                      {[
                        ['Interés aplicado', formatMoney(simulatorInterest, selectedRateCurrency)],
                        ['Total financiado', formatMoney(simulatorTotal, selectedRateCurrency)],
                        ['Valor de cuota', formatMoney(simulatorInstallment, selectedRateCurrency)],
                        ['Cantidad de cuotas', simulatorPlan.cuotas],
                      ].map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 13, color: 'var(--text-primary)' }}>
                          <span>{label}</span>
                          <strong style={{ fontFamily: 'DM Mono, monospace' }}>{value}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, color: 'var(--text-muted)', fontSize: 13 }}>No hay planes activos para {selectedRateCurrency}. Configurá un plan para poder simular esta moneda.</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Cálculo estimado. El resultado final puede variar por redondeos.</div>
                </div>
              </Card>

              {ratePlanModal && ratePlanForm && (
                <Modal
                  open={true}
                  onClose={() => { setRatePlanModal(null); setRatePlanForm(null); setRatePlanErrors({}); }}
                  title={ratePlanModal.mode === 'edit' ? 'Editar plan de financiación' : 'Nuevo plan de financiación'}
                  size="md"
                  footer={
                    <>
                      <Btn variant="secondary" onClick={() => { setRatePlanModal(null); setRatePlanForm(null); setRatePlanErrors({}); }}>Cancelar</Btn>
                      <Btn onClick={saveRatePlan}>Guardar plan</Btn>
                    </>
                  }
                >
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                    <Field label="Moneda" error={ratePlanErrors.moneda}>
                      <Select value={ratePlanForm.moneda} onChange={e => setRatePlanForm(f => ({ ...f, moneda: e.target.value }))}>
                        <option value="ARS">ARS - Pesos argentinos</option>
                        <option value="USD">USD - Dólares</option>
                      </Select>
                    </Field>
                    <Field label="Cantidad de cuotas" error={ratePlanErrors.cuotas}>
                      <Input type="number" min="1" value={ratePlanForm.cuotas} onChange={e => setRatePlanForm(f => ({ ...f, cuotas: e.target.value }))} />
                    </Field>
                    <Field label="Tasa aplicada (%)" error={ratePlanErrors.tasa}>
                      <Input type="number" min="0" step="0.01" value={ratePlanForm.tasa} onChange={e => setRatePlanForm(f => ({ ...f, tasa: e.target.value }))} />
                    </Field>
                    <Field label="Estado">
                      <Select value={ratePlanForm.activa ? 'active' : 'inactive'} onChange={e => setRatePlanForm(f => ({ ...f, activa: e.target.value === 'active' }))}>
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                      </Select>
                    </Field>
                    <Field label="Vigente desde">
                      <Input type="date" value={ratePlanForm.desde} onChange={e => setRatePlanForm(f => ({ ...f, desde: e.target.value }))} />
                    </Field>
                    <Field label="Vigente hasta">
                      <Input type="date" value={ratePlanForm.hasta} onChange={e => setRatePlanForm(f => ({ ...f, hasta: e.target.value }))} />
                    </Field>
                    <div style={{ gridColumn: '1/-1' }}>
                      <Field label="Notas internas">
                        <Textarea rows={3} value={ratePlanForm.notas} onChange={e => setRatePlanForm(f => ({ ...f, notas: e.target.value }))} />
                      </Field>
                    </div>
                  </div>
                </Modal>
              )}
            </div>
          )}

          {/* PERSONALIZACIÓN */}
          {activeTab === 'personalizacion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Personalizá la identidad de tu CRM, los datos de tu negocio, métodos de pago, parámetros y la experiencia de uso.
              </div>

              {/* Hero card */}
              <IdentidadHeroCard
                settings={editedSettings}
                setSetting={setSetting}
                editing={editingSection === 'identidad'}
                onEdit={() => setEditingSection('identidad')}
                onClose={() => setEditingSection(null)}
                isMobile={isMobile}
              />

              {/* Two-column layout */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 300px', gap: 20, alignItems: 'start' }}>

                {/* Left: section cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* A: Datos del negocio */}
                  <SectionCard
                    iconBg="#f0fdf4" iconColor="#16a34a" iconMark="🏢"
                    title="Datos del negocio"
                    description="Información del prestamista que aparece en recibos y comprobantes."
                    editing={editingSection === 'negocio'}
                    onEdit={() => setEditingSection('negocio')}
                    onClose={() => setEditingSection(null)}
                    summaryRows={[
                      { label: 'Nombre', value: editedSettings.datosPrestamista.nombre },
                      { label: 'Teléfono', value: editedSettings.datosPrestamista.telefono },
                      { label: 'Dirección', value: editedSettings.datosPrestamista.direccion },
                      { label: 'Firma', value: editedSettings.datosPrestamista.firma },
                    ]}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                      <Field label="Nombre del prestamista">
                        <Input value={editedSettings.datosPrestamista.nombre || ''} onChange={e => setSetting('datosPrestamista.nombre', e.target.value)} />
                      </Field>
                      <Field label="Teléfono / WhatsApp">
                        <Input value={editedSettings.datosPrestamista.telefono || ''} onChange={e => setSetting('datosPrestamista.telefono', e.target.value)} />
                      </Field>
                      <Field label="Dirección">
                        <Input value={editedSettings.datosPrestamista.direccion || ''} onChange={e => setSetting('datosPrestamista.direccion', e.target.value)} />
                      </Field>
                      <Field label="Ciudad / zona">
                        <Input value={editedSettings.datosPrestamista.ciudad || ''} onChange={e => setSetting('datosPrestamista.ciudad', e.target.value)} />
                      </Field>
                      <Field label="Email">
                        <Input value={editedSettings.datosPrestamista.email || ''} onChange={e => setSetting('datosPrestamista.email', e.target.value)} />
                      </Field>
                      <Field label="CUIT / DNI (opcional)">
                        <Input value={editedSettings.datosPrestamista.cuit || ''} onChange={e => setSetting('datosPrestamista.cuit', e.target.value)} />
                      </Field>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <Field label="Firma / Aclaración">
                          <Input value={editedSettings.datosPrestamista.firma || ''} onChange={e => setSetting('datosPrestamista.firma', e.target.value)} />
                        </Field>
                      </div>
                    </div>
                  </SectionCard>

                  {/* B: Documentos y comprobantes */}
                  <SectionCard
                    iconBg="#eff6ff" iconColor="#2563eb" iconMark="📄"
                    title="Documentos y comprobantes"
                    description="Textos y datos visibles en recibos de pago y comprobantes internos."
                    editing={editingSection === 'documentos'}
                    onEdit={() => setEditingSection('documentos')}
                    onClose={() => setEditingSection(null)}
                    summaryRows={[
                      { label: 'Texto para recibos', value: (editedSettings.datosPrestamista.textoRecibos || '').slice(0, 45) || 'Por defecto' },
                      { label: 'Logo en recibos', value: editedSettings.branding.mostrarLogoEnRecibos !== false ? 'Sí' : 'No' },
                      { label: 'Firma al pie', value: editedSettings.branding.mostrarFirmaAlPie !== false ? 'Sí' : 'No' },
                      { label: 'Identificación fiscal', value: editedSettings.branding.mostrarIdentificacionFiscal ? 'Sí' : 'No' },
                    ]}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Field label="Texto para recibos">
                        <Textarea value={editedSettings.datosPrestamista.textoRecibos || ''} onChange={e => setSetting('datosPrestamista.textoRecibos', e.target.value)} rows={2} placeholder="Ej: Recibo válido como constancia de pago." />
                      </Field>
                      <Field label="Texto para comprobantes internos">
                        <Textarea value={editedSettings.datosPrestamista.textoComprobantes || ''} onChange={e => setSetting('datosPrestamista.textoComprobantes', e.target.value)} rows={2} placeholder="Ej: Uso exclusivo interno." />
                      </Field>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                        <ToggleRow label="Mostrar logo en recibos" checked={editedSettings.branding.mostrarLogoEnRecibos !== false} onChange={v => setSetting('branding.mostrarLogoEnRecibos', v)} />
                        <ToggleRow label="Mostrar teléfono en recibos" checked={editedSettings.branding.mostrarTelefonoEnRecibos !== false} onChange={v => setSetting('branding.mostrarTelefonoEnRecibos', v)} />
                        <ToggleRow label="Mostrar dirección en recibos" checked={!!editedSettings.branding.mostrarDireccionEnRecibos} onChange={v => setSetting('branding.mostrarDireccionEnRecibos', v)} />
                        <ToggleRow label="Mostrar firma al pie" checked={editedSettings.branding.mostrarFirmaAlPie !== false} onChange={v => setSetting('branding.mostrarFirmaAlPie', v)} />
                        <ToggleRow label="Mostrar identificación fiscal" checked={!!editedSettings.branding.mostrarIdentificacionFiscal} onChange={v => setSetting('branding.mostrarIdentificacionFiscal', v)} />
                      </div>
                    </div>
                  </SectionCard>

                  {/* C: Métodos de pago — siempre visible */}
                  <SectionCard
                    iconBg="#fef3c7" iconColor="#d97706" iconMark="💳"
                    title="Métodos de pago"
                    description="Métodos disponibles al registrar pagos. Los inactivos no aparecen para pagos nuevos."
                    noEditToggle
                    summaryRows={[
                      { label: 'Métodos activos', value: `${editedSettings.metodosPago.filter(m => m.activo).length} de ${editedSettings.metodosPago.length}` },
                      { label: 'Predeterminado', value: (editedSettings.metodosPago.find(m => m.predeterminado) || editedSettings.metodosPago[0])?.nombre || '—' },
                    ]}
                  >
                    <PaymentMethodsEditor
                      methods={editedSettings.metodosPago}
                      onChange={next => setSetting('metodosPago', next)}
                    />
                  </SectionCard>

                  {/* D: Parámetros generales */}
                  <SectionCard
                    iconBg="#f5f3ff" iconColor="#7c3aed" iconMark="⚙️"
                    title="Parámetros generales"
                    description="Moneda, plazos y reglas financieras del sistema."
                    editing={editingSection === 'parametros'}
                    onEdit={() => setEditingSection('parametros')}
                    onClose={() => setEditingSection(null)}
                    summaryRows={[
                      { label: 'Moneda principal', value: editedSettings.parametrosFinancieros.moneda || 'ARS' },
                      { label: 'Días de gracia', value: `${editedSettings.parametrosFinancieros.diasGracia || 0} días` },
                      { label: 'Pagos parciales', value: editedSettings.parametrosFinancieros.permitirPagosParciales ? 'Permitidos' : 'No' },
                      { label: 'Interés por mora', value: editedSettings.parametrosFinancieros.interesMoraActivo ? 'Activo' : 'Inactivo' },
                    ]}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                      <Field label="Moneda principal">
                        <Select value={editedSettings.parametrosFinancieros.moneda || 'ARS'} onChange={e => setSetting('parametrosFinancieros.moneda', e.target.value)}>
                          <option value="ARS">ARS — Peso argentino</option>
                          <option value="USD">USD — Dólar estadounidense</option>
                        </Select>
                      </Field>
                      <Field label="Moneda secundaria (opcional)">
                        <Select value={editedSettings.parametrosFinancieros.monedaSecundaria || ''} onChange={e => setSetting('parametrosFinancieros.monedaSecundaria', e.target.value)}>
                          <option value="">Sin moneda secundaria</option>
                          <option value="USD">USD — Dólar estadounidense</option>
                          <option value="ARS">ARS — Peso argentino</option>
                        </Select>
                      </Field>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <Field label="Días de gracia">
                          <Input type="number" min={0} value={editedSettings.parametrosFinancieros.diasGracia || 0} onChange={e => setSetting('parametrosFinancieros.diasGracia', parseInt(e.target.value) || 0)} />
                        </Field>
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                          ['Permitir pagos parciales', 'permitirPagosParciales'],
                          ['Permitir sobrepagos', 'permitirSobrepagos'],
                          ['Permitir condonaciones', 'permitirCondonaciones'],
                          ['Interés por mora activo', 'interesMoraActivo'],
                          ['Mostrar equivalente en USD', 'mostrarEquivalenteUSD'],
                          ['Cotización USD manual habilitada', 'cotizacionUSDManual'],
                        ].map(([label, key]) => (
                          <ToggleRow key={key} label={label} checked={!!editedSettings.parametrosFinancieros[key]} onChange={v => setSetting(`parametrosFinancieros.${key}`, v)} />
                        ))}
                      </div>
                    </div>
                  </SectionCard>

                  {/* E: Mora */}
                  <SectionCard
                    iconBg="#fee2e2" iconColor="#dc2626" iconMark="M"
                    title="Mora"
                    description="Recargos diarios por cuotas vencidas. Solo se aplican cuando el usuario confirma o cuando el modo automatico lo permite."
                    editing={editingSection === 'mora'}
                    onEdit={() => setEditingSection('mora')}
                    onClose={() => setEditingSection(null)}
                    summaryRows={[
                      { label: 'Estado', value: normalizeMoraSettings(editedSettings).activa ? 'Activa' : 'Inactiva' },
                      { label: 'Modo', value: normalizeMoraSettings(editedSettings).modo.replaceAll('_', ' ') },
                      { label: 'Tasa diaria', value: `${normalizeMoraSettings(editedSettings).tasaDiaria}%` },
                      { label: 'Dias de gracia', value: `${normalizeMoraSettings(editedSettings).diasGracia} dias` },
                    ]}
                  >
                    {(() => {
                      const mora = normalizeMoraSettings(editedSettings);
                      const setMora = (key, value) => setSetting('parametrosFinancieros.mora', { ...mora, [key]: value });
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                          <Field label="Estado">
                            <Select value={mora.activa ? 'si' : 'no'} onChange={e => setMora('activa', e.target.value === 'si')}>
                              <option value="si">Activa</option>
                              <option value="no">Inactiva</option>
                            </Select>
                          </Field>
                          <Field label="Modo de mora">
                            <Select value={mora.modo} onChange={e => setMora('modo', e.target.value)}>
                              <option value="manual">Manual</option>
                              <option value="automatica_confirmacion">Automatica con confirmacion</option>
                              <option value="automatica">Automatica</option>
                            </Select>
                          </Field>
                          <Field label="Tasa diaria (%)">
                            <Input type="number" min="0" step="0.01" value={mora.tasaDiaria} onChange={e => setMora('tasaDiaria', Number(e.target.value) || 0)} />
                          </Field>
                          <Field label="Dias de gracia">
                            <Input type="number" min="0" value={mora.diasGracia} onChange={e => setMora('diasGracia', parseInt(e.target.value, 10) || 0)} />
                          </Field>
                          <Field label="Base de calculo">
                            <Select value={mora.baseCalculo} onChange={e => setMora('baseCalculo', e.target.value)}>
                              <option value="saldo_pendiente">Saldo pendiente</option>
                              <option value="monto_programado">Monto programado original</option>
                            </Select>
                          </Field>
                          <Field label="Tipo de calculo">
                            <Select value={mora.tipoCalculo} onChange={e => setMora('tipoCalculo', e.target.value)}>
                              <option value="simple">Simple</option>
                              <option value="compuesto">Compuesto</option>
                            </Select>
                          </Field>
                          <Field label="Redondeo">
                            <Select value={mora.redondeo} onChange={e => setMora('redondeo', e.target.value)}>
                              <option value="sin_redondeo">Sin redondeo</option>
                              <option value="100">A 100</option>
                              <option value="500">A 500</option>
                              <option value="1000">A 1000</option>
                            </Select>
                          </Field>
                          <Field label="Prioridad de pago">
                            <Select value={mora.prioridadPago} onChange={e => setMora('prioridadPago', e.target.value)}>
                              <option value="mora_primero">Mora primero</option>
                              <option value="cuota_primero">Cuota primero</option>
                              <option value="manual">Manual</option>
                            </Select>
                          </Field>
                          <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <ToggleRow label="Aplicar al abrir Mora" checked={mora.aplicarAlAbrirMora} onChange={v => setMora('aplicarAlAbrirMora', v)} />
                            <ToggleRow label="Aplicar al registrar pago" checked={mora.aplicarAlRegistrarPago} onChange={v => setMora('aplicarAlRegistrarPago', v)} />
                          </div>
                        </div>
                      );
                    })()}
                  </SectionCard>

                  {/* E: Experiencia de uso */}
                  <SectionCard
                    iconBg="#eef2ff" iconColor="#4f46e5" iconMark="✨"
                    title="Experiencia de uso"
                    description="Interfaz, tema y acciones rápidas del CRM."
                    editing={editingSection === 'experiencia'}
                    onEdit={() => setEditingSection('experiencia')}
                    onClose={() => setEditingSection(null)}
                    summaryRows={[
                      { label: 'Privacidad', value: editedSettings.uiPreferences.modoPrivacidad === 'desactivado' ? 'Desactivada' : 'Activada' },
                      { label: 'Sidebar', value: editedSettings.uiPreferences.sidebarPorDefecto === 'colapsada' ? 'Colapsada' : 'Expandida' },
                      { label: 'Densidad', value: editedSettings.uiPreferences.densidadVisual === 'compacta' ? 'Compacta' : 'Cómoda' },
                      { label: 'Tema', value: editedSettings.uiPreferences.tema === 'oscuro' ? 'Oscuro' : 'Claro' },
                      { label: 'Pantalla inicial', value: { dashboard: 'Dashboard', clientes: 'Clientes', operaciones: 'Operaciones', cuotas: 'Cuotas' }[editedSettings.uiPreferences.pantallaInicial] || 'Dashboard' },
                    ]}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Field label="Modo privacidad por defecto">
                        <Select value={editedSettings.uiPreferences.modoPrivacidad || 'activado'} onChange={e => setSetting('uiPreferences.modoPrivacidad', e.target.value)}>
                          <option value="activado">Activado</option>
                          <option value="desactivado">Desactivado</option>
                        </Select>
                      </Field>
                      <Field label="Sidebar por defecto">
                        <Select value={editedSettings.uiPreferences.sidebarPorDefecto || 'expandida'} onChange={e => setSetting('uiPreferences.sidebarPorDefecto', e.target.value)}>
                          <option value="expandida">Expandida</option>
                          <option value="colapsada">Colapsada</option>
                        </Select>
                      </Field>
                      <Field label="Densidad visual">
                        <Select value={editedSettings.uiPreferences.densidadVisual || 'comoda'} onChange={e => setSetting('uiPreferences.densidadVisual', e.target.value)}>
                          <option value="comoda">Cómoda</option>
                          <option value="compacta">Compacta</option>
                        </Select>
                      </Field>
                      <Field label="Tema">
                        <Select value={editedSettings.uiPreferences.tema || 'claro'} onChange={e => setSetting('uiPreferences.tema', e.target.value)}>
                          <option value="claro">Claro</option>
                          <option value="oscuro">Oscuro</option>
                        </Select>
                      </Field>
                      <Field label="Pantalla inicial">
                        <Select value={editedSettings.uiPreferences.pantallaInicial || 'dashboard'} onChange={e => setSetting('uiPreferences.pantallaInicial', e.target.value)}>
                          <option value="dashboard">Dashboard</option>
                          <option value="clientes">Clientes</option>
                          <option value="operaciones">Operaciones</option>
                          <option value="cuotas">Cuotas</option>
                        </Select>
                      </Field>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>Acciones rápidas en header</div>
                        {[['cliente', '+ Cliente'], ['operacion', '+ Operación'], ['pago', '💳 Pago']].map(([key, label]) => {
                          const current = editedSettings.uiPreferences.accionesRapidas || ['cliente', 'operacion', 'pago'];
                          return (
                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                              <input type="checkbox" checked={current.includes(key)} onChange={e => {
                                const next = e.target.checked ? [...current, key] : current.filter(k => k !== key);
                                setSetting('uiPreferences.accionesRapidas', next);
                              }} />
                              {label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </SectionCard>

                </div>

                {/* Right: sticky preview */}
                {!isMobile && (
                  <div style={{ position: 'sticky', top: 16 }}>
                    <PersonalizacionPreview settings={editedSettings} />
                  </div>
                )}

              </div>
            </div>
          )}

          {/* WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, border: '1px solid #bbf7d0' }}>WA</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>WhatsApp</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Configurá las plantillas que usa el CRM para contactar clientes.</div>
                  </div>
                </div>
                <Btn variant="secondary" onClick={showTemplateComingSoon} style={{ borderColor: '#8b5cf6', color: '#4f46e5' }}>+ Nueva plantilla</Btn>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                {[
                  { mark: 'TPL', title: `${summaryCount} plantillas activas`, text: 'Recordatorios, mora, pagos y saludo general', bg: '#eef2ff', color: '#4f46e5' },
                  { mark: '{}', title: `${WA_VARIABLES.length} variables disponibles`, text: 'cliente, cliente_informal, monto, cuota, fecha, saldo', bg: '#f5f3ff', color: '#7c3aed' },
                  { mark: 'URL', title: 'Envío por enlace', text: 'Se abre WhatsApp con mensaje prearmado', bg: '#dcfce7', color: '#16a34a' },
                ].map(card => (
                  <Card key={card.title} style={{ padding: '18px 20px', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 16, background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{card.mark}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 800 }}>{card.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.35 }}>{card.text}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 0.38fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
                <Card style={{ padding: 16, border: '1px solid var(--border)', boxShadow: '0 10px 28px rgba(15,23,42,0.05)' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>Plantillas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {whatsappTemplates.map(tpl => {
                      const meta = getWhatsappTemplateMeta(tpl);
                      const active = selectedTemplate && selectedTemplate.id === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => { setSelectedTemplateId(tpl.id); setWaTestNotice(''); }}
                          style={{
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: '42px minmax(0, 1fr) auto 12px',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 12px',
                            borderRadius: 10,
                            border: active ? '1.5px solid #8b5cf6' : '1px solid var(--border)',
                            background: active ? 'linear-gradient(90deg, #f5f3ff, #fff)' : '#fff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            boxShadow: active ? '0 8px 20px rgba(79,70,229,0.08)' : 'none',
                          }}
                        >
                          <span style={{ width: 38, height: 38, borderRadius: 11, background: meta.bg, color: meta.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, fontFamily: 'DM Mono, monospace' }}>{meta.mark}</span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.title}</span>
                            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.description}</span>
                          </span>
                          <span style={{ padding: '3px 10px', borderRadius: 999, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: 11, fontWeight: 800 }}>Activa</span>
                          <span style={{ color: active ? '#4f46e5' : '#94a3b8', fontSize: 18, lineHeight: 1 }}>›</span>
                        </button>
                      );
                    })}
                  </div>
                  <Btn variant="secondary" onClick={showTemplateComingSoon} style={{ width: '100%', justifyContent: 'center', marginTop: 16, borderColor: '#8b5cf6', color: '#4f46e5' }}>+ Nueva plantilla</Btn>
                </Card>

                <Card style={{ padding: isMobile ? 16 : 24, border: '1px solid var(--border)', boxShadow: '0 10px 28px rgba(15,23,42,0.05)', minWidth: 0 }}>
                  {selectedTemplate && selectedMeta ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 22, color: 'var(--text-primary)', fontWeight: 900, lineHeight: 1.1 }}>{selectedMeta.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Se usa en: {selectedMeta.useCase}</div>
                        </div>
                        <span style={{ padding: '4px 11px', borderRadius: 999, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>Activa</span>
                      </div>

                      <Field label="Mensaje">
                        <textarea
                          ref={waTextareaRef}
                          value={selectedTemplate.texto}
                          onChange={e => updateSelectedTemplateText(e.target.value)}
                          rows={4}
                          style={{
                            width: '100%',
                            minHeight: 96,
                            padding: '11px 13px',
                            borderRadius: 9,
                            border: '1.5px solid #dbe3ef',
                            outline: 'none',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                            color: 'var(--text-primary)',
                            fontSize: 14,
                            lineHeight: 1.5,
                            fontFamily: 'DM Sans, sans-serif',
                          }}
                          onFocus={e => { e.target.style.borderColor = '#6366f1'; }}
                          onBlur={e => { e.target.style.borderColor = '#dbe3ef'; }}
                        />
                      </Field>

                      <div>
                        <div style={{ fontSize: 12, color: '#334155', fontWeight: 800, marginBottom: 8 }}>Variables disponibles</div>
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                          {WA_VARIABLES.map(variable => (
                            <button key={variable} type="button" onClick={() => insertWhatsappVariable(variable)} style={{ border: '1px solid #ddd6fe', background: '#eef2ff', color: '#4f46e5', borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 800, fontFamily: 'DM Mono, monospace', cursor: 'pointer' }}>
                              {variable}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ padding: '10px 12px', borderRadius: 9, background: unknownWaVariables.length ? '#fffbeb' : '#f0fdf4', border: `1px solid ${unknownWaVariables.length ? '#fde68a' : '#bbf7d0'}`, color: unknownWaVariables.length ? '#92400e' : '#166534', fontSize: 12, fontWeight: 700 }}>
                        {unknownWaVariables.length
                          ? `${unknownWaVariables.length === 1 ? 'Variable desconocida' : 'Variables desconocidas'}: ${unknownWaVariables.join(', ')}`
                          : 'Todas las variables son válidas.'}
                      </div>

                      <div>
                        <div style={{ fontSize: 12, color: '#334155', fontWeight: 800, marginBottom: 8 }}>Vista previa</div>
                        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: isMobile ? 14 : 18, background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', minHeight: 132, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                          <div style={{ maxWidth: 520, alignSelf: 'center', background: '#dcf8c6', border: '1px solid #bbf7d0', borderRadius: '12px 12px 3px 12px', padding: '12px 14px 18px', color: '#1f2937', fontSize: 14, lineHeight: 1.45, position: 'relative', boxShadow: '0 5px 14px rgba(15,23,42,0.08)', whiteSpace: 'pre-wrap' }}>
                            {waPreviewText || 'Escribí un mensaje para ver la vista previa.'}
                            <span style={{ position: 'absolute', right: 10, bottom: 4, fontSize: 10, color: 'var(--text-muted)' }}>15:42</span>
                          </div>
                          <Btn variant="secondary" onClick={testWhatsappOpen} style={{ borderColor: '#8b5cf6', color: '#4f46e5' }}>Probar abrir WhatsApp</Btn>
                        </div>
                      </div>

                      {waTestNotice && (
                        <div style={{ padding: '9px 12px', borderRadius: 9, background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>{waTestNotice}</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No hay plantillas disponibles.</div>
                  )}
                </Card>
              </div>

              <Card style={{ padding: '14px 16px', border: '1px solid var(--border)', background: 'var(--bg-page)' }}>
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 14, flexDirection: isMobile ? 'column' : 'row' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>i</div>
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 900 }}>Cómo usar variables</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Las variables se reemplazan automáticamente con datos reales del cliente o de la cuota.</div>
                    </div>
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => setShowVariablesHelp(v => !v)}>{showVariablesHelp ? 'Ocultar variables' : 'Ver todas las variables'}</Btn>
                </div>
                {showVariablesHelp && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                    {[
                      ['{cliente}', 'nombre completo del cliente'],
                      ['{cliente_informal}', 'solo el primer nombre del cliente'],
                      ['{monto}', 'monto relacionado al mensaje'],
                      ['{cuota}', 'número de cuota'],
                      ['{fecha}', 'fecha de vencimiento o referencia'],
                      ['{operacion}', 'operación asociada'],
                      ['{saldo}', 'saldo pendiente'],
                    ].map(([variable, desc]) => (
                      <div key={variable} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', color: '#4f46e5', fontWeight: 900 }}>{variable}</span>: {desc}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* EQUIPO Y SEGURIDAD */}
          {activeTab === 'equipo' && (
            window.EquipoSeguridadScreen
              ? React.createElement(window.EquipoSeguridadScreen, { auth })
              : <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Cargando módulo de equipo...</div>
          )}

        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { ConfiguracionScreen });
