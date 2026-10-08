# Seminario de Proyecto II
## Gestión de proyectos de software — Análisis a partir del video y de Resuélvelo

**Estudiante:** Pavel Gonzalez  
**Matrícula:** 100061480  
**Docente:** Ing. Henry Candelario  
**Asignatura:** Seminario de Proyecto II  
**Proyecto pasado (Seminario de Proyecto I):** Resuélvelo — Marketplace B2B de proveedores de materiales e insumos  
**Trimestre:** Agosto 2026  

---

# Portada

**Universidad / Institución:** Seminario de Proyecto II  
**Asignatura:** Seminario de Proyecto II  
**Docente:** Ing. Henry Candelario  
**Estudiante:** Pavel Gonzalez  
**Matrícula:** 100061480  
**Título del trabajo:** Contenidos del video sobre gestión de proyectos de software, aplicados al proyecto Resuélvelo  
**Proyecto presentado en Seminario de Proyecto I:** Resuélvelo (marketplace B2B)  
**Repositorio:** https://github.com/Pav-gm/resuelvelo  
**Aplicación en producción:** https://resuelveloapp.com  
**Fecha:** agosto 2026  

---

# Introducción

En Seminario de Proyecto I se desarrolló **Resuélvelo**, un marketplace B2B que conecta compradores profesionales —contratistas, constructoras y PYMEs— con proveedores de materiales de construcción, plomería, electricidad y ferretería en República Dominicana. El sistema permite explorar un catálogo, armar un carrito y solicitar cotizaciones formales a varios proveedores, en lugar de depender de llamadas y WhatsApp. El MVP se implementó con Next.js, TypeScript, Supabase y Vercel, y quedó publicado en producción.

Este trabajo parte de los contenidos del video de gestión de proyectos de software asignado en Seminario de Proyecto II. El propósito no es repetir definiciones aisladas, sino **relacionar cada idea del video con lo que realmente ocurrió** al planificar, construir y entregar Resuélvelo: qué se planificó, qué se atrasó, qué riesgos aparecieron y qué se debe mejorar ahora para completar el sistema.

La gestión de proyectos no es un trámite académico. En Seminario I se comprobó que un producto puede estar “casi listo” en el código y, aun así, fallar en la evidencia (repositorio publicado tarde, roadmap desactualizado, un stack exploratorio que rompió el despliegue). Esas lecciones son el hilo conductor de las respuestas que siguen.

---

# Desarrollo

## Preguntas y respuestas

### 1. ¿Qué se entiende por gestión de proyectos de software?

La gestión de proyectos de software es el conjunto de prácticas para **planificar, organizar, ejecutar, controlar y cerrar** el trabajo necesario para entregar un sistema que cumpla un objetivo, dentro de un tiempo, un presupuesto y un nivel de calidad aceptables.

No se limita a “escribir código”. Incluye definir el problema, acordar el alcance, estimar tiempo y recursos, ordenar actividades, anticipar riesgos, dar seguimiento al avance y documentar los cambios. En Resuélvelo esto se tradujo en un ciclo de vida con cinco fases (inicio, planificación, ejecución, monitoreo y cierre), un roadmap por etapas y criterios de “hecho” que no eran solo “compila”, sino “funciona contra Supabase real y está desplegado”.

### 2. ¿Cuál considera que es la importancia de gestionar correctamente un proyecto de software?

Gestionar bien un proyecto es lo que separa un prototipo suelto de un producto entregable. Sin gestión, el esfuerzo se dispersa: se construyen pantallas bonitas sin autenticación real, o se deja el repositorio para el último día.

En Seminario I la importancia se vio en dos sentidos. Cuando sí se gestionó —por ejemplo, al definir un orden de fases (base de datos → sesión → auth → catálogo → panel → cotizaciones → entrega)— el sistema avanzó de forma acumulativa. Cuando no se gestionó —publicar GitHub al final, no actualizar el roadmap, dejar un stack Vue/FastAPI dentro del mismo repo— aparecieron bloqueos de build, un deploy inconsistente en Vercel y la sensación de que “faltaba más de lo que realmente faltaba”. Gestionar no garantiza que no haya problemas; garantiza que los problemas se vean a tiempo y se puedan decidir.

