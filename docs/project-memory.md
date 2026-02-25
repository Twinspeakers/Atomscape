# Project Memory

## Purpose
Single source of truth for current product direction, active systems, and short-horizon priorities. Keep this file concise and current.

## Product Snapshot
- Project: Space mining game SPA (React + TypeScript + Vite + Babylon.js)
- Core loop: fly -> mine/salvage -> process into components -> manufacture goods -> support crew -> sell to market
- Key UI model: movable/snap-enabled panels on left/right rails, centered top/bottom bars, and a Game Menu for Quests/Ship/Inventory/Laboratory/Crew/Wiki

## North Star
- Build a "space industrial chain" game where matter is created by physically plausible processing:
  - rocks/junk are mined as mixed material
  - laboratory breaks material into smaller useful components
  - components are recombined into increasingly complex goods
  - goods are consumed for ship survival or sold for currency

## Vision Lock (2026-02-18)
- Player fantasy: Earth is cleaning up; player cleans orbital/space industrial mess and converts it into value.
- Realism target: 10/10 (as realistic as practical, even with a steep learning curve).
- First MVP win condition: crafting the first item.
- First sellable products: Box of Sand, Steel Ingot, Energy Cell.
- First food product: Galaxy Bar (bio-engineered complete ration).
- Starvation outcome: soft debuff (not hard fail).
- Market behavior: dynamic prices (supply/demand), not fixed.
- Laboratory UX: both node graph and recipe list.
- Early automation: food chain automated early; atom/compound production automation soon after.
- Early dominant energy sink: mining.
- Failure consequence: return to start point for repair with minor resource cost.
- On-screen UI priority: energy, inventory, crew status, and objectives all visible.

## Current Architecture
- Frontend: React + TypeScript + Vite
- Styling: Tailwind v4 + shared global UI tokens in `src/index.css`
- State: Zustand
- Local persistence: Dexie/IndexedDB
- Search: client-side
- Wiki: in-app MDX pages
- Wiki references are generated from code via `npm run wiki:sync` (`scripts/wiki-sync.ts`).
- Simulation core: canonical spec in `src/domain/spec/gameSpec.ts` + deterministic tick engine in `src/features/simulation`
- Codebase structure is migrating to:
  - `src/app` (entry/routes)
  - `src/features` (feature modules)
  - `src/domain` (game data models)
  - `src/state` (state orchestration)
  - `src/platform` (external adapters)
- Architecture guardrails now have baseline-aware checks:
  - `npm run architecture:check` (layer/legacy import drift vs baseline)
  - `npm run filesize:check` (file growth/size drift vs baseline)
  - runtime store composition now lives in `src/state/slices/runtimeStoreSlice.ts` + `src/state/storeRuntime.ts` with canonical public entrypoint `src/state/store.ts`

## Active UX Rules
- All UI surfaces should share one coherent visual system.
- Shared `ui-*` spacing/typography classes in `src/index.css` are baseline for new UI work.
- Action controls and status badges should use shared semantic classes (`ui-action-button*`, `ui-status-tag`) instead of one-off sizing.
- Inputs and compact value chips should use shared semantic classes (`ui-input-field`, `ui-pill`, `ui-pill-soft`) for readability consistency.
- Side panels must stay bound to left/right edges and respect right overlay width when open.
- Right sidebar panels must not overlap the right overlay.
- Top and bottom bars are centered and visually dominant for high-priority info.
- Laboratory is the primary transformation workspace for converting inventory into smaller building-block components.

## Economy Pillars
- Extraction: asteroid and space-junk mining yields mixed inputs, not pure elements.
- Processing: sorting + chemical/thermal/electrical steps convert mixed inputs into components.
- Manufacturing: components become usable items (starting small, then expanding catalog).
- Survival: food/life-support outputs prevent crew starvation.
- Commerce: manufactured items can be sold through a store interface for currency.

## Implemented Slice (2026-02-18)
- Added starter products to inventory model: Box of Sand, Steel Ingot, Energy Cell, Galaxy Bar.
- Added Manufacturing starter block with first-craft actions.
- Added Store tab in Laboratory with:
  - dynamic supply/demand pricing
  - sell actions (1 or 5 units)
  - credits tracking
