# Product Roadmap

## Goal
Ship a matter-economy game loop where mined/salvaged mass is transformed into useful products, crew sustenance, and sellable goods.

## Design Principles
- Keep mass conversion legible: users should understand where inputs go and what outputs come back.
- Start with a small recipe graph, then expand breadth.
- Prioritize playable loops over perfect simulation depth.

## Phase 1: Foundational Loop (MVP)
- Mining laser yields mixed rubble + salvage fragments.
- Rock sorter splits rubble into a small set of usable resources.
- Basic laboratory processors convert resources into starter components.
- Manufacturing creates first starter goods:
  - Box of Sand
  - Steel Ingot
  - Energy Cell
- Store panel allows selling goods for currency.
- Quests teach the full loop end-to-end.
- "First crafted item" is the MVP success moment.

## Phase 2: Laboratory Depth
- Expand processors (state changes, chemical splitting, thermal processing).
- Add recipe graph UI with required inputs, energy use, and output previews.
- Add process batching and queueing.
- Track atom/material conservation at a user-friendly level.

## Phase 3: Survival Chain (Crew v1 Delivered)
- Fixed 4-member crew simulation with per-member hunger, thirst, and automatic sleep rotation.
- First food production chain to Galaxy Bar.
- Soft debuff consequences for starvation/dehydration.
- Fridge subsystem delivered (quest unlock + starter bars) with fridge-first feed priority and food/hydration automation.

## Phase 4: Economy Expansion
- More manufactured categories (construction, electronics, medical, etc.).
- Dynamic store demand/pricing signals (starts in MVP, deepens here).
- Progression via upgrades unlocked by currency and/or tech milestones.

## Phase 5: Multi-Sector Operations
- Introduce sector-based world layout (jump between sectors instead of one oversized map).
- Give each sector its own station, target composition, and progression gating.
- Start with:
  - `Mars Corridor` as the primary production/mining zone.
  - `Earth Corridor` with Earth-side junk/landfill cleanup targets.
- Add long-duration extraction nodes to reduce grind from pure "one-shot asteroid" loops.
- Tie new materials and systems to sector unlocks so complexity scales predictably.

## Immediate Next Build Slice
- Sector extraction UX hardening:
  - keep persistent mining predictable (`=` toggle always cancels on movement input and collisions)
  - maintain explicit radar/contact role visuals for extraction nodes vs one-shot targets
- Celestial interaction prototype:
  - keep Earth as a skybox/background body in `Earth Corridor` to maintain large-scale readability without heavy collision/physics cost
  - evaluate hybrid moon mode (background moon + temporary collidable in-world proxy during approach windows)
  - preserve performance/readability by treating the proxy as a controlled encounter object, not a permanent far-distance gameplay mesh
- Expand Laboratory depth:
  - recipe-list + node-graph dual view
  - process batching/queueing for repetitive production
- Expand commerce loop:
  - richer sellable catalog beyond starter products
  - clearer demand/price trend visibility in Store
- Extend crew gameplay:
  - add actionable water/food stocking workflows and balancing passes
  - keep Crew + Quests + Wiki surfaces synchronized as systems evolve
- Begin sector architecture foundation:
  - sector state model + persistence (`active sector`, `per-sector station/world state`)
  - jump/warp UX shell and transition model
  - first pass content split between Mars and Earth sectors
