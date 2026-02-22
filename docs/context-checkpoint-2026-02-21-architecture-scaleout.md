# Context Checkpoint - Architecture Scale-Out - 2026-02-21

## Why This Exists
- This checkpoint is optimized for continuity when context compaction happens.
- It captures the minimum set of decisions and next actions to resume execution safely.
- This is a historical snapshot from 2026-02-21; some listed scaffold files were later retired during store convergence.

## Canonical Program Document
- `docs/architecture-scaleout-plan-v1.md`

## Decisions Locked
- We will migrate incrementally; no big-bang rewrite.
- We will keep runtime playable at every phase.
- We will move to a content-first model for high-scale catalogs.
- Wiki/search must be generated from the same normalized registry used by runtime.
- Compatibility wrappers are allowed during migration, then removed phase-by-phase.

## Baseline Hotspots (Starting Snapshot)
- `src/state/useAppStore.ts` (~3115 LOC)
- `src/features/viewport/SpaceViewport.tsx` (~2111 LOC)
- `src/app/routes/GameScreen.tsx` (~1238 LOC)
- `src/features/viewport/sceneBuilder.ts` (~928 LOC)
- `src/features/quests/questDefinitions.ts` (~672 LOC)

## Current Phase
- Phase 1 active decomposition with early Phase 2 boundary cleanup started.
- Phase 0 guardrails and baseline metrics are complete.

## Completed Actions
1. Added architecture boundary checker + baseline support:
   - `tools/checks/architecture-boundaries.mjs`
   - `tools/checks/baselines/architecture-violations.json`
2. Added file-size budget checker + baseline support:
   - `tools/checks/file-size-budget.mjs`
   - `tools/checks/baselines/file-size-baseline.json`
3. Added npm command surface:
   - `architecture:baseline`, `architecture:check`
   - `filesize:baseline`, `filesize:check`
   - `quality:check`
4. Added initial store-slice scaffold:
   - `src/state/slices/simulationSlice.ts` (retired later)
   - `src/state/slices/worldSlice.ts` (retired later)
   - `src/state/store.ts` (now canonical store surface; no `useAppStoreV2`)
5. Extracted `GameScreen` selectors:
   - `src/state/selectors/gameScreenSelectors.ts`
6. Moved store persistence subscriptions into dedicated module:
   - `src/state/persistence/storePersistence.ts`
7. Promoted canonical viewport path:
   - `src/features/viewport/ShipInteriorViewport.tsx` (legacy wrapper retained in `src/game/ShipInteriorViewport.tsx`)
8. Added quest UI selector module and consumed it in major quest UIs:
   - `src/state/selectors/questUiSelectors.ts`
   - `src/components/GameModal.tsx`
   - `src/components/TutorialOverlay.tsx`
9. Removed active `domain -> features` boundary violation by moving shared math:
   - `src/shared/math/simulationMath.ts`
   - `src/features/simulation/math.ts` (compatibility re-export)
   - `src/domain/world/cleanupCatalog.ts`
10. Added content-pack foundation for resources:
   - `content/schemas/resource.schema.json`
   - `content/schemas/process.schema.json` (skeleton)
   - `content/schemas/recipe.schema.json` (skeleton)
   - `content/packs/base/resources/resources.base.json`
   - `tools/content-build/build-resources-registry.mjs`
11. Generated and integrated runtime resource registry:
   - `src/generated/registry/resources.ts`
   - `src/domain/resources/resourceCatalog.ts` now exports from generated registry
   - npm scripts added: `content:build`, `content:check`, `content:validate`
   - `quality:check` now runs `content:check`
12. Hardened toolchain compatibility for generated-registry integration:
   - `src/domain/spec/processCatalog.ts` uses explicit `.js` relative import for wiki-build runtime compatibility
   - ran `npm run wiki:sync` + `npm run wiki:check` after catalog-source migration
   - `package.json` test script now excludes `scripts/.tmp/**` so wiki-build artifacts do not pollute test discovery
13. Migrated process catalog to content packs + generated runtime registry:
   - `content/packs/base/processes/processes.base.json`
   - `tools/content-build/build-processes-registry.mjs`
   - `src/generated/registry/processes.ts`
   - `src/domain/spec/processCatalog.ts` now exports from generated registry
   - `content:build` / `content:check` now run both resources and processes
