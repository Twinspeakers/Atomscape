# Crew Systems Implementation Tickets (v1)

## Goal
Implement the locked crew model from `docs/crew-systems-spec-v1.md`:
- fixed 4-person crew
- hunger + thirst + sleep rotation
- fridge unlock and starter reward
- explicit, deterministic crew survival behavior

## Scope Boundaries
- Crew count is fixed at 4 in v1.
- Sleep is fully automatic in v1 (no manual scheduling controls).
- Fridge stores Galaxy Bars only in v1.
- Keep implementation deterministic (no random survival events).

## Delivery Order
1. CRW1
2. CRW2
3. CRW3
4. CRW4
5. CRW5
6. CRW6
7. CRW7
8. CRW8
9. CRW9

---

## CRW1 - Domain Constants + Crew Data Types
- Priority: P0
- Status: Completed (2026-02-19)
- Goal: Add canonical constants and types for per-crew simulation.
- Scope:
  - Add hunger/thirst/sleep constants to spec.
  - Add crew member type definitions and fridge type definitions.
  - Define shift schedule constants (`0, 6, 12, 18`).
- File Map:
  - `src/domain/spec/gameSpec.ts`
  - `src/state/types.ts`
  - `src/features/simulation/types.ts`
- Acceptance:
  - Crew-related constants live only in canonical spec.
  - Types support per-member hunger/thirst/debuff/sleep and fridge state.
  - Build passes after type additions.

## CRW2 - Store State + Persistence Migration
- Priority: P0
- Status: Completed (2026-02-19)
- Goal: Persist the new crew/fridge state and safely migrate old saves.
- Scope:
  - Add runtime state for `crewMembers`, `fridge`, `waterAutomationEnabled`.
  - Persist new fields in runtime snapshot.
  - Add fallback migration from old aggregate crew status.
- File Map:
  - `src/state/storeRuntime.ts`
  - `src/state/slices/runtimeStoreSlice.ts`
  - `src/state/runtime/snapshotPersistence.ts`
  - `src/state/types.ts`
- Acceptance:
  - New game initializes exactly 4 crew members.
  - Refresh preserves crew/fridge/automation state.
  - Old snapshot without new fields loads safely with defaults.

## CRW3 - Automatic Sleep Rotation System
- Priority: P1
- Status: Completed (2026-02-19)
- Goal: Compute sleeping/awake state by deterministic rotation schedule.
- Scope:
  - Implement sleep window logic (8h sleep, 6h offsets).
  - Expose awake count for UI use.
  - Integrate into tick update order.
- File Map:
  - `src/features/simulation/systems/crew.ts`
  - `src/features/simulation/engine.ts`
  - `src/features/simulation/types.ts`
- Acceptance:
  - Sleep state rotates automatically by cycle time.
  - At any point, awake count is 2-3 crew.
  - No manual input required to drive sleep transitions.

## CRW4 - Hunger + Thirst Consumption Loop
- Priority: P0
- Status: Completed (2026-02-19)
- Goal: Replace aggregate survival with per-member hunger/thirst progression.
- Scope:
  - Hunger decay and thirst decay per second.
  - Auto-feed from Galaxy Bars and auto-drink from Water.
  - Per-member starvation/dehydration flags and debuff updates.
  - Aggregate crew debuff output for existing ship penalties.
- File Map:
  - `src/features/simulation/systems/crew.ts`
  - `src/features/simulation/engine.ts`
  - `src/domain/spec/gameSpec.ts`
  - `src/state/storeRuntime.ts`
- Acceptance:
  - Hunger and thirst each drop from 100 to 0 in ~24h without supplies.
  - 1 Galaxy Bar restores configured hunger amount for one crew member.
  - Auto-drink consumes water and restores thirst when threshold is crossed.
  - Existing ship penalty logic still functions via aggregate debuff.

## CRW5 - Fridge Subsystem + Feed the Crew Unlock Reward
- Priority: P0
- Status: Completed (2026-02-19)
- Goal: Add fridge storage and unlock it via `Feed the Crew` completion.
- Scope:
  - Add fridge state: `unlocked`, `galaxyBars`, `capacity`.
  - Unlock on `main-feed-the-crew` completion.
  - Seed `+5 Galaxy Bars` in fridge at unlock.
  - Consumption priority: fridge first, then cargo inventory.
