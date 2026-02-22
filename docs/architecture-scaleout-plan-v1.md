# Architecture Scale-Out Plan v1

## Date
- 2026-02-21

## Objective
Move the project from a code-heavy monolith to a content-first architecture that can scale to:
- thousands of craftable items/recipes
- large quest/crew/tools/elements/compounds catalogs
- multiple sectors/scenes
- wiki/search that stay synchronized automatically

## Execution Status
- Note: this section is append-only progress history; older bullets referencing `src/state/useAppStore.ts` capture past migration tranches and are retained for chronology.
- 2026-02-21: Phase 0 guardrail tooling added.
  - `tools/checks/architecture-boundaries.mjs`
  - `tools/checks/file-size-budget.mjs`
  - baseline snapshots under `tools/checks/baselines/*`
  - npm scripts: `architecture:*`, `filesize:*`, `quality:check`
- 2026-02-21: Phase 1 started with initial slice scaffold:
  - `src/state/slices/simulationSlice.ts` (retired during later convergence)
  - `src/state/slices/worldSlice.ts` (retired during later convergence)
  - `src/state/store.ts` (canonical store entrypoint; `useAppStoreV2` retired)
- 2026-02-21: Phase 1 progress follow-up:
  - `GameScreen` selectors extracted to `src/state/selectors/gameScreenSelectors.ts`
  - store persistence subscriptions moved to `src/state/persistence/storePersistence.ts`
  - `ShipInteriorViewport` promoted to canonical `src/features/viewport/ShipInteriorViewport.tsx`
  - `src/game/ShipInteriorViewport.tsx` now compatibility re-export
- 2026-02-21: Phase 1/2 boundary and selector follow-up:
  - quest-focused selectors extracted to `src/state/selectors/questUiSelectors.ts`
  - `GameModal` and `TutorialOverlay` switched from inline store lambdas to selector imports
  - shared simulation math moved to `src/shared/math/simulationMath.ts` with compatibility re-export in `src/features/simulation/math.ts`
  - `src/domain/world/cleanupCatalog.ts` no longer imports from `@features/*` (domain boundary violation removed)
  - architecture baseline drift improved to `15 current violation(s), 4 resolved vs baseline`
- 2026-02-21: Phase 3 foundation started for resources:
  - added content schemas:
    - `content/schemas/resource.schema.json`
    - `content/schemas/process.schema.json` (skeleton)
    - `content/schemas/recipe.schema.json` (skeleton)
  - migrated resource catalog source-of-truth to content pack:
    - `content/packs/base/resources/resources.base.json`
  - added content build/check pipeline:
    - `tools/content-build/build-resources-registry.mjs`
    - npm scripts: `content:build`, `content:check`, `content:validate`
  - generated runtime registry:
    - `src/generated/registry/resources.ts`
  - switched domain resource catalog to generated registry export:
    - `src/domain/resources/resourceCatalog.ts`
- 2026-02-21: Phase 3 continued with process catalog migration:
  - process schema expanded from skeleton to actionable contract:
    - `content/schemas/process.schema.json`
  - process catalog source-of-truth moved to content pack:
    - `content/packs/base/processes/processes.base.json`
  - process registry generation added:
    - `tools/content-build/build-processes-registry.mjs`
    - generated output: `src/generated/registry/processes.ts`
  - domain process catalog switched to generated registry export:
    - `src/domain/spec/processCatalog.ts`
  - content scripts expanded:
    - `content:build:*` and `content:check:*` now cover resources + processes
- 2026-02-21: Phase 4 foundation started with recipe graph controls:
  - recipe schema expanded from skeleton to actionable contract:
    - `content/schemas/recipe.schema.json`
  - recipe catalog source-of-truth moved to content pack:
    - `content/packs/base/recipes/recipes.base.json`
  - recipe registry generation added:
    - `tools/content-build/build-recipes-registry.mjs`
    - generated output: `src/generated/registry/recipes.ts`
  - recipe domain wrapper added:
    - `src/domain/spec/recipeCatalog.ts`
  - content graph checks added:
    - `tools/content-build/check-content-graph.mjs`
    - npm script: `content:check-graph`
  - `content:check` now validates resources + processes + recipes + dependency graph acyclicity/linkage
