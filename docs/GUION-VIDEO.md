# Guion — Video explicación punto por punto (Sección 13)

> Duración sugerida: 7–9 minutos. Grabar con captura de pantalla (OBS, Loom, o
> el grabador de Windows) + audio narrando en español. Subir a Google Drive
> con permisos de "cualquiera con el enlace puede ver" y pegar el link en
> `docs/DOCUMENTO-FINAL.md` sección 13.
>
> Antes de grabar: tener `npm run dev` corriendo localmente O usar
> directamente https://resuelveloapp.vercel.app (recomendado, así se ve la
> app real en producción). Tener a mano las credenciales demo (ver README).

---

## 0. Introducción (30–45 seg)

**Decir:**
> "Hola, soy [tu nombre]. Este es mi proyecto final de Seminario de Proyecto I:
> Resuélvelo, un marketplace B2B que conecta compradores profesionales con
> proveedores de materiales de construcción e insumos en República Dominicana.
> En este video voy a mostrar el problema que resuelve, cómo está construido,
> y una demo funcional de punta a punta contra la base de datos real en
> producción."

**Mostrar:** slide de portada o el home de la app ya cargado.

---

## 1. El problema (45 seg)

**Decir:**
> "Hoy, un contratista que necesita materiales tiene que llamar o visitar
> varias ferreterías para comparar precios, sin ningún lugar centralizado.
> Resuélvelo digitaliza ese proceso: un catálogo con productos de múltiples
> proveedores, un carrito, y un flujo de cotizaciones formal."

**Mostrar:** pantalla en blanco o el home; no hace falta interacción todavía.

---

## 2. Arquitectura y stack técnico (45–60 seg)

**Decir:**
> "La app está construida con Next.js 16 y React 19 en el frontend, TypeScript
> en todo el código, Tailwind y shadcn/ui para la interfaz. Los datos viven en
> Supabase: PostgreSQL con autenticación y seguridad a nivel de fila, o Row
> Level Security, que significa que la base de datos misma controla quién
> puede ver o modificar cada registro, no solo la interfaz. El carrito de
> compras se guarda en el navegador con Zustand. Y todo está desplegado en
> Vercel."

**Mostrar (opcional):** diagrama simple o el árbol de carpetas del repo
(`app/`, `components/`, `lib/`, `supabase/`) en el editor.

---

## 3. Demo — flujo de comprador (2.5–3 min)

1. **Home** (`/`) — mostrar el hero, categorías, sección "¿Por qué usar
   Resuélvelo?". Clic en una categoría (ej. "Ferretería") para mostrar que
   filtra correctamente el catálogo.

   **Decir:** "Desde el home puedo explorar por categoría directamente."

2. **Catálogo** (`/catalogo`) — mostrar el contador "20 productos de 5
   proveedores" (dato real de Supabase, no simulado). Usar el buscador,
   escribir por ejemplo "PVC" y mostrar que filtra.

   **Decir:** "Este catálogo se lee en tiempo real de Supabase. Si no
   hubiera credenciales configuradas, la app tiene un fallback automático a
   datos de ejemplo, para que nunca se rompa la demo — pero acá estamos
   viendo datos reales."

3. **Carrito** — agregar 2 productos de **proveedores distintos** (por
   ejemplo un producto de Promeria y uno de otro proveedor). Abrir el
   carrito (ícono superior derecho) y mostrar los ítems con precio y
   proveedor.

   **Decir:** "Voy a agregar productos de dos proveedores distintos a
   propósito, porque el sistema debe agruparlos en cotizaciones separadas."

4. **Login** — clic en "Solicitar cotización" sin estar logueado, mostrar
   que redirige a `/login` (protección de ruta). Iniciar sesión con
   `comprador@demo.com` / `Demo1234!`.

   **Decir:** "Si no estoy autenticado, el sistema me pide iniciar sesión
   antes de continuar."

5. **Enviar cotización** — volver al catálogo, abrir el carrito de nuevo
   (debería conservar los productos) y hacer clic en "Solicitar
   cotización". Mostrar la redirección a `/mis-cotizaciones?enviada=1` con
   el mensaje de éxito y **dos cotizaciones separadas**, una por proveedor.

   **Decir:** "Noten que se crearon dos cotizaciones independientes, una
   por cada proveedor, aunque las pedí desde un solo carrito."

---

## 4. Demo — flujo de proveedor (2–2.5 min)

1. **Cerrar sesión** y entrar con `promeria@demo.com` / `Demo1234!`.

2. **Bandeja de cotizaciones** (`/proveedor/pedidos`) — mostrar la
   cotización recién creada apareciendo como "Pendiente", con el producto,
   cantidad y total. Hacer clic en **Aceptar** y mostrar que cambia a
   "Aceptada" en tiempo real.

   **Decir:** "El proveedor ve la cotización que acabo de enviar como
   comprador, y puede aceptarla o rechazarla."

3. **Panel de proveedor** (`/proveedor`) — mostrar las estadísticas
   (productos activos, cotizaciones nuevas, pedidos del mes, sin stock) y
   la lista de "Mis productos".

4. **CRUD de productos** — clic en "Nuevo producto", llenar el formulario
   rápido (nombre, categoría, precio, unidad, stock) y publicarlo. Mostrar
   que aparece en la lista. Luego usar el botón de **eliminar** (ícono de
   basurero) para quitarlo, mostrando el diálogo de confirmación.

   **Decir:** "El proveedor administra su catálogo completo: crear,
   editar, activar o desactivar, y eliminar productos."

---

## 5. Extras de producto (1 min)

1. **Recuperación de contraseña** — ir a `/login`, clic en "¿Olvidaste tu
   contraseña?", mostrar el formulario de `/recuperar` y el mensaje de
   confirmación tras enviarlo.

2. **Páginas legales y 404** — mostrar rápidamente `/terminos`,
   `/privacidad`, y navegar a una URL inexistente para mostrar la página
   404 personalizada con botones para volver al inicio o al catálogo.

**Decir:** "También están cubiertos los flujos secundarios: recuperación
de contraseña, páginas legales, y una página de error 404 personalizada en
vez de la de Next.js por defecto."

---

## 6. Cierre (30–45 seg)

**Decir:**
> "En resumen: Resuélvelo es un MVP funcional de punta a punta, verificado
> contra una base de datos real en producción, con autenticación,
> seguridad a nivel de fila, catálogo, carrito, cotizaciones y panel de
> proveedor. El código está publicado en GitHub [mencionar URL] y la app
> está en vivo en resuelveloapp.vercel.app. Las mejoras futuras — panel de
> administrador, pagos, filtros avanzados — están documentadas en el
> roadmap del repositorio. Gracias por ver el video."

**Mostrar:** README del repositorio o la URL en vivo una última vez.

---

## Checklist antes de subir el video

- [ ] Se grabó con audio claro y pantalla legible (resolución mínima 1080p).
- [ ] Se mostró el flujo completo de comprador Y de proveedor.
- [ ] Se mencionó el stack técnico y la arquitectura.
- [ ] Duración entre 6 y 10 minutos (ajustar según lo que pida el docente).
- [ ] Subido a Google Drive con permisos "cualquiera con el enlace puede ver".
- [ ] Enlace copiado en `docs/DOCUMENTO-FINAL.md` sección 13 y en la
      plataforma del curso.