### 3. ¿Cuáles son algunos de los elementos que deben ser considerados para gestionar un proyecto de software?

Los elementos que el video y la práctica de Seminario I coinciden en señalar son:

- **Objetivos y alcance:** qué se va a entregar y qué queda fuera (en Resuélvelo, un MVP web; no una app nativa ni pagos en la primera entrega).
- **Tiempo:** cronograma, hitos y fecha de entrega (8 de julio de 2026 en Seminario I).
- **Recursos:** personas, herramientas, infraestructura y conocimiento.
- **Requerimientos:** comprador, proveedor, catálogo, cotizaciones, seguridad (RLS).
- **Calidad:** pruebas, lint, build de producción y verificación manual.
- **Riesgos:** dependencias externas (Supabase, Vercel), datos del cliente, documentación desactualizada.
- **Comunicación y evidencias:** commits, README, capturas, video y documentos semanales.
- **Cambios:** qué se acepta, qué se pospone y cómo se registra.

### 4. ¿Por qué la planificación es importante antes de iniciar el desarrollo de un sistema?

Porque el desarrollo sin plan convierte cada decisión en improvisación. Antes de escribir las pantallas de Resuélvelo fue necesario decidir el modelo de datos (`profiles`, `proveedores`, `categorias`, `productos`, `cotizaciones`, `items_cotizacion`), el orden de dependencias y el stack. Si se hubiera empezado por el catálogo visual sin definir autenticación ni RLS, el trabajo se habría reescrito.

La planificación no congela el proyecto. Sirve para **saber qué se está construyendo, en qué orden y con qué criterio de terminado**. En este caso, el documento `docs/ROADMAP.md` evitó que se implementara el panel de proveedor antes de existir la tabla de productos y la sesión del usuario.

### 5. ¿Qué relación existe entre la planificación, los recursos y el tiempo disponible para desarrollar un proyecto?

Plan, recursos y tiempo forman un triángulo. Si el tiempo es fijo (un trimestre) y el recurso humano es uno solo, el alcance tiene que caber en esa capacidad. Resuélvelo se planificó como MVP precisamente por eso: un desarrollador, infraestructura gratuita (Supabase y Vercel) y diez semanas académicas.

Si se aumenta el alcance —por ejemplo, pagos con CardNet, app móvil y panel de administración— sin aumentar tiempo ni personas, el cronograma se rompe. La planificación es el mecanismo que hace explícita esa relación: no se “espera que alcance”, se recorta o se reordena. En Seminario I se rechazó la app nativa y se priorizó una PWA web por esa razón.

### 6. ¿Por qué es necesario establecer objetivos claros antes de comenzar un proyecto de software?

Un objetivo claro permite decidir qué sí y qué no entra en cada semana. El objetivo general de Resuélvelo fue diseñar, desarrollar y desplegar un MVP que digitalizara la cotización B2B. Los objetivos específicos (esquema con RLS, auth con roles, catálogo real, carrito y cotizaciones, panel de proveedor, verificación end-to-end y deploy) sirvieron como lista de aceptación.

Sin esos objetivos, habría sido fácil perderse en detalles de diseño o en un segundo stack (Vue + FastAPI) que no aportaba al entregable. Los objetivos también permiten, al cierre, responder con evidencia: se cumplieron porque hay URL pública, repositorio y flujo verificado, no porque “se avanzó mucho”.

### 7. ¿Qué importancia tiene definir las actividades que serán necesarias para alcanzar los objetivos del proyecto?

Definir actividades convierte un objetivo abstracto (“tener un marketplace”) en trabajo ejecutable. En Resuélvelo las actividades se agruparon en siete fases: schema y seed, middleware de sesión, auth, catálogo, CRUD de proveedor, cotizaciones y entrega.

Esa descomposición tiene tres beneficios. Primero, se ve el tamaño real del trabajo. Segundo, se identifican dependencias (no se puede cotizar si no hay productos ni sesión). Tercero, se puede marcar avance: una fase hecha es un incremento demostrable, no un porcentaje inventado.

