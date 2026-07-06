<!--
ESTADO DE ESTE BORRADOR (léeme primero)
========================================
Este documento cubre las 17 secciones obligatorias del Proyecto Final de
Seminario de Proyecto I. Cada sección tiene una de estas tres etiquetas:

  [BORRADOR SÓLIDO]   → Redactado con hechos reales verificables del repo
                        (código, commits, pruebas, despliegue). Revisar tono
                        y ajustar a tu voz, pero el contenido es confiable.

  [BORRADOR GENÉRICO]  → Contenido de teoría de gestión de proyectos (Scrum,
                        Kanban, PMBOK, etc.) que es material de clase, no
                        específico de este proyecto. Seguro de usar tal cual.

Nota: se evaluó reconciliar algunas secciones con entregables previos del
curso ("EMANA 2", "SEMANA 3", "SEMANA 5", Miro) y se decidió (3 de julio de
2026) no hacerlo — el contenido de este documento queda como definitivo tal
cual está escrito acá.

Antes de entregar: pasar todo a Google Docs con formato de portada/índice
real, agregar las capturas de docs/screenshots/ donde se indique, y
verificar que el video (sección 13) esté grabado y enlazado.
-->

# Resuélvelo — Marketplace B2B de Proveedores de Materiales e Insumos

**Proyecto Final — Seminario de Proyecto I**

---

## 1. Portada

**Título del proyecto:** Resuélvelo — Marketplace B2B de proveedores de materiales e insumos
**Tipo de proyecto:** Página web empresarial / Sistema de ventas
**Estudiante:** Pavel Gonzalez
**Matrícula:** 100061480
**Docente:** Ing. Henry Candelario
**Asignatura:** Seminario de Proyecto I
**Trimestre:** Mayo–Julio 2026
**Fecha de entrega:** 8 de julio de 2026
**Repositorio:** https://github.com/Pav-gm/resuelvelo
**Demo en vivo:** https://resuelveloapp.vercel.app

*[BORRADOR SÓLIDO — completar con logo/formato institucional si el docente lo pide]*

---

## 2. Índice

1. Portada
2. Índice
3. Planteamiento del problema
4. Introducción
5. Marco teórico
6. Ciclo de vida del proyecto
7. Proceso de planificación
8. Ejecución del proyecto
9. Monitoreo y control
10. Gestión de riesgos
11. Herramientas y tecnologías
12. Resultados y logros
13. Explicación del proyecto punto por punto (video)
14. Conclusiones
15. Recomendaciones y futuras mejoras
16. Bibliografía
17. Anexos

*[BORRADOR SÓLIDO — este índice se regenera solo si usás encabezados de Google Docs]*

---

## 3. Planteamiento del problema

En República Dominicana, contratistas, constructoras y PYMEs que necesitan materiales de construcción, insumos eléctricos, de plomería o servicios afines deben contactar manualmente a múltiples ferreterías y distribuidores —por teléfono o en persona— para comparar precios y disponibilidad antes de decidir una compra. Este proceso es:

- **Lento**: cada cotización requiere llamadas o visitas individuales a cada proveedor.
- **Poco transparente**: no existe un lugar centralizado donde comparar precios de distintos proveedores para el mismo tipo de producto.
- **Sin trazabilidad**: las cotizaciones informales (por teléfono, WhatsApp) no dejan un historial estructurado de qué se pidió, a quién, y en qué estado quedó.
- **Limitante para los proveedores pequeños**: ferreterías y distribuidoras locales no tienen presencia digital propia ni forma sencilla de recibir solicitudes de compradores profesionales fuera de su zona de alcance habitual.

**Pregunta central del proyecto:** ¿Cómo se puede reducir el tiempo y la fricción del proceso de cotización entre compradores profesionales y proveedores de materiales, sin exigirle a ninguna de las dos partes procesos manuales repetitivos?

---

## 4. Introducción

### 4.1 Descripción del proyecto

*[BORRADOR SÓLIDO]*

