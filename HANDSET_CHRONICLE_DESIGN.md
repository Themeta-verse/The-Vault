# THE VAULT — Handset Chronicle Expansion

## Product intent

This expansion gives a **new authenticated handset visitor** a quiet first route through THE VAULT, adds a second historical layer to THE OBSERVATORY, and lets every held artifact yield a short authored fragment. It does not turn the world into a tutorial carousel, a timeline dashboard, or an external lore page. The product remains a spatial instrument: the guide names a nearby action, the constellation changes with retained memory, and artifact text appears only at the point of inspection.

## Owner-scoped handset walkthrough

The walkthrough is a compact, dismissible **field strip** rendered only after authentication, only at the handset breakpoint, only after the registration threshold, and only until its owner has completed or dismissed it. It uses persisted settings state rather than browser-local storage, so a visitor can return on another device without being forced through the same guidance.

| Stage | Trigger | Field-strip instruction | Completion action |
| --- | --- | --- | --- |
| `attention` | First authenticated handset entry | **1 / 3 — Attend the datum.** Touch the Memory Prism and wait for its answer. | Observe the Memory Prism. |
| `retain` | Prism has answered but is not discovered | **2 / 3 — Retain the signal.** Attend the Prism again to keep its route. | Discover the Memory Prism and unseal THE OBSERVATORY. |
| `north` | Observatory is unsealed | **3 / 3 — Trace north.** Enter THE OBSERVATORY; the record will take a second form. | Enter THE OBSERVATORY. |
| `complete` | First Observatory entry, explicit dismissal, or non-handset view | The strip is absent; the access folio retains a restart/dismiss control. | No automatic reappearance. |

The guide never simulates a user action or unlocks content. It only calls the existing protected observation, discovery, and room-entry paths. The fallback map receives the same visible guide and action equivalents.

## Observatory: two mnemonic eras

THE OBSERVATORY gains a compact, persistent era dial rather than a tabbed analytics surface. **The First Register** maps the foundational chain: attention → echo → interpretation. **The Returning Register** maps carried and made memory: lens → cistern → index → creation. The first era is always readable; the second era becomes selectable once the visitor holds at least two discoveries. Selecting an era changes the room-native constellation geometry, the field strip, and the accessible Observatory context. The selected era is an owner preference persisted as `observatoryEra`.

| Era | Atmospheric role | Constellation behavior | Timeline record |
| --- | --- | --- | --- |
| `founding` | First account of the chamber’s instruments | Sparse warm nodes and a first route line | The First Register, 04 · provisional coordinate established. |
| `returning` | Evidence that memory can be carried between rooms | Denser pale-green/lilac armature with an offset orbit | The Returning Register, 19 · routes begin recording their visitors. |

## Artifact micro-fragments

Every artifact receives a persisted authored fragment comprised of a **folio heading**, an **era tag**, and a 1–2 sentence **marginal extract**. Fragments are authored blueprint data, not generated at runtime, and appear only in the Archive containment record after the corresponding artifact has been discovered. This keeps narrative depth local to the act of inspection and provides a readable equivalent to the 3D relic.

## Data and safety contract

The schema adds `fragmentTitle`, `fragmentEra`, and `fragmentBody` to `artifacts`, plus `handsetGuideStage` and `observatoryEra` to `vaultSettings`. The settings mutation validates finite string enums; it cannot receive arbitrary narrative content. Existing blueprint upserts propagate the six authored fragments to fresh and existing installations. Walkthrough transitions can only advance, complete, or dismiss a user’s own settings row; they do not grant discovery, room, or object-state privileges.

## Validation plan

The release will add pure helper tests for guide-stage derivation and era availability, protected router coverage for accepted/rejected settings values, and regression coverage for fragment fields returned in state. Browser checks will verify the mobile field strip, fallback action equivalents, second-era selection, artifact inspection, reduced motion, and restored persistent settings. Build validation remains `pnpm test && pnpm check && pnpm build`.
