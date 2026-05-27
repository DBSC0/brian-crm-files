# Brian CRM Release Checklist

Usar esta lista antes de publicar con `publicar-update.bat` o generar build Electron.

## Validaciones automaticas

- Ejecutar `npm run validate`.
- Ejecutar `git diff --check`.
- Revisar migraciones nuevas en Supabase SQL Editor antes de aplicar.
- Confirmar que `electron/updater.js` incluye todo archivo nuevo requerido por runtime.

## Flujos financieros criticos

- Crear operacion ARS: cuotas, comprobante, caja y dashboard quedan coherentes.
- Crear operacion USD: moneda, cotizacion congelada, cuotas y equivalentes ARS quedan coherentes.
- Editar operacion sin pagos: reconstruye cuotas/caja/tarjeta segun RPC.
- Editar operacion con pagos: no permite moneda, cotizacion ni importes estructurales.
- Registrar pago normal: imputa cuotas, genera recibo y caja.
- Registrar pago cruzado ARS/USD: guarda moneda, cotizacion e imputaciones correctas.
- Anular pago: usa `reverse_payment` y revierte cuotas, mora, recibo y caja.
- Aplicar mora: aumenta mora cobrable, registra evento y no genera caja.
- Condonar/congelar mora: registra evento y cambia total cobrable.
- Recibo: muestra cuota y mora separadas cuando corresponde.
- Caja: solo cambia por pagos/movimientos reales.
- Tarjetas: disponible, resumenes y pagos de resumen siguen coherentes.

## Permisos y tenant

- Owner y administrador tienen permisos operativos equivalentes.
- Administrador no puede degradar, eliminar ni reasignar propietario.
- Consultas nuevas filtran por `organization_id`.
- Edge Functions nuevas usan JWT del usuario para permisos y service role solo para acciones admin necesarias.

## Pantallas

- Dashboard: KPIs, privacidad y alertas.
- Clientes: balance, mora, cuotas, pagos, recibos y notas.
- Operaciones: detalle, cuotas, pagos, comprobante y moneda.
- Cuotas/Pagos/Recibos: registrar, anular, descargar/imprimir.
- Mora: configuracion, aplicar, condonar, congelar, historial.
- Reportes: Cartera, Mensual, Por cliente, Mora, Caja y Tarjetas.
- Configuracion: Tasas, Personalizacion, WhatsApp, Equipo y seguridad.
- Importar Excel: no duplica registros existentes.

## Smoke test Web/Electron

- `npm run server` y abrir `http://localhost:6767`.
- `npm start` para Electron.
- Login, cambio de organizacion y navegacion general.
- Modo privacidad activado/desactivado.
