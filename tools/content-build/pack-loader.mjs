import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const SHARD_FILE_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*\.json$/
const SHARD_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/

export function readJsonFile(filePath, repoRoot, fail) {
  const raw = readFileSync(filePath, 'utf8')

  try {
    return JSON.parse(raw)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    fail(`Invalid JSON at ${path.relative(repoRoot, filePath)}: ${reason}`)
  }
}

function normalizeEntityList(value, ownerLabel, entityKey, fail) {
  if (typeof value === 'undefined') {
    return []
  }

  if (!Array.isArray(value)) {
    fail(`${ownerLabel}: "${entityKey}" must be an array.`)
  }

  return value
}

export function loadPackWithShards({
  repoRoot,
  basePackPath,
  entityKey,
  fail,
}) {
  const basePack = readJsonFile(basePackPath, repoRoot, fail)
  if (!basePack || typeof basePack !== 'object' || Array.isArray(basePack)) {
    fail(`Pack ${path.relative(repoRoot, basePackPath)}: expected top-level object.`)
  }

  const baseEntries = normalizeEntityList(
    basePack[entityKey],
    `Pack ${path.relative(repoRoot, basePackPath)}`,
    entityKey,
    fail,
  )

  const shardDirPath = path.resolve(path.dirname(basePackPath), 'shards')
  const shardPaths = existsSync(shardDirPath)
    ? readdirSync(shardDirPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right))
        .map((fileName) => path.resolve(shardDirPath, fileName))
    : []

  const shardEntries = []
  for (const shardPath of shardPaths) {
    const shardFileName = path.basename(shardPath)
    if (!SHARD_FILE_PATTERN.test(shardFileName)) {
      fail(
        `Shard file "${path.relative(repoRoot, shardPath)}" must use lowercase sortable naming (${SHARD_FILE_PATTERN}).`,
      )
    }

    const shard = readJsonFile(shardPath, repoRoot, fail)
    if (!shard || typeof shard !== 'object' || Array.isArray(shard)) {
      fail(`Shard ${path.relative(repoRoot, shardPath)}: expected top-level object.`)
    }

    if ('shardId' in shard) {
      const shardId = typeof shard.shardId === 'string' ? shard.shardId.trim() : ''
      if (!shardId || !SHARD_ID_PATTERN.test(shardId)) {
        fail(
          `Shard ${path.relative(repoRoot, shardPath)}: "shardId" must match ${SHARD_ID_PATTERN}.`,
        )
      }
    }

    if ('packId' in shard || 'version' in shard) {
      fail(
        `Shard ${path.relative(repoRoot, shardPath)} must not define "packId" or "version"; keep these in the base pack file.`,
      )
    }

    const entries = normalizeEntityList(
      shard[entityKey],
      `Shard ${path.relative(repoRoot, shardPath)}`,
      entityKey,
      fail,
    )
    if (entries.length === 0) {
      fail(`Shard ${path.relative(repoRoot, shardPath)}: "${entityKey}" must include at least one entry.`)
    }

    shardEntries.push(...entries)
  }

  const mergedEntries = [...baseEntries, ...shardEntries]
  if (mergedEntries.length === 0) {
    fail(`Pack ${path.relative(repoRoot, basePackPath)}: merged "${entityKey}" is empty.`)
  }

  return {
    pack: {
      ...basePack,
      [entityKey]: mergedEntries,
    },
    sourceFiles: [basePackPath, ...shardPaths],
    shardCount: shardPaths.length,
    baseEntryCount: baseEntries.length,
    shardEntryCount: shardEntries.length,
  }
}

export function formatPackSourceLabel(sourceFiles, repoRoot) {
  if (sourceFiles.length === 0) {
    return '(unknown source)'
  }

  const relativeFiles = sourceFiles.map((filePath) => path.relative(repoRoot, filePath))
  if (relativeFiles.length === 1) {
    return relativeFiles[0]
  }

  const [baseFile, ...shardFiles] = relativeFiles
  const shardDir = path.dirname(shardFiles[0])
  return `${baseFile} + ${shardDir}/*.json (${shardFiles.length} shard(s))`
}
