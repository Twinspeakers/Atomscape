# Crew Systems Spec v1

## Purpose
Define the next crew simulation model before implementation:
- fixed crew of 4
- hunger + thirst + automatic sleep rotation
- fridge unlock and reward behavior
- concrete formulas and persistence shape

This document is implementation input, not release notes.

## Scope (v1)
- Replace aggregate "single crew meter" model with a 4-person crew model.
- Add thirst as a first-class survival need.
- Keep sleep fully automatic.
- Add fridge subsystem that stores Galaxy Bars and unlocks on quest completion.
- Keep current UI style system; add crew-specific UI content only where required.

## Out of Scope (v1)
- Crew AI jobs and task assignments.
- Dynamic crew headcount changes.
- Morale/psychology systems.
- Individual inventory per crew member.
- Portrait generation pipeline (only data hooks for now).

## Product Decisions (Locked)
- Crew count is fixed at `4`.
- No immediate plan to increase crew count in v1.
- Nutrition baseline is `3 Galaxy Bars per crew per 24h` (12/day total).
- Sleep baseline is `8h sleep` windows with `6h rotation offsets`.
- Fridge unlocks on completing `Feed the Crew`.
- Fridge unlock reward includes `5 Galaxy Bars` preloaded.

## Core Simulation Model

### Crew Members
Create exactly 4 crew records with stable ids.

Suggested default roster:
1. `crew-ava` - Ava Kade
2. `crew-jules` - Jules Orin
3. `crew-niko` - Niko Vale
4. `crew-rin` - Rin Sol

Each crew member stores:
- `id: string`
- `name: string`
- `portraitUrl?: string` (future image hook)
- `hunger: number` (0..100)
- `thirst: number` (0..100)
- `debuff: number` (0..100)
- `starving: boolean`
- `dehydrated: boolean`
- `sleepShiftStartHour: number` (0, 6, 12, 18)

### Sleep Rotation
- Cycle length: 24h.
- Sleep window length: 8h.
- Shift starts: `[0, 6, 12, 18]`.
- A member is sleeping if current cycle hour is in `[start, start + 8)` modulo 24.
- This yields 2-3 awake members at all times.
- Sleep is automatic only; no manual controls in v1.

### Hunger Formula
Goal: 3 bars/day/crew.

Constants:
- `HUNGER_DECAY_PER_DAY = 100`
- `HUNGER_DECAY_PER_SECOND = 100 / 86400`
- `GALAXY_BAR_HUNGER_RESTORE = 100 / 3` (`33.3333...`)

Behavior:
- Hunger decays continuously each tick.
- Hunger restore from bar is clamped at 100.
- If hungry threshold is crossed and food automation is enabled, consumption attempts run.

### Thirst Formula
Use water resource (`L`) as hydration input.

Constants:
- `THIRST_DECAY_PER_DAY = 100`
- `THIRST_DECAY_PER_SECOND = 100 / 86400`
- `WATER_HYDRATION_RESTORE = 25` (4 drinks/day/crew baseline)
- `WATER_DRINK_COST_L = 0.25` per drink event

Behavior:
- Thirst decays continuously each tick.
- Hydration action consumes water and restores thirst.
- If hydration automation is enabled, auto-drink attempts run when threshold crossed.

### Debuff and Failure Rules
Per-crew debuff logic:
- Starvation and dehydration independently contribute to debuff gain.
- Recovery applies when both are healthy.

Suggested constants:
- `DEBUFF_GAIN_STARVING_PER_SEC = 0.6`
- `DEBUFF_GAIN_DEHYDRATED_PER_SEC = 0.8`
- `DEBUFF_RECOVERY_PER_SEC = 0.5`

Aggregate ship-level consequence:
- Compute `crewDebuffAvg = mean(member.debuff)`.
- Existing ship penalties consume this aggregate.
- Critical failure only if all are below survival thresholds long enough to hit global max debuff rule.

