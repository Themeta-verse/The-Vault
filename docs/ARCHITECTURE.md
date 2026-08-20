# THE VAULT Architecture and Ownership Control

**Status:** Ownership control baseline, August 2026  
**Repository source of truth:** GitHub repository `Themeta-verse/The-Vault`  
**Deployment state assessed:** Manus-managed full-stack deployment with a Node/Express server, React client, MySQL-compatible database, Manus OAuth, and Forge service adapters.

## Executive architecture statement

THE VAULT is a single Node.js process that serves a Vite-built React application and a tRPC API. The React/Three.js client is a spatial interface; all persistent world state is authoritative in the database and is resolved per authenticated user. The repository owns the application code, Drizzle schema, migrations, tests, and lockfile. The currently deployed database, authentication authority, Forge-backed AI/storage/notification services, managed runtime, and the `origin` deployment remote are provider-controlled dependencies rather than portable repository assets. [1] [2] [3]

> **Control principle.** A GitHub clone preserves the application implementation, but it does not by itself preserve the managed database, Manus login, Forge-issued credentials, uploaded objects, environment configuration, or runtime deployment.

## System boundary and request flow

```text
Browser
  │  HTTPS: static client, /health, /api/trpc, /api/oauth/callback, /manus-storage/*
  ▼
Express process ───────────────────────────────────────────────────────────────┐
  │  /health → application and database reachability                           │
  │  /api/oauth/callback → Manus OAuth exchange → signed session cookie        │
  │  /api/trpc → tRPC context → authorization → routers → DB helpers           │
  │  /manus-storage/* → Forge presign request → 307 signed-object redirect     │
  ▼                                                                            │
Repository-controlled services                                                  │
  ├─ React 19 / Three.js client                                                 │
  ├─ tRPC routers and Zod input validation                                      │
  ├─ Drizzle schema, migrations 0000–0006, Vitest tests                        │
  └─ owner-scoped application logic                                             │
                                                                               │
Provider-controlled dependencies                                                │
  ├─ Manus OAuth authority and app identity                                    │
  ├─ Manus-managed MySQL/TiDB-compatible database                              │
  ├─ Forge AI, presigned object storage, and owner notification RPCs           │
  └─ Managed hosting, analytics injection, deployment remote, and secrets      │
                                                                               │
GitHub (repository source of truth) ◄── developer-controlled `github` remote ─┘
```

The Express entry point registers the storage proxy and OAuth callback before mounting `/api/trpc`; it then chooses Vite middleware in development or static assets in production. The health route is intentionally unauthenticated and must remain ahead of frontend fallback middleware so load balancers can observe it without a session. [1]

| Flow | Repository-controlled behavior | External dependency and ownership boundary | Failure behavior |
|---|---|---|---|
| Client delivery | Vite builds `client/` into `dist/public`; Express serves built assets. | Manus runtime/hosting currently owns the deployed process and default domain. | Application UI cannot be served if runtime or build artifact delivery is unavailable. |
| Authentication | OAuth callback validates state, upserts a user, signs a session JWT, and writes a cookie. | Manus OAuth endpoints, OAuth app identity, and owner subject are provider-managed. | Protected procedures reject unauthenticated calls; callback returns a safe HTTP error. |
| World persistence | tRPC procedures validate input and call owner-scoped helpers in `server/db.ts`. | `DATABASE_URL` points to provider-managed MySQL/TiDB-compatible storage. | Dependency-aware health reports database unavailability; mutation errors are surfaced without credentials. |
| ARIA response | Server builds constrained system context, requests JSON-schema output, and persists a bounded response. | Forge-compatible AI endpoint and service key. | A provider failure records a safe fallback reply rather than provider internals. |
| Object retrieval | Storage proxy validates the key, obtains a short-lived Forge URL, and sends a 307 redirect. | Forge storage/presign API and backing object store. | Invalid keys return 400; provider failures return safe 5xx responses. |
| Owner notification | Admin-only tRPC mutation invokes notification adapter. | Forge notification RPC. | Adapter returns delivery status and does not expose service credentials. |

## Authentication and authorization model

The application uses the framework-provided Manus OAuth flow. The callback validates the CSRF state nonce, exchanges the code through the SDK, upserts the user record, signs a JWT with `JWT_SECRET`, and writes a session cookie. tRPC context resolves that cookie into `ctx.user`; `protectedProcedure` requires this user and `adminProcedure` additionally requires the `admin` role. The initial owner role is assigned when a user’s `openId` matches `OWNER_OPEN_ID`. [2] [4]

Authorization is implemented in application code, not by database row-level security. All user world-state reads and writes are expected to filter by `userId`; unique composite indexes protect several owner-scoped singleton records. This makes the helper layer a security-critical boundary: new queries must never accept an arbitrary user ID from client input, and every read/write must retain its `ctx.user.id` predicate. [3] [5]

## Persistence and consistency model

The authoritative schema comprises global authored catalog records (`rooms`, `vaultObjects`, `artifacts`, and `objectRelationships`) and user-owned state/history records. Blueprint upserts seed catalog and owner-state defaults idempotently before normal operations. Unique indexes protect per-user room/object/discovery/fragment/permission settings semantics, while application code enforces progression order and room/object membership. [3] [5]

The critical discovery path changes object state, discovery evidence, artifact-fragment evidence, room unlocking, and history. This control pass introduces transaction-backed consistency for grouped critical writes; if a transaction cannot commit, the database should roll back that unit. Existing historical sessions retain a defensive state-normalization repair path for records written by prior non-atomic releases. Operators must not manually "repair" values without first preserving an export and recording the action. [5]

## External dependencies and ownership classification

