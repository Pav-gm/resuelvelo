# Roadmap de Desarrollo — Resuélvelo

> Plan vivo para continuar el desarrollo desde este repositorio.
> Marketplace B2B de proveedores de materiales e insumos · República Dominicana.

---

## 1. Estado actual

**Tipo:** MVP funcional, verificado de punta a punta contra un proyecto Supabase real (no solo datos mock).
**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Zustand · Supabase (SSR).

> Nota histórica: esta sección marcaba como "Pendiente" ítems que ya están implementados y verificados
> (Fases 1–6 completas). Se actualizó el 2 de julio de 2026 tras una verificación end-to-end con
> Supabase en vivo (registro, catálogo, carrito, cotizaciones, panel de proveedor).

### Implementado y verificado end-to-end
- [x] Scaffold del proyecto y configuración base (TS, ESLint, Tailwind, shadcn).
- [x] Layout global con `Navbar` + `Footer` (branding "Resuélvelo" con tilde).
- [x] Página **Home** (`app/page.tsx`): hero, categorías (con slugs correctos), beneficios, CTA proveedores.
- [x] Esquema de base de datos en Supabase (`supabase/schema.sql`) + RLS + trigger de `profile`.
- [x] Seed de demo (`supabase/seed.sql`): 6 usuarios, 5 proveedores, 20 productos, cotizaciones de ejemplo.
- [x] Refresco de sesión vía `proxy.ts` (reemplaza `middleware.ts` en Next 16).
- [x] **Auth real**: registro (crea `profile` y, si aplica, `proveedor`), login con redirección por rol, logout.
- [x] **Recuperación de contraseña** (`/recuperar` → email → `/actualizar-password`).
- [x] **Catálogo** leyendo de Supabase, con fallback a mock si no hay credenciales configuradas.
- [x] **CRUD de productos** en el panel de proveedor, incluyendo **eliminar** (antes solo existía la Server Action, sin botón en la UI).
- [x] **Flujo de cotizaciones** completo: crear desde carrito (agrupado por proveedor, resolviendo proveedor/precio desde la BD, no desde datos del cliente) → bandeja del proveedor → aceptar/rechazar.
- [x] Páginas legales (`/terminos`, `/privacidad`) y página 404 personalizada (`app/not-found.tsx`).
- [x] README completo, capturas funcionales y `LICENSE` (MIT).
- [x] Removido el stack exploratorio Vue 3 + FastAPI (`frontend/`, `backend/`) que coexistía en el repo — rompía `next build` y `npm run lint` porque `tsconfig.json`/`eslint.config.mjs` no lo excluían, y confundía la detección automática de "monorepo" de Vercel al desplegar.

- [x] Deploy en Vercel: **https://resuelveloapp.vercel.app** (proyecto `resuelvelo/resuelvelo_app`).

### Pendiente
- [ ] Panel/UI para el rol `admin` (existe en el esquema y tipos, sin pantallas propias).
- [ ] Filtros avanzados de catálogo (precio, stock) — el botón "Filtros" decorativo se removió hasta implementarlos.
- [ ] Enforcement de rutas por rol a nivel `proxy.ts` (hoy es por página, con `redirect()` individual).

---

## 2. Arquitectura objetivo

```
Navegador (React 19 / Next App Router)
   │
   ├── Server Components → consultas de lectura a Supabase (SSR, cookies)
   ├── Server Actions    → mutaciones (auth, CRUD, cotizaciones)
   └── Zustand (cliente) → carrito persistido en localStorage
        │
        ▼
Supabase
   ├── Auth (email + password)
   ├── PostgreSQL (profiles, proveedores, categorias, productos, cotizaciones, items_cotizacion)
   └── Row Level Security (cada quien ve/edita lo suyo)
```

### Decisiones de diseño
- **SSR con `@supabase/ssr`**: lecturas en Server Components; mutaciones en Server Actions con `revalidatePath`.
- **RLS siempre activo**: la seguridad vive en la base de datos, no solo en la UI.
- **Fallback a mock**: si faltan las env de Supabase, el catálogo usa datos mock para que la app siempre renderice (útil para capturas y demos antes del setup).
- **Roles**: `comprador` | `proveedor` | `admin` en la tabla `profiles`.

