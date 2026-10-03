# Base de datos (Supabase)

- `migrations/` — **fuente de verdad** del esquema `public`, en el formato de la CLI de Supabase (`<versión>_<nombre>.sql`, se aplican por orden). Las versiones y nombres son los que ya tiene registrados `resuelvelo-dev`.
- `schema.sql` — instantánea consolidada de lo mismo, útil para leer o para un proyecto nuevo desde el SQL Editor. Si cambias el esquema, **añade una migración nueva** y actualiza este archivo; no edites las migraciones ya aplicadas.
- `seed.sql` — datos de ejemplo.

## Estado de las migraciones

El 2026-10-03 se comprobó que aplicar las tres migraciones a un Postgres vacío reproduce **exactamente** el esquema `public` de producción (definiciones, políticas, funciones y privilegios de tablas y funciones), con `scripts/backup/verify_migrations.sh` del repositorio del orquestador. Producción registra una sola migración con otro nombre; el esquema es el mismo, pero el historial no coincide con estos archivos.

Antes de usar `supabase db push` contra producción hay que alinear el historial (`supabase migration repair`) o seguir aplicando los cambios a mano por el SQL Editor. Aplicar estas migraciones tal cual a producción **no** hace falta y no debe hacerse: ya están reflejadas.

## Flujo de cambios

`dev` primero (proyecto `resuelvelo-dev`), validación, y solo entonces producción. Antes de cualquier cambio de esquema en producción, un respaldo `pre-change` (ver el orquestador: `docs/HIGH_IMPACT_ACTIONS.md`).
