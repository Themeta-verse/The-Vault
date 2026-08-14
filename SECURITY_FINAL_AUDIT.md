# THE VAULT — Final Security and Resilience Audit

**Scope:** Release-candidate review of the protected Vault router, owner-scoped persistence helpers, ARIA action boundary, input contracts, and operational secret handling.

## Trust boundaries

| Boundary | Shipped control | Review result |
|---|---|---|
| Browser to application API | Stateful Vault and ARIA operations use `protectedProcedure`; only session lookup and logout are public. | Pass |
| Room and object identity | Zod enums accept only declared room and object identifiers before mutations. | Pass |
| User-owned state | Settings, room state, discoveries, notes, creations, history, conversations, and permissions query and mutate by the authenticated `userId`. | Pass |
| Lab materialization | Source note is fetched by both `noteId` and authenticated `userId`; a foreign note cannot become an artifact. | Pass |
| Progression | Object ranks and prerequisites are enforced server-side, including the Echo Sigil, completed room circuit, ARIA interpretation, and Needle sequence. | Pass |
| ARIA provider | ARIA receives bounded, user-scoped context, treats all content as untrusted, uses strict JSON-schema output, and validates suggested actions against a reversible allow-list. | Pass |
| ARIA action execution | The model cannot invoke tools or mutate state directly. Client-side action suggestions call the same protected navigation routes and require `aria_navigation` permission. | Pass |
| User-controlled text | Notes are trimmed and length-bounded to 120/8,000 characters; ARIA messages are trimmed and bounded to 1,200 characters. React renders displayed user content safely by default. | Pass |
| Secret handling | Database, OAuth, JWT, and server Forge values remain server-side environment configuration; no source review finding embeds a token or database credential. | Pass |

## Prompt-injection review

ARIA’s system context explicitly identifies user messages, notes, and artifact descriptions as **untrusted data**. It prohibits overriding behavior, revealing secrets, accessing unrelated systems, destructive requests, and claiming actions have occurred. The provider response is constrained to a strict schema with five action values, then the selected action is parsed again server-side and permission-gated. Provider failure records a safe conversation fallback without exposing provider error details to the visitor.

## Failure behavior

The protected routes return user-facing errors for sealed rooms, invalid object IDs, unauthorized notes, missing or foreign experiment notes, unavailable persistence, and unavailable ARIA. The client keeps the spatial experience responsive through contextual notices and a non-3D fallback. The Vitest suite contains direct regressions for invalid protected inputs and ARIA-provider failure fallback.

## Residual considerations

The current architecture is appropriate for its bounded single-world scope. Future expansion should preserve enum/action allow-lists, add rate limiting for ARIA and note mutations, and implement a content-moderation policy if user-created material is ever shared between accounts. Those items are not required by the current owner-scoped experience and are not presented as shipped behavior.
