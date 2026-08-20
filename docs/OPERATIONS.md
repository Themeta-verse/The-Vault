# THE VAULT Operations Runbook

**Scope:** Safe operation of the current Manus deployment and preparation for a portable Node/MySQL deployment. This runbook does not create an external production environment; it identifies exactly what an operator must supply to do so.

## Day-one operator checklist

| Control | Required state | Evidence |
|---|---|---|
| Repository | GitHub is the canonical implementation record. | `github` remote, protected branch policy, reviewed pull requests. |
| Secrets | No real value committed; private environment configured per environment. | `.env.example` contains placeholders only; secret manager audit. |
| Database | Current managed DB is reachable; target DB export/recovery owner is identified. | `GET /health` plus provider backup evidence. |
| Identity | OAuth provider/app owner and callback URL are documented. | OAuth configuration outside repository. |
| Build | Install, check, test, and build succeed from lockfile. | CI workflow and local command output. |
| Monitoring | Endpoint probe and runtime/database alerts are configured at host. | Host monitor records HTTP 200/503 result. |
| Change control | Migration, rollback, and recovery steps reviewed before production changes. | Change ticket / pull request / migration review. |

## Local development

Use Node.js and pnpm versions compatible with the lockfile declaration. A non-Manus local session still needs a real MySQL-compatible database and valid auth/service replacements or intentionally disabled adapters. Do not point experimentation at the only production database.

```bash
git clone https://github.com/Themeta-verse/The-Vault.git
cd The-Vault
pnpm install --frozen-lockfile
cp docs/SAFE_ENV_TEMPLATE.md /tmp/the-vault-env-template.md
# Copy only the dotenv block into a private .env and replace placeholders.
# Fill .env from a private secret manager; never commit it.
pnpm drizzle-kit migrate
pnpm dev
```

Verify the process separately from the UI:

```bash
curl --fail --silent --show-error http://localhost:3000/health
pnpm check
pnpm test
pnpm build
```

## Build, start, and deployment

The committed scripts build the Vite client and bundle the server into `dist/`; production starts the server with `NODE_ENV=production`. The database must be migrated before accepting writes. The current `lint` command is a deliberately scoped Prettier gate over the CI/configuration and health-control artifacts; historic source-formatting debt prevents a repo-wide formatting gate from passing without a separate non-functional cleanup change. TypeScript validation covers the full TypeScript source tree. [1]

