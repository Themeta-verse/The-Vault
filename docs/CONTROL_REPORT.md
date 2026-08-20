# THE VAULT — Ownership and Infrastructure Control Report

**Assessment date:** 20 August 2026  
**Scope:** Infrastructure ownership, data control, health, CI, operations, reproducibility, and exit readiness. No product feature or visual experience was added in this pass.

## PROJECT CONTROL

The GitHub repository controls the React/Three.js frontend, Express/tRPC backend, Drizzle schema, ordered migrations, authored world blueprint, tests, documentation, package manifest, pnpm lockfile, CI workflow, and the new `/health` endpoint. The current managed deployment controls the live runtime, injected configuration, database account, OAuth authority, Forge adapters, and automatic publication behavior. The repository is therefore an authoritative **application implementation** source, but not yet a complete infrastructure ownership boundary. [1] [2]

## DATABASE

| Item | Current status |
|---|---|
| **Provider** | Manus-managed MySQL/TiDB-compatible database, inferred from current connection configuration and Drizzle MySQL dialect. |
| **Architecture** | Sixteen-table relational model: authored global catalog plus owner-scoped progression, history, notes, creations, conversation, settings, and permissions. |
| **Schema** | `drizzle/schema.ts`; primary keys, unique indexes, and application-level ownership predicates. No DB-enforced foreign keys or RLS are currently declared. |
| **Migration system** | Committed Drizzle migrations `0000`–`0006`; target flow is schema change → reviewed generated SQL → `pnpm drizzle-kit migrate` → compatible app release. |
| **Backup** | Not repository-controlled. Current provider controls snapshot/export/restore posture. A task backup is a point-in-time export, not a continuous database backup. |
| **Current status** | Database connectivity is now probed by `/health`. Critical discovery persistence now executes as one transaction. Full portable data export/import remains blocked by provider/account control. |

## AUTH

