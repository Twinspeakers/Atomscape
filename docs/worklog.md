# Worklog

Append-only running log for implementation-level changes, debugging outcomes, and validation notes.

## Entry Template
- Date:
- Author:
- Summary:
- Files:
- Validation:
- Follow-ups:

---

## 2026-02-22 - Codex
- Summary: Fixed GitHub Pages runtime regressions by converting root-absolute asset paths to base-aware URLs and adjusting the Esc pause cycle so first Esc pauses only the Babylon scene while keeping UI/simulation flow active.
- Files:
  - `src/app/routes/GameScreen.tsx`
  - `src/wiki/pages/asteroid-mining.mdx`
  - `src/wiki/pages/flight-basics.mdx`
  - `index.html`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (143 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Consider introducing a shared `publicAsset()` helper for all wiki/game static URLs to prevent future base-path regressions.

## 2026-02-22 - Codex
- Summary: Added the runtime Main Menu flow (start/continue/save/load/settings) with Esc cycle behavior, wired Supabase auth + cloud persistence as a single primary save, and extracted route layout panel components to keep `GameScreen` within file-size guardrails.
- Files:
  - `src/app/routes/GameScreen.tsx`
  - `src/app/routes/gameScreenLayoutPanels.tsx`
  - `src/app/routes/workspacePresets.ts`
  - `src/components/MainMenuModal.tsx`
  - `src/platform/cloud/supabaseClient.ts`
  - `src/platform/cloud/cloudSaveRepository.ts`
  - `src/state/persistence/cloudSavePayload.ts`
  - `src/features/viewport/inputController.ts`
  - `src/features/viewport/SpaceViewport.tsx`
  - `src/features/viewport/types.ts`
  - `vite.config.ts`
  - `tsconfig.app.json`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (143 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Add an explicit in-menu “Overwrite Cloud Save” confirmation step to avoid accidental save replacement.
  - Add cloud save conflict handling for cross-device concurrent sessions.

## 2026-02-21 - Codex
- Summary: Extended sector pass with cross-sector map telemetry, celestial body labels, and the first long-duration extraction node loop.
- Files:
  - `src/features/viewport/types.ts`
  - `src/features/viewport/sceneBuilder.ts`
  - `src/features/viewport/targetRendering.ts`
  - `src/features/viewport/SpaceViewport.tsx`
  - `src/components/GameModal.tsx`
  - `src/store/useAppStore.ts`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (42 tests)
  - `npm run build` passed
- Follow-ups:
  - Add extraction-node radar context and optional node-specific HUD indicator for easier sustained-mining targeting.
  - Add sector-level progress aggregation in map (totals + completion percentages) and station profile telemetry.

## 2026-02-21 - Codex
- Summary: Continued sector implementation pass by wiring per-sector world persistence, active sector state + jump action, portal-triggered sector transit in viewport, sustained mining controls (`E` hold + `=` persistent toggle), and Game Menu map/hotkey updates (`M` map, `O` store).
- Files:
  - `src/features/viewport/SpaceViewport.tsx`
  - `src/state/useAppStore.ts`
  - `src/state/useAppStore.test.ts`
  - `src/app/routes/GameScreen.tsx`
  - `src/components/GameModal.tsx`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test -- src/state/useAppStore.test.ts` passed (19 tests)
  - `npm run build` passed
- Follow-ups:
  - Add explicit sector map telemetry (per-sector station stats and depletion summaries across all sectors, not only active).
  - Add dedicated long-duration extraction nodes to complete SCT4.

## 2026-02-21 - Codex
- Summary: Added a compaction-resilient checkpoint document capturing current sector-pass decisions, implemented code state, and exact next execution plan to preserve continuity.
- Files:
  - `docs/context-checkpoint-2026-02-21.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - Docs-only update (no runtime code touched)
- Follow-ups:
  - Continue implementation from the checkpoint sequence (`viewport runtime portal/mining`, then `store sector persistence`, then `map/hotkeys`).

## 2026-02-21 - Codex
- Summary: Captured next-world direction as docs-first plan for sectorized gameplay: Mars Corridor + Earth Corridor, per-sector stations/resources, long-duration extraction nodes, and Earth-junk cleanup progression.
- Files:
  - `docs/project-memory.md`
  - `docs/roadmap.md`
  - `docs/tickets-sectors-v1.md`
  - `docs/worklog.md`
- Validation:
  - Docs-only update (no runtime code touched)
- Follow-ups:
  - Start SCT1 (`Sector state model + persistence`) before adding new scene content.

## 2026-02-19 - Codex
- Summary: Hardened quest flow by making active Main quest explicitly selectable and progress scoped to that quest, then added a reward completion modal pipeline driven directly by one-time reward claim events.
- Files:
  - `src/features/quests/questDefinitions.ts`
  - `src/components/TutorialOverlay.tsx`
  - `src/components/GameModal.tsx`
  - `src/state/types.ts`
  - `src/state/useAppStore.ts`
  - `src/components/QuestRewardModal.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `docs/quest-system-standard-v1.md`
  - `docs/README.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run build` passed
- Follow-ups:
  - Add focused quest-store tests for reward notification queue behavior and active-main-quest fallback logic.

## 2026-02-19 - Codex
- Summary: Added persisted quest reward history (`Recent Reward Deliveries` in Game Menu/Quests) and implemented quest-store regression tests for reward notification ordering, FIFO dismissal, and duplicate-claim prevention.
- Files:
  - `src/state/useAppStore.ts`
  - `src/state/useAppStore.test.ts`
  - `src/components/GameModal.tsx`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (24 tests)
  - `npm run build` passed
- Follow-ups:
  - Consider a compact “Claimed Rewards” filter by quest type (Main/Side) if the history list grows long.

## 2026-02-19 - Codex
- Summary: Locked in dynamic-quest progression principle by expanding store regression coverage for resource-dependent steps and adding regression tests for both “consume requirement -> step rolls back” and “live state already satisfies chain -> auto-complete + rewards.”
- Files:
  - `src/state/useAppStore.ts`
  - `src/state/useAppStore.test.ts`
  - `docs/quest-system-standard-v1.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (26 tests)
  - `npm run build` passed
- Follow-ups:
  - Continue converging quest evaluation and quest UI completion checks toward a single shared step-requirements module.

## 2026-02-19 - Codex
- Summary: Fixed ship snap-back on target destruction by preventing live viewport scene rebuilds when depletion state updates; depletion now persists without forcing a respawn-position reset.
- Files:
  - `src/features/viewport/SpaceViewport.tsx`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (23 tests)
  - `npm run build` passed
- Follow-ups:
  - If we later add an explicit “reset world” action, keep `worldSeed` as the only scene rebuild trigger and avoid depletion-array rebuild coupling.

## 2026-02-19 - Codex
- Summary: Fixed residual UI greying by adjusting tutorial spotlight behavior (skip near-fullscreen focus targets and remove spotlight fill tint), and added lazy loading for Game Menu sections (Inventory/Laboratory/Crew/Wiki) with suspense fallbacks.
- Files:
  - `src/components/TutorialOverlay.tsx`
  - `src/components/GameModal.tsx`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (23 tests)
  - `npm run build` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - `InventoryPanel` is still statically imported by `GameScreen` (quick panel), so only menu-side usage is lazy; split panel container if full chunk isolation is desired.

## 2026-02-19 - Codex
- Summary: Added lazy loading for Babylon viewport modules (`SpaceViewport`, `ShipInteriorViewport`) in `GameScreen`, and removed the full-screen dim backdrop from `GameModal` that was causing scene/left-rail darkening (`bg-black/45`).
- Files:
  - `src/app/routes/GameScreen.tsx`
  - `src/components/GameModal.tsx`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (23 tests)
  - `npm run build` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Add route-level lazy loading for Game Menu sections if you want further initial-load reductions.

## 2026-02-19 - Codex
- Summary: Continued viewport/UI follow-through by moving `SpaceViewport` implementation into `src/features/viewport/SpaceViewport.tsx` (leaving `src/game/SpaceViewport.tsx` as compatibility re-export), moving `Nearest Contacts` from `HUD` to `Object` panel with collapse/expand control, and adding initial build chunking cleanup (Babylon + MDX vendor splits).
- Files:
  - `src/features/viewport/SpaceViewport.tsx`
  - `src/game/SpaceViewport.tsx`
  - `src/components/CrosshairOverlay.tsx`
  - `src/components/panels/HudPanel.tsx`
  - `src/components/panels/ObjectPanel.tsx`
  - `src/features/quests/questDefinitions.ts`
  - `src/wiki/pages/reference-quests.mdx`
  - `vite.config.ts`
  - `docs/architecture.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (23 tests)
  - `npm run build` passed
  - `npm run wiki:sync` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Add lazy loading for Babylon-dependent route/view to reduce initial `index` chunk further.
  - Add viewport telemetry instrumentation (frame-time + active-entity counters) for render-loop tuning.

## 2026-02-19 - Codex
- Summary: Completed viewport `VPT7` + `VPT8` closure by finalizing seeded world-session persistence wiring (seed + depleted targets + zone/class counters), fixing extraction test fixtures for required target IDs, and adding regression coverage for world-session hydration/depletion dedupe.
- Files:
  - `src/platform/db/gameDb.ts`
  - `src/state/types.ts`
  - `src/features/simulation/systems/extraction.ts`
  - `src/features/simulation/engine.test.ts`
  - `src/features/viewport/types.ts`
  - `src/features/viewport/sceneBuilder.ts`
  - `src/game/SpaceViewport.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `src/state/useAppStore.ts`
  - `src/state/useAppStore.test.ts`
  - `docs/tickets-viewport-v1.md`
  - `docs/project-memory.md`
  - `docs/architecture.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (23 tests)
  - `npm run build` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Start post-VPT viewport stabilization pass (bundle chunking + render/perf profiling).
  - Evaluate removing `src/game/SpaceViewport.tsx` compatibility wrapper once feature-module migration is complete.

## 2026-02-19 - Codex
- Summary: Completed viewport `VPT6` by converting part of main quest progression to true in-space objectives (zone approach, class-specific salvage, station return), wiring viewport zone telemetry into store state, and rendering world-space quest focus markers for space-targeted steps.
- Files:
  - `src/features/quests/questDefinitions.ts`
  - `src/state/useAppStore.ts`
  - `src/state/useAppStore.test.ts`
  - `src/features/viewport/types.ts`
  - `src/game/SpaceViewport.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `src/components/TutorialOverlay.tsx`
  - `src/components/panels/HudPanel.tsx`
  - `src/wiki/pages/reference-quests.mdx`
  - `docs/tickets-viewport-v1.md`
  - `docs/project-memory.md`
  - `docs/architecture.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (22 tests)
  - `npm run wiki:sync` passed
  - `npm run wiki:check` passed
  - `npm run build` passed
- Follow-ups:
  - Start `VPT7` world-session persistence (seed + depletion snapshot) to remove reset feel on refresh.
  - Consider adding explicit viewport HUD marker labels for active in-space quest focus targets.

## 2026-02-19 - Codex
- Summary: Completed viewport `VPT5` by upgrading target taxonomy presentation in `Object` + `HUD` panels with readable class/kind/zone labels, risk bands, and expected yield profiles sourced from viewport target rendering.
- Files:
  - `src/state/types.ts`
  - `src/features/viewport/targetRendering.ts`
  - `src/components/panels/ObjectPanel.tsx`
  - `src/components/panels/HudPanel.tsx`
  - `docs/tickets-viewport-v1.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (22 tests)
  - `npm run build` passed
- Follow-ups:
  - Start `VPT6` by binding quest predicates to in-space objectives (approach/cleanup/return station) and exposing focus markers.

## 2026-02-19 - Codex
- Summary: Completed viewport refactor VPT3 + VPT4 by wiring station-centric world visuals (charge ring, docking ring, beacon), adding in-flight station transition feedback, and re-framing Laboratory station distance controls so manual distance is a testing fallback.
- Files:
  - `src/domain/spec/gameSpec.ts`
  - `src/features/viewport/types.ts`
  - `src/features/viewport/sceneBuilder.ts`
  - `src/game/SpaceViewport.tsx`
  - `src/features/viewport/SpaceViewport.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `src/components/ShipStatusBar.tsx`
  - `src/components/overlay/LaboratoryOverlay.tsx`
  - `docs/tickets-viewport-v1.md`
  - `docs/project-memory.md`
  - `docs/architecture.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (22 tests)
  - `npm run build` passed
- Follow-ups:
  - Start VPT5 to expose richer class/risk/material profile details in Object + HUD panels.
  - Remove `src/game/SpaceViewport.tsx` compatibility wrapper once feature-module migration is complete.

## 2026-02-19 - Codex
- Summary: Completed Crew v1 CRW9 by syncing generated wiki references to current crew/fridge implementation, updating manual wiki pages for Crew menu/hotkeys and fridge behavior, and refreshing docs status to remove stale crew-reference text.
- Files:
  - `scripts/wiki-sync.ts`
  - `src/wiki/pages/reference-systems.mdx`
  - `src/wiki/pages/reference-quests.mdx`
  - `src/wiki/pages/lab-notes.mdx`
  - `src/wiki/pages/flight-basics.mdx`
  - `src/wiki/wikiRegistry.ts`
  - `docs/tickets-crew-v1.md`
  - `docs/worklog.md`
- Validation:
  - `npm run wiki:sync` passed
  - `npm run wiki:check` passed
  - `npm run lint` passed
  - `npm run test` passed (22 tests)
  - `npm run build` passed
- Follow-ups:
  - Keep `wiki:check` in the standard pre-merge command set whenever quest/system constants change.

## 2026-02-19 - Codex
- Summary: Completed Crew v1 CRW7 and CRW8 by standardizing quest reward copy to explicit outcome/destination format and adding deterministic tests for fridge-first feeding plus one-time fridge unlock reward delivery.
- Files:
  - `src/features/quests/questDefinitions.ts`
  - `src/features/simulation/engine.test.ts`
  - `src/state/useAppStore.test.ts`
  - `docs/tickets-crew-v1.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (22 tests)
  - `npm run build` passed
- Follow-ups:
  - Execute CRW9 (`wiki:sync` + `wiki:check`) and align crew docs/wiki pages with finalized reward/testing behavior.

## 2026-02-19 - Codex
- Summary: Completed Crew v1 CRW5 and CRW6 by wiring `Feed the Crew` reward unlocks (`Fridge` + preload bars), applying fridge-aware manual feed consumption, and updating Laboratory/HUD crew surfaces to reflect per-member metrics and automation controls.
- Files:
  - `src/features/quests/questDefinitions.ts`
  - `src/state/useAppStore.ts`
  - `src/components/overlay/CrewOverlay.tsx`
  - `src/components/overlay/LaboratoryOverlay.tsx`
  - `src/components/ShipStatusBar.tsx`
  - `docs/tickets-crew-v1.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (20 tests)
  - `npm run build` passed
- Follow-ups:
  - Start CRW7 reward copy/behavior audit pass across all quests.
  - Start CRW8 deterministic tests for fridge unlock and consumption-priority invariants.

## 2026-02-19 - Codex
- Summary: Completed Crew v1 CRW4 by switching survival progression to per-member hunger/thirst/debuff loops (with auto-feed and auto-drink), and added a dedicated `Crew` Game Menu section between Laboratory and Wiki with live crew/fridge controls and telemetry.
- Files:
  - `src/features/simulation/systems/crew.ts`
  - `src/state/useAppStore.ts`
  - `src/components/GameModal.tsx`
  - `src/components/overlay/CrewOverlay.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `docs/tickets-crew-v1.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (20 tests)
  - `npm run build` passed
- Follow-ups:
  - Continue CRW6 by surfacing per-member crew/fridge telemetry in `ShipStatusBar` and `LaboratoryOverlay`.
  - Implement CRW5 quest reward wiring for fridge unlock + preload (5 bars) if still pending.

## 2026-02-19 - Codex
- Summary: Completed Crew v1 CRW1 foundation by adding canonical per-member crew/thirst/sleep/fridge constants and shared crew/fridge type surfaces across state + simulation boundaries.
- Files:
  - `src/domain/spec/gameSpec.ts`
  - `src/state/types.ts`
  - `src/features/simulation/types.ts`
  - `docs/tickets-crew-v1.md`
- Validation:
  - `npm run lint` passed
  - `npm run build` passed
- Follow-ups:
  - Implement CRW2 store/persistence migration (`crewMembers`, `fridge`, `waterAutomationEnabled`).
  - Replace aggregate crew runtime paths with per-member model in CRW3/CRW4.

## 2026-02-19 - Codex
- Summary: Completed Crew v1 CRW2 by adding runtime/persisted crew members, fridge state, and water automation with safe migration from old aggregate crew snapshots.
- Files:
  - `src/state/useAppStore.ts`
  - `docs/tickets-crew-v1.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed
  - `npm run build` passed
- Follow-ups:
  - Implement CRW3 automatic sleep rotation over the fixed `0/6/12/18` shift windows.
  - Implement CRW4 per-member hunger/thirst/debuff simulation and aggregate output.

## 2026-02-19 - Codex
- Summary: Completed Crew v1 CRW3 by adding deterministic sleep-rotation updates (`0/6/12/18`, 8h windows) into tick execution and exposing crew awake/average metrics in simulation outputs and store state.
- Files:
  - `src/features/simulation/systems/crew.ts`
  - `src/features/simulation/engine.ts`
  - `src/state/useAppStore.ts`
  - `src/features/simulation/engine.test.ts`
  - `docs/tickets-crew-v1.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (20 tests)
  - `npm run build` passed
- Follow-ups:
  - Implement CRW4 per-member hunger/thirst decay and consumption loops.
  - Surface the new awake/average metrics in HUD and laboratory crew rows during CRW6 UI pass.

## 2026-02-18 - Codex
- Summary: Introduced persistent project documentation structure for context continuity.
- Files:
  - `docs/project-memory.md`
  - `docs/worklog.md`
  - `docs/decisions/ADR-0000-template.md`
- Validation: Files created and added to repository structure.
- Follow-ups:
  - Keep `project-memory.md` concise and current.
  - Add ADRs when major UI/system decisions are made.

## 2026-02-18 - Codex
- Summary: Captured clarified product vision (matter economy + lab decomposition + survival + commerce) and added phased roadmap.
- Files:
  - `docs/project-memory.md`
  - `docs/roadmap.md`
  - `docs/worklog.md`
- Validation: Documentation updated to reflect new direction and execution sequence.
- Follow-ups:
  - Turn "Immediate Next Build Slice" into implementation tasks.
  - Add ADR once recipe realism level and economy abstraction are fixed.

## 2026-02-18 - Codex
- Summary: Locked user vision decisions into product memory and defined a concrete MVP specification.
- Files:
  - `docs/project-memory.md`
  - `docs/roadmap.md`
  - `docs/mvp-spec-v1.md`
  - `docs/worklog.md`
- Validation: Vision answers mapped to explicit gameplay/economy/UI constraints and near-term delivery scope.
- Follow-ups:
  - Convert `docs/mvp-spec-v1.md` into implementation tickets.
  - Create first recipe data model for Box of Sand, Steel Ingot, Energy Cell, Galaxy Bar.

## 2026-02-18 - Codex
- Summary: Delivered first MVP vertical slice (`rubble -> Box of Sand -> sell`) with dynamic market pricing and starter product catalog.
- Files:
  - `docs/tickets-mvp-v1.md`
  - `docs/project-memory.md`
  - `src/data/resourceCatalog.ts`
  - `src/store/types.ts`
  - `src/store/useAppStore.ts`
  - `src/components/overlay/LaboratoryOverlay.tsx`
  - `src/components/ShipStatusBar.tsx`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run build` passed
- Follow-ups:
  - Build Galaxy Bar production chain and automate it early.
  - Add Store telemetry panels for inflow/outflow and demand trend history.

## 2026-02-18 - Codex
- Summary: Implemented quest UX restructure and keyboard Game Modal navigation.
- Files:
  - `src/store/types.ts`
  - `src/store/useAppStore.ts`
  - `src/components/TutorialOverlay.tsx`
  - `src/components/GameModal.tsx`
  - `src/routes/GameScreen.tsx`
  - `src/game/SpaceViewport.tsx`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run build` passed
- Follow-ups:
  - Add more Side Quests with dedicated completion state (not only derived checks).
  - Add future Game Modal sections (Map, Crew, Contracts, Settings).

## 2026-02-18 - Codex
- Summary: Started future-proof file-structure migration (`app/features/domain/state/platform`) with non-breaking compatibility wrappers.
- Files:
  - `src/app/App.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `src/state/useAppStore.ts`
  - `src/state/types.ts`
  - `src/domain/resources/resourceCatalog.ts`
  - `src/domain/elements/periodicElements.ts`
  - `src/platform/db/gameDb.ts`
  - `src/App.tsx`
  - `src/routes/GameScreen.tsx`
  - `src/store/useAppStore.ts`
  - `src/store/types.ts`
  - `src/data/resourceCatalog.ts`
  - `src/data/periodicElements.ts`
  - `src/db/gameDb.ts`
  - `src/main.tsx`
  - `tsconfig.app.json`
  - `vite.config.ts`
  - `docs/architecture.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run build` passed
- Follow-ups:
  - Move component files into `src/features/*` and switch imports to aliases.
  - Split monolithic app store into state modules by system boundary.

## 2026-02-18 - Codex
- Summary: Implemented Step 1+2 docs-driven simulation refactor by introducing canonical spec constants and a pure tick engine, then wired store tick to the engine without changing external state API.
- Files:
  - `src/domain/spec/gameSpec.ts`
  - `src/features/simulation/math.ts`
  - `src/features/simulation/types.ts`
  - `src/features/simulation/engine.ts`
  - `src/features/simulation/systems/station.ts`
  - `src/features/simulation/systems/containment.ts`
  - `src/features/simulation/systems/recombination.ts`
  - `src/features/simulation/systems/market.ts`
  - `src/state/types.ts`
  - `src/state/useAppStore.ts`
  - `src/components/overlay/LaboratoryOverlay.tsx`
  - `docs/project-memory.md`
  - `docs/architecture.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run build` passed
- Follow-ups:
  - Move process/node execution (`runRockSorter`, `runElectrolyzer`, etc.) behind the same simulation engine boundary.
  - Add fixed-seed simulation tests for tick determinism and atom accounting invariants.

## 2026-02-18 - Codex
- Summary: Continued docs-driven simulation refactor by extracting lab process execution into a pure simulation system and centralizing lab node definitions in a domain process catalog.
- Files:
  - `src/domain/spec/processCatalog.ts`
  - `src/features/simulation/systems/process.ts`
  - `src/features/simulation/engine.ts`
  - `src/state/useAppStore.ts`
  - `docs/project-memory.md`
  - `docs/architecture.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run build` passed
- Follow-ups:
  - Move market sale execution (`sellMarketProduct`) into the simulation engine boundary.
  - Add simulation tests for process execution invariants (energy bounds, inventory non-negativity, atom conservation).

## 2026-02-18 - Codex
- Summary: Completed market sale boundary refactor and added deterministic Vitest coverage for simulation/process/sale invariants.
- Files:
  - `src/features/simulation/systems/market.ts`
  - `src/features/simulation/engine.ts`
  - `src/state/useAppStore.ts`
  - `src/features/simulation/engine.test.ts`
  - `package.json`
  - `package-lock.json`
  - `docs/project-memory.md`
  - `docs/architecture.md`
  - `docs/tickets-mvp-v1.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (6 tests)
  - `npm run build` passed
- Follow-ups:
  - Expand tests from system invariants to end-to-end recipe-chain progression checks.
  - Begin store decomposition into `state/simulation`, `state/economy`, `state/quests`, `state/ui`.

## 2026-02-18 - Codex
- Summary: Implemented T8 survival slice with crew hunger/starvation/debuff simulation, Galaxy Bar automation, and UI wiring for crew status/controls.
- Files:
  - `src/domain/spec/gameSpec.ts`
  - `src/domain/spec/processCatalog.ts`
  - `src/features/simulation/types.ts`
  - `src/features/simulation/systems/crew.ts`
  - `src/features/simulation/engine.ts`
  - `src/features/simulation/engine.test.ts`
  - `src/state/types.ts`
  - `src/state/useAppStore.ts`
  - `src/components/overlay/LaboratoryOverlay.tsx`
  - `src/components/ShipStatusBar.tsx`
  - `docs/tickets-mvp-v1.md`
  - `docs/project-memory.md`
  - `docs/architecture.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (9 tests)
  - `npm run build` passed
- Follow-ups:
  - Add the first explicit failure/repair loop tied to starvation/combat thresholds.
  - Expand crew model from scalar hunger to multi-need survival (nutrition, morale, oxygen reserve).

## 2026-02-18 - Codex
- Summary: Implemented T9 failure/repair loop with combat + starvation triggers, emergency respawn to start point, and minor repair penalties.
- Files:
  - `src/state/types.ts`
  - `src/features/simulation/types.ts`
  - `src/features/simulation/systems/crew.ts`
  - `src/features/simulation/engine.ts`
  - `src/features/simulation/engine.test.ts`
  - `src/state/useAppStore.ts`
  - `src/game/SpaceViewport.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `src/components/ShipStatusBar.tsx`
  - `docs/tickets-mvp-v1.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (10 tests)
  - `npm run build` passed
- Follow-ups:
  - Tune repair penalties and starvation critical thresholds based on playtesting.
  - Expose failure reason + repair breakdown in a dedicated event/history panel.

## 2026-02-18 - Codex
- Summary: Added dedicated Failure Report panel in Laboratory with structured per-event repair breakdown (reason, penalties, and material required/used/shortage).
- Files:
  - `src/state/types.ts`
  - `src/state/useAppStore.ts`
  - `src/components/overlay/LaboratoryOverlay.tsx`
  - `docs/tickets-mvp-v1.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (10 tests)
  - `npm run build` passed
- Follow-ups:
  - Consider exposing Failure Reports in Game Modal as a dedicated section/hotkey.

## 2026-02-18 - Codex
- Summary: Implemented wiki auto-sync pipeline hardening and governance so in-game reference pages stay aligned with simulation/process/resource/quest code.
- Files:
  - `scripts/wiki-sync.ts`
  - `src/wiki/pages/reference-systems.mdx`
  - `src/wiki/pages/reference-process-catalog.mdx`
  - `src/wiki/pages/reference-resource-catalog.mdx`
  - `src/wiki/pages/reference-quests.mdx`
  - `src/wiki/generated/wikiGeneratedIndex.ts`
  - `docs/wiki-governance.md`
  - `docs/README.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run wiki:sync` passed
  - `npm run wiki:check` passed
  - `npm run build` passed
- Follow-ups:
  - Add a CI job that runs `npm run wiki:check` to block stale wiki references in PRs.

## 2026-02-18 - Codex
- Summary: Added GitHub Actions CI quality gate to enforce lint/test/wiki-check/build on pushes and pull requests.
- Files:
  - `.github/workflows/ci.yml`
  - `docs/wiki-governance.md`
  - `docs/worklog.md`
- Validation:
  - Workflow YAML added and references existing npm scripts (`lint`, `test`, `wiki:check`, `build`).
- Follow-ups:
  - If CI runtime becomes slow, split into parallel jobs with artifact reuse.

## 2026-02-18 - Codex
- Summary: Refactored CI workflow to parallel matrix execution so lint/test/wiki-check/build run concurrently.
- Files:
  - `.github/workflows/ci.yml`
  - `docs/worklog.md`
- Validation:
  - Local command suite still passes (`lint`, `test`, `wiki:check`, `build`).
- Follow-ups:
  - If needed later, add dependency caching optimization beyond npm cache (for faster repeated build jobs).

## 2026-02-18 - Codex
- Summary: Introduced a shared visual hierarchy system (typography + spacing + content surfaces) and applied it across wiki rendering, game menu sections, and docked panel content; also added markdown curation governance.
- Files:
  - `src/index.css`
  - `src/components/wiki/WikiArticle.tsx`
  - `src/components/overlay/WikiOverlay.tsx`
  - `src/components/overlay/LaboratoryOverlay.tsx`
  - `src/components/GameModal.tsx`
  - `src/components/panels/InventoryPanel.tsx`
  - `src/components/panels/ObjectPanel.tsx`
  - `src/components/panels/HudPanel.tsx`
  - `src/components/ShipStatusBar.tsx`
  - `src/components/TutorialOverlay.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `docs/docs-governance.md`
  - `docs/README.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed
  - `npm run wiki:check` passed
  - `npm run build` passed
- Follow-ups:
  - Continue replacing ad hoc per-component size classes with semantic ui-* classes during feature work.

## 2026-02-18 - Codex
- Summary: Completed the next hierarchy cleanup pass by replacing remaining ad hoc sizing in key menu/panel flows with semantic UI classes and standard action/status components.
- Files:
  - `src/index.css`
  - `src/components/TutorialOverlay.tsx`
  - `src/components/overlay/LaboratoryOverlay.tsx`
  - `src/components/overlay/WikiOverlay.tsx`
  - `src/components/GameModal.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed
  - `npm run wiki:check` passed
  - `npm run build` passed
- Follow-ups:
  - Continue migrating remaining minor ad hoc classes in non-menu/panel components as they are touched.

## 2026-02-18 - Codex
- Summary: Extended semantic UI tokenization to remaining panel-level surfaces (inputs, value chips, status rows, and workspace cards) for consistent hierarchy across non-menu UI components.
- Files:
  - `src/index.css`
  - `src/components/panels/InventoryPanel.tsx`
  - `src/components/panels/ObjectPanel.tsx`
  - `src/components/panels/HudPanel.tsx`
  - `src/components/ShipStatusBar.tsx`
  - `src/components/overlay/WikiOverlay.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed
  - `npm run wiki:check` passed
  - `npm run build` passed
- Follow-ups:
  - Apply the same semantic token approach to future new components by default.

## 2026-02-18 - Codex
- Summary: Authored a concrete viewport modernization implementation plan (Orbital Operations Layer) with ordered, file-mapped tickets aligned to current architecture boundaries.
- Files:
  - `docs/tickets-viewport-v1.md`
  - `docs/README.md`
  - `docs/project-memory.md`
  - `docs/architecture.md`
  - `docs/worklog.md`
- Validation:
  - Documentation-only change; no runtime code modified.
- Follow-ups:
  - Start VPT1 by introducing seeded world model and cleanup target catalog.

## 2026-02-18 - Codex
- Summary: Completed `VPT1` + `VPT2` by introducing seeded cleanup-world targets and moving extraction hit outcomes behind a dedicated simulation system with structured events.
- Files:
  - `src/features/simulation/math.ts`
  - `src/domain/spec/worldSpec.ts`
  - `src/domain/world/cleanupCatalog.ts`
  - `src/domain/world/cleanupCatalog.test.ts`
  - `src/features/simulation/systems/extraction.ts`
  - `src/features/simulation/engine.ts`
  - `src/features/simulation/engine.test.ts`
  - `src/state/types.ts`
  - `src/state/useAppStore.ts`
  - `src/game/SpaceViewport.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `src/domain/spec/processCatalog.ts`
  - `src/wiki/pages/reference-process-catalog.mdx`
  - `docs/tickets-viewport-v1.md`
  - `docs/architecture.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (19 tests)
  - `npm run wiki:sync` passed
  - `npm run wiki:check` passed
  - `npm run build` passed
- Follow-ups:
  - Start `VPT3` by splitting viewport internals into renderer/input modules and a view-model boundary.
  - Feed structured extraction events into quests/objectives for in-world progression checks.

## 2026-02-18 - Codex
- Summary: Simplified Laboratory UX by removing obsolete test actions and making process/store controls requirement-aware with explicit inline blocking reasons.
- Files:
  - `src/components/overlay/LaboratoryOverlay.tsx`
  - `src/state/useAppStore.ts`
  - `src/domain/spec/processCatalog.ts`
  - `src/wiki/pages/reference-process-catalog.mdx`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (19 tests)
  - `npm run wiki:sync` passed
  - `npm run wiki:check` passed
  - `npm run build` passed
- Follow-ups:
  - Consider surfacing extraction events in a dedicated Laboratory sub-tab for action-by-action debug feedback.

## 2026-02-18 - Codex
- Summary: Rebalanced crew survival pacing so hunger now depletes over a full 24-hour real-time window instead of minutes.
- Files:
  - `src/domain/spec/gameSpec.ts`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (19 tests)
  - `npm run build` passed
- Follow-ups:
  - If needed, retune `CREW_STARVING_THRESHOLD` and food automation thresholds after playtesting with longer hunger cycles.

## 2026-02-18 - Codex
- Summary: Fixed Laboratory tab lock by removing tutorial-driven auto-forcing of lab tab selection while the game menu is open.
- Files:
  - `src/components/TutorialOverlay.tsx`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (19 tests)
  - `npm run build` passed
- Follow-ups:
  - Keep quest "Focus This Step" behavior (which intentionally sets lab tab once) as the guided navigation path without overriding manual tab changes.

## 2026-02-18 - Codex
- Summary: Added runtime state persistence so key session values (including energy) survive page refreshes instead of resetting to defaults.
- Files:
  - `src/state/useAppStore.ts`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (19 tests)
  - `npm run build` passed
- Follow-ups:
  - Consider moving runtime snapshot persistence from local storage into Dexie once the save format stabilizes and versioned migrations are introduced.

## 2026-02-18 - Codex
- Summary: Refactored quest presentation to a shared view-model and restructured Main quest ordering so `Learning To Charge` is the first Main quest with a single step, reflected consistently in both sidebar and Game Menu views.
- Files:
  - `src/features/quests/questDefinitions.ts`
  - `src/components/TutorialOverlay.tsx`
  - `src/components/GameModal.tsx`
  - `src/state/useAppStore.ts`
  - `src/wiki/pages/reference-quests.mdx`
  - `src/wiki/pages/reference-systems.mdx`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run wiki:sync` passed
  - `npm run lint` passed
  - `npm run test` passed (19 tests)
  - `npm run wiki:check` passed
  - `npm run build` passed
- Follow-ups:
  - Consider extending the shared quest builder to include explicit per-quest rewards and completion logs.

## 2026-02-18 - Codex
- Summary: Added explicit per-quest reward metadata and rendered rewards from the shared quest view-model in both the sidebar Quests panel and Game Menu/Quests page.
- Files:
  - `src/features/quests/questDefinitions.ts`
  - `src/components/TutorialOverlay.tsx`
  - `src/components/GameModal.tsx`
  - `scripts/wiki-sync.ts`
  - `src/wiki/pages/reference-quests.mdx`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run wiki:sync` passed
  - `npm run lint` passed
  - `npm run test` passed (19 tests)
  - `npm run wiki:check` passed
  - `npm run build` passed
- Follow-ups:
  - If rewards should grant actual resources/credits, add a reward-claim state machine and one-time grant logic in store simulation state.

## 2026-02-21 - Codex
- Summary: Added a full architecture scale-out migration program and a dedicated continuity checkpoint for context compaction resilience.
- Files:
  - `docs/README.md`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/worklog.md`
- Validation:
  - Not run (docs-only planning update).
- Follow-ups:
  - Execute Phase 0 from `docs/architecture-scaleout-plan-v1.md` (boundary lint + file-size budget checks).
  - Start Phase 1 store decomposition by creating `src/state/store.ts` and first slices.

## 2026-02-21 - Codex
- Summary: Executed architecture migration tranche (Phase 0 complete + Phase 1 scaffold start) by adding baseline-aware guardrail scripts and introducing initial `simulation/world` state slices with a composed `useAppStoreV2`.
- Files:
  - `tools/checks/architecture-boundaries.mjs`
  - `tools/checks/file-size-budget.mjs`
  - `tools/checks/baselines/architecture-violations.json`
  - `tools/checks/baselines/file-size-baseline.json`
  - `eslint.config.js`
  - `package.json`
  - `src/state/slices/simulationSlice.ts`
  - `src/state/slices/worldSlice.ts`
  - `src/state/store.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run architecture:baseline` passed
  - `npm run filesize:baseline` passed
  - `npm run quality:check` passed
  - `npm run lint` passed (warnings expected during migration)
  - `npm run test` passed (45 tests)
  - `npm run build` passed
- Follow-ups:
  - Continue Phase 1 by extracting `GameScreen` selectors and moving persistence subscriptions out of `src/state/useAppStore.ts`.
  - Convert warning-only `no-restricted-imports` migration rules to enforced errors once compatibility wrappers are retired.

## 2026-02-21 - Codex
- Summary: Continued architecture migration by removing the active `domain -> features` boundary violation, extracting shared quest UI selectors, and migrating `GameModal`/`TutorialOverlay` away from inline store lambdas and legacy `store/*` imports.
- Files:
  - `src/shared/math/simulationMath.ts`
  - `src/features/simulation/math.ts`
  - `src/domain/world/cleanupCatalog.ts`
  - `src/state/selectors/questUiSelectors.ts`
  - `src/components/GameModal.tsx`
  - `src/components/TutorialOverlay.tsx`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run quality:check` passed (`15 current violation(s), 4 resolved vs baseline`)
  - `npm run lint` passed (warnings expected during migration)
  - `npm run test` passed (45 tests)
  - `npm run build` passed
- Follow-ups:
  - Start Phase 3 foundation by introducing content schemas under `content/schemas`.
  - Continue migrating remaining legacy component imports (`store/*`, `data/*`, `db/*`) to canonical aliases.

## 2026-02-21 - Codex
- Summary: Started content-first migration for resources by introducing `content/` schemas and packs, adding a deterministic content build/check pipeline, generating a runtime resource registry, switching the domain resource catalog to generated output, and hardening wiki/test execution after the new generated path integration.
- Files:
  - `content/README.md`
  - `content/schemas/resource.schema.json`
  - `content/schemas/process.schema.json`
  - `content/schemas/recipe.schema.json`
  - `content/packs/base/resources/resources.base.json`
  - `tools/content-build/build-resources-registry.mjs`
  - `src/generated/registry/resources.ts`
  - `src/domain/resources/resourceCatalog.ts`
  - `src/domain/spec/processCatalog.ts`
  - `src/wiki/pages/reference-process-catalog.mdx`
  - `src/wiki/pages/reference-quests.mdx`
  - `package.json`
  - `docs/README.md`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run content:build` passed
  - `npm run content:check` passed
  - `npm run wiki:sync` passed
  - `npm run wiki:check` passed
  - `npm run quality:check` passed
  - `npm run lint` passed (warnings expected during migration)
  - `npm run test` passed (45 tests)
  - `npm run build` passed
- Follow-ups:
  - Add wiki adapter path that reads generated resource registry directly.
  - Migrate process/recipe catalogs into content packs + generated registries.

## 2026-02-21 - Codex
- Summary: Continued content-first migration by moving `PROCESS_CATALOG` to content packs, adding a dedicated process-registry generator, switching domain process exports to generated output, and expanding content checks to validate both resource and process registries.
- Files:
  - `content/schemas/process.schema.json`
  - `content/packs/base/processes/processes.base.json`
  - `tools/content-build/build-processes-registry.mjs`
  - `src/generated/registry/processes.ts`
  - `src/domain/spec/processCatalog.ts`
  - `package.json`
  - `content/README.md`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run content:build` passed
  - `npm run content:check` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
  - `npm run lint` passed (warnings expected during migration)
  - `npm run test` passed (45 tests)
  - `npm run build` passed
- Follow-ups:
  - Add recipe content-pack + generated recipe registry with dependency graph checks.
  - Update wiki generation path to explicitly read generated registries as canonical source.

## 2026-02-21 - Codex
- Summary: Implemented recipe catalog migration and graph validation by introducing recipe packs + generated registry output, adding a dedicated content graph checker, and wiring CI content checks to enforce resource/process/recipe linkage and acyclic recipe dependencies.
- Files:
  - `content/schemas/recipe.schema.json`
  - `content/packs/base/recipes/recipes.base.json`
  - `tools/content-build/build-recipes-registry.mjs`
  - `tools/content-build/check-content-graph.mjs`
  - `src/generated/registry/recipes.ts`
  - `src/domain/spec/recipeCatalog.ts`
  - `package.json`
  - `content/README.md`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run content:build` passed
  - `npm run content:check` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
  - `npm run lint` passed (warnings expected during migration)
  - `npm run test` passed (45 tests)
  - `npm run build` passed
- Follow-ups:
  - Add transitional wiki adapter that consumes generated registries directly (`resources`, `processes`, `recipes`).
  - Extend recipe metadata and graph checks for unlock/tier/station constraints needed at high catalog scale.

## 2026-02-22 - Codex
- Summary: Completed recipe-scale metadata hardening by requiring tier/discipline/station/unlock fields in recipe content, extending content graph validation to enforce unlock/tier progression rules, and updating generated recipe wiki references to project the new metadata.
- Files:
  - `content/schemas/recipe.schema.json`
  - `content/packs/base/recipes/recipes.base.json`
  - `tools/content-build/build-recipes-registry.mjs`
  - `tools/content-build/check-content-graph.mjs`
  - `src/generated/registry/recipes.ts`
  - `scripts/wiki-sync.ts`
  - `src/wiki/pages/reference-recipe-catalog.mdx`
  - `src/wiki/generated/wikiGeneratedIndex.ts`
  - `content/README.md`
  - `docs/README.md`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run content:build` passed
  - `npm run content:check` passed
  - `npm run wiki:sync` passed
  - `npm run wiki:check` passed
  - `npm run quality:check` passed
  - `npm run lint` passed (warnings expected during migration)
  - `npm run test` passed (45 tests)
  - `npm run build` passed
- Follow-ups:
  - Add content-pack sharding conventions for high-cardinality recipe/item catalogs.
  - Start extracting `scripts/wiki-sync.ts` into `tools/wiki-build/*` with transitional wrapper compatibility.

## 2026-02-22 - Codex
- Summary: Added shard-aware content-pack loading for resource/process/recipe build and graph checks, then applied the first recipe shard split so the crafting catalog can scale without one monolithic file.
- Files:
  - `tools/content-build/pack-loader.mjs`
  - `tools/content-build/build-resources-registry.mjs`
  - `tools/content-build/build-processes-registry.mjs`
  - `tools/content-build/build-recipes-registry.mjs`
  - `tools/content-build/check-content-graph.mjs`
  - `content/packs/base/recipes/recipes.base.json`
  - `content/packs/base/recipes/shards/recipes.market.0012-0015.json`
  - `content/packs/base/{items,tools,crew,quests,sectors,scenes,elements,compounds}/shards/.gitkeep`
  - `src/generated/registry/resources.ts`
  - `src/generated/registry/processes.ts`
  - `src/generated/registry/recipes.ts`
  - `content/README.md`
  - `docs/README.md`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run content:build` passed
  - `npm run content:check` passed
  - `npm run wiki:sync` passed
  - `npm run wiki:check` passed
  - `npm run quality:check` passed
  - `npm run lint` passed (warnings expected during migration)
  - `npm run test` passed (45 tests)
  - `npm run build` passed
- Follow-ups:
  - Continue alias migration in legacy component imports to reduce warning-only boundary drift.
  - Start `tools/wiki-build/*` extraction while keeping `scripts/wiki-sync.ts` as compatibility wrapper.

## 2026-02-22 - Codex
- Summary: Completed the requested follow-up sequence by finishing legacy import alias migration (warning set cleared) and extracting wiki generation into `tools/wiki-build` while preserving `scripts/wiki-sync.ts` as a compatibility entrypoint.
- Files:
  - `eslint.config.js`
  - `src/domain/resources/resourcePresentation.ts`
  - `src/data/resourcePresentation.ts`
  - `src/app/App.tsx`
  - `src/state/useAppStore.ts`
  - `src/state/useAppStore.test.ts`
  - `src/state/types.ts`
  - `src/search/resourceSearch.ts`
  - `src/search/elementSearch.ts`
  - `src/game/randomElement.ts`
  - `src/components/**/*` (alias import path migration from legacy `store/*` + `data/*` wrappers)
  - `tools/wiki-build/wiki-sync.ts`
  - `scripts/wiki-sync.ts`
  - `scripts/tsconfig.wiki.json`
  - `docs/README.md`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run wiki:sync` passed
  - `npm run wiki:check` passed
  - `npm run test` passed (45 tests)
  - `npm run build` passed
  - `npm run quality:check` passed (`10 current violation(s), 9 resolved vs baseline`)
- Follow-ups:
  - Continue `tools/wiki-build/*` decomposition by splitting the monolithic sync file into focused modules (systems/resources/processes/recipes/quests projections).
  - Start extracting pure utilities from `src/state/useAppStore.ts` into dedicated state modules.

## 2026-02-22 - Codex
- Summary: Executed the first store-decomposition extraction tranche by moving pure number/world/crew-schedule helpers out of `useAppStore` into dedicated state modules, while keeping exported store helper APIs stable for tests/UI.
- Files:
  - `src/state/utils/numberUtils.ts`
  - `src/state/world/worldStateUtils.ts`
  - `src/state/crew/crewScheduleUtils.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test -- src/state/useAppStore.test.ts` passed (20 tests)
  - `npm run test` passed (45 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
- Follow-ups:
  - Extract snapshot sanitizers and reward notification/grant formatting helpers from `src/state/useAppStore.ts` into focused modules.
  - Continue splitting wiki-build implementation into `tools/wiki-build/pages/*` + shared writer utilities.

## 2026-02-22 - Codex
- Summary: Completed the next store-decomposition tranche by wiring runtime snapshot sanitization and quest reward/grant logic into dedicated modules, removing duplicated helper blocks from `useAppStore`, and preserving existing runtime behavior.
- Files:
  - `src/state/runtime/snapshotSanitizers.ts`
  - `src/state/quests/rewardUtils.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test -- src/state/useAppStore.test.ts` passed (20 tests)
  - `npm run test` passed (45 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue splitting wiki-build implementation into focused projection/writer modules under `tools/wiki-build/*`.
  - Extract the next `useAppStore` clusters (quest/tutorial progression and runtime snapshot builders) into dedicated modules.

## 2026-02-22 - Codex
- Summary: Completed the next decomposition pass by extracting quest/tutorial progression logic from `useAppStore` into a dedicated module and finishing wiki-build modularization into focused page/utility modules while preserving the existing sync entrypoint behavior.
- Files:
  - `src/state/quests/tutorialProgression.ts`
  - `src/state/useAppStore.ts`
  - `tools/wiki-build/wiki-sync.ts`
  - `tools/wiki-build/types.ts`
  - `tools/wiki-build/formatters.ts`
  - `tools/wiki-build/generatedIndex.ts`
  - `tools/wiki-build/fileOps.ts`
  - `tools/wiki-build/pages/systemsPage.ts`
  - `tools/wiki-build/pages/processCatalogPage.ts`
  - `tools/wiki-build/pages/resourceCatalogPage.ts`
  - `tools/wiki-build/pages/recipeCatalogPage.ts`
  - `tools/wiki-build/pages/questReferencePage.ts`
  - `scripts/tsconfig.wiki.json`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test -- src/state/useAppStore.test.ts` passed (20 tests)
  - `npm run test` passed (45 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting runtime snapshot builder/persistence projection helpers and quest reward state transitions from `src/state/useAppStore.ts`.
  - Add focused tests for `src/state/quests/tutorialProgression.ts` and `tools/wiki-build/*` to protect decomposition behavior.

## 2026-02-22 - Codex
- Summary: Completed the next decomposition pass by extracting runtime snapshot load/build/world-projection helpers into a dedicated runtime module, wiring `useAppStore` to consume it, and adding focused test coverage for newly extracted tutorial progression and wiki-build modules.
- Files:
  - `src/state/runtime/snapshotPersistence.ts`
  - `src/state/useAppStore.ts`
  - `src/state/quests/tutorialProgression.test.ts`
  - `tools/wiki-build/wiki-build.test.ts`
  - `tools/wiki-build/generatedIndex.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test -- src/state/quests/tutorialProgression.test.ts tools/wiki-build/wiki-build.test.ts` passed (10 tests)
  - `npm run test` passed (55 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting quest reward state transitions + offline catchup/tick orchestration clusters from `src/state/useAppStore.ts`.
  - Begin mapping extracted helper clusters onto slice-aligned state modules in `src/state/slices/*` with compatibility wrappers retained during migration.

## 2026-02-22 - Codex
- Summary: Completed the next decomposition pass by extracting quest reward transition logic and offline catch-up orchestration into dedicated modules, rewiring `useAppStore` to consume them, and adding focused tests for both new extraction modules.
- Files:
  - `src/state/quests/rewardStateTransitions.ts`
  - `src/state/simulation/tickOrchestration.ts`
  - `src/state/useAppStore.ts`
  - `src/state/quests/rewardStateTransitions.test.ts`
  - `src/state/simulation/tickOrchestration.test.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test -- src/state/quests/rewardStateTransitions.test.ts src/state/simulation/tickOrchestration.test.ts src/state/useAppStore.test.ts` passed (25 tests)
  - `npm run test` passed (60 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting remaining large orchestration clusters from `src/state/useAppStore.ts` (world-session hydration/jump flow, process-action handlers, simulation tick action body).
  - Start mapping extracted helper clusters onto slice-aligned modules in `src/state/slices/*` while retaining compatibility wrappers during migration.

## 2026-02-22 - Codex
- Summary: Continued the decomposition pass by extracting world-session state transitions (fallback/hydration/depletion) into a dedicated world module, adding reusable live-tick orchestration in simulation helpers, and rewiring `useAppStore` to consume those transitions for world-session load/depletion and `tickSimulation`.
- Files:
  - `src/state/world/worldSessionTransitions.ts`
  - `src/state/world/worldSessionTransitions.test.ts`
  - `src/state/simulation/tickOrchestration.ts`
  - `src/state/simulation/tickOrchestration.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/world/worldSessionTransitions.test.ts src/state/simulation/tickOrchestration.test.ts src/state/useAppStore.test.ts` passed (28 tests)
  - `npm run lint` passed
  - `npm run test` passed (65 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting remaining large orchestration clusters from `src/state/useAppStore.ts` (process-action handlers and station/control action transitions).
  - Start mapping extracted transition helpers onto slice-aligned modules in `src/state/slices/*` while retaining `useAppStore` compatibility wrappers.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting process-run transitions and station/control transitions into dedicated simulation modules, then rewired `useAppStore` to consume them for shared process actions and station distance/docking/charging/containment actions.
- Files:
  - `src/state/simulation/processTransitions.ts`
  - `src/state/simulation/processTransitions.test.ts`
  - `src/state/simulation/stationControlTransitions.ts`
  - `src/state/simulation/stationControlTransitions.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/simulation/processTransitions.test.ts src/state/simulation/stationControlTransitions.test.ts src/state/useAppStore.test.ts` passed (26 tests)
  - `npm run lint` passed
  - `npm run test` passed (71 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting remaining orchestration clusters from `src/state/useAppStore.ts` (jump-flow action wiring cleanup, consumable/crew action clusters, and failure/report handlers where feasible).
  - Start mapping extracted helper clusters onto slice-aligned modules in `src/state/slices/*` while retaining compatibility wrappers.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting consumable/crew/fridge transfer transitions and sector-jump transition wiring into dedicated modules, then rewired `useAppStore` action handlers to consume those transitions.
- Files:
  - `src/state/simulation/crewConsumableTransitions.ts`
  - `src/state/simulation/crewConsumableTransitions.test.ts`
  - `src/state/world/sectorJumpTransitions.ts`
  - `src/state/world/sectorJumpTransitions.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/simulation/crewConsumableTransitions.test.ts src/state/world/sectorJumpTransitions.test.ts src/state/useAppStore.test.ts` passed (27 tests)
  - `npm run lint` passed
  - `npm run test` passed (78 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting remaining orchestration clusters from `src/state/useAppStore.ts` (failure/report handlers, market sale/economy transitions, and tutorial/reset/pin orchestration where feasible).
  - Start mapping extracted helpers onto slice-aligned modules in `src/state/slices/*` while retaining `useAppStore` compatibility wrappers.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting failure/reset and market sale transition logic into dedicated simulation modules, then rewired `useAppStore` to consume both transitions for `handleFailure` and `sellMarketProduct`.
- Files:
  - `src/state/simulation/failureTransitions.ts`
  - `src/state/simulation/failureTransitions.test.ts`
  - `src/state/simulation/marketTransitions.ts`
  - `src/state/simulation/marketTransitions.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/project-memory.md`
- Validation:
  - `npm run test -- src/state/simulation/failureTransitions.test.ts src/state/simulation/marketTransitions.test.ts src/state/useAppStore.test.ts` passed (24 tests)
  - `npm run lint` passed
  - `npm run test` passed (82 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting remaining orchestration clusters from `src/state/useAppStore.ts` (tutorial/reset/pin orchestration and workspace/panel transitions where feasible).
  - Start mapping extracted transition helpers onto slice-aligned modules in `src/state/slices/*` while retaining compatibility wrappers.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting workspace/UI preference helpers into a dedicated state module, rewiring `useAppStore` to consume it while preserving `DEFAULT_PINNED_QUEST_IDS` compatibility export, and adding focused module tests.
- Files:
  - `src/state/ui/workspacePreferences.ts`
  - `src/state/ui/workspacePreferences.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/ui/workspacePreferences.test.ts src/state/useAppStore.test.ts src/state/simulation/failureTransitions.test.ts src/state/simulation/marketTransitions.test.ts` passed (29 tests)
  - `npm run lint` passed
  - `npm run test` passed (87 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting remaining orchestration clusters from `src/state/useAppStore.ts` (tutorial/reset/pin action transitions, panel move/visibility transitions, and mining action transition wiring).
  - Start mapping extracted helper modules onto slice-aligned modules in `src/state/slices/*` while retaining `useAppStore` compatibility wrappers.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting UI/quest/panel action reducers into a dedicated transitions module, then rewired `useAppStore` action handlers to consume those helpers while preserving behavior.
- Files:
  - `src/state/ui/uiActionTransitions.ts`
  - `src/state/ui/uiActionTransitions.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/ui/uiActionTransitions.test.ts src/state/ui/workspacePreferences.test.ts src/state/useAppStore.test.ts` passed (31 tests)
  - `npm run lint` passed
  - `npm run test` passed (93 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting remaining orchestration clusters from `src/state/useAppStore.ts` (mining/extraction action transitions and tutorial progress orchestration state reducer).
  - Start mapping extracted helper modules onto slice-aligned modules in `src/state/slices/*` while retaining `useAppStore` compatibility wrappers.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting mining/extraction action transitions and tutorial-progress orchestration into dedicated modules, then rewired `useAppStore` to consume those transitions for `tryFireMiningLaser`, `recordExtractionHit`, and `updateTutorialProgress`.
- Files:
  - `src/state/simulation/extractionTransitions.ts`
  - `src/state/simulation/extractionTransitions.test.ts`
  - `src/state/quests/tutorialStateTransitions.ts`
  - `src/state/quests/tutorialStateTransitions.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/simulation/extractionTransitions.test.ts src/state/quests/tutorialStateTransitions.test.ts src/state/useAppStore.test.ts` passed (26 tests)
  - `npm run lint` passed
  - `npm run test` passed (99 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting remaining orchestration clusters from `src/state/useAppStore.ts` (process action registry wiring, hydration/reset orchestration, and persistence/reset side-effect wrappers).
  - Start mapping extracted helper modules onto slice-aligned modules in `src/state/slices/*` while retaining `useAppStore` compatibility wrappers.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting process-action wiring into a dedicated simulation binding module, then rewired `useAppStore` to compose process actions through `buildProcessActionBindings(...)`.
- Files:
  - `src/state/simulation/processActionBindings.ts`
  - `src/state/simulation/processActionBindings.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/simulation/processActionBindings.test.ts src/state/useAppStore.test.ts` passed (21 tests)
  - `npm run lint` passed
  - `npm run test` passed (100 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting remaining orchestration clusters from `src/state/useAppStore.ts` (hydration/reset orchestration and persistence/reset side-effect wrappers).
  - Start mapping extracted helper modules onto slice-aligned modules in `src/state/slices/*` while retaining `useAppStore` compatibility wrappers.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting hydrated offline catchup orchestration and inventory persistence side-effect wrappers into dedicated modules, then rewired `useAppStore` to consume both modules while preserving behavior.
- Files:
  - `src/state/runtime/offlineCatchupHydration.ts`
  - `src/state/runtime/offlineCatchupHydration.test.ts`
  - `src/state/persistence/inventoryPersistence.ts`
  - `src/state/persistence/inventoryPersistence.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/persistence/inventoryPersistence.test.ts src/state/runtime/offlineCatchupHydration.test.ts src/state/useAppStore.test.ts` passed (27 tests)
  - `npm run lint` passed
  - `npm run test` passed (111 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting remaining orchestration clusters from `src/state/useAppStore.ts` (store bootstrap initialization and simple setter/action binding clusters).
  - Start mapping extracted helper modules onto slice-aligned modules in `src/state/slices/*` while retaining `useAppStore` compatibility wrappers.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting startup/bootstrap initialization and simple setter/action binding clusters into dedicated modules, then rewired `useAppStore` to consume those modules while preserving runtime behavior.
- Files:
  - `src/state/runtime/storeBootstrap.ts`
  - `src/state/runtime/storeBootstrap.test.ts`
  - `src/state/ui/basicStateActionBindings.ts`
  - `src/state/ui/basicStateActionBindings.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/runtime/storeBootstrap.test.ts src/state/ui/basicStateActionBindings.test.ts src/state/useAppStore.test.ts` passed (26 tests)
  - `npm run lint` passed
  - `npm run test` passed (117 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue store decomposition by extracting remaining orchestration clusters from `src/state/useAppStore.ts` (world-session/process/tick action wrappers and persistence wiring toward slice-owned modules).
  - Start mapping extracted helper modules onto slice-aligned modules in `src/state/slices/*` while retaining `useAppStore` compatibility wrappers.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting world-session/simulation action wrappers and consumable/failure/market action wrappers into dedicated binding modules, then rewired `useAppStore` to compose those bindings while preserving behavior.
- Files:
  - `src/state/world/worldSessionActionBindings.ts`
  - `src/state/world/worldSessionActionBindings.test.ts`
  - `src/state/simulation/simulationActionBindings.ts`
  - `src/state/simulation/simulationActionBindings.test.ts`
  - `src/state/simulation/resourceActionBindings.ts`
  - `src/state/simulation/resourceActionBindings.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/simulation/resourceActionBindings.test.ts src/state/useAppStore.test.ts` passed (23 tests)
  - `npm run lint` passed
  - `npm run test` passed (125 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
  - `npm run filesize:check` passed (`src/state/useAppStore.ts` now 799 LOC)
- Follow-ups:
  - Continue store decomposition by extracting the remaining orchestration clusters from `src/state/useAppStore.ts` (mining/world-depletion wrappers, station-control wrappers, and UI/tutorial/workspace wrappers) into dedicated binding modules.
  - Start splitting `src/state/useAppStore.test.ts` into module-focused suites aligned to the new action binding modules.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting station-control and UI/tutorial/workspace action wrappers into dedicated binding modules, then rewired `useAppStore` to compose those bindings while preserving behavior.
- Files:
  - `src/state/simulation/stationControlActionBindings.ts`
  - `src/state/simulation/stationControlActionBindings.test.ts`
  - `src/state/ui/uiWorkflowActionBindings.ts`
  - `src/state/ui/uiWorkflowActionBindings.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/simulation/stationControlActionBindings.test.ts src/state/ui/uiWorkflowActionBindings.test.ts src/state/useAppStore.test.ts` passed (26 tests)
  - `npm run lint` passed
  - `npm run test` passed (131 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
  - `npm run filesize:check` passed (`src/state/useAppStore.ts` now 664 LOC)
- Follow-ups:
  - Continue store decomposition by extracting the remaining orchestration clusters from `src/state/useAppStore.ts` (mining/world-depletion wrappers and hydration/mining debug wrapper actions) into dedicated binding modules.
  - Start splitting `src/state/useAppStore.test.ts` into module-focused suites aligned to extracted binding modules.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting mining/extraction and world-target depletion wrappers into dedicated binding modules, then rewired `useAppStore` to compose those bindings while preserving behavior.
- Files:
  - `src/state/simulation/extractionActionBindings.ts`
  - `src/state/simulation/extractionActionBindings.test.ts`
  - `src/state/world/worldTargetActionBindings.ts`
  - `src/state/world/worldTargetActionBindings.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/simulation/extractionActionBindings.test.ts src/state/world/worldTargetActionBindings.test.ts src/state/useAppStore.test.ts` passed (25 tests)
  - `npm run lint` passed
  - `npm run test` passed (136 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
  - `npm run filesize:check` passed (`src/state/useAppStore.ts` now 573 LOC)
- Follow-ups:
  - Continue store decomposition by extracting remaining runtime wrappers from `src/state/useAppStore.ts` (`hydrateInventory` and `resetAllProgress`) into dedicated action bindings.
  - Start splitting `src/state/useAppStore.test.ts` into module-focused suites aligned to extracted binding modules.

## 2026-02-22 - Codex
- Summary: Started integration-test decomposition for `useAppStore` by splitting world/hydration/consumable scenarios into focused files and keeping quest/reward scenarios in the primary test file.
- Files:
  - `src/state/useAppStore.test.ts`
  - `src/state/useAppStore.world.integration.test.ts`
  - `src/state/useAppStore.hydration.integration.test.ts`
  - `src/state/useAppStore.consumables.integration.test.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run test -- src/state/useAppStore.test.ts src/state/useAppStore.world.integration.test.ts src/state/useAppStore.hydration.integration.test.ts src/state/useAppStore.consumables.integration.test.ts` passed (20 tests)
  - `npm run lint` passed
  - `npm run test` passed (136 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
  - `npm run filesize:check` passed (`src/state/useAppStore.test.ts` now 1100 LOC)
- Follow-ups:
  - Continue store decomposition by extracting remaining runtime wrappers from `src/state/useAppStore.ts` (`hydrateInventory` and `resetAllProgress`) into dedicated action bindings.
  - Continue `useAppStore` test decomposition by splitting the remaining quest-heavy scenarios into focused suites.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting runtime lifecycle wrappers into dedicated runtime action bindings, then rewired `useAppStore` to compose `hydrateInventory` and `resetAllProgress` via runtime bindings.
- Files:
  - `src/state/runtime/runtimeActionBindings.ts`
  - `src/state/runtime/runtimeActionBindings.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (138 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
  - `npm run filesize:check` passed (`src/state/useAppStore.ts` now 569 LOC)
- Follow-ups:
  - Continue splitting remaining quest-heavy integration scenarios from `src/state/useAppStore.test.ts` into focused suites.
  - Continue extracting remaining orchestration closures from `src/state/useAppStore.ts`.

## 2026-02-22 - Codex
- Summary: Completed the quest-heavy `useAppStore` integration test split by moving reward, progression, and fridge/backfill scenarios into focused suites, reducing `src/state/useAppStore.test.ts` to baseline invariant coverage.
- Files:
  - `src/state/useAppStore.test.ts`
  - `src/state/useAppStore.quest-rewards.integration.test.ts`
  - `src/state/useAppStore.quest-progression.integration.test.ts`
  - `src/state/useAppStore.fridge.integration.test.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test -- src/state/useAppStore.test.ts src/state/useAppStore.quest-rewards.integration.test.ts src/state/useAppStore.quest-progression.integration.test.ts src/state/useAppStore.fridge.integration.test.ts` passed (11 tests)
  - `npm run test` passed (138 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
  - `npm run filesize:check` passed (`src/state/useAppStore.quest-rewards.integration.test.ts` now 542 LOC, `src/state/useAppStore.test.ts` now 15 LOC)
- Follow-ups:
  - Continue store decomposition by extracting remaining orchestration closures in `src/state/useAppStore.ts` (`updateTutorialProgress` side-effect orchestration and offline-catchup adapter glue).
  - Start migration from extracted compatibility bindings into slice-owned modules under `src/state/slices/*`.

## 2026-02-22 - Codex
- Summary: Continued decomposition by extracting remaining runtime orchestration closures into a dedicated runtime module, then rewired `useAppStore` to compose tutorial-progress updates, offline catchup hydration application, and UI preference persistence through that module.
- Files:
  - `src/state/runtime/runtimeStoreOrchestration.ts`
  - `src/state/runtime/runtimeStoreOrchestration.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test -- src/state/runtime/runtimeStoreOrchestration.test.ts src/state/runtime/runtimeActionBindings.test.ts src/state/useAppStore.hydration.integration.test.ts src/state/useAppStore.quest-rewards.integration.test.ts src/state/useAppStore.quest-progression.integration.test.ts src/state/useAppStore.fridge.integration.test.ts src/state/useAppStore.world.integration.test.ts` passed (20 tests)
  - `npm run test` passed (141 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
  - `npm run filesize:check` passed (`src/state/useAppStore.ts` now 509 LOC)
- Follow-ups:
  - Start migration from extracted compatibility bindings into slice-owned modules under `src/state/slices/*` with `useAppStore` as a thin composition layer.
  - Continue splitting or modularizing integration hotspots if they approach size-budget limits (`src/state/useAppStore.quest-rewards.integration.test.ts`).

## 2026-02-22 - Codex
- Summary: Continued slice-owned composition migration by extracting app-wide store typing and initial-state assembly into dedicated modules, then rewired `useAppStore` into a thin wiring shell (`~118 LOC`) that composes bootstrap + action slices.
- Files:
  - `src/state/appStoreState.ts`
  - `src/state/slices/appInitialState.ts`
  - `src/state/slices/appInitialState.test.ts`
  - `src/state/useAppStore.ts`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test -- src/state/slices/appInitialState.test.ts src/state/slices/appActionSlices.test.ts src/state/useAppStore.test.ts` passed (3 tests)
  - `npm run test` passed (143 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue migrating toward true slice-owned state/action creators under `src/state/slices/*` so `src/state/store.ts` can become the primary composition entrypoint.
  - Decouple selector type imports from `@state/useAppStore` to `@state/appStoreState` to remove incidental coupling to the store factory module.

## 2026-02-22 - Codex
- Summary: Continued store entrypoint migration by decoupling selector types from the store factory (`AppState` now sourced from `@state/appStoreState`), re-exporting canonical store surfaces from `src/state/store.ts`, and switching app/UI consumers from `@state/useAppStore` to `@state/store`.
- Files:
  - `src/state/selectors/gameScreenSelectors.ts`
  - `src/state/selectors/questUiSelectors.ts`
  - `src/state/store.ts`
  - `src/store/useAppStore.ts`
  - `src/app/routes/GameScreen.tsx`
  - `src/components/GameModal.tsx`
  - `src/components/ShipStatusBar.tsx`
  - `src/components/TutorialOverlay.tsx`
  - `src/components/overlay/*` (store import path updates)
  - `src/components/panels/*` (store import path updates)
  - `src/state/runtime/offlineCatchupHydration.test.ts`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test -- src/state/selectors/gameScreenSelectors.ts src/state/selectors/questUiSelectors.ts src/state/runtime/offlineCatchupHydration.test.ts` passed (4 tests)
  - `npm run test` passed (143 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue moving composition ownership from compatibility wiring into concrete slice creators so `useAppStoreV2` can converge with the canonical store.
  - Evaluate introducing a single public store barrel (`@state/store`) for tests as well, with local `./useAppStore` imports retained only where direct module-coupled behavior is under test.

## 2026-02-22 - Codex
- Summary: Converged canonical store ownership by moving runtime store composition/persistence wiring out of `src/state/useAppStore.ts` into `src/state/storeRuntime.ts`, keeping `src/state/store.ts` as the public canonical entrypoint, and reducing `src/state/useAppStore.ts` to compatibility re-exports.
- Files:
  - `src/state/storeRuntime.ts`
  - `src/state/store.ts`
  - `src/state/useAppStore.ts`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (143 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue slice convergence by incrementally migrating behavior from compatibility runtime composition toward concrete slice creator modules so `useAppStoreV2` can be retired.
  - Keep `src/state/store.ts` as the stable import surface while moving implementation details under internal modules (`storeRuntime`, `slices/*`).

## 2026-02-22 - Codex
- Summary: Continued slice convergence by extracting runtime store construction into `src/state/slices/runtimeStoreSlice.ts`, slimming `src/state/storeRuntime.ts` to orchestration/persistence wiring, and retiring `useAppStoreV2` to a compatibility alias on the canonical `useAppStore`.
- Files:
  - `src/state/slices/runtimeStoreSlice.ts`
  - `src/state/storeRuntime.ts`
  - `src/state/store.ts`
  - `docs/project-memory.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (143 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue migrating world/simulation scaffolds from `useAppStoreV2`-era slice prototypes into production slice creators that can replace compatibility composition layers in `storeRuntime`.
  - Add focused unit tests for `runtimeStoreSlice` wiring if we introduce additional branching logic there.

## 2026-02-22 - Codex
- Summary: Completed the `useAppStoreV2` scaffold retirement by deleting unused `simulation/world` slice prototype files, removing the `useAppStoreV2` export from the canonical store surface, and keeping runtime composition in `storeRuntime` + `runtimeStoreSlice`.
- Files:
  - `src/state/slices/simulationSlice.ts` (deleted)
  - `src/state/slices/worldSlice.ts` (deleted)
  - `src/state/store.ts`
  - `docs/project-memory.md`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (143 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Continue converging slice-owned runtime modules by moving additional `storeRuntime` orchestration concerns behind focused slice builders where it improves testability without regressing file-size budgets.
  - Keep `@state/store` as the sole public import surface for store access.

## 2026-02-22 - Codex
- Summary: Performed historical-doc cleanup pass by marking retired slice scaffold references as historical in the architecture checkpoint and syncing memory text with the current canonical store shape.
- Files:
  - `docs/project-memory.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/worklog.md`
- Validation:
  - Docs consistency pass only (no runtime code changes)
- Follow-ups:
  - Keep historical checkpoints explicit about snapshot date to avoid future confusion between historical scaffolds and active architecture.

## 2026-02-22 - Codex
- Summary: Finished store-path convergence by updating active standards/tickets/memory docs to canonical store modules (`@state/store`, `src/state/storeRuntime.ts`, `src/state/slices/runtimeStoreSlice.ts`), annotating architecture plan history as archival where old `useAppStore` references remain, and validating the full quality gate after the compatibility-file removal.
- Files:
  - `docs/project-memory.md`
  - `docs/quest-system-standard-v1.md`
  - `docs/tickets-crew-v1.md`
  - `docs/tickets-sectors-v1.md`
  - `docs/tickets-viewport-v1.md`
  - `docs/architecture-scaleout-plan-v1.md`
  - `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`
  - `docs/worklog.md`
- Validation:
  - `npm run lint` passed
  - `npm run test` passed (143 tests)
  - `npm run build` passed
  - `npm run quality:check` passed
  - `npm run wiki:check` passed
- Follow-ups:
  - Keep `docs/worklog.md` and dated checkpoint docs append-only; prefer short "historical note" markers instead of rewriting old tranche records.
  - Continue shrinking remaining large runtime/UI hotspots tracked by `filesize:check` (`SpaceViewport`, `GameScreen`, `sceneBuilder`, `CrewOverlay`).