- 2026-02-21: Phase 5 adapter progress:
  - wiki generator now reads generated registries directly:
    - `scripts/wiki-sync.ts` imports from `src/generated/registry/resources.ts`
    - `scripts/wiki-sync.ts` imports from `src/generated/registry/processes.ts`
    - `scripts/wiki-sync.ts` imports from `src/generated/registry/recipes.ts`
  - added generated recipe wiki reference page:
  - `src/wiki/pages/reference-recipe-catalog.mdx`
- 2026-02-22: Phase 1 convergence follow-up:
  - runtime store composition moved under:
    - `src/state/storeRuntime.ts`
    - `src/state/slices/runtimeStoreSlice.ts`
  - `src/state/store.ts` now exports only canonical store surface (`useAppStore`)
  - legacy `useAppStoreV2` alias and unused slice scaffold files were removed
    - `src/wiki/generated/wikiGeneratedIndex.ts` updated
- 2026-02-22: Store entrypoint migration cutover completed:
  - compatibility module `src/state/useAppStore.ts` removed
  - store tests now import canonical entrypoint `@state/store`
  - runtime store ownership remains `src/state/storeRuntime.ts` + `src/state/slices/runtimeStoreSlice.ts`
- 2026-02-22: Phase 4 metadata hardening completed for recipe scaling:
  - recipe metadata contract added in pack/schema:
    - required `tier`, `discipline`, `station`, `unlock`
  - recipe registry generator now validates and emits typed metadata fields:
    - `tools/content-build/build-recipes-registry.mjs`
    - `src/generated/registry/recipes.ts`
  - graph checks now enforce progression constraints:
    - unlock prefix/kind validation
    - tier gating (`starter` only for tier 1)
    - dependency tier regression blocking
  - generated recipe wiki reference now includes tier/discipline/station/unlock projection:
    - `scripts/wiki-sync.ts`
    - `src/wiki/pages/reference-recipe-catalog.mdx`
- 2026-02-22: Phase 4 sharding conventions activated:
  - content build + graph pipelines now support optional shard directories for resources/processes/recipes:
    - `tools/content-build/pack-loader.mjs`
    - `tools/content-build/build-resources-registry.mjs`
    - `tools/content-build/build-processes-registry.mjs`
    - `tools/content-build/build-recipes-registry.mjs`
    - `tools/content-build/check-content-graph.mjs`
  - first recipe shard split applied:
    - `content/packs/base/recipes/shards/recipes.market.0012-0015.json`
  - shard-ready base directories pre-created for next catalog migrations:
    - `content/packs/base/items/shards/`
    - `content/packs/base/tools/shards/`
    - `content/packs/base/crew/shards/`
    - `content/packs/base/quests/shards/`
    - `content/packs/base/sectors/shards/`
    - `content/packs/base/scenes/shards/`
    - `content/packs/base/elements/shards/`
    - `content/packs/base/compounds/shards/`
  - base recipe pack now acts as metadata anchor + primary entries:
    - `content/packs/base/recipes/recipes.base.json`
- 2026-02-22: Phase 2 alias migration tranche completed for legacy wrappers:
  - legacy `store/*`, `data/*`, and `db/*` import callsites switched to canonical aliases (`@state`, `@domain`, `@platform`)
  - new canonical resource presentation module introduced:
    - `src/domain/resources/resourcePresentation.ts`
    - `src/data/resourcePresentation.ts` retained as compatibility re-export
  - no-restricted-import warning policy narrowed to relative legacy-wrapper paths only in `eslint.config.js`
  - architecture baseline drift improved to `10 current violation(s), 9 resolved vs baseline`
- 2026-02-22: Phase 5 tooling extraction started:
  - wiki generator implementation moved under tools namespace:
    - `tools/wiki-build/wiki-sync.ts`
  - compatibility wrapper retained at:
    - `scripts/wiki-sync.ts`
  - wiki build tsconfig now includes tools path:
    - `scripts/tsconfig.wiki.json`
