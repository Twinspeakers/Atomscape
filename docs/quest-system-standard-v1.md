# Quest System Standard v1

## Purpose
Keep quest content scalable without drifting into one-off logic or UI inconsistency.

## Non-Negotiable Architecture
- Single source of truth for quest definitions:
  - Quest metadata, step IDs, and reward descriptors live in `src/features/quests/questDefinitions.ts`.
- Single source of truth for quest presentation:
  - Any quest UI must consume `buildQuestProgressModel(...)`.
  - No component should rebuild quest progress logic ad hoc.
- Single source of truth for reward delivery:
  - Reward grant application must happen only in store reward-claim path (`src/state/runtime/runtimeStoreOrchestration.ts`, wired through `src/state/storeRuntime.ts` / `@state/store`).
  - UI may display rewards, but must not mutate inventory/unlocks directly.

## Step Design Rules
- Every step has a stable ID.
- Completion criteria are deterministic and code-readable.
- Progression predicates should be state-driven (inventory/telemetry/actions), not UI-driven.
- If a step can regress (resource consumed), regression behavior must be explicit in code.
- Resource-dependent quest steps must dynamically regress when requirements are no longer met and the chain has not advanced past that point.
- Quests must also auto-advance/auto-complete when live state already satisfies requirements, even if the player did not follow the quest UI step-by-step.

## Active Quest Rules
- Active Main quest is explicit player state (`activeMainQuestId`), not inferred from incidental index drift.
- If active quest is unset/invalid, fallback is first incomplete Main quest in canonical order.
- Sidebar quick quest and Game Menu quest page must reflect the same active quest state.

## Rewards Rules
- Rewards are concrete and inspectable:
  - items/material amounts
  - unlock flags
  - destination context (Cargo, Fridge, etc.)
- Rewards are one-time per quest ID and idempotent against refresh/re-evaluation.
- Reward delivery should generate:
  - simulation log entry
  - user-facing completion notification/modal payload

## UI Consistency Rules
- Sidebar and Game Menu quests must remain parity views over the same model.
- Quick panel shows focused context (active quest + pinned extras).
- Game Menu provides full controls (pin/unpin, set active, expanded step detail).
- Quest completion reward modal reads from reward-delivery payload, not from inferred UI state.

## Testing + Validation Gate
- Minimum gate after quest changes:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- If quest copy/spec data changes:
  - `npm run wiki:sync`
  - `npm run wiki:check`

## Extension Policy
- New quest chains should be added via data-first definitions, then hooked to predicate logic.
- Avoid introducing a second quest runtime model unless this standard is revised via ADR.