14. Added recipe catalog + graph validation foundation:
   - `content/schemas/recipe.schema.json` expanded to actionable schema
   - `content/packs/base/recipes/recipes.base.json`
   - `tools/content-build/build-recipes-registry.mjs`
   - `src/generated/registry/recipes.ts`
   - `src/domain/spec/recipeCatalog.ts`
   - `tools/content-build/check-content-graph.mjs`
   - `content:build` / `content:check` now include recipes and `content:check-graph`
15. Added wiki adapter projection from generated registries:
   - `scripts/wiki-sync.ts` now imports generated `resources`, `processes`, and `recipes` registries directly
   - generated recipe wiki page added: `src/wiki/pages/reference-recipe-catalog.mdx`
16. Added recipe metadata progression contract for scale:
   - `content/packs/base/recipes/recipes.base.json` now requires `tier`, `discipline`, `station`, `unlock`
   - `content/schemas/recipe.schema.json` updated to match metadata contract
   - `tools/content-build/build-recipes-registry.mjs` now validates/exports metadata fields
   - `tools/content-build/check-content-graph.mjs` now enforces unlock-prefix rules, tier gating, and dependency tier regression checks
17. Added initial content-pack sharding conventions and pipeline support:
   - shared shard-aware loader: `tools/content-build/pack-loader.mjs`
   - resource/process/recipe generators now merge base + `shards/*.json` deterministically
   - graph checks now read merged base + shard content for resources/processes/recipes
   - first recipe shard split: `content/packs/base/recipes/shards/recipes.market.0012-0015.json`
   - shard-ready domain folders pre-created for upcoming migrations (`items`, `tools`, `crew`, `quests`, `sectors`, `scenes`, `elements`, `compounds`)
   - sharding authoring conventions documented in `content/README.md`
18. Completed alias migration pass for legacy wrapper imports:
   - warning-producing callsites moved from `store/*`, `data/*`, and `db/*` relative imports to canonical aliases (`@state`, `@domain`, `@platform`)
   - canonical module added: `src/domain/resources/resourcePresentation.ts`
   - compatibility re-export retained: `src/data/resourcePresentation.ts`
   - lint restrictions narrowed to relative legacy-wrapper patterns in `eslint.config.js`
19. Started wiki-build tooling extraction with compatibility wrapper:
   - implementation moved to `tools/wiki-build/wiki-sync.ts`
   - wrapper retained at `scripts/wiki-sync.ts`
   - compile path updated in `scripts/tsconfig.wiki.json`
20. Continued store decomposition with extracted pure utility modules:
   - `src/state/utils/numberUtils.ts` (clamp/round/normalize helpers)
   - `src/state/world/worldStateUtils.ts` (world target floor + session row id helpers)
   - `src/state/crew/crewScheduleUtils.ts` (daily meal/water schedule generation)
   - `src/state/useAppStore.ts` now consumes these modules and re-exports public helpers used by tests/UI (`computeMinActiveWorldTargetCount`, `worldSessionRowIdForSector`)
   - `src/state/useAppStore.ts` reduced to ~3273 LOC after this tranche
21. Continued store decomposition with runtime/reward helper extraction:
   - `src/state/runtime/snapshotSanitizers.ts` now owns runtime snapshot sanitation + world-session row parsing
   - `src/state/quests/rewardUtils.ts` now owns quest reward grant application + notification formatting
   - `src/state/useAppStore.ts` now imports these helpers and removed duplicated in-file implementations
   - `src/state/useAppStore.ts` reduced further to ~2764 LOC after this tranche
22. Continued decomposition with quest/tutorial + wiki-build modularization:
   - `src/state/quests/tutorialProgression.ts` now owns tutorial completion initialization, step satisfaction checks, progression evaluation, and active-main-quest resolution
   - `src/state/useAppStore.ts` now consumes tutorial progression helpers and reduced further to ~2567 LOC
   - `tools/wiki-build/wiki-sync.ts` split into focused modules:
     - `tools/wiki-build/pages/{systemsPage,processCatalogPage,resourceCatalogPage,recipeCatalogPage,questReferencePage}.ts`
     - `tools/wiki-build/{formatters,generatedIndex,fileOps}.ts`
   - wiki build tsconfig include widened to `../tools/wiki-build/**/*.ts`