- Added market simulation tick behavior (price/demand recovery over time).
- Updated quest manufacturing step to align with first crafted product win condition.
- Added quest UX structure:
  - docked Quest section now shows a 3-step window (last completed, current detailed, next)
  - explicit Main Quest and Side Quest distinction in UI
  - keyboard-driven Game Modal (`J` Quests, `I` Inventory) with detailed quest objective breakdown
- Added architecture migration scaffold with compatibility re-export paths and alias-based imports.
- Introduced docs-driven simulation foundation:
  - canonical simulation constants + market catalog in `src/domain/spec/gameSpec.ts`
  - canonical lab process definitions in `src/domain/spec/processCatalog.ts`
  - pure simulation systems (`station`, `containment`, `recombination`, `market`, `process`)
  - pure process execution system in `src/features/simulation/systems/process.ts`
  - `tickSimulation` now delegates to `runSimulationTick(...)` in `src/features/simulation/engine.ts`
  - `sellMarketProduct` now delegates to engine/system market execution (`executeMarketSale`)
  - deterministic simulation tests added with Vitest (`src/features/simulation/engine.test.ts`)
- Added first survival slice:
  - crew hunger/starvation/debuff simulation integrated into tick execution
  - `Galaxy Bar Assembler` process + early food automation toggle (auto-craft + auto-feed)
  - crew status surfaced in bottom HUD and laboratory manufacturing controls
- Added soft failure/repair loop:
  - combat destruction and starvation-critical states route to emergency reset
  - emergency reset respawns ship at start point
  - minor repair costs are applied (materials/credits/energy) and logged
  - repair count is visible in HUD
  - dedicated Failure Report panel lists exact per-event repair breakdown
- Survival pacing tuned:
  - crew hunger now decays on a 24-hour curve from 100% to 0% (`CREW_HUNGER_DECAY_PER_SECOND = 100 / 86400`)
- Runtime persistence expanded:
  - core simulation/session state now persists across refresh via local snapshot storage (`energy`, `credits`, station/control toggles, crew status, market state, active lab tab, failure count)
  - inventory remains persisted in IndexedDB and hydrates alongside the runtime snapshot
- Crew systems v1 foundation (CRW1) completed:
  - canonical per-member crew constants for hunger/thirst/sleep/debuff/fridge now live in `src/domain/spec/gameSpec.ts`
  - shared `CrewMemberState`, `FridgeState`, and `CrewAggregateMetrics` types were added in `src/state/types.ts`
  - simulation tick interfaces now support optional per-member crew + fridge fields to enable staged migration from aggregate crew state
- Crew systems v1 persistence migration (CRW2) completed:
  - runtime state now stores `crewMembers`, `fridge`, and `waterAutomationEnabled` in canonical runtime store wiring (`src/state/storeRuntime.ts` + `src/state/slices/runtimeStoreSlice.ts`)
  - old local snapshots without the new fields are safely backfilled using the aggregate crew status
  - new games now initialize exactly four stable crew records from the canonical roster
- Crew systems v1 sleep rotation (CRW3) completed:
  - deterministic sleep windows now run in simulation tick based on fixed shifts (`0, 6, 12, 18`) and an 8-hour sleep window
  - simulation outputs now expose crew metrics (`awakeCount`, average hunger/thirst/debuff, starving/dehydrated counts)
  - store runtime now keeps `crewAggregateMetrics` current so UI can consume awake/average telemetry
- Crew systems v1 survival loop (CRW4) completed:
  - crew survival now runs per member (hunger + thirst decay, starvation/dehydration flags, debuff gain/recovery)
  - auto-feed consumes Galaxy Bars (fridge first, then cargo) per member threshold
  - auto-drink consumes water and restores per-member thirst when threshold is crossed
  - ship-level penalties continue to consume aggregate crew debuff output from per-member state
- Crew systems v1 fridge unlock rewards (CRW5) completed:
  - Main Quest `Feed The Crew` now grants `Unlocks Fridge` + `Adds 5 Galaxy Bars (Fridge)` as concrete, one-time rewards
  - reward claim processing now applies fridge unlock/state grants and logs exact delivery outcomes
  - manual crew feeding now consumes Galaxy Bars from fridge first, then cargo
- Crew systems v1 UI pass (CRW6) completed:
  - bottom HUD now surfaces awake count + average hunger/thirst/debuff + critical starving/dehydrated counts
  - Laboratory manufacturing now includes crew survival controls (food/water automation), fridge readout, and per-member crew rows
