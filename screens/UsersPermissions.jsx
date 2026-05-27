// ─── Constantes compartidas ───────────────────────────────────────────────────

var ROLES_LIST = ['owner', 'admin', 'manager', 'cobrador', 'ventas', 'contador', 'solo_lectura'];
var GRANTABLE_ROLES_LIST = ROLES_LIST.filter(function(r) { return r !== 'owner'; });
var ROLE_LABELS_MAP = {
  owner: 'Propietario', admin: 'Administrador', manager: 'Gerente',
  cobrador: 'Cobrador', ventas: 'Ventas', contador: 'Contador', solo_lectura: 'Solo lectura',
};
var ROLE_COLORS_MAP = {
  owner:       { bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  admin:       { bg: '#ede9fe', color: '#5b21b6', border: '#ddd6fe' },
  manager:     { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  cobrador:    { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  ventas:      { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  contador:    { bg: '#f0fdf4', color: '#15803d', border: '#d1fae5' },
  solo_lectura:{ bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
};
var AUDIT_ACTION_LABELS = {
  operation_created: 'creó una operación',
  operation_updated: 'editó una operación',
  operation_deleted: 'eliminó una operación',
  payment_registered: 'registró un pago',
  payment_reversed: 'anuló un pago',
  client_created: 'agregó un cliente',
  client_updated: 'actualizó un cliente',
  client_deleted: 'eliminó un cliente',
  settings_updated: 'actualizó la configuración',
  import_run: 'importó datos',
  user_login: 'inició sesión',
  card_created: 'agregó una tarjeta',
  card_updated: 'actualizó una tarjeta',
  card_deleted: 'eliminó una tarjeta',
  manual_cash_movement_created: 'registró un movimiento de caja',
};

// ─── SVG icons ────────────────────────────────────────────────────────────────

function IconLock() {
  return React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: '#16a34a', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('rect', { x: 3, y: 11, width: 18, height: 11, rx: 2 }),
    React.createElement('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' })
  );
}
function IconShield() {
  return React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: '#3b82f6', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
  );
}
function IconUser() {
  return React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: '#7c3aed', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
    React.createElement('circle', { cx: 12, cy: 7, r: 4 })
  );
}
function IconSearch() {
  return React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: '#94a3b8', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('circle', { cx: 11, cy: 11, r: 8 }),
    React.createElement('line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
  );
}
function IconChevronDown() {
  return React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '6 9 12 15 18 9' })
  );
}
function IconChevronRight() {
  return React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '9 18 15 12 9 6' })
  );
}
function IconCheck() {
  return React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: '#22c55e', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '20 6 9 17 4 12' })
  );
}

// ─── MenuItem del dropdown ────────────────────────────────────────────────────