23. Continued decomposition with runtime snapshot persistence extraction + focused tests:
   - `src/state/runtime/snapshotPersistence.ts` now owns runtime snapshot load/write + runtime/world snapshot projection builders
   - `src/state/useAppStore.ts` now consumes snapshot persistence helpers and reduced further to ~2391 LOC
   - focused test coverage added for newly extracted modules:
     - `src/state/quests/tutorialProgression.test.ts`
     - `tools/wiki-build/wiki-build.test.ts`
   - generated wiki index escaping hardened (`slug`, `title`, `summary`, `tags`) in `tools/wiki-build/generatedIndex.ts`
24. Continued decomposition with quest-reward transitions + offline catchup orchestration extraction:
   - `src/state/quests/rewardStateTransitions.ts` now owns legacy reward backfill and quest reward/pin state transition logic used by tutorial progress updates
   - `src/state/simulation/tickOrchestration.ts` now owns `runOfflineCatchupTicks(...)` and crew aggregate-to-member mirroring helper
   - `src/state/useAppStore.ts` now consumes both modules and reduced further to ~2271 LOC
   - focused test coverage added:
     - `src/state/quests/rewardStateTransitions.test.ts`
     - `src/state/simulation/tickOrchestration.test.ts`
25. Continued decomposition with world-session + live tick transition extraction:
   - `src/state/world/worldSessionTransitions.ts` now owns world-session fallback/hydration/depletion state transitions
   - `src/state/simulation/tickOrchestration.ts` now also owns reusable live tick transition orchestration (`runLiveSimulationTick`)
   - `src/state/useAppStore.ts` now consumes those helpers for world-session load, world target depletion, and `tickSimulation` action logic; reduced further to ~2181 LOC
   - focused test coverage added/extended:
     - `src/state/world/worldSessionTransitions.test.ts`
     - `src/state/simulation/tickOrchestration.test.ts` (live tick transition coverage)
26. Continued decomposition with process + station/control transition extraction:
   - `src/state/simulation/processTransitions.ts` now owns process-run state transition logic used by `runProcess(...)`
   - `src/state/simulation/stationControlTransitions.ts` now owns station distance/docking/charging/containment transition logic
   - `src/state/useAppStore.ts` now consumes both modules for process action handlers and station/control actions; reduced further to ~2078 LOC
   - focused test coverage added:
     - `src/state/simulation/processTransitions.test.ts`
     - `src/state/simulation/stationControlTransitions.test.ts`
27. Continued decomposition with crew-consumable + sector-jump transition extraction:
   - `src/state/simulation/crewConsumableTransitions.ts` now owns consumable usage, manual crew feeding, and fridge load transfer transitions
   - `src/state/world/sectorJumpTransitions.ts` now owns sector jump departure/arrival transition wiring
   - `src/state/useAppStore.ts` now consumes both modules for `useEnergyCell`, `feedCrewGalaxyBar`, fridge load actions, and `jumpToSector`; reduced further to ~1980 LOC
   - focused test coverage added:
     - `src/state/simulation/crewConsumableTransitions.test.ts`
     - `src/state/world/sectorJumpTransitions.test.ts`
28. Continued decomposition with failure + market transition extraction:
   - `src/state/simulation/failureTransitions.ts` now owns failure/reset material-penalty transitions and report payload construction
   - `src/state/simulation/marketTransitions.ts` now owns market-sale/economy transition wiring
   - `src/state/useAppStore.ts` now consumes both modules for `handleFailure` and `sellMarketProduct`; reduced further to ~1910 LOC
   - focused test coverage added:
     - `src/state/simulation/failureTransitions.test.ts`
     - `src/state/simulation/marketTransitions.test.ts`
29. Continued decomposition with workspace/UI preference extraction:
   - `src/state/ui/workspacePreferences.ts` now owns workspace panel dock sanitization, preset layouts, UI preference persistence, and quest-id preference sanitization
   - `src/state/useAppStore.ts` now consumes those helpers and preserves compatibility export `DEFAULT_PINNED_QUEST_IDS`; reduced further to ~1711 LOC
   - focused test coverage added:
     - `src/state/ui/workspacePreferences.test.ts`
30. Continued decomposition with UI action transition extraction:
   - `src/state/ui/uiActionTransitions.ts` now owns UI/quest/panel action transition reducers used by store actions
   - `src/state/useAppStore.ts` now consumes transition helpers for cleanup-zone updates, tutorial visibility/reset actions, quest pin/notification actions, workspace preset/reset actions, and panel move/visibility actions; reduced further to ~1614 LOC
   - focused test coverage added:
     - `src/state/ui/uiActionTransitions.test.ts`
