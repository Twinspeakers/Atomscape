import { resourceIds } from '@domain/resources/resourceCatalog'
import { gameDb, type InventoryRow, type WorldSessionRow } from '@platform/db/gameDb'
import {
  buildWorldSessionSnapshotFromState,
  buildRuntimeSnapshotFromState,
  persistRuntimeSnapshot,
  RUNTIME_STATE_STORAGE_KEY,
  type RuntimeStateSnapshot,
} from '@state/runtime/snapshotPersistence'
import { sanitizePlayerUsername } from '@state/runtime/storeBootstrap'
import { QUEST_REWARD_HISTORY_LIMIT } from '@state/slices/runtimeStoreSlice'
import { UI_PREFERENCES_STORAGE_KEY, type UiPreferencesSnapshot } from '@state/ui/workspacePreferences'
import type { AppState } from '@state/appStoreState'

const INVENTORY_PANEL_HEIGHT_STORAGE_KEY = 'inventory-panel-height-v1'

export const CLOUD_SAVE_FORMAT_VERSION = 1
export const MAIN_MENU_AUTOSTART_STORAGE_KEY = 'space-main-menu-autostart-v1'

export interface CloudSavePayloadV1 {
  formatVersion: 1
  savedAt: number
  runtimeSnapshot: RuntimeStateSnapshot
  uiPreferencesSnapshot: UiPreferencesSnapshot
  inventoryPanelHeight: string | null
  inventoryRows: InventoryRow[]
  worldSessionRows: WorldSessionRow[]
}

function buildUiPreferencesSnapshotFromState(state: AppState): UiPreferencesSnapshot {
  return {
    leftPanels: [...state.leftPanels],
    rightPanels: [...state.rightPanels],
    hiddenPanels: [...state.hiddenPanels],
    panelSlotHints: { ...state.panelSlotHints },
    pinnedQuestIds: [...state.pinnedQuestIds],
    activeMainQuestId: state.activeMainQuestId,
    uiDensity: state.uiDensity,
    panelOpacity: state.panelOpacity,
  }
}

function buildInventoryRowsFromState(state: AppState): InventoryRow[] {
  const updatedAt = Date.now()

  return resourceIds
    .map((symbol) => ({
      symbol,
      count: state.inventory[symbol] ?? 0,
      updatedAt,
    }))
    .filter((row) => row.count > 0)
}

function sortWorldSessionRows(rows: WorldSessionRow[]): WorldSessionRow[] {
  return [...rows].sort((left, right) => {
    if (left.updatedAt === right.updatedAt) {
      return left.id.localeCompare(right.id)
    }

    return right.updatedAt - left.updatedAt
  })
}

