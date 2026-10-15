# Manual técnico y guía de instalación

Anexo técnico del informe final de Seminario de Proyecto II (Resuélvelo, 15 de octubre de 2026). El informe resume; este anexo conserva el detalle.

### 11.2 Manual técnico (resumen)

**Estructura del repositorio.** app/(auth)/: login, registro, recuperar y actualizar contraseña. app/(marketplace)/: catálogo, productos, proveedores, cuenta, perfil, mis cotizaciones, cotizaciones, solicitudes, notificaciones, proveedor (resumen, pedidos, productos, reseñas, perfil) y admin. app/api/: comprobante PDF y entrada de prueba. app/contacto, como-funciona, devoluciones, terminos, privacidad: páginas públicas. components/layout/: barra, menú de cuenta y pie. components/marketplace/: tarjetas, carrito, formularios, comparador, botones de acción. lib/data.ts: lecturas con fallback a mock. lib/supabase/: clientes de navegador y servidor; proxy.ts refresca la sesión y protege rutas. lib/comprobante-pdf.ts, lib/notificaciones.ts, lib/email.ts, lib/validaciones-perfil.ts, lib/utils.ts (formato de precios y fechas). lib/store/carrito.ts: store de Zustand. supabase/: esquema, migraciones, rollbacks, comprobaciones y seed. tests/ y e2e/: pruebas. docs/: planes, verificación y capturas.

**Convenciones.** Toda migración va en supabase/migrations/<versión>\_<nombre>.sql con su rollback del mismo nombre en supabase/rollbacks/ y, si aplica, una invariante en supabase/checks/. La versión es la fecha y hora actuales y siempre posterior a la última de dev; nunca se edita una migración ya aplicada; solo cambios aditivos salvo aprobación explícita. Las pruebas que leen una migración la buscan por el nombre sin versión. Una Server Action que necesite otra firma se exporta como función nueva. Lint, tipos, pruebas y build deben estar en verde antes de abrir el PR. Los commits siguen Conventional Commits.

**Mantenimiento.** Para cambiar la base: nueva migración con rollback, prueba unitaria que la lea por nombre, PR a dev; el vigilante la ensaya sobre una copia de producción y, tras la ronda de QA, la aplica en producción con respaldo. Para cambiar la interfaz: componente o página, prueba con Testing Library, PR a dev. Las variables de entorno viven en Vercel por entorno; las de la entrada de prueba (QA\_LOGIN\_TOKEN, QA\_COMPRADOR\_EMAIL y contraseña, QA\_PROVEEDOR\_EMAIL y contraseña) solo en Preview.

### 11.4 Guía de instalación y configuración

**Requisitos.** Node.js 20.9 o superior, Git y una cuenta gratuita en supabase.com. Opcional: cuenta en Vercel para publicar una copia y cuenta en Brevo para el correo.

**Pasos en local.**

1. Clonar el repositorio: git clone https://github.com/Pav-gm/resuelvelo.git y entrar a la carpeta.
2. Instalar dependencias: npm install.
3. Crear un proyecto en Supabase (región us-east). En SQL Editor ejecutar supabase/schema.sql y después supabase/seed.sql. Para reproducir exactamente la evolución del esquema, en lugar de schema.sql se pueden ejecutar las 34 migraciones de supabase/migrations en orden de versión.
4. En Project Settings → API copiar la Project URL y la clave anon public. En Auth, dejar activo el proveedor Email (en desarrollo se puede desactivar la confirmación de correo).
5. Copiar .env.example a .env.local y completar NEXT\_PUBLIC\_SUPABASE\_URL, NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY y NEXT\_PUBLIC\_SITE\_URL=http://localhost:3000. Opcionales: BREVO\_API\_KEY y EMAIL\_FROM para el correo; NEXT\_PUBLIC\_SOPORTE\_WHATSAPP y NEXT\_PUBLIC\_SOPORTE\_EMAIL para la página de contacto.
6. Arrancar con npm run dev y abrir http://localhost:3000. Sin credenciales de Supabase el catálogo se ve con datos mock; registro, login y cotizaciones exigen credenciales reales.

**Scripts.** npm run dev (desarrollo), npm run build y npm run start (producción local), npm run lint, npm run typecheck, npm run test (Vitest), npm run e2e (Playwright contra la build, con las variables E2E\_\* y Supabase de desarrollo).

**Publicar una copia en Vercel.** Importar el repositorio en vercel.com/new (framework Next.js), cargar las mismas variables (en producción NEXT\_PUBLIC\_SITE\_URL es la URL pública) y desplegar. Cada push a main republica el sitio. Las variables de la entrada de prueba de QA solo deben existir en el entorno Preview; en producción la ruta responde 404 aunque se definan.
