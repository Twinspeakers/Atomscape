# Viewport Refactor Tickets (v1)

## Goal
Replace the current shooter-style Babylon canvas with an orbital operations layer that reflects the real game loop:
fly -> salvage/mine mixed matter -> return to station -> process -> manufacture -> sell -> sustain crew.

## Scope Boundaries
- Keep current controls and UI shell unless required by ticket scope.
- Keep simulation authority in engine/systems; viewport is renderer + input.
- No full map/sector streaming in this phase.

## Delivery Order
1. VPT1
2. VPT2
3. VPT3
4. VPT4
5. VPT5
6. VPT6
7. VPT7
8. VPT8

---

## VPT1 - World Model + Seeded Cleanup Targets
- Priority: P0
- Status: Completed (2026-02-18)
- Goal: Define deterministic in-space targets (asteroids + junk classes + zones) instead of fully random sphere spawning.
- Scope:
  - Add world spec/catalog for target classes and zone distributions.
  - Add seeded generation helpers so runs are reproducible.
  - Add target metadata needed by UI/tooltips/quests (type, risk, expected yields, integrity).
- File Map:
  - `src/domain/spec/worldSpec.ts` (new)
  - `src/domain/world/cleanupCatalog.ts` (new)
  - `src/features/simulation/math.ts` (seed helpers if needed)
  - `src/state/types.ts` (extend selected/radar target types)
- Acceptance:
  - World generation from the same seed gives the same target set.
  - Target classes include at least: rock body, metal scrap, composite junk, volatile ice chunk.
  - Each target class defines mixed output profile (not pure element output).

## VPT2 - Engine-Bound Extraction Outcome System
- Priority: P0
- Status: Completed (2026-02-18)
- Goal: Move extraction results to simulation systems so viewport only reports interactions.
- Scope:
  - Add extraction system to resolve laser/salvage hits into process-compatible mixed resources.
  - Tie energy costs and debuff multipliers to canonical constants.
  - Emit structured extraction events for logs, quests, and future analytics.
- File Map:
  - `src/features/simulation/systems/extraction.ts` (new)
  - `src/features/simulation/engine.ts` (wire new system)
  - `src/domain/spec/gameSpec.ts` (new extraction constants if needed)
  - `src/state/simulation/extractionActionBindings.ts` (replace direct viewport-driven mining effects with system calls)
- Acceptance:
  - Mining/salvage resource outcomes come from the new system, not direct viewport logic.
  - Energy accounting remains deterministic and testable.
  - Existing lab chain remains functional with new extracted inputs.

## VPT3 - Viewport Split: Renderer/Input vs Gameplay State
- Priority: P0
- Status: Completed (2026-02-19)
- Goal: Refactor viewport into a clear boundary where world truth comes from state/systems.
- Scope:
  - Split scene setup, controls, and interaction handlers into focused modules.
  - Introduce a view model contract for renderable targets and station telemetry.
  - Remove hidden gameplay coupling from render loop.
- File Map:
  - `src/features/viewport/SpaceViewport.tsx` (new target path)
  - `src/features/viewport/sceneBuilder.ts` (new)
  - `src/features/viewport/inputController.ts` (new)
  - `src/features/viewport/targetRendering.ts` (new)
  - `src/game/SpaceViewport.tsx` (compatibility export or removal)
  - `src/app/routes/GameScreen.tsx` (import path update)
- Acceptance:
  - Viewport module has no inventory mutation logic.
  - State updates occur through explicit callbacks/actions only.
  - Existing pause/input suppression behavior still works.

## VPT4 - Station-Centric Operations in World Space
- Priority: P0
- Status: Completed (2026-02-19)
- Goal: Make the station loop visible and actionable in the 3D world.
- Scope:
  - Add visible charge radius ring (50m), station beacon, and docking affordance.
  - Surface in-world feedback for charging state transitions (in range/out of range/blocked).
  - Keep manual distance slider as test fallback only.
- File Map:
  - `src/features/viewport/SpaceViewport.tsx`
  - `src/state/simulation/stationControlActionBindings.ts`
  - `src/state/storeRuntime.ts`
  - `src/components/overlay/LaboratoryOverlay.tsx` (wording/telemetry alignment)
  - `src/domain/spec/gameSpec.ts` (reuse existing charging constants)