Resuélvelo es un marketplace B2B (business-to-business) que conecta compradores profesionales —contratistas, constructoras y pequeñas y medianas empresas (PYMEs)— con proveedores de materiales de construcción, insumos eléctricos, de plomería, ferretería y servicios afines en República Dominicana. La plataforma permite a los compradores explorar un catálogo centralizado con productos de múltiples proveedores, armar un carrito de compra y solicitar cotizaciones formales a uno o varios proveedores simultáneamente. Los proveedores, por su parte, publican y administran su propio catálogo desde un panel dedicado y responden las cotizaciones que reciben (aceptar/rechazar), sin depender de canales informales como llamadas telefónicas.

El proyecto se implementó como una aplicación web completa (Next.js 16 + Supabase), desplegada en producción y verificada de punta a punta con datos reales, no solo maquetas.

### 4.2 Objetivo general

*[BORRADOR SÓLIDO]*

Diseñar, desarrollar y desplegar un producto mínimo viable (MVP) de un marketplace B2B que digitalice el proceso de cotización entre compradores profesionales y proveedores de materiales e insumos, aplicando prácticas profesionales de gestión de proyectos y de ingeniería de software.

### 4.3 Objetivos específicos

*[BORRADOR SÓLIDO]*

1. Modelar un esquema de datos relacional (Supabase/PostgreSQL) que represente compradores, proveedores, categorías, productos y cotizaciones, protegido con seguridad a nivel de fila (Row Level Security).
2. Implementar autenticación real con roles diferenciados (comprador, proveedor) y flujos completos de registro, inicio de sesión, cierre de sesión y recuperación de contraseña.
3. Construir un catálogo de productos con búsqueda y filtro por categoría, alimentado por datos reales de Supabase.
4. Implementar un flujo de carrito de compra y solicitud de cotizaciones que agrupe los productos por proveedor y cree una cotización independiente para cada uno.
5. Construir un panel de proveedor con estadísticas, gestión de productos (crear, editar, activar/desactivar, eliminar) y una bandeja de cotizaciones recibidas con la posibilidad de aceptar o rechazar.
6. Verificar el funcionamiento end-to-end de la aplicación contra una base de datos en producción (no solo datos de prueba/mock).
7. Desplegar la aplicación en un entorno de producción público (Vercel) y documentar el proyecto para terceros (README, capturas, licencia).

---

## 5. Marco teórico

*[BORRADOR GENÉRICO — material de clase; la aplicación concreta a este proyecto está al final de esta sección, marcada como BORRADOR SÓLIDO]*

### 5.1 Marcos y metodologías de gestión de proyectos

- **PMBOK (Project Management Body of Knowledge):** conjunto de estándares del PMI que organiza la gestión de proyectos en áreas de conocimiento (alcance, tiempo, costo, riesgo, calidad, comunicaciones, recursos, adquisiciones, interesados) y en grupos de procesos (inicio, planificación, ejecución, monitoreo y control, cierre). Este proyecto usa esa estructura de 5 fases como columna vertebral de la sección 6.
- **Scrum:** marco ágil iterativo basado en sprints cortos, con roles definidos (Product Owner, Scrum Master, equipo de desarrollo) y ceremonias (planning, daily, review, retrospectiva). Útil para proyectos con equipos y alcance que cambia frecuentemente.
- **Kanban:** sistema visual de flujo continuo de trabajo, organizado en columnas (ej. "Por hacer", "En progreso", "Hecho") con límites de trabajo en curso (WIP). No exige sprints ni roles fijos; se adapta bien a trabajo individual o de flujo continuo.
- **Lean:** enfoque centrado en eliminar desperdicio (trabajo que no agrega valor) y entregar valor de forma continua, con retroalimentación rápida.
- **Agile (paraguas general):** conjunto de valores y principios (Manifiesto Ágil) que priorizan software funcionando sobre documentación exhaustiva, colaboración con el cliente sobre contratos rígidos, y respuesta al cambio sobre seguir un plan fijo. Scrum, Kanban y XP son implementaciones concretas de estos principios.
- **XP (Extreme Programming):** metodología ágil centrada en prácticas técnicas: integración continua, pruebas automatizadas antes/junto con el código (test-driven), refactorización constante, entregas frecuentes en incrementos pequeños.
- **FDD (Feature-Driven Development):** metodología orientada a construir y entregar el software organizando el trabajo alrededor de funcionalidades (features) concretas y valiosas para el usuario, cada una entregada en ciclos cortos.

### 5.2 Aplicación a este proyecto

*[BORRADOR SÓLIDO]*