- Crew systems reward/testing hardening completed:
  - reward copy now uses explicit destination wording (`to Cargo`, `to Fridge`) and literal unlock phrasing
  - deterministic tests now cover fridge-first bar consumption and one-time fridge unlock/preload reward delivery
- Crew docs/wiki synchronization gate (CRW9) completed:
  - wiki generator now publishes per-member crew survival constants (hunger/thirst, auto-thresholds, debuff rates, sleep rotation, fridge settings)
  - generated quest/system references are synchronized via `wiki:sync`
  - manual wiki guides updated for Crew menu (`C` hotkey), fridge unlock reward, and feed-source priority
- Game Menu sections now include a dedicated `Crew` page between `Laboratory` and `Wiki`:
  - keyboard shortcut: `C`
  - surface includes live crew roster status, automation toggles, fridge state, and per-member bars
- Game Menu now includes a dedicated `Ship` page between `Quests` and `Inventory`:
  - keyboard shortcut: `H`
  - battery/upgrade systems moved from Laboratory into a ship-focused systems deck
  - battery upgrade economy now uses significantly higher, tier-scaling material costs to keep progression milestone-driven
- Quest model alignment update:
  - Main Quest 1 `Learning To Charge` is now split into multiple steps (`approachStationForCharging`, `openStationTabForCharging`, `engageCharging`, `startCharging`)
  - quest rendering for sidebar panel and Game Menu/Quests now shares one source-of-truth builder (`buildQuestProgressModel`) to prevent drift between views
  - Main quest progress counters are now scoped to the active Main quest (not global tutorial-step totals)
  - active Main quest selection is now explicit in Game Menu/Quests and persists via UI preferences (`activeMainQuestId`)
  - `Feed The Crew` now exposes exact total feedstock requirements up front (Water-eq 11, CO2-eq 12, Carbon-eq 0.4) and uses equivalent-stock checks to reduce unnecessary regressions; `Create Carbon` remains strict on real carbon inventory
- Quest rewards model added:
  - Main and Side quest definitions now carry explicit reward descriptors
  - reward presentation is rendered from the same shared quest model in both quest UIs (sidebar + Game Menu) to keep parity
  - quest reward claim events now enqueue a dedicated completion modal payload, so users get a concrete reward summary at delivery time
  - Game Menu `Quests` now includes `Recent Reward Deliveries` backed by persisted `questRewardHistory` so attained rewards remain auditable after closing the modal
  - dynamic quest principle is enforced: resource-dependent steps can regress when required materials are consumed, and quests auto-complete/reward when live state already satisfies full requirements
- Added viewport modernization foundation:
  - seeded cleanup world generation with classed targets and zone distributions (`rockBody`, `metalScrap`, `compositeJunk`, `volatileIceChunk`)
  - added `carbonRichAsteroid` / **Carbon-rich Asteroid** target class with high `carbonRock` yield and updated zone weights to reduce early carbon bottlenecks
  - Babylon readability pass: cleanup targets are now color-coded by class and display fixed-size screen-space labels (crosshair status style) that stay readable regardless of target distance
  - cleanup field density increased significantly (higher per-zone target counts + zone placement tuned closer to practical flight bounds) so players can chain mining targets continuously
  - active-world population floor now scales with total target population (45% floor, minimum 50); when depleted count exceeds the floor budget, oldest depleted targets are replenished
  - viewport target selection/radar metadata now includes class/kind/zone/risk context
  - extraction outcomes moved behind simulation boundary (`systems/extraction`) with structured extraction events and target-yield resolution
  - viewport now reports extraction hits with target metadata/yield payloads instead of directly mutating mining outcomes
  - viewport now live-syncs world depletion updates and spawns replenished targets in-place without world-seed resets
- Viewport modernization VPT3 + VPT4 completed:
  - viewport internals now split into `sceneBuilder`, `inputController`, `targetRendering`, and shared viewport types
  - route imports now target `src/features/viewport/SpaceViewport.tsx`; legacy `src/game/SpaceViewport.tsx` is compatibility-only
  - station gameplay is now visually represented in-world (50m charge ring, docking ring, beacon pulse)
  - in-flight station transitions are surfaced in UI (`entered/left range`, `dock availability`, `docked/undocked`)
  - Station tab now treats manual distance as a testing fallback, with live Babylon telemetry as the primary path
