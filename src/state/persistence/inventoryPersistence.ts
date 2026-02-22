import { gameDb } from '@platform/db/gameDb'
import { resourceIds } from '@domain/resources/resourceCatalog'
import type { ResourceInventory } from '@state/types'
import { roundQty } from '@state/utils/numberUtils'

export interface PersistInventorySnapshotDependencies {
  timestampMs: () => number
  deleteInventoryRow: (resourceId: string) => Promise<unknown>
  putInventoryRow: (row: { symbol: string; count: number; updatedAt: number }) => Promise<unknown>
}

const defaultPersistInventorySnapshotDependencies: PersistInventorySnapshotDependencies = {
  timestampMs: () => Date.now(),
  deleteInventoryRow: async (resourceId) => gameDb.inventory.delete(resourceId),
  putInventoryRow: async (row) => gameDb.inventory.put(row),
}

export interface PersistInventorySnapshotSafelyOptions {
  shouldSkip?: () => boolean
  dependencies?: PersistInventorySnapshotDependencies
}

export async function persistInventorySnapshot(
  inventory: ResourceInventory,
  dependencies: PersistInventorySnapshotDependencies = defaultPersistInventorySnapshotDependencies,
): Promise<void> {
  const timestamp = dependencies.timestampMs()

  await Promise.all(
    resourceIds.map(async (resourceId) => {
      const count = roundQty(inventory[resourceId] ?? 0)
      if (count <= 0) {
        await dependencies.deleteInventoryRow(resourceId)
        return
      }

      await dependencies.putInventoryRow({
        symbol: resourceId,
        count,
        updatedAt: timestamp,
      })
    }),
  )
}

export function persistInventorySnapshotSafely(
  inventory: ResourceInventory,
  options: PersistInventorySnapshotSafelyOptions = {},
): void {
  if (options.shouldSkip?.()) {
    return
  }

  void persistInventorySnapshot(inventory, options.dependencies).catch(() => {
    // Ignore inventory persistence failures.
  })
}
