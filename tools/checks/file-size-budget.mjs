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
  'file-size-baseline.json',
)

const trackedExtensionPattern = /\.(ts|tsx|js|jsx|css|mdx)$/
const softLimitLines = 600
const hardLimitLines = 900
const oversizedGrowthLimit = 20
const normalGrowthLimit = 80

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

    if (!trackedExtensionPattern.test(entry.name)) {
      continue
    }

    files.push(entryPath)
  }

  return files
}

function normalizePath(value) {
  return value.replace(/\\/g, '/')
}

function lineCount(content) {
  if (content.length === 0) {
    return 0
  }
  return content.split('\n').length
}

function collectCurrentSizes() {
  const files = walkFiles(srcRoot)
  const sizes = {}

  for (const filePath of files) {
    const relative = normalizePath(path.relative(repoRoot, filePath))
    const content = readFileSync(filePath, 'utf8')
    sizes[relative] = lineCount(content)
  }

  return sizes
}

function writeBaseline(sizes) {
  const sortedFiles = Object.keys(sizes).sort()
  const fileLines = {}
  for (const file of sortedFiles) {
    fileLines[file] = sizes[file]
  }

  mkdirSync(path.dirname(baselinePath), { recursive: true })
  writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: 'tools/checks/file-size-budget.mjs',
        softLimitLines,
        hardLimitLines,
        oversizedGrowthLimit,
        normalGrowthLimit,
        fileLines,
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

function asDescendingEntries(map) {
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

function printLargestFiles(sizes, limit = 15) {
  const top = asDescendingEntries(sizes).slice(0, limit)
  console.log(`Top ${top.length} largest tracked files:`)
  for (const [file, lines] of top) {
    console.log(`- ${file}: ${lines}`)
  }
}

function buildGrowthViolations(currentSizes, baselineSizes) {
  const violations = []

  for (const [file, lines] of Object.entries(currentSizes)) {
    const baselineLines = baselineSizes[file]

    if (typeof baselineLines !== 'number') {
      if (lines > softLimitLines) {
        violations.push({
          type: 'new_file_over_soft_limit',
          file,
          baselineLines: null,
          lines,
          message: `New file is ${lines} lines (soft limit ${softLimitLines}).`,
        })
      }
      continue
    }

    const growthLimit = baselineLines > hardLimitLines ? oversizedGrowthLimit : normalGrowthLimit
    if (lines > baselineLines + growthLimit) {
      violations.push({
        type: 'growth_limit_exceeded',
        file,
        baselineLines,
        lines,
        message: `File grew by ${lines - baselineLines} lines (limit ${growthLimit}).`,
      })
      continue
    }

    if (baselineLines <= hardLimitLines && lines > hardLimitLines) {
      violations.push({
        type: 'crossed_hard_limit',
        file,
        baselineLines,
        lines,
        message: `File crossed hard limit ${hardLimitLines} (now ${lines}).`,
      })
    }
  }

  return violations.sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file)
    }
    return a.type.localeCompare(b.type)
  })
}

function printViolations(violations) {
  if (violations.length === 0) {
    console.log('File size budget violations: none')
    return
  }

  console.log(`File size budget violations: ${violations.length}`)
  for (const violation of violations) {
    const baseline = violation.baselineLines === null ? 'new' : String(violation.baselineLines)
    console.log(
      `- ${violation.file} [${violation.type}] baseline=${baseline}, current=${violation.lines} :: ${violation.message}`,
    )
  }
}

const writeBaselineMode = process.argv.includes('--write-baseline')
const checkBaselineMode = process.argv.includes('--check-baseline')

const currentSizes = collectCurrentSizes()

if (writeBaselineMode) {
  writeBaseline(currentSizes)
  console.log(
    `Wrote file-size baseline to ${normalizePath(path.relative(repoRoot, baselinePath))} with ${Object.keys(currentSizes).length} file(s).`,
  )
  printLargestFiles(currentSizes)
  process.exit(0)
}

if (!checkBaselineMode) {
  printLargestFiles(currentSizes)
  process.exit(0)
}

const baseline = readBaseline()
if (!baseline) {
  console.error(
    `Missing baseline file: ${normalizePath(path.relative(repoRoot, baselinePath))}. Run --write-baseline first.`,
  )
  process.exit(1)
}

const baselineSizes = baseline.fileLines ?? {}
const violations = buildGrowthViolations(currentSizes, baselineSizes)

if (violations.length > 0) {
  console.error('File size budget check failed.')
  printViolations(violations)
  process.exit(1)
}

const softCount = Object.values(currentSizes).filter((lines) => lines > softLimitLines).length
const hardCount = Object.values(currentSizes).filter((lines) => lines > hardLimitLines).length

console.log(
  `File size budget check passed: ${Object.keys(currentSizes).length} files tracked, ${softCount} over soft limit, ${hardCount} over hard limit.`,
)
printLargestFiles(currentSizes)
process.exit(0)
