// Pantalla de importación de datos desde Excel
function ImportarDatosScreen({ onDataChange, auth }) {
  const hp = window.hasPermission || (() => true);
  const orgId = auth?.currentOrganization?.id;
  const [fileInfo, setFileInfo]       = React.useState(null);
  const [parsed, setParsed]           = React.useState(null);
  const [parseError, setParseError]   = React.useState(null);
  const [tab, setTab]                 = React.useState('clientes');
  const [importing, setImporting]     = React.useState(false);
  const [importStep, setImportStep]   = React.useState('');
  const [importLog, setImportLog]     = React.useState(null);
  const [importError, setImportError] = React.useState(null);
  const [dragOver, setDragOver]       = React.useState(false);
  const [confirmed, setConfirmed]     = React.useState(false);
  const fileInputRef = React.useRef(null);

  // ─── Helpers de limpieza ────────────────────────────────────────────────────

  function parseExcelDate(val) {
    if (!val) return null;
    var d = (val instanceof Date) ? val : new Date(String(val));
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  function cleanDNI(raw) {
    var s = String(raw || '').trim();
    var digits = s.replace(/\D/g, '');
    if (!digits || digits.length < 5) return '';
    return digits;
  }

  function cleanPhone(raw) {
    if (!raw) return null;
    var s = String(raw).replace(/[\u200B-\u200F\u202A-\u202E\u2028\u2029\uFEFF\u00AD]/g, '').trim();
    if (!s || s.replace(/[\s\-.()/]/g, '').length < 4) return null;
    if (/^[-\s.]+$/.test(s)) return null;
    return s;
  }

  // ─── Traduccion de codigos Excel → CRM ──────────────────────────────────────

  function translateClientCode(old) {
    var m = String(old || '').match(/#C(\d+)/);
    return m ? 'CLI-' + m[1].padStart(3, '0') : old;
  }

  function applyCodeTranslation(clientes, operaciones, cuotas) {
    // Build op code map keyed by OLD Excel code (before mutating)
    var sortedOps = operaciones.slice().sort(function(a, b) {
      return a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0;
    });
    var opCodeMap = {};
    sortedOps.forEach(function(op, i) {
      opCodeMap[op.codigo] = 'OP-' + String(i + 1).padStart(3, '0');
    });

    // Assign cuota codes DIRECTLY to each object (avoids map key collision
    // when duplicate idPago values exist in the Excel)
    var sortedCuotas = cuotas.slice().sort(function(a, b) {
      return a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0;
    });
    sortedCuotas.forEach(function(c, i) {
      c.codigo = 'CUO-' + String(i + 1).padStart(3, '0');
    });

    // Apply translations (c.codigo on cuotas is already set above)
    clientes.forEach(function(c) {
      c.codigo  = translateClientCode(c.codigo);
      c._codigo = c.codigo;
    });
    operaciones.forEach(function(op) {
      op.codigo        = opCodeMap[op.codigo] || op.codigo;
      op._clientCodigo = translateClientCode(op._clientCodigo);
    });
    cuotas.forEach(function(c) {
      c._clientCodigo = translateClientCode(c._clientCodigo);
      c._opCodigo     = opCodeMap[c._opCodigo] || c._opCodigo;
    });
  }

  function buildInferredPayments(cuotas) {
    return cuotas
      .filter(function(c) { return c.estado === 'Pagada'; })
      .map(function(c) {
        var monto = Number(c.monto_pagado || c.monto_programado) || 0;
        var legacyPago = c._legacyPagoCodigo || c.codigo;
        var legacyOp = c._legacyOpCodigo || c._opCodigo;
        return {
          codigo:          'PAG-IMP-' + c.codigo,
          recibo_codigo:   'REC-IMP-' + c.codigo,
          _cuotaCodigo:    c.codigo,
          _clientCodigo:   c._clientCodigo,
          _opCodigo:       c._opCodigo,
          _legacyPagoCodigo: legacyPago,
          _legacyOpCodigo: legacyOp,
          fecha_pago:      c.fecha_vencimiento,
          monto:           monto,
          metodo_pago:     'Otro',
          numero_cuota:    c.numero_cuota,
          total_cuotas:    c.total_cuotas,
          notas:           'Importado desde Excel: ' + legacyPago + ' / ' + legacyOp + ' cuota ' + c.numero_cuota + '/' + c.total_cuotas,
        };
      });
  }

  // ─── Parser principal ────────────────────────────────────────────────────────

  function parseExcelFile(arrayBuffer) {
    if (typeof window.XLSX === 'undefined')
      throw new Error('SheetJS no esta cargado. Verifica la conexion a internet y recarga la app.');

    var wb = window.XLSX.read(arrayBuffer, { cellDates: true });

    // --- Hoja "Clientes" ---
    var wsClientes = wb.Sheets['Clientes'];
    if (!wsClientes) throw new Error('No se encontro la hoja "Clientes" en el archivo.');

    var rawClientes = window.XLSX.utils.sheet_to_json(wsClientes, { header: 1, defval: '' });
    var hdrIdx = -1;
    for (var ri = 0; ri < rawClientes.length; ri++) {
      if (rawClientes[ri].some(function(c) { return String(c).indexOf('Nombre completo') >= 0; })) {
        hdrIdx = ri; break;
      }
    }
    if (hdrIdx === -1) throw new Error('No se encontro la fila de encabezados en la hoja "Clientes".');

    var clientes = [];
    for (var i = hdrIdx + 1; i < rawClientes.length; i++) {
      var row = rawClientes[i];
      var nombre = String(row[0] || '').trim();
      var codigo = String(row[2] || '').trim();
      if (!nombre || !codigo || codigo.indexOf('#C') !== 0) continue;
      clientes.push({
        codigo:               codigo,
        nombre:               nombre,
        dni:                  cleanDNI(row[1]),
        telefono:             cleanPhone(String(row[3] || '')),
        telefono_secundario:  cleanPhone(String(row[4] || '')),
        direccion:            String(row[5] || '').trim() || null,
        ciudad:               null,
        barrio:               null,
        estado:               'Activo',
        riesgo:               'Bajo',
        notas:                String(row[11] || '').trim() || null,
        _codigo:              codigo,
      });
    }

    if (clientes.length === 0) throw new Error('No se encontraron clientes en la hoja "Clientes".');

    // --- Hojas por cliente ---
    var allOperaciones = [];
    var allCuotas      = [];

    for (var ci = 0; ci < clientes.length; ci++) {
      var cliente  = clientes[ci];
      var codeNum  = cliente.codigo.slice(1);                    // "C001"
      var sheetName = null;
      for (var si = 0; si < wb.SheetNames.length; si++) {
        if (wb.SheetNames[si].indexOf(codeNum) >= 0) { sheetName = wb.SheetNames[si]; break; }
      }
      if (!sheetName) continue;

      var ws   = wb.Sheets[sheetName];
      var rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      var hdIdx = -1;
      for (var rj = 0; rj < rows.length; rj++) {
        if (String(rows[rj][0] || '').trim() === 'ID Venta') { hdIdx = rj; break; }
      }
      if (hdIdx === -1) continue;

      // keyed by full operation code e.g. "#C002-V001"
      var opsByCode = {};

      for (var r = hdIdx + 1; r < rows.length; r++) {
        var row = rows[r];

        // Seccion izquierda: operaciones
        var idVenta = String(row[0] || '').trim();
        if (idVenta && /^V\d+/.test(idVenta)) {
          var montoFinanciado  = Number(row[5]) || 0;
          var totalEsperado    = Number(row[8]) || 0;
          var tasaInteres      = Number(row[7]) || 0;
          var interesCalculado = Math.max(0, totalEsperado - montoFinanciado);
          var descripcion      = String(row[1] || '').trim();
          var descUpper        = descripcion.toUpperCase();
          var tipo             = (descUpper.indexOf('PRESTAMO') >= 0 || descUpper.indexOf('PRÉSTAMO') >= 0)
            ? 'Préstamo en efectivo' : 'Venta financiada';
          var opCodigo = cliente.codigo + '-' + idVenta;
          var op = {
            codigo:              opCodigo,
            _clientCodigo:       cliente.codigo,
            tipo:                tipo,
            descripcion:         descripcion,
            costo_real:          Number(row[2]) || 0,
            monto_pactado:       Number(row[3]) || 0,
            entrega:             Number(row[4]) || 0,
            monto_financiado:    montoFinanciado,
            cantidad_cuotas:     Number(row[6]) || 1,
            tasa_interes:        tasaInteres,
            interes_calculado:   interesCalculado,
            total_financiado:    totalEsperado,
            valor_cuota:         Number(row[9]) || 0,
            total_esperado:      totalEsperado,
            ganancia_esperada:   Number(row[10]) || 0,
            fuente_financiacion: 'Efectivo',
            fecha_inicio:        parseExcelDate(row[11]),
            primer_vencimiento:  null,
            estado:              'Activa',
            notas:               null,
          };
          opsByCode[opCodigo] = op;
          allOperaciones.push(op);
        }

        // Seccion derecha: cuotas (col 13 = ID Pago, col 14 = codigo completo op)
        var idPago     = String(row[13] || '').trim();
        var idVentaRef = String(row[14] || '').trim(); // e.g. "#C002-V001"
        if (idPago && idPago.charAt(0) === '#' && idVentaRef) {
          var monto          = Number(row[16]) || 0;
          var numCuota       = Number(row[17]) || 0;
          var fechaVenc      = parseExcelDate(row[18]);
          var estadoRaw      = String(row[19] || '').trim();
          var estadoCuota    = estadoRaw === 'Cancelado' ? 'Pagada' : 'Pendiente';
          // col 14 already contains the full op code — use directly
          var opCodigoCuota  = idVentaRef;
          allCuotas.push({
            codigo:            idPago,
            _clientCodigo:     cliente.codigo,
            _opCodigo:         opCodigoCuota,
            _legacyPagoCodigo: idPago,
            _legacyOpCodigo:   opCodigoCuota,
            numero_cuota:      numCuota,
            total_cuotas:      0,
            fecha_vencimiento: fechaVenc,
            monto_programado:  monto,
            monto_pagado:      estadoCuota === 'Pagada' ? monto : 0,
            saldo_pendiente:   estadoCuota === 'Pagada' ? 0 : monto,
            mora_aplicada:     0,
            estado:            estadoCuota,
          });
          // set primer_vencimiento on the operation
          var opRef = opsByCode[idVentaRef];
          if (opRef && numCuota === 1 && fechaVenc) {
            opRef.primer_vencimiento = fechaVenc;
          }
        }
      }

      // Post-proceso: total_cuotas y estado de operacion
      for (var oi = 0; oi < allOperaciones.length; oi++) {
        var op2 = allOperaciones[oi];
        if (op2._clientCodigo !== cliente.codigo) continue;
        var opCuotas = allCuotas.filter(function(c) { return c._opCodigo === op2.codigo; });
        opCuotas.forEach(function(c) { c.total_cuotas = op2.cantidad_cuotas; });
        if (opCuotas.length > 0 && opCuotas.every(function(c) { return c.estado === 'Pagada'; })) {
          op2.estado = 'Completada';
        }
        // Garantizar primer_vencimiento (NOT NULL en DB)
        if (!op2.primer_vencimiento) {
          var conFecha = opCuotas.filter(function(c) { return c.fecha_vencimiento; });
          conFecha.sort(function(a, b) { return a.numero_cuota - b.numero_cuota; });
          op2.primer_vencimiento = conFecha.length > 0 ? conFecha[0].fecha_vencimiento : op2.fecha_inicio;
        }
      }
    }

    applyCodeTranslation(clientes, allOperaciones, allCuotas);
    var allPagos = buildInferredPayments(allCuotas);
    return { clientes: clientes, operaciones: allOperaciones, cuotas: allCuotas, pagos: allPagos };
  }

  // ─── Manejo de archivo ───────────────────────────────────────────────────────

  function processFile(f) {
    if (!f.name.match(/\.xlsx$/i)) {
      setParseError('El archivo debe ser un .xlsx de Excel.');
      return;
    }
    setFileInfo({ name: f.name, size: f.size });
    setParsed(null);
    setParseError(null);
    setImportLog(null);
    setImportError(null);
    setConfirmed(false);

    f.arrayBuffer().then(function(buf) {
      try {
        var data = parseExcelFile(buf);
        setParsed(data);
      } catch(e) {
        setParseError(e.message);
      }
    }).catch(function(e) {
      setParseError('Error leyendo el archivo: ' + e.message);
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) processFile(f);
  }

  function handleFileInput(e) {
    var f = e.target && e.target.files && e.target.files[0];
    if (f) processFile(f);
    e.target.value = '';
  }

  // ─── Importacion con deteccion de duplicados ──────────────────────────────────

  function handleImport() {
    if (!parsed || !confirmed) return;
    if (!hp('import.run')) { alert('No tenés permiso para importar datos.'); return; }
    if (!orgId) { alert('No hay organización activa. Iniciá sesión de nuevo.'); return; }
    setImporting(true);
    setImportError(null);

    var sb = window.__supabase;
    var clientes    = parsed.clientes;
    var operaciones = parsed.operaciones;
    var cuotas      = parsed.cuotas;
    var pagos       = parsed.pagos || [];

    var log = {
      clientes:    { insertados: [], omitidos: [], errores: [] },
      operaciones: { insertadas: [], omitidas: [], errores: [] },
      cuotas:      { insertadas: 0,  omitidas:  0, sinOp: 0, errores: [] },
      pagos:       { insertados: [], omitidos: [], imputados: [], sinCuota: [], errores: [] },
    };

    // 1. Pre-fetch existing codes (scoped to this org)
    setImportStep('Verificando duplicados...');
    Promise.all([
      sb.from('clients').select('id, codigo').eq('organization_id', orgId),
      sb.from('operations').select('id, codigo').eq('organization_id', orgId),
      sb.from('installments').select('id, codigo, client_id, operation_id, monto_programado, fecha_vencimiento').eq('organization_id', orgId),
      sb.from('payments').select('id, codigo, receipt_id').eq('organization_id', orgId),
      sb.from('payment_allocations').select('id, payment_id, installment_id, monto_aplicado'),
      sb.from('receipts').select('id, codigo, numero, payment_id').eq('organization_id', orgId),
    ]).then(function(results) {
      var r1 = results[0], r2 = results[1], r3 = results[2], r4 = results[3], r5 = results[4], r6 = results[5];
      if (r1.error) throw new Error('Error consultando clientes: ' + r1.error.message);
      if (r2.error) throw new Error('Error consultando operaciones: ' + r2.error.message);
      if (r3.error) throw new Error('Error consultando cuotas: ' + r3.error.message);
      if (r4.error) throw new Error('Error consultando pagos: ' + r4.error.message);
      if (r5.error) throw new Error('Error consultando imputaciones: ' + r5.error.message);
      if (r6.error) throw new Error('Error consultando recibos: ' + r6.error.message);

      // Build existing maps
      var existingClientMap = {};
      (r1.data || []).forEach(function(c) { existingClientMap[c.codigo] = c.id; });

      var existingOpMap = {};
      (r2.data || []).forEach(function(o) { existingOpMap[o.codigo] = o.id; });

      var existingCuotaSet = {};
      var cuotaMap = {};
      (r3.data || []).forEach(function(i) {
        existingCuotaSet[i.codigo] = true;
        cuotaMap[i.codigo] = i;
      });

      var existingPaymentMap = {};
      (r4.data || []).forEach(function(p) { existingPaymentMap[p.codigo] = p; });

      var allocationByInstallment = {};
      (r5.data || []).forEach(function(a) {
        if (a.installment_id) allocationByInstallment[a.installment_id] = a;
      });

      var existingReceiptCodeSet = {};
      var nextReceiptNumber = 1;
      (r6.data || []).forEach(function(rec) {
        existingReceiptCodeSet[rec.codigo] = true;
        nextReceiptNumber = Math.max(nextReceiptNumber, (Number(rec.numero) || 0) + 1);
      });

      // Separate new vs existing for clients
      var newClientes = [];
      clientes.forEach(function(c) {
        if (existingClientMap[c.codigo]) {
          log.clientes.omitidos.push({ codigo: c.codigo, nombre: c.nombre });
        } else {
          newClientes.push(c);
        }
      });

      // 2. Insert new clients
      setImportStep('Insertando clientes...');
      var insertClientsPromise = newClientes.length > 0
        ? sb.from('clients').insert(newClientes.map(function(c) {
            var out = {};
            Object.keys(c).forEach(function(k) { if (k !== '_codigo') out[k] = c[k]; });
            out.organization_id = orgId;
            return out;
          })).select('id, codigo')
        : Promise.resolve({ data: [], error: null });

      return insertClientsPromise.then(function(res1) {
        if (res1.error) throw new Error('Clientes: ' + res1.error.message);

        // Build combined client map (existing + newly inserted)
        var clientMap = Object.assign({}, existingClientMap);
        (res1.data || []).forEach(function(c) {
          clientMap[c.codigo] = c.id;
          log.clientes.insertados.push({ codigo: c.codigo, nombre: newClientes.find(function(x){ return x.codigo === c.codigo; }).nombre });
        });

        // Separate new vs existing for operations
        var newOperaciones = [];
        operaciones.forEach(function(op) {
          if (existingOpMap[op.codigo]) {
            log.operaciones.omitidas.push({ codigo: op.codigo, descripcion: op.descripcion });
          } else {
            newOperaciones.push(op);
          }
        });

        // 3. Insert new operations
        setImportStep('Insertando operaciones...');
        var insertOpsPromise = newOperaciones.length > 0
          ? sb.from('operations').insert(newOperaciones.map(function(op) {
              var out = {};
              Object.keys(op).forEach(function(k) {
                if (k !== '_clientCodigo') out[k] = op[k];
              });
              out.organization_id = orgId;
              out.client_id = clientMap[op._clientCodigo];
              out.moneda = 'ARS';
              out.tipo_cambio = 1;
              out.tipo_cambio_fuente = 'historico_ars';
              out.costo_real_base = op.costo_real;
              out.monto_pactado_base = op.monto_pactado;
              out.entrega_base = op.entrega;
              out.monto_financiado_base = op.monto_financiado;
              out.interes_calculado_base = op.interes_calculado;
              out.total_financiado_base = op.total_financiado;
              out.valor_cuota_base = op.valor_cuota;
              out.total_esperado_base = op.total_esperado;
              out.ganancia_esperada_base = op.ganancia_esperada;
              return out;
            })).select('id, codigo')
          : Promise.resolve({ data: [], error: null });

        return insertOpsPromise.then(function(res2) {
          if (res2.error) throw new Error('Operaciones: ' + res2.error.message);

          // Build combined op map (existing + newly inserted)
          var opMap = Object.assign({}, existingOpMap);
          (res2.data || []).forEach(function(o) {
            opMap[o.codigo] = o.id;
            log.operaciones.insertadas.push({ codigo: o.codigo });
          });

          // Separate new vs existing for cuotas
          var newCuotas = [];
          cuotas.forEach(function(c) {
            if (existingCuotaSet[c.codigo]) {
              log.cuotas.omitidas++;
              return;
            }
            var opId = opMap[c._opCodigo];
            var cliId = clientMap[c._clientCodigo];
            if (!opId) {
              log.cuotas.sinOp++;
              return;
            }
            var out = {};
            Object.keys(c).forEach(function(k) {
              if (k.charAt(0) !== '_') out[k] = c[k];
            });
            out.organization_id = orgId;
            out.client_id    = cliId;
            out.operation_id = opId;
            out.moneda = 'ARS';
            out.tipo_cambio = 1;
            out.tipo_cambio_fuente = 'historico_ars';
            out.monto_programado_base = out.monto_programado;
            out.monto_pagado_base = out.monto_pagado || 0;
            out.saldo_pendiente_base = out.saldo_pendiente;
            out.mora_aplicada_base = out.mora_aplicada || 0;
            newCuotas.push(out);
          });

          // 4. Insert new cuotas
          setImportStep('Insertando cuotas...');
          var insertCuotasPromise = newCuotas.length > 0
            ? sb.from('installments').insert(newCuotas).select('id, codigo, client_id, operation_id, monto_programado, fecha_vencimiento')
            : Promise.resolve({ data: [], error: null });

          return insertCuotasPromise.then(function(res3) {
            if (res3.error) throw new Error('Cuotas: ' + res3.error.message);
            log.cuotas.insertadas = (res3.data || []).length;
            (res3.data || []).forEach(function(i) {
              cuotaMap[i.codigo] = i;
            });

            // 5. Insert inferred historical payments for paid installments
            setImportStep('Importando pagos historicos...');
            var newPayments = [];
            var pendingPaymentItems = [];
            pagos.forEach(function(p) {
              var cuota = cuotaMap[p._cuotaCodigo];
              if (!cuota) {
                log.pagos.sinCuota.push({ codigo: p.codigo, desc: p._cuotaCodigo });
                return;
              }
              if (existingPaymentMap[p.codigo]) {
                log.pagos.omitidos.push({ codigo: p.codigo, desc: 'Pago existente' });
                return;
              }
              if (allocationByInstallment[cuota.id]) {
                log.pagos.imputados.push({ codigo: p.codigo, desc: 'Cuota ya imputada: ' + p._cuotaCodigo });
                return;
              }
              if (existingReceiptCodeSet[p.recibo_codigo]) {
                log.pagos.omitidos.push({ codigo: p.codigo, desc: 'Recibo existente: ' + p.recibo_codigo });
                return;
              }

              var montoPago = Number(p.monto || cuota.monto_programado) || 0;
              if (montoPago <= 0 || !cuota.client_id || !cuota.operation_id) {
                log.pagos.errores.push('No se pudo preparar ' + p.codigo + ' para ' + p._cuotaCodigo);
                return;
              }

              newPayments.push({
                organization_id: orgId,
                codigo:       p.codigo,
                client_id:    cuota.client_id,
                fecha_pago:   p.fecha_pago || cuota.fecha_vencimiento || new Date().toISOString().slice(0, 10),
                monto:        montoPago,
                moneda:       'ARS',
                tipo_cambio:  1,
                tipo_cambio_fuente: 'historico_ars',
                monto_base:   montoPago,
                metodo_pago:  p.metodo_pago,
                notas:        p.notas,
              });
              pendingPaymentItems.push({
                pago:       p,
                cuota:      cuota,
                monto:      montoPago,
                fecha_pago:  p.fecha_pago || cuota.fecha_vencimiento || new Date().toISOString().slice(0, 10),
              });
            });

            var insertPaymentsPromise = newPayments.length > 0
              ? sb.from('payments').insert(newPayments).select('id, codigo')
              : Promise.resolve({ data: [], error: null });

            return insertPaymentsPromise.then(function(res4) {
              if (res4.error) throw new Error('Pagos: ' + res4.error.message);

              var insertedPaymentMap = {};
              (res4.data || []).forEach(function(p) { insertedPaymentMap[p.codigo] = p; });

              var insertedItems = [];
              pendingPaymentItems.forEach(function(item) {
                var insertedPayment = insertedPaymentMap[item.pago.codigo];
                if (!insertedPayment) {
                  log.pagos.errores.push('No se pudo recuperar el pago insertado ' + item.pago.codigo);
                  return;
                }
                item.paymentId = insertedPayment.id;
                insertedItems.push(item);
                log.pagos.insertados.push({
                  codigo: item.pago.codigo,
                  desc: item.pago._legacyPagoCodigo + ' -> ' + item.pago._cuotaCodigo,
                });
              });

              if (insertedItems.length === 0) {
                setImportLog(log);
                if (onDataChange) onDataChange();
                return;
              }

              var receiptRows = insertedItems.map(function(item) {
                return {
                  organization_id: orgId,
                  codigo:     item.pago.recibo_codigo,
                  payment_id: item.paymentId,
                  client_id:  item.cuota.client_id,
                  numero:     nextReceiptNumber++,
                  estado:     'Emitido',
                  fecha:      item.fecha_pago,
                  moneda:     'ARS',
                  tipo_cambio: 1,
                  tipo_cambio_fuente: 'historico_ars',
                  monto_base: item.monto,
                };
              });

              return sb.from('receipts').insert(receiptRows).select('id, payment_id, codigo').then(function(res5) {
                if (res5.error) throw new Error('Recibos: ' + res5.error.message);

                var updateReceiptPromises = (res5.data || []).map(function(rec) {
                  return sb.from('payments').update({ receipt_id: rec.id }).eq('id', rec.payment_id);
                });

                return Promise.all(updateReceiptPromises).then(function(updateResults) {
                  updateResults.forEach(function(r) {
                    if (r.error) throw new Error('Actualizando recibo en pago: ' + r.error.message);
                  });

                  var allocRows = insertedItems.map(function(item) {
                    return {
                      organization_id: orgId,
                      payment_id:     item.paymentId,
                      installment_id: item.cuota.id,
                      monto_aplicado: item.monto,
                      payment_moneda: 'ARS',
                      installment_moneda: 'ARS',
                      tipo_cambio_pago: 1,
                      tipo_cambio_installment: 1,
                      monto_pago_aplicado: item.monto,
                      monto_aplicado_base: item.monto,
                      monto_cuota_aplicado_base: item.monto,
                    };
                  });
                  var cashRows = insertedItems.map(function(item) {
                    return {
                      organization_id: orgId,
                      tipo:          'Entrada por pago',
                      monto:         item.monto,
                      moneda:        'ARS',
                      tipo_cambio:   1,
                      tipo_cambio_fuente: 'historico_ars',
                      monto_base:    item.monto,
                      client_id:     item.cuota.client_id,
                      operation_id:  item.cuota.operation_id,
                      payment_id:    item.paymentId,
                      credit_card_id: null,
                      descripcion:   item.pago.codigo + ' importado Excel cuota ' + item.pago.numero_cuota + '/' + item.pago.total_cuotas,
                      fecha:         item.fecha_pago,
                    };
                  });

                  return Promise.all([
                    sb.from('payment_allocations').insert(allocRows),
                    sb.from('cash_movements').insert(cashRows),
                  ]).then(function(extraResults) {
                    if (extraResults[0].error) throw new Error('Imputaciones: ' + extraResults[0].error.message);
                    if (extraResults[1].error) throw new Error('Movimientos de caja: ' + extraResults[1].error.message);
                    setImportLog(log);
                    if (onDataChange) onDataChange();
                  });
                });
              });
            });
          });
        });
      });
    }).catch(function(e) {
      setImportError(e.message);
    }).finally(function() {
      setImporting(false);
      setImportStep('');
    });
  }

  // ─── Estilos ─────────────────────────────────────────────────────────────────

  var card = {
    background: 'var(--bg-surface)', borderRadius: 12,
    border: '1px solid var(--border-subtle)',
    boxShadow: '0 1px 4px rgba(15,23,42,0.06)', padding: 24,
  };

  function tabBtn(active) {
    return {
      padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
      fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: 'DM Sans, sans-serif',
      background: active ? '#4f46e5' : 'transparent',
      color: active ? '#fff' : '#64748b', transition: 'all 0.15s',
    };
  }

  var TH = {
    padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap',
  };
  var TD = {
    padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
    borderBottom: '1px solid #f8fafc', fontFamily: 'DM Sans, sans-serif',
  };

  function badge(text, bg, color) {
    return (
      <span style={{fontSize:11, fontWeight:700, padding:'2px 8px',
        borderRadius:99, background:bg, color:color}}>{text}</span>
    );
  }

  // ─── Preview: Clientes ───────────────────────────────────────────────────────

  function PreviewClientes() {
    return (
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              {['Codigo','Nombre','DNI','Telefono','Direccion','Estado'].map(function(h) {
                return <th key={h} style={TH}>{h}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {parsed.clientes.map(function(c, i) {
              return (
                <tr key={i}
                  onMouseEnter={function(e){e.currentTarget.style.background='#f8fafc'}}
                  onMouseLeave={function(e){e.currentTarget.style.background=''}}>
                  <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:12, color:'#6366f1'})}>{c.codigo}</td>
                  <td style={Object.assign({}, TD, {fontWeight:600})}>{c.nombre}</td>
                  <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:12})}>{c.dni || '—'}</td>
                  <td style={TD}>{c.telefono || '—'}</td>
                  <td style={TD}>{c.direccion || '—'}</td>
                  <td style={TD}>{badge('Activo','#dcfce7','#16a34a')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ─── Preview: Operaciones ────────────────────────────────────────────────────

  function PreviewOperaciones() {
    return (
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              {['Codigo','Descripcion','Tipo','Costo','Total','Cuotas','Estado'].map(function(h) {
                return <th key={h} style={TH}>{h}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {parsed.operaciones.map(function(o, i) {
              var esPrestamo = o.tipo === 'Préstamo en efectivo';
              return (
                <tr key={i}
                  onMouseEnter={function(e){e.currentTarget.style.background='#f8fafc'}}
                  onMouseLeave={function(e){e.currentTarget.style.background=''}}>
                  <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:11, color:'#6366f1'})}>{o.codigo}</td>
                  <td style={Object.assign({}, TD, {maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'})} title={o.descripcion}>{o.descripcion}</td>
                  <td style={TD}>{badge(esPrestamo ? 'Prestamo' : 'Venta', esPrestamo ? '#eff6ff' : '#faf5ff', esPrestamo ? '#2563eb' : '#7c3aed')}</td>
                  <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:12})}>{formatCurrency(o.costo_real)}</td>
                  <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:600})}>{formatCurrency(o.total_esperado)}</td>
                  <td style={Object.assign({}, TD, {textAlign:'center'})}>{o.cantidad_cuotas}</td>
                  <td style={TD}>{badge(o.estado, o.estado === 'Completada' ? '#dcfce7' : '#eff6ff', o.estado === 'Completada' ? '#16a34a' : '#2563eb')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ─── Preview: Cuotas ─────────────────────────────────────────────────────────

  function PreviewCuotas() {
    var pagadas    = parsed.cuotas.filter(function(c) { return c.estado === 'Pagada'; }).length;
    var pendientes = parsed.cuotas.filter(function(c) { return c.estado === 'Pendiente'; }).length;
    return (
      <div>
        <div style={{display:'flex', gap:12, marginBottom:16}}>
          <div style={{padding:'8px 16px', background:'#dcfce7', borderRadius:8, fontSize:13, fontWeight:600, color:'#16a34a'}}>
            {pagadas} pagadas
          </div>
          <div style={{padding:'8px 16px', background:'#eff6ff', borderRadius:8, fontSize:13, fontWeight:600, color:'#2563eb'}}>
            {pendientes} pendientes
          </div>
        </div>
        <div style={{overflowX:'auto', maxHeight:380, overflowY:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead style={{position:'sticky', top:0, background:'#fff', zIndex:1}}>
              <tr>
                {['Codigo','Operacion','N°/Total','Vencimiento','Monto','Estado'].map(function(h) {
                  return <th key={h} style={TH}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {parsed.cuotas.map(function(c, i) {
                return (
                  <tr key={i}
                    onMouseEnter={function(e){e.currentTarget.style.background='#f8fafc'}}
                    onMouseLeave={function(e){e.currentTarget.style.background=''}}>
                    <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:11, color:'#6366f1'})}>{c.codigo}</td>
                    <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:11})}>{c._opCodigo}</td>
                    <td style={Object.assign({}, TD, {textAlign:'center'})}>{c.numero_cuota}/{c.total_cuotas}</td>
                    <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:12})}>{c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : '—'}</td>
                    <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:12})}>{formatCurrency(c.monto_programado)}</td>
                    <td style={TD}>{badge(c.estado, c.estado === 'Pagada' ? '#dcfce7' : '#eff6ff', c.estado === 'Pagada' ? '#16a34a' : '#2563eb')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Log de importacion ──────────────────────────────────────────────────────

  function PreviewPagos() {
    var total = (parsed.pagos || []).reduce(function(s, p) { return s + (Number(p.monto) || 0); }, 0);
    return (
      <div>
        <div style={{display:'flex', gap:12, marginBottom:16, flexWrap:'wrap'}}>
          <div style={{padding:'8px 16px', background:'#dcfce7', borderRadius:8, fontSize:13, fontWeight:600, color:'#16a34a'}}>
            {(parsed.pagos || []).length} pagos inferidos
          </div>
          <div style={{padding:'8px 16px', background:'#eff6ff', borderRadius:8, fontSize:13, fontWeight:600, color:'#2563eb'}}>
            Total: {formatCurrency(total)}
          </div>
        </div>
        <div style={{overflowX:'auto', maxHeight:380, overflowY:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead style={{position:'sticky', top:0, background:'#fff', zIndex:1}}>
              <tr>
                {['Pago','Cuota','Operacion','Fecha','Monto','Origen'].map(function(h) {
                  return <th key={h} style={TH}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {(parsed.pagos || []).map(function(p, i) {
                return (
                  <tr key={i}
                    onMouseEnter={function(e){e.currentTarget.style.background='#f8fafc'}}
                    onMouseLeave={function(e){e.currentTarget.style.background=''}}>
                    <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:11, color:'#6366f1'})}>{p.codigo}</td>
                    <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:11})}>{p._cuotaCodigo}</td>
                    <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:11})}>{p._opCodigo}</td>
                    <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:12})}>{p.fecha_pago ? formatDate(p.fecha_pago) : '-'}</td>
                    <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:'#16a34a'})}>{formatCurrency(p.monto)}</td>
                    <td style={Object.assign({}, TD, {fontFamily:'DM Mono,monospace', fontSize:11, color:'#64748b'})}>{p._legacyPagoCodigo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function ImportLog({ log }) {
    var [logTab, setLogTab] = React.useState('clientes');
    var sections = [
      { id: 'clientes',    label: 'Clientes' },
      { id: 'operaciones', label: 'Operaciones' },
      { id: 'cuotas',      label: 'Cuotas' },
      { id: 'pagos',       label: 'Pagos' },
    ];

    function LogRow(props) {
      var bg  = props.type === 'insertado' ? '#f0fdf4' : props.type === 'omitido' ? '#fffbeb' : '#fef2f2';
      var clr = props.type === 'insertado' ? '#16a34a' : props.type === 'omitido' ? '#92400e' : '#dc2626';
      var icon = props.type === 'insertado' ? '✓' : props.type === 'omitido' ? '↩' : '✗';
      return (
        <div style={{display:'flex', alignItems:'center', gap:10, padding:'7px 12px',
          background:bg, borderRadius:6, marginBottom:4}}>
          <span style={{fontSize:13, fontWeight:700, color:clr, minWidth:16, textAlign:'center'}}>{icon}</span>
          <span style={{fontSize:12, fontFamily:'DM Mono,monospace', color:'#6366f1', minWidth:140}}>{props.codigo}</span>
          {props.desc && <span style={{fontSize:12, color:'#374151'}}>{props.desc}</span>}
        </div>
      );
    }

    return (
      <div>
        {/* Resumen */}
        <div style={{display:'flex', gap:12, flexWrap:'wrap', marginBottom:20}}>
          <StatCard icon="👥" label="Clientes insertados"    n={log.clientes.insertados.length} color="#16a34a" bg="#f0fdf4" />
          <StatCard icon="↩" label="Clientes existentes"    n={log.clientes.omitidos.length}   color="#92400e" bg="#fffbeb" />
          <StatCard icon="📋" label="Operaciones insertadas" n={log.operaciones.insertadas.length} color="#16a34a" bg="#f0fdf4" />
          <StatCard icon="↩" label="Operaciones existentes" n={log.operaciones.omitidas.length}   color="#92400e" bg="#fffbeb" />
          <StatCard icon="📅" label="Cuotas insertadas"      n={log.cuotas.insertadas} color="#16a34a" bg="#f0fdf4" />
          <StatCard icon="↩" label="Cuotas existentes"       n={log.cuotas.omitidas}  color="#92400e" bg="#fffbeb" />
          <StatCard icon="$" label="Pagos insertados"          n={log.pagos.insertados.length} color="#16a34a" bg="#f0fdf4" />
          <StatCard icon="-" label="Pagos omitidos"            n={log.pagos.omitidos.length + log.pagos.imputados.length} color="#92400e" bg="#fffbeb" />
          {log.cuotas.sinOp > 0 && (
            <StatCard icon="⚠" label="Cuotas sin operacion" n={log.cuotas.sinOp} color="#dc2626" bg="#fef2f2" />
          )}
          {log.pagos.sinCuota.length > 0 && (
            <StatCard icon="!" label="Pagos sin cuota" n={log.pagos.sinCuota.length} color="#dc2626" bg="#fef2f2" />
          )}
        </div>

        {/* Tabs del log */}
        <div style={{display:'flex', gap:4, marginBottom:14,
          background:'#f8fafc', borderRadius:10, padding:4, width:'fit-content'}}>
          {sections.map(function(s) {
            return (
              <button key={s.id} style={tabBtn(logTab === s.id)} onClick={function(){ setLogTab(s.id); }}>
                {s.label}
              </button>
            );
          })}
        </div>

        {logTab === 'clientes' && (
          <div>
            {log.clientes.insertados.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11, fontWeight:700, color:'#16a34a', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                  Insertados ({log.clientes.insertados.length})
                </div>
                {log.clientes.insertados.map(function(c, i) {
                  return <LogRow key={i} type="insertado" codigo={c.codigo} desc={c.nombre} />;
                })}
              </div>
            )}
            {log.clientes.omitidos.length > 0 && (
              <div>
                <div style={{fontSize:11, fontWeight:700, color:'#92400e', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                  Ya existian — omitidos ({log.clientes.omitidos.length})
                </div>
                {log.clientes.omitidos.map(function(c, i) {
                  return <LogRow key={i} type="omitido" codigo={c.codigo} desc={c.nombre} />;
                })}
              </div>
            )}
            {log.clientes.errores.length > 0 && (
              <div>
                <div style={{fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:6}}>Errores</div>
                {log.clientes.errores.map(function(e, i) {
                  return <LogRow key={i} type="error" codigo="—" desc={e} />;
                })}
              </div>
            )}
            {log.clientes.insertados.length === 0 && log.clientes.omitidos.length === 0 && (
              <div style={{color:'#94a3b8', fontSize:13}}>Sin clientes para mostrar.</div>
            )}
          </div>
        )}

        {logTab === 'operaciones' && (
          <div>
            {log.operaciones.insertadas.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11, fontWeight:700, color:'#16a34a', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                  Insertadas ({log.operaciones.insertadas.length})
                </div>
                {log.operaciones.insertadas.map(function(o, i) {
                  return <LogRow key={i} type="insertado" codigo={o.codigo} />;
                })}
              </div>
            )}
            {log.operaciones.omitidas.length > 0 && (
              <div>
                <div style={{fontSize:11, fontWeight:700, color:'#92400e', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                  Ya existian — omitidas ({log.operaciones.omitidas.length})
                </div>
                {log.operaciones.omitidas.map(function(o, i) {
                  return <LogRow key={i} type="omitido" codigo={o.codigo} desc={o.descripcion} />;
                })}
              </div>
            )}
            {log.operaciones.insertadas.length === 0 && log.operaciones.omitidas.length === 0 && (
              <div style={{color:'#94a3b8', fontSize:13}}>Sin operaciones para mostrar.</div>
            )}
          </div>
        )}

        {logTab === 'cuotas' && (
          <div style={{padding:'16px', background:'#f8fafc', borderRadius:10}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:28, fontWeight:800, color:'#16a34a'}}>{log.cuotas.insertadas}</div>
                <div style={{fontSize:12, color:'#64748b'}}>Insertadas</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:28, fontWeight:800, color:'#92400e'}}>{log.cuotas.omitidas}</div>
                <div style={{fontSize:12, color:'#64748b'}}>Ya existian</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:28, fontWeight:800, color: log.cuotas.sinOp > 0 ? '#dc2626' : '#94a3b8'}}>{log.cuotas.sinOp}</div>
                <div style={{fontSize:12, color:'#64748b'}}>Sin operacion</div>
              </div>
            </div>
          </div>
        )}

        {logTab === 'pagos' && (
          <div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:16}}>
              <div style={{textAlign:'center', padding:'14px 10px', background:'#f0fdf4', borderRadius:10}}>
                <div style={{fontSize:28, fontWeight:800, color:'#16a34a'}}>{log.pagos.insertados.length}</div>
                <div style={{fontSize:12, color:'#64748b'}}>Insertados</div>
              </div>
              <div style={{textAlign:'center', padding:'14px 10px', background:'#fffbeb', borderRadius:10}}>
                <div style={{fontSize:28, fontWeight:800, color:'#92400e'}}>{log.pagos.omitidos.length}</div>
                <div style={{fontSize:12, color:'#64748b'}}>Ya existian</div>
              </div>
              <div style={{textAlign:'center', padding:'14px 10px', background:'#fffbeb', borderRadius:10}}>
                <div style={{fontSize:28, fontWeight:800, color:'#92400e'}}>{log.pagos.imputados.length}</div>
                <div style={{fontSize:12, color:'#64748b'}}>Cuota imputada</div>
              </div>
              <div style={{textAlign:'center', padding:'14px 10px', background:'#fef2f2', borderRadius:10}}>
                <div style={{fontSize:28, fontWeight:800, color: log.pagos.sinCuota.length > 0 ? '#dc2626' : '#94a3b8'}}>{log.pagos.sinCuota.length}</div>
                <div style={{fontSize:12, color:'#64748b'}}>Sin cuota</div>
              </div>
            </div>

            {log.pagos.insertados.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11, fontWeight:700, color:'#16a34a', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                  Insertados ({log.pagos.insertados.length})
                </div>
                {log.pagos.insertados.map(function(p, i) {
                  return <LogRow key={i} type="insertado" codigo={p.codigo} desc={p.desc} />;
                })}
              </div>
            )}
            {(log.pagos.omitidos.length + log.pagos.imputados.length) > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11, fontWeight:700, color:'#92400e', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                  Omitidos ({log.pagos.omitidos.length + log.pagos.imputados.length})
                </div>
                {log.pagos.omitidos.concat(log.pagos.imputados).map(function(p, i) {
                  return <LogRow key={i} type="omitido" codigo={p.codigo} desc={p.desc} />;
                })}
              </div>
            )}
            {log.pagos.sinCuota.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                  Sin cuota ({log.pagos.sinCuota.length})
                </div>
                {log.pagos.sinCuota.map(function(p, i) {
                  return <LogRow key={i} type="error" codigo={p.codigo} desc={p.desc} />;
                })}
              </div>
            )}
            {log.pagos.errores.length > 0 && (
              <div>
                <div style={{fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:6}}>Errores</div>
                {log.pagos.errores.map(function(e, i) {
                  return <LogRow key={i} type="error" codigo="-" desc={e} />;
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function StatCard(props) {
    return (
      <div style={{padding:'10px 16px', background:props.bg, borderRadius:10, textAlign:'center', minWidth:100}}>
        <div style={{fontSize:18}}>{props.icon}</div>
        <div style={{fontSize:22, fontWeight:800, color:props.color}}>{props.n}</div>
        <div style={{fontSize:11, color:'#64748b', marginTop:2, lineHeight:1.3}}>{props.label}</div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{maxWidth:1100, margin:'0 auto'}}>

      {/* Titulo */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22, fontWeight:800, color:'#0f172a', margin:0}}>
          Importar datos desde Excel
        </h1>
        <p style={{fontSize:13, color:'#64748b', marginTop:4}}>
          Migra los datos del Excel anterior al CRM. Los registros ya existentes seran omitidos automaticamente.
        </p>
      </div>

      {/* Zona de archivo */}
      {!importLog && (
        <div style={Object.assign({}, card, {marginBottom:20})}>
          <input ref={fileInputRef} type="file" accept=".xlsx" style={{display:'none'}}
            onChange={handleFileInput} />
          <div
            onClick={function(){fileInputRef.current && fileInputRef.current.click();}}
            onDragOver={function(e){e.preventDefault(); setDragOver(true);}}
            onDragLeave={function(){setDragOver(false);}}
            onDrop={handleDrop}
            style={{
              border: '2px dashed ' + (dragOver ? '#4f46e5' : '#e2e8f0'),
              borderRadius:10, padding:'40px 24px', textAlign:'center', cursor:'pointer',
              background: dragOver ? '#eef2ff' : '#f8fafc', transition:'all 0.15s',
            }}>
            <div style={{fontSize:36, marginBottom:10}}>📊</div>
            {fileInfo ? (
              <div>
                <div style={{fontSize:15, fontWeight:700, color:'#0f172a'}}>{fileInfo.name}</div>
                <div style={{fontSize:12, color:'#94a3b8', marginTop:4}}>
                  {Math.round(fileInfo.size / 1024)} KB · Click para cambiar el archivo
                </div>
              </div>
            ) : (
              <div>
                <div style={{fontSize:15, fontWeight:600, color:'#0f172a'}}>
                  Arrastra el archivo Excel aqui
                </div>
                <div style={{fontSize:13, color:'#64748b', marginTop:4}}>
                  o hace click para seleccionarlo · Solo archivos .xlsx
                </div>
              </div>
            )}
          </div>
          {parseError && (
            <div style={{marginTop:16, padding:'12px 16px', background:'#fef2f2',
              border:'1px solid #fecaca', borderRadius:8, color:'#dc2626', fontSize:13}}>
              {parseError}
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {parsed && !importLog && (
        <div style={Object.assign({}, card, {marginBottom:20})}>
          <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:20, flexWrap:'wrap'}}>
            <span style={{fontSize:14, fontWeight:700, color:'#0f172a'}}>Datos detectados:</span>
            {[
              {label:'Clientes',    n:parsed.clientes.length,    bg:'#eff6ff', color:'#2563eb'},
              {label:'Operaciones', n:parsed.operaciones.length, bg:'#faf5ff', color:'#7c3aed'},
              {label:'Cuotas',      n:parsed.cuotas.length,      bg:'#f0fdf4', color:'#16a34a'},
              {label:'Pagos',       n:(parsed.pagos || []).length, bg:'#ecfdf5', color:'#059669'},
            ].map(function(item) {
              return (
                <div key={item.label} style={{padding:'6px 16px', borderRadius:99,
                  background:item.bg, fontSize:13, fontWeight:700, color:item.color}}>
                  {item.n} {item.label}
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div style={{display:'flex', gap:4, marginBottom:16,
            background:'#f8fafc', borderRadius:10, padding:4, width:'fit-content'}}>
            {[
              {id:'clientes',    label:'Clientes (' + parsed.clientes.length + ')'},
              {id:'operaciones', label:'Operaciones (' + parsed.operaciones.length + ')'},
              {id:'cuotas',      label:'Cuotas (' + parsed.cuotas.length + ')'},
              {id:'pagos',       label:'Pagos (' + (parsed.pagos || []).length + ')'},
            ].map(function(t) {
              return (
                <button key={t.id} style={tabBtn(tab === t.id)} onClick={function(){setTab(t.id);}}>
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === 'clientes'    && <PreviewClientes />}
          {tab === 'operaciones' && <PreviewOperaciones />}
          {tab === 'cuotas'      && <PreviewCuotas />}
          {tab === 'pagos'       && <PreviewPagos />}

          {/* Advertencia y confirmacion */}
          <div style={{marginTop:24, padding:'14px 18px', background:'#fffbeb',
            border:'1px solid #fcd34d', borderRadius:10}}>
            <div style={{fontSize:13, fontWeight:600, color:'#92400e', marginBottom:8}}>
              Antes de importar
            </div>
            <ul style={{fontSize:13, color:'#78350f', paddingLeft:18, lineHeight:1.8}}>
              <li>Esta accion inserta los datos directamente en Supabase.</li>
              <li>Los registros ya existentes seran omitidos automaticamente (no se duplican).</li>
              <li>Los pagos historicos se infieren desde cuotas Cancelado del Excel.</li>
            </ul>
            <label style={{display:'flex', alignItems:'center', gap:8, marginTop:12, cursor:'pointer'}}>
              <input type="checkbox" checked={confirmed}
                onChange={function(e){setConfirmed(e.target.checked);}}
                style={{width:16, height:16, accentColor:'#4f46e5'}} />
              <span style={{fontSize:13, fontWeight:600, color:'#0f172a'}}>
                Entiendo, quiero importar los datos
              </span>
            </label>
          </div>

          <div style={{marginTop:20, display:'flex', gap:12}}>
            <Btn onClick={handleImport} disabled={!confirmed || importing || !hp('import.run')}>
              {importing ? (importStep || 'Importando...') : ('Importar ' + parsed.clientes.length + ' clientes')}
            </Btn>
            <Btn variant="ghost" onClick={function(){setParsed(null); setFileInfo(null); setConfirmed(false); setImportLog(null);}}>
              Cancelar
            </Btn>
          </div>

          {importError && (
            <div style={{marginTop:16, padding:'12px 16px', background:'#fef2f2',
              border:'1px solid #fecaca', borderRadius:8, color:'#dc2626', fontSize:13}}>
              {importError}
            </div>
          )}
        </div>
      )}

      {/* Log de importacion */}
      {importLog && (
        <div style={Object.assign({}, card, {marginBottom:20})}>
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
            <span style={{fontSize:28}}>✅</span>
            <div>
              <h2 style={{fontSize:18, fontWeight:800, color:'#0f172a', margin:0}}>
                Importacion completada
              </h2>
              <p style={{fontSize:13, color:'#64748b', margin:'2px 0 0'}}>
                Revisa el detalle de que se importo y que se omitio por ya existir.
              </p>
            </div>
          </div>

          <ImportLog log={importLog} />

          <div style={{marginTop:24, display:'flex', gap:12}}>
            <Btn onClick={function(){window.location.reload();}}>
              Recargar app
            </Btn>
            <Btn variant="ghost" onClick={function(){setImportLog(null); setParsed(null); setFileInfo(null); setConfirmed(false);}}>
              Importar otro archivo
            </Btn>
          </div>
        </div>
      )}

    </div>
  );
}

Object.assign(window, { ImportarDatosScreen });
