# THE VAULT API Control Reference

**API style:** tRPC v11 over `/api/trpc`, with SuperJSON serialization.  
**HTTP operational endpoint:** `GET /health` is intentionally separate from tRPC so it can be reached by unauthenticated load balancers and incident responders. [1] [2]

## Access model

All browser-facing application operations travel through tRPC. Inputs are validated with Zod before reaching business logic. `publicProcedure` does not require a session, `protectedProcedure` requires a resolved session user, and `adminProcedure` requires the authenticated user to have `role = admin`. No procedure accepts a user ID from the client; protected operations derive ownership from `ctx.user.id`. [1] [3]

| Surface | Route | Authentication | Purpose | Data exposure control |
|---|---|---|---|---|
| HTTP health | `GET /health` | None | Readiness/liveness and database reachability. | Returns statuses and timestamp only; no credentials, connection strings, stack traces, or user data. |
| tRPC | `/api/trpc` | Per procedure | Application contract for client state and mutations. | Zod validation, tRPC procedure guards, owner-scoped database helpers. |
| OAuth callback | `GET /api/oauth/callback` | OAuth code/state | Session establishment. | Validates state nonce and emits safe HTTP errors. |
| Object proxy | `GET /manus-storage/*` | Current proxy configuration | Redirect to a provider-signed object URL. | Validates object key and does not reveal Forge credentials. |

## Procedure inventory

The current router exposes fifteen procedures. The table documents the contract at the application boundary; exact TypeScript/Zod definitions remain authoritative. [1] [2]

| Procedure | Guard | Input | Output/persistence effect | Expected failure behavior |
|---|---|---|---|---|
| `auth.me` | Public | None | Current session user or null/undefined; reads context identity. | Does not expose other users. |
| `auth.logout` | Public | None | Clears session cookie; returns `{ success: true }`. | Cookie clear is safe and idempotent. |
| `system.health` | Public | `{ timestamp: number >= 0 }` | Returns `{ ok: true }`; legacy tRPC reachability signal only. | Validation error for invalid timestamp; does not test dependencies. |
| `system.notifyOwner` | Admin | Non-empty title/content | Invokes owner notification adapter; returns delivery boolean. | Non-admin denied; adapter failure is represented without secret disclosure. |
| `vault.state` | Protected | None | Assembles rooms, authored catalog, user state, discoveries, history, notes, creations, fragments, settings, and active relationships. May run legacy consistency repair. | Session required; database unavailability returns safe domain error. |
| `vault.enterRoom` | Protected | `roomId` enum | Marks room visited, updates last room, appends history/action; returns success. | Sealed/unknown room returns a domain error; session required. |
| `vault.discover` | Protected | `objectId` enum | Applies prerequisite checks; persists discovery, progression, fragment, room unlock/history/action when applicable. | Invalid object or progression returns domain error; critical grouped write rolls back on database failure. |
| `vault.observe` | Protected | `objectId` enum | Advances an owned object state to observed and records action. | Invalid object or missing session rejected. |
| `vault.understand` | Protected | Understandable `objectId` enum | Advances progression; may unlock Needle; appends history/action. | Requires prior discovery and, for the Sigil, ARIA evidence. |
| `vault.saveNote` | Protected | Trimmed title 1–120 and content 1–8000 chars | Inserts user note, history, and action; returns note ID. | Permission check can return `FORBIDDEN`; validation errors rejected before persistence. |
| `vault.materialize` | Protected | Positive integer `noteId` | Creates/updates user creation, may master Needle, appends history/action. | Rejects notes not owned by caller or disabled permission. |
| `vault.settings` | Protected | Optional bounded accessibility/media/era fields | Updates owner settings and action history; returns success. | Zod rejects invalid ranges/enums; session required. |
| `vault.advanceHandsetGuide` | Protected | `advance` or `dismiss` | Advances/dismisses owner handset guide and records action. | State is idempotent when complete/dismissed; session required. |
| `aria.messages` | Protected | None | Returns current user’s conversation history in chronological UI order. | Session required; no cross-user records. |
| `aria.send` | Protected | Valid room enum and trimmed message 1–1200 chars | Stores user message, invokes ARIA adapter, stores bounded ARIA response/action, returns reply. | Permission failure is `FORBIDDEN`; AI failure produces a safe fallback response and retains no provider internals. |

## HTTP health contract

`GET /health` returns a compact JSON response and uses an application-level database probe. It does not authenticate, does not initialize a user blueprint, and does not call AI, storage, analytics, OAuth, or notification providers. A healthy response uses HTTP `200`; an unavailable database uses HTTP `503` so an upstream health checker can distinguish an application process from a ready service.

```json
{
  "application": "healthy",
  "database": "healthy",
  "requiredServices": "not_configured",
  "timestamp": "2026-08-20T00:00:00.000Z"
}
```

| Condition | HTTP status | `application` | `database` | Operator interpretation |
|---|---:|---|---|---|
| Process and database probe succeed | 200 | `healthy` | `healthy` | Service is ready for database-backed API traffic. |
| Process responds but DB handle/query fails | 503 | `healthy` | `unavailable` | Runtime is alive but persistent operations should be considered unavailable. |

`requiredServices` is currently `not_configured` because no external provider has been formally designated as a universal readiness dependency, and probing Manus OAuth/Forge services from every health request would add an unauthenticated provider dependency and can create misleading cascade failures. AI, storage, and owner notification therefore continue to use their own bounded error paths. Any future service promoted to a mandatory runtime dependency must add a safe, timeout-bounded probe and update this contract. [1] [4] [5]

## Error and data-handling rules

The API must return user-safe messages and appropriate tRPC error codes, never raw database URLs, OAuth codes, Bearer tokens, stack traces, signed object URLs, or provider response bodies. Input validation occurs at the router boundary. Database helpers should use transactions for critical grouped writes and let failures surface as one failed operation rather than a success response with partial state. Provider-specific errors in ARIA and storage are bounded to safe fallback/5xx responses. [1] [4] [5]

## Change-control requirements

Any new procedure requires a documented guard, Zod schema, ownership model, data effects, error behavior, Vitest coverage, and this inventory update. A new public procedure requires explicit review because it expands the unauthenticated attack surface. A new external API needs an ownership entry in `ARCHITECTURE.md`, safe environment variables in `.env.example`, and operational verification instructions. [1] [6]

## References

[1]: ../server/routers.ts "Application tRPC router"
[2]: ../server/_core/systemRouter.ts "System tRPC router"
[3]: ../server/_core/trpc.ts "tRPC guards and context conventions"
[4]: ../server/_core/index.ts "Express HTTP entry point and health route"
[5]: ../server/_core/storageProxy.ts "Signed storage redirect proxy"
[6]: ../server/vault.router.test.ts "Router authorization and behavior regression tests"