- Acceptance:
  - Player can visually see when inside/outside charging range.
  - Charging auto-stops when out of range exactly as simulation defines.
  - Dock/undock state is clearly represented in-world and in UI.

## VPT5 - Target Taxonomy + Radar/Object Panel Upgrade
- Priority: P1
- Status: Completed (2026-02-19)
- Goal: Upgrade selection/radar so cleanup targets are understandable and actionable.
- Scope:
  - Extend object/radar data model for target class, risk, expected material profile.
  - Show meaningful target type labels in `ObjectPanel` and radar contacts.
  - Keep concise readability in panel hierarchy.
- File Map:
  - `src/state/types.ts`
  - `src/state/storeRuntime.ts`
  - `src/state/world/worldTargetActionBindings.ts`
  - `src/components/panels/ObjectPanel.tsx`
  - `src/components/panels/HudPanel.tsx`
  - `src/features/viewport/SpaceViewport.tsx`
- Acceptance:
  - Selecting any target shows a non-generic description and class-specific metadata.
  - Radar contacts include class-aware data beyond element symbol.

## VPT6 - Quest Integration with In-Space Objectives
- Priority: P1
- Status: Completed (2026-02-19)
- Goal: Ensure quests reference real world actions, not only lab/UI clicks.
- Scope:
  - Add quest predicates for world tasks (approach zone, salvage junk class, return to station).
  - Bind focus targets to in-space markers where applicable.
  - Update quest detail text to reflect the new orbital operations flow.
- File Map:
  - `src/features/quests/questDefinitions.ts`
  - `src/state/runtime/runtimeStoreOrchestration.ts`
  - `src/state/storeRuntime.ts`
  - `src/components/TutorialOverlay.tsx`
  - `src/components/GameModal.tsx`
  - `src/wiki/pages/reference-quests.mdx` (generated via sync)
- Acceptance:
  - Main quest progression includes at least one explicit in-space cleanup objective.
  - Quest focus controls can route player attention to relevant world target/station step.

## VPT7 - Persistence for World Session State
- Priority: P2
- Status: Completed (2026-02-19)
- Goal: Persist enough world state to avoid full reset feel on every refresh.
- Scope:
  - Store world seed and minimal target state snapshot (destroyed/remaining counts, zone status).
  - Rehydrate viewport world from persisted snapshot on load.
  - Keep save format versioned for migration safety.
- File Map:
  - `src/platform/db/gameDb.ts`
  - `src/state/storeRuntime.ts`
  - `src/state/runtime/snapshotPersistence.ts`
  - `src/game/SpaceViewport.tsx`
  - `src/features/viewport/SpaceViewport.tsx`
  - `src/state/types.ts`
- Acceptance:
  - Reloading retains the same world layout and target depletion state for current session.
  - Corrupt/old snapshot fails safely to default seeded world.

## VPT8 - Validation + Docs/Wiki Sync Gate
- Priority: P0
- Status: Completed (2026-02-19)
- Goal: Keep the refactor coherent with docs-driven workflow and avoid drift.
- Scope:
  - Add/extend deterministic tests for extraction and world-model invariants.
  - Update project memory/architecture/worklog as tickets land.
  - Regenerate wiki references and ensure CI gate covers the new truth.
- File Map:
  - `src/features/simulation/engine.test.ts`
  - `docs/project-memory.md`
  - `docs/architecture.md`
  - `docs/worklog.md`
  - `src/wiki/pages/reference-systems.mdx` (generated)
  - `src/wiki/pages/reference-quests.mdx` (generated)
- Acceptance:
  - `npm run lint`, `npm run test`, `npm run wiki:check`, `npm run build` pass.
  - Docs reflect new viewport architecture and obsolete statements are removed.

---

## Definition of Done (Viewport v1)
- Canvas behavior reflects the economy/survival simulation loop instead of standalone combat loop.
- Extraction in world is mixed-material and engine-authoritative.
- Station relationship (distance, charge, docking) is explicit in-world.
- Quests and wiki describe the same mechanics the player experiences.