- 2026-02-22: Phase 1 store decomposition progressed with pure utility extraction:
  - extracted shared number helpers from monolith:
    - `src/state/utils/numberUtils.ts`
  - extracted world target/session helpers from monolith:
    - `src/state/world/worldStateUtils.ts`
  - extracted crew daily schedule generation from monolith:
    - `src/state/crew/crewScheduleUtils.ts`
  - `src/state/useAppStore.ts` now imports those modules and re-exports:
    - `computeMinActiveWorldTargetCount`
    - `worldSessionRowIdForSector`
  - `src/state/useAppStore.ts` reduced to ~3273 LOC from ~3427 LOC after extraction
- 2026-02-22: Phase 1 decomposition continued with runtime/reward helper extraction:
  - extracted runtime snapshot sanitizers and world-session row sanitization:
    - `src/state/runtime/snapshotSanitizers.ts`
  - extracted quest reward grant + notification formatting helpers:
    - `src/state/quests/rewardUtils.ts`
  - `src/state/useAppStore.ts` now consumes both modules and dropped duplicated helper blocks
  - `src/state/useAppStore.ts` reduced further to ~2764 LOC
- 2026-02-22: Phase 1/5 decomposition continued with quest/tutorial + wiki-build modularization:
  - extracted tutorial progression/evaluation helpers:
    - `src/state/quests/tutorialProgression.ts`
  - `src/state/useAppStore.ts` now consumes tutorial progression module and removed duplicated in-file quest/tutorial helpers
  - decomposed wiki generator implementation into focused modules:
    - `tools/wiki-build/pages/*`
    - `tools/wiki-build/formatters.ts`
    - `tools/wiki-build/generatedIndex.ts`
    - `tools/wiki-build/fileOps.ts`
    - `tools/wiki-build/wiki-sync.ts` now acts as orchestration entrypoint
  - `src/state/useAppStore.ts` reduced further to ~2567 LOC
- 2026-02-22: Phase 1 decomposition continued with runtime snapshot persistence extraction + focused tests:
  - extracted runtime snapshot loading/building/world-session projection helpers:
    - `src/state/runtime/snapshotPersistence.ts`
  - `src/state/useAppStore.ts` now consumes runtime snapshot persistence module and removed duplicated in-file snapshot projection/persistence helpers
  - added focused decomposition safety tests:
    - `src/state/quests/tutorialProgression.test.ts`
    - `tools/wiki-build/wiki-build.test.ts`
  - hardened generated wiki index serialization to escape single quotes across slug/title/summary/tags in:
    - `tools/wiki-build/generatedIndex.ts`
  - `src/state/useAppStore.ts` reduced further to ~2391 LOC
- 2026-02-22: Phase 1 decomposition continued with quest-reward transitions + offline catchup orchestration extraction:
  - extracted quest reward/backfill state transition helpers:
    - `src/state/quests/rewardStateTransitions.ts`
  - extracted simulation orchestration helpers used by offline catchup + tick fallback mirroring:
    - `src/state/simulation/tickOrchestration.ts`
  - `src/state/useAppStore.ts` now consumes both modules and dropped duplicated in-file reward transition + offline catchup loop logic
  - added focused tests for new extraction modules:
    - `src/state/quests/rewardStateTransitions.test.ts`
    - `src/state/simulation/tickOrchestration.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~2271 LOC
- 2026-02-22: Phase 1 decomposition continued with world-session + live tick transition extraction:
  - extracted world-session fallback/hydration/depletion transitions:
    - `src/state/world/worldSessionTransitions.ts`
  - extended simulation orchestration with reusable live tick state transition helper:
    - `src/state/simulation/tickOrchestration.ts` (`runLiveSimulationTick`)
  - `src/state/useAppStore.ts` now consumes both modules for:
    - world-session load/hydrate path
    - world target depletion path
    - `tickSimulation` action body
  - added focused tests:
    - `src/state/world/worldSessionTransitions.test.ts`
    - `src/state/simulation/tickOrchestration.test.ts` (live tick transition coverage)
  - `src/state/useAppStore.ts` reduced further to ~2181 LOC
- 2026-02-22: Phase 1 decomposition continued with process + station/control transition extraction:
  - extracted process-run state transitions:
    - `src/state/simulation/processTransitions.ts`
  - extracted station/control state transitions:
    - `src/state/simulation/stationControlTransitions.ts`
  - `src/state/useAppStore.ts` now consumes those modules for:
    - shared process action handler (`runProcess`) used by all `run*` process actions
    - station/control actions (`setStationDistance*`, `setUseSceneDistance`, `toggleDocked`, `start/stopCharging`, containment toggles)
  - added focused tests:
    - `src/state/simulation/processTransitions.test.ts`
    - `src/state/simulation/stationControlTransitions.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~2078 LOC