### 8. ¿Qué consecuencias podría tener iniciar el desarrollo de un software sin realizar una planificación adecuada?

Las consecuencias más visibles, y varias se rozaron en Seminario I, son:

- **Retrabajo:** construir UI con datos mock y luego descubrir que el modelo de datos no encaja.
- **Alcance inflado:** agregar un stack paralelo “por si acaso”, que luego rompió `next build` y el deploy.
- **Falsa sensación de avance:** el roadmap marcaba como pendientes funciones que ya estaban hechas, porque no se actualizaba el plan.
- **Entrega incompleta de evidencias:** el código funcionaba localmente, pero GitHub se publicó tarde. Sin repositorio remoto, el proyecto no era evaluable según la rúbrica.
- **Riesgos que explotan al final:** Vercel detectó un monorepo inexistente justo cuando había que desplegar.

Empezar a programar da la impresión de velocidad; sin plan, esa velocidad suele ser en la dirección equivocada.

### 9. ¿Por qué la estimación de tiempo y recursos puede ser determinante para el éxito de un proyecto?

Porque el éxito académico y el de producto se miden contra una fecha y una capacidad real. Si se estima que el CRUD de productos toma un día y en realidad toma una semana (validaciones, RLS, imágenes, estados activo/inactivo), se come el tiempo de cotizaciones o del video.

En Seminario I la estimación se hizo de forma conservadora: MVP web, herramientas gratuitas, tarifa y presupuesto de referencia de USD 11,079 para un escenario profesional, y un cronograma de diez semanas para el trabajo del estudiante. Eso evitó prometer pagos, app nativa o expansión regional dentro del mismo trimestre. Una estimación honesta no es pesimismo: es la diferencia entre entregar un sistema usable o entregar una lista de intenciones.

### 10. ¿Qué factores pueden provocar que un proyecto de software no cumpla con el tiempo inicialmente establecido, como le pasó a algunos en Seminario de Proyecto I?

En Resuélvelo el producto técnico llegó, pero **varias actividades de cierre se comprimieron**. Los factores que lo explican —y que también explican atrasos de otros equipos— fueron:

1. **Subestimar el trabajo “no de features”:** documentación, video, capturas, README y publicación en GitHub no son opcionales; se dejaron para el final.
2. **Dependencias externas:** Supabase, Vercel y tokens incorrectos (un token de base de datos en vez de uno de cuenta) consumieron tiempo no planificado.
3. **Alcance paralelo no controlado:** el stack exploratorio Vue/FastAPI no estaba en el plan del MVP y bloqueó la compilación.
4. **Trabajo individual sin buffer:** un solo desarrollador no puede absorber imprevistos sin mover hitos.
5. **Seguimiento desactualizado:** si el plan no refleja la realidad, se descubren huecos tarde (por ejemplo, protección de rutas solo a nivel de página).
6. **Cambios de requerimiento o de rubro** (Promeria es plomería, no materiales generales) que obligaron a corregir datos y textos a mitad de camino.

Estos factores no son excusas; son causas recurrentes. El video insiste en que el retraso rara vez nace “del código difícil”, sino de no reservar tiempo para integración, evidencias e imprevistos.

### 11. ¿Por qué un proyecto de software debe contemplar posibles dificultades o imprevistos?

Porque el software vive en un entorno que no se controla del todo: APIs, planes gratuitos, configuración automática de hosting, datos mal enviados desde el navegador, errores de credenciales. Si el plan asume que todo saldrá a la primera, cualquier incidente se come la fecha de entrega.

Resuélvelo contempló imprevistos de dos maneras. En el presupuesto profesional se incluyó una contingencia del 10%. En la ejecución real, cada riesgo técnico se resolvió antes de pasar de fase: se dejó de confiar en el `proveedor_id` enviado por el cliente; se eliminó el código que rompía el build; se recreó el proyecto de Vercel cuando quedó inconsistente. Contemplar dificultades no es ser negativo: es dejar margen y un plan B.

### 12. ¿Qué importancia tiene realizar seguimiento al avance de un proyecto?

El seguimiento responde una pregunta simple: **¿vamos como dijimos que íbamos a ir?** Sin seguimiento, el equipo trabaja mucho y no sabe si está cerca del cierre.