| Item | Current status |
|---|---|
| **Provider** | Manus OAuth. |
| **Configuration** | `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `JWT_SECRET`, and `OWNER_OPEN_ID`; values are managed/injected and never documented. |
| **Session model** | OAuth callback validates state, upserts a user, signs a JWT-backed cookie, and tRPC derives `ctx.user`; protected/admin guards are server-side. |
| **Current status** | Functional but a critical portability blocker. Moving requires an identity-provider choice, callback registration, user-subject mapping, and rewrite of the Manus SDK/OAuth adapter. |

## AI

| Item | Current status |
|---|---|
| **Provider** | Manus Forge, accessed through OpenAI-compatible server transport in `server/_core/llm.ts`. |
| **Configuration** | `BUILT_IN_FORGE_API_URL` and server-only `BUILT_IN_FORGE_API_KEY`. The router selects `gpt-5-mini`, uses JSON-schema response validation, and bounds actions to a fixed safe enum. |
| **Current status** | Replaceable adapter. AI failure saves/returns a safe fallback response; AI output cannot directly execute a database operation. No rate-limit configuration is implemented in the repository. |

## STORAGE

| Item | Current status |
|---|---|
| **Provider** | Manus Forge presigned object-storage adapter. |
| **Configuration** | Server-side Forge URL/key; `storageProxy.ts` obtains a short-lived URL and redirects after key validation. |
| **Current status** | Replaceable with S3-compatible storage and adapter rewrite. Existing object export, bucket ownership, lifecycle, retention, and deletion controls are not repository-controlled. |

## DEPLOYMENT

| Item | Current status |
|---|---|
| **Provider** | Manus-managed hosting and automatic checkpoint publication. Current public domain: `vaultapp-zxzxri4v.manus.space`. |
| **Pipeline** | New GitHub Actions CI validates frozen install, scoped formatting lint, typecheck, tests, and production build on `main` push and pull requests. Publication is still platform-managed; CI does not deploy. |
| **Current status** | Build/start is standard Node/Vite, but target-host configuration, secrets, deployment workflow, staging environment, and portable rollback execution are not yet owned outside Manus. |

## EXTERNAL CONNECTIONS

| Dependency | Purpose | Configuration/connection boundary | Control classification |
|---|---|---|---|
| GitHub | Source-of-truth repository and CI. | `github` remote and `.github/workflows/ci.yml`. | Project-controlled. |
| Manus database | Persistent user and world state. | Server-only `DATABASE_URL`. | Required / Manus-controlled. |
| Manus OAuth | Login and identity/session bootstrap. | OAuth environment values and framework SDK. | Required / Manus-controlled. |
| Manus Forge AI | ARIA completion. | Forge server environment values and `llm.ts`. | Optional feature dependency / replaceable. |
| Manus Forge storage | Signed object retrieval. | Forge server environment values and storage adapter. | Optional feature dependency / replaceable. |
| Manus Forge notification | Owner alert mutation. | Forge adapter. | Optional / replaceable. |
| Manus analytics/runtime plugin | Development collector and analytics injection. | `vite.config.ts`, public analytics variables. | Removable. |
| Manus heartbeat | Generic scheduled-job adapter; no active THE VAULT job. | `server/_core/heartbeat.ts`. | Removable/unused. |
| npm packages | Runtime/build dependency graph. | `package.json` and `pnpm-lock.yaml`. | Project-controlled through lockfile. |

The codebase connection audit found provider and localhost references only in expected SDK/adapters, Vite/runtime scaffolding, test fixtures, and documentation/configuration locations. No application-source hardcoded database endpoint or token-shaped secret signature was detected by the repository/history scan performed in this pass. [3]

## MANUS DEPENDENCIES

| Classification | Dependency | Reason |
|---|---|---|
| **REQUIRED today** | Managed database | Holds live state; data export/DB account is not yet externally owned. |
| **REQUIRED today** | Manus OAuth | The current authentication adapter imports and calls Manus services. |
| **REQUIRED today** | Managed deployment/runtime | Current publication, injected configuration, and `origin` artifact remote are platform-operated. |
| **OPTIONAL** | Forge AI | ARIA degrades to a safe fallback on provider failure; adapter can be replaced. |
| **OPTIONAL** | Forge storage | Only needed for current stored-object retrieval; adapter can be replaced with S3-compatible service. |
| **OPTIONAL** | Forge owner notifications | Admin-only notification capability. |
| **REMOVABLE** | Analytics/debug Vite runtime plugin | Does not implement core Vault domain behavior. |
| **REMOVABLE** | Heartbeat adapter | No active scheduled task uses it. |

## GITHUB

| Item | Status at report drafting |
|---|---|
| **Repository** | `Themeta-verse/The-Vault` |
| **Branch** | `main` |
| **Latest commit** | Recorded after final commit/push verification in the delivery update. |
| **Remote verified** | `github` remote is the user-controlled GitHub repository; separate `origin` is the Manus artifact remote. |
| **Working tree clean** | Verified after final commit/push in the delivery update. |

## HEALTH / OBSERVABILITY

`GET /health` now returns application, database, required-service status, and an ISO timestamp without configuration or user data. It returns `200` only when its database probe succeeds and `503` when the process is alive but database-backed operations are unsafe. The current `requiredServices` value is `not_configured`: external AI, storage, and notification services have safe bounded request-level error paths but no universal readiness probe. [4]

Safe structured logs now record the event type, UTC timestamp, tRPC procedure/request class/error code, and server-start error class without writing request payloads, raw errors, tokens, URLs, or connection strings. There is no dedicated external error-tracking or slow-query system; host logs and managed provider monitoring remain the current incident-visibility path. [5]

## SECURITY

The pass verified server-side Zod validation, protected/admin tRPC guards, owner-scoped data predicates, unique indexes protecting key owner-state records, AI response/action validation, safe provider fallbacks, no token-shaped signature found in application source/reachable Git history, no raw secret values in new documentation, and a health endpoint that omits sensitive internals. The critical discovery path now uses a database transaction so discovery/state/fragment/history/unlock updates commit or roll back as a group. A focused source-level regression prevents those writes from escaping the transaction block; failure-injection integration testing remains pending a disposable user-controlled database. 

Residual security risk is architectural: ownership isolation is enforced by code rather than database row-level security, and the schema lacks declared foreign keys. Direct database access must therefore remain restricted and every new query requires owner-filter regression coverage. [6]

## REMAINING BLOCKERS

| WHAT | WHY | WHO MUST ACT | WHAT EXACTLY NEEDS TO BE DONE |
|---|---|---|---|
| Production database is not externally controlled. | The managed provider owns account access, backup/export, credentials, and current live data. | Project owner and target database administrator. | Provision a user-owned MySQL-compatible DB; obtain/export a complete provider data snapshot; import it; apply migrations; validate row counts, users, owner isolation, and recovery. |
| Authentication is Manus-specific. | OAuth callback/session SDK and current app credentials point to Manus services. | Project owner, identity administrator, and maintainer. | Select an identity provider; register dev/staging/prod clients and callbacks; rewrite auth adapter; map `openId`/owner role; test login/logout/session expiry. |
| Storage/data export is not externally controlled. | Forge presign/storage owns stored bytes and signed URLs. | Project owner and storage administrator. | Export all relevant objects and metadata; create project-owned bucket/access policy; implement S3-compatible adapter; verify private-object access and lifecycle. |
| Deployment and secrets remain Manus-managed. | Automatic publication, runtime configuration, and artifact `origin` are platform controls. | Project owner and operations owner. | Choose target host/secret manager/domain account; configure build/start/health/deploy workflow; migrate secrets without placing values in Git; test rollback. |
| No staging environment exists. | The project has no isolated DB/auth/storage/deployment verification boundary. | Project owner and operations owner. | Provision staging with separate DB, identity client, storage, secrets, monitoring, and test data; require staging validation before production promotion. |
| Backup/restore has no repository-owned automation or tested schedule. | Git preserves code/schema but not live state/objects; provider-managed data controls are not documented as user-operated. | Project owner and DB/storage administrators. | Define backup frequency/retention/encryption/restore owner; automate provider-native exports/snapshots; perform and record restore drills. |
| Conventional tracked `.env.example` is platform-controlled. | This managed project blocks direct creation/editing of environment-example files. | Project owner/platform administrator. | Retain `docs/SAFE_ENV_TEMPLATE.md` as Git-tracked safe guidance; use managed secret configuration for values; create `.env.example` directly after export to an unrestricted repository/host if required. |
| Repo-wide formatting lint is not clean. | Legacy source has broad Prettier drift unrelated to this control pass. | Maintainer. | Plan a separate non-functional formatting PR; then expand `lint` from scoped CI/control artifacts to the full repository. |

## References

[1]: ARCHITECTURE.md "Architecture, ownership boundaries, and exit test"
[2]: DATABASE.md "Database model, migration, and backup posture"
[3]: ENVIRONMENTS.md "Environment variable and connection audit"
[4]: API.md "HTTP health contract"
[5]: ../server/_core/index.ts "Structured tRPC/server logging"
[6]: ../server/db.ts "Owner-scoped persistence and transactional discovery"
