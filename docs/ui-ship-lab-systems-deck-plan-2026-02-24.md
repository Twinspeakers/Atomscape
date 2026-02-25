# UI Plan: Ship Systems Deck + Laboratory Clarity (2026-02-24)

## Goal
- Reframe core power/lab UX to feel like a playable game system, not a reference manual.
- Move battery management out of Laboratory into a dedicated `Ship` page in Game Menu.
- Replace text-abbreviation pseudo-icons with real in-game icons.

## Approved Scope
1. Add `Ship` Game Menu section between `Quests` and `Inventory`.
2. Move battery display + battery upgrades into `Ship`.
3. Keep Laboratory focused on process execution and materials flow.
4. Replace custom abbreviation badges with resource image icons.
5. Redesign `Live Outputs` so each row is icon + content side by side.
6. Rebalance battery upgrades so progression is a challenge and feels earned.

## UX Direction
- **Systems Deck framing**:
  - Use card-like modules for `Reactor + Battery`, `Battery Upgrade`, and `Emergency Cells`.
  - Prioritize actionable state and controls over long explanatory paragraphs.
- **Game-like hierarchy**:
  - Keep high-signal values prominent (charge %, tier, missing materials, enabled/blocked status).
  - Use icon-first rows and concise labels for scanability.
- **Challenge-first progression**:
  - Battery upgrade costs scale aggressively with tier.
  - Early upgrades are reachable but meaningful; later tiers require deliberate manufacturing grind.

## Battery Challenge Balance
- Capacity still increases in clear steps (`+500` per tier, capped).
- Material requirements now use heavier base costs and quadratic scaling.
- Player-facing intent: upgrades should feel like milestone achievements, not routine clicks.

## Implementation Checklist
- [x] Add `ship` to `GameMenuSection`.
- [x] Add `Ship` tab in `GameModal` between `Quests` and `Inventory`.
- [x] Add keyboard shortcut `H` for Ship menu.
- [x] Add new `ShipOverlay` with systems deck presentation.
- [x] Move battery controls/upgrades out of Laboratory into Ship.
- [x] Replace Laboratory abbreviation badges with resource image icons.
- [x] Render `Live Outputs` rows as icon + content two-column layout.
- [x] Rebalance battery upgrade costs to challenge progression.
- [x] Validate with build + targeted tests.

## Validation Commands
- `npm run build`
- `npx vitest run src/state/simulation/crewConsumableTransitions.test.ts src/state/useAppStore.consumables.integration.test.ts src/state/simulation/resourceActionBindings.test.ts src/state/slices/appActionSlices.test.ts src/state/slices/appInitialState.test.ts --exclude scripts/.tmp/**`

## Follow-Up Ideas
1. Add a dedicated process icon atlas so process nodes are not inferred from output resources.
2. Introduce tier names (`Mk I`, `Mk II`, etc.) and milestone toasts for battery upgrades.
3. Add production planners (per-upgrade material checklist with quick-jump to relevant lab tabs).
