import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { formatPackSourceLabel, loadPackWithShards, readJsonFile } from './pack-loader.mjs'

const repoRoot = process.cwd()
const recipeSchemaPath = path.resolve(repoRoot, 'content', 'schemas', 'recipe.schema.json')
const recipePackPath = path.resolve(
  repoRoot,
  'content',
  'packs',
  'base',
  'recipes',
  'recipes.base.json',
)
const resourcePackPath = path.resolve(
  repoRoot,
  'content',
  'packs',
  'base',
  'resources',
  'resources.base.json',
)
const processPackPath = path.resolve(
  repoRoot,
  'content',
  'packs',
  'base',
  'processes',
  'processes.base.json',
)
const generatedRegistryPath = path.resolve(repoRoot, 'src', 'generated', 'registry', 'recipes.ts')
const RECIPE_ID_PATTERN = /^[a-z][a-zA-Z0-9]*$/
const UNLOCK_ID_PATTERN = /^[a-z][a-zA-Z0-9.:-]*$/
const RECIPE_UNLOCK_KINDS = ['starter', 'quest', 'research', 'reputation']
const RECIPE_UNLOCK_PREFIX_BY_KIND = {
  starter: 'starter.',
  quest: 'quest.',
  research: 'research.',
  reputation: 'market.',
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function normalizeResourceAmounts(
  value,
  fieldName,
  recipeId,
  knownResourceIds,
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`Recipe "${recipeId}" field "${fieldName}" must be an object map.`)
  }

  const entries = Object.entries(value)
  if (entries.length === 0) {
    fail(`Recipe "${recipeId}" field "${fieldName}" must include at least one resource.`)
  }

  const normalized = {}
  for (const [resourceId, amountValue] of entries) {
    if (!knownResourceIds.has(resourceId)) {
      fail(`Recipe "${recipeId}" field "${fieldName}" references unknown resource "${resourceId}".`)
    }

    const amount = Number(amountValue)
    if (!Number.isFinite(amount) || amount <= 0) {
      fail(`Recipe "${recipeId}" field "${fieldName}.${resourceId}" must be a finite number > 0.`)
    }

    normalized[resourceId] = amount
  }

  return normalized
}

function validateRecipe(recipeDefinition, index, knownResourceIds, knownProcessIds) {
  const prefix = `Recipe[${index}]`
  if (!recipeDefinition || typeof recipeDefinition !== 'object') {
    fail(`${prefix}: expected object.`)
  }

  const id = typeof recipeDefinition.id === 'string' ? recipeDefinition.id.trim() : ''
  if (!id) {
    fail(`${prefix}: missing "id".`)
  }
  if (!RECIPE_ID_PATTERN.test(id)) {
    fail(`${prefix}: id "${id}" must match ^[a-z][a-zA-Z0-9]*$.`)
  }

  const label = typeof recipeDefinition.label === 'string' ? recipeDefinition.label.trim() : ''
  if (!label) {
    fail(`${prefix}: missing "label".`)
  }

  const tier = Number(recipeDefinition.tier)
  if (!Number.isInteger(tier) || tier < 1) {
    fail(`${prefix}: "tier" must be an integer >= 1.`)
  }

  const discipline = typeof recipeDefinition.discipline === 'string'
    ? recipeDefinition.discipline.trim()
    : ''
  if (!discipline || !RECIPE_ID_PATTERN.test(discipline)) {
    fail(`${prefix}: "discipline" must match ^[a-z][a-zA-Z0-9]*$.`)
  }

  const station = typeof recipeDefinition.station === 'string'
    ? recipeDefinition.station.trim()
    : ''
  if (!station || !RECIPE_ID_PATTERN.test(station)) {
    fail(`${prefix}: "station" must match ^[a-z][a-zA-Z0-9]*$.`)
  }

  if (!recipeDefinition.unlock || typeof recipeDefinition.unlock !== 'object' || Array.isArray(recipeDefinition.unlock)) {
    fail(`${prefix}: "unlock" must be an object with "kind" and "id".`)
  }
  const unlockKind = typeof recipeDefinition.unlock.kind === 'string'
    ? recipeDefinition.unlock.kind.trim()
    : ''
  if (!RECIPE_UNLOCK_KINDS.includes(unlockKind)) {
    fail(`${prefix}: "unlock.kind" must be one of: ${RECIPE_UNLOCK_KINDS.join(', ')}.`)
  }
  const unlockId = typeof recipeDefinition.unlock.id === 'string'
    ? recipeDefinition.unlock.id.trim()
    : ''
  if (!unlockId || !UNLOCK_ID_PATTERN.test(unlockId)) {
    fail(`${prefix}: "unlock.id" must match ^[a-z][a-zA-Z0-9.:-]*$.`)
  }
  const expectedUnlockPrefix = RECIPE_UNLOCK_PREFIX_BY_KIND[unlockKind]
  if (!unlockId.startsWith(expectedUnlockPrefix)) {
    fail(`${prefix}: unlock id "${unlockId}" must start with "${expectedUnlockPrefix}".`)
  }

  const summary = typeof recipeDefinition.summary === 'string'
    ? recipeDefinition.summary.trim()
    : undefined
  if (typeof recipeDefinition.summary !== 'undefined' && !summary) {
    fail(`${prefix}: "summary" must be non-empty when present.`)
  }

  const processId = typeof recipeDefinition.processId === 'string'
    ? recipeDefinition.processId.trim()
    : undefined
  if (typeof recipeDefinition.processId !== 'undefined') {
    if (!processId) {
      fail(`${prefix}: "processId" must be non-empty when present.`)
    }
    if (!RECIPE_ID_PATTERN.test(processId)) {
      fail(`${prefix}: processId "${processId}" must match ^[a-z][a-zA-Z0-9]*$.`)
    }
    if (!knownProcessIds.has(processId)) {
      fail(`${prefix}: unknown processId "${processId}".`)
    }
  }

  const inputs = normalizeResourceAmounts(
    recipeDefinition.inputs,
    'inputs',
    id,
    knownResourceIds,
  )
  const outputs = normalizeResourceAmounts(
    recipeDefinition.outputs,
    'outputs',
    id,
    knownResourceIds,
  )

  const tags = Array.isArray(recipeDefinition.tags)
    ? recipeDefinition.tags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter((tag) => tag.length > 0)
    : []
  const tagSet = new Set()
  tags.forEach((tag) => {
    if (!RECIPE_ID_PATTERN.test(tag)) {
      fail(`${prefix}: tag "${tag}" must match ^[a-z][a-zA-Z0-9]*$.`)
    }
    if (tagSet.has(tag)) {
      fail(`${prefix}: duplicate tag "${tag}".`)
    }
    tagSet.add(tag)
  })

  return {
    id,
    label,
    tier,
    discipline,
    station,
    unlock: {
      kind: unlockKind,
      id: unlockId,
    },
    summary,
    processId,
    inputs,
    outputs,
    tags,
  }
}

