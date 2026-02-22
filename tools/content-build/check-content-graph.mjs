import path from 'node:path'
import process from 'node:process'
import { loadPackWithShards } from './pack-loader.mjs'

const repoRoot = process.cwd()
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
const recipePackPath = path.resolve(
  repoRoot,
  'content',
  'packs',
  'base',
  'recipes',
  'recipes.base.json',
)
const RECIPE_ID_PATTERN = /^[a-z][a-zA-Z0-9]*$/
const UNLOCK_ID_PATTERN = /^[a-z][a-zA-Z0-9.:-]*$/
const RECIPE_UNLOCK_KINDS = new Set(['starter', 'quest', 'research', 'reputation'])
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

function normalizeResourceAmounts(value, fieldName, ownerId, knownResourceIds) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`"${ownerId}" field "${fieldName}" must be an object map.`)
  }

  const normalized = {}
  const entries = Object.entries(value)
  if (entries.length === 0) {
    fail(`"${ownerId}" field "${fieldName}" must include at least one resource.`)
  }

  for (const [resourceId, amountValue] of entries) {
    if (!knownResourceIds.has(resourceId)) {
      fail(`"${ownerId}" field "${fieldName}" references unknown resource "${resourceId}".`)
    }

    const amount = Number(amountValue)
    if (!Number.isFinite(amount) || amount <= 0) {
      fail(`"${ownerId}" field "${fieldName}.${resourceId}" must be a finite number > 0.`)
    }

    normalized[resourceId] = amount
  }

  return normalized
}

function toSortedPairs(amounts) {
  return Object.entries(amounts)
    .map(([resourceId, amount]) => [resourceId, Number(amount)])
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
}

function equalAmounts(left, right) {
  const leftPairs = toSortedPairs(left)
  const rightPairs = toSortedPairs(right)

  if (leftPairs.length !== rightPairs.length) {
    return false
  }

  for (let index = 0; index < leftPairs.length; index += 1) {
    const [leftId, leftAmount] = leftPairs[index]
    const [rightId, rightAmount] = rightPairs[index]
    if (leftId !== rightId) {
      return false
    }
    if (Math.abs(leftAmount - rightAmount) > 1e-9) {
      return false
    }
  }

  return true
}

function normalizeRecipeMetadata(recipeEntry, recipeId) {
  const tier = Number(recipeEntry.tier)
  if (!Number.isInteger(tier) || tier < 1) {
    fail(`Recipe "${recipeId}" must define integer tier >= 1.`)
  }

  const discipline = typeof recipeEntry.discipline === 'string'
    ? recipeEntry.discipline.trim()
    : ''
  if (!discipline || !RECIPE_ID_PATTERN.test(discipline)) {
    fail(`Recipe "${recipeId}" must define discipline matching ^[a-z][a-zA-Z0-9]*$.`)
  }

  const station = typeof recipeEntry.station === 'string'
    ? recipeEntry.station.trim()
    : ''
  if (!station || !RECIPE_ID_PATTERN.test(station)) {
    fail(`Recipe "${recipeId}" must define station matching ^[a-z][a-zA-Z0-9]*$.`)
  }

  if (!recipeEntry.unlock || typeof recipeEntry.unlock !== 'object' || Array.isArray(recipeEntry.unlock)) {
    fail(`Recipe "${recipeId}" must define unlock metadata.`)
  }
  const unlockKind = typeof recipeEntry.unlock.kind === 'string'
    ? recipeEntry.unlock.kind.trim()
    : ''
  if (!RECIPE_UNLOCK_KINDS.has(unlockKind)) {
    fail(`Recipe "${recipeId}" unlock kind "${unlockKind}" is invalid.`)
  }
  const unlockId = typeof recipeEntry.unlock.id === 'string'
    ? recipeEntry.unlock.id.trim()
    : ''
  if (!unlockId || !UNLOCK_ID_PATTERN.test(unlockId)) {
    fail(`Recipe "${recipeId}" unlock id must match ^[a-z][a-zA-Z0-9.:-]*$.`)
  }

  const unlockPrefix = RECIPE_UNLOCK_PREFIX_BY_KIND[unlockKind]
  if (!unlockId.startsWith(unlockPrefix)) {
    fail(`Recipe "${recipeId}" unlock id "${unlockId}" must start with "${unlockPrefix}".`)
  }

  if (tier === 1 && unlockKind !== 'starter') {
    fail(`Recipe "${recipeId}" has tier 1 but unlock kind "${unlockKind}". Tier 1 recipes must use starter unlocks.`)
  }
  if (tier > 1 && unlockKind === 'starter') {
    fail(`Recipe "${recipeId}" has tier ${tier} but starter unlock. Tier > 1 recipes must use non-starter unlocks.`)
  }

  return {
    tier,
    discipline,
    station,
    unlock: {
      kind: unlockKind,
      id: unlockId,
    },
  }
}

