The previous master plan is valid JSON but does not match the schema.

Preserve every architectural decision, ownership choice, dependency, task meaning, and integration order already present in the original output.
Do not add, remove, or reorder work.
Only change the representation so the JSON matches the schema exactly.

Validation errors:

invalid planner output: assignments[0].tasks must be a list of strings

JSON Schema:

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "feature",
    "summary",
    "architecture",
    "assignments",
    "contracts",
    "integration_order",
    "acceptance_criteria",
    "risks",
    "open_questions"
  ],
  "properties": {
    "feature": { "type": "string" },
    "summary": { "type": "string" },
    "architecture": { "type": "string" },
    "assignments": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["agent", "tasks", "scope", "depends_on"],
        "properties": {
          "agent": { "type": "string" },
          "tasks": { "type": "array", "items": { "type": "string" } },
          "scope": { "type": "array", "items": { "type": "string" } },
          "depends_on": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "contracts": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "description", "owner", "consumers"],
        "properties": {
          "id": { "type": "string" },
          "description": { "type": "string" },
          "owner": { "type": "string" },
          "consumers": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "integration_order": { "type": "array", "items": { "type": "string" } },
    "acceptance_criteria": { "type": "array", "items": { "type": "string" } },
    "risks": { "type": "array", "items": { "type": "string" } },
    "open_questions": { "type": "array", "items": { "type": "string" } }
  }
}

Original output:

