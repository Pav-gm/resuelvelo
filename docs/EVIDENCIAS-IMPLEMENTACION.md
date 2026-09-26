# Evidencias de implementación — Seminario II

**Estudiante:** Pavel González  
**Matrícula:** 100061480  
**Proyecto:** Resuélvelo (marketplace B2B)  
**Fecha del documento:** 26 de septiembre de 2026  
**Trabajo:** individual (desarrollo y verificación documentada por una sola persona)

Este documento responde los cuatro puntos de la consigna de entrega (15 de septiembre de 2026; plazo 30 de septiembre de 2026, 23:00). Separa en cada apartado lo que **ya se puede mostrar** de lo que **aún falta para la entrega completa**.

---

## Verificación registrada en esta iteración (26-09-2026)

Sin repetir las pruebas en esta sesión de documentación, el orquestador del proyecto dejó constancia de:

| Comprobación | Resultado |
|---|---|
| `npm run test` | 4 archivos, 46 pruebas pasadas |
| `npm run lint` | salida 0 |
| `npx tsc --noEmit` | salida 0 |
| Servidor local `http://localhost:3000` | Respuestas HTTP según tabla siguiente |

**Comprobaciones HTTP locales (sin sesión):**

- `GET /admin`, `/proveedor`, `/proveedor/productos/nuevo`, `/mis-cotizaciones` → redirección **307** a `/login`.
- `GET /catalogo` y `GET /catalogo?busqueda=pvc&categoria=plomeria&precioMin=100&precioMax=900&conStock=1` → **200**; el HTML incluye los parámetros `precioMin`, `precioMax`, `conStock`, el texto «Solo con stock» y «Aplicar filtros».

**Nota sobre desarrollo local:** En la primera compilación de `/catalogo` apareció un error transitorio de webpack y una respuesta 500; las solicitudes siguientes respondieron 200. No indica un fallo permanente de la aplicación.

**Limitaciones de entorno en esta máquina:**

