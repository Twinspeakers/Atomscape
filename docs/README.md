# Docs Workflow

## Goal
Preserve project context across long sessions and context compaction.

## Files
- `docs/project-memory.md`: current truth (short, curated, up to date).
- `docs/worklog.md`: chronological implementation log (append-only).
- `docs/decisions/`: ADRs for meaningful technical/product decisions.
- `docs/architecture.md`: target code structure and migration phases.
- `docs/architecture-scaleout-plan-v1.md`: end-to-end migration program for content-scale architecture and long-term module boundaries.
- `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`: compact continuity checkpoint for resuming the scale-out program after context compaction.
- `content/README.md`: content-pack structure, commands, and generated-registry workflow.
- `docs/crew-systems-spec-v1.md`: locked v1 crew simulation spec (4 crew, hunger/thirst/sleep, fridge unlock).
- `docs/quest-system-standard-v1.md`: quest architecture standards (source of truth, progression, rewards, UI parity, test gates).
- `docs/ui-ship-lab-systems-deck-plan-2026-02-24.md`: approved UX implementation plan for Ship systems deck, Laboratory icon/readability pass, and battery progression challenge rebalance.
- `docs/wiki-governance.md`: wiki ownership and synchronization workflow.
- `docs/docs-governance.md`: retention and curation rules for all markdown docs.
- `docs/tickets-viewport-v1.md`: concrete implementation tickets for Babylon viewport modernization.
- `docs/tickets-crew-v1.md`: concrete implementation tickets for crew systems v1.

## Update Cadence
- At session start:
  - Read `docs/project-memory.md` and latest `docs/worklog.md` entry.
  - If executing architecture migration work, also read `docs/context-checkpoint-2026-02-21-architecture-scaleout.md`.
- After major change:
  - Update `project-memory.md` if current truth changed.
  - Append one worklog entry with files + validation.
  - Add/modify ADR when a non-trivial decision is made.

## Quality Rules
- Keep `project-memory.md` under 1-2 screenfuls.
- Prefer bullet points over prose.
- Record outcomes and constraints, not brainstorming.
- Reference concrete files and commands in worklog entries.
- For simulation/spec changes, run `npm run wiki:sync` + `npm run wiki:check`.
- Wiki generator implementation now lives at `tools/wiki-build/wiki-sync.ts`; `scripts/wiki-sync.ts` is a compatibility wrapper entrypoint.
- For content-pack changes, run `npm run content:build` and verify with `npm run content:check`.
- Use `npm run content:check-graph` directly when iterating recipe/process linkage or dependency ordering.
- Recipe-pack edits must keep metadata complete (`tier`, `discipline`, `station`, `unlock`) because graph checks now enforce unlock/tier progression constraints.
- For large catalogs, prefer `content/packs/*/*/shards/*.json` with sortable filenames; build/check scripts now merge base + shard files deterministically.
- Cull stale/outdated bullets from active docs as part of each substantial change.
