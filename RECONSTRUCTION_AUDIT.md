# THE VAULT Reconstruction Audit

## Purpose

This audit records the shift from a **website with a decorative scene** to a **world-first application**. It is intentionally specific about the patterns that were removed, the spatial replacements now in the codebase, and the evidence still requiring an authenticated walkthrough.

## Conventional-pattern audit

| Earlier pattern | Why it weakened the world | Reconstruction outcome |
|---|---|---|
| Permanent top navigation and room labels | It framed destinations as pages in a conventional app shell. | A minimal, contextual room signal and access control replace permanent navigation. The access deck remains available only as an accessibility and settings instrument. |
| Archive card grid, search field, and inspection pane | It presented artefacts as a content-management surface rather than objects in a location. | The Archive now renders shelves, physical artefact vessels, an in-world catalogue terminal, and a compact containment record only after an object is selected. |
| Page-scale destination headings and return buttons | They interrupted the sense of travel and made every room feel like a route. | Every room uses a physical passage home, activated inside the scene. Room identity is expressed through materials, architecture, light, and objects. |
| Floating ARIA chat widget | It made the intelligence feel attached to the page rather than resident in the Vault. | ARIA exists as an in-world vessel. In the Lab, a containment cradle opens a compact interface only after the entity is approached. |
| Observatory activity panel | It reduced history to a text list. | The Observatory renders retained objects as a living constellation with a small relationship record. |
| Scroll-stacked layouts and generic overlays | They allowed browser-page behavior to leak into the world. | The authenticated experience uses a fixed `100svh` application viewport with an explicit scene, HUD, context, and access-layer hierarchy. |

## Spatial system now implemented

The central chamber includes foreground thresholds, a ritual floor ring, side pillars, an elevated rear ascent, far architectural framing, lighting that reflects progression, and a persistent wayfinding vector. The room renderer now switches to complete environments rather than keeping the chamber under a page overlay.

### Source evidence

`VaultScene.tsx` now contains a `ChamberArchitecture` composed from the stone floor, enclosing roof slab, near and far pillars, a central ritual ring, a stepped rear ascent, and a progression-tinted point light. The chamber composes physical Archive, Lab, and Observatory thresholds, the Memory Prism, conditional Echo Sigil and Resonance Needle, ARIA’s vessel, and the progression-aware wayfinding beacon.

The same renderer uses `ArchiveRoom`, `LaboratoryRoom`, and `ObservatoryRoom` rather than destination-page components. The Archive composes shelving bays, lit artefact vessels, a catalogue mechanism, and a physical passage home. The Lab composes an instrument bench, experiment surfaces, a containment cradle, ARIA’s stateful vessel, and a passage home. The Observatory composes a raised projection dais, retained-signal points, a constellation label, and a passage home. `WorldContext.tsx` supplies compact object context only after spatial activation; it does not define any destination-page shell.

| Location | Architectural anchor | World-native function |
|---|---|---|
| The Vault’s central chamber | Thresholds, ritual floor, pillars, raised Observatory ascent | Discovery progression, destination travel, ARIA encounter, and wayfinding. |
| THE ARCHIVE | Shelving bays, artefact vessels, catalogue terminal, physical return passage | Recorded artefact inspection and catalogue search. |
| THE LAB | Experiment bench, instruments, containment cradle, ARIA vessel | ARIA conversation, note preservation, materialization, and Echo interpretation. |
| THE OBSERVATORY | Raised projection dais, constellation nodes, physical return passage | Discovery and relationship visualization. |

## Interface hierarchy

The renderer occupies the base layer. Scene labels are attached to spatial objects and cannot intercept controls. The entry sequence, only before crossing the threshold, is above the renderer. Compact contextual layers appear only after a physical interaction. Notifications and the access deck take precedence only while active. The system avoids a scroll stack; fallback mode is the sole intentionally scrollable mode because it provides an accessible semantic alternative to the scene.

## State and security preserved

The reconstruction leaves the protected tRPC router, user-scoped persistence, server-side ARIA handling, progression lifecycle, discovery graph, mutations, migrations, and existing test suite intact. Client-side room rendering never grants access: destination entry still calls protected state and mutation procedures, and the central controller refuses room changes without a persisted unlock.

## Validation boundary