function validateRecipePack(recipePack, knownResourceIds, knownProcessIds) {
  if (!recipePack || typeof recipePack !== 'object') {
    fail('Recipe pack: expected top-level object.')
  }

  const packId = typeof recipePack.packId === 'string' ? recipePack.packId.trim() : ''
  if (!packId) {
    fail('Recipe pack: "packId" is required.')
  }

  const version = Number(recipePack.version)
  if (!Number.isInteger(version) || version < 1) {
    fail('Recipe pack: "version" must be an integer >= 1.')
  }

  if (!Array.isArray(recipePack.recipes) || recipePack.recipes.length === 0) {
    fail('Recipe pack: "recipes" must be a non-empty array.')
  }

  const recipes = recipePack.recipes.map((entry, index) =>
    validateRecipe(entry, index, knownResourceIds, knownProcessIds))

  const seenIds = new Set()
  for (const recipe of recipes) {
    if (seenIds.has(recipe.id)) {
      fail(`Recipe pack: duplicate recipe id "${recipe.id}".`)
    }
    seenIds.add(recipe.id)
  }

  return {
    packId,
    version,
    recipes,
  }
}

function buildRegistrySource(recipePack, sourceLabel) {
  const recipeLiteral = JSON.stringify(recipePack.recipes, null, 2)

  return `// @generated by tools/content-build/build-recipes-registry.mjs
// source: ${sourceLabel}

import type { ProcessId } from './processes.js'
import type { ResourceId } from './resources.js'

export type ResourceAmounts = Partial<Record<ResourceId, number>>

const recipeCatalogData = ${recipeLiteral} as const

export type RecipeId = typeof recipeCatalogData[number]['id']
export type RecipeDiscipline = typeof recipeCatalogData[number]['discipline']
export type RecipeStation = typeof recipeCatalogData[number]['station']
export type RecipeUnlockKind = typeof recipeCatalogData[number]['unlock']['kind']

export interface RecipeUnlock {
  kind: RecipeUnlockKind
  id: string
}

export interface RecipeDefinition {
  id: RecipeId
  label: string
  tier: number
  discipline: RecipeDiscipline
  station: RecipeStation
  unlock: RecipeUnlock
  summary?: string
  processId?: ProcessId
  inputs: ResourceAmounts
  outputs: ResourceAmounts
  tags: string[]
}

function normalizeResourceAmounts(value: Record<string, number>): ResourceAmounts {
  return Object.fromEntries(
    Object.entries(value).map(([resourceId, amount]) => [resourceId as ResourceId, Number(amount)]),
  ) as ResourceAmounts
}

export const recipeDefinitions: RecipeDefinition[] = recipeCatalogData.map((recipe) => ({
  id: recipe.id,
  label: recipe.label,
  tier: Number(recipe.tier),
  discipline: String(recipe.discipline) as RecipeDiscipline,
  station: String(recipe.station) as RecipeStation,
  unlock: {
    kind: recipe.unlock.kind as RecipeUnlockKind,
    id: String(recipe.unlock.id),
  },
  summary: 'summary' in recipe ? String(recipe.summary) : undefined,
  processId: 'processId' in recipe ? recipe.processId as ProcessId : undefined,
  inputs: normalizeResourceAmounts(recipe.inputs as Record<string, number>),
  outputs: normalizeResourceAmounts(recipe.outputs as Record<string, number>),
  tags: Array.isArray(recipe.tags) ? recipe.tags.map((tag) => String(tag)) : [],
}))

export const recipeById = recipeDefinitions.reduce<Record<RecipeId, RecipeDefinition>>((map, recipe) => {
  map[recipe.id] = recipe
  return map
}, {} as Record<RecipeId, RecipeDefinition>)

export const recipeIds = recipeDefinitions.map((recipe) => recipe.id)

export function resolveRecipesByOutput(resourceId: ResourceId): RecipeDefinition[] {
  return recipeDefinitions.filter((recipe) => Number(recipe.outputs[resourceId] ?? 0) > 0)
}
`
}

