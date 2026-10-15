# Riesgos, equipo y proceso de desarrollo

Anexo técnico del informe final de Seminario de Proyecto II (Resuélvelo, 15 de octubre de 2026). El informe resume; este anexo conserva el detalle.

### 7.2 Equipo y roles

El responsable del proyecto es una sola persona (Pavel González, matrícula 100061480). Para cubrir todos los roles de un equipo de software en el tiempo de un trimestre, el trabajo se organizó con un orquestador de agentes de inteligencia artificial que ejecutan tareas bien delimitadas bajo la dirección y revisión del autor. Las decisiones de producto, alcance, seguridad y aprobación de cada plan y de cada lanzamiento las tomó el autor.

| Rol | Quién lo ejerce | Responsabilidad |
| --- | --- | --- |
| Responsable de producto y alcance | Pavel González | Define el backlog, decide qué entra y qué se pospone, aprueba los planes de implementación y autoriza los cambios sensibles en producción (por ejemplo, migraciones que revocan permisos). |
| Arquitectura y revisión | Pavel González con asistencia de Claude Code | Reglas de integración (sin cambios de firma entre workers, lint, tipos, pruebas y build en verde), revisión de planes y de hallazgos de QA, diagnóstico de bloqueos. |
| Desarrollo | Workers de IA (Codex, frontend, Cursor) coordinados por el orquestador | Implementan cada job del backlog en una rama propia: migración con rollback, acciones de servidor, pantallas y pruebas; abren el pull request. |
| Calidad | CI en GitHub Actions; vigilante de migraciones; dos agentes de prueba en Grok Bot («Resuelvelo Comprador» y «Resuelvelo Proveedor») | Pruebas automatizadas en cada PR, ensayo de migraciones sobre copia de producción, rondas de prueba manual por rol con reporte en el PR. |
| Despliegue y operación | Vigilante de migraciones (servicio en pavel-server) y Vercel | Respaldo, migraciones en producción, comprobaciones de integridad, merge a main y despliegue. |
| Facilitador | Ing. Henry Candelario | Revisa los entregables de cada fase y evalúa. No desarrolla código. |

Regla de trabajo: no se inicia una mejora nueva si la anterior no está integrada y verificada. Un solo job del backlog se ejecuta a la vez por el motor del orquestador; el resto espera en cola.

### 7.5 Riesgos iniciales y cómo se gestionaron

| # | Riesgo | Probabilidad / impacto | Mitigación aplicada | Qué pasó |
| --- | --- | --- | --- | --- |
| R1 | Un solo desarrollador y un trimestre: el alcance supera el tiempo. | Alta / alto | Backlog priorizado; los jobs que frenan un lanzamiento llevan prefijo 00 y pasan primero; lo que no entra se declara fuera de alcance. | Se materializó en parte: sucursales y tres mejoras de interfaz quedaron para después (sección 15). |
| R2 | Una migración destruye datos en producción. | Media / crítico | Cada migración lleva rollback; se ensaya sobre una copia de producción antes de integrarse; las destructivas (DROP, DELETE, cambios de RLS o REVOKE) detienen el lanzamiento hasta la aprobación explícita del autor; respaldo antes de cada aplicación. | Ocurrió una vez: la migración que revoca UPDATE directo en cotizaciones esperó la aprobación manual y se aplicó el 15 de octubre con respaldo 20261015T053714Z. |
| R3 | Las pruebas manuales no se pueden repetir en cada versión. | Alta / alto | Dos agentes de prueba por rol ejecutan un plan por cada versión desplegada y reportan en el PR; la versión no sale a producción sin ese veredicto. | 54 rondas ejecutadas. El bloqueo recurrente (el agente proveedor no podía escribir contraseñas) se resolvió con una entrada de prueba por enlace que solo existe en el entorno de desarrollo (PR #81). |
| R4 | Dependencias externas fallan (límites de GitHub, Vercel, reinicios del servidor). | Media / medio | Reintentos en el vigilante; actualizaciones automáticas de xrdp bloqueadas tras un reinicio que dejó huérfana la sesión de QA; monitoreo cada 4 minutos. | Se materializó varias veces sin pérdida de trabajo; cada caso quedó registrado en el PR correspondiente. |
| R5 | Dos workers cambian la misma función y rompen la compilación. | Alta / medio | Regla de integración: quien necesita otra firma crea una función nueva y deja la existente; lint, typecheck, pruebas y build en verde antes de pasar al siguiente worker. | Los bloqueos por tipos (por ejemplo, TS2322 al cambiar el retorno de una acción) se resolvieron ajustando la descripción del job y reintentando. |
| R6 | Datos de prueba contaminan el entorno de desarrollo. | Alta / bajo | Los productos de prueba se nombran «QA PRnn» y se eliminan al final de cada ronda; los datos de prueba viven solo en el proyecto de Supabase de desarrollo. | Controlado; producción se sembró con datos de demostración separados. |

### 9.9 Lo que cambió respecto a Seminario de Proyecto I

| Aspecto | MVP de Seminario I (julio de 2026) | Versión final (15 de octubre de 2026) |
| --- | --- | --- |
| Flujo de cotización | Pedir; el proveedor acepta o rechaza al precio de catálogo. | Oferta formal del proveedor, decisión del comprador, despacho, recepción, cancelación con motivo, comprobante PDF, reseña verificada. |
| Varios proveedores | Una cotización por proveedor del carrito, sin comparación. | Solicitud abierta a hasta cinco proveedores con comparador y aceptación excluyente. |
| Catálogo | Búsqueda y categoría. | Subcategorías, precio, stock disponible, provincia de entrega, fichas con foto, SKU y especificaciones. |
| Cuenta | Enlace a Mis cotizaciones. | Menú de cuenta por rol, Mi cuenta, perfil con RNC y direcciones de obra, notificaciones. |
| Proveedor | Lista de productos y bandeja simple. | Panel con menú lateral: resumen con métricas, pedidos con filtros, archivados, reseñas, perfil de empresa con zonas, verificación. |
| Administrador | Rol en la base, sin pantallas. | Panel de administración y verificación de proveedores. |
| Base de datos | 6 tablas, un schema.sql. | 12 tablas, 34 migraciones con rollback y comprobaciones, 24 funciones, 41 políticas RLS. |
| Pruebas | 38 casos unitarios y un recorrido manual. | 566 casos en 75 archivos, prueba de punta a punta, CI en cada PR, ensayo de migraciones, 54 rondas de QA por rol. |
| Entrega | Push a main publica en Vercel. | dev → QA → respaldo → migraciones → main → producción, automatizado y con aprobación manual para lo destructivo. |

### 9.10 Proceso de desarrollo

Cada mejora empieza como un archivo de backlog en Markdown con el título, lo esperado, las pruebas y las reglas de integración. El orquestador crea un job, un agente planificador propone un plan por archivos y por worker; el autor lo revisa (y lo rechaza cuando cambia firmas existentes, toca políticas RLS sin necesidad o no deja el repositorio compilando entre workers) y lo aprueba. Los workers implementan en una rama, con lint, typecheck, pruebas y build en verde; un revisor automático detecta riesgos y el job abre el pull request. A partir de ahí el pipeline de la sección 12 decide si entra a dev y, tras la ronda de QA, a producción. El autor interviene cuando un job se bloquea (por ejemplo, un conflicto de merge o un lockfile sin una dependencia nueva), cuando hay que aprobar un cambio sensible, y para convertir cada hallazgo de QA en un nuevo job de corrección.