- La URL del proyecto Supabase configurada en `.env.local` **no resuelve por DNS** desde este equipo. No se imprime el hostname aquí. Por tanto **no** ejecuté login con `admin@demo.com`, consultas RLS en vivo ni flujos completos de comprador/proveedor contra esa base remota en esta sesión.
- **`supabase/schema.sql`** y **`supabase/seed.sql`** **no** se aplicaron a ningún proyecto remoto durante el trabajo del 26-09-2026.
- **No** hubo push ni deploy nuevo. **[resuelveloapp.vercel.app](https://resuelveloapp.vercel.app)** sigue sirviendo el MVP de Seminario I; el panel `/admin`, la protección centralizada de rutas en `proxy.ts` y los filtros de precio/stock del catálogo **no** están en producción hasta un despliegue posterior.

**Capturas existentes:** Las imágenes referenciadas en `README.md` bajo `docs/screenshots/` corresponden al MVP anterior (catálogo, carrito, cotizaciones, panel proveedor). **No** hay captura nueva del panel `/admin` en el repositorio al redactar este documento.

**Video:** Lo grabará Pavel para la entrega. Lista de plano sugerida (orden flexible):

1. Login como `admin@demo.com` y llegada a `/admin`.
2. Desactivar (o reactivar) un producto desde el panel de administración.
3. Catálogo: aplicar filtro de precio mínimo/máximo y «Solo con stock».
4. Comprador: armar carrito y solicitar cotización.
5. Proveedor: responder una cotización (aceptar o rechazar).

---

## 1. Sistema instalado y funcionando

### Qué ya se puede mostrar

- El repositorio clona e instala con `npm install` y arranca con `npm run dev` en el puerto 3000; en la verificación del 26-09-2026 el servidor local respondió a las rutas indicadas arriba.
- La suite automatizada (`npm run test`), ESLint y el chequeo de tipos TypeScript pasaron el mismo día.
- La URL pública **[resuelveloapp.vercel.app](https://resuelveloapp.vercel.app)** demuestra que el stack Next.js + Supabase del MVP ya estuvo desplegado y operativo para flujos de Seminario I (catálogo, auth, carrito, cotizaciones, panel proveedor en la versión desplegada).

### Qué falta para la entrega

- Volver a desplegar en Vercel (o equivalente) para que producción incluya panel admin, guard de rutas y filtros nuevos del catálogo.
- Grabar el **video** de demostración con la versión final y enlazarlo en la entrega académica (el README ya referencia un video del MVP anterior en Google Drive).
- Opcional pero recomendable: capturas actualizadas de `/admin` y del catálogo con filtros de precio/stock.

---

## 2. Base de datos configurada

### Qué ya se puede mostrar

- En el repositorio están **`supabase/schema.sql`** (tablas, RLS, trigger de perfil) y **`supabase/seed.sql`** (datos de demo).
- El esquema incluye políticas RLS para el rol **admin**: la política `profiles: admin lee todos` permite **SELECT sobre todos los perfiles** (p. ej. mostrar al comprador en una cotización); comprador y proveedor siguen leyendo solo el propio perfil con la política existente. También: productos activos e inactivos, cotizaciones e ítems; actualización de productos para activar/desactivar; cada política con `drop policy if exists` previo.
- El seed incluye el usuario **`admin@demo.com`** / **`Demo1234!`**, nombre «Administración Resuélvelo», rol `admin`, id fijo `a0000000-0000-0000-0000-000000000007`, **sin** fila en `proveedores` (mismo patrón idempotente que el resto de usuarios demo).

### Qué falta para la entrega

- Ejecutar **`schema.sql`** y **`seed.sql`** en el SQL Editor de un proyecto Supabase accesible (nuevo o el que use `.env.local` una vez la URL resuelva).
- Ajustar `.env.local` (o el proyecto de Vercel) con URL y anon key de un host que **sí** resuelva, y confirmar login con `admin@demo.com` y las políticas RLS en la consola de Supabase o con pruebas manuales.
- Evidencia en vivo de moderación (desactivar producto como admin) contra Postgres real, no solo contra el fallback mock.

---

## 3. Principales módulos operativos

### Qué ya se puede mostrar

| Módulo | Estado en el repositorio / verificación local |
|---|---|
| **Auth** | Registro, login, logout, recuperación de contraseña; login de admin redirige a `/admin`. |
| **Catálogo** | Búsqueda, categoría, **precio mínimo**, **precio máximo** y **solo con stock** (`conStock=1`), en Supabase y en fallback mock (`lib/data.ts`, página de catálogo, `CatalogoFiltros`). |
| **Carrito** | Zustand + localStorage; solicitud de cotizaciones agrupadas por proveedor. |
| **Cotizaciones** | Mis cotizaciones (comprador); bandeja y respuesta (proveedor). |
| **Panel proveedor** | Productos CRUD, activar/desactivar, estadísticas, cotizaciones. |
| **Panel admin (`/admin`)** | Listado de proveedores, productos (incl. inactivos) con activar/desactivar, cotizaciones; enlace «Administración» en navbar solo si `rol === 'admin'`. |
| **Protección de rutas** | `lib/supabase/proxy.ts`: sin sesión → `/login` en `/admin`, `/proveedor`, `/mis-cotizaciones`; rol incorrecto → `/catalogo`; `/proveedor` solo proveedor; `/admin` solo admin; modo mock si falta URL de Supabase o es placeholder. |

Las pruebas unitarias de filtros en fallback (`tests/data-fallback.test.ts`) forman parte de los 46 tests pasados.

### Qué falta para la entrega

- Probar el panel `/admin` y las políticas admin **con sesión real** y base aplicada (no solo mock ni redirecciones sin login).
- Validar end-to-end cotización comprador → respuesta proveedor con el mismo proyecto Supabase que use la entrega.
- Actualizar capturas y producción para reflejar estos módulos.

---

## 4. Usuario realizando operaciones en el sistema

### Qué ya se puede mostrar

- **Sin autenticación:** se observaron redirecciones 307 a `/login` al intentar acceder a rutas protegidas (`/admin`, `/proveedor`, rutas de proveedor y `/mis-cotizaciones`), coherente con `proxy.ts`.
- **Catálogo anónimo o con mock:** filtros de precio y stock visibles en HTML y respuesta 200 en las URLs de prueba anteriores.
- **MVP desplegado:** operaciones de comprador y proveedor ya fueron demostrables en la versión anterior en Vercel y en capturas del README (no incluyen admin ni filtros nuevos).

### Qué falta para la entrega

- Recorrido completo grabado en video: **comprador** (catálogo + carrito + cotización), **proveedor** (respuesta), **admin** (`admin@demo.com`: login, listados, desactivar producto).
- Screenshots nuevas del panel admin y del catálogo filtrado (las actuales en `docs/screenshots/` son del MVP previo).
- Confirmación manual con base Supabase reachable de que un comprador/proveedor **no** obtiene las lecturas de moderación ni puede desactivar productos ajenos (criterio RLS del plan de implementación).

---

## Referencias

- Plan congelado: `docs/implementation-plans/2026-09-26-version-final-seminario-ii.md`
- Gestión del proyecto: `docs/SEMINARIO-II-GESTION-PROYECTOS.md`
- Roadmap: `docs/ROADMAP.md` (sección Pendiente actualizada con el estado honesto de estas tres líneas de trabajo)
