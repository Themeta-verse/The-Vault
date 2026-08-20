# THE VAULT Environment and Configuration Control

## Current environment reality

THE VAULT currently has **one provider-managed deployed environment** and a local development process. There is **no independently provisioned staging environment**, no documented separate development database, and no repository-controlled production secret store. The development server can run with provider-injected services, which is convenient but is not environment isolation. [1] [2]

| Environment | Current state | Database | Authentication/services | Release route | Risk |
|---|---|---|---|---|---|
| Local development | Available. | May depend on managed `DATABASE_URL` unless operator supplies a separate DB. | May depend on managed OAuth/Forge variables. | `pnpm dev`. | High risk of accidental shared-data use without dedicated credentials. |
| Test | Available as Vitest execution. | Mocked in current router tests; no dedicated integration database evidenced. | Mocked adapters where needed. | `pnpm test`. | Does not prove live provider connectivity or migrations. |
| Staging | **Absent.** | None documented. | None documented. | None. | No pre-production integration/rollback rehearsal boundary. |
| Production | Manus-managed and auto-published from checkpoints. | Provider-managed MySQL/TiDB-compatible database. | Manus OAuth, Forge services, managed hosting. | Managed publication; code mirrored to GitHub. | Critical provider concentration and insufficient independence. |

> **Required interpretation:** a local process using production-backed provider variables is not a safe substitute for staging. It cannot validate migrations, OAuth callback changes, secrets, or storage behavior without production risk.

## Required target-state topology

Before treating the service as independently operable, the project owner should establish separate development, staging, and production configurations. Each needs an independently owned database, non-production user/test data, separate auth client/callback configuration, per-environment secrets, and a deploy record.

| Target environment | Minimum configuration | Who must act | Exact action |
|---|---|---|---|
| Development | Local or shared non-production MySQL DB; non-production OAuth client; sandbox AI/storage adapters; `.env` populated privately. | Maintainer and DB administrator. | Provision separate DB/user, apply migrations, and use a non-production identity callback. |
| Staging | Production-like host, isolated database/storage, monitoring, test identity, and deployment approval. | Project owner and operations owner. | Provision target account/project, create credentials, run migrations, and add smoke tests before production promotion. |
| Production | Managed secrets, isolated production DB, backup/restore evidence, custom domain ownership, alerting, and documented rollback. | Project owner and operations owner. | Choose host/identity/DB/storage providers and complete the exit-test remediation plan. |

## Environment variables

[`SAFE_ENV_TEMPLATE.md`](SAFE_ENV_TEMPLATE.md) is the complete repository-safe template. It intentionally contains no real credentials. A conventional `.env.example` cannot be created directly in this managed project because the platform reserves that path for its secret-configuration interface; this is recorded as a portability/control blocker rather than worked around with a tracked secret file. The table identifies whether values are server-only, browser-visible, or currently provider-bound. [1] [3]

| Variable | Scope | Required now | Current ownership/dependency | Portability note |
|---|---|---:|---|---|
| `NODE_ENV` | Server | Yes | Host runtime. | Portable. |
| `PORT` | Server | Host-dependent | Host runtime. | Portable; host may set it. |
| `DATABASE_URL` | Server | Yes | Manus-managed DB in current deployment. | Replace with least-privilege MySQL-compatible DSN. |
| `JWT_SECRET` | Server | Yes | Provider-injected currently. | Generate and store separately per environment; rotation invalidates sessions. |
| `VITE_APP_ID` | Browser build | Yes for current auth | Manus OAuth app identity. | Replace with target auth client identifier after adapter rewrite. |
| `OAUTH_SERVER_URL` | Server | Yes for current auth | Manus OAuth. | Requires target identity-provider adapter. |
| `VITE_OAUTH_PORTAL_URL` | Browser build | Yes for current auth | Manus OAuth portal. | Requires target login URL and client rewrite. |
| `OWNER_OPEN_ID` | Server | Yes for owner bootstrap | Provider identity subject. | Map to target provider’s stable owner ID. |
| `OWNER_NAME` | Server | Present in managed configuration | Provider-injected owner metadata. | Optional after role model is redesigned. |
| `BUILT_IN_FORGE_API_URL` | Server | Yes for current Forge adapters | Manus Forge. | Replace adapter or provide compatible base URL. |
| `BUILT_IN_FORGE_API_KEY` | Server | Yes for current Forge adapters | Manus Forge. | Keep server-only; rotate on suspected exposure. |
| `VITE_FRONTEND_FORGE_API_URL` | Browser build | Present in managed configuration | Manus Forge frontend integration. | Replace/remove; browser-visible. |
| `VITE_FRONTEND_FORGE_API_KEY` | Browser build | Present in managed configuration | Manus frontend integration. | **Must not be privileged** because browser-visible; remove or use scoped token. |
| `VITE_APP_TITLE` / `VITE_APP_LOGO` | Browser build | Optional presentation config. | Provider injection/current project settings. | Portable public values. |
| `VITE_ANALYTICS_ENDPOINT` / `VITE_ANALYTICS_WEBSITE_ID` | Browser build | Optional current runtime config. | Manus analytics/runtime plugin. | Remove or replace with chosen analytics provider. |

## Configuration and secret rules

| Rule | Rationale | Verification |
|---|---|---|
| Commit the safe template, never `.env`. | Safe setup documentation without secret exposure. | Git ignore rules and Git-history secret scan. |
| Keep database, JWT, OAuth server credentials, and Forge server key server-only. | Browser delivery and logs cannot protect privileged secrets. | Variable review; no `VITE_` prefix for secrets. |
| Use unique secrets/DB users per environment. | Limits blast radius and enables reliable staging. | Target secret-manager and DB-user audit. |
| Rotate after suspected exposure. | Git history and logs can preserve leaked values. | Incident record and validation after rotation. |
| Do not use managed metadata as deploy configuration. | It encodes provider coupling and can contain sensitive operational details. | External IaC/runbook stored separately once target host is chosen. |

## Staging blocker register

| WHAT | WHY | WHO MUST ACT | WHAT EXACTLY NEEDS TO BE DONE |
|---|---|---|---|
| No staging environment exists. | The current workflow has no safe production-like validation boundary. | Project owner and operations owner. | Select/create a hosting account and a separate staging project; grant least-privilege access. |
| No staging database credentials/backup policy are repository-controlled. | Migration and restore rehearsal cannot be conducted safely. | DB administrator. | Provision separate MySQL-compatible database, backup retention, restore test, and `DATABASE_URL` secret. |
| OAuth is Manus-specific. | Login/callback changes cannot be tested independently. | Project owner and identity administrator. | Register staging OAuth client, configure callback domain, and implement/validate replacement adapter. |
| Storage and AI use Forge adapters. | Integration behavior/data cannot be validated outside Manus. | Maintainer and service administrators. | Choose providers, create scoped credentials/buckets, migrate objects, and replace/test adapters. |
| CI currently validates code but has no external deploy target. | Continuous delivery cannot promote an artifact to staging. | Project owner and operations owner. | Add target-host deployment credentials and approval mechanism only after host selection. |
| A direct `.env.example` file is platform-controlled. | The managed project blocks direct creation of this conventional portable artifact. | Project owner/platform administrator. | Use the managed secret configuration interface for real values and retain `SAFE_ENV_TEMPLATE.md` as the Git-tracked setup reference. |

## References

[1]: SAFE_ENV_TEMPLATE.md "Safe environment-variable template"
[2]: ../.project-config.json "Current managed project configuration; values intentionally not reproduced"
[3]: ../server/_core/env.ts "Server environment access boundary"