function main() {
  const checkMode = process.argv.includes('--check')
  const writeMode = process.argv.includes('--write')

  if (!existsSync(recipeSchemaPath)) {
    fail(`Missing schema: ${path.relative(repoRoot, recipeSchemaPath)}`)
  }
  if (!existsSync(recipePackPath)) {
    fail(`Missing recipe pack: ${path.relative(repoRoot, recipePackPath)}`)
  }
  if (!existsSync(resourcePackPath)) {
    fail(`Missing resource pack: ${path.relative(repoRoot, resourcePackPath)}`)
  }
  if (!existsSync(processPackPath)) {
    fail(`Missing process pack: ${path.relative(repoRoot, processPackPath)}`)
  }

  readJsonFile(recipeSchemaPath, repoRoot, fail)
  const loadedResourcePack = loadPackWithShards({
    repoRoot,
    basePackPath: resourcePackPath,
    entityKey: 'resources',
    fail,
  })
  const loadedProcessPack = loadPackWithShards({
    repoRoot,
    basePackPath: processPackPath,
    entityKey: 'processes',
    fail,
  })
  const loadedRecipePack = loadPackWithShards({
    repoRoot,
    basePackPath: recipePackPath,
    entityKey: 'recipes',
    fail,
  })

  const resourcePack = loadedResourcePack.pack
  const processPack = loadedProcessPack.pack
  const recipePack = loadedRecipePack.pack

  const knownResourceIds = new Set(
    Array.isArray(resourcePack?.resources)
      ? resourcePack.resources
          .map((resource) => (typeof resource?.id === 'string' ? resource.id.trim() : ''))
          .filter((id) => id.length > 0)
      : [],
  )
  if (knownResourceIds.size === 0) {
    fail('Resource pack is empty or invalid; cannot validate recipe pack.')
  }

  const knownProcessIds = new Set(
    Array.isArray(processPack?.processes)
      ? processPack.processes
          .map((processDefinition) =>
            typeof processDefinition?.id === 'string' ? processDefinition.id.trim() : '')
          .filter((id) => id.length > 0)
      : [],
  )
  if (knownProcessIds.size === 0) {
    fail('Process pack is empty or invalid; cannot validate recipe pack.')
  }

  const validatedPack = validateRecipePack(recipePack, knownResourceIds, knownProcessIds)
  const source = buildRegistrySource(
    validatedPack,
    formatPackSourceLabel(loadedRecipePack.sourceFiles, repoRoot),
  )

  if (writeMode) {
    mkdirSync(path.dirname(generatedRegistryPath), { recursive: true })
    writeFileSync(generatedRegistryPath, source, 'utf8')
    console.log(
      `Wrote ${path.relative(repoRoot, generatedRegistryPath)} (${validatedPack.recipes.length} recipes, ${loadedRecipePack.shardCount} shard(s)).`,
    )
    return
  }

  if (!checkMode) {
    console.log(`Validated recipe pack (${validatedPack.recipes.length} recipes).`)
    return
  }

  if (!existsSync(generatedRegistryPath)) {
    fail(`Missing generated registry: ${path.relative(repoRoot, generatedRegistryPath)}. Run --write.`)
  }

  const current = readFileSync(generatedRegistryPath, 'utf8')
  if (current !== source) {
    fail(
      `Generated registry is stale: ${path.relative(repoRoot, generatedRegistryPath)}. Run "npm run content:build".`,
    )
  }

  console.log(
    `Content check passed: ${path.relative(repoRoot, generatedRegistryPath)} matches recipe pack (${validatedPack.recipes.length} recipes, ${loadedRecipePack.shardCount} shard(s)).`,
  )
}

main()