---

## 3. Modelo de datos (resumen)

| Tabla | Propósito | Claves |
|---|---|---|
| `profiles` | Extiende `auth.users` con nombre y rol | `id` = `auth.uid()` |
| `proveedores` | Datos de empresa del proveedor | `user_id` → `profiles.id` |
| `categorias` | Catálogo de categorías | `slug` único |
| `productos` | Productos publicados por proveedores | `proveedor_id`, `categoria_id` |
| `cotizaciones` | Solicitudes de comprador a proveedor | `comprador_id`, `proveedor_id`, `estado` |
| `items_cotizacion` | Líneas de cada cotización | `cotizacion_id`, `producto_id` |

> El SQL completo (DDL + RLS + seed) vivirá en `supabase/schema.sql` y `supabase/seed.sql`.

---

## 4. Fases de desarrollo (orden sugerido)

### Fase 1 — Base de datos
1. `supabase/schema.sql`: tablas, índices, políticas RLS, trigger que crea `profile` al registrarse.
2. `supabase/seed.sql`: categorías + proveedores + productos de ejemplo (Promeria, Ferretería López, Materiales del Norte).

### Fase 2 — Infraestructura de sesión
3. `middleware.ts`: refresco de sesión Supabase en cada request.
4. `lib/data.ts`: helpers de lectura con fallback a mock.

### Fase 3 — Autenticación
5. `app/(auth)/actions.ts`: Server Actions `registrar`, `iniciarSesion`, `cerrarSesion`.
6. Conectar formularios de login/registro a las actions; redirección por rol.

### Fase 4 — Catálogo
7. Catálogo como Server Component leyendo de Supabase; búsqueda y filtro por categoría.

### Fase 5 — Panel de proveedor
8. Stats reales del proveedor autenticado.
9. CRUD de productos (`/proveedor/productos/nuevo`, editar, activar/desactivar).

### Fase 6 — Cotizaciones
10. Crear cotización desde el carrito (Server Action) → agrupar por proveedor.
11. Bandeja del proveedor: ver y responder cotizaciones (cambiar `estado`).

### Fase 7 — Entrega
12. [x] README completo, capturas, `LICENSE` (MIT).
13. [x] Verificación end-to-end (registro, catálogo, carrito, cotizaciones, panel de proveedor) contra Supabase real.
14. [x] Deploy en Vercel + URL pública: https://resuelveloapp.vercel.app

---

## 5. Runbook — puesta en marcha

### 5.1 Local
```bash
npm install
cp .env.example .env.local   # completar con credenciales de Supabase
npm run dev                  # http://localhost:3000
```

### 5.2 Supabase
1. Crear proyecto en https://supabase.com (región más cercana a RD: `us-east`).
2. SQL Editor → pegar y ejecutar `supabase/schema.sql`, luego `supabase/seed.sql`.
3. Project Settings → API → copiar `URL` y `anon key` a `.env.local`.
4. Authentication → Providers → Email habilitado (desactivar "Confirm email" en dev para pruebas rápidas).

### 5.3 GitHub
```bash
git remote add origin https://github.com/<usuario>/resuelvelo.git
git push -u origin main
```

### 5.4 Vercel
1. Importar el repo de GitHub en https://vercel.com/new.
2. Framework: Next.js (autodetectado).
3. Environment Variables: copiar las mismas de `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`).
4. Deploy → copiar la URL pública y agregarla al README.

---

## 6. Convenciones

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
- **Branch principal:** `main`.
- **Idioma:** UI y dominio en español (tuteo dominicano). Código/identificadores en español sin tildes.
- **Branding:** "Resuélvelo" con tilde en todo texto visible; `resuelvelo` (sin tilde) en slugs y keys.

---

## 7. Backlog futuro (post-MVP)

- Pagos integrados (Stripe / CardNet RD) → habilita comisión por transacción.
- App móvil nativa (iOS + Android).
- Motor de recomendación de proveedores.
- Panel de analytics/BI para proveedores (plan Premium).
- Expansión regional a otros mercados de LATAM.