31. Continued decomposition with extraction + tutorial-progress transition extraction:
   - `src/state/simulation/extractionTransitions.ts` now owns mining/extraction action transition reducers (`tryFireMiningLaser`, `recordExtractionHit`)
   - `src/state/quests/tutorialStateTransitions.ts` now owns the tutorial progress orchestration reducer used by `updateTutorialProgress`
   - `src/state/useAppStore.ts` now consumes both modules and reduced further to ~1499 LOC
   - focused test coverage added:
     - `src/state/simulation/extractionTransitions.test.ts`
     - `src/state/quests/tutorialStateTransitions.test.ts`
32. Continued decomposition with process action binding extraction:
   - `src/state/simulation/processActionBindings.ts` now owns process-action wiring (`runRockSorter` through `runEnergyCellAssembler`)
   - `src/state/useAppStore.ts` now composes those actions via `buildProcessActionBindings(...)`; reduced further to ~1453 LOC
   - focused test coverage added:
     - `src/state/simulation/processActionBindings.test.ts`
33. Continued decomposition with hydration/persistence orchestration extraction:
   - `src/state/runtime/offlineCatchupHydration.ts` now owns hydrated offline catchup orchestration resolution
   - `src/state/persistence/inventoryPersistence.ts` now owns inventory snapshot persistence side-effect wrappers
   - `src/state/useAppStore.ts` now consumes both modules for hydration catchup + inventory persistence guards; reduced further to ~1330 LOC
   - focused test coverage added:
     - `src/state/runtime/offlineCatchupHydration.test.ts`
     - `src/state/persistence/inventoryPersistence.test.ts`
34. Continued decomposition with bootstrap + basic action binding extraction:
   - `src/state/runtime/storeBootstrap.ts` now owns startup/bootstrap state initialization helpers
   - `src/state/ui/basicStateActionBindings.ts` now owns simple setter/action bindings (`food/water automation`, `lab/object/comms/telemetry`, `appendSimulationLog`)
   - `src/state/useAppStore.ts` now consumes both modules and reduced further to ~1206 LOC
   - focused test coverage added:
     - `src/state/runtime/storeBootstrap.test.ts`
     - `src/state/ui/basicStateActionBindings.test.ts`
35. Continued decomposition with world-session + simulation action binding extraction:
   - `src/state/world/worldSessionActionBindings.ts` now owns world-session action wrapper orchestration (`loadWorldSessionForSector`, `hydrateWorldSession`, `jumpToSector`)
   - `src/state/simulation/simulationActionBindings.ts` now owns simulation action wrapper orchestration (`runProcess`, `tickSimulation`)
   - `src/state/useAppStore.ts` now composes those bindings and reduced further to ~1057 LOC
   - focused test coverage added:
     - `src/state/world/worldSessionActionBindings.test.ts`
     - `src/state/simulation/simulationActionBindings.test.ts`
36. Continued decomposition with consumable/failure/market action binding extraction:
   - `src/state/simulation/resourceActionBindings.ts` now owns consumable/failure/market action wrapper orchestration (`useEnergyCell`, `useConsumableSlot`, `feedCrewGalaxyBar`, `loadFridgeWater`, `loadFridgeGalaxyBars`, `handleFailure`, `sellMarketProduct`)
   - `src/state/useAppStore.ts` now composes those bindings and reduced further to ~799 LOC
   - focused test coverage added:
     - `src/state/simulation/resourceActionBindings.test.ts`
37. Continued decomposition with station-control + UI-workflow action binding extraction:
   - `src/state/simulation/stationControlActionBindings.ts` now owns station-control action wrapper orchestration (`setStationDistance*`, `setUseSceneDistance`, `toggleDocked`, `start/stopCharging`, `setContainment*`)
   - `src/state/ui/uiWorkflowActionBindings.ts` now owns UI/tutorial/workspace action wrapper orchestration (`setActiveCleanupZone`, tutorial visibility/reset, quest pin/main quest, workspace preferences, panel move/visibility)
   - `src/state/useAppStore.ts` now composes both modules and reduced further to ~664 LOC
   - focused test coverage added:
     - `src/state/simulation/stationControlActionBindings.test.ts`
     - `src/state/ui/uiWorkflowActionBindings.test.ts`