En Seminario I el seguimiento se hizo con el roadmap, commits, `npm run build`, ESLint, pruebas (Vitest) y verificación manual contra Supabase. Eso detectó regresiones y el bug de cotizaciones antes de producción. También reveló un fallo de proceso: el roadmap no se actualizaba al mismo ritmo que el código. El seguimiento, entonces, no es solo “mirar el tablero”; es comparar evidencia (build verde, flujo real, URL pública) contra el plan.

### 13. ¿Qué relación existe entre la gestión de riesgos y la planificación de un proyecto de software?

La planificación dice **qué se va a hacer y cuándo**. La gestión de riesgos dice **qué puede impedir que eso ocurra y qué se hará si ocurre**. Son dos caras del mismo plan.

Si se planifica “desplegar en la semana 9” sin preguntar “¿qué pasa si Vercel detecta un monorepo?”, el hito es frágil. En Resuélvelo, los riesgos R1 a R5 (datos del cliente, stack secundario, configuración de Vercel, credenciales, documentación vieja) no eran teóricos: ya habían ocurrido o eran altamente probables. Incorporarlos a la planificación significa: no cerrar una fase si el riesgo de esa fase sigue abierto, y reservar tiempo de contingencia en el cronograma.

### 14. ¿Por qué los cambios durante el desarrollo de un proyecto deben ser controlados y documentados?

Porque un cambio no documentado se vuelve deuda invisible. Alguien (incluido el propio autor, semanas después) no sabe por qué se tomó esa decisión ni qué se rompió al tomarla.

Ejemplos controlados en Resuélvelo:

- Se **eliminó** el stack Vue/FastAPI porque no estaba en el alcance y rompía el build. Quedó registrado en el roadmap y en el documento final.
- Se **corrigió** el rubro de Promeria (plomería, no construcción) y se creó el proveedor mock “Materiales del Norte”.
- Se adoptó el nombre **Resuélvelo** con tilde en la UI.

Si esos cambios se hubieran hecho “en silencio”, el catálogo, las capturas y el video habrían contradicho el código. Controlar el cambio no significa prohibirlo; significa evaluarlo contra objetivos, tiempo y riesgo, y dejar rastro (commit, decisión, actualización del plan).

### 15. ¿Qué papel desempeña el equipo de trabajo en el éxito de un proyecto de software?

El equipo es quien convierte el plan en incrementos reales. Aunque Resuélvelo fue un proyecto individual, el “equipo” incluyó al estudiante como responsable de producto y desarrollo, al docente como interesado que define rúbrica y fechas, y a un agente de IA (Cursor) como acelerador técnico. El éxito dependió de que esa coordinación tuviera un único alcance, un único criterio de calidad y un único orden de trabajo.

En un equipo más grande el papel se multiplica: hace falta comunicación, roles claros y no sobrecargar a una sola persona. La lección de Seminario I es que **incluso trabajando solo** hay que comportarse como líder de proyecto: priorizar, documentar, no abrir frentes en paralelo y no reservar las evidencias para el último día. El talento técnico no sustituye esa disciplina.

### 16. A partir de su proyecto en Seminario de Proyecto I, identifique tres actividades fundamentales que deberán realizar para completar el sistema que usted presentó o posibles mejoras para finalizarlas.

El MVP de Resuélvelo está desplegado, pero el sistema aún no está “completo” como producto. Tres actividades fundamentales para Seminario II son:

1. **Panel de administración.** El rol `admin` existe en el esquema y en los tipos, pero no tiene pantallas. Sin él no se pueden verificar proveedores, moderar productos ni ver el marketplace como operador.
2. **Protección centralizada de rutas por rol.** Hoy cada página se protege por su cuenta con `redirect()`. Hay que llevar esa regla a `proxy.ts` para que una página nueva no quede accidentalmente pública.
3. **Filtros avanzados de catálogo (precio y stock).** El catálogo ya busca y filtra por categoría; falta el filtrado que un comprador profesional usa de verdad. El botón de filtros se retiró hasta implementarlo: completarlo cierra una promesa visible de la UI.