- 2026-02-22: Phase 1 decomposition continued with crew-consumable + sector-jump transition extraction:
  - extracted consumable/crew/fridge load transitions:
    - `src/state/simulation/crewConsumableTransitions.ts`
  - extracted sector-jump action wiring transitions:
    - `src/state/world/sectorJumpTransitions.ts`
  - `src/state/useAppStore.ts` now consumes both modules for:
    - `useEnergyCell`, `feedCrewGalaxyBar`, `loadFridgeWater`, `loadFridgeGalaxyBars`
    - `jumpToSector` departure/arrival transition wiring
  - added focused tests:
    - `src/state/simulation/crewConsumableTransitions.test.ts`
    - `src/state/world/sectorJumpTransitions.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~1980 LOC
- 2026-02-22: Phase 1 decomposition continued with failure + market transition extraction:
  - extracted failure/reset transition logic:
    - `src/state/simulation/failureTransitions.ts`
  - extracted market sale transition logic:
    - `src/state/simulation/marketTransitions.ts`
  - `src/state/useAppStore.ts` now consumes both modules for:
    - `handleFailure`
    - `sellMarketProduct`
  - added focused tests:
    - `src/state/simulation/failureTransitions.test.ts`
    - `src/state/simulation/marketTransitions.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~1910 LOC
- 2026-02-22: Phase 1 decomposition continued with workspace/UI preference extraction:
  - extracted workspace dock/layout/preset/storage helpers:
    - `src/state/ui/workspacePreferences.ts`
  - `src/state/useAppStore.ts` now consumes the workspace-preference module while preserving the compatibility export:
    - `DEFAULT_PINNED_QUEST_IDS`
  - added focused tests:
    - `src/state/ui/workspacePreferences.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~1711 LOC
- 2026-02-22: Phase 1 decomposition continued with UI action transition extraction:
  - extracted UI/quest/panel action transitions:
    - `src/state/ui/uiActionTransitions.ts`
  - `src/state/useAppStore.ts` now consumes transition helpers for:
    - `setActiveCleanupZone`, tutorial visibility/reset actions, quest pin/notification actions
    - workspace preset/reset/customizer actions
    - panel move/visibility actions
  - added focused tests:
    - `src/state/ui/uiActionTransitions.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~1614 LOC
- 2026-02-22: Phase 1 decomposition continued with extraction + tutorial-progress transition extraction:
  - extracted mining/extraction action transitions:
    - `src/state/simulation/extractionTransitions.ts`
  - extracted tutorial progress orchestration reducer:
    - `src/state/quests/tutorialStateTransitions.ts`
  - `src/state/useAppStore.ts` now consumes transition helpers for:
    - `tryFireMiningLaser`, `recordExtractionHit`
    - `updateTutorialProgress`
  - added focused tests:
    - `src/state/simulation/extractionTransitions.test.ts`
    - `src/state/quests/tutorialStateTransitions.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~1499 LOC
- 2026-02-22: Phase 1 decomposition continued with process action binding extraction:
  - extracted process action binding helpers:
    - `src/state/simulation/processActionBindings.ts`
  - `src/state/useAppStore.ts` now composes `runRockSorter`..`runEnergyCellAssembler` actions via `buildProcessActionBindings(...)`
  - added focused tests:
    - `src/state/simulation/processActionBindings.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~1453 LOC
- 2026-02-22: Phase 1 decomposition continued with hydration/persistence orchestration extraction:
  - extracted offline catchup hydration orchestration resolver:
    - `src/state/runtime/offlineCatchupHydration.ts`
  - extracted inventory persistence side-effect wrappers:
    - `src/state/persistence/inventoryPersistence.ts`
  - `src/state/useAppStore.ts` now consumes both modules for:
    - hydrated offline catchup orchestration
    - inventory snapshot persistence guard/wrapper calls
  - added focused tests:
    - `src/state/runtime/offlineCatchupHydration.test.ts`
    - `src/state/persistence/inventoryPersistence.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~1330 LOC
- 2026-02-22: Phase 1 decomposition continued with bootstrap + basic action binding extraction:
  - extracted store bootstrap initialization helpers:
    - `src/state/runtime/storeBootstrap.ts`
  - extracted basic setter/action binding helpers:
    - `src/state/ui/basicStateActionBindings.ts`
  - `src/state/useAppStore.ts` now consumes both modules for:
    - startup/bootstrap initialization state
    - simple setter/action bindings (`food/water automation`, `lab/object/comms/telemetry`, `appendSimulationLog`)
  - added focused tests:
    - `src/state/runtime/storeBootstrap.test.ts`
    - `src/state/ui/basicStateActionBindings.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~1206 LOC