| Dependency | Current use | Owner/control plane | Replaceability | Credential/configuration location | Portability assessment |
|---|---|---|---|---|---|
| GitHub | Canonical repository and commit history via remote `github`. | Project owner’s GitHub organization. | Already portable. | Local GitHub CLI authentication; remote URL is non-secret. | **Portable.** Clone and push work without Manus. |
| Manus deployment remote | Managed `origin` remote and automatic publication. | Manus. | Can be removed after another host is configured. | `.project-config.json` contains managed metadata; never treat it as portable deployment configuration. | **Provider-coupled.** |
| MySQL/TiDB-compatible database | All persistent user state and authored data. | Manus-managed in current deployment. | Yes, with user-owned MySQL-compatible database, exported data, credentials, and migration runbook. | `DATABASE_URL`, injected by provider. | **Critical exit blocker** until data export/import is controlled. |
| Manus OAuth | Visitor authentication, callback exchange, and session bootstrap. | Manus. | Yes, but requires a replacement identity provider and adapter rewrite. | `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `JWT_SECRET`, `OWNER_OPEN_ID`. | **Critical exit blocker.** |
| Forge AI | ARIA completion through OpenAI-compatible request shape. | Manus Forge. | Yes, usually by replacing base URL/key with a compatible provider after confirming model and response compatibility. | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`. | **Replaceable adapter.** |
| Forge object storage | Presigned object download proxy. | Manus Forge/object store. | Yes, with S3-compatible bucket, credentials, and a replacement storage adapter. | Forge server variables above. | **Replaceable adapter; data export needed.** |
| Forge notifications | Admin-only owner notification. | Manus Forge. | Yes, or remove feature if no equivalent is required. | Forge server variables above. | **Replaceable/non-critical.** |
| Forge heartbeat | Framework cron adapter. No active THE VAULT schedule is configured. | Manus Forge. | Remove when no scheduled work is used, or replace with host scheduler. | Forge server variables. | **Unused coupling.** |
| Analytics/runtime plugin | Debug collector and analytics injection in Vite configuration. | Manus. | Yes; remove or replace in Vite configuration. | `VITE_ANALYTICS_*`, plugin configuration. | **Removable.** |
| npm registry packages | Application runtime/build dependencies locked by `pnpm-lock.yaml`. | Package publishers and registry. | Replaceable through normal dependency management. | `package.json`, `pnpm-lock.yaml`. | **Portable with lockfile.** |

## Deployment boundary

The current service runs `pnpm build` and then starts `dist/index.js` with `NODE_ENV=production`. The server uses the platform-supplied `PORT` where available and falls back locally; the current `findAvailablePort` behavior is suitable for development but should be reviewed before moving to a host whose health routing expects the exact assigned port. The Vite configuration contains a Manus runtime plugin and development log collector; neither is required for the business implementation, but both require removal or replacement for a clean external deployment. [1] [6] [7]

## Manus Exit Test

The following test assesses whether a clean external environment can run the code, not whether Manus itself will continue to operate.

| Exit-test step | Result | Evidence | Blocker and exact resolution |
|---|---|---|---|
| Clone GitHub repository | **Pass.** | `github` remote is a normal GitHub URL and the source, schema, migrations, tests, and lockfile are tracked. | None. Use `git clone`, then `pnpm install --frozen-lockfile`. |
| Configure local process | **Conditional.** | `.env.example` names every current variable without values. | **WHAT:** managed values are not owned outside the platform. **WHY:** DB, OAuth, and Forge credentials are injected by Manus. **WHO MUST ACT:** project owner. **DO:** provision replacements and fill a private `.env`. |
| Migrate a fresh database | **Conditional.** | Drizzle uses the MySQL dialect and committed migrations. | **WHAT:** no user-controlled production database export/credentials are evidenced. **WHY:** current database is provider-managed. **WHO MUST ACT:** project owner and target DB administrator. **DO:** export data, create MySQL-compatible DB, set `DATABASE_URL`, run `pnpm drizzle-kit migrate`, and verify row counts. |
| Start the application | **Conditional.** | Standard Node build/start scripts are committed. | **WHAT:** OAuth and Forge adapters expect Manus services. **WHY:** code imports framework SDK/adapters. **WHO MUST ACT:** maintainer. **DO:** replace auth, storage, notification, and optional AI adapters or provide explicitly compatible services. |
| Serve existing user data/files | **Fail until exported.** | Database and Forge object storage are outside GitHub. | **WHAT:** live state and stored objects are not in the repository. **WHY:** source control never includes managed data. **WHO MUST ACT:** project owner/provider administrator. **DO:** export database and storage objects, import to target systems, and validate owners and object keys. |
| Deploy without Manus | **Conditional.** | Express/Vite build is deployable to a generic Node host after adapter/configuration work. | **WHAT:** current runtime config and managed plugin are Manus-coupled. **WHY:** no target-host IaC/container/identity configuration exists. **WHO MUST ACT:** maintainer and operations owner. **DO:** remove/replace runtime plugin, configure host build/start/health, secrets, database, identity, storage, and observability. |

**Exit conclusion:** the repository has a portable application core but does **not** currently pass a full independence test. The controlled GitHub source layer can leave immediately; production data, identity, storage, credentials, managed runtime behavior, and a staging environment must be established outside Manus before a credible exit can be completed.

## References

[1]: ../server/_core/index.ts "Express server entry point"
[2]: ../server/_core/oauth.ts "OAuth callback implementation"
[3]: ../drizzle/schema.ts "Drizzle MySQL schema"
[4]: ../server/_core/sdk.ts "Session and Manus SDK integration"
[5]: ../server/db.ts "Owner-scoped persistence helpers and blueprint seeding"
[6]: ../vite.config.ts "Vite build and Manus runtime integration"
[7]: ../package.json "Build, start, check, test, and dependency manifest"
