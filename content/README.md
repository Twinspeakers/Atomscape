# Content Packs

## Purpose
- Keep large authored gameplay catalogs out of runtime TS source.
- Validate authored content and generate deterministic runtime registries.

## Current Structure
- `content/schemas/`: JSON schema contracts for pack formats.
- `content/packs/base/resources/resources.base.json`: base resource catalog source-of-truth.
- `content/packs/base/processes/processes.base.json`: base process catalog source-of-truth.
- `content/packs/base/recipes/recipes.base.json`: base recipe catalog source-of-truth.
- Pre-created shard-ready domains for upcoming migrations:
  - `content/packs/base/items/shards/`
  - `content/packs/base/tools/shards/`
  - `content/packs/base/crew/shards/`
  - `content/packs/base/quests/shards/`
  - `content/packs/base/sectors/shards/`
  - `content/packs/base/scenes/shards/`
  - `content/packs/base/elements/shards/`
  - `content/packs/base/compounds/shards/`
- Optional shard directories (auto-loaded, lexicographic order):
  - `content/packs/base/resources/shards/*.json`
  - `content/packs/base/processes/shards/*.json`
  - `content/packs/base/recipes/shards/*.json`

## Commands
- `npm run content:build`: validate packs and regenerate runtime registry output.
- `npm run content:check`: fail if generated registry is stale vs pack source.
- `npm run content:check-graph`: validate recipe/process/resource linkage and recipe-dependency acyclicity.

## Generated Runtime Output
- `src/generated/registry/resources.ts`
- `src/generated/registry/processes.ts`
- `src/generated/registry/recipes.ts`

## Authoring Rule
- Edit pack files in `content/packs/*` and then run `npm run content:build`.

## Sharding Conventions
- Keep `*.base.json` as canonical metadata anchor (`packId`, `version`) and optionally some entries.
- Put high-cardinality spillover into `shards/*.json` files with shape:
  - `{ "shardId": "recipes.market.0012-0015", "recipes": [ ... ] }`
  - Equivalent entity keys for other catalogs: `resources` or `processes`.
- Shards must:
  - use lowercase sortable filenames (`recipes.market.0012-0015.json`)
  - omit `packId` and `version` (base file remains pack authority)
  - contain non-empty entry arrays
- Merge order is deterministic: base entries first, then shard files by filename.

## Recipe Metadata Contract
- Every recipe must define:
  - `tier` (integer >= 1)
  - `discipline` (ID-form string)
  - `station` (ID-form string)
  - `unlock.kind` (`starter`, `quest`, `research`, `reputation`)
  - `unlock.id` (prefix-scoped ID: `starter.*`, `quest.*`, `research.*`, `market.*`)
- `npm run content:check-graph` enforces:
  - valid metadata formatting and unlock prefix consistency
  - tier gating (`tier=1` uses `starter`; higher tiers use non-starter unlocks)
  - no recipe tier regressions across dependency edges
  - no recipe dependency cycles
