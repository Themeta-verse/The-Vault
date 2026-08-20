# THE VAULT Database Control Reference

**Dialect:** Drizzle ORM with the MySQL dialect.  
**Current provider posture:** `DATABASE_URL` is injected by the current managed deployment; the project has no demonstrated self-service production database console, export routine, backup schedule, staging database, or retention policy under repository control. [1] [2]

## Control posture

The schema contains sixteen tables. Four hold authored global catalog data, while twelve hold user-owned state, history, content, or authorization data. The schema declares primary keys and several unique indexes but no database foreign-key constraints or database row-level security. Application code is responsible for preserving referential meaning and filtering all user data by `userId`. This is an explicit security and operational boundary, not an assumption. [1] [3]

| Data class | Tables | Ownership rule | Primary control |
|---|---|---|---|
| Identity | `users` | One row per external `openId`. | OAuth callback upsert; only server assigns role. |
| Global authored catalog | `rooms`, `vaultObjects`, `artifacts`, `objectRelationships` | Shared, not user-owned. | Idempotent blueprint upsert from repository code. |
| Per-user world state | `userRoomStates`, `discoveries`, `userArtifactFragments`, `userObjectStates`, `vaultSettings`, `vaultPermissions` | Scoped to the authenticated `users.id`. | Composite/unique constraints plus helper-layer predicates. |
| Per-user history/content | `vaultHistory`, `experimentNotes`, `userCreations`, `aiConversations`, `userActions` | Scoped to the authenticated `users.id`. | All helpers must query/write with user ownership predicates. |

## Table inventory

| Table | Purpose and owner | Key columns and constraints | Data sensitivity and recovery priority |
|---|---|---|---|
| `users` | External identity record. | `id` PK; `openId` unique/non-null; enum `role`; timestamps. | High: identity/authorization mapping. |
| `rooms` | Shared authored room catalog. | String `id` PK; title, description, visual tone, order. | Medium: reproducible from blueprint. |
| `vaultObjects` | Shared authored spatial-object catalog. | String `id` PK; room ID, enum type, interaction/accessibility fields. | Medium: reproducible from blueprint. |
| `artifacts` | Shared artifact and micro-fragment catalog. | String `id` PK; unique `objectId`; display and fragment fields. | Medium: reproducible from blueprint. |
| `userRoomStates` | Per-user room unlock/visit state. | Numeric PK; unique (`userId`, `roomId`); unlock and visit timestamps. | High: user progression. |
| `discoveries` | Per-user durable object discovery evidence. | Numeric PK; unique (`userId`, `objectId`); optional artifact ID; timestamp. | High: progression invariant. |
| `userArtifactFragments` | Per-user retained artifact fragments. | Numeric PK; unique (`userId`, `artifactId`). | High: collection/history state. |
| `userObjectStates` | Per-user object progression state. | Numeric PK; unique (`userId`, `objectId`); enum state and milestone timestamps. | High: progression invariant. |
| `objectRelationships` | Shared authored object relation graph. | String PK; unique source/target/type tuple; enum relationship and required state. | Medium: reproducible from blueprint. |
| `vaultHistory` | Per-user immutable-style event history. | Numeric PK; user ID, enum event type, title/detail/target/timestamp. | High: audit/history value. |
| `experimentNotes` | Per-user Lab notes. | Numeric PK; user ID, title/content, created/updated timestamps. | High: user-authored content. |
| `userCreations` | Per-user materialized Lab creations. | Numeric PK; unique (`userId`, `sourceNoteId`); title/description/status. | High: user-authored derivative content. |
| `aiConversations` | Per-user ARIA conversation record. | Numeric PK; user ID, room, role, content, action payload, timestamp. | Medium/High: user conversation content. |
| `userActions` | Per-user action audit trail. | Numeric PK; user ID, action/source/target/payload/timestamp. | Medium: operational trace, not authorization source. |
| `vaultSettings` | Per-user interaction/accessibility state. | Numeric PK; unique `userId`; media/accessibility/handset/room settings. | Medium: recoverable preferences. |
| `vaultPermissions` | Per-user feature permission flags. | Numeric PK; unique (`userId`, `permission`); allowed flag. | High: authorization-adjacent control. |

## Integrity rules and current enforcement

