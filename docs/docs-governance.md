# Docs Governance

## Objective
Keep project docs accurate, concise, and useful for future sessions without accumulating stale noise.

## Active Documents
- `docs/project-memory.md`: current truth only (short horizon, no historical backlog).
- `docs/tickets-mvp-v1.md`: current implementation backlog and statuses.
- `docs/architecture.md`: target structure and migration plan.
- `docs/wiki-governance.md`: wiki sync and ownership rules.
- `docs/worklog.md`: append-only history of completed work.

## Curation Rules
1. Update active docs when behavior, UI, or architecture changes.
2. Remove or rewrite stale statements immediately in the same change.
3. Keep strategic docs compact:
   - `project-memory.md` should remain scannable in 1-2 screens.
   - long implementation detail belongs in `worklog.md`.
4. Do not duplicate facts across files unless needed for navigation.
5. Prefer source-of-truth references to avoid drift (code constants, generated wiki, canonical catalogs).

## Session Checklist
1. Read `project-memory.md` + latest `worklog.md` entry.
2. Implement changes.
3. Run relevant validation (`lint`, `test`, `wiki:check`, `build`).
4. Update docs:
   - refresh `project-memory.md` current truth
   - append `worklog.md`
   - cull outdated bullets from active docs

