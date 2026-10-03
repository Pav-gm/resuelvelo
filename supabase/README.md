# Base de datos (Supabase)

- `migrations/` — **fuente de verdad** del esquema `public`, en el formato de la CLI de Supabase (`<versión>_<nombre>.sql`, se aplican por orden). Las versiones y nombres son los que ya tiene registrados `resuelvelo-dev`.
- `schema.sql` — instantánea consolidada de lo mismo, útil para leer o para un proyecto nuevo desde el SQL Editor. Si cambias el esquema, **añade una migración nueva** y actualiza este archivo; no edites las migraciones ya aplicadas.
- `seed.sql` — datos de ejemplo.

## Estado de las migraciones

El 2026-10-03 se comprobó que aplicar las tres migraciones a un Postgres vacío reproduce **exactamente** el esquema `public` de producción (definiciones, políticas, funciones y privilegios de tablas y funciones), con `scripts/backup/verify_migrations.sh` del repositorio del orquestador. Producción registra una sola migración con otro nombre; el esquema es el mismo, pero el historial no coincide con estos archivos.

Antes de usar `supabase db push` contra producción hay que alinear el historial (`supabase migration repair`) o seguir aplicando los cambios a mano por el SQL Editor. Aplicar estas migraciones tal cual a producción **no** hace falta y no debe hacerse: ya están reflejadas.

Las migraciones `20261003230000_feedback_verificado.sql` y `20261003235900_feedback_vista_invoker.sql` y `20261004000100_feedback_vista_solo_lectura.sql` (feedback verificado de compradores; la segunda pasa la vista pública a `security_invoker` y la lectura a permisos por columna; la tercera la deja de solo lectura) se comprobaron el 2026-10-03 en un Postgres desechable: las cuatro migraciones se aplican en orden sin errores y producen la misma definición y los mismos privilegios que `schema.sql` (única diferencia, ya existente: el orden de dos columnas de `cotizaciones`). **No está aplicada en ningún proyecto de Supabase todavía**: aplicarla primero a `resuelvelo-dev`, validar el flujo y solo entonces a producción, con un respaldo `pre-change`. Despliega el código después de aplicarla.

## Flujo de cambios

`dev` primero (proyecto `resuelvelo-dev`), validación, y solo entonces producción. Antes de cualquier cambio de esquema en producción, un respaldo `pre-change` (ver el orquestador: `docs/HIGH_IMPACT_ACTIONS.md`).
