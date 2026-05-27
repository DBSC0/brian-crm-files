// Brian CRM finance core.
// Pure/domain helpers live here first; legacy globals remain as compatibility wrappers.
(function initCRMFinance(global) {
  'use strict';

  function isPrivacyHidden() {
    return !!global.CRM_PRIVACY_HIDE_NUMBERS;
  }

  function maskSensitiveNumber(value, suffix) {
    if (suffix == null) suffix = '';
    return isPrivacyHidden() ? '***' + suffix : '' + value + suffix;
  }

  function maskSensitiveText(value) {
    if (!isPrivacyHidden() || value == null) return value;
    var text = String(value);
    if (/^-?\d+([.,]\d+)?$/.test(text.trim())) return '***';
    return text
      .replace(/\$[\s\u00a0]*[-+]?\d[\d.,]*/g, '$ ******')
      .replace(/[-+]?\d+([.,]\d+)?\s*%/g, '**%')
      .replace(/\b\d+\s*[x\u00d7]\s*/gi, '** x ')
      .replace(/\b\d+([.,]\d+)?(?=\s*(cuotas?|dias|d[i\u00ed]as|operaciones?|vencimientos?|pagos?|clientes?|c\b))/gi, '**');
  }

  function formatCurrencyRaw(amount) {
    if (amount == null || isNaN(amount)) return '$0';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function normalizeCurrency(currency) {
    return String(currency || '').toUpperCase() === 'USD' ? 'USD' : 'ARS';
  }

  function normalizeExchangeRate(exchangeRate) {
    var n = Number(exchangeRate);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function formatMoneyRaw(amount, currency) {
    var curr = normalizeCurrency(currency);
    var n = Number(amount || 0);
    if (curr === 'USD') {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n).replace('US$', 'US$');
    }
    return formatCurrencyRaw(n);
  }

  function formatMoney(amount, currency) {
    var curr = normalizeCurrency(currency);
    if (isPrivacyHidden()) return curr === 'USD' ? 'US$ ******' : '$ ******';
    return formatMoneyRaw(amount, curr);
  }

  function toBaseAmount(amount, currency, exchangeRate) {
    var n = Number(amount || 0);
    return normalizeCurrency(currency) === 'USD' ? n * normalizeExchangeRate(exchangeRate) : n;
  }

  function convertMoney(amount, fromCurrency, toCurrency, exchangeRate) {
    var n = Number(amount || 0);
    var from = normalizeCurrency(fromCurrency);
    var to = normalizeCurrency(toCurrency);
    var rate = normalizeExchangeRate(exchangeRate);
    if (from === to) return n;
    if (from === 'USD' && to === 'ARS') return n * rate;
    if (from === 'ARS' && to === 'USD') return n / rate;
    return n;
  }

  function formatMoneyWithEquivalent(amount, currency, exchangeRate, options) {
    options = options || {};
    var curr = normalizeCurrency(currency);
    var base = toBaseAmount(amount, curr, exchangeRate);
    var primary = formatMoney(amount, curr);
    var showEquivalent = options.always || curr === 'USD';
    if (!showEquivalent) return primary;
    var suffix = options.compact ? ' ~= ' + formatMoney(base, 'ARS') : ' (equiv. ' + formatMoney(base, 'ARS') + ')';
    return primary + suffix;
  }

  function formatCurrency(amount) {
    if (isPrivacyHidden()) return '$ ******';
    return formatMoneyRaw(amount, 'ARS');
  }

  function formatCurrencyByCurrency(amount, currency) {
    return formatMoney(amount, currency || 'ARS');
  }

  function normalizeRatePlan(plan) {
    var p = plan || {};
    var cuotas = parseInt(p.cuotas, 10);
    var tasa = Number(p.tasa);
    return Object.assign({}, p, {
      cuotas: Number.isFinite(cuotas) && cuotas > 0 ? cuotas : 1,
      tasa: Number.isFinite(tasa) && tasa >= 0 ? tasa : 0,
      activa: p.activa !== false,
      desde: p.desde || '2026-01-01',
      hasta: p.hasta || null,
      moneda: normalizeCurrency(p.moneda || 'ARS'),
    });
  }

  function normalizeRatePlans(plans) {
    return (Array.isArray(plans) ? plans : []).map(normalizeRatePlan);
  }

  var DEFAULT_PAYMENT_METHODS = [
    { id: 'efectivo', nombre: 'Efectivo', activo: true, predeterminado: true, impactaCaja: true, requiereReferencia: false },
    { id: 'transferencia', nombre: 'Transferencia', activo: true, predeterminado: false, impactaCaja: true, requiereReferencia: true },
    { id: 'mercado-pago', nombre: 'Mercado Pago', activo: true, predeterminado: false, impactaCaja: true, requiereReferencia: true },
    { id: 'cheque', nombre: 'Cheque', activo: true, predeterminado: false, impactaCaja: false, requiereReferencia: true },
    { id: 'otro', nombre: 'Otro', activo: true, predeterminado: false, impactaCaja: false, requiereReferencia: false },
  ];

  function normalizePaymentMethods(arr) {
    if (!arr || arr.length === 0) return DEFAULT_PAYMENT_METHODS.slice();
    return arr.map(function normalizeOnePaymentMethod(m, i) {
      if (typeof m === 'string') {
        return { id: m.toLowerCase().replace(/\s+/g, '-'), nombre: m, activo: true, predeterminado: i === 0, impactaCaja: true, requiereReferencia: false };
      }
      return {
        id: m.id || String(m.nombre || 'metodo').toLowerCase().replace(/\s+/g, '-'),
        nombre: m.nombre || 'Metodo',
        activo: m.activo !== false,
        predeterminado: !!m.predeterminado,
        impactaCaja: m.impactaCaja !== false,
        requiereReferencia: !!m.requiereReferencia,
      };
    });
  }

  function isRatePlanActiveForDate(plan, dateStr) {
    var p = normalizeRatePlan(plan);
    if (!p.activa) return false;
    var ref = dateStr || new Date().toISOString().slice(0, 10);
    if (p.desde && p.desde > ref) return false;
    if (p.hasta && p.hasta < ref) return false;
    return true;
  }

  function getRatesByCurrency(settings, currency) {
    var curr = normalizeCurrency(currency || 'ARS');
    return normalizeRatePlans((settings && settings.tasasPorCuotas) || [])
      .filter(function sameCurrency(plan) { return normalizeCurrency(plan.moneda || 'ARS') === curr; })
      .sort(function byInstallments(a, b) { return a.cuotas - b.cuotas; });
  }

  function findActiveRate(settings, currency, cuotas, dateStr) {
    var curr = normalizeCurrency(currency || 'ARS');
    var count = Number(cuotas);
    return normalizeRatePlans((settings && settings.tasasPorCuotas) || []).find(function matches(plan) {
      return normalizeCurrency(plan.moneda || 'ARS') === curr &&
        Number(plan.cuotas) === count &&
        isRatePlanActiveForDate(plan, dateStr);
    }) || null;
  }

  function moneyBase(row, valueKey) {
    var baseKey = valueKey + 'Base';
    if (row && row[baseKey] != null) return Number(row[baseKey] || 0);
    return toBaseAmount(row && row[valueKey] != null ? row[valueKey] : 0, row && row.moneda, row && row.tipoCambio);
  }

  function splitMoneyByCurrency(rows, valueKey) {
    valueKey = valueKey || 'monto';
    return (rows || []).reduce(function split(acc, row) {
      var curr = normalizeCurrency(row && row.moneda);
      acc[curr] = (acc[curr] || 0) + Number((row && row[valueKey]) || 0);
      acc.base += moneyBase(row, valueKey);
      return acc;
    }, { ARS: 0, USD: 0, base: 0 });
  }

  async function fetchUsdRates() {
    var cacheKey = 'crm-usd-rates-cache';
    function normalizeRates(items) {
      var wanted = { oficial: 'Oficial', blue: 'Blue', bolsa: 'MEP' };
      return (items || [])
        .filter(function wantedRate(item) { return wanted[item.casa] && Number(item.venta) > 0; })
        .map(function mapRate(item) {
          return {
            key: item.casa,
            label: wanted[item.casa],
            rate: Number(item.venta),
            updatedAt: item.fechaActualizacion || new Date().toISOString(),
          };
        });
    }
    try {
      var res = await fetch('https://dolarapi.com/v1/dolares', { cache: 'no-store' });
      if (!res.ok) throw new Error('DolarApi ' + res.status);
      var rates = normalizeRates(await res.json());
      if (rates.length) {
        localStorage.setItem(cacheKey, JSON.stringify({ rates: rates, savedAt: new Date().toISOString() }));
        return rates;
      }
    } catch (err) {
      if (global.console) console.warn('No se pudo obtener cotizacion USD, usando cache/local.', err);
    }
    try {
      var cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      if (Array.isArray(cached.rates) && cached.rates.length) return cached.rates;
    } catch (err2) {}
    return [
      { key: 'oficial', label: 'Oficial', rate: 1, updatedAt: null },
      { key: 'blue', label: 'Blue', rate: 1, updatedAt: null },
      { key: 'bolsa', label: 'MEP', rate: 1, updatedAt: null },
    ];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    var parts = String(dateStr).split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : String(dateStr);
  }

  function addMonths(dateStr, months) {
    var d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  }

  function calculateOverdueDays(fechaVencimiento) {
    var today = new Date();
    var due = new Date(fechaVencimiento);
    var diff = Math.floor((today - due) / 86400000);
    return diff > 0 ? diff : 0;
  }

  var DEFAULT_MORA_SETTINGS = {
    activa: true,
    modo: 'automatica_confirmacion',
    tasaDiaria: 1,
    diasGracia: 3,
    baseCalculo: 'saldo_pendiente',
    tipoCalculo: 'simple',
    topePorcentaje: null,
    redondeo: 'sin_redondeo',
    prioridadPago: 'mora_primero',
    aplicarAlAbrirMora: true,
    aplicarAlRegistrarPago: true,
  };

  function normalizeMoraSettings(settings) {
    var pf = (settings && settings.parametrosFinancieros) || settings || {};
    var raw = pf.mora || {};
    var tasa = Number(raw.tasaDiaria);
    var gracia = parseInt(raw.diasGracia, 10);
    var tope = raw.topePorcentaje === '' || raw.topePorcentaje == null ? null : Number(raw.topePorcentaje);
    return Object.assign({}, DEFAULT_MORA_SETTINGS, raw, {
      activa: raw.activa !== false,
      modo: ['manual', 'automatica', 'automatica_confirmacion'].indexOf(raw.modo) >= 0 ? raw.modo : DEFAULT_MORA_SETTINGS.modo,
      tasaDiaria: Number.isFinite(tasa) && tasa >= 0 ? tasa : DEFAULT_MORA_SETTINGS.tasaDiaria,
      diasGracia: Number.isFinite(gracia) && gracia >= 0 ? gracia : DEFAULT_MORA_SETTINGS.diasGracia,
      baseCalculo: ['saldo_pendiente', 'monto_programado'].indexOf(raw.baseCalculo) >= 0 ? raw.baseCalculo : DEFAULT_MORA_SETTINGS.baseCalculo,
      tipoCalculo: ['simple', 'compuesto'].indexOf(raw.tipoCalculo) >= 0 ? raw.tipoCalculo : DEFAULT_MORA_SETTINGS.tipoCalculo,
      topePorcentaje: Number.isFinite(tope) && tope >= 0 ? tope : null,
      redondeo: ['sin_redondeo', '100', '500', '1000'].indexOf(raw.redondeo) >= 0 ? raw.redondeo : DEFAULT_MORA_SETTINGS.redondeo,
      prioridadPago: ['mora_primero', 'cuota_primero', 'manual'].indexOf(raw.prioridadPago) >= 0 ? raw.prioridadPago : DEFAULT_MORA_SETTINGS.prioridadPago,
      aplicarAlAbrirMora: raw.aplicarAlAbrirMora !== false,
      aplicarAlRegistrarPago: raw.aplicarAlRegistrarPago !== false,
    });
  }

  function roundMoraAmount(amount, redondeo) {
    var n = Number(amount || 0);
    var step = { '100': 100, '500': 500, '1000': 1000 }[redondeo] || 0;
    return step > 0 ? Math.ceil(n / step) * step : Math.round(n * 100) / 100;
  }

  function moraDateOnly(date) {
    var d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function diffDays(a, b) {
    return Math.floor((moraDateOnly(a) - moraDateOnly(b)) / 86400000);
  }

  function getInstallmentMoraBalance(inst) {
    var aplicada = Number((inst && inst.moraAplicada) || 0);
    var pagada = Number((inst && inst.moraPagada) || 0);
    var condonada = Number((inst && inst.moraCondonada) || 0);
    var pendiente = Math.max(0, aplicada - pagada - condonada);
    return { aplicada: aplicada, pagada: pagada, condonada: condonada, pendiente: pendiente };
  }

  function calculateInstallmentMora(inst, settings, today) {
    var cfg = normalizeMoraSettings(settings);
    var due = moraDateOnly(inst && inst.fechaVencimiento);
    var ref = moraDateOnly(today || new Date());
    var saldo = Number((inst && inst.saldoPendiente) || 0);
    var stored = inst && inst.estado;
    if (!cfg.activa || !inst || stored === 'Pagada' || stored === 'Anulada' || stored === 'Refinanciada' || saldo <= 0 || inst.moraCongelada || ref <= due) {
      return { amount: 0, days: 0, base: 0, totalDays: 0, inGrace: false, settings: cfg };
    }
    var totalDays = Math.max(0, diffDays(ref, due) - cfg.diasGracia);
    if (totalDays <= 0) return { amount: 0, days: 0, base: 0, totalDays: 0, inGrace: true, settings: cfg };
    var graceStart = new Date(due);
    graceStart.setDate(graceStart.getDate() + cfg.diasGracia);
    var last = inst.moraActualizadaHasta ? moraDateOnly(inst.moraActualizadaHasta) : graceStart;
    var start = last > graceStart ? last : graceStart;
    var days = Math.max(0, diffDays(ref, start));
    var base = cfg.baseCalculo === 'monto_programado' ? Number(inst.montoProgramado || 0) : saldo;
    if (days <= 0 || base <= 0) return { amount: 0, days: 0, base: base, totalDays: totalDays, inGrace: false, settings: cfg };
    var rate = cfg.tasaDiaria / 100;
    var amount = cfg.tipoCalculo === 'compuesto'
      ? base * (Math.pow(1 + rate, days) - 1)
      : base * rate * days;
    if (cfg.topePorcentaje != null) {
      var cap = base * cfg.topePorcentaje / 100;
      amount = Math.min(amount, Math.max(0, cap - Number(inst.moraAplicada || 0)));
    }
    amount = roundMoraAmount(amount, cfg.redondeo);
    return { amount: amount, days: days, base: base, totalDays: totalDays, inGrace: false, settings: cfg };
  }

  function calculatePendingMoraUpdate(inst, settings, today) {
    return calculateInstallmentMora(inst, settings, today);
  }

  function calculateTotalCollectable(inst) {
    return Number((inst && inst.saldoPendiente) || 0) + getInstallmentMoraBalance(inst).pendiente;
  }

  function calculateOperationTotals(costoReal, montoPactado, entrega, cuotas, tasa) {
    var montoFinanciado = Number(montoPactado || 0) - Number(entrega || 0);
    var interes = montoFinanciado * (Number(tasa || 0) / 100);
    var totalFinanciado = montoFinanciado + interes;
    var count = Math.max(1, Number(cuotas || 1));
    var valorCuota = Math.ceil(totalFinanciado / count);
    var totalEsperado = Number(entrega || 0) + totalFinanciado;
    var gananciaEsperada = totalEsperado - Number(costoReal || 0);
    return {
      montoFinanciado: montoFinanciado,
      interesCalculado: interes,
      totalFinanciado: totalFinanciado,
      valorCuota: valorCuota,
      totalEsperado: totalEsperado,
      gananciaEsperada: gananciaEsperada,
    };
  }

  function calculateClientBalance(clientId, insts, pays, ops) {
    insts = insts || [];
    pays = pays || [];
    ops = ops || [];
    var ci = insts.filter(function forClient(i) { return i.clientId === clientId; });
    var co = ops.filter(function forClient(o) { return o.clientId === clientId; });
    var cp = pays.filter(function forClient(p) { return p.clientId === clientId; });
    var today = new Date();
    var vencidas = ci.filter(function overdue(i) { return new Date(i.fechaVencimiento) < today && Number(i.saldoPendiente || 0) > 0; });
    var moraAplicada = ci.reduce(function sum(s, i) { return s + toBaseAmount(getInstallmentMoraBalance(i).aplicada, i.moneda, i.tipoCambio); }, 0);
    var moraPendiente = ci.reduce(function sum(s, i) { return s + toBaseAmount(getInstallmentMoraBalance(i).pendiente, i.moneda, i.tipoCambio); }, 0);
    var moraPagada = ci.reduce(function sum(s, i) { return s + toBaseAmount(getInstallmentMoraBalance(i).pagada, i.moneda, i.tipoCambio); }, 0);
    var moraCondonada = ci.reduce(function sum(s, i) { return s + toBaseAmount(getInstallmentMoraBalance(i).condonada, i.moneda, i.tipoCambio); }, 0);
    return {
      totalPactado: co.reduce(function sum(s, o) { return s + moneyBase(o, 'totalEsperado'); }, 0),
      saldoPendiente: ci.reduce(function sum(s, i) { return s + moneyBase(i, 'saldoPendiente'); }, 0),
      totalCobrableActual: ci.reduce(function sum(s, i) { return s + moneyBase(i, 'saldoPendiente') + toBaseAmount(getInstallmentMoraBalance(i).pendiente, i.moneda, i.tipoCambio); }, 0),
      totalPagado: cp.reduce(function sum(s, p) { return s + moneyBase(p, 'monto'); }, 0),
      montoVencido: vencidas.reduce(function sum(s, i) { return s + moneyBase(i, 'saldoPendiente'); }, 0),
      moraAplicada: moraAplicada,
      moraPendiente: moraPendiente,
      moraPagada: moraPagada,
      moraCondonada: moraCondonada,
      capitalInvertido: co.reduce(function sum(s, o) { return s + moneyBase(o, 'costoReal'); }, 0),
      gananciaEsperada: co.reduce(function sum(s, o) { return s + moneyBase(o, 'gananciaEsperada'); }, 0),
      opActivas: co.filter(function active(o) { return o.estado === 'Activa'; }).length,
      nextInst: ci.filter(function pending(i) { return Number(i.saldoPendiente || 0) > 0; }).sort(function byDue(a, b) { return String(a.fechaVencimiento).localeCompare(String(b.fechaVencimiento)); })[0],
      lastPay: cp.sort(function byPay(a, b) { return String(b.fechaPago).localeCompare(String(a.fechaPago)); })[0],
    };
  }

  function getDashboardMetrics(cls, ops, insts, pays, cards, ccMovs) {
    ops = ops || [];
    insts = insts || [];
    pays = pays || [];
    var today = new Date();
    var thisMonth = today.toISOString().slice(0, 7);
    var vencidas = insts.filter(function overdue(i) { return new Date(i.fechaVencimiento) < today && Number(i.saldoPendiente || 0) > 0; });
    var moraPendiente = insts.reduce(function sum(s, i) { return s + toBaseAmount(getInstallmentMoraBalance(i).pendiente, i.moneda, i.tipoCambio); }, 0);
    var moraCobradaTotal = insts.reduce(function sum(s, i) { return s + toBaseAmount(getInstallmentMoraBalance(i).pagada, i.moneda, i.tipoCambio); }, 0);
    var next15 = new Date();
    next15.setDate(next15.getDate() + 15);
    var proxVencimientos = insts.filter(function nextDue(i) {
      var d = new Date(i.fechaVencimiento);
      return d >= today && d <= next15 && Number(i.saldoPendiente || 0) > 0;
    }).sort(function byDue(a, b) { return String(a.fechaVencimiento).localeCompare(String(b.fechaVencimiento)); });
    return {
      capitalInvertido: ops.reduce(function sum(s, o) { return s + moneyBase(o, 'costoReal'); }, 0),
      totalEsperado: ops.reduce(function sum(s, o) { return s + moneyBase(o, 'totalEsperado'); }, 0),
      saldoPendiente: insts.reduce(function sum(s, i) { return s + moneyBase(i, 'saldoPendiente'); }, 0),
      montoVencido: vencidas.reduce(function sum(s, i) { return s + moneyBase(i, 'saldoPendiente'); }, 0),
      moraPendiente: moraPendiente,
      moraCobradaTotal: moraCobradaTotal,
      clientesEnMora: new Set(vencidas.map(function id(i) { return i.clientId; })).size,
      cobradoEsteMes: pays.filter(function thisMonthPay(p) { return String(p.fechaPago || '').indexOf(thisMonth) === 0; }).reduce(function sum(s, p) { return s + moneyBase(p, 'monto'); }, 0),
      gananciaEsperada: ops.reduce(function sum(s, o) { return s + moneyBase(o, 'gananciaEsperada'); }, 0),
      gananciaRealizada: pays.reduce(function sum(s, p) { return s + moneyBase(p, 'monto'); }, 0) - ops.reduce(function sum(s, o) { return s + moneyBase(o, 'costoReal'); }, 0),
      capitalEfectivo: ops.filter(function cash(o) { return !String(o.fuenteFinanciacion || '').toLowerCase().includes('tarjeta'); }).reduce(function sum(s, o) { return s + moneyBase(o, 'costoReal'); }, 0),
      capitalTarjeta: ops.filter(function card(o) { return String(o.fuenteFinanciacion || '').toLowerCase().includes('tarjeta'); }).reduce(function sum(s, o) { return s + moneyBase(o, 'costoReal'); }, 0),
      saldoPendientePorMoneda: splitMoneyByCurrency(insts, 'saldoPendiente'),
      cobradoPorMoneda: splitMoneyByCurrency(pays, 'monto'),
      proxVencimientos: proxVencimientos,
      vencidas: vencidas,
    };
  }

  function effectiveInstallmentState(inst, today) {
    var stored = inst && inst.estado;
    if (stored === 'Anulada' || stored === 'Refinanciada') return stored;
    var saldo = Number((inst && inst.saldoPendiente) || 0);
    var pagado = Number((inst && inst.montoPagado) || 0);
    var moraPendiente = getInstallmentMoraBalance(inst).pendiente;
    if (saldo <= 0 && moraPendiente <= 0) return 'Pagada';
    var due = inst && inst.fechaVencimiento ? new Date(inst.fechaVencimiento + 'T00:00:00') : null;
    if (due && due < (today || new Date())) return 'Vencida';
    if (pagado > 0) return 'Parcial';
    return 'Pendiente';
  }

  function isFinanciallyActiveInstallment(inst) {
    return inst && inst.estado !== 'Anulada' && inst.estado !== 'Refinanciada';
  }

  function buildPaymentAllocation(inst, remainingInPaymentCurrency, divisor, paymentCurrency, paymentRate, priority, manualSplit) {
    priority = priority || 'cuota_primero';
    var instCurrency = normalizeCurrency(inst && inst.moneda);
    var instRate = normalizeExchangeRate(inst && inst.tipoCambio);
    var maxPayChunk = Number(remainingInPaymentCurrency || 0) / Math.max(1, divisor || 1);
    var availableInInstallmentCurrency = convertMoney(maxPayChunk, paymentCurrency, instCurrency, paymentRate);
    var moraPendiente = getInstallmentMoraBalance(inst).pendiente;
    var montoCuotaAplicado = 0;
    var montoMoraAplicado = 0;
    if (manualSplit) {
      montoMoraAplicado = Math.min(Number(manualSplit.mora || 0), moraPendiente, availableInInstallmentCurrency);
      montoCuotaAplicado = Math.min(Number(manualSplit.cuota || 0), Number(inst.saldoPendiente || 0), Math.max(0, availableInInstallmentCurrency - montoMoraAplicado));
    } else if (priority === 'mora_primero') {
      montoMoraAplicado = Math.min(availableInInstallmentCurrency, moraPendiente);
      montoCuotaAplicado = Math.min(Math.max(0, availableInInstallmentCurrency - montoMoraAplicado), Number(inst.saldoPendiente || 0));
    } else {
      montoCuotaAplicado = Math.min(availableInInstallmentCurrency, Number(inst.saldoPendiente || 0));
      montoMoraAplicado = Math.min(Math.max(0, availableInInstallmentCurrency - montoCuotaAplicado), moraPendiente);
    }
    var montoAplicado = montoCuotaAplicado + montoMoraAplicado;
    var payCurrency = normalizeCurrency(paymentCurrency);
    var payRate = normalizeExchangeRate(paymentRate);
    var montoPagoAplicado = convertMoney(montoAplicado, instCurrency, payCurrency, payRate);
    return {
      installmentId: inst.id,
      montoAplicado: montoAplicado,
      montoCuotaAplicado: montoCuotaAplicado,
      montoMoraAplicado: montoMoraAplicado,
      montoPagoAplicado: montoPagoAplicado,
      montoAplicadoBase: toBaseAmount(montoPagoAplicado, payCurrency, payRate),
      montoCuotaAplicadoBase: toBaseAmount(montoCuotaAplicado, instCurrency, instRate),
      montoMoraAplicadoBase: toBaseAmount(montoMoraAplicado, instCurrency, instRate),
      paymentMoneda: payCurrency,
      installmentMoneda: instCurrency,
      tipoCambioPago: payRate,
      tipoCambioInstallment: instRate,
      inst: inst,
    };
  }

  var api = {
    isPrivacyHidden: isPrivacyHidden,
    maskSensitiveNumber: maskSensitiveNumber,
    maskSensitiveText: maskSensitiveText,
    formatCurrencyRaw: formatCurrencyRaw,
    normalizeCurrency: normalizeCurrency,
    normalizeExchangeRate: normalizeExchangeRate,
    formatMoneyRaw: formatMoneyRaw,
    formatMoney: formatMoney,
    toBaseAmount: toBaseAmount,
    convertMoney: convertMoney,
    formatMoneyWithEquivalent: formatMoneyWithEquivalent,
    formatCurrency: formatCurrency,
    formatCurrencyByCurrency: formatCurrencyByCurrency,
    normalizeRatePlan: normalizeRatePlan,
    normalizeRatePlans: normalizeRatePlans,
    DEFAULT_PAYMENT_METHODS: DEFAULT_PAYMENT_METHODS,
    normalizePaymentMethods: normalizePaymentMethods,
    isRatePlanActiveForDate: isRatePlanActiveForDate,
    getRatesByCurrency: getRatesByCurrency,
    findActiveRate: findActiveRate,
    moneyBase: moneyBase,
    splitMoneyByCurrency: splitMoneyByCurrency,
    fetchUsdRates: fetchUsdRates,
    formatDate: formatDate,
    addMonths: addMonths,
    calculateOverdueDays: calculateOverdueDays,
    DEFAULT_MORA_SETTINGS: DEFAULT_MORA_SETTINGS,
    normalizeMoraSettings: normalizeMoraSettings,
    roundMoraAmount: roundMoraAmount,
    moraDateOnly: moraDateOnly,
    diffDays: diffDays,
    getInstallmentMoraBalance: getInstallmentMoraBalance,
    calculateInstallmentMora: calculateInstallmentMora,
    calculatePendingMoraUpdate: calculatePendingMoraUpdate,
    calculateTotalCollectable: calculateTotalCollectable,
    calculateOperationTotals: calculateOperationTotals,
    calculateClientBalance: calculateClientBalance,
    getDashboardMetrics: getDashboardMetrics,
    effectiveInstallmentState: effectiveInstallmentState,
    isFinanciallyActiveInstallment: isFinanciallyActiveInstallment,
    buildPaymentAllocation: buildPaymentAllocation,
  };

  global.CRMFinance = api;
  Object.assign(global, api);
})(typeof window !== 'undefined' ? window : globalThis);