- 2026-02-22: Phase 1 decomposition continued with world-session + simulation action binding extraction:
  - extracted world-session action wrapper bindings:
    - `src/state/world/worldSessionActionBindings.ts`
  - extracted simulation action wrapper bindings:
    - `src/state/simulation/simulationActionBindings.ts`
  - `src/state/useAppStore.ts` now composes `hydrateWorldSession`/`jumpToSector`, `runProcess`, and `tickSimulation` through binding modules
  - added focused tests:
    - `src/state/world/worldSessionActionBindings.test.ts`
    - `src/state/simulation/simulationActionBindings.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~1057 LOC
- 2026-02-22: Phase 1 decomposition continued with consumable/failure/market action binding extraction:
  - extracted resource action wrapper bindings:
    - `src/state/simulation/resourceActionBindings.ts`
  - `src/state/useAppStore.ts` now composes `useEnergyCell`, `useConsumableSlot`, `feedCrewGalaxyBar`, `loadFridgeWater`, `loadFridgeGalaxyBars`, `handleFailure`, and `sellMarketProduct` through one binding module
  - added focused tests:
    - `src/state/simulation/resourceActionBindings.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~799 LOC
- 2026-02-22: Phase 1 decomposition continued with station-control + UI-workflow action binding extraction:
  - extracted station-control action wrapper bindings:
    - `src/state/simulation/stationControlActionBindings.ts`
  - extracted UI/tutorial/workspace action wrapper bindings:
    - `src/state/ui/uiWorkflowActionBindings.ts`
  - `src/state/useAppStore.ts` now composes station control actions (`setStationDistance*`, `setUseSceneDistance`, `toggleDocked`, `start/stopCharging`, `setContainment*`) and UI workflow actions (`setActiveCleanupZone`, tutorial/quest/workspace/panel actions) through dedicated binding modules
  - added focused tests:
    - `src/state/simulation/stationControlActionBindings.test.ts`
    - `src/state/ui/uiWorkflowActionBindings.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~664 LOC
- 2026-02-22: Phase 1 decomposition continued with extraction + world-target action binding extraction:
  - extracted mining/extraction action wrapper bindings:
    - `src/state/simulation/extractionActionBindings.ts`
  - extracted world-target depletion action wrapper bindings:
    - `src/state/world/worldTargetActionBindings.ts`
  - `src/state/useAppStore.ts` now composes `mineElement`, `tryFireMiningLaser`, `recordExtractionHit`, and `recordWorldTargetDepleted` through dedicated binding modules
  - added focused tests:
    - `src/state/simulation/extractionActionBindings.test.ts`
    - `src/state/world/worldTargetActionBindings.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~573 LOC
- 2026-02-22: Phase 1 test decomposition started for store integration coverage:
  - split `useAppStore` integration tests into focused suites:
    - `src/state/useAppStore.world.integration.test.ts`
    - `src/state/useAppStore.hydration.integration.test.ts`
    - `src/state/useAppStore.consumables.integration.test.ts`
  - retained quest-reward progression coverage in:
    - `src/state/useAppStore.test.ts`
  - `src/state/useAppStore.test.ts` reduced from ~1698 LOC to ~1100 LOC