- File Map:
  - `src/state/storeRuntime.ts`
  - `src/features/quests/questDefinitions.ts`
  - `src/features/simulation/systems/crew.ts`
- Acceptance:
  - Before unlock, fridge is unavailable and has no effect.
  - On unlock, fridge becomes available and contains exactly 5 bars.
  - Survival consumption pulls from fridge first when bars are available.

## CRW6 - Crew + Fridge UI Pass
- Priority: P1
- Status: Completed (2026-02-19)
- Goal: Surface the new model clearly in existing HUD/lab surfaces.
- Scope:
  - Bottom bar: show awake count + average hunger/thirst/debuff.
  - Laboratory: add per-crew rows (name, hunger, thirst, sleep state).
  - Laboratory: show fridge state and bars/capacity.
  - Add `waterAutomationEnabled` toggle next to food automation.
  - Add a dedicated `Crew` section in Game Menu (between Laboratory and Wiki) for crew/fridge controls and member telemetry.
- File Map:
  - `src/components/GameModal.tsx`
  - `src/components/overlay/CrewOverlay.tsx`
  - `src/app/routes/GameScreen.tsx`
  - `src/components/ShipStatusBar.tsx`
  - `src/components/overlay/LaboratoryOverlay.tsx`
  - `src/index.css`
- Acceptance:
  - Player can read crew status at a glance from bottom bar.
  - Player can inspect per-member status and fridge in lab.
  - UI copy and labels reflect exact implemented behavior.

## CRW7 - Reward Copy + Behavior Audit
- Priority: P0
- Status: Completed (2026-02-19)
- Goal: Ensure every crew-related reward is literal and accurately applied.
- Scope:
  - Standardize reward text format:
    - `Adds <qty> <item> to <destination>`
    - `Unlocks <system>`
  - Verify reward delivery logs exactly match granted outcomes.
  - Ensure no abstract/non-functional reward language remains.
- File Map:
  - `src/features/quests/questDefinitions.ts`
  - `src/state/runtime/runtimeStoreOrchestration.ts`
  - `src/state/storeRuntime.ts`
  - `src/components/GameModal.tsx`
  - `src/components/TutorialOverlay.tsx`
- Acceptance:
  - Reward text maps 1:1 to code behavior.
  - Feed the Crew reward explicitly states fridge unlock + 5 bars in fridge.
  - Reward grants are one-time and persisted.

## CRW8 - Deterministic Tests for Crew/Fridge Invariants
- Priority: P0
- Status: Completed (2026-02-19)
- Goal: Add automated safety net for survival behavior.
- Scope:
  - Add tests for:
    - 24h decay baselines
    - bar/drink restore amounts
    - sleep rotation (2-3 awake)
    - fridge unlock + preload
    - consumption priority (fridge before cargo)
    - reward one-time grant behavior
- File Map:
  - `src/features/simulation/engine.test.ts`
  - `src/features/simulation/systems/crew.ts` (test-adjacent helpers if needed)
  - `src/state/useAppStore.quest-rewards.integration.test.ts` (reward claim behavior regression coverage)
- Acceptance:
  - `npm run test` passes with new crew/fridge coverage.
  - Regressions in survival behavior are caught by tests.

## CRW9 - Wiki + Docs Synchronization Gate
- Priority: P0
- Status: Completed (2026-02-19)
- Goal: Keep gameplay docs aligned with implemented crew systems.
- Scope:
  - Update system docs and quest references after implementation.
  - Regenerate wiki references from source.
  - Update project memory/worklog and remove obsolete survival notes.
- File Map:
  - `docs/project-memory.md`
  - `docs/worklog.md`
  - `docs/roadmap.md`
  - `src/wiki/pages/reference-systems.mdx` (generated)
  - `src/wiki/pages/reference-quests.mdx` (generated)
- Acceptance:
  - `npm run wiki:sync` and `npm run wiki:check` pass.
  - Docs reflect current crew/fridge behavior without stale text.

---

## Definition of Done (Crew v1)
- Crew simulation uses a fixed 4-person model (no aggregate-only survival state).
- Hunger, thirst, and sleep rotation run deterministically each tick.
- Feed the Crew completion unlocks fridge and preloads 5 Galaxy Bars.
- Reward text and actual grants/unlocks match exactly.
- Runtime persistence retains crew/fridge state across refresh.
- Validation passes:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run wiki:check`