function detectRecipeCycles(recipeIds, edgesByRecipeId) {
  const state = new Map()
  const stack = []
  const cycles = []

  const visit = (recipeId) => {
    const currentState = state.get(recipeId) ?? 'unvisited'
    if (currentState === 'visiting') {
      const startIndex = stack.indexOf(recipeId)
      const cycle = startIndex >= 0
        ? [...stack.slice(startIndex), recipeId]
        : [recipeId, recipeId]
      cycles.push(cycle)
      return
    }
    if (currentState === 'visited') {
      return
    }

    state.set(recipeId, 'visiting')
    stack.push(recipeId)

    const dependencies = edgesByRecipeId.get(recipeId) ?? new Set()
    for (const dependencyRecipeId of dependencies) {
      visit(dependencyRecipeId)
    }

    stack.pop()
    state.set(recipeId, 'visited')
  }

  recipeIds.forEach((recipeId) => {
    if ((state.get(recipeId) ?? 'unvisited') === 'unvisited') {
      visit(recipeId)
    }
  })

  return cycles
}

function main() {
  const resourcePack = loadPackWithShards({
    repoRoot,
    basePackPath: resourcePackPath,
    entityKey: 'resources',
    fail,
  }).pack
  const processPack = loadPackWithShards({
    repoRoot,
    basePackPath: processPackPath,
    entityKey: 'processes',
    fail,
  }).pack
  const recipePack = loadPackWithShards({
    repoRoot,
    basePackPath: recipePackPath,
    entityKey: 'recipes',
    fail,
  }).pack

  if (!Array.isArray(resourcePack?.resources) || resourcePack.resources.length === 0) {
    fail('Resource pack must include at least one resource.')
  }
  if (!Array.isArray(processPack?.processes) || processPack.processes.length === 0) {
    fail('Process pack must include at least one process.')
  }
  if (!Array.isArray(recipePack?.recipes) || recipePack.recipes.length === 0) {
    fail('Recipe pack must include at least one recipe.')
  }

  const resourceIds = new Set(
    resourcePack.resources
      .map((resource) => (typeof resource?.id === 'string' ? resource.id.trim() : ''))
      .filter((id) => id.length > 0),
  )
  const processById = new Map(
    processPack.processes
      .map((processDefinition) => {
        const processId = typeof processDefinition?.id === 'string'
          ? processDefinition.id.trim()
          : ''
        if (!processId) {
          return null
        }

        const consume = normalizeResourceAmounts(
          processDefinition.consume ?? {},
          'consume',
          processId,
          resourceIds,
        )
        const produce = normalizeResourceAmounts(
          processDefinition.produce ?? {},
          'produce',
          processId,
          resourceIds,
        )

        return [
          processId,
          {
            id: processId,
            consume,
            produce,
          },
        ]
      })
      .filter((entry) => entry !== null),
  )

  if (processById.size !== processPack.processes.length) {
    fail('Process pack contains invalid or duplicate process ids.')
  }

  const recipeById = new Map()
  const producersByResource = new Map()
  const disciplineIds = new Set()
  const stationIds = new Set()
  const tierValues = new Set()

  for (const recipeEntry of recipePack.recipes) {
    const recipeId = typeof recipeEntry?.id === 'string' ? recipeEntry.id.trim() : ''
    if (!recipeId) {
      fail('Recipe pack contains a recipe without valid "id".')
    }
    if (!RECIPE_ID_PATTERN.test(recipeId)) {
      fail(`Recipe "${recipeId}" id must match ^[a-z][a-zA-Z0-9]*$.`)
    }
    if (recipeById.has(recipeId)) {
      fail(`Recipe pack contains duplicate recipe id "${recipeId}".`)
    }

    const inputs = normalizeResourceAmounts(
      recipeEntry.inputs ?? {},
      'inputs',
      recipeId,
      resourceIds,
    )
    const outputs = normalizeResourceAmounts(
      recipeEntry.outputs ?? {},
      'outputs',
      recipeId,
      resourceIds,
    )
    const metadata = normalizeRecipeMetadata(recipeEntry, recipeId)

    const processId = typeof recipeEntry.processId === 'string'
      ? recipeEntry.processId.trim()
      : ''
    if (processId) {
      if (!RECIPE_ID_PATTERN.test(processId)) {
        fail(`Recipe "${recipeId}" processId "${processId}" must match ^[a-z][a-zA-Z0-9]*$.`)
      }
      const processDefinition = processById.get(processId)
      if (!processDefinition) {
        fail(`Recipe "${recipeId}" references unknown processId "${processId}".`)
      }

      if (!equalAmounts(inputs, processDefinition.consume)) {
        fail(
          `Recipe "${recipeId}" inputs do not match process "${processId}" consume map.`,
        )
      }
      if (!equalAmounts(outputs, processDefinition.produce)) {
        fail(
          `Recipe "${recipeId}" outputs do not match process "${processId}" produce map.`,
        )
      }
    }

    recipeById.set(recipeId, {
      id: recipeId,
      tier: metadata.tier,
      discipline: metadata.discipline,
      station: metadata.station,
      unlock: metadata.unlock,
      inputs,
      outputs,
    })
    disciplineIds.add(metadata.discipline)
    stationIds.add(metadata.station)
    tierValues.add(metadata.tier)

    Object.keys(outputs).forEach((resourceId) => {
      const existing = producersByResource.get(resourceId) ?? new Set()
      existing.add(recipeId)
      producersByResource.set(resourceId, existing)
    })
  }

  const edgesByRecipeId = new Map()
  for (const [recipeId, recipe] of recipeById.entries()) {
    const dependencies = new Set()
    for (const resourceId of Object.keys(recipe.inputs)) {
      const producers = producersByResource.get(resourceId)
      if (!producers) {
        continue
      }

      producers.forEach((producerRecipeId) => {
        dependencies.add(producerRecipeId)
      })
    }

    edgesByRecipeId.set(recipeId, dependencies)
  }

  for (const [recipeId, dependencies] of edgesByRecipeId.entries()) {
    const recipe = recipeById.get(recipeId)
    if (!recipe) {
      continue
    }

    dependencies.forEach((dependencyRecipeId) => {
      const dependencyRecipe = recipeById.get(dependencyRecipeId)
      if (!dependencyRecipe) {
        return
      }

      if (dependencyRecipe.tier > recipe.tier) {
        fail(
          `Recipe tier regression: "${recipeId}" (tier ${recipe.tier}) depends on "${dependencyRecipeId}" (tier ${dependencyRecipe.tier}).`,
        )
      }
    })
  }

  const cycles = detectRecipeCycles([...recipeById.keys()], edgesByRecipeId)
  if (cycles.length > 0) {
    const rendered = cycles
      .slice(0, 5)
      .map((cycle) => cycle.join(' -> '))
    fail(`Recipe dependency cycles detected:\n- ${rendered.join('\n- ')}`)
  }

  const dependencyEdgeCount = [...edgesByRecipeId.values()]
    .reduce((sum, edges) => sum + edges.size, 0)

  console.log(
    `Content graph check passed: ${resourceIds.size} resources, ${processById.size} processes, ${recipeById.size} recipes, ${dependencyEdgeCount} recipe dependency edge(s), ${tierValues.size} tier(s), ${disciplineIds.size} discipline(s), ${stationIds.size} station(s), no cycles.`,
  )
}

main()
