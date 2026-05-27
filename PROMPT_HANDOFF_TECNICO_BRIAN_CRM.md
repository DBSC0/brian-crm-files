# Prompt de handoff tecnico para Brian CRM

Copiar y pegar el siguiente prompt completo en ChatGPT cuando necesites que entienda el sistema, analice cambios o ayude a modificar el CRM.

```text
Actua como desarrollador senior que recibe este handoff del CRM Brian CRM. Tu tarea es entender profundamente el sistema antes de responder, proponer cambios o escribir codigo. No asumas que es un CRM generico: es una aplicacion financiera operativa para administrar clientes, operaciones financiadas, cuotas, pagos, recibos, mora, caja, tarjetas de credito, reportes, configuracion e importacion de datos desde Excel.

Quiero que trabajes con criterio conservador: manten la arquitectura existente, respeta los flujos financieros, cuida la integridad de cuotas/pagos/recibos/caja/tarjetas, y antes de tocar datos historicos o reglas que puedan recalcular importes, pide confirmacion explicita.

## 1. Objetivo del sistema

Brian CRM es un sistema de gestion financiera personal/operativa para Brian Facciano. El sistema centraliza:

- Clientes y sus datos de contacto, riesgo, estado, notas, archivos y referencias.
- Operaciones financieras: prestamos en efectivo, ventas financiadas, compras con tarjeta u otros acuerdos financiados.
- Cronogramas de cuotas mensuales por operacion.
- Registro de pagos, imputacion a cuotas, recibos y anulaciones.
- Seguimiento de mora, vencimientos proximos y clientes atrasados.
- Caja: entradas, salidas, saldo neto, capital pendiente, compromisos de tarjetas y movimientos manuales.
- Tarjetas de credito: limites, movimientos vinculados a operaciones, resumenes mensuales y pagos de resumenes.
- Reportes financieros de cartera, mes, clientes, mora, caja y tarjetas.
- Configuracion de tasas, metodos de pago, datos del prestamista, parametros financieros y plantillas de WhatsApp.
- Importacion desde Excel del sistema anterior, con deteccion de duplicados e importacion de pagos historicos inferidos.

El CRM no es solo un panel visual: sus acciones cambian datos contables y financieros relacionados. Cada operacion puede crear cuotas, comprobantes internos, movimientos de caja y movimientos de tarjeta. Cada pago puede modificar varias cuotas, generar recibo, registrar caja y crear imputaciones. Cada anulacion debe revertir correctamente esos efectos.

## 2. Stack y arquitectura real

La app esta construida de forma simple, sin bundler moderno:

- Frontend principal en `index.html`.
- React 18 cargado por CDN en modo UMD.
- ReactDOM cargado por CDN.
- Babel Standalone cargado por CDN para ejecutar JSX directamente en navegador con `type="text/babel"`.
- Supabase JS cargado por CDN antes de React.
- `components/supabase-client.js` inicializa `window.__supabase`. Ese archivo contiene la URL y publishable/anon key del proyecto, pero no debes exponer ni repetir esos valores en respuestas.
- SheetJS se carga desde `node_modules/xlsx/dist/xlsx.full.min.js` para importar Excel localmente.
- `html2pdf.js` se carga por CDN para exportar recibos y comprobantes internos a PDF.
- Los componentes y pantallas JSX se cargan como scripts desde `components/*.jsx` y `screens/*.jsx`.
- El estado principal vive en React dentro de `App` en `index.html`.
- El backend persistente es Supabase/Postgres.
- Hay scripts `.bat` para uso local, tunnel y publicacion.
- Hay app de escritorio con Electron.
- Hay preparacion Android con Capacitor.

No introduzcas Vite, Webpack, TypeScript, router, Redux, Tailwind u otra arquitectura nueva salvo que el usuario lo pida explicitamente. La app actual depende de variables globales y componentes registrados en `window`.

### Archivos principales

- `index.html`: entrada principal, carga scripts, helpers globales, mapeo camelCase/snake_case, carga inicial de Supabase, estado global, navegacion y render de pantallas.
- `components/supabase-client.js`: inicializacion del cliente Supabase en `window.__supabase`; no repetir credenciales.
- `components/Layout.jsx`: sidebar, header, busqueda global, boton de privacidad y layout general.
- `components/UI.jsx`: modal, campos, inputs, botones, tabs, cards, KPI cards, tablas, filtros, confirm modal, WhatsApp button.
- `components/StatusBadge.jsx`: colores de estados y riesgos.
- `screens/Dashboard.jsx`: resumen financiero, alertas, vencimientos, mora, tarjetas proximas y actividad reciente.
- `screens/Clientes.jsx`: ABM de clientes, ficha completa, notas, archivos mock, acciones, balances.
- `screens/Operaciones.jsx`: creacion/edicion/detalle/eliminacion de operaciones, cuotas, comprobantes internos, tarjeta/caja.
- `screens/CuotasPagosRecibos.jsx`: pantalla de cuotas, registro/anulacion de pagos, recibos y PDF.
- `screens/Tarjetas.jsx`: tarjetas, movimientos, limites, resumenes mensuales y pago/desmarcado de resumenes.
- `screens/CajaMora.jsx`: caja y mora.
- `screens/Reportes.jsx`: reportes de cartera, mensual, por cliente, mora, caja y tarjetas.
- `screens/Configuracion.jsx`: configuracion persistida en `app_settings`.
- `screens/ImportarDatos.jsx`: importacion desde Excel.
- `data/mockData.js` y `data/helpers.js`: datos/helpers historicos o de referencia; la app real carga Supabase desde `index.html`.
- `electron/main.js`: app Electron, splash, servidor local Express y actualizador.
- `electron/updater.js`: baja archivos desde GitHub si `version.txt` remoto es mayor.
- `electron/preload.js`: expone `electronAPI.platform`.
- `package.json`: scripts de start/server/build/android.
- `electron-builder.yml`: build Windows NSIS.
- `capacitor.config.json`: configuracion Android.
- `abrir-crm.bat`, `cerrar-crm.bat`, `tunnel-abrir.bat`, `tunnel-cerrar.bat`, `publicar-update.bat`: scripts operativos.

## 3. Carga de datos y estado global

En `index.html`, `loadAllData()` carga en paralelo desde Supabase estas tablas:

- `clients`
- `operations`
- `installments`
- `payments`
- `payment_allocations`
- `receipts`
- `internal_operation_vouchers`
- `credit_cards`
- `credit_card_movements`
- `cash_movements`
- `client_notes`
- `attachments`
- `app_settings`
- `credit_card_statement_payments`

La app espera un unico objeto `appData` con estas claves en camelCase:

- `settings`
- `clients`
- `operations`
- `installments`
- `payments`
- `paymentAllocations`
- `receipts`
- `internalOperationVouchers`
- `creditCards`
- `creditCardMovements`
- `creditCardStatementPayments`
- `cashMovements`
- `clientNotes`
- `attachments`

Hay conversion entre snake_case de Postgres y camelCase de React:

- `KEY_MAP` mapea columnas snake_case a propiedades camelCase.
- `KEY_MAP_REVERSE` permite convertir en sentido inverso.
- `toCamel(row)` convierte una fila.
- `rowsToCamel(rows)` convierte arrays.
- `toSnake(obj)` convierte payloads antes de escribir en Supabase.

Regla critica: no rompas ni dupliques el mapeo `toCamel/toSnake`. Si agregas columnas nuevas en Supabase o en componentes, actualiza ese mapeo si el nombre cambia entre snake_case y camelCase.

`App` mantiene:

- `appData`: datos cargados.
- `loadError`: errores de carga desde Supabase.
- `nav`: pantalla actual, id de detalle, modal y extras.
- `privacyHidden`: modo de privacidad que oculta importes/numeros sensibles, persistido en `localStorage` bajo `crm-privacy-hidden`.

La navegacion no usa React Router. Se usa un objeto `nav` y un `switch` en `renderScreen()`.

Pantallas principales del menu:

- `dashboard`
- `clientes`
- `operaciones`
- `cuotas`
- `pagos`
- `recibos`
- `tarjetas`
- `caja`
- `mora`
- `reportes`
- `configuracion`
- `importar`

Tambien existe una ruta interna `comprobantes` para previsualizar comprobantes internos.

## 4. Modelo de datos conceptual

### Clientes (`clients`)

Representan personas/clientes con datos operativos:

- `id`
- `codigo`
- `nombre`
- `dni`
- `telefono`
- `telefonoSecundario`
- `direccion`
- `ciudad`
- `barrio` o `referencia` segun flujo
- `estado`: Activo, Moroso, Bloqueado, Inactivo
- `riesgo`: Bajo, Medio, Alto
- `notas`
- `createdAt`

Un cliente puede tener operaciones, cuotas, pagos, recibos, comprobantes internos, notas y archivos.

No se debe eliminar un cliente con operaciones registradas. La UI lo bloquea. Si se elimina un cliente sin operaciones, antes borra `client_notes` y `attachments` asociados.

### Operaciones (`operations`)

Representan acuerdos financiados:

- `id`
- `codigo`
- `clientId`
- `tipo`: Prestamo en efectivo, Venta financiada, Compra con tarjeta, Otro
- `descripcion`
- `costoReal`
- `montoPactado`
- `entrega`
- `montoFinanciado`
- `cantidadCuotas`
- `tasaInteres`
- `interesCalculado`
- `totalFinanciado`
- `valorCuota`
- `totalEsperado`
- `gananciaEsperada`
- `fuenteFinanciacion`: Efectivo, Tarjeta de credito u otra fuente usada por la UI
- `creditCardId` si la fuente es tarjeta
- `fechaInicio`
- `primerVencimiento`
- `estado`: Activa, Completada, Anulada, Refinanciada
- `notas`

Cada operacion genera cuotas (`installments`). Tambien genera un comprobante interno (`internal_operation_vouchers`) y un movimiento de caja (`cash_movements`). Si fue financiada con tarjeta, genera movimiento de tarjeta (`credit_card_movements`).

### Cuotas (`installments`)

Representan vencimientos del cronograma:

- `id`
- `codigo`
- `operationId`
- `clientId`
- `numeroCuota`
- `totalCuotas`
- `fechaVencimiento`
- `montoProgramado`
- `montoPagado`
- `saldoPendiente`
- `moraAplicada`
- `estado`: Pendiente, Parcial, Pagada, Vencida, Refinanciada, Anulada

Los pagos pueden imputarse a una o varias cuotas. El estado se actualiza segun monto pagado, saldo pendiente y vencimiento.

### Pagos (`payments`)

Representan cobros del cliente:

- `id`
- `codigo`
- `clientId`
- `fechaPago`
- `monto`
- `metodoPago`
- `notas`
- `receiptId`

Registrar un pago debe:

- crear el pago,
- crear recibo,
- crear imputaciones en `payment_allocations`,
- actualizar cuotas,
- crear movimiento de caja positivo.

Anular un pago o recibo usa RPC y debe revertir cuotas, imputaciones, recibo/pago y caja.

### Imputaciones (`payment_allocations`)

Vinculan pagos con cuotas:

- `id`
- `paymentId`
- `installmentId`
- `montoAplicado`

Son fundamentales para saber que cuotas cancelo o abono un pago y para mostrar detalle en recibos.

### Recibos (`receipts`)

Documentan pagos:

- `id`
- `codigo`
- `paymentId`
- `clientId`
- `numero`
- `estado`: Emitido o Anulado
- `fecha`

`ReceiptPreview` muestra el recibo, detalle de cuotas canceladas/abonadas, saldo y permite imprimir/descargar PDF con `html2pdf`. Tambien permite anular recibo, que en realidad llama a `reverse_payment` usando `receipt.paymentId`.

### Comprobantes internos (`internal_operation_vouchers`)

Documentan internamente una operacion. No son contrato ni documento legal. Se generan con la operacion.

Campos importantes:

- `id`
- `codigo`
- `operationId`
- `clientId`
- `estado`
- `fecha`

`InternalVoucherPreview` muestra datos del cliente, datos de la operacion, cuotas y permite imprimir/descargar PDF.

### Tarjetas (`credit_cards`)

Representan tarjetas usadas para financiar compras:

- `id`
- `nombre`
- `banco`
- `titular`
- `ultimosDigitos`
- `limiteTotal`
- `limiteDisponibleEstimado`
- `diaCierre`
- `diaVencimiento`
- `moneda`
- `estado`: Activa, Suspendida, Cancelada
- `notas`

No se debe eliminar una tarjeta con movimientos registrados.

### Movimientos de tarjeta (`credit_card_movements`)

Representan compras o gastos cargados a tarjetas, normalmente asociados a operaciones:

- `id`
- `creditCardId`
- `operationId`
- `clientId`
- `fechaCompra`
- `descripcion`
- `monto`
- `cuotasTarjeta`
- `cuotaActualTarjeta`
- `fechaCierreEstimada`
- `fechaVencimientoEstimada`
- `estado`

La operacion financiada con tarjeta crea movimiento con monto igual al `costoReal` y cuotas de tarjeta indicadas.

### Pagos de resumen de tarjeta (`credit_card_statement_payments`)

Registran que un periodo mensual de tarjeta fue pagado:

- `creditCardId`
- `año`
- `mes`
- `fechaPago`

La UI calcula resumenes mensuales dinamicamente desde movimientos activos. Cada resumen acumula `monto / cuotasTarjeta` por movimiento y por periodo. Si el periodo fue marcado como pagado, ese monto se suma a `totalPagado` de la tarjeta y libera disponible en el calculo.

### Caja (`cash_movements`)

Representa movimientos de dinero:

- `id`
- `tipo`
- `monto` positivo o negativo
- `clientId`
- `operationId`
- `paymentId`
- `creditCardId`
- `descripcion`
- `fecha`

Tipos usados por la UI:

- Salida por prestamo
- Salida por compra de producto
- Entrada por pago
- Entrada por anticipo
- Salida por pago de tarjeta
- Gasto
- Ajuste manual

La pantalla Caja calcula entradas, salidas, saldo neto, capital en la calle, ganancia cobrada y compromiso de tarjetas.

### Notas (`client_notes`)

Historial interno de contacto o seguimiento:

- `id`
- `clientId`
- `operationId`
- `tipo`
- `contenido`
- `fecha`
- `recordatorio`

Tipos habituales: WhatsApp, Llamada, Promesa de pago, Observacion interna, Problema.

### Archivos (`attachments`)

Adjuntos mock o referencias:

- `id`
- `clientId`
- `operationId`
- `paymentId`
- `creditCardMovementId`
- `tipo`
- `nombreArchivo`
- `urlMock`
- `descripcion`
- `fecha`

Actualmente la UI muestra archivos y botones mock para subir, pero no implementa storage real completo.

### Configuracion (`app_settings`)

La fila `id = 1` guarda configuracion en JSON/campos:

- `tasasPorCuotas`
- `metodosPago`
- `estadosCliente`
- `estadosOperacion`
- `estadosCuota`
- `estadosTarjeta`
- `tiposOperacion`
- `datosPrestamista`
- `plantillasWhatsapp`
- `parametrosFinancieros`

`ConfiguracionScreen` edita y hace `upsert` de esa fila.

## 5. Reglas financieras y helpers

### Moneda y formato

- La app trabaja principalmente en ARS.
- `formatCurrencyRaw(amount)` formatea ARS sin ocultar.
- `formatCurrency(amount)` respeta modo privacidad y puede devolver `$ ******`.
- `formatDate(dateStr)` espera `YYYY-MM-DD` y devuelve `DD/MM/YYYY`.

### Modo privacidad

Hay modo privacidad global:

- `window.CRM_PRIVACY_HIDE_NUMBERS`
- `isPrivacyHidden()`
- `maskSensitiveNumber(value, suffix)`
- `maskSensitiveText(value)`
- `formatCurrency()`

Por defecto el sistema arranca ocultando cifras si no hay preferencia guardada. Se guarda en `localStorage`. Muchas KPIs, tablas y textos usan estos helpers para esconder montos, porcentajes, cantidades y textos con numeros.

No elimines este comportamiento al modificar vistas.

### Calculo de operacion

`calculateOperationTotals(costoReal, montoPactado, entrega, cuotas, tasa)` calcula:

- `montoFinanciado = montoPactado - entrega`
- `interesCalculado = montoFinanciado * tasa / 100`
- `totalFinanciado = montoFinanciado + interesCalculado`
- `valorCuota = ceil(totalFinanciado / cuotas)`
- `totalEsperado = entrega + totalFinanciado`
- `gananciaEsperada = totalEsperado - costoReal`

El cronograma de cuotas divide el total financiado por cantidad de cuotas. Cuando hay redondeo, la ultima cuota absorbe diferencias/resto.

### Balance de cliente

`calculateClientBalance(clientId, installments, payments, operations)` calcula:

- total pactado,
- saldo pendiente,
- total pagado,
- monto vencido,
- capital invertido,
- ganancia esperada,
- operaciones activas,
- proxima cuota pendiente,
- ultimo pago.

Este helper se usa en listados y fichas. No duplicar logica salvo que sea inevitable.

### Dashboard

`getDashboardMetrics(clients, operations, installments, payments, creditCards, creditCardMovements)` calcula:

- capital invertido,
- total esperado,
- saldo pendiente,
- monto vencido,
- clientes en mora,
- cobrado este mes,
- ganancia esperada,
- ganancia realizada,
- capital efectivo,
- capital tarjeta,
- proximos vencimientos a 15 dias,
- cuotas vencidas.

El Dashboard tambien agrupa clientes en mora, pagos recientes y tarjetas proximas a vencer.

### Mora

`calculateOverdueDays(fechaVencimiento)` compara contra fecha actual y devuelve dias positivos de atraso o 0.

Una cuota esta en mora si:

- `fechaVencimiento < hoy`
- `saldoPendiente > 0`

MoraScreen filtra por cliente y rangos:

- 1 a 7 dias
- 8 a 15 dias
- 16 a 30 dias
- mas de 30 dias

Muestra total vencido, clientes en mora, cuotas vencidas, promedio de dias de atraso, ultimo contacto y acciones WhatsApp/pago.

## 6. Modulos de UI

### Layout y busqueda global

`AppLayout` contiene:

- Sidebar colapsable con navegacion.
- Header con busqueda global.
- Acciones rapidas: nuevo cliente, nueva operacion, nuevo pago.
- Boton de privacidad en el usuario.

La busqueda global encuentra:

- clientes por nombre, DNI, telefono o codigo;
- operaciones por codigo o descripcion;
- cuotas por codigo;
- tarjetas por nombre, ultimos digitos o banco.

`DataTable` soporta:

- ordenamiento por columna;
- ancho de columnas ajustable;
- persistencia de sort/ancho en `localStorage` si tiene `tableId`;
- render custom por columna;
- estilo de fila;
- empty state.

### Dashboard

Muestra resumen financiero con tarjetas grandes:

- pendiente de cobro,
- capital invertido,
- ganancia esperada,
- cobrado este mes,
- clientes en mora,
- capital por efectivo/tarjeta,
- alertas.

Permite personalizar/ocultar tarjetas de resumen. Esa configuracion se guarda en `localStorage` como `crm-dashboard-layout`.

Tambien muestra:

- proximos vencimientos a 15 dias,
- clientes en mora agrupados,
- tarjetas proximas a vencer,
- actividad reciente de pagos.

### Clientes

`ClientesScreen`:

- Lista clientes.
- Busca por nombre, DNI, telefono o codigo.
- Filtra por estado y riesgo.
- Permite crear/editar cliente.
- Acciones: editar, crear operacion preseleccionando cliente, WhatsApp.
- Muestra columnas de saldo pendiente y vencido calculadas con `calculateClientBalance`.

`ClienteFormModal`:

- Formatea DNI.
- Formatea telefono.
- Requiere nombre, DNI y telefono.
- Maneja estado y riesgo con selector segmentado.
- Incluye referencia, direccion, ciudad y notas.

`ClienteDetalleScreen`:

- Muestra ficha completa del cliente.
- Tabs: Resumen, Operaciones, Cuotas, Pagos, Recibos, Comprobantes, Notas, Archivos.
- Calcula balance, mora, operaciones activas, ganancia obtenida, proxima cuota.
- Acciones: WhatsApp, editar, nueva operacion, registrar pago, nueva nota.
- Permite agregar notas en `client_notes`.
- Muestra archivos asociados pero la subida es mock.
- Permite eliminar cliente solo si no tiene operaciones. Al eliminar borra notas y archivos relacionados.

### Operaciones

`OperacionesScreen`:

- Lista operaciones.
- Filtra por estado, tipo, fuente de financiacion y cliente.
- Boton para nueva operacion.
- Puede abrir modal nueva operacion desde navegacion con cliente preseleccionado.
- Al guardar consulta codigos actuales para evitar duplicados y genera codigos secuenciales:
  - operaciones: `OP-###`
  - cuotas: `CUO-###`
  - comprobantes: `COMP-###`

`NuevaOperacionModal`:

- Sirve para crear y editar operaciones.
- Es un flujo por pasos.
- Datos principales: cliente, tipo, descripcion, costo real, monto pactado, entrega, cantidad de cuotas, tasa, vencimientos, fuente, tarjeta, notas.
- Puede usar tasas desde configuracion por cantidad de cuotas.
- Permite tasa manual y redondeo de cuotas.
- Genera cronograma de cuotas.
- Si la fuente es tarjeta de credito, exige tarjeta activa y permite configurar fecha de compra y cuotas de tarjeta.
- Muestra resumen de calculo antes de confirmar.

Crear operacion:

- Usa RPC `create_operation`.
- Envia:
  - `p_operation`
  - `p_installments`
  - `p_cash_movement`
  - `p_voucher`
  - `p_cc_movement`
- Despues recarga operations, installments, cash_movements, internal_operation_vouchers y credit_card_movements.

Editar operacion:

- Si la operacion tiene pagos, hace edicion parcial: actualiza campos de operacion que no reconstruyen cuotas/imputaciones y reemplaza movimientos de tarjeta para que coincidan con fuente.
- Si no tiene pagos, puede hacer actualizacion completa con RPC `update_operation`, reconstruyendo cuotas, caja y tarjeta.
- Esto es critico: no recalcular o borrar cuotas de operaciones con pagos historicos sin confirmacion.

Eliminar operacion:

- Si tiene pagos, la UI bloquea y pide anular pagos primero.
- Si no tiene pagos, usa RPC `delete_operation`.
- Debe eliminar cuotas, comprobante, caja y movimientos de tarjeta asociados.

`OperacionDetalleScreen`:

- Muestra resumen, cuotas, pagos y comprobante interno.
- Calcula total pagado por imputaciones, saldo pendiente, cuotas pagadas/pendientes/vencidas, progreso y ganancia obtenida estimada.
- Acciones: registrar pago, ver comprobante, subir comprobante mock, editar, eliminar.

`InternalVoucherPreview`:

- Documento interno de control administrativo.
- No constituye contrato ni documento legal.
- Muestra datos de cliente, operacion, resumen financiero y cronograma de cuotas.
- Permite imprimir y descargar PDF con `html2pdf`.

### Cuotas

`CuotasScreen`:

- Lista cuotas.
- Por defecto oculta pagadas, salvo que se active mostrar pagadas.
- Filtra por estado, cliente y operacion.
- Muestra KPIs: total saldo, pendientes, vencidas, parciales.
- Colorea filas vencidas/proximas segun urgencia.
- Permite navegar a cliente u operacion desde fila.

### Pagos

`RegistrarPagoModal`:

- Permite elegir cliente, fecha, monto, metodo, notas e imputacion.
- Carga cuotas pendientes del cliente.
- Imputacion automatica: aplica el monto a cuotas pendientes en orden de vencimiento hasta agotar el pago.
- Calcula `p_allocations` y `p_installment_updates`.
- Usa RPC `register_payment`.
- Envia:
  - `p_payment`
  - `p_receipt`
  - `p_allocations`
  - `p_installment_updates`
  - `p_cash_movement`
- Al terminar, `PagosScreen` recarga payments, receipts, payment_allocations, installments y cash_movements.

`PagosScreen`:

- Lista pagos.
- Filtra por metodo y cliente.
- Muestra KPIs: total cobrado, pagos registrados, este mes.
- Acciones por pago: ver recibo, anular.
- Anular pago usa RPC `reverse_payment`.

Regla critica: nunca anules un pago solo eliminando la fila `payments`; la anulacion debe revertir cuotas, imputaciones, recibo y caja.

### Recibos

`RecibosScreen`:

- Lista recibos.
- Filtra por cliente.
- Puede abrir directo un recibo por id.
- Muestra KPIs: recibos emitidos, total documentado, anulados.

`ReceiptPreview`:

- Muestra recibo con numero, codigo, cliente, pago, metodo, fecha, estado y detalle de cuotas imputadas.
- Calcula saldo del cliente.
- Permite imprimir y descargar PDF.
- Permite anular recibo. La anulacion llama a `reverse_payment` con `receipt.paymentId`.

### Tarjetas

`TarjetasScreen`:

- Muestra tarjetas como cards visuales.
- Calcula disponible real/dinamico con `computeDisponible`.
- Muestra movimientos de tarjeta.
- Permite crear tarjeta.
- Permite editar movimientos de tarjeta.

`computeBillingPeriods(card, movements)`:

- Toma movimientos activos de una tarjeta.
- Divide cada movimiento en cuotas de tarjeta: `monto / cuotasTarjeta`.
- Determina periodo mensual segun fecha de compra y dia de cierre.
- Si la compra cae despues del dia de cierre, la primera cuota pasa al mes siguiente.
- Cada periodo tiene `year`, `month`, `fechaVencimiento`, `monto` y detalle de cuotas.

`computeDisponible(card, movements, stmtPayments)`:

- Calcula:
  - `totalCargado`: suma de movimientos activos de la tarjeta.
  - `totalPagado`: suma de periodos marcados como pagados.
  - `disponible = limiteTotal - totalCargado + totalPagado`.

`TarjetaDetalleScreen`:

- Muestra datos de tarjeta, KPIs, movimientos, operaciones asociadas y resumenes.
- Permite editar tarjeta.
- Permite eliminar solo si no tiene movimientos.
- Permite marcar/desmarcar resumen mensual como pagado usando `credit_card_statement_payments`.
- Al marcar pagado hace upsert con conflicto `credit_card_id,año,mes`.

### Caja

`CajaScreen`:

- KPIs:
  - total entradas,
  - total salidas,
  - saldo neto,
  - capital en la calle,
  - ganancia cobrada,
  - compromiso tarjetas.
- Lista `cash_movements`.
- Filtra por tipo.
- Permite nuevo movimiento manual.
- Si el tipo comienza con "Salida" o es "Gasto", el monto se guarda negativo; otros tipos se guardan positivo.

La caja es una consecuencia de operaciones y pagos. Si modificas flujos, asegurate de mantener caja sincronizada.

### Mora

`MoraScreen`:

- Muestra cuotas vencidas con saldo pendiente.
- Calcula total vencido, cantidad de clientes en mora, cantidad de cuotas vencidas y promedio de dias atraso.
- Filtra por cliente y rango de atraso.
- Muestra cliente, operacion, cuota, fecha vencida, dias de atraso, monto original, pagado, saldo vencido, ultimo contacto.
- Acciones: WhatsApp con mensaje prearmado y registrar pago.

### Reportes

`ReportesScreen` tiene tabs:

- Cartera
- Mensual
- Por cliente
- Mora
- Caja
- Tarjetas

Cartera:

- Capital invertido.
- Total financiado.
- Total esperado.
- Saldo pendiente.
- Saldo vencido.
- Saldo al dia.
- Ganancia esperada.
- Ganancia realizada.
- Distribucion por tipo de operacion.
- Estado de cuotas.

Mensual:

- Operaciones nuevas del mes.
- Clientes nuevos del mes.
- Cobrado en el mes.
- Vencimientos del mes.
- Mora del mes.
- Cobros mensuales ultimos 6 meses.

Por cliente:

- Estado.
- Cantidad de operaciones.
- Pagado.
- Pendiente.
- Vencido.
- Promedio dias atraso.

Mora:

- Total vencido.
- Cuotas vencidas.
- Clientes en mora.
- Rangos de atraso.

Caja:

- Entradas.
- Salidas.
- Saldo neto.
- Movimientos por tipo.

Tarjetas:

- Total usado.
- Movimientos.
- Operaciones.
- Recuperado.
- Pendiente.
- Estado.

### Configuracion

`ConfiguracionScreen` edita `app_settings` con tabs:

- Tasas
- Metodos de pago
- Mis datos
- Parametros
- WhatsApp
- Seguridad

Tasas:

- Array `tasasPorCuotas`.
- Cada fila tiene cuotas, tasa, activa, desde, hasta.

Metodos:

- Lista editable de `metodosPago`.

Mis datos:

- `datosPrestamista.nombre`
- `datosPrestamista.telefono`
- `datosPrestamista.direccion`
- `datosPrestamista.textoRecibos`
- `datosPrestamista.textoComprobantes`

Parametros:

- moneda,
- dias de gracia,
- permitir pagos parciales,
- permitir sobrepagos,
- permitir condonaciones,
- interes por mora activo.

WhatsApp:

- Plantillas con variables:
  - `{cliente}`
  - `{monto}`
  - `{cuota}`
  - `{fecha}`
  - `{operacion}`
  - `{saldo}`

Guardar hace `upsert` en `app_settings` con `id: 1`.

### Importar Excel

`ImportarDatosScreen` importa datos desde un `.xlsx` anterior.

Usa SheetJS (`window.XLSX`). La pantalla:

- acepta drag and drop o seleccion de archivo;
- solo acepta `.xlsx`;
- parsea hoja `Clientes`;
- busca encabezados como `Nombre completo`;
- para cada cliente busca una hoja por codigo;
- parsea operaciones y cuotas desde hojas individuales;
- traduce codigos heredados al formato del CRM;
- infiere pagos historicos desde cuotas con estado legacy `Cancelado`;
- muestra preview por tabs: clientes, operaciones, cuotas, pagos;
- exige checkbox de confirmacion antes de importar;
- detecta duplicados por codigos existentes;
- inserta clientes, operaciones, cuotas, pagos, recibos, imputaciones y movimientos de caja;
- muestra log final de insertados, omitidos, errores, pagos sin cuota y cuotas sin operacion.

Importante:

- Los registros existentes se omiten automaticamente.
- Los pagos historicos se infieren desde cuotas canceladas.
- Despues de importar se sugiere recargar la app.
- La importacion escribe directamente en Supabase.

## 7. RPCs de Supabase

La app depende de funciones RPC en Supabase. No reemplaces estas operaciones por inserts/deletes sueltos salvo que implementes logicamente lo mismo con seguridad transaccional.

### `create_operation`

Usada al crear operacion.

Parametros:

- `p_operation`
- `p_installments`
- `p_cash_movement`
- `p_voucher`
- `p_cc_movement`

Debe crear operacion, cuotas, movimiento de caja, comprobante interno y opcionalmente movimiento de tarjeta.

### `update_operation`

Usada al editar una operacion sin pagos, cuando se puede reconstruir cuotas.

Parametros:

- `p_operation_id`
- `p_operation`
- `p_installments`
- `p_cash_movement`
- `p_cc_movement`

Debe actualizar operacion y reconstruir dependencias sin romper integridad.

### `delete_operation`

Usada al eliminar operacion sin pagos.

Parametro:

- `p_operation_id`

Debe eliminar dependencias: cuotas, caja, comprobantes y movimientos de tarjeta asociados.

### `register_payment`

Usada al registrar pago.

Parametros:

- `p_payment`
- `p_receipt`
- `p_allocations`
- `p_installment_updates`
- `p_cash_movement`

Debe crear pago, recibo, imputaciones, actualizar cuotas y crear caja.

### `reverse_payment`

Usada al anular pago o recibo.

Parametro:

- `p_payment_id`

Debe revertir pago de forma integral: cuotas, imputaciones, recibo y caja.

## 8. Despliegue, escritorio, Android y actualizaciones

### Scripts npm

`package.json` define:

- `npm start`: abre Electron.
- `npm run server`: sirve el repo con `npx serve . -l 6767`.
- `npm run build`: build Windows x64 con electron-builder.
- `npm run android:prepare`: copia `index.html`, `components`, `screens` y `data` a `www`.
- `npm run android:sync`: prepara y sincroniza Capacitor Android.
- `npm run android:open`: abre proyecto Android.

Dependencias:

- `electron`
- `electron-builder`
- `express`
- `@capacitor/core`
- `@capacitor/cli`
- `@capacitor/android`

### Electron

`electron/main.js`:

- Crea splash sin marco mientras verifica actualizaciones.
- Define `CACHE_DIR` en `app.getPath('userData')/cache`.
- Define `BASE_DIR` como raiz del proyecto instalado.
- Llama a `checkAndUpdate(CACHE_DIR)`.
- Levanta servidor Express local en puerto dinamico `127.0.0.1`.
- Sirve primero `cacheDir` y luego `baseDir`.
- Crea ventana principal de 1400x860, minimo 1024x640.
- Carga `http://127.0.0.1:{port}/index.html`.
- Oculta barra de menu.
- Cierra servidor al salir.

`electron/updater.js`:

- Usa GitHub raw como fuente de actualizaciones.
- Compara `version.txt` remoto contra local en cache.
- Si remoto es mayor, descarga lista fija de archivos de contenido a `_tmp_update`.
- Solo reemplaza cache si todas las descargas terminan bien.
- Archivos actualizados incluyen `index.html`, componentes, pantallas, data y `version.txt`.

No metas credenciales ni secretos en este mecanismo. Es actualizacion de archivos estaticos de la app.

`electron-builder.yml`:

- Producto: Brian CRM.
- Target Windows NSIS x64.
- `asar: false`.
- Incluye electron, index, components, screens, data, version y node_modules filtrado.
- Instalacion one-click, per-user.

### Scripts `.bat`

`abrir-crm.bat`:

- Abre navegador en `http://localhost:8888/`.
- Levanta `npx serve . -l 8888`.

`cerrar-crm.bat`:

- Busca procesos usando puerto 8888 y los mata.

`tunnel-abrir.bat`:

- Ejecuta Cloudflare Tunnel contra `http://localhost:8888`.

`tunnel-cerrar.bat`:

- Cierra tunnel segun implementacion del archivo.

`publicar-update.bat`:

- Pide descripcion del cambio.
- Lee `version.txt` en formato `YYYY-MM-DD-NNN`.
- Si es mismo dia incrementa secuencia; si no, reinicia en 001.
- Escribe version nueva.
- Ejecuta `git add .`, `git commit -m`, `git push`.
- El cliente recibe actualizacion la proxima vez que abre la app Electron, porque el updater baja archivos segun version.

### Android

`capacitor.config.json`:

- `appId`: paquete Android del CRM.
- `appName`: Brian CRM.
- `webDir`: `www`.
- `androidScheme`: `https`.
- `allowMixedContent`: true.

Antes de sincronizar Android se copian archivos web a `www`.

## 9. Convenciones y cuidados para cambios futuros

### Mantener arquitectura

- No convertir a app SPA con router sin pedir permiso.
- No mover todo a build system moderno salvo indicacion explicita.
- No asumir modulos ES; los scripts JSX se exponen con `Object.assign(window, ...)`.
- Al agregar componente/pantalla, cargarlo en `index.html` en orden correcto.
- Si un componente depende de helpers globales, asegurarse de que se carguen antes.

### Mantener nombres de datos

- React usa camelCase.
- Supabase usa snake_case.
- Agregar columnas nuevas implica revisar `KEY_MAP`, `KEY_MAP_REVERSE`, queries y payloads.
- No mezclar `client_id` dentro de estado React salvo en payloads directos a Supabase.

### Mantener integridad financiera

Cada cambio debe revisar impacto en:

- operaciones,
- cuotas,
- pagos,
- imputaciones,
- recibos,
- caja,
- tarjetas,
- reportes,
- dashboard,
- importacion.

No tocar una parte aislada si hay efectos contables relacionados.

Ejemplos:

- Si cambias registro de pagos, revisar recibos, imputaciones, cuotas y caja.
- Si cambias operaciones, revisar cuotas, comprobantes, caja, tarjeta y reportes.
- Si cambias tarjeta, revisar disponible, resumenes y movimientos asociados.
- Si cambias estados de cuotas, revisar mora, reportes, dashboard y cliente.
- Si cambias importacion Excel, revisar deduplicacion y relaciones entre cliente/operacion/cuota/pago.

### Reglas de eliminacion

- Cliente con operaciones: no eliminar.
- Operacion con pagos: no eliminar; pedir anular pagos primero.
- Tarjeta con movimientos: no eliminar.
- Pago/recibo: no eliminar manualmente; usar `reverse_payment`.

### Estado local despues de escribir

Despues de cada escritura en Supabase, la UI suele:

- actualizar localmente la lista afectada, o
- recargar tablas afectadas con `select('*')`.

Preferir recargar todas las tablas relacionadas cuando hay efectos multiples. Ejemplos:

- Crear operacion: recargar operations, installments, cashMovements, internalOperationVouchers, creditCardMovements.
- Registrar/anular pago: recargar payments, receipts, paymentAllocations, installments, cashMovements.
- Marcar resumen tarjeta: recargar creditCardStatementPayments.

### Privacidad

Preservar:

- boton de privacidad,
- `maskSensitiveNumber`,
- `maskSensitiveText`,
- `formatCurrency`,
- persistencia `crm-privacy-hidden`,
- ocultamiento en KPIs/tablas/textos.

Cuando agregues nuevos importes o conteos sensibles, usa helpers de privacidad.

### UX existente

La app tiene UI operacional:

- sidebar oscuro,
- header con busqueda,
- cards y tablas,
- modales con confirmacion de cierre,
- botones con variantes,
- badges de estado,
- acciones rapidas,
- impresion/descarga de PDFs.

No transformes la UI en landing page ni en dashboard decorativo. Es una herramienta de trabajo para operar datos financieros.

### WhatsApp

`WAButton` crea URL `https://wa.me/{telefono}?text={mensaje}`. Algunas pantallas usan mensajes directos y configuracion contiene plantillas. Si se mejora WhatsApp, cuidar variables configurables.

### Codigos secuenciales

Operaciones usa helpers:

- `nextSequentialCode(items, prefix, field)`
- `nextSequentialCodes(items, prefix, count, field)`

Codigos habituales:

- `CLI-###` para clientes, aunque algunos flujos importados usan codigos legacy/traducidos.
- `OP-###` para operaciones.
- `CUO-###` para cuotas.
- `PAG-###` para pagos.
- `REC-###` para recibos.
- `COMP-###` para comprobantes.

Antes de generar codigos de operacion/cuotas/comprobante, la UI consulta Supabase para evitar colisiones con datos actuales.

## 10. Riesgos conocidos y puntos delicados

- La app depende de CDNs para React, Babel, Supabase y html2pdf, salvo SheetJS que se carga local desde `node_modules`.
- No hay backend Node propio para negocio; la logica critica esta en frontend y RPCs Supabase.
- Si fallan RPCs o no existen en Supabase, los flujos criticos fallan.
- `app_settings` puede venir vacio; `loadAllData()` crea defaults basicos desde objetos vacios.
- Hay mezcla de datos historicos/mock en `data/`, pero runtime real usa Supabase.
- La importacion Excel es compleja y escribe muchas tablas; cambios ahi deben ser revisados con cuidado.
- Los adjuntos/subida de archivos son mayormente mock.
- La edicion de operaciones con pagos tiene camino especial para no reconstruir cuotas.
- `credit_card_statement_payments` usa columna `año`; respetar ese nombre en queries y mapeos.
- El modo privacidad puede ocultar valores en textos; no confundir eso con datos reales.

## 11. Como quiero que respondas ante pedidos de cambios

Cuando te pida modificar este CRM:

1. Primero identifica que modulos, tablas y flujos se ven afectados.
2. Revisa si el cambio toca cuotas, pagos, recibos, caja o tarjetas.
3. Si toca datos historicos o recalculos, explica el riesgo y pide confirmacion antes de proponer una mutacion irreversible.
4. Propone cambios compatibles con la arquitectura actual.
5. Mantiene los helpers existentes y evita duplicar logica financiera.
6. Actualiza `toCamel/toSnake` si agregas campos que cruzan Supabase/React.
7. Despues de escribir en Supabase, recarga o actualiza todas las colecciones afectadas.
8. Incluye pruebas manuales concretas para validar el flujo.
9. No expongas claves ni valores reales de Supabase; solo menciona que estan configurados en `components/supabase-client.js`.

## 12. Checklist de impacto obligatorio antes de finalizar cambios

Antes de dar por terminado cualquier cambio, revisa:

- Dashboard sigue calculando bien KPIs y privacidad.
- Clientes siguen mostrando balance, mora, cuotas, pagos, recibos, comprobantes, notas y archivos.
- Operaciones siguen creando cuotas, comprobantes, caja y tarjeta si aplica.
- Pagos siguen imputando cuotas, generando recibo y caja.
- Anulaciones siguen revirtiendo cuotas, imputaciones, recibo/pago y caja mediante RPC.
- Tarjetas siguen calculando disponible y resumenes.
- Caja sigue mostrando entradas/salidas/saldo.
- Mora sigue detectando vencidas por fecha y saldo.
- Reportes siguen coherentes con las tablas.
- Configuracion sigue guardando en `app_settings`.
- Importacion Excel no duplica registros existentes.
- Modo privacidad sigue ocultando cifras.
- Busqueda global sigue encontrando clientes, operaciones, cuotas y tarjetas.

Instruccion final obligatoria: antes de proponer o implementar cambios que puedan afectar cuotas, pagos, caja, recibos o tarjetas, revisa el impacto completo y pide confirmacion si el cambio puede tocar datos historicos, recalcular importes, borrar registros o alterar saldos.
```
