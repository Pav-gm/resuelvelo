# Diccionario de datos completo

Anexo técnico del informe final de Seminario de Proyecto II (Resuélvelo, 15 de octubre de 2026). El informe resume; este anexo conserva el detalle.

### 8.1 Información que maneja el sistema

La base de datos es PostgreSQL en Supabase. Supabase Auth administra las credenciales en auth.users; el esquema public contiene doce tablas de negocio, 24 funciones (RPC y triggers), 41 políticas de Row Level Security, 5 triggers y 29 índices. Las cifras se tomaron del catálogo del sistema del proyecto de desarrollo el 15 de octubre de 2026; producción tiene la misma estructura porque recibe exactamente las mismas migraciones.

### 8.3 Relaciones y cardinalidades

- auth.users 1:1 profiles. El id del perfil es el uid de Auth; el trigger handle\_new\_user crea el perfil al registrarse.
- profiles 1:1 proveedores, solo cuando el rol es proveedor. proveedores 1:N proveedor\_zonas (provincias que cubre).
- categorias 1:N subcategorias; categorias y subcategorias 1:N productos; proveedores 1:N productos.
- profiles (comprador) 1:N direcciones\_obra, 1:N solicitudes y 1:N cotizaciones; proveedores 1:N cotizaciones.
- solicitudes 1:N cotizaciones (una por proveedor invitado); direcciones\_obra 0..1:N cotizaciones (entrega en esa obra).
- cotizaciones 1:N items\_cotizacion; productos 0..1:N items\_cotizacion (una línea libre no tiene producto y lleva descripción y unidad).
- cotizaciones 1:N notificaciones; cotizaciones 1:0..1 feedback (una reseña verificada por pedido recibido).

### 8.4 Diccionario de datos

| Tabla | Clave primaria | Claves foráneas | Atributos principales y reglas |
| --- | --- | --- | --- |
| profiles | id (uuid, = auth.users.id) | — | email, nombre, rol (comprador, proveedor, admin), telefono, razon\_social, rnc (validado por longitud 9 u 11 dígitos), avatar\_url, created\_at. |
| proveedores | id | user\_id → profiles | nombre\_empresa, descripcion, direccion, ciudad, rnc, telefono, whatsapp, horario, sitio\_web, logo\_url, verificado, verificacion\_estado, verificacion\_nota, verificacion\_solicitada\_at, verificado\_at. |
| proveedor\_zonas | (proveedor\_id, provincia) | proveedor\_id → proveedores | Provincias de cobertura; alimenta el filtro «Provincia de entrega». |
| categorias | id | — | nombre, slug (único), icono. |
| subcategorias | id (text) | categoria\_id → categorias | nombre, slug. |
| productos | id | proveedor\_id → proveedores; categoria\_id → categorias; subcategoria\_id → subcategorias | nombre, descripcion, precio (≥ 0), unidad, stock (≥ 0), stock\_reservado, sku, especificaciones, imagen\_url, itbis\_incluido, activo, archivado\_at (archivo lógico cuando el producto ya está en cotizaciones). |
| direcciones\_obra | id | user\_id → auth.users | etiqueta, direccion, provincia, municipio, referencia, es\_principal. No se puede borrar si una cotización la usa. |
| solicitudes | id | comprador\_id → profiles | titulo, notas, fecha\_requerida (no anterior a hoy), created\_at. Agrupa las cotizaciones enviadas a varios proveedores. |
| cotizaciones | id | comprador\_id → profiles; proveedor\_id → proveedores; solicitud\_id → solicitudes; direccion\_obra\_id → direcciones\_obra | numero (secuencial, se muestra como #COT-000102), estado (pendiente, respondida, aceptada, rechazada, despachada, recibida, cancelada), total\_estimado, total\_ofertado, plazo\_dias, valida\_hasta, condiciones, fecha\_requerida, respondida\_at, aceptada\_at, rechazada\_at, rechazada\_motivo, despachada\_at, recibida\_por, cancelada\_por, cancelada\_motivo, cancelada\_at. |
| items\_cotizacion | id | cotizacion\_id → cotizaciones; producto\_id → productos (nulo en líneas libres) | descripcion, unidad, cantidad (> 0), precio\_unitario, precio\_ofertado, cantidad\_ofertada, cantidad\_confirmada (no supera la solicitada), sujeta\_disponibilidad, stock\_al\_cotizar. |
| notificaciones | id | user\_id → auth.users; cotizacion\_id → cotizaciones | tipo (nueva\_solicitud, cotizacion\_respondida, aceptada, rechazada, despachada, recibida, cancelada), titulo, cuerpo, leida\_at, created\_at. Las crean triggers al cambiar el estado. |
| feedback | id | cotizacion\_id → cotizaciones; comprador\_id → profiles; proveedor\_id → proveedores | calificacion (1 a 5), comentario, respuesta del proveedor, respuesta\_at. Solo sobre pedidos recibidos (reseña verificada). |

### 8.5 Normalización

El esquema está en tercera forma normal. Cada tabla tiene una clave primaria uuid (o compuesta en proveedor\_zonas), los atributos dependen solo de su clave y no hay grupos repetidos: las provincias de cobertura, las direcciones de obra y las líneas de cotización son tablas propias en lugar de columnas con listas. Hay dos desnormalizaciones deliberadas y documentadas: items\_cotizacion copia precio\_unitario y descripcion al crear el pedido, para que el historial no cambie si el proveedor edita o archiva el producto; y cotizaciones guarda total\_estimado y total\_ofertado calculados por las funciones SQL, para que las listas no recalculen sobre cientos de líneas.

### 8.8 Integridad, seguridad y respaldo

- **Integridad referencial:** claves foráneas con on delete cascade donde el hijo no existe sin el padre (perfil, empresa, líneas, notificaciones) y restricción explícita donde el historial debe conservarse (una dirección usada en una cotización no se borra; un producto usado se archiva en vez de eliminarse).
- **Reglas de dominio en la base:** checks de rol, estado, precio y stock; la función de aceptación valida cantidades confirmadas; la de solicitudes cierra las cotizaciones hermanas al aceptar una oferta; los números de cotización son únicos y secuenciales.
- **Seguridad:** 41 políticas RLS. Cada usuario lee y edita su perfil; el catálogo activo es público en lectura; solo el dueño muta sus productos; comprador y proveedor ven únicamente sus cotizaciones; las transiciones de estado pasan por funciones SQL con security definer y la modificación directa de cotizaciones por el cliente está revocada (migración 20261010000206). Las funciones RPC no están expuestas al rol anónimo.
- **Respaldo:** antes de aplicar migraciones en producción el vigilante toma un respaldo etiquetado (el del lanzamiento final es 20261015T053714Z).
