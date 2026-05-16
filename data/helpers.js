// ============================================================
// HELPERS — Brian CRM Financiero
// ============================================================

export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateLong(dateStr) {
  if (!dateStr) return '—';
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} de ${months[parseInt(m)-1]} de ${y}`;
}

export function todayStr() {
  return '2026-05-03';
}

export function calculateOverdueDays(fechaVencimiento) {
  const today = new Date('2026-05-03');
  const due = new Date(fechaVencimiento);
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function getInstallmentStatus(installment) {
  const today = new Date('2026-05-03');
  const due = new Date(installment.fechaVencimiento);
  if (installment.saldoPendiente === 0) return 'Pagada';
  if (installment.montoPagado > 0 && installment.saldoPendiente > 0) {
    if (due < today) return 'Vencida';
    return 'Parcial';
  }
  if (due < today) return 'Vencida';
  return 'Pendiente';
}

export function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

export function generateInstallmentSchedule(operation) {
  const schedule = [];
  const baseAmount = Math.floor(operation.totalFinanciado / operation.cantidadCuotas);
  const remainder = operation.totalFinanciado - baseAmount * operation.cantidadCuotas;
  for (let i = 0; i < operation.cantidadCuotas; i++) {
    const isLast = i === operation.cantidadCuotas - 1;
    schedule.push({
      numero: i + 1,
      fecha: addMonths(operation.primerVencimiento, i),
      monto: isLast ? baseAmount + remainder : baseAmount,
    });
  }
  return schedule;
}

export function calculateOperationTotals(costoReal, montoPactado, entrega, cuotas, tasa) {
  const montoFinanciado = montoPactado - entrega;
  const interes = montoFinanciado * (tasa / 100);
  const totalFinanciado = montoFinanciado + interes;
  const valorCuota = Math.ceil(totalFinanciado / cuotas);
  const totalEsperado = entrega + totalFinanciado;
  const gananciaEsperada = totalEsperado - costoReal;
  return { montoFinanciado, interesCalculado: interes, totalFinanciado, valorCuota, totalEsperado, gananciaEsperada };
}

export function calculateClientBalance(clientId, installments, payments, operations) {
  const clientInst = installments.filter(i => i.clientId === clientId);
  const clientOps = operations.filter(o => o.clientId === clientId);
  const clientPays = payments.filter(p => p.clientId === clientId);

  const totalPactado = clientOps.reduce((s, o) => s + o.totalEsperado, 0);
  const saldoPendiente = clientInst.reduce((s, i) => s + i.saldoPendiente, 0);
  const totalPagado = clientPays.reduce((s, p) => s + p.monto, 0);
  const today = new Date('2026-05-03');
  const vencidas = clientInst.filter(i => new Date(i.fechaVencimiento) < today && i.saldoPendiente > 0);
  const montoVencido = vencidas.reduce((s, i) => s + i.saldoPendiente, 0);
  const capitalInvertido = clientOps.reduce((s, o) => s + o.costoReal, 0);
  const gananciaEsperada = clientOps.reduce((s, o) => s + o.gananciaEsperada, 0);
  const opActivas = clientOps.filter(o => o.estado === 'Activa').length;

  const nextInst = clientInst
    .filter(i => i.saldoPendiente > 0)
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))[0];

  const lastPay = clientPays.sort((a, b) => b.fechaPago.localeCompare(a.fechaPago))[0];

  return { totalPactado, saldoPendiente, totalPagado, montoVencido, capitalInvertido, gananciaEsperada, opActivas, nextInst, lastPay };
}

export function getDashboardMetrics(clients, operations, installments, payments, creditCards, creditCardMovements) {
  const today = new Date('2026-05-03');
  const thisMonth = '2026-05';

  const capitalInvertido = operations.reduce((s, o) => s + o.costoReal, 0);
  const totalEsperado = operations.reduce((s, o) => s + o.totalEsperado, 0);
  const saldoPendiente = installments.reduce((s, i) => s + i.saldoPendiente, 0);
  const vencidas = installments.filter(i => new Date(i.fechaVencimiento) < today && i.saldoPendiente > 0);
  const montoVencido = vencidas.reduce((s, i) => s + i.saldoPendiente, 0);
  const clientesEnMora = new Set(vencidas.map(i => i.clientId)).size;
  const cobradoEsteMes = payments
    .filter(p => p.fechaPago.startsWith(thisMonth))
    .reduce((s, p) => s + p.monto, 0);
  const gananciaEsperada = operations.reduce((s, o) => s + o.gananciaEsperada, 0);
  const gananciaRealizada = payments.reduce((s, p) => s + p.monto, 0) - operations.reduce((s, o) => s + o.costoReal, 0);
  const capitalEfectivo = operations.filter(o => o.fuenteFinanciacion !== 'Tarjeta de crédito').reduce((s, o) => s + o.costoReal, 0);
  const capitalTarjeta = operations.filter(o => o.fuenteFinanciacion === 'Tarjeta de crédito').reduce((s, o) => s + o.costoReal, 0);

  const proxVencimientos = installments
    .filter(i => {
      const d = new Date(i.fechaVencimiento);
      const next15 = new Date('2026-05-03');
      next15.setDate(next15.getDate() + 15);
      return d >= today && d <= next15 && i.saldoPendiente > 0;
    })
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));

  return {
    capitalInvertido, totalEsperado, saldoPendiente, montoVencido,
    clientesEnMora, cobradoEsteMes, gananciaEsperada, gananciaRealizada,
    capitalEfectivo, capitalTarjeta, proxVencimientos, vencidas,
  };
}

export function getCreditCardUsage(cardId, creditCardMovements) {
  const movs = creditCardMovements.filter(m => m.creditCardId === cardId);
  const totalUsado = movs.reduce((s, m) => s + m.monto, 0);
  return { totalUsado, movimientos: movs };
}

export function getClientRisk(clientId, installments) {
  const today = new Date('2026-05-03');
  const overdue = installments.filter(i => i.clientId === clientId && new Date(i.fechaVencimiento) < today && i.saldoPendiente > 0);
  if (overdue.length >= 3) return 'Alto';
  if (overdue.length >= 1) return 'Medio';
  return 'Bajo';
}

export function buildWhatsAppUrl(phone, template, replacements) {
  let msg = template;
  Object.entries(replacements).forEach(([key, val]) => {
    msg = msg.replace(`{${key}}`, val);
  });
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
}

export function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
