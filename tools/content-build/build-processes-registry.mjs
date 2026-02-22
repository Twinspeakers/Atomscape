import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { formatPackSourceLabel, loadPackWithShards, readJsonFile } from './pack-loader.mjs'

const repoRoot = process.cwd()
const processSchemaPath = path.resolve(repoRoot, 'content', 'schemas', 'process.schema.json')
const processPackPath = path.resolve(
  repoRoot,
  'content',
  'packs',
  'base',
  'processes',
  'processes.base.json',
)
const resourcePackPath = path.resolve(
  repoRoot,
  'content',
  'packs',
  'base',
  'resources',
  'resources.base.json',
)
const generatedRegistryPath = path.resolve(repoRoot, 'src', 'generated', 'registry', 'processes.ts')

function fail(message) {
  console.error(message)
  process.exit(1)
}

function validateResourceIds(resourcePack) {
  if (!resourcePack || typeof resourcePack !== 'object' || !Array.isArray(resourcePack.resources)) {
    fail('Resource pack: expected "resources" array.')
  }

  const resourceIds = new Set()
  for (const [index, resource] of resourcePack.resources.entries()) {
    const id = typeof resource?.id === 'string' ? resource.id.trim() : ''
    if (!id) {
      fail(`Resource pack resource[${index}] is missing "id".`)
    }
    resourceIds.add(id)
  }

  return resourceIds
}

