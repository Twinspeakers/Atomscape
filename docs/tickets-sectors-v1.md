# Sector System Tickets (v1)

## Goal
Evolve the viewport from a single cleanup field into a multi-sector orbital network with per-sector stations, target catalogs, and progression-ready resource expansion.

## Scope Boundaries
- Reuse current `SpaceViewport` architecture; avoid a full renderer rewrite.
- Keep simulation authority in engine/store systems; viewport remains presentation + input.
- Deliver in slices that preserve current quest flow and save compatibility.

## Locked Product Decisions (2026-02-21)
- Default starting sector for new saves: `Earth Corridor`.
- `Earth Corridor` is available immediately (not progression-locked).
- Sector travel is currently free (no energy/credit cost, no cooldown).
- Sector travel can be triggered anytime.
- On failure, respawn at station in the current sector.
- Sector depletion/population state remains fully independent per sector.
- In `Earth Corridor`, Earth is rendered as a skybox/background celestial (non-collidable).
- Long-duration mining controls:
  - Hold `E` to mine continuously while in range.
  - Press `=` to keep mining active.
  - Mining can be interrupted by collision events.
- Travel UX target:
  - Primary: in-world physical portal gate.
  - Secondary: Game Menu map section (shortcut plan: `M` for map, store moved off `M`).

## Delivery Order
1. SCT1
2. SCT2
3. SCT3
4. SCT4
5. SCT5
6. SCT6

## Progress Snapshot (2026-02-21)
- SCT1: Partially implemented (active sector state + per-sector world-session persistence + legacy migration fallback).
- SCT2: Partially implemented (sector catalog + sectorized world generation + sector-specific celestial presets).
- SCT3: Partially implemented (portal-triggered sector transit + Game Menu map + hotkey routing + cross-sector map telemetry). Remaining UX polish and transition effects are pending.
- SCT4: Started (first long-duration extraction nodes added with sustained mining controls and collision interruption behavior).
- SCT7: Deferred (hybrid moon proxy was rolled back; Earth/Moon remain background-only visuals for now).

---

## SCT1 - Sector State Model + Persistence
- Priority: P0
- Goal: Introduce first-class sectors in state and persistence.
- Scope:
  - Add `SectorId` and active-sector state.
  - Persist per-sector world session snapshot (`seed`, depleted targets, last ship transform, station state).
  - Add migration path for existing single-sector saves.
- File Map:
  - `src/state/types.ts`
  - `src/state/storeRuntime.ts`
  - `src/state/world/sectorJumpTransitions.ts`
  - `src/platform/db/gameDb.ts`
  - `src/domain/spec/worldSpec.ts` (or new `sectorSpec.ts`)
- Acceptance:
  - Refresh keeps current sector and sector-specific depletion.
  - Existing saves load without breaking and default to the initial sector.

## SCT2 - Sector Catalog + Station Profiles
- Priority: P0
- Goal: Define sector content and station identity cleanly.
- Scope:
  - Create canonical sector catalog:
    - `mars-corridor` (primary early mining loop)
    - `earth-corridor` (Earth junk cleanup loop)
  - Per-sector station config (position, visual identity, charge/dock profile).
  - Per-sector target class weighting and resource profile.
- File Map:
  - `src/domain/spec/sectorSpec.ts` (new)
  - `src/domain/spec/worldSpec.ts`
  - `src/domain/world/cleanupCatalog.ts`
- Acceptance:
  - Each sector has distinct target composition.
  - Each sector spawns a station and charging works in that sector.

## SCT3 - Jump/Warp Flow + Transition UX
- Priority: P0
- Goal: Allow moving between sectors through explicit player action.
- Scope:
  - Add warp action with constraints (energy cost/cooldown/not paused).
  - Add transition UX (fade + sector target name + status log event).
  - Rebuild viewport scene from selected sector context.
- File Map:
  - `src/state/storeRuntime.ts`
  - `src/state/world/sectorJumpTransitions.ts`
  - `src/app/routes/GameScreen.tsx`
  - `src/features/viewport/SpaceViewport.tsx`
  - `src/components/*` (top panel / modal controls)
