import { recipeDefinitions } from '../../../src/generated/registry/recipes.js'
import type { ResourceId } from '../../../src/generated/registry/resources.js'
import { formatQty, formatResourceMap } from '../formatters.js'
import { AUTO_GENERATED_HEADER, type GeneratedPage } from '../types.js'

export function buildRecipeCatalogPage(): GeneratedPage {
  const recipeRows = [...recipeDefinitions]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((recipe) =>
      [
        `### ${recipe.label} (\`${recipe.id}\`)`,
        '',
        `- Tier: **${formatQty(recipe.tier)}**`,
        `- Discipline: \`${recipe.discipline}\``,
        `- Station: \`${recipe.station}\``,
        `- Unlock: \`${recipe.unlock.kind}\` / \`${recipe.unlock.id}\``,
        recipe.summary ? `- Summary: ${recipe.summary}` : null,
        recipe.processId ? `- Process: \`${recipe.processId}\`` : '- Process: (none)',
        '- Inputs:',
        formatResourceMap(recipe.inputs as Partial<Record<ResourceId, number>>),
        '- Outputs:',
        formatResourceMap(recipe.outputs as Partial<Record<ResourceId, number>>),
        recipe.tags.length > 0 ? `- Tags: ${recipe.tags.map((tag) => `\`${tag}\``).join(', ')}` : '- Tags: (none)',
        '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n')

  const processBoundCount = recipeDefinitions.filter((recipe) => Boolean(recipe.processId)).length
  const uniqueTagCount = new Set(
    recipeDefinitions.flatMap((recipe) => recipe.tags),
  ).size
  const uniqueDisciplineCount = new Set(recipeDefinitions.map((recipe) => recipe.discipline)).size
  const uniqueStationCount = new Set(recipeDefinitions.map((recipe) => recipe.station)).size
  const uniqueUnlockKindCount = new Set(recipeDefinitions.map((recipe) => recipe.unlock.kind)).size
  const tierDistribution = Object.entries(
    recipeDefinitions.reduce<Record<number, number>>((map, recipe) => {
      const current = map[recipe.tier] ?? 0
      map[recipe.tier] = current + 1
      return map
    }, {}),
  )
    .sort(([leftTier], [rightTier]) => Number(leftTier) - Number(rightTier))
    .map(([tier, count]) => `T${tier}: ${formatQty(count)}`)
    .join(', ')

  const content = [
    AUTO_GENERATED_HEADER,
    '# Recipe Catalog Reference',
    '',
    'This page is generated from the recipe registry and updates with authored recipe-pack changes.',
    '',
    `- Total recipes: **${formatQty(recipeDefinitions.length)}**`,
    `- Process-bound recipes: **${formatQty(processBoundCount)}**`,
    `- Unique disciplines: **${formatQty(uniqueDisciplineCount)}**`,
    `- Unique stations: **${formatQty(uniqueStationCount)}**`,
    `- Unlock kinds: **${formatQty(uniqueUnlockKindCount)}**`,
    `- Unique tags: **${formatQty(uniqueTagCount)}**`,
    `- Tier distribution: ${tierDistribution || '(none)'}`,
    '',
    recipeRows,
  ].join('\n')

  return {
    meta: {
      slug: 'reference-recipe-catalog',
      title: 'Recipe Catalog Reference',
      summary: 'Generated list of recipe definitions mapped to tier, unlock, process nodes, IO, and tags.',
      tags: ['reference', 'recipes', 'crafting'],
    },
    filename: 'reference-recipe-catalog.mdx',
    content,
  }
}
