import type { WikiPageMeta } from '../../src/wiki/wikiTypes.js'

export function buildGeneratedIndexContent(pages: WikiPageMeta[]): string {
  const escapeSingleQuotes = (value: string): string => value.replace(/'/g, "\\'")

  const serialized = pages
    .map((page) => {
      const tags = page.tags.map((tag) => `'${escapeSingleQuotes(tag)}'`).join(', ')
      return [
        '  {',
        `    slug: '${escapeSingleQuotes(page.slug)}',`,
        `    title: '${escapeSingleQuotes(page.title)}',`,
        `    summary: '${escapeSingleQuotes(page.summary)}',`,
        `    tags: [${tags}],`,
        '  },',
      ].join('\n')
    })
    .join('\n')

  return [
    '// AUTO-GENERATED. Run `npm run wiki:sync`.',
    "import type { WikiPageMeta } from '../wikiTypes'",
    '',
    'export const generatedWikiPages: WikiPageMeta[] = [',
    serialized,
    ']',
    '',
  ].join('\n')
}