- Viewport modernization VPT5 completed:
  - object/radar target models now include readable class/kind/zone labels, risk bands, and expected-yield previews
  - `Object` panel now emphasizes target taxonomy and material profile instead of raw IDs
  - `Nearest Contacts` list moved into `Object` panel (with collapse/expand) to keep target analysis in one place
- Viewport modernization VPT6 completed:
  - main quest flow now includes explicit in-space objectives (approach high-risk zone, salvage composite junk, return/dock at station)
  - quest completion predicates now read world telemetry/actions (zone entry, class-specific extraction events, station return) instead of lab-only checks
  - viewport now publishes active cleanup zone telemetry into store state and renders quest focus markers in 3D space for world-target steps
  - tutorial focus behavior now routes space-targeted steps to the viewport while preserving lab-tab focus routing for lab steps
- Viewport modernization VPT7 completed:
  - world session persistence now stores seeded world identity + depletion progress in Dexie (`worldSession`)
  - viewport now rehydrates from persisted `worldSeed` + `worldDepletedTargetIds` so refreshes keep layout and depleted targets
  - world snapshot loading is version-gated and fails safely to default world when stale/corrupt
- Viewport modernization VPT8 completed:
  - added store regression coverage for world-session hydration + depletion dedupe invariants
  - validated full gates (`lint`, `test`, `build`, `wiki:check`) after VPT7 integration
  - synced ticket/memory/architecture/worklog docs to current viewport truth
- Viewport/UI follow-up completed:
  - `GameScreen` now lazy-loads Babylon viewport modules (`SpaceViewport`, `ShipInteriorViewport`) to reduce initial JS work
  - Game Menu no longer applies full-screen dim backdrop over scene/sidebars while open
  - tutorial spotlight no longer tints near-fullscreen targets, eliminating partial grey wash over scene/left-rail UI
  - Game Menu sections (`Inventory`, `Laboratory`, `Crew`, `Wiki`) now lazy-load in modal context with suspense fallback
- Updated laboratory action UX to reduce dead affordances:
  - removed obsolete test action (`Run Mining Laser (Test)`) and its process node
  - renamed legacy/testing labels to production wording (`Manual Override`, `Extended Manufacturing Chain`)
  - process buttons now stay visible but enforce requirement gates inline (energy/material prerequisites + explicit blocked reasons)
  - store sell actions now clearly show stock-based blocking reasons
- Bottom HUD cockpit shell pass completed:
  - replaced the old bottom strip with a cockpit-style ship shell (left flight pod, center consumables pod, right systems pod)
  - added four consumable slots scaffold in the center pod for future expansion
  - slot `1` is now live for `Energy Cell`: clickable in HUD and mapped to keyboard `1`
  - `Energy Cell Assembler` energy cost increased to realistic expedition storage levels (`132` craft cost, `120` discharge return)
  - HUD architecture now uses SVG shell base + HTML overlay components (`ShipCockpitShellSvg`, `ShipCockpitHud`, reusable `CockpitConsumableSlot`, `SevenSegmentValue`) and a shared store action (`useConsumableSlot`) for keyboard/click parity
  - HUD now follows a minimal cockpit profile: segmented U-shell + center speed/temp + four large consumable slots only (removed duplicate aim text and nonessential lower-HUD metrics)
  - `Station` dock status and `Credits` have been moved to the top panel `Status` row
