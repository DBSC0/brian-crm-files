# Brian CRM Architecture Guardrails

Esta etapa mantiene la arquitectura actual: React UMD, Babel en runtime, scripts globales, Supabase y Electron.

## Orden de carga runtime

1. `components/supabase-client.js`
2. `core/finance.js`
3. `core/data-store.js`
4. React, ReactDOM, Babel y html2pdf
5. Inline helpers de `index.html` como compatibilidad legacy
6. `components/*.jsx`
7. `screens/*.jsx`
8. App principal en `index.html`

## APIs globales nuevas

- `window.CRMFinance`: dominio financiero testeable.
- `window.CRMData`: mapeo snake/camel y carga de datos Supabase.

Los wrappers historicos (`formatCurrency`, `moneyBase`, `loadAllData`, `toCamel`, `toSnake`, etc.) siguen existiendo para no romper pantallas.

## Reglas de cambio

- No duplicar logica financiera en pantallas nuevas.
- Agregar helpers primero en `core/finance.js` y luego exponer wrappers si hace falta.
- Agregar columnas Supabase implica revisar `core/data-store.js` y el mapeo legacy de `index.html` mientras exista.
- Toda mutacion financiera debe seguir pasando por RPC transaccional.
- No eliminar archivos legacy hasta que `npm run validate` y la checklist de release cubran el flujo afectado.

## Legacy conocido

- `data/helpers.js` y `data/mockData.js` no son la fuente de verdad del runtime productivo.
- El inline block grande de `index.html` conserva compatibilidad hasta que las pantallas consuman `CRMFinance`/`CRMData` directamente.
- `tests/finance-core.test.mjs` reemplaza al antiguo test HTML duplicado.