Dado que Resuélvelo fue desarrollado por un estudiante trabajando de forma individual (sin un equipo múltiple con el que coordinar sprints formales), el proyecto adoptó un enfoque **híbrido Kanban + XP**, más que un Scrum clásico:

- **Kanban** para organizar el trabajo: las tareas se gestionaron como una lista visual de pendientes con tres estados (pendiente / en progreso / completado), similar a un tablero Kanban, permitiendo ver en todo momento qué se estaba trabajando y qué faltaba, sin necesidad de sprints de duración fija.
- **Prácticas de XP**: cada cambio funcional se verificó de inmediato con pruebas automatizadas (40 pruebas unitarias con Vitest), linting (ESLint) y compilación de producción (`next build`) antes de considerarlo "hecho". Los incrementos fueron pequeños y frecuentes (ej. una función a la vez: recuperación de contraseña, luego eliminación de productos, luego corrección de un bug de cotizaciones), y cada uno se integró y verificó en el entorno real antes de pasar al siguiente.
- **PMBOK** se usó como marco de referencia para estructurar el ciclo de vida completo del proyecto (ver sección 6), separando claramente inicio, planificación, ejecución, monitoreo/control y cierre, aun cuando la ejecución interna de cada fase fue ágil.

---

## 6. Ciclo de vida del proyecto

*[BORRADOR SÓLIDO — basado en el historial real de desarrollo del repositorio]*

### 6.1 Inicio

Se definió el problema (proceso manual de cotización de materiales), el tipo de proyecto (página web empresarial / sistema de ventas) y el stack tecnológico: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase (PostgreSQL + Auth + Row Level Security) y Zustand. Se generó el scaffold inicial del proyecto con `create-next-app`.

*Ejemplo concreto:* commit `63a9c8d — Initial commit from Create Next App`.

### 6.2 Planificación

Se documentó un plan de desarrollo por fases en `docs/ROADMAP.md`, incluyendo el modelo de datos (tablas `profiles`, `proveedores`, `categorias`, `productos`, `cotizaciones`, `items_cotizacion`), la arquitectura objetivo (Server Components para lectura, Server Actions para mutaciones, RLS como capa de seguridad) y el orden de las siete fases de ejecución.

*Ejemplo concreto:* commit `acb985d — docs: roadmap de desarrollo, plan del proyecto final y plantilla de entorno`.

### 6.3 Ejecución

Se implementaron, en orden, las siete fases planificadas:

1. Esquema de base de datos y datos de demostración en Supabase (`supabase/schema.sql`, `supabase/seed.sql`).
2. Infraestructura de sesión (`proxy.ts`, capa de datos con fallback a mock en `lib/data.ts`).
3. Autenticación real (registro, login, logout, recuperación de contraseña).
4. Catálogo de productos con búsqueda y filtro por categoría.
5. Panel de proveedor con estadísticas y CRUD de productos.
6. Flujo de cotizaciones (carrito → cotización agrupada por proveedor → bandeja del proveedor → respuesta).
7. Entrega: corrección de bugs, documentación, despliegue en producción.

### 6.4 Monitoreo y control

Cada incremento se validó con: pruebas automatizadas (Vitest), linting (ESLint), compilación de producción (`next build`) y verificación manual navegando la aplicación con cuentas reales (comprador y proveedor) contra la base de datos real de Supabase. Ver detalle en la sección 9.

### 6.5 Cierre

Se corrigieron los últimos defectos encontrados (ver sección 10), se completó la documentación (README, licencia, capturas) y se desplegó la aplicación en Vercel, quedando públicamente accesible en **https://resuelveloapp.vercel.app**.

---

## 7. Proceso de planificación

### 7.1 Identificación de objetivos y entregables

*[BORRADOR SÓLIDO]*

Los entregables del proyecto se dividieron en dos grandes bloques:

1. **Entregable técnico:** aplicación web funcional, desplegada en producción, con su repositorio de código documentado (ver objetivos específicos en la sección 4.3).
2. **Entregable académico:** este documento de gestión de proyecto (17 secciones) más el video explicativo, evidenciando la aplicación de metodologías de gestión de proyectos al desarrollo del entregable técnico.

### 7.2 Cronograma y asignación de recursos

