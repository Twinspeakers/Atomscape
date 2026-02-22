import { DEFAULT_START_SECTOR_ID, type SectorId } from '@domain/spec/sectorSpec'
import { resourceIds, type ResourceId } from '@domain/resources/resourceCatalog'
import type { InventoryRow, WorldSessionRow } from '@platform/db/gameDb'
import type { ResourceInventory } from '@state/types'
import { roundQty } from '@state/utils/numberUtils'
import { worldSessionRowIdForSector } from '@state/world/worldStateUtils'

function isResourceId(value: string): value is ResourceId {
  return (resourceIds as string[]).includes(value)
}

function createEmptyInventory(): ResourceInventory {
  return resourceIds.reduce<ResourceInventory>((inventory, resourceId) => {
    inventory[resourceId] = 0
    return inventory
  }, {})
}

export function buildInventoryFromRows(rows: ReadonlyArray<InventoryRow>): ResourceInventory {
  const inventory = createEmptyInventory()

  rows.forEach((row) => {
    if (isResourceId(row.symbol)) {
      inventory[row.symbol] = roundQty(row.count)
    }
  })

  return inventory
}

interface LoadWorldSessionRowOptions {
  sectorId: SectorId
  legacyRowId: string
  readWorldSessionById: (rowId: string) => Promise<WorldSessionRow | undefined>
}

export async function loadWorldSessionRowForSector(
  options: LoadWorldSessionRowOptions,
): Promise<WorldSessionRow | undefined> {
  const rowId = worldSessionRowIdForSector(options.sectorId)
  const row = await options.readWorldSessionById(rowId)

  if (row) {
    return row
  }

  if (options.sectorId === DEFAULT_START_SECTOR_ID) {
    return options.readWorldSessionById(options.legacyRowId)
  }

  return undefined
}
