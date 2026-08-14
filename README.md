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

Install Node.js 22 or newer and pnpm. Copy the safe template, provide values through the platform secret manager or local environment, then install and run the application.

```bash
cp .env.example .env
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

The names and non-secret placeholders are maintained in [`.env.example`](.env.example). Never place a production token, database password, or signing key in source control, client code, screenshots, or browser logs.

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

The compound discovery path connects the Memory Prism, Echo Sigil, ARIA interpretation, Resonance Needle, and a materialized Lab result. The renderer observes this data and changes paths, context, light, and wayfinding without treating client-side visual state as authorization.

## Accessibility and responsive behavior

The primary interaction is spatial. Accessibility is not replaced with a hidden dashboard: the access deck exposes semantic destination controls and environmental preferences, while the non-3D fallback retains the same rooms and actions. The implementation supports keyboard focus, Escape dismissal, touch vectors, reduced motion, high contrast, adaptive rendering, and a fixed mobile viewport with contextual bottom controls.

## Security model

All stateful Vault operations use protected tRPC procedures. The server scopes reads and mutations to the authenticated user, validates known object identifiers, and preserves progression transitions in persistence. ARIA receives bounded world context and returns only schema-validated suggested actions. The client can request room changes, but the server is the authority for user state, unlocks, discoveries, notes, and creations.

## Testing and validation

The suite includes server authentication and Vault-router coverage, progression and relationship assertions, pure wayfinding tests, and world-state helper tests. Run the following before a release:

```bash
pnpm test
pnpm check
pnpm build
```

Visual validation should also inspect the entry sequence, desktop viewport, mobile viewport, reduced-motion mode, high-contrast mode, and non-3D fallback. A fully authenticated walkthrough is required to verify persisted artefact inspection, ARIA, creation, and Observatory records in a live session.

## Deployment

THE VAULT is configured for managed Manus hosting. Saving a verified checkpoint publishes the current project version automatically. The project also maintains a dedicated GitHub remote at [`Themeta-verse/The-Vault`](https://github.com/Themeta-verse/The-Vault); synchronization requires authenticated write access to that repository.

## Limitations and roadmap

The current renderer is intentionally bounded: it uses procedural geometry and controlled effects instead of heavy downloaded assets, preserving a predictable performance envelope. The visual design continues to require authenticated device walkthroughs for touch and persisted fallback evidence. Future work can add richer navigation controls, more artefact geometry, sound design, room-specific camera tours, a broader relationship graph, and authored world events without replacing the existing persistence contract.

## Repository hygiene

The repository excludes local environment files and platform/runtime noise. Avoid committing generated media, credentials, logs, or database dumps. Keep static media outside the project and upload it through the managed static-asset workflow before referencing it in client code.
