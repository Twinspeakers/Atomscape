import { describe, expect, it } from 'vitest'
import type { WorldSessionRow } from '@platform/db/gameDb'
import { DEFAULT_START_SECTOR_ID } from '@domain/spec/sectorSpec'
import {
  buildInventoryFromRows,
  loadWorldSessionRowForSector,
} from './hydrationLoaders'

describe('hydrationLoaders', () => {
  it('builds inventory from persisted rows and ignores unknown symbols', () => {
    const inventory = buildInventoryFromRows([
      { symbol: 'rubble', count: 3.127, updatedAt: 1 },
      { symbol: 'steel', count: 2, updatedAt: 2 },
      { symbol: 'unknown', count: 999, updatedAt: 3 },
    ])

    expect(inventory.rubble).toBe(3.127)
    expect(inventory.steel).toBe(2)
    expect(inventory).not.toHaveProperty('unknown')
  })

  it('falls back to legacy world-session row for default start sector only', async () => {
    const legacyRow: WorldSessionRow = {
      id: 'active-world-session',
      version: 1,
      seed: 'legacy-seed',
      depletedTargetIds: [],
      visitedZoneIds: [],
      zoneDestroyedCounts: {},
      classDestroyedCounts: {},
      destroyedCount: 0,
      updatedAt: 1,
    }

    const startSectorRow = await loadWorldSessionRowForSector({
      sectorId: DEFAULT_START_SECTOR_ID,
      legacyRowId: 'active-world-session',
      readWorldSessionById: async (rowId) => {
        if (rowId === 'active-world-session') {
          return legacyRow
        }
        return undefined
      },
    })

    const nonStartSectorRow = await loadWorldSessionRowForSector({
      sectorId: 'marsCorridor',
      legacyRowId: 'active-world-session',
      readWorldSessionById: async () => undefined,
    })

    expect(startSectorRow).toEqual(legacyRow)
    expect(nonStartSectorRow).toBeUndefined()
  })
})
