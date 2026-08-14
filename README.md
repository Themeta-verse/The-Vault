# THE VAULT

> **THE VAULT is a persistent spatial web application in which the environment is the interface.** Users move through an architectural digital world, discover artefacts, converse with ARIA, preserve experiments, and watch their history become a navigable constellation.

## Concept

THE VAULT is not organized as a dashboard or a set of content pages. The Vault’s central chamber is the navigational hub. **THE ARCHIVE**, **THE LAB**, and **THE OBSERVATORY** are distinct places reached through world thresholds. Objects carry interaction, visual state, relationship, and consequence; contextual UI appears only when an object has been approached.

| Place | Purpose | Primary persistent interactions |
|---|---|---|
| **The Vault’s central chamber** | Spatial hub and progression surface | Threshold travel, Memory Prism, Echo Sigil, Resonance Needle, ARIA, wayfinding. |
| **THE ARCHIVE** | Artefact collection environment | In-world catalogue search, compact containment records, relationship clues. |
| **THE LAB** | Experiment and intelligence environment | ARIA conversations, note preservation, materialization, Sigil interpretation. |
| **THE OBSERVATORY** | Personal history and relationship environment | Discovery constellation and relationship landmarks. |

## Architecture

The client is a React application with React Three Fiber as the primary renderer. The application controller keeps authenticated state, room transitions, scene actions, accessibility preferences, and compact contexts coordinated. The server exposes protected tRPC procedures backed by Drizzle and a MySQL-compatible database. ARIA is executed server-side with bounded context and schema-validated suggested actions.

```text
React application viewport
├── Fixed React Three Fiber world renderer
│   ├── Central chamber / Archive / Lab / Observatory scenes
│   ├── Spatial objects, thresholds, passages, ARIA vessel
│   └── Progression-aware lighting and wayfinding
├── Contextual object layer
│   ├── Artefact containment record
│   ├── Archive catalogue terminal
│   └── Lab-contained ARIA and experiment instruments
├── Accessibility and preference layer
│   ├── Keyboard access deck
│   ├── Reduced-motion / contrast / non-3D options
│   └── Semantic fallback chamber
└── Protected tRPC API
    ├── Vault state, room entry, discoveries, notes, materialization
    ├── Progression relationships and settings
    └── Server-side ARIA conversations and actions
```

## Stack

| Area | Technology |
|---|---|
| Client | React 19, TypeScript, Tailwind CSS 4, Lucide |
| Spatial renderer | Three.js, React Three Fiber, Drei |
| Server/API | Express 4, tRPC 11 |
| Persistence | Drizzle ORM and MySQL/TiDB-compatible database |
| Authentication | Manus OAuth and protected tRPC procedures |
| Testing | Vitest |
| Build tooling | Vite, pnpm |

## Local setup

Install Node.js 22 or newer and pnpm. Provide local values through the platform secret manager or a local environment file, then install and run the application.

```bash
pnpm install
pnpm dev
```

Do not commit `.env`. The managed deployment supplies most Manus-specific values automatically. For local development, obtain the OAuth, database, and Forge values from the project owner or configured platform environment.

### Environment variables

| Variable | Purpose | Exposure |
|---|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string | Server only |
| `JWT_SECRET` | Session-cookie signing secret | Server only |
| `VITE_APP_ID`, `OAUTH_SERVER_URL` | Manus OAuth application configuration | App ID may be public; server URL is configuration |
| `OWNER_OPEN_ID`, `OWNER_NAME` | Owner-scoped application context | Server only |
| `BUILT_IN_FORGE_API_KEY` | Server-side Forge access, including ARIA | **Server only** |
| `VITE_FRONTEND_FORGE_API_KEY` | Browser-scoped Forge access supplied by the platform | Browser configuration |
| `VITE_ANALYTICS_*` | Optional analytics configuration | Browser configuration |