| Semana (Trimestre Mayo–Julio 2026) | Actividad principal |
|---|---|
| Semanas 1–2 | Definición del problema, objetivos y stack tecnológico |
| Semanas 3–5 | Modelo de datos, autenticación, catálogo |
| Semanas 6–8 | Panel de proveedor, flujo de cotizaciones |
| Semana 9 | Corrección de defectos, pruebas end-to-end, despliegue |
| Semana 10 (cierre, hasta el 8 de julio) | Documentación final, video, entrega |

**Recursos:** un desarrollador (el estudiante), asistido por un agente de IA (Cursor) para acelerar la implementación; infraestructura gratuita de Supabase (plan free tier) y Vercel (plan hobby) para hosting y base de datos.

### 7.3 Plan de comunicación

*[BORRADOR SÓLIDO]*

Al ser un proyecto individual, la comunicación se dio principalmente entre el estudiante y: (a) el asistente de IA, en sesiones de trabajo iterativas documentadas en el historial de cambios del repositorio; (b) el docente, a través de los entregables semanales previos (EMANA 2, SEMANA 3, SEMANA 5) y la plataforma del curso.

### 7.4 Plan de gestión de riesgos

Ver desarrollo completo en la sección 10. En síntesis: cada riesgo técnico identificado se documentó en el momento en que se detectó (no de forma retroactiva), y se resolvió antes de continuar con la siguiente fase, evitando que un defecto pequeño se acumulara con otros.

---

## 8. Ejecución del proyecto

*[BORRADOR SÓLIDO]*

### 8.1 Coordinación de actividades

El trabajo se organizó como una lista de tareas priorizada (estilo Kanban descrito en la sección 5.2), donde cada tarea representaba una funcionalidad completa y verificable (por ejemplo: "agregar recuperación de contraseña", "corregir la resolución de proveedor al crear una cotización"). Solo una tarea estaba "en progreso" a la vez, evitando trabajo a medias en múltiples frentes.

### 8.2 Manejo de recursos

Los recursos técnicos utilizados fueron todos de nivel gratuito/hobby: Supabase (base de datos y autenticación), Vercel (hosting), GitHub (control de versiones). Esto mantuvo el costo del proyecto en cero, alineado con el perfil de un MVP.

### 8.3 Comunicación efectiva y resolución de problemas

Cada vez que se detectó un problema durante la ejecución, se investigó su causa raíz antes de aplicar una corrección (en lugar de aplicar parches superficiales). Ejemplos documentados en la sección 10: el bug de resolución de proveedor en cotizaciones, la ruptura de `next build` por archivos ajenos al proyecto, y la configuración incorrecta de un proyecto de Vercel.

---

## 9. Monitoreo y control

*[BORRADOR SÓLIDO — esta sección tiene evidencia real y verificable]*

### 9.1 Evaluación del progreso en comparación con el plan

El progreso se comparó constantemente contra el plan de fases documentado en `docs/ROADMAP.md`. Al iniciar la fase de cierre, se descubrió que el propio documento de roadmap estaba desactualizado: marcaba como "Pendiente" funcionalidades (autenticación real, catálogo desde base de datos, CRUD de proveedor, flujo de cotizaciones) que **ya estaban implementadas**, simplemente no se había actualizado el documento. Esto en sí mismo fue una lección de control de proyecto: el documento de seguimiento debe actualizarse en el mismo momento en que cambia el estado real, no después.

### 9.2 Técnicas de seguimiento y control aplicadas

| Técnica | Herramienta | Qué detecta |
|---|---|---|
| Pruebas unitarias automatizadas | Vitest (40 pruebas) | Regresiones en el store de carrito, datos mock, capa de fallback |
| Análisis estático de código | ESLint | Código inválido, variables sin usar, malas prácticas |
| Verificación de tipos y compilación | `next build` (TypeScript + Turbopack) | Errores de tipos, rutas rotas, dependencias faltantes |
| Verificación funcional manual | Navegación real de la app (registro, login, catálogo, carrito, cotizaciones, panel de proveedor) contra Supabase en producción | Bugs de lógica de negocio que las pruebas automatizadas no cubren |
| Verificación en producción | Pruebas de humo (login, catálogo) contra la URL pública desplegada | Diferencias entre el entorno local y producción |

### 9.3 Gestión de cambios y ajustes

Durante la ejecución surgieron ajustes no planificados que se gestionaron sin desviar el cronograma general:

