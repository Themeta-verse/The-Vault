# THE VAULT

> **THE VAULT is a persistent spatial web application in which the environment is the interface.** Users move through an architectural digital world, discover artefacts, converse with ARIA, preserve experiments, and watch their history become a navigable constellation.

## Concept

THE VAULT is not organized as a dashboard or a set of content pages. The Vault’s central chamber is the navigational hub. **THE ARCHIVE**, **THE LAB**, and **THE OBSERVATORY** are distinct places reached through world thresholds. Objects carry interaction, visual state, relationship, and consequence; contextual UI appears only when an object has been approached.

The current presentation system is the **Cartographic Reliquary**: an inherited instrument of memory rendered through mineral-dark architecture, cadastral lines, engraved labels, a recurring datum mark, and deliberately restrained signal light. The Memory Dais is the chamber’s spatial anchor; its retained routes and mnemonic field make a prior visit visible without reintroducing page navigation, dashboard cards, or a generic chat surface.

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

The database models rooms, objects, artefacts, discoveries, **owner-scoped artifact-fragment collection records**, user object states, relationships, notes, creations, history, settings, permissions, actions, and ARIA conversations. Progression follows a persisted lifecycle from `observed` to `interacted`, `discovered`, `understood`, `unlocked`, and `mastered`.

The original compound discovery path now expands without replacing its existing Prism-to-Needle sequence. The **Memory Prism** reveals the **Palimpsest Lens** in THE ARCHIVE; the Lens deepens the Echo Sigil’s interpretive route in THE LAB. In parallel, the **Resonance Needle** reveals the **Quiet Cistern**, whose interpretation exposes the **Astral Index** in THE OBSERVATORY. These authored objects carry their own artefacts and persisted relationship records, and are rendered once in their native rooms with the same owner-scoped progression contract as the original chain.

Spatial audio is optional and begins only after an explicit interaction. The access deck stores a per-user audio preference plus independent integer percentage controls for ambient tone and interaction cues. The browser-only Web Audio layer is gesture-gated, uses room-specific ambient tones and stereo interaction cues, honours the persisted mute state, and quietly does nothing when audio is unavailable. It uses no downloaded audio assets and does not make sound a requirement for discovery, navigation, or the semantic fallback.

On a first authenticated handset visit, a compact **field strip** offers three persisted, dismissible waypoints: attend the Memory Prism, retain its signal, then trace the Observatory route. The guide never advances discovery on the visitor’s behalf; it only names the next existing action and shares its state with the non-3D route layer. THE OBSERVATORY now has a persisted two-position **Chronicle Dial**. *The First Register* makes the foundational route legible, while *The Returning Register* becomes selectable after two retained discoveries and maps carried, made, and returning memory without converting the room into a timeline dashboard.

Every artifact now contains an authored folio heading, era tag, and marginal extract. A fragment becomes a durable owner-scoped collection record when its artifact is discovered, adds a Vault-history event, survives refresh, and is returned in the same protected world-state response used by THE ARCHIVE, THE OBSERVATORY, and ARIA. The six shipped fragments are authored application data rather than transient client copy.

## Accessibility and responsive behavior

The primary interaction is spatial. Accessibility is not replaced with a hidden dashboard: the access deck exposes semantic destination controls and environmental preferences, while the non-3D fallback retains the same rooms and actions. The implementation supports keyboard focus, Escape dismissal, touch vectors, reduced motion, high contrast, adaptive rendering, and a fixed mobile viewport with contextual bottom controls.

## Security model

All stateful Vault operations use protected tRPC procedures. The server scopes reads and mutations to the authenticated user, validates known object identifiers, and preserves progression transitions in persistence. ARIA receives bounded world context, treats all user content as untrusted data, and returns only schema-validated suggested actions. The client can request room changes, but the server is the authority for user state, unlocks, discoveries, notes, and creations. See [SECURITY_FINAL_AUDIT.md](SECURITY_FINAL_AUDIT.md) for the release assessment.

## Testing and validation

The suite includes server authentication and Vault-router coverage, a non-destructive clean-state journey, progression and relationship assertions, malformed-input and ARIA-fallback cases, pure wayfinding tests, world-state helper tests, bounded client failure-copy contracts, protected contracts for authored branch objects, audio preferences, handset-guide/Chronicle-Dial derivation, owner-scoped fragment collection, and legacy discovery-state reconciliation. The current expansion verifies **39 assertions across six test files**, TypeScript, and production build output. Browser audio remains intentionally excluded from headless sound-output assertions because its explicit user-gesture requirement is part of the feature contract. Run the following before a release:

```bash
pnpm test
pnpm check
pnpm build
```

Visual validation should also inspect the entry sequence, desktop viewport, mobile viewport, reduced-motion mode, high-contrast mode, and non-3D fallback. The release evidence is collected in [MASTERY_AUDIT.md](MASTERY_AUDIT.md) and [RECONSTRUCTION_AUDIT.md](RECONSTRUCTION_AUDIT.md). The current pass captured the public threshold at 1440, 1366, 1024, 932×430, 430, 390, and 375 targets and inspected the authenticated rendered world on desktop; a fresh authenticated narrow-screen room capture remains a candid follow-up recommendation.

## Deployment

THE VAULT is configured for managed Manus hosting. Saving a verified checkpoint publishes the current project version automatically. The project also maintains a dedicated GitHub remote at [`Themeta-verse/The-Vault`](https://github.com/Themeta-verse/The-Vault); each release checkpoint is synchronized after verification.

## Limitations and roadmap

The current renderer is intentionally bounded: it uses procedural geometry and controlled effects instead of heavy downloaded assets, preserving a predictable performance envelope. The principal remaining performance trade-off is the lazy-loaded 3D code chunk, which is intentionally accepted to retain the spatial world without splitting interaction contracts across multiple views. The shipped spatial audio is deliberately synthetic, optional, and browser-gated; richer authored sound design remains a future enhancement. Future work can add more artefact geometry, room-specific camera tours, a broader relationship graph, and authored world events without replacing the existing persistence contract.

## Repository hygiene

The repository excludes local environment files and platform/runtime noise. Avoid committing generated media, credentials, logs, or database dumps. Keep static media outside the project and upload it through the managed static-asset workflow before referencing it in client code.
