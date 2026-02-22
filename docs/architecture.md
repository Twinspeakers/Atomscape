# Architecture Blueprint

## Goal
Align code organization with long-term delivery: simulation-first systems, feature modules, and stable boundaries.

## Target Structure
```text
src/
  app/                # app entry + route composition
  features/           # UI and feature flows (quests, lab, overlays, menus, viewport)
  domain/             # game data models and catalogs (resources, elements, recipes)
  state/              # app state orchestration (zustand slices/stores)
  platform/           # adapters to external APIs/storage (Dexie, persistence)
  shared/             # reusable primitives/hooks/utils
```

## Current Migration Status
- `src/app/` created and active for app entry + game route.
- `src/features/simulation/` created and active for deterministic tick systems + engine (station/containment/recombination/market/process/crew).
- `src/state/` created and active for app store/types.
- `src/domain/` created and active for resources/elements catalogs.
- `src/domain/spec/` created and active for canonical simulation constants, market definitions, and lab process catalog.
- `src/platform/` created and active for DB adapter.
- Simulation boundary has initial automated coverage via Vitest (`src/features/simulation/engine.test.ts`).
- Extraction boundary is now explicit in `src/features/simulation/systems/extraction.ts`; viewport reports target-hit payloads and store resolves outcomes through engine exports.
- Viewport boundary split is fully feature-local in `src/features/viewport/*` (`SpaceViewport`, `sceneBuilder`, `inputController`, `targetRendering`, shared types); `src/game/SpaceViewport.tsx` is now compatibility-only re-export.
- Quest integration now consumes world telemetry/actions through store state (`activeCleanupZoneId`, extraction events, station return) with 3D quest focus markers rendered in viewport.
- World-session persistence now stores viewport world identity/progress (`seed`, depleted targets, zone/class counters) in Dexie and hydrates those values before rendering the space scene.
- Legacy paths (`src/store`, `src/data`, `src/db`, `src/routes`, `src/App.tsx`) are compatibility re-exports.

## Import Rules
- New code should import from:
  - `@app/*`
  - `@features/*`
  - `@domain/*`
  - `@state/*`
  - `@platform/*`
  - `@shared/*`
- Legacy import paths are transitional only.

## Next Refactor Phases
1. Move UI components into `src/features/*` with per-feature boundaries.
2. Split `useAppStore` into focused state modules:
   - `state/simulation`
   - `state/economy`
   - `state/quests`
   - `state/ui`
3. Introduce `domain/recipes` and `domain/quests` as source-of-truth data.
4. Expand deterministic simulation engine coverage from tick systems to full recipe/process execution.
5. Remove legacy re-export wrappers once all imports are migrated.