function MenuItem({ onClick, label, color, hoverBg, disabled, note }) {
  const [hover, setHover] = React.useState(false);
  if (note) {
    return React.createElement('div', { style: { padding: '7px 16px', fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic', lineHeight: 1.4 } }, note);
  }
  return React.createElement('button', {
    onClick: disabled ? undefined : onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'block', width: '100%', textAlign: 'left',
      padding: '9px 16px', border: 'none', cursor: disabled ? 'default' : 'pointer',
      fontSize: 13, fontFamily: 'DM Sans, sans-serif',
      color: disabled ? '#cbd5e1' : (color || '#374151'),
      background: hover && !disabled ? (hoverBg || '#f8fafc') : 'transparent',
      transition: 'background 0.1s',
    },
  }, label);
}

// ─── MemberRow ────────────────────────────────────────────────────────────────

function MemberRow({ m, auth, isLast, canManage, isSaving, isMenuOpen, onOpenMenu, onCloseMenu, onEditName, onEditEmail, onChangeRole, onResetPassword, onToggleStatus, onDelete }) {
  var name = m.profiles?.full_name || '(sin nombre)';
  var email = m.profiles?.email || '';
  var initial = name.charAt(0).toUpperCase();
  var roleStyle = ROLE_COLORS_MAP[m.role] || ROLE_COLORS_MAP.solo_lectura;
  var isCurrentUser = m.user_id === auth?.user?.id;
  var isOwner = m.role === 'owner';
  var isActive = m.status === 'active';

  return React.createElement('div', {
    style: {
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px',
      borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)', opacity: isActive ? 1 : 0.6,
    },
  },
    // Avatar
    React.createElement('div', {
      style: {
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, color: isActive ? '#fff' : '#94a3b8',
      },
    }, initial),

    // Info
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' } },
        React.createElement('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' } }, name),
        isCurrentUser && React.createElement('span', {
          style: { fontSize: 11, color: '#6366f1', fontWeight: 600, background: '#eef2ff', padding: '1px 8px', borderRadius: 10 },
        }, 'Vos')
      ),
      React.createElement('div', { style: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'DM Mono, monospace' } },
        email || React.createElement('span', { style: { color: '#cbd5e1', fontFamily: 'DM Sans, sans-serif' } }, 'Sin email registrado')
      ),
      React.createElement('div', { style: { fontSize: 11, color: 'var(--text-faint)', marginTop: 2 } },
        'Último acceso: ' + (m.last_seen_at ? new Date(m.last_seen_at).toLocaleDateString('es-AR') : '—')
      )
    ),

    // Role badge
    React.createElement('span', {
      style: {
        fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
        background: roleStyle.bg, color: roleStyle.color, border: '1px solid ' + roleStyle.border,
        flexShrink: 0, whiteSpace: 'nowrap',
      },
    }, ROLE_LABELS_MAP[m.role] || m.role),

    // Status
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 } },
      React.createElement('span', { style: { width: 8, height: 8, borderRadius: '50%', background: isActive ? '#22c55e' : '#e2e8f0', display: 'inline-block' } }),
      React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: isActive ? '#166534' : '#94a3b8' } },
        isActive ? 'Activo' : 'Inactivo'
      )
    ),

    // Action
    React.createElement('div', { style: { position: 'relative', flexShrink: 0 } },
      isCurrentUser
        ? React.createElement('button', {
            style: {
              padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'default',
              fontFamily: 'DM Sans, sans-serif',
            },
          }, 'Ver permisos')
        : canManage && React.createElement(React.Fragment, null,
            React.createElement('button', {
              onClick: isMenuOpen ? onCloseMenu : onOpenMenu,
              disabled: isSaving,
              style: {
                padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: isMenuOpen ? '#f1f5f9' : '#fff', color: 'var(--text-secondary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: isSaving ? 0.5 : 1,
              },
            },
              isSaving ? 'Guardando...' : 'Gestionar',
              React.createElement(IconChevronDown)
            ),
            isMenuOpen && React.createElement('div', {
              style: {
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 100,
                minWidth: 210, overflow: 'hidden',
              },
            },
              React.createElement('div', { style: { padding: '6px 0' } },
                React.createElement(MenuItem, { onClick: onEditName, label: 'Editar nombre' }),
                React.createElement(MenuItem, { onClick: onEditEmail, label: 'Cambiar email' }),
                isOwner
                  ? React.createElement(MenuItem, { note: 'No se puede cambiar el rol del propietario.' })
                  : React.createElement(MenuItem, { onClick: onChangeRole, label: 'Cambiar rol' }),
                React.createElement(MenuItem, { onClick: onResetPassword, label: 'Restablecer contraseña' }),
                React.createElement('div', { style: { height: 1, background: 'var(--bg-subtle)', margin: '4px 0' } }),
                isOwner
                  ? React.createElement(MenuItem, { note: 'No se puede desactivar al propietario.' })
                  : React.createElement(MenuItem, {
                      onClick: onToggleStatus,
                      label: isActive ? 'Desactivar acceso' : 'Activar acceso',
                      color: isActive ? '#d97706' : '#16a34a',
                      hoverBg: isActive ? '#fffbeb' : '#f0fdf4',
                    }),
                React.createElement('div', { style: { height: 1, background: 'var(--bg-subtle)', margin: '4px 0' } }),
                isOwner
                  ? React.createElement(MenuItem, { note: 'No se puede eliminar al propietario.' })
                  : React.createElement(MenuItem, {
                      onClick: onDelete,
                      label: 'Eliminar usuario',
                      color: '#dc2626',
                      hoverBg: '#fef2f2',
                    })
              )
            )
          )
    )
  );
}

// ─── Roles matrix card ────────────────────────────────────────────────────────

function RolesMatrixCard() {
  var matrixRoles = [
    { key: 'owner', label: 'Propietario' },
    { key: 'admin', label: 'Administrador' },
    { key: 'cobrador', label: 'Cobrador' },
    { key: 'solo_lectura', label: 'Solo lectura' },
  ];
  var matrixCols = ['Clientes', 'Operaciones', 'Pagos', 'Reportes', 'Config'];
  var matrixData = {
    owner:        [true, true, true, true, true],
    admin:        [true, true, true, true, false],
    cobrador:     [true, false, true, false, false],
    solo_lectura: [true, true, true, true, false],
  };

  return React.createElement('div', {
    style: { background: 'var(--bg-surface)', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px' },
  },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 } },
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' } }, 'Roles y permisos'),
        React.createElement('div', { style: { fontSize: 12, color: 'var(--text-faint)', marginTop: 3 } }, 'Resumen de accesos por rol.')
      ),
      React.createElement('button', {
        style: { fontSize: 12, color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 3 },
      }, 'Ver todos', React.createElement(IconChevronRight))
    ),
    React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
      React.createElement('thead', null,
        React.createElement('tr', null,
          React.createElement('th', { style: { textAlign: 'left', padding: '5px 0', color: 'var(--text-faint)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' } }, 'Rol'),
          matrixCols.map(function(col) {
            return React.createElement('th', { key: col, style: { textAlign: 'center', padding: '5px 4px', color: 'var(--text-faint)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' } }, col);
          })
        )
      ),
      React.createElement('tbody', null,
        matrixRoles.map(function(r) {
          return React.createElement('tr', { key: r.key, style: { borderTop: '1px solid var(--border-subtle)' } },
            React.createElement('td', { style: { padding: '9px 0', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12 } }, r.label),
            matrixData[r.key].map(function(has, i) {
              return React.createElement('td', { key: i, style: { textAlign: 'center', padding: '9px 4px' } },
                has
                  ? React.createElement(IconCheck)
                  : React.createElement('span', { style: { color: '#e2e8f0', fontWeight: 700 } }, '—')
              );
            })
          );
        })
      )
    )
  );
}

