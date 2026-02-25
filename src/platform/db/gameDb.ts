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

export interface SaveSlotRow {
  id: number
  name: string
  updatedAt: number
  payload: string
  activeSectorId: SectorId
  credits: number
}

class StellarMinerDatabase extends Dexie {
  inventory!: Table<InventoryRow, string>
  worldSession!: Table<WorldSessionRow, string>
  saveSlots!: Table<SaveSlotRow, number>

  constructor() {
    super('stellar-miner-db')
    this.version(1).stores({
      inventory: 'symbol,updatedAt',
    })
    this.version(2).stores({
      inventory: 'symbol,updatedAt',
      worldSession: 'id,updatedAt',
    })
    this.version(3).stores({
      inventory: 'symbol,updatedAt',
      worldSession: 'id,updatedAt',
      saveSlots: 'id,updatedAt',
    })
  }
}

export const gameDb = new StellarMinerDatabase()
