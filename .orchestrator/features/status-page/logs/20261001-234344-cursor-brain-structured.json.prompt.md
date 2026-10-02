You are the technical lead and orchestrator.

DO NOT implement code.
DO NOT modify repository files.

Synthesize the four planning reports into one coherent implementation plan.

Resolve:
- duplicate responsibilities;
- contradictory assumptions;
- interface mismatches;
- dependencies;
- ownership;
- integration order.

Prefer the smallest coherent implementation.

Every task must have exactly one owner.

Define explicit contracts before implementation.

Return a master plan containing:

1. Architecture summary
2. Assignments
3. Dependencies
4. Contracts
5. Integration order
6. Acceptance criteria
7. Risks
8. Open questions requiring human approval

Do not begin implementation.
Do not write a plan file.
Do not call ExitPlanMode.
Your final message must be only the JSON object.

Return one JSON object with these keys:
feature, summary, architecture, assignments, contracts, integration_order, acceptance_criteria, risks, open_questions.

Each assignment has agent, tasks, scope, and depends_on.
Each contract has id, description, owner, and consumers.
Every task id appears in exactly one assignment.
acceptance_criteria, risks, and open_questions are arrays of strings.

## Feature request

# status-page

Add a user-facing health/status page that displays API availability, backend version and current application environment. The backend should expose the required status endpoint. Include tests and documentation. Do not implement anything yet; this feature is only being used to validate planning.

## AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Resuélvelo: acuerdos comunes

Este archivo es la entrada común para Codex, Claude Code y Cursor. Resuélvelo es un marketplace B2B con Next.js 16, React 19, TypeScript, Supabase y Vitest.

## Consultar solo lo necesario

- El índice es [docs/index/MASTER_INDEX.md](docs/index/MASTER_INDEX.md). Elige el documento por tema; busca sus encabezados y lee la sección relevante.
- Para cambios de código, consulta las secciones aplicables de [la guía de ingeniería](docs/engineering/PROJECT_GUIDE.md); para ejecutar o interpretar controles, [la guía de verificación](docs/engineering/VERIFICATION.md).
- Mantén una fuente por regla: las guías contienen el detalle y los archivos de cada asistente solo apuntan a ellas. No cargues todo `docs/`, dependencias, lockfiles o resultados de compilación en el contexto.
- El protocolo de memoria global sigue vigente; sus namespaces son `project=resuelvelo` y `group_id=resuelvelo`. Los hooks globales de Claude siguen siendo configuración de este equipo.

## Arquitectura y límites esenciales

- UI y rutas: `app/` y `components/`; tipos: `types/index.ts`; lecturas de catálogo/cotizaciones: `lib/data.ts`, con fallback a `lib/mock.ts`.
- Carrito: `lib/store/carrito.ts` (Zustand, navegador). La creación de cotizaciones resuelve proveedor y precio en el servidor; la autorización de datos es RLS en `supabase/schema.sql`.
- Conserva los cambios ajenos. No instales dependencias nuevas ni hagas commit, push, migraciones remotas o despliegues sin autorización específica.
- Usa subagentes solo cuando se solicite `/orchestrate`; sus tareas deben tener archivos y recursos asignados. El protocolo detallado de Cursor está [aquí](docs/engineering/CURSOR_ORCHESTRATION.md).

## Verificación y recursos compartidos