- Acceptance:
  - Player can jump sectors reliably and return.
  - No quest/state corruption when crossing sectors.

## SCT4 - Long-Duration Extraction Nodes
- Priority: P1
- Goal: Reduce grind from dense one-shot asteroid dependence.
- Scope:
  - Add mineable "deposit nodes" that support sustained extraction while nearby.
  - Add dedicated extraction mode/laser and clear UI state.
  - Balance outputs to reduce overreliance on high asteroid count.
- File Map:
  - `src/domain/spec/worldSpec.ts`
  - `src/features/simulation/systems/extraction.ts`
  - `src/features/viewport/SpaceViewport.tsx`
  - `src/components/panels/ObjectPanel.tsx`
- Acceptance:
  - Player can remain near a node and extract continuously.
  - Early crafting throughput improves without excessive target spam.
- Regression Checklist:
  - Press `=` to enable persistent mining, then press any movement key (`W/A/S/D/R/F`): persistent mining must stop immediately.
  - Hold `E` still works for manual sustained mining while in node range.
  - Collision still interrupts persistent mining.
  - Radar clearly distinguishes extraction nodes from regular cleanup targets.
  - Object panel nearest-contact rows label node contacts as `Extraction Node`.

## SCT5 - Earth Corridor: Landfill/Junk Cleanup Targets
- Priority: P1
- Goal: Add a thematically distinct Earth-adjacent cleanup space.
- Scope:
  - New Earth-specific target classes (landfill pods, derelict debris clusters, etc.).
  - Distinct yields that unlock later processing/manufacturing chains.
  - Quest hooks for Earth cleanup milestones.
- File Map:
  - `src/domain/spec/worldSpec.ts`
  - `src/domain/world/cleanupCatalog.ts`
  - `src/features/quests/questDefinitions.ts`
  - `src/wiki/pages/*` (generated/manual docs updates)
- Acceptance:
  - Earth Corridor feels mechanically and visually different from Mars Corridor.
  - Quests can target Earth-specific cleanup objectives.

## SCT6 - Celestial Context + Eclipse Readability Pass
- Priority: P2
- Goal: Improve spatial readability and occasional eclipse moments.
- Scope:
  - Sector-specific celestial layouts (Mars + moons, Earth + moon, sun direction).
  - Render Earth as a background/skybox body in `Earth Corridor`; keep gameplay-collidable celestial objects local and limited.
  - Tune orbital timing/scale for visible, believable eclipses.
  - Keep performance stable with distant non-interactive bodies.
- File Map:
  - `src/features/viewport/sceneBuilder.ts`
  - `src/features/viewport/SpaceViewport.tsx`
  - `src/domain/spec/sectorSpec.ts`
- Acceptance:
  - Celestial bodies clearly communicate which sector the player is in.
  - Earth remains a readable distant backdrop in `Earth Corridor` with no collision/physics overhead.
  - Eclipse-style lighting moments occur without impacting gameplay controls/perf.

## SCT7 - Hybrid Moon Encounter Proxy (Future)
- Priority: P3
- Goal: Support occasional moon encounter gameplay while keeping normal celestial rendering lightweight.
- Scope:
  - Keep a background moon representation active for long-range readability.
  - Spawn/despawn an in-world collidable moon proxy during defined orbital phase windows.
  - Blend between background moon and proxy to avoid visual popping.
  - Keep the proxy non-authoritative for global orbital simulation (encounter object only).
- File Map:
  - `src/features/viewport/sceneBuilder.ts`
  - `src/features/viewport/SpaceViewport.tsx`
  - `src/domain/spec/sectorSpec.ts`
- Acceptance:
  - Moon remains visible at all times via background representation.
  - Encounter window introduces a collidable moon proxy without destabilizing flight/collision systems.
  - Transition in/out of encounter window is smooth and performance-stable.

---

## Definition of Done (Sectors v1)
- Two sectors are playable with independent persistence.
- Sector jump flow is reliable, readable, and quest-safe.
- Mining loop supports both short-hit targets and long-duration extraction nodes.
- Sector content differences are meaningful (resources + targets + station identity).
