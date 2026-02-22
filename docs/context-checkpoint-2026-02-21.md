# Context Checkpoint - 2026-02-21

## Why This Exists
- This file is a hard checkpoint for continuity before context compaction.
- It captures current product decisions, in-progress code state, and immediate next execution steps.

## Current Direction (Locked)
- Project remains docs-driven and simulation-first.
- We are now in the **sector architecture pass**.
- Start sector for new saves: **Earth Corridor**.
- Earth Corridor is available immediately (not progression-locked).
- Sector travel model target:
  - long-term UX: physical portal in-world
  - map UX: Game Menu map support to be added
  - initial rule: travel is free (no energy/credit cost, no cooldown).
- Warp/jump rule: allowed anytime.
- Respawn rule on failure: respawn at station in the **current sector**.
- Sector depletion/population: **fully separate per sector**.
- Long-duration mining controls:
  - hold `E` to mine continuously while near a mining node
  - press `=` to toggle persistent mining mode
  - sustained mining should be interruptible by collision.

## What Was Completed Before This Checkpoint
- Major UI polish pass across top/bottom/side panels with coherent styling and hierarchy.
- Cockpit HUD redesign with:
  - segmented arc shell
  - centered speed/temp
  - 4 consumable slots
  - energy cell slot behavior
- Quest system improvements:
  - shared quest model between quick panel + game menu
  - reward modal + reward history
  - dynamic progression/regression behavior
  - active main quest selection and pin logic refinement
- Crew systems foundation:
  - four crew members
  - hunger/thirst/sleep simulation
  - fridge unlock/reward behavior
  - crew page in game menu
- World/session persistence foundation with seeded cleanup world and depletion tracking.

## Sector Pass - In-Progress Code Status

### Implemented in code
- Added sector specification module:
  - `src/domain/spec/sectorSpec.ts`
  - includes sector ids, catalog, default start sector, sector zone definitions, helpers.
- Extended shared types for sector/map:
  - `src/state/types.ts`
  - added `map` section in `GameMenuSection`
  - added optional `activeSectorId` in station state.
- Extended world session row shape:
  - `src/platform/db/gameDb.ts`
  - `WorldSessionRow` now includes optional `sectorId`.
- Scene builder sectorization started:
  - `src/features/viewport/sceneBuilder.ts`
  - scene now resolves sector definition
  - target generation uses sector zones
  - added per-sector celestial preset branch (`earthMoon` / `marsMoons`)
  - added portal gate mesh + portal destination in scene result
  - scene result now returns `cleanupZones`.
- Viewport wiring started:
  - `src/features/viewport/types.ts`
  - `SpaceViewportProps` now include `activeSectorId?` and `onPortalTransit?`
  - `src/features/viewport/SpaceViewport.tsx`
  - passes `sectorId` into scene build
  - consumes returned `cleanupZones`, `portalGate`, and portal destination metadata.

### Not finished yet
- Portal transit runtime logic not completed in viewport loop.
- Sustained mining (`E` + `=` toggle) not implemented yet.
- Collision interruption for sustained mining not implemented yet.
- Store-level sector authority not finished:
  - no first-class `activeSectorId` in app state yet
  - no per-sector world-session persistence row strategy yet
  - no `jumpToSector` action yet.
- Game menu/hotkey updates not finished:
  - map section not implemented yet
  - store/map shortcut remap pending (`M` -> map, store to another key such as `O`).

## Immediate Execution Plan (Next Pass)
1. Finish `SpaceViewport` runtime behavior:
   - portal enter detection and transit callback
   - sustained mining control state + toggle + interruption.
2. Finish store sector model:
   - add `activeSectorId`
   - add sector jump action
   - migrate world session persistence to per-sector rows with backward compatibility.
3. Wire `GameScreen` + `GameModal`:
   - pass sector props into viewport
   - add `Map` section and sector jump UI
   - remap hotkeys (`M` map, `O` store).
4. Validate:
   - lint/build/tests
   - docs updates (`project-memory.md`, `worklog.md`, `tickets-sectors-v1.md`).

## Notes For Future Refactors
- Keep docs and code synchronized: when UX moves systems across panels/pages, remove obsolete UI and dead code immediately.
- Keep quest copy aligned with real mechanics and avoid hidden prerequisites.
- Prefer one canonical source per system:
  - sector definitions in `sectorSpec`
  - runtime authority in store/simulation
  - viewport as rendering/input only.