- 2026-02-22: Phase 1 decomposition continued with runtime action binding extraction:
  - extracted runtime lifecycle wrappers:
    - `src/state/runtime/runtimeActionBindings.ts`
  - `src/state/useAppStore.ts` now composes `hydrateInventory` + `resetAllProgress` through runtime bindings
  - added focused tests:
    - `src/state/runtime/runtimeActionBindings.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~569 LOC
- 2026-02-22: Phase 1 test decomposition continued for quest-heavy integration coverage:
  - split quest integration scenarios into focused suites:
    - `src/state/useAppStore.quest-rewards.integration.test.ts`
    - `src/state/useAppStore.quest-progression.integration.test.ts`
    - `src/state/useAppStore.fridge.integration.test.ts`
  - reduced `src/state/useAppStore.test.ts` to baseline default-quest invariant coverage (~15 LOC)
  - enforced size budget compliance during split:
    - moved legacy fridge reward backfill case from quest-rewards suite into fridge suite
  - new quest integration hotspot is now:
    - `src/state/useAppStore.quest-rewards.integration.test.ts` (~542 LOC)
- 2026-02-22: Phase 1 decomposition continued with runtime store orchestration extraction:
  - extracted runtime store orchestration wrappers:
    - `src/state/runtime/runtimeStoreOrchestration.ts`
  - rewired `src/state/useAppStore.ts` to compose:
    - `updateTutorialProgress`
    - `persistUiPreferencesFromState`
    - `applyOfflineCatchupFromHydratedState`
    through `buildRuntimeStoreOrchestration(...)`
  - added focused tests:
    - `src/state/runtime/runtimeStoreOrchestration.test.ts`
  - `src/state/useAppStore.ts` reduced further to ~509 LOC

## Why This Is Needed Now
Current hotspot files are already beyond safe iteration size:
- `src/features/viewport/SpaceViewport.tsx` (~2381 LOC)
- `src/app/routes/GameScreen.tsx` (~1356 LOC)
- `src/features/viewport/sceneBuilder.ts` (~1039 LOC)
- `src/index.css` (~1006 LOC)
- `src/components/overlay/CrewOverlay.tsx` (~790 LOC)

Current coupling pressure:
- one global store owns runtime + UI + quest + persistence concerns
- gameplay catalogs are split between runtime code and docs-generation scripts
- architecture boundaries are documented but not enforced in lint/CI

## Non-Negotiable Constraints
- No big-bang rewrite.
- Keep current game playable during every phase.
- Preserve save compatibility with versioned migrations.
- Keep wiki generation as a hard quality gate.
- Prefer additive compatibility shims, then remove shims only after migrations are complete.

## Target End-State Repository Shape
```text
/
  apps/
    game-client/
      src/
        app/
        features/
        scenes/
        state/
          slices/
          selectors/
          actions/
        engine/
        platform/
        ui/
        shared/
        generated/

  content/
    schemas/
    packs/
      base/
        elements/
        compounds/
        resources/
        items/
        tools/
        recipes/
        processes/
        crew/
        quests/
        sectors/
        scenes/
      expansions/
    localization/
    generated/
      registry/
      wiki/
      search/

  tools/
    content-build/
    wiki-build/
    checks/

  docs/
  tests/
