import { resourceIds } from '@domain/resources/resourceCatalog'
import type { ResourceInventory } from '@state/types'
import { describe, expect, it, vi } from 'vitest'
import {
  persistInventorySnapshot,
  persistInventorySnapshotSafely,
} from './inventoryPersistence'

function createEmptyInventory(): ResourceInventory {
  return resourceIds.reduce<ResourceInventory>((inventory, resourceId) => {
    inventory[resourceId] = 0
    return inventory
  }, {})
}

describe('inventory persistence', () => {
  it('persists positive inventory rows and deletes empty rows', async () => {
    const inventory = createEmptyInventory()
    const primaryResource = resourceIds[0]
    const secondaryResource = resourceIds[1]
    if (!primaryResource || !secondaryResource) {
      throw new Error('Expected at least two resource ids in catalog.')
    }

    inventory[primaryResource] = 1.23456
    inventory[secondaryResource] = 0

    const putRows: Array<{ symbol: string; count: number; updatedAt: number }> = []
    const deletedRows: string[] = []

    await persistInventorySnapshot(inventory, {
      timestampMs: () => 12345,
      putInventoryRow: async (row) => {
        putRows.push(row)
      },
      deleteInventoryRow: async (resourceId) => {
        deletedRows.push(resourceId)
      },
    })

    expect(putRows).toContainEqual({
      symbol: primaryResource,
      count: 1.2346,
      updatedAt: 12345,
    })
    expect(putRows.some((row) => row.symbol === secondaryResource)).toBe(false)
    expect(deletedRows).toContain(secondaryResource)
  })

  it('skips persistence when guard is active', async () => {
    const inventory = createEmptyInventory()
    const putInventoryRow = vi.fn(async () => {})
    const deleteInventoryRow = vi.fn(async () => {})

    persistInventorySnapshotSafely(inventory, {
      shouldSkip: () => true,
      dependencies: {
        timestampMs: () => 1,
        putInventoryRow,
        deleteInventoryRow,
      },
    })

    await Promise.resolve()
    expect(putInventoryRow).not.toHaveBeenCalled()
    expect(deleteInventoryRow).not.toHaveBeenCalled()
  })

  it('suppresses persistence exceptions', async () => {
    const inventory = createEmptyInventory()

    expect(() =>
      persistInventorySnapshotSafely(inventory, {
        dependencies: {
          timestampMs: () => 1,
          putInventoryRow: async () => {
            throw new Error('put failed')
          },
          deleteInventoryRow: async () => {},
        },
      }),
    ).not.toThrow()

    await Promise.resolve()
  })
})