Estas tres cierran huecos del MVP. Mejoras posteriores (pagos Stripe/CardNet, app móvil, recomendaciones) se pueden planificar después, no mezclarse con el cierre del sistema base.

### 17. ¿Cuáles son los principales recursos humanos, tecnológicos y materiales que necesitará su proyecto?

**Humanos**

- Un desarrollador full-stack (el estudiante) para implementación y despliegue.
- Criterio de arquitectura/seguridad (equivalente a un perfil senior en decisiones de RLS, auth y datos).
- El docente y, más adelante, proveedores reales (como Promeria) para validar el flujo de cotización.

**Tecnológicos**

- Next.js 16, React 19, TypeScript, Tailwind, shadcn/ui, Zustand.
- Supabase (PostgreSQL, Auth, RLS).
- GitHub para control de versiones.
- Vercel para hosting.
- Vitest y ESLint para calidad.
- Cursor como apoyo de desarrollo.

**Materiales / operativos**

- Computadora y conexión a internet.
- Cuentas en Supabase, GitHub y Vercel (planes gratuitos/hobby para el MVP).
- Documentación del proyecto (`README`, schema SQL, capturas).
- Tiempo calendario del trimestre y un entorno de pruebas con usuarios demo.

### 18. ¿Cuál sería el principal riesgo que podría afectar el desarrollo de su proyecto y cómo piensa mitigarlo?

El **principal riesgo para Seminario II** es el mismo que más daño hizo en Seminario I, ahora en versión de producto: **el problema del huevo y la gallina, combinado con el atraso de evidencias y dependencias externas**.

En términos prácticos: el marketplace solo tiene valor si hay proveedores y compradores a la vez; y el desarrollo solo es evaluable si el avance está publicado y el entorno (Supabase/Vercel) no se rompe. El riesgo más concreto de implementación, ya materializado, fue **confiar en datos del cliente al crear cotizaciones** y **dejar trabajo de cierre (GitHub, roadmap, deploy limpio) para el final**.

**Mitigación:**

- Completar primero las tres actividades del punto 16, en ese orden, sin abrir un segundo stack.
- Resolver siempre `proveedor_id` y precios desde la base de datos, nunca desde el navegador.
- Publicar en GitHub en cada incremento, no al cierre.
- Actualizar el roadmap el mismo día en que una fase cambia de estado.
- Validar credenciales y el proyecto de Vercel con una prueba de humo antes de la semana de entrega.
- Reservar al menos una semana de buffer para imprevistos de infraestructura.

### 19. ¿Qué actividades de su proyecto dependen de que otras actividades hayan sido completadas previamente?

Resuélvelo tiene una cadena de dependencias clara:

1. **Modelo de datos y RLS** → sin tablas no hay auth persistente ni catálogo real.
2. **Sesión / middleware** → sin cookies de Supabase no hay login estable.
3. **Autenticación y perfiles con rol** → el panel de proveedor y las cotizaciones requieren saber quién es el usuario.
4. **Registro de proveedor** → el CRUD de productos necesita un `proveedor_id`.
5. **Productos en catálogo** → el carrito y las cotizaciones no tienen sentido vacíos.
6. **Carrito** → la cotización se arma agrupando ítems por proveedor.
7. **Bandeja de cotizaciones** → depende de que existan cotizaciones creadas.
8. **Deploy y evidencias** → dependen de que el build pase y el flujo end-to-end funcione.

Para Seminario II, el **panel admin** depende de auth y de las tablas ya existentes; la **protección de rutas** depende de conocer los roles; los **filtros avanzados** dependen de un catálogo ya conectado a Supabase. No se puede empezar por pagos si el flujo de cotización y la integridad de precios aún tienen deuda.

### 20. ¿Cómo determinaría si su proyecto está avanzando de acuerdo con lo planificado?

Con evidencia objetiva, no con sensación de ocupado. Los criterios que usaría —y que ya se usaron en Seminario I— son:

