# MVP Implementation Tickets (v1)

## T1 - Vertical Slice: Rubble -> Box of Sand -> Sell
- Priority: P0
- Status: Completed (2026-02-18)
- Goal: Player can mine rubble, process to silica, craft first item, sell item for credits.
- Scope:
  - Add `Box of Sand` craft node in Laboratory.
  - Add `Store` interface with dynamic pricing and sell action.
  - Add credits balance and sale log feedback.
- Acceptance:
  - Player crafts at least 1 Box of Sand.
  - Player sells at least 1 Box of Sand.
  - Credits increase after sale.
  - Price updates after sale and over time (supply/demand).

## T2 - Starter Product Definitions
- Priority: P0
- Status: Completed (2026-02-18)
- Goal: Add starter catalog used by MVP economy.
- Scope:
  - Add resources:
    - `Box of Sand`
    - `Steel Ingot`
    - `Energy Cell`
    - `Galaxy Bar`
  - Ensure they appear in inventory/search/resource metadata.
- Acceptance:
  - New resources are visible in Inventory and searchable.

## T3 - Laboratory UX for First Craft Win
- Priority: P1
- Status: Completed (2026-02-18)
- Goal: Make first crafted item obvious and easy to reach.
- Scope:
  - Add a clear "Starter Manufacturing" block.
  - Show input/output costs for first products.
- Acceptance:
  - A new player can identify where to craft first item within one panel view.

## T4 - Quest Alignment for MVP Win Condition
- Priority: P1
- Status: Completed (2026-02-18)
- Goal: Reflect "first crafted item = first win."
- Scope:
  - Update quest completion logic to include starter crafted products.
  - Update quest text/hints to point at starter manufacturing.
- Acceptance:
  - Crafting first starter product completes manufacture quest step.

## T5 - Validation + Documentation
- Priority: P0
- Status: Completed (2026-02-18)
- Goal: Keep quality and continuity high.
- Scope:
  - Run lint/build.
  - Update `docs/worklog.md` and `docs/project-memory.md` with delivered slice.
- Acceptance:
  - Lint and build pass.
  - Docs reflect current implemented state.

## T6 - Engine-Bound Process Execution
- Priority: P0
- Status: Completed (2026-02-18)
- Goal: Move lab process execution out of monolithic store and into simulation boundary.
- Scope:
  - Add canonical process catalog in domain spec.
  - Add pure process execution system.
  - Wire existing lab node actions to catalog-backed process execution.
- Acceptance:
  - Existing lab actions still function.
  - Process logic is reusable and testable independent of Zustand store.

## T7 - Engine-Bound Market Sale + Deterministic Tests
- Priority: P0
- Status: Completed (2026-02-18)
- Goal: Move sale logic into simulation boundary and add deterministic automated tests for core invariants.
- Scope:
  - Add pure market sale executor.
  - Wire `sellMarketProduct` through simulation engine boundary.
  - Add Vitest suite for deterministic tick/process/sale invariants.
- Acceptance:
  - Selling products updates inventory/credits/market through engine system.
  - Test suite passes locally for deterministic behavior and invariant checks.

## T8 - Crew Survival + Galaxy Bar Automation Slice
- Priority: P0
- Status: Completed (2026-02-18)
- Goal: Introduce the first survival loop where crew hunger/debuffs are simulated and Galaxy Bar production/feeding can be automated early.
- Scope:
  - Add crew hunger, starvation, and soft debuff simulation in tick flow.
  - Add `Galaxy Bar Assembler` process in canonical process catalog.
  - Add food automation toggle for auto-craft + auto-feed behavior.
  - Surface crew status in core HUD and manufacturing/lab controls.
  - Add deterministic tests for crew automation and starvation invariants.
- Acceptance:
  - Crew hunger updates each tick.
  - Starvation applies a soft debuff and recovery works when fed.
  - Automation can craft/feed Galaxy Bars when resources allow.
  - All validations pass (`lint`, `test`, `build`).

## T9 - Failure + Repair Loop
- Priority: P0
- Status: Completed (2026-02-18)
- Goal: Add a soft-failure consequence where the ship is returned to start point and minor repair costs are applied.
- Scope:
  - Add failure reason model (`combat`, `starvation`).
  - Route combat failure from viewport into store failure handler.
  - Trigger starvation critical failure from simulation tick.
  - Apply minor repair penalties (materials + credits + energy), increment repair counter, and respawn ship.
  - Add dedicated Failure Report panel showing per-event repair breakdown.
  - Add deterministic test coverage for starvation critical-failure flagging.
- Acceptance:
  - Combat destruction returns ship to start and applies repair cost.
  - Starvation can trigger the same repair loop when critical.
  - Repair events are logged and visible in HUD status.
  - Failure Report panel shows reason, penalties, and exact material required/used/shortage for each event.
  - Validation passes (`lint`, `test`, `build`).