TypeScript validation completed after the spatial rebuild. Automated tests cover the protected server flows, wayfinding, and the new pure world-state helper. A non-authenticated review can confirm the entry and loading surfaces, but the persisted room walkthrough, touch interaction, and non-3D preference still require a secure authenticated session. This is documented as a validation limitation rather than represented as completed visual proof.

The desktop and mobile review sessions both showed the protected entry’s loading signal without browser-console errors. The server logs confirm that the review session lacks an authenticated session cookie. The authenticated destination world therefore remains unavailable to the unauthenticated review account; this is an authorization boundary, not a substitute for a persisted-world walkthrough.

## Authenticated walkthrough evidence

The connected owner browser resolved the protected state successfully and presented the in-world entry sequence, including the persisted return-state action. This confirms that the authenticated handoff reaches the world controller. The subsequent room checks are performed only within that owner-authenticated session.

The owner-authenticated chamber renders as a fixed full-screen world without browser-page scrolling. It exposes the physical Archive, Lab, and Observatory thresholds, central Memory Prism, ARIA vessel, wayfinding beacon, and compact access deck. The browser automation’s annotated DOM does not expose individual WebGL meshes as discrete click targets, so the remaining room checks use the accessible route deck alongside positional canvas verification.

The access deck opens as a compact right-side contextual layer over the chamber and lists the central chamber, THE ARCHIVE, THE LAB, and THE OBSERVATORY alongside reduced-motion, contrast, non-3D, and rendering-quality controls. The visual deck controls are present, but the browser automation currently reports its route items as nested non-indexed DOM, preventing direct synthetic coordinate activation; keyboard traversal is used for the remaining accessibility checks.

Keyboard traversal exposes all room routes as discrete buttons. Activating THE ARCHIVE transitions the camera into an Archive room composed from shelving, an artifact vessel for the Memory Prism, a catalogue-terminal mechanism, and a physical passage-home threshold. This confirms that Archive navigation uses room context rather than a separate card-grid or page panel.

THE LAB and THE OBSERVATORY also transition inside the same fixed world container. The Lab places ARIA’s luminous vessel in a containment-cradle/workbench environment with a passage-home threshold. The Observatory places retained/connected history signals above a raised circular projection dais with a living-constellation label. Neither destination renders a conventional page title, return button, chat widget, or dashboard panel.

In the owner-authenticated session, enabling non-3D mode replaces the WebGL room with a focused text fallback that identifies the active room and confirms record availability while retaining the compact route deck. The fallback state was visibly confirmed in THE OBSERVATORY, so access to room navigation and retained history does not depend on the 3D renderer.

Disabling the preference restores the Observatory’s projection dais and constellation signals without losing the active room or access-deck state. This confirms a reversible renderer preference rather than a separate, dead-end accessibility route.

## Final validation boundary

The authenticated owner session was used to verify the fixed desktop viewport, room navigation, physical exit thresholds, route-deck keyboard traversal, and the reversible non-3D fallback. Existing automated visual checks covered the unauthenticated entry viewport at desktop and mobile sizes, while source review confirms the `max-width: 760px` camera/quality adaptation and mobile vector controls. The automation environment cannot resize the authenticated connected browser, so a separate authenticated mobile screenshot remains a recommended follow-up rather than an unverified claim in this audit.

The owner-authenticated session was refreshed while THE OBSERVATORY was the active destination. The expected protected loading state appeared first; the restored room state is checked after the session query resolves.

The refreshed owner session restored the Observatory scene behind the entry composition, but reset the client-only `entered` state and exposed a conventional “RETURN TO THE CHAMBER” action. This conflicts with the reconstructed world-first return behavior. The room-state persistence is present, but the entry-gate restoration must be corrected so returning users re-enter their saved context without a page-like intermediate action.

After replacing the entry condition with the persisted `introSeen` state, a refreshed owner-authenticated session restored directly to THE OBSERVATORY. The page no longer presented a return gate, and the living-constellation room context and compact controls were visible immediately. This resolves the persistence-flow regression and confirms the saved destination context reaches the world without conventional navigation chrome.

The return behavior is also protected by a focused pure helper test that confirms either a first-session crossing or persisted `introSeen` state enters the world. The final suite contains 20 passing assertions; TypeScript and the production build pass. The only build advisory is the existing lazy-loaded 3D chunk at 276.29 kB gzip, which remains documented as an accepted performance trade-off.
