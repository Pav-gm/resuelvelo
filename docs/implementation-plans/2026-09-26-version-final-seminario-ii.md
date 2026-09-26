# Versión final — Seminario II

**Fecha:** 2026-09-26
**Estado:** aprobado por Pavel (“Procede por favor”)
**Proyecto:** Resuélvelo, trabajo individual (matrícula 100061480)

## Objetivo

Dejar operable la versión final descrita en `docs/SEMINARIO-II-GESTION-PROYECTOS.md` (punto 16) y en `docs/ROADMAP.md`, y preparar las cuatro evidencias de la consigna del 15 de septiembre de 2026 (entrega 30 de septiembre, 23:00).

## Alcance congelado

1. Políticas de Postgres para que un admin lea proveedores, productos activos e inactivos, cotizaciones (e ítems) y perfiles ajenos solo para mostrar la contraparte de una cotización. Puede actualizar productos para activarlos o desactivarlos. Un comprador o un proveedor no obtiene esas lecturas ni esa escritura de moderación.
2. Usuario demo `admin@demo.com` / `Demo1234!`, sin fila en `proveedores`, mismo patrón idempotente de `supabase/seed.sql`.
3. `proxy.ts` niega `/proveedor` a quien no sea proveedor, `/admin` a quien no sea admin, y `/mis-cotizaciones` a quien no tenga sesión. Sin sesión, redirige a `/login`. Con rol incorrecto, redirige a `/catalogo`. Si Supabase no está configurado, el proxy no rompe el modo mock.
4. Panel `/admin`: listado de proveedores, productos (incluidos inactivos) con activar/desactivar, y cotizaciones. El enlace del navbar solo aparece si `rol === 'admin'`. El login de un admin redirige a `/admin`.
5. Catálogo: `precioMin`, `precioMax` y `conStock`, combinados con búsqueda y categoría, en Supabase y en el fallback mock.
6. Documento `docs/EVIDENCIAS-IMPLEMENTACION.md` y capturas en `docs/screenshots/`. El video lo graba Pavel.

## Fuera de alcance

Pagos, app móvil, segundo stack, push a GitHub, deploy en Vercel, y ejecutar `schema.sql` / `seed.sql` contra el proyecto Supabase remoto.

## Criterios de aceptación

1. Un admin autenticado puede leer proveedores, productos activos e inactivos, cotizaciones, ítems de cotización y los perfiles necesarios para mostrar comprador y proveedor. Un comprador o proveedor no puede usar esas lecturas de moderación ni desactivar productos ajenos.
2. El seed incluye `admin@demo.com` y el README lo documenta.
3. Sin sesión no se entra a `/proveedor`, `/admin` ni `/mis-cotizaciones`. Un comprador no entra a `/proveedor` ni a `/admin`. Un proveedor no entra a `/admin` ni a `/proveedor` de otro rol: `/proveedor` es solo para `proveedor`. Un admin no entra a `/proveedor`.
4. El admin ve un panel con proveedores, productos y cotizaciones, y puede desactivar un producto.
5. La navegación muestra el enlace de admin solo a ese rol.
6. El catálogo filtra por precio mínimo, precio máximo y stock, junto con la búsqueda y la categoría que ya existen.
7. Los tests de filtros pasan en el fallback sin Supabase.
8. El documento de evidencias responde los cuatro puntos de la consigna. El roadmap marca las tres actividades como hechas solo después de verificarlas.

## Tareas

| # | Dueño | Archivos | Criterios | Depende de |
|---|---|---|---|---|
| 1 | worker-secondary | `supabase/schema.sql`, `supabase/seed.sql` | 1, 2 (seed) | — |
| 2 | worker-primary | `proxy.ts`, `lib/supabase/proxy.ts` | 3 | — |
| 3 | worker-primary | `app/(marketplace)/admin/**`, `app/(auth)/actions.ts`, `components/layout/NavbarClient.tsx` | 4, 5 | 1, 2 |
| 4 | worker-secondary | `lib/data.ts`, `app/(marketplace)/catalogo/page.tsx`, `components/marketplace/CatalogoFiltros.tsx`, `tests/data-fallback.test.ts` | 6, 7 | — |
| 5 | worker-secondary | `docs/ROADMAP.md`, `docs/EVIDENCIAS-IMPLEMENTACION.md`, `README.md` | 2 (README), 8 | 1–4 verificados |

## Verificación

`npm run test` lo corre solo el worker de filtros en el lote 1. El orquestador corre `npm run lint` y `npx tsc --noEmit` antes del verifier. Nadie corre `npm run build` ni `npm run dev` en paralelo. Nadie aplica SQL remoto.
