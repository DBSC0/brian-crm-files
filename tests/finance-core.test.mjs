import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const sandbox = {
  console,
  Intl,
  Date,
  Math,
  Number,
  String,
  Object,
  Array,
  Set,
  RegExp,
  JSON,
  localStorage: {
    getItem() { return null; },
    setItem() {},
  },
  fetch: async () => ({ ok: false, status: 500 }),
  CRM_PRIVACY_HIDE_NUMBERS: false,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'core', 'finance.js'), 'utf8'), sandbox, {
  filename: 'core/finance.js',
});

const F = sandbox.CRMFinance;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

function eq(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'expected equality'}: expected ${expected}, got ${actual}`);
  }
}

function near(actual, expected, epsilon, message) {
  if (Math.abs(actual - expected) > (epsilon || 0.0001)) {
    throw new Error(`${message || 'expected near'}: expected ${expected}, got ${actual}`);
  }
}

test('calcula operacion base con redondeo de cuota', () => {
  const totals = F.calculateOperationTotals(100000, 145480, 0, 6, 0);
  eq(totals.montoFinanciado, 145480);
  eq(totals.valorCuota, 24247);
  eq(totals.totalEsperado, 145480);
});

test('calcula interes por tasa en ARS', () => {
  const totals = F.calculateOperationTotals(100000, 120000, 0, 3, 10);
  eq(totals.interesCalculado, 12000);
  eq(totals.totalFinanciado, 132000);
  eq(totals.valorCuota, 44000);
});

test('convierte USD a base ARS con cotizacion congelada', () => {
  eq(F.toBaseAmount(100, 'USD', 1425), 142500);
  eq(F.convertMoney(142500, 'ARS', 'USD', 1425), 100);
});

test('normaliza tasas antiguas sin moneda como ARS', () => {
  const plan = F.normalizeRatePlan({ cuotas: '6', tasa: '45.48', activa: true });
  eq(plan.moneda, 'ARS');
  eq(plan.cuotas, 6);
  eq(plan.tasa, 45.48);
});

test('busca tasa activa por moneda y cuotas', () => {
  const settings = {
    tasasPorCuotas: [
      { cuotas: 6, tasa: 45.48, moneda: 'ARS', activa: true, desde: '2026-01-01' },
      { cuotas: 6, tasa: 20, moneda: 'USD', activa: true, desde: '2026-01-01' },
    ],
  };
  eq(F.findActiveRate(settings, 'USD', 6, '2026-05-25').tasa, 20);
  eq(F.findActiveRate(settings, 'ARS', 6, '2026-05-25').tasa, 45.48);
});

test('mora simple respeta gracia y dias nuevos', () => {
  const inst = {
    estado: 'Pendiente',
    fechaVencimiento: '2026-05-15',
    saldoPendiente: 100000,
    montoProgramado: 100000,
  };
  const settings = { parametrosFinancieros: { mora: { activa: true, tasaDiaria: 1, diasGracia: 3, baseCalculo: 'saldo_pendiente', tipoCalculo: 'simple' } } };
  const mora = F.calculateInstallmentMora(inst, settings, '2026-05-25');
  eq(mora.days, 7);
  eq(mora.amount, 7000);
});

test('mora no duplica si ya se actualizo hoy', () => {
  const inst = {
    estado: 'Pendiente',
    fechaVencimiento: '2026-05-15',
    saldoPendiente: 100000,
    moraActualizadaHasta: '2026-05-25',
  };
  const settings = { parametrosFinancieros: { mora: { activa: true, tasaDiaria: 1, diasGracia: 3 } } };
  const mora = F.calculatePendingMoraUpdate(inst, settings, '2026-05-25');
  eq(mora.amount, 0);
  eq(mora.days, 0);
});

test('mora no aplica si esta congelada o pagada', () => {
  const settings = { parametrosFinancieros: { mora: { activa: true, tasaDiaria: 1, diasGracia: 0 } } };
  eq(F.calculateInstallmentMora({ estado: 'Pendiente', moraCongelada: true, fechaVencimiento: '2026-05-01', saldoPendiente: 1000 }, settings, '2026-05-25').amount, 0);
  eq(F.calculateInstallmentMora({ estado: 'Pagada', fechaVencimiento: '2026-05-01', saldoPendiente: 1000 }, settings, '2026-05-25').amount, 0);
});

test('total cobrable suma saldo y mora neta', () => {
  const inst = { saldoPendiente: 50000, moraAplicada: 7000, moraPagada: 2000, moraCondonada: 1000 };
  eq(F.calculateTotalCollectable(inst), 54000);
});

test('imputacion mora primero separa cuota y mora', () => {
  const inst = { id: 'i1', moneda: 'ARS', tipoCambio: 1, saldoPendiente: 50000, moraAplicada: 7000, moraPagada: 0, moraCondonada: 0 };
  const alloc = F.buildPaymentAllocation(inst, 10000, 1, 'ARS', 1, 'mora_primero');
  eq(alloc.montoMoraAplicado, 7000);
  eq(alloc.montoCuotaAplicado, 3000);
  eq(alloc.montoAplicado, 10000);
});

test('estado efectivo no marca pagada si queda mora pendiente', () => {
  const state = F.effectiveInstallmentState({ estado: 'Pendiente', fechaVencimiento: '2026-05-01', saldoPendiente: 0, montoPagado: 50000, moraAplicada: 1000 }, new Date('2026-05-25'));
  eq(state, 'Vencida');
});

test('balance de cliente incluye mora pendiente y total cobrable', () => {
  const balance = F.calculateClientBalance(
    'c1',
    [{ clientId: 'c1', fechaVencimiento: '2026-05-01', saldoPendiente: 1000, moraAplicada: 100, moneda: 'ARS', tipoCambio: 1 }],
    [{ clientId: 'c1', fechaPago: '2026-05-20', monto: 500, moneda: 'ARS', tipoCambio: 1 }],
    [{ clientId: 'c1', costoReal: 800, totalEsperado: 1500, gananciaEsperada: 700, moneda: 'ARS', tipoCambio: 1, estado: 'Activa' }]
  );
  eq(balance.saldoPendiente, 1000);
  eq(balance.moraPendiente, 100);
  eq(balance.totalCobrableActual, 1100);
});

let passed = 0;
for (const item of tests) {
  try {
    item.fn();
    passed += 1;
    console.log(`OK ${item.name}`);
  } catch (err) {
    console.error(`FAIL ${item.name}`);
    console.error(err.stack || err.message || err);
    process.exitCode = 1;
  }
}

if (process.exitCode) {
  console.error(`${passed}/${tests.length} finance tests passed.`);
  process.exit(process.exitCode);
}

console.log(`${passed}/${tests.length} finance tests passed.`);