- Se decidió **eliminar** un stack exploratorio paralelo (Vue 3 + FastAPI) que coexistía en el repositorio, porque estaba rompiendo la compilación y la detección automática de despliegue, y no aportaba al alcance del MVP definido.
- Se corrigió sobre la marcha un defecto de seguridad/integridad de datos en la creación de cotizaciones (ver sección 10) apenas se detectó durante la revisión de código, antes de que llegara a producción.

---

## 10. Gestión de riesgos

*[BORRADOR SÓLIDO — riesgos reales identificados y resueltos durante el proyecto]*

### 10.1 Identificación de riesgos

| # | Riesgo | Probabilidad | Impacto |
|---|---|---|---|
| R1 | Confiar en datos enviados por el cliente (navegador) para resolver a qué proveedor pertenece un producto al crear una cotización | Alta (ya había ocurrido) | Alto — cotizaciones mal dirigidas o que fallan en silencio |
| R2 | Archivos de un stack tecnológico secundario (Vue/FastAPI) interfiriendo con la compilación del stack principal (Next.js) | Alta | Alto — bloqueaba `next build` y el despliegue por completo |
| R3 | Herramientas externas (Vercel) detectando automáticamente una configuración no deseada (modo "monorepo") | Media | Medio — requirió eliminar y recrear el proyecto de despliegue |
| R4 | Uso de credenciales del tipo incorrecto (token de base de datos en vez de token de cuenta) al desplegar | Media | Bajo si se detecta a tiempo, alto si no |
| R5 | Documentación de seguimiento (roadmap) desactualizada respecto al estado real del código | Alta | Medio — puede llevar a decisiones basadas en información incorrecta |

### 10.2 Estrategias de mitigación

- **Para R1:** nunca confiar en identificadores o precios enviados desde el cliente para operaciones sensibles; siempre resolver esos datos consultando la base de datos en el momento de la operación.
- **Para R2:** delimitar explícitamente en la configuración de TypeScript/ESLint qué carpetas pertenecen al proyecto activo, o eliminar directamente el código que no está en uso.
- **Para R3:** verificar el estado de la configuración de la herramienta externa antes de asumir que un cambio local se refleja automáticamente; si queda en un estado inconsistente, recrear el recurso en vez de intentar parchearlo indefinidamente.
- **Para R4:** validar cualquier credencial contra la API real correspondiente (una llamada de solo lectura) antes de usarla para una operación de mayor impacto.
- **Para R5:** actualizar el documento de seguimiento en el mismo momento en que se verifica un cambio de estado, no en una revisión aparte al final.

### 10.3 Ejemplos específicos de cómo se manejaron los riesgos (soluciones aplicadas)

1. **R1 — Bug de resolución de proveedor en cotizaciones:** se detectó que la función que crea una cotización desde el carrito intentaba adivinar el proveedor con una heurística basada en datos del cliente. Se corrigió reescribiendo la función para que consulte la tabla `productos` en la base de datos y obtenga el `proveedor_id` y el precio real de forma autoritativa, antes de crear la cotización. Además, se agregó manejo de error explícito: si ningún producto del carrito es válido, la aplicación ahora informa el error al usuario en lugar de redirigir a una pantalla de "éxito" falsa.
2. **R2 — Compilación rota por el stack secundario:** se detectó al ejecutar `npm run build` que fallaba por un archivo `.vue` ajeno al proyecto Next.js. Se solucionó excluyendo esas carpetas de la configuración de TypeScript y ESLint, y finalmente eliminándolas del repositorio por decisión del equipo, ya que no formaban parte del alcance del MVP.
3. **R3 — Proyecto de Vercel en estado inconsistente:** al desplegar, Vercel detectó automáticamente las carpetas del stack secundario y configuró el proyecto en modo "servicios" (monorepo). Al eliminar esas carpetas, el proyecto quedó en un estado que exigía esa configuración inexistente. Se resolvió eliminando el proyecto de Vercel vía API y creando uno nuevo, que se detectó correctamente como una aplicación Next.js simple.
4. **R4 — Token de acceso incorrecto:** antes de intentar cualquier despliegue, se validó el token proporcionado contra el endpoint de cuenta de la API de Vercel. La primera credencial resultó ser un token de base de datos (KV), no de cuenta — se detectó de inmediato (respuesta HTTP 403) y se solicitó la credencial correcta antes de continuar, evitando intentos fallidos de despliegue.
5. **R5 — Roadmap desactualizado:** se corrigió el documento completo, marcando explícitamente qué fases estaban realmente terminadas y verificadas, y se dejó una nota explicando por qué había quedado desactualizado.

