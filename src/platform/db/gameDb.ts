import Dexie, { type Table } from 'dexie'
import type { CleanupTargetClassId, CleanupZoneId } from '@domain/spec/worldSpec'
import type { SectorId } from '@domain/spec/sectorSpec'

export interface InventoryRow {
  symbol: string
  count: number
  updatedAt: number
}

export interface WorldSessionRow {
  id: string
  version: number
  sectorId?: SectorId
  seed: string
  depletedTargetIds: string[]
  visitedZoneIds: CleanupZoneId[]
  zoneDestroyedCounts: Partial<Record<CleanupZoneId, number>>
  classDestroyedCounts: Partial<Record<CleanupTargetClassId, number>>
  destroyedCount: number
  updatedAt: number
}

class StellarMinerDatabase extends Dexie {
  inventory!: Table<InventoryRow, string>
  worldSession!: Table<WorldSessionRow, string>

  constructor() {
    super('stellar-miner-db')
    this.version(1).stores({
      inventory: 'symbol,updatedAt',
    })
    this.version(2).stores({
      inventory: 'symbol,updatedAt',
      worldSession: 'id,updatedAt',
    })
  }
}

export const gameDb = new StellarMinerDatabase()
