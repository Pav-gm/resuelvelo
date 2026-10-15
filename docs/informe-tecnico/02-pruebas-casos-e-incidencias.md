# Pruebas: casos por requerimiento y bitácora de incidencias

Anexo técnico del informe final de Seminario de Proyecto II (Resuélvelo, 15 de octubre de 2026). El informe resume; este anexo conserva el detalle.

### 10.1 Plan de pruebas

| Nivel | Herramienta | Qué cubre | Cuándo corre |
| --- | --- | --- | --- |
| Análisis estático y tipos | ESLint, TypeScript (next typegen y tsc) | Código inválido, contratos entre formularios, acciones y filas | En cada worker antes de integrar y en CI por cada PR |
| Unitarias e integración de componentes | Vitest + Testing Library: 566 casos en 75 archivos | Acciones de servidor con Supabase simulado, páginas y componentes, carrito, validaciones, PDF, migraciones (contenido y rollback), notificaciones | En cada PR (ci.yml) y en cada integración de worker |
| Compilación de producción | next build | Rutas, prerender, dependencias | En cada PR |
| Migraciones | Vigilante de migraciones (rehearse\_migrations.sh) sobre una copia de producción en un PostgreSQL desechable | Que cada migración aplique, que el rollback deje el esquema y los datos iguales, que las comprobaciones de integridad pasen, que ninguna migración ya aplicada se edite y que las versiones no choquen | En cada PR con migraciones y antes de cada lanzamiento |
| Punta a punta | Playwright (e2e/ciclo.spec.ts): publicar → cotizar → ofertar → aceptar → despachar → recibir | El ciclo completo con las cuentas demo contra la base de desarrollo | En cada push a dev (e2e.yml) |
| Manual por rol | Dos agentes de prueba en Grok Bot, dirigidos por un agente de QA que redacta el plan, sigue el chat y reporta en el PR | Lo que cambia cada PR, los hallazgos abiertos de rondas anteriores y las regresiones de los PR acumulados en dev | Por cada versión desplegada en dev; decide si sale a producción |
| Posteriores al despliegue | curl a producción, comprobaciones SQL en producción, Vercel | Que el sitio responda, que las rutas protegidas redirijan, que la entrada de prueba no exista en producción, que la base cumpla las invariantes | Después de cada lanzamiento |

### 10.2 Casos de prueba relacionados con los requerimientos

