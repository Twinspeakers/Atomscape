import { resourceById, type ResourceId } from '../../src/generated/registry/resources.js'

export function formatQty(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return value.toFixed(3).replace(/\.?0+$/, '')
}

export function formatResourceMap(map: Partial<Record<ResourceId, number>> | undefined): string {
  if (!map) {
    return '- none'
  }

  const rows = (Object.entries(map) as Array<[ResourceId, number]>)
    .filter(([, amount]) => Number.isFinite(amount) && amount !== 0)
    .sort(([a], [b]) => resourceById[a].label.localeCompare(resourceById[b].label))
    .map(([resourceId, amount]) => {
      const resource = resourceById[resourceId]
      return `- ${formatQty(amount)} ${resource.label} (\`${resourceId}\`, ${resource.unit})`
    })

  return rows.length > 0 ? rows.join('\n') : '- none'
}