Never place a production token, database password, or signing key in source control, client code, screenshots, or browser logs. The managed deployment injects its configured values directly; use the platform secret manager rather than committing environment files.

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Starts the development server. |
| `pnpm check` | Runs TypeScript validation without emitting files. |
| `pnpm test` | Runs the Vitest suite. |
| `pnpm build` | Produces a production build. |
| `pnpm drizzle-kit generate` | Generates a migration after schema changes; review generated SQL before applying it. |

## Data and progression

The database models rooms, objects, artefacts, discoveries, user object states, relationships, notes, creations, history, settings, permissions, actions, and ARIA conversations. Progression follows a persisted lifecycle from `observed` to `interacted`, `discovered`, `understood`, `unlocked`, and `mastered`.

The compound discovery path connects the Memory Prism, Echo Sigil, ARIA interpretation, Resonance Needle, and a materialized Lab result. The renderer observes this data and changes paths, context, light, wayfinding, Archive records, Lab creations, and Observatory landmarks without treating client-side visual state as authorization. Returning users re-enter their persisted room directly rather than passing through an intermediate page-style gate.

## Accessibility and responsive behavior

The primary interaction is spatial. Accessibility is not replaced with a hidden dashboard: the access deck exposes semantic destination controls and environmental preferences, while the non-3D fallback retains the same rooms and actions. The implementation supports keyboard focus, Escape dismissal, touch vectors, reduced motion, high contrast, adaptive rendering, and a fixed mobile viewport with contextual bottom controls.

## Security model

All stateful Vault operations use protected tRPC procedures. The server scopes reads and mutations to the authenticated user, validates known object identifiers, and preserves progression transitions in persistence. ARIA receives bounded world context, treats all user content as untrusted data, and returns only schema-validated suggested actions. The client can request room changes, but the server is the authority for user state, unlocks, discoveries, notes, and creations. See [SECURITY_FINAL_AUDIT.md](SECURITY_FINAL_AUDIT.md) for the release assessment.

## Testing and validation

The suite includes server authentication and Vault-router coverage, a non-destructive clean-state journey, progression and relationship assertions, malformed-input and ARIA-fallback cases, pure wayfinding tests, world-state helper tests, and bounded client failure-copy contracts. The mastery pass verified **28 assertions** across five test files, TypeScript, production build output, authenticated desktop room flows, persisted return state, non-3D restoration, and the access-deck focus boundary. Run the following before a release:

```bash
pnpm test
pnpm check
pnpm build
```

Visual validation should also inspect the entry sequence, desktop viewport, mobile viewport, reduced-motion mode, high-contrast mode, and non-3D fallback. The release evidence is collected in [MASTERY_AUDIT.md](MASTERY_AUDIT.md) and [RECONSTRUCTION_AUDIT.md](RECONSTRUCTION_AUDIT.md). Concrete authenticated tablet/mobile room captures remain a recommended follow-up; the documented automated captures cover the protected entry shell at four viewport sizes.

## Deployment

THE VAULT is configured for managed Manus hosting. Saving a verified checkpoint publishes the current project version automatically. The project also maintains a dedicated GitHub remote at [`Themeta-verse/The-Vault`](https://github.com/Themeta-verse/The-Vault); each release checkpoint is synchronized after verification.

## Limitations and roadmap

The current renderer is intentionally bounded: it uses procedural geometry and controlled effects instead of heavy downloaded assets, preserving a predictable performance envelope. The principal remaining performance trade-off is the lazy-loaded 3D code chunk, which is intentionally accepted to retain the spatial world without splitting interaction contracts across multiple views. Future work can add richer navigation controls, more artefact geometry, sound design, room-specific camera tours, a broader relationship graph, and authored world events without replacing the existing persistence contract.

## Repository hygiene

The repository excludes local environment files and platform/runtime noise. Avoid committing generated media, credentials, logs, or database dumps. Keep static media outside the project and upload it through the managed static-asset workflow before referencing it in client code.