## Fridge System

### Unlock
- Locked by default.
- Unlock event: completion of Main Quest `Feed the Crew`.

### Unlock Reward
- On unlock, fridge gets `+5 Galaxy Bars`.
- Reward log must explicitly state:
  - `Unlocks: Fridge`
  - `Adds: 5 Galaxy Bars (Fridge)`

### Storage Rules
- Fridge stores `galaxyBar` only in v1.
- Separate from cargo inventory.
- Configurable capacity (default `40 bars`).
- Consumption priority:
1. Fridge
2. Cargo inventory

## Automation Rules
- `foodAutomationEnabled` remains.
- Add `waterAutomationEnabled`.
- Auto-consumption runs at most once per crew member per tick.
- Auto actions are deterministic (no random chance in v1).

Thresholds:
- Auto-eat threshold: `hunger <= 65`.
- Auto-drink threshold: `thirst <= 70`.

## Data Model Additions

### Store State
Add:
- `crewMembers: CrewMemberState[]` (length 4)
- `fridge: { unlocked: boolean; galaxyBars: number; capacity: number }`
- `waterAutomationEnabled: boolean`
- `claimedQuestRewardIds` already exists and remains source for one-time grants.

### Persistence
Persist in runtime snapshot:
- full `crewMembers`
- `fridge`
- `waterAutomationEnabled`

Backfill behavior for old saves:
- If missing, initialize with defaults.
- If aggregate old crew status exists, seed all 4 members from old value.

## Quest + Reward Updates

### Feed the Crew (Main)
Completion reward must be concrete and exact:
- `Unlocks Fridge`
- `Adds 5 Galaxy Bars to Fridge`

Optional additional item rewards must be explicitly listed with quantity and destination.

### Reward Copy Standard
Reward descriptions must use exact outcomes:
- `Adds <qty> <item> to <destination>`
- `Unlocks <system>`
- or both, in one line.

Avoid abstract phrasing.

## UI Requirements (v1)

### Quick Quests Panel
- No structural change from current pinned quest behavior.

### Crew Status Surfaces
- Bottom status bar must include at least:
  - crew awake count
  - average hunger
  - average thirst
  - average debuff
- Laboratory crew area should include:
  - per-crew rows (name, hunger, thirst, sleeping/awake)
  - fridge status (locked/unlocked, bars/capacity)
  - automation toggles (food, water)

### Future Image Hook
- If `portraitUrl` absent, show initials/avatar placeholder.

## Tick Order (v1)
Each second:
1. Resolve sleep states by rotation clock.
2. Decay hunger + thirst per member.
3. Run auto-feed and auto-drink attempts.
4. Update starvation/dehydration flags.
5. Update per-member debuffs.
6. Compute aggregate crew metrics for ship systems.
7. Evaluate critical failure thresholds.

## Acceptance Criteria
1. Crew size is exactly 4 after new game and reload.
2. With no bars/water, hunger/thirst fall from 100 to 0 over 24h.
3. One bar restores ~33.33 hunger for one crew member.
4. One drink event consumes water and restores thirst per constants.
5. Sleep states rotate automatically on 0/6/12/18 schedule.
6. Completing Feed the Crew unlocks fridge and inserts exactly 5 bars.
7. Reward logs and quest reward text match actual grants exactly.
8. Runtime refresh preserves crew + fridge + automation state.

## Tuning Knobs (for playtests)
- `GALAXY_BAR_HUNGER_RESTORE`
- `WATER_HYDRATION_RESTORE`
- auto thresholds (`eat`, `drink`)
- debuff gain/recovery rates
- fridge capacity

## Implementation Notes
- Keep simulation deterministic and side-effect free in `features/simulation/systems`.
- Keep constants in `domain/spec/gameSpec.ts`.
- Keep reward definitions in `features/quests/questDefinitions.ts`.
- Keep wiki sync updated after spec implementation.