| Invariant | Enforcement now | Residual risk | Operator response |
|---|---|---|---|
| A user may have one room state per room. | Unique `user_room_unique`. | No FK to `users`/`rooms`; manual DB writes can orphan data. | Restrict direct SQL; audit before manual repair. |
| A user may discover an object once. | Unique `user_object_discovery_unique`; discovery helper is idempotent. | Concurrent requests require transaction and duplicate-safe checks. | Use the application route; inspect history before repair. |
| Discovery implies object state at least `discovered`. | Transactional critical write plus backward-compatible normalization repair when state is assembled. | Legacy rows may still need the repair path. | Preserve original record, verify state/history, document correction. |
| A user may retain an artifact fragment once. | Unique `user_artifact_fragment_unique`. | No FK to artifact; imported data needs validation. | Verify artifact IDs against authored catalog after import. |
| User creations derive from one source note once. | Unique `user_creation_source_note_unique`. | No FK to source note. | Import notes before creations; verify row counts. |
| Ownership isolation. | Every application helper uses `userId` predicates; protected tRPC derives ID from session. | Database provides no RLS/FK enforcement. | Require code review and regression tests for all new queries. |

## Critical-write transaction control

`discoverVaultObject` is the highest-value multi-write sequence. It now runs object-state progression, discovery insertion, artifact-fragment retention, history events, and room unlock updates through one Drizzle transaction handle. A successful response therefore requires the grouped state change to commit; a failed transaction rolls the grouped writes back. Blueprint reconciliation happens before that transaction and remains independently idempotent.

`server/discovery.transaction.test.ts` is a focused source-level regression guard. It fails if a discovery, fragment, history, room, or object-state write escapes that transaction boundary. Failure-injection integration coverage against a disposable MySQL database remains an honest follow-up: the current managed environment cannot be used for destructive transaction-failure tests.

## Migration and schema-change procedure

Committed migration files `0000` through `0006` and Drizzle metadata are the database change record. The configuration reads `DATABASE_URL`, uses `drizzle/schema.ts`, writes migration artifacts under `drizzle/`, and targets the MySQL dialect. [2]

| Step | Required control | Command or evidence |
|---|---|---|
| 1. Model change | Modify only `drizzle/schema.ts`; retain a migration record. | Code review of schema diff. |
| 2. Generate | Generate a new SQL migration and read it before use. | `pnpm drizzle-kit generate` |
| 3. Backup | Obtain a verified target-database export/snapshot before destructive changes. | Provider-native backup/export evidence. |
| 4. Apply | Apply all ordered migrations in a controlled environment. | `pnpm drizzle-kit migrate` |
| 5. Verify | Compare schema, migration ledger, row counts, and core progression flow. | Health endpoint, tests, targeted SQL read-only checks. |
| 6. Roll forward | Correct production mistakes with a new additive migration. | Do not edit applied migrations or assume down migrations exist. |

The existing `db:push` script combines migration generation and application. It is suitable only when an operator intentionally wants to generate a new migration from the current schema; routine deployment should normally run the already reviewed `pnpm drizzle-kit migrate` command instead. [4]

## Backup, recovery, and portability

No repository-controlled automatic backup job exists. The current provider controls the database connection, backup implementation, retention, and restoration interface. A GitHub clone and the Drizzle migrations recreate **schema and authored blueprint**, not user data, conversations, notes, settings, or history.

| Scenario | What is recoverable from GitHub alone | What requires an external export/backup | Who must act | Exact next action |
|---|---|---|---|---|
| Fresh empty environment | Schema and authored blueprint after migrations and first authenticated state request. | All live users and per-user state. | Maintainer/DB admin. | Provision DB, migrate, then import validated data dump. |
| Application rollback | Previous code and migration history. | Compatible database state. | Maintainer and DB admin. | Roll code back only after checking schema compatibility; prefer roll-forward data fixes. |
| Provider database outage | None while the provider DB is unavailable. | Latest provider snapshot/export. | Provider/project owner. | Follow provider restore procedure, then verify `GET /health` and row counts. |
| External migration | Code and migration definitions. | Database export, user mapping, object storage export, secrets. | Project owner and target operators. | Export/import data, replace adapters, run ownership-isolation tests. |

If the project is affected by the August 2026 Manus data-separation process, the account’s in-product notice and email determine eligibility and scope. A task backup is a point-in-time snapshot; it is not a continuous database backup. Website task data backups include code, files, database contents, secrets, and integration settings, but later writes are excluded until a fresh export is taken. [5] [6]

## References

[1]: ../drizzle/schema.ts "Complete Drizzle schema"
[2]: ../drizzle.config.ts "Drizzle migration configuration"
[3]: ../server/db.ts "Owner-scoped database helpers"
[4]: ../package.json "Project scripts"
[5]: https://manus.im/backup "Manus Data Backup Tool"
[6]: https://help.manus.im/en/articles/16147892-service-change-overview-how-to-back-up-your-data "Official backup guidance"