{
  "feature": "status-page",
  "summary": "Add a public GET /api/status Route Handler and a public /status server-rendered page. Both use one pure server-side helper, lib/status.ts, so they report the same API availability, backend version and environment. The plan adds no new infrastructure, environment variables or dependencies. Environment and version come from VERCEL_ENV and NODE_ENV, package.json and VERCEL_GIT_COMMIT_SHA. Availability uses a single timed Supabase probe, and mock mode is detected with the existing placeholder-URL rule. Responsibilities follow the four roles. Backend (codex) owns the types, helper, route and helper unit tests. Frontend (antigravity) owns the view, page, footer link and component tests. QA (cursor) owns the endpoint contract tests, regression review, documentation and full verification. Infrastructure (claude) confirms the runtime environment and version sources and runs post-deploy checks only after deploy is authorized. The codex planner returned no proposal because it did not receive the feature description. Its backend scope comes from the antigravity, cursor and claude proposals.",
  "architecture": "Data flow: lib/status.ts exports getStatus(), and two places call it. The first is app/api/status/route.ts, the GET handler. It returns JSON with Cache-Control: no-store, HTTP 200 when status is ok or degraded, and 503 when status is down. The second is app/status/page.tsx, an async server component. It calls getStatus() directly instead of fetching its own API over HTTP, and renders components/status/StatusView.tsx, a presentational component that receives the StatusResponse as a prop. Shared types live in types/index.ts, following the repo convention; there is no separate types/status.ts. Inside lib/status.ts, resolveEnvironment(env) uses VERCEL_ENV when it is production, preview or development. Otherwise it normalizes NODE_ENV to production, development or test, and falls back to 'unknown'. resolveVersion(env) returns the package.json version, imported on the server. When VERCEL_GIT_COMMIT_SHA is present, it appends '+<first 7 chars of SHA>'; the fallback is 'unknown'. checkApi(probe, timeoutMs) decides mock mode at call time, not at module load. Mock mode means NEXT_PUBLIC_SUPABASE_URL is missing or equals 'https://<project-ref>.supabase.co'. In mock mode the result is { available: true, mode: 'mock' } and no network call is made. Otherwise checkApi runs an injected probe with a 2000 ms timeout. The default probe is a head-only, limit-1 select on 'categorias' through the existing lib/supabase/server.ts client. Status mapping: 'ok' means Supabase mode with a successful probe. 'degraded' means mock mode, so the app is serving fallback data. 'down' means Supabase is configured but the probe failed or timed out. Both the route and the page must be dynamic under Next 16 conventions; check node_modules/next/dist/docs before implementing. Out of scope: Docker, CI, vercel.json, new environment variables, .env.example changes, new npm packages, proxy.ts changes, client-side polling and auth gating. Only root paths are in scope; the nested resuelvelo/ directory must not be edited. Integration onto feature/status-page/integration is sequential: no worker merges to main, and this planning step creates no branches or commits.",
  "assignments": [
    {
      "agent": "claude",
      "tasks": [
        {
          "id": "INFRA-1",
          "description": "Confirm in writing, without code changes, that the environment and version sources in contract C-ENV are available at runtime. Check that Vercel system env vars (VERCEL_ENV, VERCEL_GIT_COMMIT_SHA) are exposed to Production, Preview and Development, and that NODE_ENV is the local fallback. Confirm the feature needs no Dockerfile, CI workflow, vercel.json, new env var or .env.example change. Report any blocker to the orchestrator before BE-2 starts.",
          "depends_on": []
        },
        {
          "id": "INFRA-2",
          "description": "After a human explicitly authorizes a Preview and Production deploy, call GET /api/status and open /status on each environment. Check the environment label, the version format, the Cache-Control: no-store header and the absence of secrets. Record anything that could not be verified.",
          "depends_on": [
            "QA-4"
          ]
        }
      ],
      "scope": "Read-only confirmation of Vercel and runtime configuration, plus manual post-deploy checks. Must not modify repository files. Must not deploy without explicit human authorization.",
      "depends_on": [
        "QA-4"
      ]
    },
    {
      "agent": "codex",
      "tasks": [
        {
          "id": "BE-1",
          "description": "Add the contract types from C-TYPES to types/index.ts: ApiStatus, AppEnvironment, ApiCheck and StatusResponse. Edit nothing else in the file.",
          "depends_on": []
        },
        {
          "id": "BE-2",
          "description": "Create lib/status.ts as specified in C-HELPER. Export resolveEnvironment, resolveVersion, isMockMode, checkApi and getStatus. Read env at call time, inject the probe and the clock, enforce the 2000 ms timeout, and include no secrets in the output. The default probe uses lib/supabase/server.ts with a head-only, limit-1 select on 'categorias'. Probe errors become available:false and never expose error details.",
          "depends_on": [
            "BE-1",
            "INFRA-1"
          ]
        },
        {
          "id": "BE-3",
          "description": "Create app/api/status/route.ts. It exports GET, which calls getStatus() and returns Response.json with the status code and headers defined in C-HTTP. Make the route dynamic using the Next 16 convention from node_modules/next/dist/docs.",
          "depends_on": [
            "BE-2"
          ]
        },
        {
          "id": "BE-4",
          "description": "Write unit tests for lib/status.ts in tests/status-lib.test.ts. Cover resolveEnvironment precedence and fallbacks, resolveVersion with and without the SHA plus the 'unknown' fallback, mock-mode detection with no probe call, probe success, failure and timeout (fake timers), the status mapping, and an ISO timestamp from the injected clock. Use vi.stubEnv, vi.unstubAllEnvs, vi.resetModules and dynamic imports.",
          "depends_on": [
            "BE-2"
          ]
        }
      ],
      "scope": "Files: types/index.ts (status types only), lib/status.ts (new), app/api/status/route.ts (new), tests/status-lib.test.ts (new). Must not touch UI, proxy.ts, lib/supabase/*, lib/data.ts, package.json or docs.",
      "depends_on": [
        "INFRA-1"
      ]
    },
    {
      "agent": "antigravity",
      "tasks": [
        {
          "id": "FE-1",
          "description": "Create components/status/StatusView.tsx as specified in C-UI. It is presentational only and takes { status: StatusResponse }. It renders a text label for the overall status (Operativo, Degradado or Caído), plus API availability and mode (Supabase or datos de demostración), version, environment and the formatted check time. The status indicator must not rely on color alone and must use role=\"status\". No data fetching and no Supabase access.",
          "depends_on": [
            "BE-1"
          ]
        },
        {
          "id": "FE-2",
          "description": "Create app/status/page.tsx as a dynamic async server component. It calls getStatus() from lib/status.ts, renders StatusView, sets page metadata and offers a plain link that reloads /status (no polling). Add a single 'Estado del servicio' link to /status in components/layout/Footer.tsx.",
          "depends_on": [
            "FE-1",
            "BE-2"
          ]
        },
        {
          "id": "FE-3",
          "description": "Write component tests for StatusView in tests/status-page.test.tsx using @testing-library/react with StatusResponse fixtures for ok, degraded (mock) and down. Assert the text labels, version, environment, the role=\"status\" indicator and the non-color label.",
          "depends_on": [
            "FE-1"
          ]
        }
      ],
      "scope": "Files: components/status/StatusView.tsx (new), app/status/page.tsx (new), components/layout/Footer.tsx (one link only), tests/status-page.test.tsx (new). Must not modify lib/, types/, the API route or package.json.",
      "depends_on": [
        "BE-1",
        "BE-2"
      ]
    },
    {
      "agent": "cursor",
      "tasks": [
        {
          "id": "QA-1",
          "description": "Write contract tests for the GET handler in tests/status-endpoint.test.ts. Import it from app/api/status/route.ts and add a '// @vitest-environment node' pragma if jsdom is unreliable. In mock mode, assert 200, application/json, Cache-Control: no-store and exactly the C-TYPES keys. With a mocked failing probe, assert 503 and status 'down'. Assert the body never contains the Supabase URL, the anon key or other env names or values, and that the timestamp is valid ISO 8601. No network calls.",
          "depends_on": [
            "BE-3"
          ]
        },
        {
          "id": "QA-2",
          "description": "Update the documentation. Add a short README.md section on /status and /api/status with an example response and the status and HTTP mapping. Add one line to the Architecture section of docs/engineering/PROJECT_GUIDE.md placing lib/status.ts and the route. Add no new docs file, so MASTER_INDEX.md stays unchanged. Run npm run docs:check.",
          "depends_on": [
            "BE-3",
            "FE-2"
          ]
        },
        {
          "id": "QA-3",
          "description": "Review all backend and frontend changes against the acceptance criteria and analyze regressions. Confirm that proxy.ts and lib/supabase/proxy.ts are unchanged and that /status and /api/status are not in rutaProtegida. Also confirm: no Supabase queries in components, no secret exposure, no new dependencies, env read at call time, no edits under the nested resuelvelo/ directory, and one owner per file. Report blockers instead of redesigning.",
          "depends_on": [
            "BE-3",
            "BE-4",
            "FE-2",
            "FE-3",
            "QA-1"
          ]
        },
        {
          "id": "QA-4",
          "description": "Run npm run verify once in full on the integration checkout, serially and with no other process using .next/. Confirm the build output marks /api/status and /status as dynamic. Then do a browser pass of /status in mock mode on dev port 3000, checking the label, version, environment, footer link and reload link. Record the results; skipped or failed runs count as failures.",
          "depends_on": [
            "QA-2",
            "QA-3"
          ]
        }
      ],
      "scope": "Files: tests/status-endpoint.test.ts (new), README.md (status section only), docs/engineering/PROJECT_GUIDE.md (one Architecture line). Review, verification and browser QA for all other files are read-only.",
      "depends_on": [
        "BE-3",
        "BE-4",
        "FE-2",
        "FE-3"
      ]
    }
  ],
  "contracts": [
    {
      "id": "C-ENV",
      "description": "Environment and version sources. environment: VERCEL_ENV when it is 'production', 'preview' or 'development'. Otherwise NODE_ENV when it is 'production', 'development' or 'test'. Otherwise 'unknown'. version: the package.json 'version' (currently 0.1.0), with '+<first 7 chars of VERCEL_GIT_COMMIT_SHA>' appended when that variable is set, or 'unknown' if neither source is available. No new env vars and no change to .env.example.",
      "owner": "claude",
      "consumers": [
        "codex",
        "cursor"
      ]
    },
    {
      "id": "C-TYPES",
      "description": "Types in types/index.ts: type ApiStatus = 'ok' | 'degraded' | 'down'; type AppEnvironment = 'production' | 'preview' | 'development' | 'test' | 'unknown'; interface ApiCheck { available: boolean; mode: 'supabase' | 'mock'; latencyMs?: number } (latencyMs only in supabase mode); interface StatusResponse { status: ApiStatus; api: ApiCheck; version: string; environment: AppEnvironment; timestamp: string } (timestamp is ISO 8601). The response body contains exactly these keys.",
      "owner": "codex",
      "consumers": [
        "antigravity",
        "cursor"
      ]
    },
    {
      "id": "C-HELPER",
      "description": "Server-only exports of lib/status.ts: resolveEnvironment(env?: NodeJS.ProcessEnv): AppEnvironment; resolveVersion(env?: NodeJS.ProcessEnv): string; isMockMode(env?: NodeJS.ProcessEnv): boolean (true when NEXT_PUBLIC_SUPABASE_URL is missing or equals 'https://<project-ref>.supabase.co'); checkApi(probe: () => Promise<void>, timeoutMs?: number /* default 2000 */): Promise<ApiCheck>; getStatus(deps?: { probe?: () => Promise<void>; now?: () => Date; timeoutMs?: number; env?: NodeJS.ProcessEnv }): Promise<StatusResponse>. Env is read at call time. Mock mode never calls the probe. Probe errors and timeouts give available:false, with no error text in the output.",
      "owner": "codex",
      "consumers": [
        "antigravity",
        "cursor"
      ]
    },
    {
      "id": "C-STATUS-MAP",
      "description": "Status semantics: 'ok' means mode 'supabase' and the probe succeeded within the timeout. 'degraded' means mode 'mock' (Supabase not configured, so the app serves fallback data); api.available is true. 'down' means mode 'supabase' and the probe failed or timed out; api.available is false.",
      "owner": "codex",
      "consumers": [
        "antigravity",
        "cursor"
      ]
    },
    {
      "id": "C-HTTP",
      "description": "GET /api/status is public, unauthenticated and dynamic (never prerendered). It returns Content-Type application/json and Cache-Control: no-store. HTTP 200 when status is 'ok' or 'degraded'; HTTP 503 when status is 'down'. The body is a StatusResponse in both cases. No other methods are implemented.",
      "owner": "codex",
      "consumers": [
        "cursor",
        "claude"
      ]
    },
    {
      "id": "C-SECURITY",
      "description": "Only C-TYPES fields are exposed. No Supabase URL or key, raw process.env content, error messages or stack traces. Non-NEXT_PUBLIC env vars are read only on the server. No Supabase access from components.",
      "owner": "codex",
      "consumers": [
        "antigravity",
        "cursor",
        "claude"
      ]
    },
    {
      "id": "C-ROUTING",
      "description": "/status and /api/status stay public. proxy.ts and lib/supabase/proxy.ts are not modified, and neither path is added to rutaProtegida.",
      "owner": "codex",
      "consumers": [
        "antigravity",
        "cursor"
      ]
    },
    {
      "id": "C-UI",
      "description": "components/status/StatusView.tsx exports a default component with props { status: StatusResponse }. It is pure and presentational. It renders a role=\"status\" element containing a text label: 'Operativo' for ok, 'Degradado' for degraded, 'Caído' for down. It also shows the API mode text ('Supabase' or 'Datos de demostración'), the version, the environment and the formatted timestamp. The page at /status is a dynamic server component that calls getStatus() and renders StatusView.",
      "owner": "antigravity",
      "consumers": [
        "cursor"
      ]
    },
    {
      "id": "C-TEST-ISOLATION",
      "description": "Tests live under tests/**/*.test.ts(x). They use vi.stubEnv, vi.unstubAllEnvs and vi.resetModules with dynamic imports after stubbing. They make no network calls, mocking or injecting the probe instead. The global vitest config is not changed; a per-file '// @vitest-environment node' pragma is allowed.",
      "owner": "cursor",
      "consumers": [
        "codex",
        "antigravity"
      ]
    }
  ],
  "integration_order": [
    "1. INFRA-1 (claude) confirms C-ENV. In parallel, BE-1 (codex) adds the C-TYPES types to types/index.ts.",
    "2. BE-2 (codex) implements lib/status.ts according to C-HELPER and C-STATUS-MAP. In parallel, FE-1 (antigravity) builds StatusView against C-TYPES.",
    "3. BE-3 (codex) adds the route and BE-4 (codex) adds the helper unit tests. In parallel, FE-2 (antigravity) adds the page and footer link, and FE-3 (antigravity) adds the component tests.",
    "4. Merge the backend branch (BE-1 to BE-4) onto feature/status-page/integration, then the frontend branch (FE-1 to FE-3).",
    "5. On the integration branch, cursor runs QA-1 (endpoint contract tests) and QA-2 (documentation).",
    "6. QA-3 (cursor) reviews against the acceptance criteria and checks regressions. Each blocker goes back to its single owner.",
    "7. QA-4 (cursor) runs npm run verify once in full, serially, checks that the build marks both routes dynamic, and does the browser pass in mock mode.",
    "8. INFRA-2 (claude) runs post-deploy checks on Preview and Production, only after a human explicitly authorizes a deploy."
  ],
  "acceptance_criteria": [
    "GET /api/status returns application/json with Cache-Control: no-store and a body with exactly the keys status, api{available, mode, latencyMs?}, version, environment and timestamp.",
    "In mock mode (NEXT_PUBLIC_SUPABASE_URL missing or set to the placeholder), the endpoint returns HTTP 200, status 'degraded' and api { available: true, mode: 'mock' }, without calling the probe.",
    "With Supabase configured and a successful probe, it returns HTTP 200 and status 'ok' with api.mode 'supabase' and a numeric latencyMs.",
    "With Supabase configured and a failing probe or one that takes more than 2000 ms, it returns HTTP 503, status 'down' and api.available false, with no error details in the body.",
    "environment follows C-ENV precedence: VERCEL_ENV first, then normalized NODE_ENV, then 'unknown'. version is the package.json version, optionally with '+<sha7>' appended, or 'unknown'.",
    "timestamp is valid ISO 8601 and reflects the time of the request.",
    "Neither the response body nor the page contains the Supabase URL, the anon key, other env var names or values, or stack traces.",
    "/status renders the overall status, API availability and mode, version, environment and check time, with text labels and an accessible role=\"status\" indicator that does not rely on color.",
    "/status and /api/status are reachable anonymously. Existing redirects for /admin, /proveedor and /mis-cotizaciones are unchanged, and proxy.ts and lib/supabase/proxy.ts are not modified.",
    "The build output marks /api/status and /status as dynamic, not statically prerendered.",
    "The new tests (status-lib, status-endpoint, status-page) pass, and the existing suites (carrito, mock, data-fallback, tipos, tooling) still pass unchanged.",
    "README.md documents /status and /api/status with an example response. PROJECT_GUIDE.md places lib/status.ts and the route. npm run docs:check passes.",
    "npm run verify passes in full in a single serial run on the integration checkout.",
    "A browser pass of /status in mock mode on port 3000 is recorded, and the Footer link to /status works.",
    "There are no new npm dependencies, no new env vars, no .env.example changes and no edits under the nested resuelvelo/ directory."
  ],
  "risks": [
    "If the route or page is prerendered, environment and version could be frozen at build time. Mitigation: dynamic rendering following the Next 16 docs, plus a build-output check in QA-4.",
    "Next 16 Route Handler and dynamic-rendering conventions may differ from older Next versions. Implementers must read node_modules/next/dist/docs before coding.",
    "Under the jsdom default environment, importing a Route Handler that uses Request/Response may fail. Mitigation: a per-file node environment pragma, with no global config change.",
    "Module-level env evaluation leaks state between tests. Mitigation: lib/status.ts reads env at call time, and tests use vi.resetModules with dynamic imports.",
    "The default probe goes through lib/supabase/server.ts, which calls cookies(), and proxy.ts already calls auth.getUser() on every request. Each status hit therefore pays for two Supabase round-trips, and repeated polling could add load. Mitigation: a head-only, limit-1 query with a 2000 ms timeout and no client polling.",
    "The 'categorias' probe assumes RLS allows anonymous reads. If it does not, a healthy system would report 'down'. This must be verified against supabase/schema.sql during BE-2.",
    "Locally, next start sets NODE_ENV=production, so the page shows 'production' outside Vercel. This must be documented to avoid confusion.",
    "Preview and Production values cannot be verified locally. INFRA-2 depends on a deploy, which requires explicit human authorization.",
    "The nested duplicate resuelvelo/ tree could be edited by mistake, or picked up by lint and typecheck. Only root paths are in scope.",
    "Publicly exposing the version and environment allows minor fingerprinting.",
    "Only one process may use .next/ at a time. Worker builds and QA's verify run must not overlap."
  ],
  "open_questions": [
    "Should /status and /api/status be fully public, including version and environment in Production, or should those details be hidden or restricted there?",
    "Is the proposed version format (package.json version, with '+<7-char commit SHA>' appended when available) acceptable, or should it be only the version or only the SHA?",
    "Is the proposed status mapping acceptable: mock mode is 'degraded' with HTTP 200, and 503 is returned only when Supabase is configured but unreachable? The alternative is always returning 200 with a status field.",
    "What should 'API availability' check: the app's own liveness plus one Supabase probe on 'categorias' with a 2000 ms timeout (proposed), or something cheaper or broader?",
    "Is a plain reload link with no auto-polling acceptable for the page, or is periodic auto-refresh required?",
    "Is a Footer link to /status the desired navigation placement?",
    "Should documentation stay in README.md and PROJECT_GUIDE.md (proposed), or go in a new indexed doc under docs/?",
    "Is QA authorized to add a unit test of lib/supabase/proxy.ts with a mocked client, to assert /status and /api/status are not redirected, or is code review enough?",
    "Will a Preview and Production deploy be authorized so INFRA-2 can verify the real environment and version values?",
    "Is the nested resuelvelo/ directory intentional, and can it be confirmed out of scope for all workers?"
  ]
}

Return only the corrected JSON object.
