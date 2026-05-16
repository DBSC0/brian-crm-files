// StatusBadge component
const statusConfig = {
  // Client states
  'Activo': { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  'Moroso': { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
  'Bloqueado': { bg: '#e5e7eb', color: '#374151', border: '#d1d5db' },
  'Inactivo': { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
  // Installment / operation states
  'Pendiente': { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  'Parcial': { bg: '#fef9c3', color: '#854d0e', border: '#fef08a' },
  'Pagada': { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  'Vencida': { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
  'Refinanciada': { bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' },
  'Anulada': { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' },
  'Completada': { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  'Activa': { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  // Risk
  'Bajo': { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  'Medio': { bg: '#fef9c3', color: '#854d0e', border: '#fef08a' },
  'Alto': { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
  // Card states
  'Suspendida': { bg: '#fef9c3', color: '#854d0e', border: '#fef08a' },
  'Cancelada': { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb' },
  // Receipt
  'Emitido': { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
};

function StatusBadge({ status, size = 'sm' }) {
  const cfg = statusConfig[status] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
  const pad = size === 'sm' ? '2px 8px' : '4px 12px';
  const fs = size === 'sm' ? '11px' : '13px';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: pad,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: '20px', fontSize: fs, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

Object.assign(window, { StatusBadge, statusConfig });