`pnpm install --frozen-lockfile` completes against the committed lockfile. Current pnpm 10 also emits a non-blocking warning that the legacy package-level `pnpm` patch/override metadata is no longer the preferred configuration location. An attempted workspace-metadata migration was rejected by the existing frozen lockfile; do not remove or relocate that metadata until an operator deliberately regenerates and reviews `pnpm-lock.yaml` in a separate dependency-maintenance change.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
NODE_ENV=production pnpm start
```

| Deployment step | Control requirement | Do not do this |
|---|---|---|
| Configure secrets | Set private server values in target secret manager; configure only public `VITE_*` values for client build. | Put tokens or database URLs in source files, CI logs, GitHub variables visible to untrusted forks, or `VITE_*` variables. |
| Migrate | Read generated SQL, take backup, apply ordered migrations once. | Run unreviewed schema changes against the sole production DB. |
| Release | Run CI, deploy immutable build, then request `/health`. | Treat a successful static page load as database readiness. |
| Verify | Check health, protected user flow with a test account, logs, and expected error behavior. | Use production customer data for test mutations without authorization. |
| Rollback | Revert to a known GitHub commit compatible with current schema. | Use a code rollback to undo an already-applied migration without a database plan. |

The managed platform currently auto-publishes after a checkpoint, but GitHub remains the code source of truth. The managed `origin` remote is an artifact/deployment remote, not a portable release origin. [2]

## Health and incident response

`GET /health` is the primary machine-readable readiness endpoint. It reports application readiness and a lightweight database reachability probe without exposing configuration. [3]

| Signal | Meaning | First response | Escalation |
|---|---|---|---|
| HTTP 200, database healthy | Process and DB probe are available. | Continue normal monitoring. | Investigate user reports at tRPC/UI layer if present. |
| HTTP 503, database unavailable | Process is alive but persistent operations are unsafe/unavailable. | Pause deploys and write-heavy maintenance; inspect DB provider status and recent changes. | Provider/DB administrator restores connectivity or a verified backup. |
| No HTTP response | Process, network, routing, or host may be unavailable. | Check host process logs, port binding, DNS/routing, and latest deployment. | Roll back compatible release or invoke host incident procedure. |
| ARIA fallback response | AI provider did not produce usable output. | Confirm app/db health, inspect safe server logs and provider status. | Rotate/replace provider credentials only through secret manager. |
| Storage proxy 5xx | Signed-storage adapter/provider is unavailable. | Verify Forge/S3 configuration and provider status. | Restore object storage adapter/bucket access; do not log signed URLs. |

## Database operations and recovery

The database is a production dependency. The application schema is versioned in Git, but live data is not. Before any destructive schema/data action, obtain a restorable backup, identify the restore owner, and record target schema version.

| Operation | Prerequisite | Procedure | Verification |
|---|---|---|---|
| Additive schema change | Reviewed SQL and backup. | Generate → read SQL → apply migration → deploy compatible code. | Run health, migration ledger check, targeted state flow. |
| Data correction | Export affected rows and write a reversible, reviewed plan. | Prefer application-level repair; if SQL is necessary, scope by IDs and transaction. | Compare before/after counts; retain audit note. |
| Restore | Verified snapshot and acceptable recovery point. | Restore to isolated target first when possible; validate schema/data; switch only with approval. | Health, row-count comparison, owner isolation, sample progression test. |
| Provider migration | Complete DB export, storage export, secret inventory, OAuth plan. | Import to target DB, run migrations, adapt services, validate with test users. | Manus Exit Test matrix in `ARCHITECTURE.md`. |

Current backup control is a material limitation: the repository does not automate managed database or object-store backups. For any August 2026 data-separation impact, the account notice controls scope; task data exports are fixed-time snapshots, not continuous backups. The project owner must use the official backup flow and keep complete, unmodified export packages. [4] [5]

## Secrets and access control

Secrets are controlled values, not code. `.env` and environment-specific variants are ignored by Git; [`SAFE_ENV_TEMPLATE.md`](SAFE_ENV_TEMPLATE.md) is the committed setup reference because this managed project prevents direct creation of `.env.example`. Rotate values after suspected exposure, restrict database and provider credentials to least privilege, and avoid placing privileged data in `VITE_*` variables because Vite exposes those values to browser code at build time. [6]

The current provider controls the managed DB connection, OAuth service, Forge services, and automatic hosting credentials. An external deployment requires the project owner to create a target secret store and explicitly provision replacement credentials. No operator should copy values out of generated configuration files or commit managed project metadata as a substitute for secret management.

## Troubleshooting sequence

1. **Confirm scope.** Identify environment, release commit, user impact, start time, and whether the issue is UI, auth, API, database, AI, or storage.
2. **Check health.** Request `/health`; distinguish process failure from database failure before changing code.
3. **Inspect safe logs.** Review server/runtime logs for timestamps and error class. Redact values before sharing; do not paste headers, cookies, OAuth codes, or connection strings.
4. **Reproduce safely.** Use a non-production account and non-destructive read path when possible.
5. **Choose recovery.** Prefer a narrow code fix or forward migration. Roll code back only if schema compatibility is confirmed.
6. **Record outcome.** Log incident time, change, verification, data impact, backup point, and follow-up control.

## References

[1]: ../package.json "Build, start, check, test, and migration scripts"
[2]: ../.project-config.json "Managed deployment metadata; values intentionally not reproduced"
[3]: ../server/_core/index.ts "Health endpoint and server lifecycle"
[4]: https://manus.im/backup "Manus Data Backup Tool"
[5]: https://help.manus.im/en/articles/16147892-service-change-overview-how-to-back-up-your-data "Official backup guidance"
[6]: ../.gitignore ".env ignore rules"
