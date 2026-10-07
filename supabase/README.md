# Base de datos (Supabase)

- `migrations/` — **fuente de verdad** del esquema `public`, en el formato de la CLI de Supabase (`<versión>_<nombre>.sql`, se aplican por orden). Las versiones y nombres son los que ya tiene registrados `resuelvelo-dev`.
- `schema.sql` — instantánea consolidada de lo mismo, útil para leer o para un proyecto nuevo desde el SQL Editor. Si cambias el esquema, **añade una migración nueva** y actualiza este archivo; no edites las migraciones ya aplicadas.
- `seed.sql` — datos de ejemplo. Solo se usa en local: lo que producción necesite (por ejemplo, rellenar una columna nueva en filas que ya existen) va en una migración.
- `rollbacks/` — el *down* de cada migración nueva, con **el mismo nombre de archivo**. Es obligatorio desde `20261007000100`: sin él, el ensayo falla.
- `checks/` — invariantes de datos (`do $$ … raise exception … $$`) que deben cumplirse después de las migraciones, por ejemplo «todo producto activo tiene subcategoría». Se comprueban en cada ensayo y en `resuelvelo-dev` después de aplicar.

## Estado de las migraciones

El 2026-10-03 se comprobó que aplicar las tres migraciones a un Postgres vacío reproduce **exactamente** el esquema `public` de producción (definiciones, políticas, funciones y privilegios de tablas y funciones), con `scripts/backup/verify_migrations.sh` del repositorio del orquestador. Producción registra una sola migración con otro nombre; el esquema es el mismo, pero el historial no coincide con estos archivos.

Antes de usar `supabase db push` contra producción hay que alinear el historial (`supabase migration repair`) o seguir aplicando los cambios a mano por el SQL Editor. Aplicar estas migraciones tal cual a producción **no** hace falta y no debe hacerse: ya están reflejadas.

Las migraciones `20261003230000_feedback_verificado.sql` y `20261003235900_feedback_vista_invoker.sql` y `20261004000100_feedback_vista_solo_lectura.sql` (feedback verificado de compradores; la segunda pasa la vista pública a `security_invoker` y la lectura a permisos por columna; la tercera la deja de solo lectura) se comprobaron el 2026-10-03 en un Postgres desechable: las cuatro migraciones se aplican en orden sin errores y producen la misma definición y los mismos privilegios que `schema.sql` (única diferencia, ya existente: el orden de dos columnas de `cotizaciones`). **No está aplicada en ningún proyecto de Supabase todavía**: aplicarla primero a `resuelvelo-dev`, validar el flujo y solo entonces a producción, con un respaldo `pre-change`. Despliega el código después de aplicarla.

## Flujo de cambios

`dev` primero (proyecto `resuelvelo-dev`), validación, y solo entonces producción. Antes de cualquier cambio de esquema en producción, un respaldo `pre-change` (ver el orquestador: `docs/HIGH_IMPACT_ACTIONS.md`).

Desde el 2026-10-07 lo hace solo el servidor del orquestador (`deploy/migrations/` y `scripts/backup/rehearse_migrations.sh` en ese repositorio), con el check **Migraciones**:

1. **PR a `dev`**: las migraciones que `main` todavía no tiene se ensayan sobre una copia de los datos de producción, en un Postgres desechable en memoria: se aplican, se comprueban los `checks/` y se aplica el rollback, que debe dejar esquema y datos exactamente como estaban. El resultado queda como check obligatorio y como comentario en el PR. Editar una migración ya aplicada también lo hace fallar.
2. **Merge a `dev`**: se aplican solas a `resuelvelo-dev`, cada una en una transacción y registrada en `supabase_migrations.schema_migrations`. La ronda de QA con los bots espera a que terminen.
3. **PR de `dev` a `main`**: el check exige que lo anterior haya salido bien, y el PR recibe un comentario con el SQL para producción (una transacción que también registra cada migración). **Producción sigue siendo manual**: respaldo `pre-change`, pegar ese bloque en el SQL Editor de `Resuelvelo_App` y después mergear.