| Req. | Caso | Datos | Resultado esperado | Resultado obtenido (ronda y fecha) |
| --- | --- | --- | --- | --- |
| RF01 | Entrar como comprador y como proveedor; cerrar sesión. | Cuentas demo | Menú y rutas según el rol; sin sesión, /cuenta redirige a /login. | OK (rondas de los PR #84 y #86, 14 y 15 de octubre). |
| RF02 | Catálogo con filtro «Provincia de entrega» = La Vega. | Zonas de cobertura de los 5 proveedores | Solo productos y proveedores que cubren la provincia; los conteos coinciden. | OK tras la corrección del PR #82 (ronda del 14 de octubre); antes fallaba la lista lateral. |
| RF03 | Carrito con cemento ×2 y varilla ×3, dirección «QA PR72 Obra» y fecha 30/10. | Productos de Materiales del Norte | Se crea una cotización con «Entrega solicitada»; fecha pasada rechazada. | OK; la fecha pasada se aceptaba y se corrigió en el PR #76 (ronda del PR #78). |
| RF03 | Solicitud «QA PR85 A» a dos proveedores con una línea libre «arena 2 m3». | Materiales del Norte y Ferretería López | Dos cotizaciones, comparador con una columna por proveedor, líneas con descripción y unidad. | OK tras el PR #80 (las líneas libres salían como «Producto no disponible»). |
| RF05 | El proveedor oferta con precio por línea, una línea «No disponible», plazo y validez; el comprador acepta desde el comparador. | #COT-000098 y siguientes | Confirmación con proveedor y total; la otra columna muestra «Se eligió otra oferta»; la solicitud queda «Cerrada»; la columna elegida muestra «Aceptada». | OK en la ronda del PR #86 (15 de octubre), después de dos correcciones (#85, #86). |
| RF05 | Despachar un pedido aceptado y abrir el PDF desde los dos roles. | #COT-000102 con una línea libre | Estado «Despachada» sin recargar; el total del PDF coincide con la página. | OK; el PDF daba RD$ 3,668.00 contra RD$ 3,560.00 por aplicar ITBIS a la línea libre; corregido en el PR #86 y verificado (RD$ 3,560.00). |
| RF04 | Archivar un producto usado en cotizaciones y restaurarlo. | Cemento Portland Tipo I | «Producto archivado.» con enlace a Archivados; «Restaurar» lo devuelve al catálogo. | OK (ronda del PR #82). Antes, el borrado fallaba en silencio (hallazgo abierto desde el PR #57). |
| RF06 | El administrador verifica un proveedor. | Materiales del Norte | Insignia «Empresa verificada» con fecha en el panel y en el perfil público. | OK («Empresa verificada el 9 de octubre de 2026»). |
| RF07 | Un comprador abre /proveedor; un visitante abre /mis-cotizaciones. | — | Redirección a /catalogo y a /login respectivamente. | OK (pruebas unitarias de proxy y ronda del PR #81). |
| RF08 | Precio y proveedor de cada línea vienen de la base. | Carrito manipulado en pruebas unitarias | La acción consulta productos y rechaza líneas inválidas. | OK (tests/cotizar-desde-carrito.test.ts). |
| RNF03 | Catálogo, carrito, detalle y panel a 375 px. | — | Sin desborde horizontal; nombres completos; diálogos usables. | OK desde el PR #65; antes los nombres se cortaban. |

### 10.5 Rondas de prueba manual por rol

Cuando Vercel termina de desplegar un commit de dev que viene de un PR integrado, el vigilante de QA lanza una ronda: un agente de QA lee el PR, escribe un plan en español con casos numerados para cada rol (lo que cambia el PR, los hallazgos abiertos de rondas anteriores y una prueba corta por cada PR acumulado), lo envía al grupo de Grok Bot y sigue la conversación. Resuelvelo Comprador entra con su enlace de prueba, ejecuta sus casos y reporta «OK» o «FALLA» con pasos y página; después Resuelvelo Proveedor hace lo mismo. El agente de QA redacta el informe, lo publica como comentario en el PR y en el PR de lanzamiento, y deja el veredicto como estado del commit: ok o hallazgos menores dejan pasar la versión; hallazgos, incompleto o sin resultado la detienen hasta que el autor crea los jobs de corrección. Hubo 54 rondas registradas en octubre; los veredictos acumulados fueron 19 rondas cuyos hallazgos quedaron corregidos en una ronda posterior, 12 con hallazgos pasados al backlog, 6 con hallazgos, 4 aceptadas por el autor, 3 con hallazgos menores, 3 que solo arrastraban hallazgos previos, 1 ok, 1 incompleta, 1 no entregada y 4 sin resultado (caídas del agente por límite de uso).

### 10.6 Registro de incidencias y correcciones

| # | Incidencia (detectada por) | Severidad | Causa | Corrección | Prueba posterior |
| --- | --- | --- | --- | --- | --- |
| 1 | Borrar un producto usado en cotizaciones no hacía nada ni mostraba error (QA, PR #57 al #65). | Media | La clave foránea impedía el borrado y la interfaz no informaba. | Archivar en vez de borrar, pestaña Archivados y Restaurar (PR #68, #82). | OK en las rondas de los PR #82 y #86. |
| 2 | El total del PDF de una cotización con línea libre no coincidía con la pantalla: RD$ 3,668.00 contra RD$ 3,560.00 (QA, PR #85). | Alta | El comprobante sumaba ITBIS a la línea libre; la pantalla la trataba con ITBIS incluido. | Línea sin producto = ITBIS incluido (PR #86). | OK: RD$ 3,560.00 en #102 y #105 (ronda del PR #86). |
| 3 | Se aceptaba una fecha requerida pasada (QA, PR #72). | Media | Solo se validaba el formato. | Mínimo en el campo y validación en el servidor con hora de Santo Domingo (PR #76). | OK: «La fecha requerida no puede ser anterior a hoy.» |
| 4 | Quitar una dirección usada en una cotización mostraba un error genérico al pie de otro formulario (QA, PR #72). | Media | Clave foránea sin mensaje propio. | Comprobación previa y mensaje en la tarjeta (PR #74). | OK: «Esta dirección se usó en una cotización y no se puede quitar.» |
| 5 | Las líneas libres salían como «Producto no disponible» en Mis cotizaciones y sin unidad (QA, PR #73). | Media | Las vistas suponían que toda línea tiene producto. | Descripción y unidad en lista, detalle, bandeja, comparador y PDF (PR #80, #82, #86). | OK: «QA PR81 arena, Pedido: 2 m3». |
| 6 | Una cotización aceptada antigua no aparecía en la bandeja del proveedor (QA, PR #72). | Media | La consulta tenía un tope de 20 filas. | Listado completo con pestañas, búsqueda y paginación (PR #77, #79). | OK: #045 y #074 visibles; «Página 1 de 5». |
| 7 | Fechas mostradas en UTC: una cancelación de las 11:40 p. m. salía con fecha del día siguiente (QA, PR #72). | Media | Formato sin zona horaria. | Formateadores compartidos con America/Santo\_Domingo (PR #77, #78). | OK en la ronda del PR #81. |
| 8 | El comparador no cerraba bien la solicitud: la otra columna mostraba «No disponible» y RD$ 0.00 en vez de «Se eligió otra oferta», y la elegida no decía «Aceptada» (QA, PR #73 al #85). | Media | Faltaban estados en el componente y la confirmación. | Confirmación, «Sin oferta», «Se eligió otra oferta», «Cerrada» y «Aceptada» (PR #85, #86). | OK en la ronda del PR #86. |
| 9 | «Cancelar venta» seguía visible en un pedido despachado (QA, PR #82). | Media | Condición de visibilidad incompleta. | Solo en estado aceptada (PR #85). | OK. |
| 10 | El agente proveedor perdió la sesión un minuto después de entrar por el enlace de prueba (QA, PR #81). | Media | signOut global al entrar el otro rol. | signOut con alcance local (PR #82). | OK: la sesión siguió abierta a los 3,5 minutos. |
| 11 | «Entrega en 1 provincias» (QA, PR #72). | Baja | Plural fijo. | Singular y plural (PR #77). | OK. |
| 12 | npm run typecheck falló: una Server Action que devuelve un objeto se pasaba a startTransition (orquestador, job 00j). | Bloqueo de integración | Cambio de tipo de retorno en una función existente. | Regla de integración: funciones nuevas en vez de cambiar firmas; el job se replanificó. | Build en verde; PR #68 integrado. |
| 13 | npm ci falló por un lockfile sin pdf-lib (orquestador, job 15). | Bloqueo de integración | El worker no puede actualizar el lockfile. | La dependencia entró por un PR aparte (#66, #71 para Playwright). | PR #70 integrado. |
| 14 | Una migración con versión anterior a la última de dev (vigilante, PR #70). | Bloqueo de integración | El planificador fecha la migración con la hora actual y dev ya tenía una posterior. | Renumeración automática en la rama; se eliminó la copia vieja. | Ensayo en verde; PR #70 integrado. |
| 15 | Un test del perfil del comprador falla de forma intermitente en CI y la prueba de punta a punta falla en main (CI, 15 de octubre). | Baja | Pendiente de diagnóstico. | Abierto; no bloquea el lanzamiento porque no son checks obligatorios de main. | Pendiente. |

### 10.7 Pruebas posteriores a las correcciones

Cada ronda vuelve a ejecutar los hallazgos abiertos de las rondas anteriores y los marca como corregidos solo cuando el agente los ve funcionando. En la ronda final (PR #86, 15 de octubre, 01:17 a 01:34) los cinco hallazgos que seguían abiertos (de los PR #73, #82, #83, #84 y #85) se vieron corregidos, incluido el total del PDF, y la ronda terminó con dos observaciones de severidad baja fuera de lo que cambiaba el PR: el filtro «Todos los estados» de Mis cotizaciones conserva el estado anterior en la URL, y «Cerrar sesión» desde el menú móvil no respondió una vez con el zoom al 300 %.