// ─── Activity card ────────────────────────────────────────────────────────────

function ActivityCard({ activity, memberNameMap }) {
  function formatRelTime(dateStr) {
    var d = new Date(dateStr);
    var now = new Date();
    var diffDays = Math.floor((now - d) / 86400000);
    var timeStr = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 0) return 'Hoy, ' + timeStr;
    if (diffDays === 1) return 'Ayer, ' + timeStr;
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  }

  return React.createElement('div', {
    style: { background: 'var(--bg-surface)', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px' },
  },
    React.createElement('div', { style: { marginBottom: 16 } },
      React.createElement('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' } }, 'Actividad reciente'),
      React.createElement('div', { style: { fontSize: 12, color: 'var(--text-faint)', marginTop: 3 } }, 'Últimas acciones en la organización.')
    ),
    activity.length === 0
      ? React.createElement('div', { style: { textAlign: 'center', padding: '20px 0', color: '#cbd5e1', fontSize: 13 } }, 'Sin actividad reciente disponible.')
      : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 13 } },
          activity.map(function(item) {
            var actorName = memberNameMap[item.actor_user_id] || 'Un usuario';
            var actionLabel = AUDIT_ACTION_LABELS[item.action] || item.action;
            return React.createElement('div', { key: item.id, style: { display: 'flex', gap: 10, alignItems: 'flex-start' } },
              React.createElement('span', { style: { width: 7, height: 7, borderRadius: '50%', background: '#6366f1', marginTop: 5, flexShrink: 0, display: 'inline-block' } }),
              React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 } },
                  React.createElement('strong', null, actorName), ' ', actionLabel
                ),
                React.createElement('div', { style: { fontSize: 11, color: 'var(--text-faint)', marginTop: 2 } }, formatRelTime(item.created_at))
              )
            );
          })
        )
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function EditNameModal({ member, isSaving, onSave, onClose }) {
  var [name, setName] = React.useState(member.profiles?.full_name || '');
  var modalStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  var boxStyle = { background: 'var(--bg-surface)', borderRadius: 14, padding: '28px 28px 24px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
  return React.createElement('div', { style: modalStyle, onClick: function(e) { if (e.target === e.currentTarget) onClose(); } },
    React.createElement('div', { style: boxStyle },
      React.createElement('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 } }, 'Editar nombre'),
      React.createElement('div', { style: { fontSize: 12, color: 'var(--text-faint)', marginBottom: 18 } },
        'Cuenta: ', React.createElement('strong', { style: { color: 'var(--text-secondary)' } }, member.profiles?.email || '—')
      ),
      React.createElement('input', {
        autoFocus: true, value: name,
        onChange: function(e) { setName(e.target.value); },
        onKeyDown: function(e) { if (e.key === 'Enter') onSave(name); if (e.key === 'Escape') onClose(); },
        placeholder: 'Nombre completo',
        style: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: 16 },
      }),
      React.createElement('div', { style: { display: 'flex', gap: 8 } },
        React.createElement('button', { onClick: function() { onSave(name); }, disabled: isSaving, style: { flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' } },
          isSaving ? 'Guardando...' : 'Guardar'
        ),
        React.createElement('button', { onClick: onClose, style: { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' } }, 'Cancelar')
      )
    )
  );
}

function EditEmailModal({ member, orgId, isSaving, onSave, onClose }) {
  var [email, setEmail] = React.useState(member.profiles?.email || '');
  var [error, setError] = React.useState(null);
  var modalStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  var boxStyle = { background: 'var(--bg-surface)', borderRadius: 14, padding: '28px 28px 24px', width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
  var name = member.profiles?.full_name || member.profiles?.email || '(sin nombre)';

  function submit() {
    var next = email.trim().toLowerCase();
    if (!next || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      setError('Ingresá un email válido.');
      return;
    }
    setError(null);
    onSave(member, next, orgId);
  }

  return React.createElement('div', { style: modalStyle, onClick: function(e) { if (e.target === e.currentTarget) onClose(); } },
    React.createElement('div', { style: boxStyle },
      React.createElement('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 } }, 'Cambiar email'),
      React.createElement('div', { style: { fontSize: 12, color: 'var(--text-faint)', marginBottom: 18 } },
        'Usuario: ', React.createElement('strong', { style: { color: 'var(--text-secondary)' } }, name)
      ),
      React.createElement('input', {
        autoFocus: true, type: 'email', value: email,
        onChange: function(e) { setEmail(e.target.value); },
        onKeyDown: function(e) { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); },
        placeholder: 'usuario@email.com',
        style: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: 10 },
      }),
      React.createElement('div', { style: { fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.45, marginBottom: 14 } },
        'Esto cambia el email de ingreso en Supabase Auth y lo sincroniza con el perfil visible en miembros.'
      ),
      error && React.createElement('div', { style: { marginBottom: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' } }, error),
      React.createElement('div', { style: { display: 'flex', gap: 8 } },
        React.createElement('button', { onClick: submit, disabled: isSaving, style: { flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: isSaving ? '#a5b4fc' : '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer' } },
          isSaving ? 'Guardando...' : 'Guardar email'
        ),
        React.createElement('button', { onClick: onClose, style: { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' } }, 'Cancelar')
      )
    )
  );
}

function ChangeRoleModal({ member, isSaving, onSave, onClose }) {
  var [role, setRole] = React.useState(member.role);
  var name = member.profiles?.full_name || member.profiles?.email || '(sin nombre)';
  var isOwner = member.role === 'owner';
  var modalStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  var boxStyle = { background: 'var(--bg-surface)', borderRadius: 14, padding: '28px 28px 24px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
  return React.createElement('div', { style: modalStyle, onClick: function(e) { if (e.target === e.currentTarget) onClose(); } },
    React.createElement('div', { style: boxStyle },
      React.createElement('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 } }, 'Cambiar rol'),
      React.createElement('div', { style: { fontSize: 12, color: 'var(--text-faint)', marginBottom: 18 } },
        'Usuario: ', React.createElement('strong', { style: { color: 'var(--text-secondary)' } }, name)
      ),
      isOwner
        ? React.createElement('div', { style: { padding: '10px 12px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', color: '#854d0e', fontSize: 12, lineHeight: 1.45, marginBottom: 16 } },
            'El propietario está protegido. No se puede cambiar su rol desde administración.'
          )
        : React.createElement('select', {
            value: role === 'owner' ? 'admin' : role,
            onChange: function(e) { setRole(e.target.value); },
            style: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: 16 },
          },
            GRANTABLE_ROLES_LIST.map(function(r) { return React.createElement('option', { key: r, value: r }, ROLE_LABELS_MAP[r]); })
          ),
      React.createElement('div', { style: { display: 'flex', gap: 8 } },
        React.createElement('button', { onClick: function() { if (!isOwner) onSave(role); }, disabled: isSaving || isOwner, style: { flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: isOwner ? '#cbd5e1' : '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: isOwner ? 'not-allowed' : 'pointer' } },
          isSaving ? 'Guardando...' : 'Guardar'
        ),
        React.createElement('button', { onClick: onClose, style: { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' } }, 'Cancelar')
      )
    )
  );
}

function ConfirmDeleteModal({ member, isSaving, onConfirm, onClose }) {
  var name = member.profiles?.full_name || member.profiles?.email || '(sin nombre)';
  var modalStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  var boxStyle = { background: 'var(--bg-surface)', borderRadius: 14, padding: '28px 28px 24px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
  return React.createElement('div', { style: modalStyle, onClick: function(e) { if (e.target === e.currentTarget) onClose(); } },
    React.createElement('div', { style: boxStyle },
      React.createElement('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 } }, '¿Eliminar usuario?'),
      React.createElement('div', { style: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 } },
        'Vas a eliminar a ', React.createElement('strong', null, name), ' de la organización. Su cuenta no se borra — solo pierde acceso.'
      ),
      React.createElement('div', { style: { display: 'flex', gap: 8 } },
        React.createElement('button', { onClick: onConfirm, disabled: isSaving, style: { flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' } },
          isSaving ? 'Eliminando...' : 'Sí, eliminar'
        ),
        React.createElement('button', { onClick: onClose, style: { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' } }, 'Cancelar')
      )
    )
  );
}

// ─── CreateUserPanel ──────────────────────────────────────────────────────────

function CreateUserPanel({ orgId, onClose, onDone }) {
  var sb = window.__supabase;
  var [form, setForm] = React.useState({ full_name: '', email: '', password: '', role: 'solo_lectura' });
  var [loading, setLoading] = React.useState(false);
  var [error, setError] = React.useState(null);
  var [showPass, setShowPass] = React.useState(false);

  function set(k, v) { setForm(function(prev) { var n = Object.assign({}, prev); n[k] = v; return n; }); }

  async function handleCreate() {
    if (!form.email.trim()) { setError('El email es requerido.'); return; }
    if (!form.password) { setError('La contraseña es requerida.'); return; }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true); setError(null);
    try {
      var result = await sb.functions.invoke('create-user', {
        body: { email: form.email.trim(), password: form.password, full_name: form.full_name.trim(), role: form.role, org_id: orgId },
      });
      if (result.error) throw result.error;
      if (result.data?.error) throw new Error(result.data.error);
      onDone(); onClose();
    } catch (e) {
      setError(e.message || 'Error al crear el usuario.');
    } finally {
      setLoading(false);
    }
  }

  var inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' };
  var lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' };

  return React.createElement('div', {
    style: { marginBottom: 20, padding: '20px 22px', background: 'var(--bg-page)', border: '1.5px solid #6366f1', borderRadius: 12 },
  },
    React.createElement('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 } }, 'Crear nuevo usuario'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 } },
      React.createElement('div', null,
        React.createElement('label', { style: lbl }, 'Nombre completo'),
        React.createElement('input', { value: form.full_name, onChange: function(e) { set('full_name', e.target.value); }, placeholder: 'Ej: Juan Pérez', style: inp })
      ),
      React.createElement('div', null,
        React.createElement('label', { style: lbl }, 'Rol'),
        React.createElement('select', { value: form.role, onChange: function(e) { set('role', e.target.value); }, style: inp },
          GRANTABLE_ROLES_LIST.map(function(r) { return React.createElement('option', { key: r, value: r }, ROLE_LABELS_MAP[r]); })
        )
      ),
      React.createElement('div', null,
        React.createElement('label', { style: lbl }, 'Email'),
        React.createElement('input', { type: 'email', value: form.email, onChange: function(e) { set('email', e.target.value); }, placeholder: 'usuario@email.com', style: inp })
      ),
      React.createElement('div', null,
        React.createElement('label', { style: lbl }, 'Contraseña'),
        React.createElement('div', { style: { position: 'relative' } },
          React.createElement('input', { type: showPass ? 'text' : 'password', value: form.password, onChange: function(e) { set('password', e.target.value); }, placeholder: 'Mínimo 6 caracteres', style: Object.assign({}, inp, { paddingRight: 40 }) }),
          React.createElement('button', { type: 'button', onClick: function() { setShowPass(function(v) { return !v; }); }, style: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-faint)' } },
            showPass ? '🙈' : '👁️'
          )
        )
      )
    ),
    error && React.createElement('div', { style: { marginBottom: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' } }, error),
    React.createElement('div', { style: { display: 'flex', gap: 8 } },
      React.createElement('button', { onClick: handleCreate, disabled: loading, style: { padding: '8px 20px', borderRadius: 8, border: 'none', background: loading ? '#a5b4fc' : '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' } },
        loading ? 'Creando...' : 'Crear usuario'
      ),
      React.createElement('button', { onClick: onClose, style: { padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' } }, 'Cancelar')
    ),
    React.createElement('div', { style: { marginTop: 12, fontSize: 11, color: 'var(--text-faint)' } },
      'El usuario puede ingresar de inmediato. No se envía email de invitación.'
    )
  );
}

// ─── ResetPasswordModal ───────────────────────────────────────────────────────

function ResetPasswordModal({ member, orgId, onClose }) {
  var sb = window.__supabase;
  var [password, setPassword] = React.useState('');
  var [showPass, setShowPass] = React.useState(false);
  var [loading, setLoading] = React.useState(false);
  var [error, setError] = React.useState(null);
  var [success, setSuccess] = React.useState(false);
  var name = member.profiles?.full_name || member.profiles?.email || '(sin nombre)';

  async function handleReset() {
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true); setError(null);
    try {
      var result = await sb.functions.invoke('reset-user-password', {
        body: { user_id: member.user_id, new_password: password, org_id: orgId },
      });
      if (result.error) throw result.error;
      if (result.data?.error) throw new Error(result.data.error);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e.message || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  var modalStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  var boxStyle = { background: 'var(--bg-surface)', borderRadius: 14, padding: '28px 28px 24px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };

  return React.createElement('div', { style: modalStyle, onClick: function(e) { if (e.target === e.currentTarget) onClose(); } },
    React.createElement('div', { style: boxStyle },
      React.createElement('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 } }, 'Restablecer contraseña'),
      React.createElement('div', { style: { fontSize: 12, color: 'var(--text-faint)', marginBottom: 20 } },
        'Usuario: ', React.createElement('strong', { style: { color: 'var(--text-secondary)' } }, name)
      ),
      success
        ? React.createElement('div', { style: { padding: '12px 16px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, color: '#166534', fontSize: 13, fontWeight: 600, textAlign: 'center' } }, 'Contraseña actualizada correctamente')
        : React.createElement(React.Fragment, null,
            React.createElement('div', { style: { position: 'relative', marginBottom: 14 } },
              React.createElement('input', {
                autoFocus: true, type: showPass ? 'text' : 'password', value: password,
                onChange: function(e) { setPassword(e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter') handleReset(); },
                placeholder: 'Nueva contraseña (mínimo 6 caracteres)',
                style: { width: '100%', padding: '10px 40px 10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' },
              }),
              React.createElement('button', { type: 'button', onClick: function() { setShowPass(function(v) { return !v; }); }, style: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-faint)' } },
                showPass ? '🙈' : '👁️'
              )
            ),
            error && React.createElement('div', { style: { marginBottom: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' } }, error),
            React.createElement('div', { style: { display: 'flex', gap: 8 } },
              React.createElement('button', { onClick: handleReset, disabled: loading, style: { flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: loading ? '#a5b4fc' : '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' } },
                loading ? 'Guardando...' : 'Guardar contraseña'
              ),
              React.createElement('button', { onClick: onClose, style: { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' } }, 'Cancelar')
            )
          )
    )
  );
}

// ─── EquipoSeguridadScreen (main) ─────────────────────────────────────────────

function EquipoSeguridadScreen({ auth }) {
  var hp = window.hasPermission || function() { return true; };
  var sb = window.__supabase;
  var orgId = auth?.currentOrganization?.id;

  var [members, setMembers] = React.useState([]);
  var [loading, setLoading] = React.useState(true);
  var [error, setError] = React.useState(null);
  var [saving, setSaving] = React.useState(null);
  var [activity, setActivity] = React.useState([]);
  var [search, setSearch] = React.useState('');
  var [showCreate, setShowCreate] = React.useState(false);
  var [openMenuId, setOpenMenuId] = React.useState(null);
  var [editNameFor, setEditNameFor] = React.useState(null);
  var [editEmailFor, setEditEmailFor] = React.useState(null);
  var [changeRoleFor, setChangeRoleFor] = React.useState(null);
  var [resetPasswordFor, setResetPasswordFor] = React.useState(null);
  var [confirmDelete, setConfirmDelete] = React.useState(null);

  async function loadAll() {
    if (!orgId) return;
    setLoading(true); setError(null);
    try {
      var { data: membersData, error: err } = await sb
        .from('organization_members').select('*')
        .eq('organization_id', orgId).order('joined_at', { ascending: false });
      if (err) throw err;
      var mList = membersData || [];
      if (mList.length > 0) {
        var userIds = mList.map(function(m) { return m.user_id; });
        var { data: profilesData } = await sb.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds);
        var pm = {};
        (profilesData || []).forEach(function(p) { pm[p.id] = p; });
        setMembers(mList.map(function(m) { return Object.assign({}, m, { profiles: pm[m.user_id] || null }); }));
      } else {
        setMembers([]);
      }
      var { data: actData } = await sb.from('audit_log').select('*')
        .eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5);
      setActivity(actData || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(function() { loadAll(); }, [orgId]);

  async function changeRole(member, newRole) {
    if (!hp('users.edit_permissions')) { alert('Sin permiso para cambiar roles.'); return; }
    if (!member || member.role === 'owner') { alert('No se puede cambiar el rol del propietario.'); setChangeRoleFor(null); return; }
    if (newRole === 'owner') { alert('No se puede asignar el rol propietario desde esta pantalla.'); return; }
    setSaving(member.id);
    var { error: err } = await sb.from('organization_members')
      .update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', member.id);
    setSaving(null);
    if (err) { alert('Error: ' + err.message); return; }
    setMembers(function(prev) { return prev.map(function(m) { return m.id === member.id ? Object.assign({}, m, { role: newRole }) : m; }); });
    setChangeRoleFor(null);
  }

  async function toggleStatus(member) {
    if (!hp('users.disable')) { alert('Sin permiso para activar/desactivar usuarios.'); return; }
    if (member.role === 'owner') { alert('No se puede desactivar al propietario.'); return; }
    var newStatus = member.status === 'active' ? 'inactive' : 'active';
    setSaving(member.id);
    var { error: err } = await sb.from('organization_members')
      .update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', member.id);
    setSaving(null);
    if (err) { alert('Error: ' + err.message); return; }
    setMembers(function(prev) { return prev.map(function(m) { return m.id === member.id ? Object.assign({}, m, { status: newStatus }) : m; }); });
  }

  async function deleteMember(member) {
    if (!hp('users.edit_permissions')) { alert('Sin permiso para eliminar miembros.'); return; }
    if (member.role === 'owner') { alert('No se puede eliminar al propietario.'); setConfirmDelete(null); return; }
    setSaving(member.id);
    var { error: err } = await sb.from('organization_members').delete().eq('id', member.id);
    setSaving(null);
    if (err) { alert('Error: ' + err.message); return; }
    setMembers(function(prev) { return prev.filter(function(m) { return m.id !== member.id; }); });
    setConfirmDelete(null);
  }

  async function saveName(member, newName) {
    if (!newName.trim()) { setEditNameFor(null); return; }
    setSaving(member.id);
    var { error: err } = await sb.from('profiles')
      .update({ full_name: newName.trim(), updated_at: new Date().toISOString() }).eq('id', member.user_id);
    setSaving(null);
    if (err) { alert('Error: ' + err.message); setEditNameFor(null); return; }
    setMembers(function(prev) { return prev.map(function(m) { return m.id === member.id ? Object.assign({}, m, { profiles: Object.assign({}, m.profiles, { full_name: newName.trim() }) }) : m; }); });
    setEditNameFor(null);
  }

  async function saveEmail(member, newEmail) {
    if (!newEmail.trim()) { setEditEmailFor(null); return; }
    setSaving(member.id);
    try {
      var result = await sb.functions.invoke('update-user-email', {
        body: { user_id: member.user_id, email: newEmail.trim().toLowerCase(), org_id: orgId },
      });
      if (result.error) {
        var msg = result.error.message || 'No se pudo cambiar el email.';
        try {
          if (result.error.context && typeof result.error.context.clone === 'function') {
            var cloned = result.error.context.clone();
            var body = await cloned.json();
            msg = body?.error || body?.message || msg;
          }
        } catch (_) {
          try {
            if (result.error.context && typeof result.error.context.clone === 'function') {
              var text = await result.error.context.clone().text();
              if (text) msg = text;
            }
          } catch (_) {}
        }
        throw new Error(msg);
      }
      if (result.data?.error) throw new Error(result.data.error);
      setMembers(function(prev) {
        return prev.map(function(m) {
          return m.id === member.id
            ? Object.assign({}, m, { profiles: Object.assign({}, m.profiles || {}, { id: member.user_id, email: newEmail.trim().toLowerCase() }) })
            : m;
        });
      });
      setEditEmailFor(null);
    } catch (e) {
      alert('Error: ' + (e.message || 'No se pudo cambiar el email.'));
    } finally {
      setSaving(null);
    }
  }

  var canInvite = hp('users.invite');
  var canManage = hp('users.edit_permissions');

  var filteredMembers = members.filter(function(m) {
    var q = search.toLowerCase();
    if (!q) return true;
    return (m.profiles?.full_name || '').toLowerCase().includes(q)
        || (m.profiles?.email || '').toLowerCase().includes(q);
  });

  var memberNameMap = {};
  members.forEach(function(m) { memberNameMap[m.user_id] = m.profiles?.full_name || m.profiles?.email || 'Un usuario'; });

  var cardIconBox = function(bg, icon) {
    return React.createElement('div', { style: { width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } }, icon);
  };

  return React.createElement('div', null,

    // Header
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 } },
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' } }, 'Equipo y seguridad'),
        React.createElement('div', { style: { fontSize: 13, color: 'var(--text-muted)', marginTop: 4, maxWidth: 520 } },
          'Gestioná quién puede entrar al CRM, qué permisos tiene cada usuario y el estado de protección del sistema.'
        )
      ),
      canInvite && React.createElement('button', {
        onClick: function() { setShowCreate(function(v) { return !v; }); },
        style: {
          padding: '9px 18px', borderRadius: 8, border: '1.5px solid #6366f1',
          background: showCreate ? '#6366f1' : '#fff', color: showCreate ? '#fff' : '#4f46e5',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
        },
      }, showCreate ? '✕ Cancelar' : '+ Invitar usuario')
    ),

    // Create panel
    showCreate && React.createElement(CreateUserPanel, { orgId: orgId, onClose: function() { setShowCreate(false); }, onDone: loadAll }),

    // Security cards
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 } },

      // Auth
      React.createElement('div', { style: { background: 'var(--bg-surface)', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' } },
        cardIconBox('#f0fdf4', React.createElement(IconLock)),
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 } }, 'Autenticación'),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
            React.createElement('span', { style: { width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' } }),
            React.createElement('span', { style: { fontSize: 13, fontWeight: 700, color: '#16a34a' } }, 'Supabase Auth activo')
          ),
          React.createElement('div', { style: { fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.4 } }, 'Inicio de sesión protegido con email y contraseña.')
        )
      ),

      // RLS
      React.createElement('div', { style: { background: 'var(--bg-surface)', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' } },
        cardIconBox('#eff6ff', React.createElement(IconShield)),
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 } }, 'Base de datos'),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
            React.createElement('span', { style: { width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' } }),
            React.createElement('span', { style: { fontSize: 13, fontWeight: 700, color: '#16a34a' } }, 'RLS activo')
          ),
          React.createElement('div', { style: { fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.4 } }, 'Los datos se filtran según organización y permisos.')
        )
      ),

      // Session
      React.createElement('div', { style: { background: 'var(--bg-surface)', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' } },
        cardIconBox('#f5f3ff', React.createElement(IconUser)),
        React.createElement('div', { style: { minWidth: 0 } },
          React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 } }, 'Sesión actual'),
          React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 } },
            auth?.profile?.full_name || auth?.user?.email || '—'
          ),
          React.createElement('div', { style: { fontSize: 12, color: 'var(--text-muted)' } },
            (ROLE_LABELS_MAP[auth?.membership?.role] || '—'),
            auth?.user?.email && auth?.profile?.full_name ? (' · ' + auth.user.email) : ''
          )
        )
      )
    ),

    // Members section
    React.createElement('div', { style: { background: 'var(--bg-surface)', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 20 } },

      // Members header
      React.createElement('div', { style: { padding: '18px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' } }, 'Miembros'),
          React.createElement('div', { style: { fontSize: 12, color: 'var(--text-faint)', marginTop: 2 } },
            loading ? 'Cargando...' : (members.length + ' miembro' + (members.length !== 1 ? 's' : '') + ' en ' + (auth?.currentOrganization?.name || '—'))
          )
        ),
        React.createElement('div', { style: { position: 'relative' } },
          React.createElement('div', { style: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' } }, React.createElement(IconSearch)),
          React.createElement('input', {
            value: search,
            onChange: function(e) { setSearch(e.target.value); },
            placeholder: 'Buscar usuario...',
            style: { paddingLeft: 32, paddingRight: 14, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', width: 220, outline: 'none', boxSizing: 'border-box' },
          })
        )
      ),

      error && React.createElement('div', { style: { margin: '12px 24px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 } },
        'Error al cargar: ' + error
      ),

      loading
        ? React.createElement('div', { style: { padding: 32, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 } }, 'Cargando miembros...')
        : filteredMembers.length === 0
          ? React.createElement('div', { style: { padding: 32, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 } },
              search ? 'No se encontraron usuarios.' : 'No hay miembros en esta organización.'
            )
          : filteredMembers.map(function(m, idx) {
              return React.createElement(MemberRow, {
                key: m.id, m: m, auth: auth,
                isLast: idx === filteredMembers.length - 1,
                canManage: canManage,
                isSaving: saving === m.id,
                isMenuOpen: openMenuId === m.id,
                onOpenMenu: function() { setOpenMenuId(m.id); },
                onCloseMenu: function() { setOpenMenuId(null); },
                onEditName: function() { setOpenMenuId(null); setEditNameFor(m); },
                onEditEmail: function() { setOpenMenuId(null); setEditEmailFor(m); },
                onChangeRole: function() { setOpenMenuId(null); setChangeRoleFor(m); },
                onResetPassword: function() { setOpenMenuId(null); setResetPasswordFor(m); },
                onToggleStatus: function() { setOpenMenuId(null); toggleStatus(m); },
                onDelete: function() { setOpenMenuId(null); setConfirmDelete(m); },
              });
            })
    ),

    // Bottom row
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
      React.createElement(RolesMatrixCard),
      React.createElement(ActivityCard, { activity: activity, memberNameMap: memberNameMap })
    ),

    // Overlay to close menus
    openMenuId && React.createElement('div', {
      style: { position: 'fixed', inset: 0, zIndex: 99 },
      onClick: function() { setOpenMenuId(null); },
    }),

    // Modals
    editNameFor && React.createElement(EditNameModal, {
      member: editNameFor, isSaving: saving === editNameFor.id,
      onSave: function(n) { saveName(editNameFor, n); },
      onClose: function() { setEditNameFor(null); },
    }),
    editEmailFor && React.createElement(EditEmailModal, {
      member: editEmailFor, orgId: orgId, isSaving: saving === editEmailFor.id,
      onSave: function(member, email) { saveEmail(member, email); },
      onClose: function() { setEditEmailFor(null); },
    }),
    changeRoleFor && React.createElement(ChangeRoleModal, {
      member: changeRoleFor, isSaving: saving === changeRoleFor.id,
      onSave: function(r) { changeRole(changeRoleFor, r); },
      onClose: function() { setChangeRoleFor(null); },
    }),
    resetPasswordFor && React.createElement(ResetPasswordModal, {
      member: resetPasswordFor, orgId: orgId,
      onClose: function() { setResetPasswordFor(null); },
    }),
    confirmDelete && React.createElement(ConfirmDeleteModal, {
      member: confirmDelete, isSaving: saving === confirmDelete.id,
      onConfirm: function() { deleteMember(confirmDelete); },
      onClose: function() { setConfirmDelete(null); },
    })
  );
}

Object.assign(window, { EquipoSeguridadScreen: EquipoSeguridadScreen, UsersPermissionsScreen: EquipoSeguridadScreen, CreateUserPanel: CreateUserPanel, ResetPasswordModal: ResetPasswordModal });