```

## Migration Strategy
- Keep current `src/` app layout in place first.
- Add `content/` and `tools/` early.
- Migrate one domain at a time from TS constants to validated content packs.
- Generate runtime registries consumed by app code.
- Move to `apps/game-client` only after behavior is stable and wrappers are no longer needed.

## Phased Program

### Phase 0 - Guardrails and Baseline (1-3 days)
Goal: stop architecture drift before deeper migration.

Work:
- Add import-boundary lint rules aligned with `@app/@features/@domain/@state/@platform/@shared`.
- Add file-size guard checks for hard limits (warning and fail thresholds).
- Add architecture check script for forbidden legacy imports.
- Capture baseline metrics (file sizes, test runtime, build size).

Deliverables:
- `tools/checks/architecture-boundaries.mjs`
- `tools/checks/file-size-budget.mjs`
- ESLint config update with restricted import paths and legacy path policy

Exit criteria:
- CI fails on new boundary violations.
- CI warns/fails on oversized files beyond agreed limits.

### Phase 1 - Store Decomposition (1-2 weeks)
Goal: replace monolithic store with slice composition.

Work:
- Create slice files:
  - `src/state/slices/runtimeStoreSlice.ts` (now active)
  - `src/state/slices/economySlice.ts`
  - `src/state/slices/crewSlice.ts`
  - `src/state/slices/questSlice.ts`
  - `src/state/slices/uiSlice.ts`
- Create composed store entry:
  - `src/state/store.ts`
- Add selectors:
  - `src/state/selectors/*`
- Compatibility export phase is complete (`src/state/useAppStore.ts` removed after import migration).

Primary source migration:
- monolith store runtime -> `src/state/storeRuntime.ts` + `src/state/slices/runtimeStoreSlice.ts` + composed public store `src/state/store.ts`
- `src/state/useAppStore.test.ts` -> per-slice tests + store integration tests

Exit criteria:
- No new feature work added directly to monolith store file.
- Store tests split into focused files with shared setup helpers.

### Phase 2 - Boundary Cleanup and Shared Contracts (4-7 days)
Goal: remove cross-layer leakage and stabilize type ownership.

Work:
- Create shared utility/contracts location:
  - `src/shared/math/*`
  - `src/shared/contracts/*`
- Move shared math out of feature folders where domain code depends on it.
- Move cross-layer interfaces from `@state/types` to domain/shared contracts where appropriate.

Primary source migration:
- `src/domain/world/cleanupCatalog.ts` should not import from `@features/*`.
- Feature simulation types should not be coupled to UI store-only type modules.

Exit criteria:
- No `domain -> features` imports.
- Feature and engine contracts no longer depend on UI-only types.

### Phase 3 - Content Schema Foundation (1-2 weeks)
Goal: make data scalable by moving authored content out of runtime code.

Work:
- Add schema layer for content types:
  - `content/schemas/*.schema.ts` (or JSON Schema/Zod equivalents)
- Add base content packs:
  - `content/packs/base/resources/*`
  - `content/packs/base/items/*`
  - `content/packs/base/processes/*`
  - `content/packs/base/recipes/*`
  - `content/packs/base/elements/*`
- Add content build pipeline:
  - validates, normalizes, and emits generated registries

Primary source migration:
- `src/domain/resources/resourceCatalog.ts` -> `content/packs/base/resources/*`
- `src/domain/spec/processCatalog.ts` -> `content/packs/base/processes/*`
- `src/domain/spec/gameSpec.ts` constants split between schema content and engine constants

Exit criteria:
- Runtime no longer treats resource/process catalogs as hand-maintained TS source-of-truth.
- Registry generation is deterministic and validated in CI.

### Phase 4 - Crafting Graph Scaling (1 week)
Goal: support thousands of craftables safely.

Work:
- Introduce recipe graph compiler:
  - topological dependency checks
  - cycle detection
  - missing input/output detection
- Add shard conventions for large catalogs:
  - e.g. `items.manufacturing.0001-0500.yaml`
- Add semantic tagging for filtering/search (`tier`, `discipline`, `station`, `risk`, `unlock`).

Exit criteria:
- New craftables are data-only additions in content packs.
- CI blocks invalid graph edges and unresolved resource IDs.

### Phase 5 - Wiki + Search Generation Unification (1 week)
Goal: wiki and search become generated projections of the same registry.

Work:
- Replace current wiki sync path with registry-driven generator in `tools/wiki-build`.
- Emit:
  - `content/generated/wiki/*`
  - `content/generated/search/*`
  - existing app-facing wiki artifacts under `src/wiki/generated/*`
- Ensure manual pages are clearly separated from generated references.

Primary source migration:
- `scripts/wiki-sync.ts` -> `tools/wiki-build/*` (with transitional wrapper script)

Exit criteria:
- `wiki:check` validates against generated registry.
- no duplicate factual data hand-authored in multiple places.

### Phase 6 - Quests, Crew, Sectors, Scenes as Content (1-2 weeks)
Goal: content-authoritative progression and world composition.

Work:
- Move quest definitions to content packs.
- Move crew roster/balance definitions to content packs.
- Move sector and scene definitions to content packs.
- Keep runtime behavior in engine; keep copy/text in content/localization.

Primary source migration:
- `src/features/quests/questDefinitions.ts` -> `content/packs/base/quests/*`
- `src/domain/spec/sectorSpec.ts` -> `content/packs/base/sectors/*`
- scene metadata extracted from `src/features/viewport/sceneBuilder.ts` into scene content packs

Exit criteria:
- Adding quests/sectors/crew mostly requires content edits, not core runtime edits.

### Phase 7 - View and Scene Runtime Decomposition (1-2 weeks)
Goal: split large UI/runtime orchestrators into maintainable modules.

Work:
- Decompose `GameScreen` into hooks:
  - `useGameHotkeys`
  - `useSceneSwitching`
  - `useWorkspaceDocking`
  - `useHudTelemetry`
- Decompose `SpaceViewport` runtime systems:
  - collision system
  - mining/extraction system
  - target sync system
  - telemetry publication system
  - station feedback system

Primary source migration:
- `src/app/routes/GameScreen.tsx` -> smaller hooks/components in `src/features/game-shell/*`
- `src/features/viewport/SpaceViewport.tsx` -> `src/features/viewport/runtime/*`

Exit criteria:
- no single runtime file > ~900 LOC in active features.
- independent subsystem tests exist for collision/extraction/world-sync behavior.

### Phase 8 - Hardening and Optional Workspace Split (ongoing)
Goal: operational resilience and long-term maintainability.

Work:
- Offline catch-up performance controls (batching/caps, deterministic fast-forward).
- Persistence write throttling and dirty-field snapshots.
- Optional move from single-package root to `apps/game-client` once migration stabilizes.

Exit criteria:
- startup cost scales safely for long offline durations.
- persistence writes are bounded and measurable.

## File Mapping Matrix (Current -> Target)
- `src/state/storeRuntime.ts` -> `src/state/slices/*` + `src/state/store.ts` (public canonical surface)
- `src/state/useAppStore*.test.ts` -> `src/state/slices/*.test.ts` + focused `src/state/useAppStore.*.integration.test.ts`
- `src/features/quests/questDefinitions.ts` -> `content/packs/base/quests/*` + generated quest registry
- `src/domain/resources/resourceCatalog.ts` -> `content/packs/base/resources/*` + generated runtime catalog
- `src/domain/spec/processCatalog.ts` -> `content/packs/base/processes/*` + generated process registry
- `src/features/viewport/sceneBuilder.ts` -> scene runtime + `content/packs/base/scenes/*`
- `src/domain/spec/sectorSpec.ts` -> `content/packs/base/sectors/*` + generated sector registry
- `scripts/wiki-sync.ts` -> `tools/wiki-build/*` with compatibility wrapper until cutover

## Program Milestones
1. M0: Guardrails merged and active in CI.
2. M1: Store decomposition complete; monolith store frozen.
3. M2: Content schema + resource/process migration complete.
4. M3: Wiki/search generated from unified registry.
5. M4: Quests/crew/sectors/scenes content-authoritative.
6. M5: Runtime orchestrators decomposed and legacy wrappers removed.

## CI Gates to Add or Tighten
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run wiki:check`
- `npm run content:validate`
- `npm run content:check-graph`
- `npm run architecture:check`

## Risk Register
- Save compatibility regressions during store split.
- Content migration introducing hidden balancing drift.
- Runtime and generated registry mismatch if build order is wrong.
- Team velocity dip if wrappers are removed too early.

Mitigations:
- versioned save migrations and backward fallback readers
- golden snapshot tests for registry outputs
- strict generation order in CI
- staged wrapper deprecation policy

## Immediate Next 10 Tickets (Execution Order)
1. Add architecture boundary lint rules and checks.
2. Add file-size budget check with current baseline snapshot.
3. (Completed) Create `src/state/store.ts`, then converge runtime ownership into `src/state/storeRuntime.ts` + `src/state/slices/runtimeStoreSlice.ts` and retire early scaffold slices.
4. Move persistence subscriptions from monolith into dedicated persistence module.
5. Extract selectors used by `GameScreen` into `src/state/selectors/gameScreenSelectors.ts`.
6. Add `content/schemas/resource.schema.ts` and `content/schemas/process.schema.ts`.
7. Migrate resources from TS catalog to first content pack files.
8. Generate runtime resource registry into `src/generated/registry/resources.ts`.
9. Switch one runtime path to generated resource registry.
10. Add wiki generator input adapter that reads generated registry instead of direct TS catalogs.

## Definition of Done for This Program
- Content additions (items/recipes/quests/sectors) are primarily data-only operations.
- Wiki/search references are generated and synchronized from one canonical registry.
- Store/runtime files are modular, bounded, and testable.
- Architecture boundaries are enforced by CI, not convention.