- Sector pass foundation (2026-02-21, in progress):
  - active sector state is now first-class (`Earth Corridor` default) and persists in runtime snapshot
  - world sessions are now persisted per sector (`world-session-<sectorId>`) with legacy fallback for older single-session saves
  - viewport now supports in-world portal transit callbacks and sector-specific scene rebuild context
  - sustained mining controls added: hold `E` to mine, press `=` to toggle persistent mining, and persistent mining now interrupts on collision or any movement input (`W/A/S/D/R/F`)
  - Game Menu now includes `Map` section with sector jump controls
  - hotkeys updated: `M` opens Map, `O` opens Store
  - map now reads cross-sector telemetry from persisted sector sessions (seed, target totals, cleared/remaining, zone coverage, last sync)
  - celestial readability labels are now shown for `Sun` + current sector bodies (`Earth/Moon` or `Mars/Phobos/Deimos`)
  - celestial model now has a canonical sector spec (`resolveSectorCelestialConfig`) and scene-builder layering (`celestial-background-root`, `celestial-gameplay-root`) so skybox/background bodies can be authored cleanly
  - hybrid moon encounter work remains rolled back; Earth + Moon are background-only visuals in Earth Corridor, tuned to preserve corridor-scale gameplay without near-field celestial collisions
  - legacy near-field star sphere meshes were removed from `sceneBuilder` to reduce object count and avoid close-up background artifacts
  - Earth Corridor celestial backdrop now includes the full planet set (Mercury through Pluto) with real-time orbital periods/spin directions, label-first distant planet presentation, and edge-clamped readability labels
  - first long-duration extraction node pass added (sustained in-range mining nodes that respond to `E` hold and `=` persistent mining toggle)
  - radar/object contact model now includes explicit contact roles (`target` vs `node`) so extraction nodes can be displayed distinctly in HUD + nearest-contact lists

## Open Risks / Watch Items
- Scope explosion from "make anything" goal; must release in controlled phases.
- Recipe realism vs playability balance can become complex quickly.
- Panel snap behavior can regress when rails/overlay bounds change.
- Global style overrides should avoid accidental recoloring or contrast regressions.
- Keep tutorial flow aligned with renamed Quests UX.

## Current Priorities
- Main Menu + cloud save integration is now in place with a single primary Supabase save per account (magic-link auth + save/load from runtime overlay); next pass should add overwrite/conflict UX hardening.
- Continue architecture scale-out execution (`docs/architecture-scaleout-plan-v1.md`) with emphasis on content schemas and generated registries as the next milestone.
- Resource migration foundation is now live: `content/packs/base/resources/resources.base.json` drives `src/generated/registry/resources.ts` via `npm run content:build`.
- Process migration foundation is now live: `content/packs/base/processes/processes.base.json` drives `src/generated/registry/processes.ts` via `npm run content:build`.
- Recipe scaling metadata is now live: `content/packs/base/recipes/recipes.base.json` drives `src/generated/registry/recipes.ts` with required `tier`/`discipline`/`station`/`unlock` metadata, and `npm run content:check-graph` now enforces unlock-prefix consistency, tier gating, dependency tier progression, and acyclic dependencies.
- Shard-aware content build is now live for `resources`/`processes`/`recipes` via `shards/*.json` merge support (`tools/content-build/pack-loader.mjs`); first recipe shard is active at `content/packs/base/recipes/shards/recipes.market.0012-0015.json`.
- Legacy import alias migration pass is complete for current warning set; lint now runs clean with canonical aliases.
- Wiki generation tooling is now modularized under `tools/wiki-build/*` (pages + formatters + index/file ops) with `scripts/wiki-sync.ts` retained as compatibility wrapper.
- Store decomposition has resumed with extracted helper modules (`numberUtils`, `worldStateUtils`, `worldSessionTransitions`, `sectorJumpTransitions`, `worldSessionActionBindings`, `worldTargetActionBindings`, `crewScheduleUtils`, `runtime/{snapshotSanitizers,snapshotPersistence,offlineCatchupHydration,storeBootstrap,runtimeActionBindings,runtimeStoreOrchestration}`, `persistence/inventoryPersistence`, `quests/rewardUtils`, `quests/tutorialProgression`, `quests/rewardStateTransitions`, `quests/tutorialStateTransitions`, `simulation/{tickOrchestration,processTransitions,stationControlTransitions,crewConsumableTransitions,failureTransitions,marketTransitions,extractionTransitions,processActionBindings,simulationActionBindings,resourceActionBindings,stationControlActionBindings,extractionActionBindings}`, `ui/{workspacePreferences,uiActionTransitions,basicStateActionBindings,uiWorkflowActionBindings}`, `slices/{appActionSlices,appInitialState,runtimeStoreSlice}`, `appStoreState`), with canonical runtime wiring in `src/state/storeRuntime.ts` and slice-owned builder composition in `src/state/slices/runtimeStoreSlice.ts`.
- Store entrypoint migration is complete: app/UI/tests consume `useAppStore` via `@state/store`, selectors type against `@state/appStoreState`, canonical runtime composition lives in `src/state/storeRuntime.ts` + `src/state/slices/runtimeStoreSlice.ts`, and deprecated compatibility store wrappers/aliases have been removed.
- Focused decomposition safety tests now cover extracted modules under `src/state/quests/{tutorialProgression,rewardStateTransitions,tutorialStateTransitions}.test.ts`, `src/state/simulation/{tickOrchestration,processTransitions,stationControlTransitions,crewConsumableTransitions,failureTransitions,marketTransitions,extractionTransitions,processActionBindings}.test.ts`, `src/state/runtime/{hydrationLoaders,progressReset,offlineCatchupHydration,storeBootstrap}.test.ts`, `src/state/persistence/inventoryPersistence.test.ts`, `src/state/world/{worldSessionTransitions,sectorJumpTransitions}.test.ts`, `src/state/ui/{workspacePreferences,uiActionTransitions,basicStateActionBindings}.test.ts`, and `tools/wiki-build/wiki-build.test.ts`.
- `useAppStore` integration coverage is now split into focused suites:
  - baseline default-quest invariant: `src/state/useAppStore.test.ts` (~15 LOC)
  - quest rewards/queue/auto-complete integration: `src/state/useAppStore.quest-rewards.integration.test.ts` (~542 LOC)
  - quest progression/pinning/resource-regression integration: `src/state/useAppStore.quest-progression.integration.test.ts`
  - fridge loading + legacy reward backfill integration: `src/state/useAppStore.fridge.integration.test.ts`
  - world session + depletion + station docking integration: `src/state/useAppStore.world.integration.test.ts`
  - offline catch-up hydration integration: `src/state/useAppStore.hydration.integration.test.ts`
  - consumable slot + energy cell integration: `src/state/useAppStore.consumables.integration.test.ts`