- `npm run verify`: documentación, pruebas de herramientas, pruebas de la app, ESLint, tipos y compilación, en serie y con historial.
- `npm run verify -- --quick`: los mismos controles salvo compilación. `npm run verify -- --only docs,test`: selección explícita. `npm run verify -- --history`: últimas ejecuciones.
- Controles individuales: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run docs:check`.
- Un único proceso por checkout puede usar `.next/` (dev, tipos o build) o correr un control a la vez. El servidor de desarrollo ocupa el puerto 3000; SQL y despliegues comparten Supabase y Vercel.
- Una ejecución omitida o fallida nunca es un pase. El historial identifica el código comprobado, pero no sustituye una nueva verificación tras cambios de código o entorno. Cambios de UI requieren además revisar el flujo en el navegador.


## Roles

### claude

# Role: Infrastructure Engineer

Primary ownership:

- Docker
- CI/CD
- deployment
- configuration
- secrets wiring
- observability
- infrastructure code
- runtime concerns

Do not modify application business logic unless the approved plan assigns it.

### codex

# Role: Backend Engineer

Primary ownership:

- APIs
- business logic
- services
- database access
- migrations
- backend tests
- domain logic

Do not modify frontend UI unless explicitly assigned.

### antigravity

# Role: Frontend Engineer

Primary ownership:

- UI
- frontend state
- components
- client-side integration
- UX
- frontend tests
- browser behavior

Respect approved API contracts.

### cursor

# Role: QA / Product Engineering

Primary ownership:

- integration tests
- QA
- regression analysis
- documentation
- prototypes when assigned
- code review
- acceptance criteria validation

Do not redesign approved architecture unless reporting a blocker.

## Planner proposals

### claude

{
  "agent": "claude",
  "summary": "Status page needs env/version values sourced from deployment platform (Vercel) env vars, not new infra. No Dockerfile, CI workflow, or vercel.json exist in this repo (deploy config lives in Vercel dashboard/project settings), so infra work is limited to defining and documenting which environment variables feed the status endpoint, ensuring they're set per environment, and deciding how 'API availability' is measured without adding new monitoring infrastructure.",
  "areas_affected": [
    "environment variable configuration (Vercel project envs, .env.example)",
    "deployment/runtime environment exposure (NODE_ENV / VERCEL_ENV)",
    "version source (package.json version, or git commit SHA via VERCEL_GIT_COMMIT_SHA)",
    "documentation (docs/engineering)"
  ],
  "proposed_tasks": [
    {
      "id": "infra-1",
      "description": "Define the env/version contract: confirm backend version source (package.json 'version' field vs VERCEL_GIT_COMMIT_SHA env var) and environment source (process.env.NODE_ENV vs process.env.VERCEL_ENV, which distinguishes production/preview/development on Vercel). Document which one the status endpoint should read.",
      "suggested_owner": "infrastructure-engineer",
      "depends_on": []
    },
    {
      "id": "infra-2",
      "description": "Add any new required env vars (if a custom APP_VERSION or APP_ENV override is chosen instead of built-ins) to .env.example and document them; confirm they're set in Vercel project settings for all environments (production/preview/development). No new secrets expected since status endpoint should not expose sensitive config.",
      "suggested_owner": "infrastructure-engineer",
      "depends_on": [
        "infra-1"
      ]
    },
    {
      "id": "infra-3",
      "description": "Determine what 'API availability' means operationally for this app: since there is no separate backend service (Next.js API route + Supabase), availability likely means 'can this route execute and optionally reach Supabase.' Decide whether the status endpoint should perform a lightweight Supabase connectivity check (e.g. a trivial query) or just report process liveness, weighing added latency/cost against usefulness.",
      "suggested_owner": "infrastructure-engineer",
      "depends_on": []
    },
    {
      "id": "infra-4",
      "description": "Document the new endpoint and page in docs/engineering (per repo convention of single-source docs with assistant files pointing to them) — update MASTER_INDEX.md if a new doc section is created, or append to PROJECT_GUIDE.md if it fits existing structure. This is documentation, not application logic, but flagging as a dependency for whichever agent owns app/backend code to coordinate content accuracy.",
      "suggested_owner": "backend/docs-owner",
      "depends_on": [
        "infra-1",
        "infra-3"
      ]
    }
  ],
  "contracts": [
    "Status endpoint output must only use non-sensitive, already-public-safe values: environment name (production/preview/development) and version string (semver or short commit SHA) — no internal URLs, keys, or stack traces.",
    "If a Supabase connectivity check is added, it must have a strict timeout and must not leak Supabase error details (e.g. connection strings) to the client response."
  ],
  "risks": [
    "No existing CI/CD pipeline or Dockerfile in this repo — deployment is presumably handled externally via Vercel's git integration, so 'backend version' can't rely on a build-time injected CI variable unless Vercel's automatic VERCEL_GIT_COMMIT_SHA is used.",
    "If the status endpoint performs a live Supabase check, it could add latency/cost per request or become a vector for abuse (repeated polling causing DB load) if not rate-limited or cached — rate-limiting/caching would need backend ownership, not infra.",
    "Env var naming must avoid colliding with existing Supabase/Vercel reserved env vars already in .env.example — needs inspection before finalizing names."
  ],
  "tests": [
    "Verify status endpoint returns correct environment label across production, preview, and local dev by checking process.env.VERCEL_ENV / NODE_ENV behavior in each context (cannot fully test preview/production without an actual deploy — flag as manual verification step post-deploy).",
    "Confirm .env.example stays in sync with any new env var introduced (docs:check script in this repo may already enforce doc/env consistency — verify)."
  ],
  "questions_or_unknowns": [
    "Should backend version come from package.json (manual bump) or automatically from VERCEL_GIT_COMMIT_SHA (always accurate, no manual step)? This is a product/infra decision, not purely infra.",
    "Is there a real 'backend' separate from this Next.js app (e.g. a Supabase Edge Function or external API) whose availability should be checked, or is 'API availability' just this Next.js deployment's own liveness?",
    "Should the status page/endpoint be public (no auth) or restricted? If public, confirm no sensitive data exposure risk — this affects RLS/auth ownership, not infra, but infra should flag it.",
    "No .github/workflows or Dockerfile exist — confirm deployment is 100% via Vercel's git-based auto-deploy (no custom CI needed for this feature) before assuming no CI/CD work is required."
  ]
}

### codex

{
  "agent": "codex",
  "summary": "Reglas del proyecto revisadas. Falta describir la funcionalidad para elaborar el plan.",
  "areas_affected": [],
  "proposed_tasks": [],
  "contracts": [
    "Asignar archivos y recursos exclusivos a cada tarea.",
    "Ejecutar controles en serie y revisar en navegador los cambios de UI."
  ],
  "risks": [
    "Memoria persistente no disponible en esta sesión."
  ],
  "tests": [],
  "questions_or_unknowns": [
    "¿Qué funcionalidad se solicita y cuáles son sus criterios de aceptación?"
  ]
}

### antigravity

{
  "agent": "antigravity",
  "summary": "Plan frontend implementation for the user-facing status page (/status) displaying API availability, backend version, and application environment, including state handling, UX states, tests, and documentation.",
  "areas_affected": [
    "app/status/page.tsx",
    "components/status/StatusCard.tsx",
    "components/status/HealthIndicator.tsx",
    "types/status.ts",
    "tests/status.test.tsx",
    "docs/engineering/STATUS_PAGE.md"
  ],
  "proposed_tasks": [
    {
      "id": "TASK-BE-1",
      "description": "Backend: Implement GET /api/status endpoint returning availability status, backend version, and application environment.",
      "suggested_owner": "Backend Engineer",
      "depends_on": []
    },
    {
      "id": "TASK-FE-1",
      "description": "Frontend: Define TypeScript interfaces and data fetching client for status endpoint contract.",
      "suggested_owner": "Frontend Engineer",
      "depends_on": [
        "TASK-BE-1"
      ]
    },
    {
      "id": "TASK-FE-2",
      "description": "Frontend: Implement StatusCard and HealthIndicator visual components displaying availability status, environment badge, backend version, and last checked timestamp.",
      "suggested_owner": "Frontend Engineer",
      "depends_on": [
        "TASK-FE-1"
      ]
    },
    {
      "id": "TASK-FE-3",
      "description": "Frontend: Create /status route (app/status/page.tsx) with responsive layout, loading skeletons, error states, and manual refresh button.",
      "suggested_owner": "Frontend Engineer",
      "depends_on": [
        "TASK-FE-2"
      ]
    },
    {
      "id": "TASK-FE-4",
      "description": "Frontend: Write unit and integration tests using Vitest and React Testing Library verifying loading, operational, degraded, error states, and refresh trigger.",
      "suggested_owner": "Frontend Engineer",
      "depends_on": [
        "TASK-FE-3"
      ]
    },
    {
      "id": "TASK-FE-5",
      "description": "Documentation: Document the status page route, components, and frontend error-handling behavior in docs.",
      "suggested_owner": "Frontend Engineer",
      "depends_on": [
        "TASK-FE-4"
      ]
    }
  ],
  "contracts": [
    "GET /api/status -> 200 OK: { status: 'operational' | 'degraded' | 'outage', version: string, environment: string, timestamp: string }",
    "GET /api/status -> 503 Service Unavailable: { status: 'outage', version: string, environment: string, timestamp: string, error?: string }"
  ],
  "risks": [
    "Browser or CDN caching may serve stale health/status responses unless Cache-Control: no-store headers are enforced on the backend endpoint.",
    "Network timeouts or unhandled 5xx errors from the status endpoint could trigger an uncaught frontend exception if not gracefully caught in the client-side fetcher.",
    "Exposing excessive backend environment configuration or debug details to the frontend could lead to information disclosure.",
    "Aggressive client-side polling could cause additional load on a degraded backend service."
  ],
  "tests": [
    "Unit test for StatusCard and HealthIndicator rendering correct badges and styles for 'operational', 'degraded', and 'outage' statuses.",
    "Component test for app/status/page.tsx displaying loading skeletons while fetching status data.",
    "Component test verifying error boundary/fallback banner when /api/status returns a 503 or network failure.",
    "Interaction test verifying that clicking the manual refresh button initiates a re-fetch and updates the displayed timestamp."
  ],
  "questions_or_unknowns": [
    "Should the status page be publicly accessible to all users or restricted to authenticated administrators?",
    "Should the page support automatic polling/refresh (e.g., every 30 or 60 seconds) or only manual on-demand refresh?",
    "Where in the site navigation should the status page link be placed (e.g., Footer, Help menu, or standalone)?",
    "What are the exact allowed strings for the application environment (e.g., 'production', 'staging', 'development')?"
  ]
}

### cursor

{
  "agent": "cursor",
  "summary": "This is the QA and product engineering view of the status-page feature. Nothing like it exists yet: there are no Route Handlers in the app (no app/**/route.ts), no health or status endpoint, and app code does not read VERCEL_ENV or NODE_ENV anywhere. Vitest runs in jsdom and only collects tests/**/*.test.ts(x). Existing tests force mock mode by stubbing NEXT_PUBLIC_SUPABASE_URL to the placeholder and then dynamically importing the module, as in tests/data-fallback.test.ts. proxy.ts runs on nearly every path. When Supabase is configured, it calls supabase.auth.getUser() but does not redirect /status or /api/status. QA's part of this feature is to: write testable acceptance criteria and a frozen response contract before implementation starts; write contract tests for the endpoint handler and component tests for the page; check for regressions in proxy routing, mock fallback and the existing test suite; update documentation, which docs:check enforces; and review the backend and frontend work against the criteria. The endpoint, the page UI and the choice of environment and version sources belong to other roles. They appear here only as dependencies.",
  "areas_affected": [
    "tests/ (new: tests/status-endpoint.test.ts, tests/status-page.test.tsx, plus optional tests/status-lib.test.ts for pure helpers)",
    "tests/setup.ts (read only; confirm jest-dom matchers exist for the component tests)",
    "vitest.config.ts (read only; new tests must match tests/**/*.test.ts(x))",
    "app/api/status/route.ts (dependency, owned by backend; tested by QA)",
    "app/status/page.tsx and any components/status/* (dependency, owned by frontend; tested by QA)",
    "lib/ status helper, e.g. lib/status.ts (dependency, owned by backend; preferred so tests can cover pure functions without a running server)",
    "proxy.ts and lib/supabase/proxy.ts (regression scope only; no change expected)",
    "README.md (short mention of /status and /api/status)",
    "docs/engineering/PROJECT_GUIDE.md (Architecture section: note the status endpoint as a transport-layer exception or confirm it reads through lib/)",
    "docs/index/MASTER_INDEX.md (only if a new docs/*.md file is added; docs:check requires every docs Markdown file to be indexed)",
    ".env.example (documentation only, if a new env var such as APP_ENV or APP_VERSION is approved)"
  ],
  "proposed_tasks": [
    {
      "id": "QA-1",
      "description": "Write the acceptance criteria and freeze the response contract with the backend and frontend owners before any implementation: field names, types, allowed enum values, HTTP status codes in healthy, degraded and mock mode, caching headers, and the rule that no secrets or env values outside the agreed fields are exposed.",
      "suggested_owner": "qa-product-engineering",
      "depends_on": [
        "DEP-BE-1",
        "DEP-INFRA-1"
      ]
    },
    {
      "id": "DEP-INFRA-1",
      "description": "DEPENDENCY: decide the source of truth for 'environment' (VERCEL_ENV taking precedence over a normalized NODE_ENV, or a new APP_ENV) and for 'backend version' (package.json version imported on the server, VERCEL_GIT_COMMIT_SHA, or both). QA needs this to write deterministic tests.",
      "suggested_owner": "infrastructure / backend",
      "depends_on": []
    },
    {
      "id": "DEP-BE-1",
      "description": "DEPENDENCY: implement GET /api/status as a Next 16 Route Handler that is dynamic and not cached. Put the logic in a pure helper (for example lib/status.ts exporting getStatus() and resolveEnvironment()) so Vitest can test it without .next or a dev server. The availability check must follow the lib/data.ts pattern: report 'mock' or 'not configured' when NEXT_PUBLIC_SUPABASE_URL is missing or still the placeholder, and must never make network calls in tests.",
      "suggested_owner": "backend",
      "depends_on": [
        "DEP-INFRA-1"
      ]
    },
    {
      "id": "DEP-FE-1",
      "description": "DEPENDENCY: implement the user-facing /status page. It should be a server component that calls the shared helper directly rather than fetching its own API over HTTP. It needs accessible states for available, degraded, unavailable and mock, plus version and environment labels. It can optionally be linked from components/layout/Footer.tsx.",
      "suggested_owner": "frontend",
      "depends_on": [
        "QA-1",
        "DEP-BE-1"
      ]
    },
    {
      "id": "QA-2",
      "description": "Write unit tests for the pure helpers. Environment resolution: VERCEL_ENV precedence, NODE_ENV fallback, missing or unsupported values mapping to 'unknown'. Version resolution, including the fallback when the source is missing. Availability resolution in mock mode and with a stubbed Supabase client that succeeds, fails or times out. Use vi.stubEnv and vi.unstubAllEnvs, with dynamic imports after stubbing, to avoid leaking state between tests.",
      "suggested_owner": "qa-product-engineering",
      "depends_on": [
        "QA-1",
        "DEP-BE-1"
      ]
    },
    {
      "id": "QA-3",
      "description": "Write contract tests for the GET handler, imported from app/api/status/route.ts and called directly. Assert the status code, Content-Type application/json, Cache-Control no-store (or whatever was agreed), the exact set of response keys with no extra env or secret fields, and the enum values. Cover mock mode and simulated outage mode. If importing a Route Handler under jsdom proves unreliable, add a `// @vitest-environment node` file pragma rather than changing the global config.",
      "suggested_owner": "qa-product-engineering",
      "depends_on": [
        "QA-1",
        "DEP-BE-1"
      ]
    },
    {
      "id": "QA-4",
      "description": "Write component tests with @testing-library/react for the status UI pieces. Each state (available, degraded, unavailable, mock) should render the correct label, version and environment text, with a non-color indicator for accessibility. If the page is an async server component, test the presentational child components with fixture data.",
      "suggested_owner": "qa-product-engineering",
      "depends_on": [
        "DEP-FE-1"
      ]
    },
    {
      "id": "QA-5",
      "description": "Run the regression analysis. Confirm that proxy.ts does not redirect /status or /api/status for anonymous users. Confirm that all existing tests still pass (carrito, mock, data-fallback, tipos). Confirm that typecheck passes with the generated route types for the new route. Confirm that build marks /api/status as dynamic, not statically prerendered with a frozen environment or version. Then run npm run verify once on the single checkout, without parallel gates.",
      "suggested_owner": "qa-product-engineering",
      "depends_on": [
        "QA-2",
        "QA-3",
        "QA-4"
      ]
    },
    {
      "id": "QA-6",
      "description": "Do a browser pass of /status in mock mode on dev server port 3000. Then do a manual or post-deploy check that Preview and Production report the correct environment and version, since those cannot be reproduced locally. Record anything that could not be verified.",
      "suggested_owner": "qa-product-engineering",
      "depends_on": [
        "DEP-FE-1",
        "QA-5"
      ]
    },
    {
      "id": "QA-7",
      "description": "Update the documentation. README gets a short description of /status and /api/status with an example response. PROJECT_GUIDE Architecture gets one line placing the status helper and route. .env.example documents any new variable. If a dedicated doc is added, it must be linked from docs/index/MASTER_INDEX.md. Finish with npm run docs:check.",
      "suggested_owner": "qa-product-engineering",
      "depends_on": [
        "QA-1",
        "DEP-INFRA-1"
      ]
    },
    {
      "id": "QA-8",
      "description": "Review the backend and frontend changes against the frozen acceptance criteria. Check for no Supabase queries from components, no secret exposure, no new npm dependencies, a dynamic or no-store response, and server-only reads of non-public env vars.",
      "suggested_owner": "qa-product-engineering",
      "depends_on": [
        "DEP-BE-1",
        "DEP-FE-1"
      ]
    }
  ],
  "contracts": [
    "Proposed for QA-1, to be confirmed by backend: GET /api/status returns application/json { status: 'ok' | 'degraded' | 'down', api: { available: boolean, mode: 'supabase' | 'mock', latencyMs?: number }, version: string, environment: 'production' | 'preview' | 'development' | 'test' | 'unknown', timestamp: string (ISO 8601) }.",
    "HTTP semantics, proposed: 200 when status is 'ok' or 'degraded', including mock mode. 503 only when the backing API was configured but the check failed. The page must render all three states either way.",
    "Caching: the response must not be cached or prerendered. Use Cache-Control: no-store and make the route dynamic under Next 16 conventions; check node_modules/next/dist/docs before implementing.",
    "Security: only the agreed fields are returned. No Supabase URL or key, no raw process.env dump, no stack traces. Non-NEXT_PUBLIC env vars are read on the server only.",
    "Testability: availability, environment and version logic lives in a pure helper importable by Vitest. Mock mode never makes network calls. In tests the Supabase client is injected or mocked.",
    "Mock mode detection reuses the existing rule: NEXT_PUBLIC_SUPABASE_URL missing or equal to 'https://<project-ref>.supabase.co'.",
    "Routing: /status and /api/status stay public and are not added to rutaProtegida in lib/supabase/proxy.ts."
  ],
  "risks": [
    "Environment and version may be frozen at build time if the route or page is statically prerendered. Deployments would then show stale values. This must be checked in build output.",
    "There are no existing Route Handler tests in the repo. The jsdom default environment may not fit Request/Response usage, so a per-file node environment pragma may be needed.",
    "Env stubs can leak between tests because modules cache values at import time (lib/supabase/proxy.ts evaluates SUPABASE_DISPONIBLE at module load). Tests need vi.resetModules and dynamic imports.",
    "An availability check that calls Supabase on every request adds latency and load. proxy.ts already calls auth.getUser() on each request, so the status route pays that cost twice. A timeout and a cheap probe are needed.",
    "Reporting the version through process.env.npm_package_version is unreliable on Vercel. Prefer importing package.json on the server or using VERCEL_GIT_COMMIT_SHA.",
    "Preview and Production behavior (VERCEL_ENV) cannot be fully verified locally and needs a manual post-deploy check.",
    "The workspace contains a nested duplicate tree under resuelvelo/ (app, tests, vitest.config.ts, proxy.ts). Workers could edit the wrong copy, and lint or typecheck could pick it up. The orchestrator should state that only root paths are in scope.",
    "Exposing the environment and version publicly gives minor fingerprinting information. Product should confirm this is acceptable for a public page.",
    "Only one process may use .next/ (dev, typecheck, build) at a time. QA's verify run must not overlap with other workers' builds."
  ],
  "tests": [
    "Unit: resolveEnvironment(). VERCEL_ENV 'production', 'preview' and 'development' map to themselves. Without VERCEL_ENV, NODE_ENV 'production', 'development' and 'test' are normalized. Missing or unsupported values give 'unknown'.",
    "Unit: version resolution. It returns the package.json version (currently 0.1.0) or the agreed SHA format, and falls back to 'unknown' when the source is missing.",
    "Unit: availability in mock mode. With NEXT_PUBLIC_SUPABASE_URL stubbed to the placeholder, the result is { available: true, mode: 'mock' } or the agreed equivalent, with no network call (assert the mocked client or fetch was not called).",
    "Unit: availability with a mocked Supabase client. Success gives available, error gives unavailable, and timeout gives unavailable within the agreed limit.",
    "Contract: GET handler in mock mode returns 200, JSON content type, a Cache-Control no-store header, and exactly the agreed keys.",
    "Contract: GET handler with a simulated backend failure returns the agreed status code (503 proposed) and status 'down'.",
    "Contract/security: the response body does not contain the Supabase URL, the anon key, or any other env var names or values.",
    "Contract: timestamp is valid ISO 8601 and close to the current time.",
    "Component: the status view renders the available, degraded, unavailable and mock states with text labels, version and environment, and an accessible status indicator that does not rely only on color.",
    "Regression: the existing suites carrito.test.ts, mock.test.ts, data-fallback.test.ts and tipos.test.ts still pass unchanged.",
    "Regression: anonymous requests to /status and /api/status are not redirected by updateSession, while /admin, /proveedor and /mis-cotizaciones keep their redirects. This can be a unit test of lib/supabase/proxy.ts with a mocked createServerClient, if approved.",
    "Gates: npm run verify passes once in full (docs, tooling, test, lint, typecheck, build), and the build output shows /api/status as dynamic.",
    "Manual: browser pass of /status in mock mode, plus a post-deploy check of the environment and version values on Preview and Production."
  ],
  "questions_or_unknowns": [
    "What does 'API availability' mean: the app's own route responding, a Supabase connectivity probe, or both? And what counts as 'degraded'?",
    "Should 'backend version' be package.json version, the git commit SHA (VERCEL_GIT_COMMIT_SHA), or both?",
    "Which environment source is authoritative: VERCEL_ENV, NODE_ENV, or a new APP_ENV variable? And what should local dev and mock mode show?",
    "Should mock mode (no Supabase configured) report as available, degraded or a separate 'mock' state? And with which HTTP code?",
    "Should the endpoint return 503 on outage, or always 200 with a status field? External uptime monitors usually prefer 503.",
    "What are the route paths? /status and /api/status are assumed. Should the page be linked from the Footer or Navbar?",
    "Is the page fully public, or should version and environment details be hidden in production?",
    "Should the page auto-refresh or offer a manual refresh? That decides whether client-side tests with fake timers are needed.",
    "Should the docs live in the existing README and PROJECT_GUIDE, or in a new indexed doc under docs/?",
    "Is the nested resuelvelo/ directory intentional? Confirm it is out of scope for all workers."
  ]
}