export async function buildCloudSavePayloadFromState(state: AppState): Promise<CloudSavePayloadV1> {
  const runtimeSnapshot = buildRuntimeSnapshotFromState(state, {
    questRewardHistoryLimit: QUEST_REWARD_HISTORY_LIMIT,
    sanitizePlayerUsername,
  })

  const persistedWorldSessionRows = await gameDb.worldSession.toArray()
  const activeWorldSessionRow = buildWorldSessionSnapshotFromState(state)
  const worldSessionRowsById = new Map<string, WorldSessionRow>()
  for (const row of persistedWorldSessionRows) {
    worldSessionRowsById.set(row.id, row)
  }
  worldSessionRowsById.set(activeWorldSessionRow.id, activeWorldSessionRow)

  let inventoryPanelHeight: string | null = null
  if (typeof window !== 'undefined') {
    inventoryPanelHeight = window.localStorage.getItem(INVENTORY_PANEL_HEIGHT_STORAGE_KEY)
  }

  return {
    formatVersion: CLOUD_SAVE_FORMAT_VERSION,
    savedAt: Date.now(),
    runtimeSnapshot,
    uiPreferencesSnapshot: buildUiPreferencesSnapshotFromState(state),
    inventoryPanelHeight,
    inventoryRows: buildInventoryRowsFromState(state),
    worldSessionRows: sortWorldSessionRows(Array.from(worldSessionRowsById.values())),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasString(value: unknown): value is string {
  return typeof value === 'string'
}

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isInventoryRow(value: unknown): value is InventoryRow {
  if (!isRecord(value)) {
    return false
  }

  return hasString(value.symbol) && hasNumber(value.count) && hasNumber(value.updatedAt)
}

function isWorldSessionRow(value: unknown): value is WorldSessionRow {
  if (!isRecord(value)) {
    return false
  }

  return hasString(value.id)
    && hasNumber(value.version)
    && hasString(value.seed)
    && Array.isArray(value.depletedTargetIds)
    && Array.isArray(value.visitedZoneIds)
    && isRecord(value.zoneDestroyedCounts)
    && isRecord(value.classDestroyedCounts)
    && hasNumber(value.destroyedCount)
    && hasNumber(value.updatedAt)
}

function isUiPreferencesSnapshot(value: unknown): value is UiPreferencesSnapshot {
  if (!isRecord(value)) {
    return false
  }

  return Array.isArray(value.leftPanels)
    && Array.isArray(value.rightPanels)
    && Array.isArray(value.hiddenPanels)
    && isRecord(value.panelSlotHints)
    && Array.isArray(value.pinnedQuestIds)
    && (value.activeMainQuestId === null || hasString(value.activeMainQuestId))
    && (value.uiDensity === 'compact' || value.uiDensity === 'comfortable')
    && hasNumber(value.panelOpacity)
}

function isRuntimeStateSnapshot(value: unknown): value is RuntimeStateSnapshot {
  if (!isRecord(value)) {
    return false
  }

  return value.version === 1
    && hasString(value.playerUsername)
    && hasNumber(value.cycleTimeSeconds)
    && hasNumber(value.energy)
    && hasNumber(value.maxEnergy)
}

export function isCloudSavePayloadV1(value: unknown): value is CloudSavePayloadV1 {
  if (!isRecord(value)) {
    return false
  }

  if (value.formatVersion !== CLOUD_SAVE_FORMAT_VERSION) {
    return false
  }

  if (!hasNumber(value.savedAt)) {
    return false
  }

  if (!isRuntimeStateSnapshot(value.runtimeSnapshot)) {
    return false
  }

  if (!isUiPreferencesSnapshot(value.uiPreferencesSnapshot)) {
    return false
  }

  if (!(value.inventoryPanelHeight === null || hasString(value.inventoryPanelHeight))) {
    return false
  }

  if (!Array.isArray(value.inventoryRows) || !value.inventoryRows.every(isInventoryRow)) {
    return false
  }

  if (!Array.isArray(value.worldSessionRows) || !value.worldSessionRows.every(isWorldSessionRow)) {
    return false
  }

  return true
}

export async function applyCloudSavePayload(payload: CloudSavePayloadV1): Promise<void> {
  persistRuntimeSnapshot(payload.runtimeSnapshot)

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        UI_PREFERENCES_STORAGE_KEY,
        JSON.stringify(payload.uiPreferencesSnapshot),
      )

      if (payload.inventoryPanelHeight !== null) {
        window.localStorage.setItem(INVENTORY_PANEL_HEIGHT_STORAGE_KEY, payload.inventoryPanelHeight)
      } else {
        window.localStorage.removeItem(INVENTORY_PANEL_HEIGHT_STORAGE_KEY)
      }
    } catch {
      // Ignore localStorage failures and continue applying IndexedDB state.
    }
  }

  await gameDb.transaction('rw', gameDb.inventory, gameDb.worldSession, async () => {
    await gameDb.inventory.clear()
    if (payload.inventoryRows.length > 0) {
      await gameDb.inventory.bulkPut(payload.inventoryRows)
    }

    await gameDb.worldSession.clear()
    if (payload.worldSessionRows.length > 0) {
      await gameDb.worldSession.bulkPut(payload.worldSessionRows)
    }
  })
}

export function hasPersistedRuntimeSnapshot(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const raw = window.localStorage.getItem(RUNTIME_STATE_STORAGE_KEY)
  if (!raw) {
    return false
  }

  try {
    const parsed = JSON.parse(raw) as { version?: number }
    return parsed.version === 1
  } catch {
    return false
  }
}