---

## 11. Herramientas y tecnologías utilizadas

### 11.1 Software de gestión de proyectos

- **Tablero de tareas estilo Kanban** (gestión de pendientes por estado: pendiente / en progreso / completado) para organizar el trabajo de desarrollo.

### 11.2 Herramientas de colaboración y comunicación

- **GitHub** — control de versiones y historial de cambios del código fuente.
- **Cursor (agente de IA)** — asistencia en el desarrollo iterativo del código, usado como acelerador de la ejecución técnica.

### 11.3 Stack tecnológico del producto

| Categoría | Tecnología |
|---|---|
| Framework web | Next.js 16 (App Router, Server Components, Server Actions) |
| Lenguaje | TypeScript |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Estado del cliente | Zustand (carrito persistido en `localStorage`) |
| Base de datos | PostgreSQL (vía Supabase) |
| Autenticación | Supabase Auth (email + contraseña) |
| Seguridad de datos | Row Level Security (RLS) a nivel de base de datos |
| Pruebas | Vitest + Testing Library |
| Linting | ESLint (`eslint-config-next`) |
| Hosting / despliegue | Vercel |
| Control de versiones | Git + GitHub |

---

## 12. Resultados y logros

*[BORRADOR SÓLIDO]*

### 12.1 Evaluación de cómo se alcanzaron los objetivos

Los siete objetivos específicos definidos en la sección 4.3 se cumplieron y verificaron:

1. Esquema de datos con RLS implementado y aplicado a un proyecto Supabase real.
2. Autenticación completa (registro, login, logout, recuperación de contraseña) funcionando contra Supabase en producción.
3. Catálogo funcional con 20 productos reales de 5 proveedores, con búsqueda y filtro por categoría.
4. Flujo de carrito y cotizaciones verificado de punta a punta: se creó una cotización real agrupando productos de dos proveedores distintos, y el proveedor la recibió y aceptó correctamente.
5. Panel de proveedor con estadísticas reales, CRUD de productos completo (incluyendo eliminar, que se agregó durante la fase de cierre).
6. Verificación end-to-end realizada con cuentas reales de comprador y proveedor contra la base de datos de producción.
7. Aplicación desplegada públicamente en https://resuelveloapp.vercel.app.

### 12.2 Lecciones aprendidas (ensayo)

El desarrollo de Resuélvelo confirmó varias lecciones que la teoría de gestión de proyectos anticipa, pero que se viven distinto en la práctica. La primera es que **la documentación de seguimiento se desactualiza más rápido de lo que uno cree**: el roadmap del proyecto marcaba como pendientes funcionalidades que ya estaban terminadas, simplemente porque nadie volvió a revisar el documento después de implementarlas. Esto refuerza la importancia de las técnicas de monitoreo y control como una actividad continua, no como una revisión final.

La segunda lección es que **la seguridad y la integridad de los datos no son un "extra" que se agrega al final**: el defecto más serio encontrado durante el proyecto (confiar en datos del cliente para resolver a qué proveedor pertenece una cotización) hubiera pasado desapercibido sin una revisión deliberada del código antes de considerarlo listo. Un MVP funcional en apariencia puede tener fallas de fondo que solo aparecen bajo condiciones específicas.

La tercera lección tiene que ver con la **gestión de riesgos de infraestructura externa**: herramientas como Vercel toman decisiones automáticas (como detectar un "monorepo") que pueden dejar un proyecto en un estado inconsistente sin que el desarrollador lo pida explícitamente. Verificar el estado real de las herramientas externas —en vez de asumir que reflejan la intención— evitó que este problema se complicara aún más.

Finalmente, trabajar con alcance acotado (un MVP con siete fases claramente definidas, en vez de intentar construir todas las funciones imaginables) permitió terminar un producto funcional y desplegado dentro del tiempo disponible, dejando explícitamente documentadas las funciones fuera de alcance (panel de administrador, pagos, filtros avanzados) como backlog futuro en lugar de intentar abarcarlas todas.

