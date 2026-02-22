# Wiki Governance

## Purpose
Keep in-game wiki content synchronized with gameplay systems, quests, and data definitions.

## Source of Truth Rules
- Generated reference pages are canonical mirrors of code constants/catalogs.
- Manual lore/how-to pages are edited directly and should explain intent and player guidance.
- If a generated page conflicts with manual text, generated data wins for factual values.

## Generated Pages
- Output location:
  - `src/wiki/pages/reference-systems.mdx`
  - `src/wiki/pages/reference-process-catalog.mdx`
  - `src/wiki/pages/reference-resource-catalog.mdx`
  - `src/wiki/pages/reference-quests.mdx`
  - `src/wiki/generated/wikiGeneratedIndex.ts`
- Generator script: `scripts/wiki-sync.ts`
- Commands:
  - `npm run wiki:sync` writes generated pages.
  - `npm run wiki:check` validates generated pages are current.
- CI enforcement:
  - `.github/workflows/ci.yml` runs `npm run wiki:check` on push/PR.

## Change Workflow
1. Update gameplay/spec source code (constants, process catalog, resources, quests).
2. Run `npm run wiki:sync`.
3. Run `npm run wiki:check`.
4. Run `npm run build`.
5. If any manual wiki page becomes outdated, update or remove it in the same change.

## Definition of Done (Wiki)
- `wiki:check` passes.
- Build passes with MDX compilation.
- Generated index includes every generated page metadata entry.
- No stale generated artifacts outside `src/wiki` exist.
