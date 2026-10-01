<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Resuélvelo: acuerdos comunes

Este archivo es la entrada común para Codex, Claude Code y Cursor. Resuélvelo es un marketplace B2B con Next.js 16, React 19, TypeScript, Supabase y Vitest.

## Consultar solo lo necesario

- El índice es [docs/index/MASTER_INDEX.md](docs/index/MASTER_INDEX.md). Elige el documento por tema; busca sus encabezados y lee la sección relevante.
- Para cambios de código, consulta las secciones aplicables de [la guía de ingeniería](docs/engineering/PROJECT_GUIDE.md); para ejecutar o interpretar controles, [la guía de verificación](docs/engineering/VERIFICATION.md).
- Mantén una fuente por regla: las guías contienen el detalle y los archivos de cada asistente solo apuntan a ellas. No cargues todo `docs/`, dependencias, lockfiles o resultados de compilación en el contexto.
- El protocolo de memoria global sigue vigente; sus namespaces son `project=resuelvelo` y `group_id=resuelvelo`. Los hooks globales de Claude siguen siendo configuración de este equipo.

## Arquitectura y límites esenciales

- UI y rutas: `app/` y `components/`; tipos: `types/index.ts`; lecturas de catálogo/cotizaciones: `lib/data.ts`, con fallback a `lib/mock.ts`.
- Carrito: `lib/store/carrito.ts` (Zustand, navegador). La creación de cotizaciones resuelve proveedor y precio en el servidor; la autorización de datos es RLS en `supabase/schema.sql`.
- Conserva los cambios ajenos. No instales dependencias nuevas ni hagas commit, push, migraciones remotas o despliegues sin autorización específica.
- Usa subagentes solo cuando se solicite `/orchestrate`; sus tareas deben tener archivos y recursos asignados. El protocolo detallado de Cursor está [aquí](docs/engineering/CURSOR_ORCHESTRATION.md).

## Verificación y recursos compartidos

- `npm run verify`: documentación, pruebas de herramientas, pruebas de la app, ESLint, tipos y compilación, en serie y con historial.
- `npm run verify -- --quick`: los mismos controles salvo compilación. `npm run verify -- --only docs,test`: selección explícita. `npm run verify -- --history`: últimas ejecuciones.
- Controles individuales: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run docs:check`.
- Un único proceso por checkout puede usar `.next/` (dev, tipos o build) o correr un control a la vez. El servidor de desarrollo ocupa el puerto 3000; SQL y despliegues comparten Supabase y Vercel.
- Una ejecución omitida o fallida nunca es un pase. El historial identifica el código comprobado, pero no sustituye una nueva verificación tras cambios de código o entorno. Cambios de UI requieren además revisar el flujo en el navegador.