- Continue post-VPT viewport stabilization and performance cleanup (render-loop tuning, telemetry polish, further chunk/lazy-load work).
- Extend sharding conventions to future high-cardinality catalogs (items/tools/quests/scenes) as each content domain is migrated.
- Add a dedicated recipe list + node graph dual view in Laboratory.
- Balance recipes/energy costs so mining stays dominant early energy sink.
- Tune survival + repair balancing and threshold values.
- Improve visual hierarchy and simplify control density.
- Preserve fast panel customization (drag, reorder, snap) without layout conflicts.
- Keep gameplay onboarding interactive and step-by-step.
- Keep wiki/manual docs aligned with gameplay by treating `wiki:check` as a quality gate.

## Proposed Direction (Draft 2026-02-21)
- Move from one global space field to a sector model:
  - `Mars Corridor` (between Mars + Phobos/Deimos) as the current primary cleanup/mining sector.
  - `Earth Corridor` as a later sector with Earth-side debris/landfill cleanup targets.
- Reduce dense "many small asteroids" dependency for core progression:
  - Introduce long-duration mineable objects (anchorable extraction nodes) that can be mined over time with a dedicated extraction beam.
  - Keep some short-hit targets for combat rhythm and early onboarding.
- Make sectors content-authoritative:
  - each sector has its own station, target catalog mix, and unlockable systems.
  - new sectors can introduce new resources and processing chains without overloading early-game loops.
- Keep celestial bodies mostly environmental/readability-driven:
  - non-scale visual representation is acceptable.
  - occasional eclipse moments are a visual goal (sun + local body alignment), not a hard simulation requirement.
  - in `Earth Corridor`, Earth should be rendered as a skybox/background body (non-collidable, non-interactive) to preserve scale illusion without expanding gameplay bounds.
  - hybrid moon proxy remains deferred; keep Moon background-only until sector-scale gameplay requires collidable celestial encounters

## Working Agreements
- Record meaningful UI/system changes here (not every tiny tweak).
- Put chronological detail in `docs/worklog.md`.
- Put major decisions/tradeoffs in `docs/decisions/`.
- Cull stale points when updating this file so it remains current and short.

## Last Updated
- Date: 2026-02-24
- Updated by: Codex

## Continuity Checkpoints
- `docs/context-checkpoint-2026-02-21.md` - point-in-time implementation checkpoint for the active sector pass (decisions, completed work, and next execution steps).
- `docs/context-checkpoint-2026-02-21-architecture-scaleout.md` - migration checkpoint for architecture scale-out phases and next actions.