function validateResourceAmounts(amounts, fieldName, processId, knownResourceIds) {
  if (typeof amounts === 'undefined') {
    return undefined
  }

  if (!amounts || typeof amounts !== 'object' || Array.isArray(amounts)) {
    fail(`Process "${processId}" field "${fieldName}" must be an object map.`)
  }

  const entries = Object.entries(amounts)
  const normalized = {}

  for (const [resourceId, value] of entries) {
    if (!knownResourceIds.has(resourceId)) {
      fail(`Process "${processId}" field "${fieldName}" references unknown resource "${resourceId}".`)
    }

    const amount = Number(value)
    if (!Number.isFinite(amount) || amount <= 0) {
      fail(`Process "${processId}" field "${fieldName}.${resourceId}" must be a finite number > 0.`)
    }

    normalized[resourceId] = amount
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function validateProcess(processDefinition, index, knownResourceIds) {
  const prefix = `Process[${index}]`
  if (!processDefinition || typeof processDefinition !== 'object') {
    fail(`${prefix}: expected object.`)
  }

  const id = typeof processDefinition.id === 'string' ? processDefinition.id.trim() : ''
  if (!id) {
    fail(`${prefix}: missing "id".`)
  }
  if (!/^[a-z][a-zA-Z0-9]*$/.test(id)) {
    fail(`${prefix}: id "${id}" must match ^[a-z][a-zA-Z0-9]*$.`)
  }

  const name = typeof processDefinition.name === 'string' ? processDefinition.name.trim() : ''
  if (!name) {
    fail(`${prefix}: missing "name".`)
  }

  const energyCost = typeof processDefinition.energyCost === 'undefined'
    ? undefined
    : Number(processDefinition.energyCost)
  if (typeof energyCost !== 'undefined' && (!Number.isFinite(energyCost) || energyCost < 0)) {
    fail(`${prefix}: "energyCost" must be a finite number >= 0 when present.`)
  }

  const energyGain = typeof processDefinition.energyGain === 'undefined'
    ? undefined
    : Number(processDefinition.energyGain)
  if (typeof energyGain !== 'undefined' && (!Number.isFinite(energyGain) || energyGain < 0)) {
    fail(`${prefix}: "energyGain" must be a finite number >= 0 when present.`)
  }

  const failMessage = typeof processDefinition.failMessage === 'string'
    ? processDefinition.failMessage.trim()
    : undefined
  if (typeof processDefinition.failMessage !== 'undefined' && !failMessage) {
    fail(`${prefix}: "failMessage" must be a non-empty string when present.`)
  }

  const successMessage = typeof processDefinition.successMessage === 'string'
    ? processDefinition.successMessage.trim()
    : undefined
  if (typeof processDefinition.successMessage !== 'undefined' && !successMessage) {
    fail(`${prefix}: "successMessage" must be a non-empty string when present.`)
  }

  const silentSuccess = typeof processDefinition.silentSuccess === 'boolean'
    ? processDefinition.silentSuccess
    : undefined
  if (typeof processDefinition.silentSuccess !== 'undefined' && typeof silentSuccess === 'undefined') {
    fail(`${prefix}: "silentSuccess" must be boolean when present.`)
  }

  return {
    id,
    name,
    energyCost,
    energyGain,
    consume: validateResourceAmounts(processDefinition.consume, 'consume', id, knownResourceIds),
    produce: validateResourceAmounts(processDefinition.produce, 'produce', id, knownResourceIds),
    failMessage,
    successMessage,
    silentSuccess,
  }
}

function validateProcessPack(pack, knownResourceIds) {
  if (!pack || typeof pack !== 'object') {
    fail('Process pack: expected top-level object.')
  }

  const packId = typeof pack.packId === 'string' ? pack.packId.trim() : ''
  if (!packId) {
    fail('Process pack: "packId" is required.')
  }

  const version = Number(pack.version)
  if (!Number.isInteger(version) || version < 1) {
    fail('Process pack: "version" must be an integer >= 1.')
  }

  if (!Array.isArray(pack.processes) || pack.processes.length === 0) {
    fail('Process pack: "processes" must be a non-empty array.')
  }

  const processes = pack.processes.map((entry, index) => validateProcess(entry, index, knownResourceIds))
  const seenIds = new Set()
  for (const processDefinition of processes) {
    if (seenIds.has(processDefinition.id)) {
      fail(`Process pack: duplicate process id "${processDefinition.id}".`)
    }

    seenIds.add(processDefinition.id)
  }

  return {
    packId,
    version,
    processes,
  }
}

function buildRegistrySource(processPack, sourceLabel) {
  const processLiteral = JSON.stringify(processPack.processes, null, 2)

  return `// @generated by tools/content-build/build-processes-registry.mjs
// source: ${sourceLabel}

import type { ResourceId } from './resources.js'

export type ResourceAmounts = Partial<Record<ResourceId, number>>

export interface ProcessRunOptions {
  name: string
  energyCost?: number
  energyGain?: number
  consume?: ResourceAmounts
  produce?: ResourceAmounts
  failMessage?: string
  successMessage?: string
  silentSuccess?: boolean
}

const processCatalogData = ${processLiteral} as const

export type ProcessId = typeof processCatalogData[number]['id']

function normalizeResourceAmounts(
  value: Record<string, number> | undefined,
): ResourceAmounts | undefined {
  if (!value) {
    return undefined
  }

  const entries = Object.entries(value)
  if (entries.length === 0) {
    return undefined
  }

  return Object.fromEntries(
    entries.map(([resourceId, amount]) => [resourceId as ResourceId, Number(amount)]),
  ) as ResourceAmounts
}

export const PROCESS_CATALOG = Object.fromEntries(
  processCatalogData.map((process) => [
    process.id,
    {
      name: process.name,
      energyCost: 'energyCost' in process ? Number(process.energyCost) : undefined,
      energyGain: 'energyGain' in process ? Number(process.energyGain) : undefined,
      consume: 'consume' in process
        ? normalizeResourceAmounts(process.consume as Record<string, number>)
        : undefined,
      produce: 'produce' in process
        ? normalizeResourceAmounts(process.produce as Record<string, number>)
        : undefined,
      failMessage: 'failMessage' in process ? String(process.failMessage) : undefined,
      successMessage: 'successMessage' in process ? String(process.successMessage) : undefined,
      silentSuccess: 'silentSuccess' in process ? Boolean(process.silentSuccess) : undefined,
    } satisfies ProcessRunOptions,
  ]),
) as Record<ProcessId, ProcessRunOptions>
`
}

function main() {
  const checkMode = process.argv.includes('--check')
  const writeMode = process.argv.includes('--write')

  if (!existsSync(processSchemaPath)) {
    fail(`Missing schema: ${path.relative(repoRoot, processSchemaPath)}`)
  }
  if (!existsSync(processPackPath)) {
    fail(`Missing process pack: ${path.relative(repoRoot, processPackPath)}`)
  }
  if (!existsSync(resourcePackPath)) {
    fail(`Missing resource pack: ${path.relative(repoRoot, resourcePackPath)}`)
  }

  readJsonFile(processSchemaPath, repoRoot, fail)
  const loadedResourcePack = loadPackWithShards({
    repoRoot,
    basePackPath: resourcePackPath,
    entityKey: 'resources',
    fail,
  })
  const knownResourceIds = validateResourceIds(loadedResourcePack.pack)
  const loadedProcessPack = loadPackWithShards({
    repoRoot,
    basePackPath: processPackPath,
    entityKey: 'processes',
    fail,
  })
  const processPack = validateProcessPack(loadedProcessPack.pack, knownResourceIds)
  const source = buildRegistrySource(
    processPack,
    formatPackSourceLabel(loadedProcessPack.sourceFiles, repoRoot),
  )

  if (writeMode) {
    mkdirSync(path.dirname(generatedRegistryPath), { recursive: true })
    writeFileSync(generatedRegistryPath, source, 'utf8')
    console.log(
      `Wrote ${path.relative(repoRoot, generatedRegistryPath)} (${processPack.processes.length} processes, ${loadedProcessPack.shardCount} shard(s)).`,
    )
    return
  }

  if (!checkMode) {
    console.log(`Validated process pack (${processPack.processes.length} processes).`)
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
    `Content check passed: ${path.relative(repoRoot, generatedRegistryPath)} matches process pack (${processPack.processes.length} processes, ${loadedProcessPack.shardCount} shard(s)).`,
  )
}

main()