38. Continued decomposition with extraction + world-target action binding extraction:
   - `src/state/simulation/extractionActionBindings.ts` now owns mining/extraction action wrapper orchestration (`mineElement`, `tryFireMiningLaser`, `recordExtractionHit`)
   - `src/state/world/worldTargetActionBindings.ts` now owns world-target depletion action wrapper orchestration (`recordWorldTargetDepleted`)
   - `src/state/useAppStore.ts` now composes both modules and reduced further to ~573 LOC
   - focused test coverage added:
     - `src/state/simulation/extractionActionBindings.test.ts`
     - `src/state/world/worldTargetActionBindings.test.ts`
39. Started `useAppStore` integration test decomposition:
   - extracted world-session + station integration tests to:
     - `src/state/useAppStore.world.integration.test.ts`
   - extracted offline hydration integration tests to:
     - `src/state/useAppStore.hydration.integration.test.ts`
   - extracted consumable-slot/energy-cell integration tests to:
     - `src/state/useAppStore.consumables.integration.test.ts`
   - retained quest progression/reward integration tests in:
     - `src/state/useAppStore.test.ts`
   - `src/state/useAppStore.test.ts` reduced further to ~1100 LOC
40. Continued decomposition with runtime action binding extraction:
    - `src/state/runtime/runtimeActionBindings.ts` now owns runtime lifecycle action wrappers (`hydrateInventory`, `resetAllProgress`)
    - `src/state/useAppStore.ts` now composes runtime lifecycle wrappers through that module and reduced further to ~569 LOC
    - focused test coverage added:
      - `src/state/runtime/runtimeActionBindings.test.ts`
41. Continued `useAppStore` integration test decomposition to complete quest split:
    - quest-reward queue/claim ordering and auto-complete coverage moved to:
      - `src/state/useAppStore.quest-rewards.integration.test.ts`
    - quest progression and step-regression/pinning coverage moved to:
      - `src/state/useAppStore.quest-progression.integration.test.ts`
    - fridge loading + legacy fridge reward backfill coverage moved to:
      - `src/state/useAppStore.fridge.integration.test.ts`
    - `src/state/useAppStore.test.ts` now retains only baseline default pinned-quest invariant coverage (~15 LOC)
    - all quality gates pass after split (`lint`, `test`, `build`, `quality:check`, `wiki:check`, `filesize:check`)
42. Continued store decomposition with runtime orchestration closure extraction:
    - `src/state/runtime/runtimeStoreOrchestration.ts` now owns:
      - `updateTutorialProgress`
      - `persistUiPreferencesFromState`
      - `applyOfflineCatchupFromHydratedState`
    - `src/state/useAppStore.ts` now composes runtime orchestration through `buildRuntimeStoreOrchestration(...)`
    - focused coverage added:
      - `src/state/runtime/runtimeStoreOrchestration.test.ts`
    - `src/state/useAppStore.ts` reduced further to ~509 LOC
    - full gates pass after extraction (`lint`, `test`, `build`, `quality:check`, `wiki:check`, `filesize:check`)

## Next Actions (Execute In Order)
1. Start migrating extracted helper/action-binding clusters toward slice-aligned state modules (`src/state/slices/*`) with `useAppStore` reduced to a thin compatibility composition layer.
2. Continue splitting or modularizing integration hotspots if they cross file-size soft limits (current hotspot: `src/state/useAppStore.quest-rewards.integration.test.ts`).
3. Extend sharding from recipes to additional high-cardinality catalogs as they are migrated (`items`, `tools`, `quests`, `scenes`).
4. Plan and execute the next large runtime/UI hotspot decomposition (`GameScreen`, `SpaceViewport`, and quest definitions) using the same guardrail-first workflow.

## Critical Invariants
- Do not break save compatibility without a migration path.
- Do not remove legacy wrappers until all imports are migrated.
- Historical invariant: do not add new large features into `src/state/useAppStore.ts` (current equivalent: keep feature growth out of `src/state/storeRuntime.ts` by favoring focused slice/runtime modules).
- Every content migration must have schema validation and CI checks.

## Resume Checklist For Future Sessions
1. Read this file.
2. Read `docs/architecture-scaleout-plan-v1.md`.
3. Read latest `docs/worklog.md` entry.
4. Continue from the first incomplete "Next Actions" item.

## Validation Checklist For Phase 0/1 Work
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run wiki:check`
- new architecture and file-size check scripts pass
