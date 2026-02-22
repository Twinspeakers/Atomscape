import path from 'node:path'
import { upsertFile } from './fileOps.js'
import { buildGeneratedIndexContent } from './generatedIndex.js'
import { buildProcessCatalogPage } from './pages/processCatalogPage.js'
import { buildQuestReferencePage } from './pages/questReferencePage.js'
import { buildRecipeCatalogPage } from './pages/recipeCatalogPage.js'
import { buildResourceCatalogPage } from './pages/resourceCatalogPage.js'
import { buildSystemsPage } from './pages/systemsPage.js'

export async function runWikiSync(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = new Set(argv)
  const checkOnly = args.has('--check')
  const writeMode = args.has('--write') || !checkOnly

  if (!checkOnly && !writeMode) {
    throw new Error('Invalid mode. Use --write or --check.')
  }

  const pages = [
    buildSystemsPage(),
    buildProcessCatalogPage(),
    buildResourceCatalogPage(),
    buildRecipeCatalogPage(),
    buildQuestReferencePage(),
  ]

  const repoRoot = process.cwd()
  const wikiPagesRoot = path.join(repoRoot, 'src', 'wiki', 'pages')
  const generatedIndexPath = path.join(repoRoot, 'src', 'wiki', 'generated', 'wikiGeneratedIndex.ts')

  const changedFiles: string[] = []

  for (const page of pages) {
    const pagePath = path.join(wikiPagesRoot, page.filename)
    const changed = await upsertFile(pagePath, page.content, checkOnly)
    if (changed) {
      changedFiles.push(path.relative(repoRoot, pagePath))
    }
  }

  const generatedIndexContent = buildGeneratedIndexContent(pages.map((page) => page.meta))
  const indexChanged = await upsertFile(generatedIndexPath, generatedIndexContent, checkOnly)
  if (indexChanged) {
    changedFiles.push(path.relative(repoRoot, generatedIndexPath))
  }

  if (checkOnly && changedFiles.length > 0) {
    console.error('Wiki generated files are out of date:')
    changedFiles.forEach((file) => console.error(`- ${file}`))
    console.error('Run `npm run wiki:sync` to update generated wiki files.')
    process.exitCode = 1
    return
  }

  if (changedFiles.length === 0) {
    console.log(checkOnly ? 'Wiki generated files are up to date.' : 'No wiki updates required.')
    return
  }

  console.log(checkOnly ? 'Wiki check passed.' : 'Updated generated wiki files:')
  changedFiles.forEach((file) => console.log(`- ${file}`))
}