## Repository structure

.codex/config.toml
.cursor/agents/debugger.md
.cursor/agents/verifier.md
.cursor/agents/worker-primary.md
.cursor/agents/worker-secondary.md
.cursor/mcp.json
.cursor/rules/orchestration.mdc
.cursor/rules/project-engineering.mdc
.env.example
.gitignore
.mcp.json
.orchestrator/config.yaml
AGENTS.md
CLAUDE.md
LICENSE
README.md
app/(auth)/actions.ts
app/(auth)/actualizar-password/page.tsx
app/(auth)/login/page.tsx
app/(auth)/recuperar/page.tsx
app/(auth)/register/page.tsx
app/(marketplace)/admin/ToggleActivoButton.tsx
app/(marketplace)/admin/actions.ts
app/(marketplace)/admin/page.tsx
app/(marketplace)/catalogo/page.tsx
app/(marketplace)/cotizaciones/actions.ts
app/(marketplace)/mis-cotizaciones/page.tsx
app/(marketplace)/proveedor/actions.ts
app/(marketplace)/proveedor/page.tsx
app/(marketplace)/proveedor/pedidos/page.tsx
app/(marketplace)/proveedor/productos/[id]/editar/page.tsx
app/(marketplace)/proveedor/productos/nuevo/page.tsx
app/(marketplace)/proveedores/page.tsx
app/apple-icon.png
app/como-funciona/page.tsx
app/favicon.ico
app/globals.css
app/icon.png
app/layout.tsx
app/not-found.tsx
app/page.tsx
app/privacidad/page.tsx
app/terminos/page.tsx
components.json
components/layout/Footer.tsx
components/layout/Logo.tsx
components/layout/Navbar.tsx
components/layout/NavbarClient.tsx
components/marketplace/CarritoDrawer.tsx
components/marketplace/CatalogoFiltros.tsx
components/marketplace/EliminarProductoButton.tsx
components/marketplace/LimpiarCarritoEnEnviada.tsx
components/marketplace/ProductoCard.tsx
components/marketplace/ProductoForm.tsx
components/marketplace/ResponderCotizacionButton.tsx
components/marketplace/ToggleProductoButton.tsx
components/ui/button.tsx
docs/DOCUMENTO-FINAL.md
docs/EVIDENCIAS-IMPLEMENTACION.md
docs/PROYECTO-FINAL.md
docs/ROADMAP.md
docs/SEMINARIO-II-GESTION-PROYECTOS.md
docs/engineering/CURSOR_ORCHESTRATION.md
docs/engineering/PROJECT_GUIDE.md
docs/engineering/VERIFICATION.md
docs/history/.gitignore
docs/history/README.md
docs/history/verification.jsonl
docs/implementation-plans/.gitkeep
docs/implementation-plans/2026-09-26-version-final-seminario-ii.md
docs/implementation-plans/2026-10-01-herramientas-compartidas.md
docs/index/MASTER_INDEX.md
docs/screenshots/01-home.png
docs/screenshots/02-catalogo.png
docs/screenshots/03-carrito.png
docs/screenshots/04-mis-cotizaciones.png
docs/screenshots/05-proveedor-pedidos.png
docs/screenshots/06-proveedor-dashboard.png
eslint.config.mjs
lib/data.ts
lib/mock.ts
lib/store/carrito.ts
lib/supabase/client.ts
lib/supabase/proxy.ts
lib/supabase/server.ts
lib/utils.ts
next.config.ts
package-lock.json
package.json
postcss.config.mjs
proxy.ts
public/file.svg
public/globe.svg
public/logo.png
public/next.svg
public/vercel.svg
public/window.svg
resuelvelo
scripts/check-docs.mjs
scripts/tests/tooling.test.mjs
scripts/verify.mjs
supabase/schema.sql
supabase/seed.sql
tests/carrito.test.ts
tests/data-fallback.test.ts
tests/mock.test.ts
tests/setup.ts
tests/tipos.test.ts
tsconfig.json
types/index.ts
vitest.config.ts

## Integration rules

Workers do not merge to main. Later integration is sequential onto feature/status-page/integration. This planning step must not create branches, worktrees, or commits.
