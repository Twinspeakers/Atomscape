import { Index } from 'flexsearch'
import { wikiPages } from '../wiki/wikiRegistry'

const wikiIndex = new Index({
  tokenize: 'forward',
  preset: 'match',
})

wikiPages.forEach((page, index) => {
  wikiIndex.add(index, `${page.title} ${page.summary} ${page.tags.join(' ')}`)
})

export function searchWikiPages(query: string): typeof wikiPages {
  const normalized = query.trim()
  if (!normalized) {
    return wikiPages
  }

  const ids = wikiIndex.search(normalized, 50) as number[]
  return ids.map((id) => wikiPages[id]).filter(Boolean)
}