- **Hitos del roadmap marcados solo cuando están verificados** (no cuando “ya empecé”).
- **Build de producción en verde** (`next build`) y lint sin errores nuevos.
- **Pruebas automatizadas pasando.**
- **Flujo manual completo** con dos cuentas: comprador (catálogo → carrito → cotización) y proveedor (CRUD + aceptar/rechazar).
- **URL de producción respondiendo** (https://resuelveloapp.com).
- **Commits en GitHub** en la semana en que se hizo el trabajo.
- **Comparación fecha real vs. fecha planificada** de cada fase.

Si el roadmap dice “Fase 5 hecha” pero el proveedor no puede eliminar un producto, el proyecto no está al día, aunque haya muchas líneas de código nuevas.

### 21. Si el equipo descubre que una funcionalidad requiere más tiempo del previsto, ¿qué decisión debería tomar el equipo de proyecto?

No debería “acelerar en silencio” ni saltarse calidad. La decisión correcta es **hacer visible el desvío y replanificar el alcance o el orden**, no mentir en el cronograma.

El orden de decisión que aplicaría en Resuélvelo:

1. **Confirmar el impacto:** ¿bloquea el MVP o es una mejora?
2. **Recortar alcance de esa funcionalidad** (por ejemplo, filtros solo por precio, no por marca) en vez de romper la fecha.
3. **Mover a una fase posterior** lo que no es crítico (app móvil, pagos, recomendaciones).
4. **No abrir otro frente** mientras esa funcionalidad está atrasada.
5. **Documentar el cambio** en el roadmap y en el commit.

Eso fue, en la práctica, lo que se hizo al eliminar Vue/FastAPI y al posponer el panel admin: se protegió la fecha de entrega del MVP. Lo incorrecto habría sido intentar “terminar todo” y no desplegar nada.

### 22. ¿Háblame del cronograma de tu proyecto pasado?

El cronograma de Seminario I (trimestre mayo–julio 2026, entrega el 8 de julio) se organizó así:

| Semanas | Actividad principal |
|---|---|
| 1–2 | Definición del problema, objetivos y stack (Next.js, Supabase, Vercel) |
| 3–5 | Modelo de datos, autenticación y catálogo |
| 6–8 | Panel de proveedor y flujo de cotizaciones |
| 9 | Corrección de defectos, pruebas end-to-end y despliegue |
| 10 (cierre) | Documentación final, video y entrega académica |

En la práctica, las fases técnicas 1 a 6 se completaron y se verificaron contra Supabase real. El desvío no fue “no hubo sistema”, sino que **la semana 10 absorbió deudas de proceso**: actualizar el roadmap, limpiar el repo, recrear el proyecto de Vercel y publicar GitHub. El cronograma sirvió como brújula, pero le faltó un hito explícito de “evidencia publicada cada dos semanas”, no solo al final.

### 23. ¿Qué importancia tendría utilizar un diagrama de Gantt para organizar tu proyecto?

Un diagrama de Gantt haría visible lo que en Seminario I quedó sobre todo en una tabla de semanas: **duración, solapamiento y holgura**. Para Resuélvelo permitiría ver que “auth” y “catálogo” no pueden empezar el mismo día si auth aún no existe, y que el deploy no puede coincidir con la primera vez que se toca Vercel.

Su valor no es estético. Es de comunicación: el docente, o un futuro compañero de equipo, entiende de un vistazo qué está en la ruta crítica. También obliga a pintar el buffer. Si el Gantt no tiene ninguna holgura entre la semana 9 y la 10, ya se sabe que un imprevisto de hosting pone en riesgo la entrega. Para Seminario II, un Gantt de las tres actividades pendientes (admin, rutas, filtros) evitaría tratarlas como si pudieran hacerse en paralelo el último fin de semana.

### 24. ¿Qué información debería presentar el responsable del proyecto para demostrar que el proyecto está avanzando correctamente?

El responsable no debería presentar solo un porcentaje (“vamos al 70%”). Debería mostrar:

- **Alcance:** lista de objetivos/fases con estado (pendiente, en progreso, verificado).
- **Tiempo:** cronograma o Gantt vs. fechas reales.
- **Calidad:** resultado de build, lint y pruebas; bugs abiertos vs. cerrados.
- **Producto:** URL o capturas del flujo que ya funciona (no mockups viejos).
- **Riesgos:** los abiertos, su impacto y la mitigación en curso.
- **Cambios:** qué se agregó o se sacó del alcance y por qué.
- **Evidencia de proceso:** repositorio actualizado, commits recientes, documento de seguimiento al día.

En Resuélvelo, la demostración más honesta al cierre fue: repositorio https://github.com/Pav-gm/resuelvelo, app https://resuelveloapp.com, y un flujo real de cotización. Eso vale más que un discurso de avance.

### 25. Después de observar el video, ¿qué aspecto de la gestión de proyectos considera que debe mejorar en tu propio proyecto y por qué?

El aspecto que más debo mejorar es el **seguimiento continuo y la publicación temprana de evidencias**.

El video insiste en que planificar no sirve si no se controla el avance y si los imprevistos se descubren en la semana de entrega. En Seminario I el desarrollo técnico fue sólido, pero el control de versiones remoto y la actualización del plan se trataron como cierre, no como hábito. Eso generó un riesgo innecesario: el trabajo existía, pero no era visible ni recuperable con la misma facilidad.

En Seminario II la mejora concreta será: cada actividad terminada se marca en el roadmap el mismo día, se hace commit y push, y no se inicia una mejora nueva si la anterior no está verificada en producción. Esa disciplina es más importante ahora que agregar muchas funciones.

---

## Piedra, papel y tijeras

**Consigna.** Si solamente pudiera seleccionar tres aspectos indispensables para que el proyecto llegue a implementación, ¿cuáles seleccionaría? Justificarlos con Resuélvelo.

Si solo pudiera conservar tres aspectos para llevar Resuélvelo desde la planificación hasta la implementación, seleccionaría:

### 1. Objetivos y alcance claros

Sin un objetivo específico, Resuélvelo se habría convertido en “una plataforma de todo”. El alcance del MVP —catálogo, auth con roles, cotizaciones y panel de proveedor, en web, sin app nativa ni pagos— fue lo que permitió terminar e implementar. Cada vez que apareció una tentación (Vue/FastAPI, más filtros, panel admin), el alcance sirvió como tijera: eso no entra ahora. Un proyecto sin alcance no se implementa; se extiende hasta que se acaba el trimestre.

### 2. Planificación de tiempo, recursos y dependencias

El orden de las siete fases no fue decorativo. No se puede implementar cotizaciones sin productos, ni productos de proveedor sin autenticación, ni autenticación sin esquema. Planificar tiempo y recursos —un desarrollador, herramientas gratuitas, diez semanas— evitó prometer un sistema que no se podía operar. La implementación no es el momento en que “ya sale el código”: es el resultado de haber respetado esa secuencia. Si hubiera empezado por la UI del panel, el deploy habría llegado con datos falsos y sin seguridad.

### 3. Gestión de riesgos unida al seguimiento

Resuélvelo no falló por falta de ideas; estuvo a punto de fallar por riesgos de proceso e infraestructura: datos del cliente en cotizaciones, un segundo stack que rompió el build, Vercel en modo monorepo, un token incorrecto y un roadmap mentiroso. Implementar es poner el sistema en un entorno real. Eso solo es posible si se hace seguimiento (build, pruebas, humo en producción) y se mitiga lo que puede tumbar el hito. De los tres aspectos, este es el que más me faltó sistematizar, y el que más determina que “funciona en mi máquina” se convierta en “está en Vercel y se puede evaluar”.

Estos tres aspectos se refuerzan. El alcance dice qué implementar; el plan dice en qué orden y con qué capacidad; el riesgo y el seguimiento dicen si todavía es verdad que vamos a llegar.

---

# Conclusión personal

Seminario de Proyecto I me dejó un sistema publicado y, al mismo tiempo, una lección incómoda: se puede gestionar el producto mejor que el proceso. Resuélvelo tiene catálogo, autenticación, cotizaciones y un panel de proveedor en https://resuelveloapp.com, pero el repositorio y el plan de seguimiento se actualizaron tarde. Eso no anula el trabajo técnico; sí demuestra que la gestión de proyectos no es un capítulo del documento final, sino la forma de no perder el control cuando aparecen imprevistos.

El video de esta semana conecta directo con esa experiencia. Planificar, estimar, definir actividades, controlar cambios y dar seguimiento no son temas aparte del código. En un marketplace B2B, una cotización mal dirigida o un deploy roto por un stack que no debía existir son fallas de gestión tanto como de programación. La relación más útil que extraigo es esta: los mismos elementos que el video enumera —objetivos, tiempo, recursos, riesgos, equipo— fueron los que, cuando se aplicaron, permitieron el MVP, y los que, cuando se pospusieron, comprimieron la entrega.

Para Seminario II no pretendo “hacer más features” como primera meta. Pretendo completar el sistema con tres actividades dependientes y medibles (admin, rutas por rol, filtros), mantener el Gantt o el roadmap honestos, y tratar GitHub y la URL de producción como evidencia semanal. Si logro eso, el aprendizaje del video no se queda en respuestas de examen: se vuelve el método con el que Resuélvelo deja de ser un MVP de curso y empieza a ser un proyecto que se puede seguir implementando.

---

# Relación de los aprendizajes del video con el proyecto de Seminario I

| Aprendizaje del video | Cómo se vio en Resuélvelo |
|---|---|
| La gestión cubre más que programar | Hubo que gestionar alcance, evidencias, deploy y rúbrica, no solo pantallas |
| La planificación precede al desarrollo | El roadmap de 7 fases evitó construir cotizaciones antes que el modelo de datos |
| Tiempo, recursos y alcance están ligados | Un solo desarrollador + un trimestre = MVP web, no app nativa |
| Objetivos claros evitan el alcance infinito | Se recortó Vue/FastAPI y se pospuso el panel admin |
| Sin actividades desglosadas no hay control | Las fases permitían marcar “hecho” con verificación real |
| Empezar sin plan genera retrabajo | Mock vs. Supabase, y el stack paralelo, costaron tiempo de cierre |
| Estimar mal pone en riesgo la fecha | El trabajo de GitHub, video y limpieza se subestimó |
| Los atrasos tienen causas de proceso | Dependencias externas, evidencias tardías, cambios no bufferizados |
| Hay que contemplar imprevistos | Contingencia, recrear Vercel, no confiar en el cliente |
| El seguimiento compara plan vs. realidad | Build, pruebas, humo en producción; el roadmap desactualizado fue la falla |
| Riesgo y plan van juntos | R1–R5 se resolvieron como parte de la ejecución, no como anexo |
| Los cambios se documentan | Promeria/plomería, branding, eliminación del segundo stack |
| El equipo (aunque sea de uno) sostiene el éxito | Disciplina de un solo frente y criterio de calidad |
| Hay que saber si se avanza de verdad | URL + repo + flujo end-to-end, no un porcentaje intuitivo |

---

# Referencia del video

Candelario, H. (2026). *Gestión de proyectos de software* [Video de la asignatura Seminario de Proyecto II]. Material de clase, trimestre en curso.

> Nota: si el docente indicó un título exacto, un enlace de YouTube/Drive o una duración específica, sustituir esta referencia por esos datos (autor, año, título, URL). El análisis de este documento se elaboró a partir de los contenidos listados en la consigna (planificación, recursos, tiempo, objetivos, actividades, estimación, retrasos, riesgos, seguimiento, cambios y equipo) aplicados al proyecto Resuélvelo de Seminario de Proyecto I.

**Otras referencias de apoyo**

- Project Management Institute. (2021). *A Guide to the Project Management Body of Knowledge (PMBOK Guide)* (7.ª ed.). PMI.
- Schwaber, K., y Sutherland, J. (2020). *The Scrum Guide*. https://scrumguides.org
- Gonzalez, P. (2026). *Resuélvelo* [Software]. https://github.com/Pav-gm/resuelvelo  
- Gonzalez, P. (2026). Aplicación en producción. https://resuelveloapp.com  
- Gonzalez, P. (2026). Video de explicación del proyecto, Seminario de Proyecto I. https://drive.google.com/file/d/15n7IPEHttmp6q8i0ufigFZhVpdqGt4-R/view?usp=sharing  
