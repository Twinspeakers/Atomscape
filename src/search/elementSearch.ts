import { Index } from 'flexsearch'
import { periodicElements } from '@domain/elements/periodicElements'

const elementIndex = new Index({
  tokenize: 'forward',
  preset: 'match',
})

periodicElements.forEach((element, index) => {
  elementIndex.add(index, `${element.name} ${element.symbol} ${element.atomicNumber}`)
})

export function searchElements(query: string): typeof periodicElements {
  const normalized = query.trim()
  if (!normalized) {
    return periodicElements
  }

  const ids = elementIndex.search(normalized, 200) as number[]
  return ids.map((id) => periodicElements[id]).filter(Boolean)
}
