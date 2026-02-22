import { Index } from 'flexsearch'
import { resourceDefinitions } from '@domain/resources/resourceCatalog'

const resourceIndex = new Index({
  tokenize: 'forward',
  preset: 'match',
})

resourceDefinitions.forEach((resource, index) => {
  resourceIndex.add(index, `${resource.label} ${resource.description} ${resource.id}`)
})

export function searchResources(query: string): typeof resourceDefinitions {
  const normalized = query.trim()
  if (!normalized) {
    return resourceDefinitions
  }

  const ids = resourceIndex.search(normalized, 100) as number[]
  return ids.map((id) => resourceDefinitions[id]).filter(Boolean)
}
