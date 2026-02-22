import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const srcRoot = path.resolve(repoRoot, 'src')
const baselinePath = path.resolve(
  repoRoot,
  'tools',
  'checks',
  'baselines',
  'architecture-violations.json',
)

const canonicalLayers = ['app', 'features', 'domain', 'state', 'platform', 'shared']
const legacyLayers = ['components', 'data', 'db', 'game', 'routes', 'store']

const allowedImportsByLayer = {
  app: new Set(['app', 'features', 'state', 'platform', 'shared', 'domain']),
  features: new Set(['features', 'domain', 'state', 'platform', 'shared']),
  domain: new Set(['domain', 'shared']),
  state: new Set(['state', 'domain', 'features', 'platform', 'shared']),
  platform: new Set(['platform', 'domain', 'shared']),
  shared: new Set(['shared']),
}

function walkFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath))
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      continue
    }

    files.push(entryPath)
  }
  return files
}

function normalizePath(value) {
  return value.replace(/\\/g, '/')
}

function getLayerFromAbsPath(absPath) {
  const normalized = normalizePath(absPath)
  const normalizedSrcRoot = normalizePath(srcRoot)
  if (!normalized.startsWith(`${normalizedSrcRoot}/`)) {
    return null
  }

  const relative = normalized.slice(normalizedSrcRoot.length + 1)
  const segment = relative.split('/')[0]
  return segment || null
}

function getSourceLayer(filePath) {
  return getLayerFromAbsPath(path.resolve(filePath))
}

function resolveAliasLayer(specifier) {
  if (specifier.startsWith('@app/')) {
    return 'app'
  }

  if (specifier.startsWith('@features/')) {
    return 'features'
  }

  if (specifier.startsWith('@domain/')) {
    return 'domain'
  }

  if (specifier.startsWith('@state/')) {
    return 'state'
  }

  if (specifier.startsWith('@platform/')) {
    return 'platform'
  }

  if (specifier.startsWith('@shared/')) {
    return 'shared'
  }

  return null
}

function resolveRelativeLayer(filePath, specifier) {
  if (!specifier.startsWith('.')) {
    return null
  }

  const resolved = path.resolve(path.dirname(filePath), specifier)
  return getLayerFromAbsPath(resolved)
}

function resolveTargetLayer(filePath, specifier) {
  const aliasLayer = resolveAliasLayer(specifier)
  if (aliasLayer) {
    return aliasLayer
  }

  const relativeLayer = resolveRelativeLayer(filePath, specifier)
  if (relativeLayer) {
    return relativeLayer
  }

  return null
}

function lineNumberFromIndex(content, index) {
  const before = content.slice(0, index)
  return before.split('\n').length
}

function collectImports(filePath, content) {
  const imports = []

  const patterns = [
    /import\s+(?:type\s+)?(?:[^'"()]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]

  for (const pattern of patterns) {
    let match = pattern.exec(content)
    while (match) {
      imports.push({
        specifier: match[1],
        line: lineNumberFromIndex(content, match.index),
      })
      match = pattern.exec(content)
    }
  }

  return imports
}

function buildViolationKey(violation) {
  return [
    violation.type,
    violation.file,
    violation.line,
    violation.specifier,
    violation.sourceLayer,
    violation.targetLayer ?? '',
  ].join('|')
}

function collectViolations() {
  const files = walkFiles(srcRoot)
  const violations = []

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8')
    const sourceLayer = getSourceLayer(filePath)

    if (!sourceLayer || !canonicalLayers.includes(sourceLayer)) {
      continue
    }

    const imports = collectImports(filePath, content)

    for (const item of imports) {
      const targetLayer = resolveTargetLayer(filePath, item.specifier)

      if (targetLayer && canonicalLayers.includes(targetLayer)) {
        const allowed = allowedImportsByLayer[sourceLayer]
        if (!allowed.has(targetLayer)) {
          violations.push({
            type: 'forbidden_layer_import',
            file: normalizePath(path.relative(repoRoot, filePath)),
            line: item.line,
            specifier: item.specifier,
            sourceLayer,
            targetLayer,
            message: `Layer "${sourceLayer}" must not import "${targetLayer}".`,
          })
        }
      }

      if (targetLayer && legacyLayers.includes(targetLayer)) {
        violations.push({
          type: 'legacy_path_import',
          file: normalizePath(path.relative(repoRoot, filePath)),
          line: item.line,
          specifier: item.specifier,
          sourceLayer,
          targetLayer,
          message: `Layer "${sourceLayer}" should not depend on legacy "${targetLayer}" path.`,
        })
      }
    }
  }

  violations.sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file)
    }
    if (a.line !== b.line) {
      return a.line - b.line
    }
    return a.specifier.localeCompare(b.specifier)
  })

  return violations
}

function writeBaseline(violations) {
  mkdirSync(path.dirname(baselinePath), { recursive: true })
  writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: 'tools/checks/architecture-boundaries.mjs',
        violations,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )
}

function readBaseline() {
  if (!existsSync(baselinePath)) {
    return null
  }
  return JSON.parse(readFileSync(baselinePath, 'utf8'))
}

function printViolations(label, violations) {
  if (violations.length === 0) {
    console.log(`${label}: none`)
    return
  }

  console.log(`${label}: ${violations.length}`)
  for (const violation of violations) {
    console.log(
      `- ${violation.file}:${violation.line} ${violation.type} ${violation.specifier} (${violation.message})`,
    )
  }
}

const writeBaselineMode = process.argv.includes('--write-baseline')
const checkBaselineMode = process.argv.includes('--check-baseline')

const currentViolations = collectViolations()

if (writeBaselineMode) {
  writeBaseline(currentViolations)
  console.log(
    `Wrote architecture baseline to ${normalizePath(path.relative(repoRoot, baselinePath))} with ${currentViolations.length} violation(s).`,
  )
  process.exit(0)
}

if (!checkBaselineMode) {
  printViolations('Current architecture violations', currentViolations)
  process.exit(0)
}

const baseline = readBaseline()
if (!baseline) {
  console.error(
    `Missing baseline file: ${normalizePath(path.relative(repoRoot, baselinePath))}. Run --write-baseline first.`,
  )
  process.exit(1)
}

const baselineKeys = new Set((baseline.violations ?? []).map(buildViolationKey))
const currentKeys = new Set(currentViolations.map(buildViolationKey))

const newViolations = currentViolations.filter((violation) => !baselineKeys.has(buildViolationKey(violation)))
const resolvedViolations = (baseline.violations ?? []).filter((violation) => !currentKeys.has(buildViolationKey(violation)))

if (newViolations.length > 0) {
  console.error(
    `Architecture check failed: ${newViolations.length} new violation(s) beyond baseline.`,
  )
  printViolations('New violations', newViolations)
  process.exit(1)
}

console.log(
  `Architecture check passed: ${currentViolations.length} current violation(s), ${resolvedViolations.length} resolved vs baseline.`,
)
process.exit(0)