---

## 13. Explicación del proyecto punto por punto (video)

Video grabado siguiendo el guion de `docs/GUION-VIDEO.md`, mostrando el flujo completo de comprador y de proveedor contra la aplicación real en producción.

**Enlace al video:** https://drive.google.com/file/d/15n7IPEHttmp6q8i0ufigFZhVpdqGt4-R/view?usp=sharing

---

## 14. Conclusiones

*[BORRADOR SÓLIDO]*

Resuélvelo demuestra que es posible construir, en un plazo acotado y con recursos de nivel gratuito, un producto mínimo viable funcional y verificable de un marketplace B2B: con autenticación real, base de datos con seguridad a nivel de fila, un flujo de negocio completo (catálogo → carrito → cotización → respuesta del proveedor) y despliegue público.

Desde la perspectiva de gestión de proyectos, el caso confirma que las fases del ciclo de vida (inicio, planificación, ejecución, monitoreo y control, cierre) se cumplen incluso en proyectos individuales de alcance reducido, y que las prácticas ágiles de entregas pequeñas y verificación continua (inspiradas en Kanban y XP) son compatibles con un marco de referencia más formal como PMBOK para estructurar el proyecto de punta a punta.

El mayor riesgo no gestionado hasta el cierre del proyecto fue el control de versiones: el código estuvo funcional y verificado localmente durante buena parte del desarrollo sin publicarse en un repositorio remoto, lo cual es una lección de proceso tan importante como cualquiera de las técnicas: la evidencia de trabajo debe publicarse de forma continua, no reservarse para el final.

---

## 15. Recomendaciones y futuras mejoras

*[BORRADOR SÓLIDO — basado en el backlog real documentado en `docs/ROADMAP.md`]*

- **Panel de administrador:** el rol `admin` ya existe en el modelo de datos, pero no tiene pantallas propias. Sería el siguiente paso lógico para moderar proveedores y categorías.
- **Filtros avanzados de catálogo:** agregar filtro por rango de precio y disponibilidad de stock (el botón "Filtros" se removió intencionalmente del catálogo hasta implementar esta función, en vez de dejar un botón decorativo sin efecto).
- **Enforcement de rutas por rol a nivel de middleware:** hoy la protección de rutas es por página; centralizarla en `proxy.ts` reduciría el riesgo de olvidar protección en una página nueva.
- **Pagos integrados** (Stripe / CardNet República Dominicana): habilitaría cobrar comisión por transacción, transformando el modelo de negocio de solo-cotización a compra-venta completa.
- **Aplicación móvil nativa** (iOS/Android) para proveedores que gestionan su catálogo desde el celular.
- **Motor de recomendación de proveedores** basado en historial de cotizaciones.
- **Panel de analíticas/BI** para proveedores (posible plan premium).
- **Expansión regional** (Haití, Puerto Rico, Jamaica) una vez validado el modelo en República Dominicana.

---

## 16. Bibliografía

*[BORRADOR SÓLIDO — completar con fuentes adicionales usadas en entregables previos]*

- Project Management Institute. *A Guide to the Project Management Body of Knowledge (PMBOK Guide)*.
- Schwaber, K., & Sutherland, J. *The Scrum Guide*. scrumguides.org.
- Beck, K. *Extreme Programming Explained: Embrace Change*.
- Anderson, D. J. *Kanban: Successful Evolutionary Change for Your Technology Business*.
- Palmer, S. R., & Felsing, J. M. *A Practical Guide to Feature-Driven Development*.
- Vercel Inc. *Next.js Documentation*. https://nextjs.org/docs
- Supabase Inc. *Supabase Documentation*. https://supabase.com/docs

---

## 17. Anexos

- **Capturas de pantalla del proyecto funcional:** ver `docs/screenshots/` en el repositorio (home, catálogo, carrito, mis cotizaciones, bandeja de cotizaciones del proveedor, panel de proveedor).
- **URL de la demo en vivo:** https://resuelveloapp.vercel.app
- **Repositorio de código:** https://github.com/Pav-gm/resuelvelo
- **Modelo de datos completo:** `supabase/schema.sql` y `supabase/seed.sql` en el repositorio.
- **Roadmap y estado detallado del proyecto:** `docs/ROADMAP.md` en el repositorio.
