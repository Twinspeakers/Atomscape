import type { SectorId } from '@domain/spec/sectorSpec'
import { gameDb, type InventoryRow, type WorldSessionRow } from '@platform/db/gameDb'
import type { AppState } from '@state/appStoreState'
import {
  buildRuntimeSnapshotFromState,
  RUNTIME_STATE_STORAGE_KEY,
  type RuntimeSnapshotStateSource,
  type RuntimeStateSnapshot,
} from '@state/runtime/snapshotPersistence'
import { sanitizePlayerUsername } from '@state/runtime/storeBootstrap'
import {
  normalizePanelOpacity,
  normalizeUiDensity,
  sanitizeDockLists,
  sanitizeHiddenPanels,
  sanitizeMainQuestId,
  sanitizePanelSlotHints,
  UI_PREFERENCES_STORAGE_KEY,
  type UiPreferencesSnapshot,
} from '@state/ui/workspacePreferences'

const SAVE_SLOT_PAYLOAD_VERSION = 1
const SAVE_SLOT_NAME_MAX_LENGTH = 28
const SAVE_SLOT_QUEST_REWARD_HISTORY_LIMIT = 32

export const SAVE_SLOT_COUNT = 10

interface SaveSlotPayload {
  version: 1
  runtimeSnapshot: RuntimeStateSnapshot
  uiPreferences: UiPreferencesSnapshot
  inventoryRows: InventoryRow[]
  worldSessionRows: WorldSessionRow[]
}

export interface SaveSlotSummary {
  slotId: number
  name: string
  hasData: boolean
  updatedAt: number | null
  activeSectorId: SectorId | null
  credits: number | null
}

function assertValidSlotId(slotId: number): void {
  if (!Number.isInteger(slotId) || slotId < 1 || slotId > SAVE_SLOT_COUNT) {
    throw new Error(`Slot ${slotId} is out of range. Expected 1-${SAVE_SLOT_COUNT}.`)
  }
}

function defaultSlotName(slotId: number): string {
  return `Save ${slotId.toString().padStart(2, '0')}`
}

export function sanitizeSaveSlotName(input: string, slotId: number): string {
  const normalized = input
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SAVE_SLOT_NAME_MAX_LENGTH)

  return normalized.length > 0 ? normalized : defaultSlotName(slotId)
}

function buildDefaultSaveSlotSummaries(): SaveSlotSummary[] {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => {
    const slotId = index + 1
    return {
      slotId,
      name: defaultSlotName(slotId),
      hasData: false,
      updatedAt: null,
      activeSectorId: null,
      credits: null,
    }
  })
}

function buildUiPreferencesSnapshotFromState(state: AppState): UiPreferencesSnapshot {
  const dockState = sanitizeDockLists(state.leftPanels, state.rightPanels)
  return {
    leftPanels: dockState.leftPanels,
    rightPanels: dockState.rightPanels,
    hiddenPanels: sanitizeHiddenPanels(state.hiddenPanels),
    panelSlotHints: sanitizePanelSlotHints(state.panelSlotHints),
    pinnedQuestIds: [...state.pinnedQuestIds],
    activeMainQuestId: sanitizeMainQuestId(state.activeMainQuestId),
    uiDensity: normalizeUiDensity(state.uiDensity),
    panelOpacity: normalizePanelOpacity(state.panelOpacity),
  }
}

function parseSaveSlotPayload(raw: string): SaveSlotPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SaveSlotPayload>
    if (
      parsed.version !== SAVE_SLOT_PAYLOAD_VERSION
      || !parsed.runtimeSnapshot
      || !parsed.uiPreferences
      || !Array.isArray(parsed.inventoryRows)
      || !Array.isArray(parsed.worldSessionRows)
    ) {
      return null
    }

    return parsed as SaveSlotPayload
  } catch {
    return null
  }
}

export function createInitialSaveSlotSummaries(): SaveSlotSummary[] {
  return buildDefaultSaveSlotSummaries()
}

export async function listSaveSlotSummaries(): Promise<SaveSlotSummary[]> {
  const defaults = buildDefaultSaveSlotSummaries()
  const rows = await gameDb.saveSlots.toArray()
  const rowBySlotId = new Map(rows.map((row) => [row.id, row]))

  return defaults.map((summary) => {
    const row = rowBySlotId.get(summary.slotId)
    if (!row) {
      return summary
    }

    return {
      slotId: summary.slotId,
      name: sanitizeSaveSlotName(row.name, summary.slotId),
      hasData: true,
      updatedAt: row.updatedAt,
      activeSectorId: row.activeSectorId,
      credits: row.credits,
    }
  })
}

export async function saveCurrentStateToSlot(
  slotId: number,
  state: AppState,
): Promise<void> {
  assertValidSlotId(slotId)

  const runtimeSnapshot = buildRuntimeSnapshotFromState(
    state as RuntimeSnapshotStateSource,
    {
      questRewardHistoryLimit: SAVE_SLOT_QUEST_REWARD_HISTORY_LIMIT,
      sanitizePlayerUsername,
    },
  )
  const uiPreferences = buildUiPreferencesSnapshotFromState(state)
  const [inventoryRows, worldSessionRows, existingRow] = await Promise.all([
    gameDb.inventory.toArray(),
    gameDb.worldSession.toArray(),
    gameDb.saveSlots.get(slotId),
  ])

  const payload: SaveSlotPayload = {
    version: SAVE_SLOT_PAYLOAD_VERSION,
    runtimeSnapshot,
    uiPreferences,
    inventoryRows,
    worldSessionRows,
  }
  const now = Date.now()
  const resolvedName = sanitizeSaveSlotName(
    existingRow?.name ?? defaultSlotName(slotId),
    slotId,
  )

  await gameDb.saveSlots.put({
    id: slotId,
    name: resolvedName,
    updatedAt: now,
    payload: JSON.stringify(payload),
    activeSectorId: runtimeSnapshot.activeSectorId,
    credits: runtimeSnapshot.credits,
  })
}

export async function renameSaveSlot(slotId: number, nextName: string): Promise<void> {
  assertValidSlotId(slotId)

  const existing = await gameDb.saveSlots.get(slotId)
  if (!existing) {
    throw new Error('Cannot rename an empty save slot.')
  }

  await gameDb.saveSlots.put({
    ...existing,
    name: sanitizeSaveSlotName(nextName, slotId),
  })
}

export async function restoreSaveSlotToActiveRuntime(slotId: number): Promise<void> {
  assertValidSlotId(slotId)

  const row = await gameDb.saveSlots.get(slotId)
  if (!row) {
    throw new Error('Save slot is empty.')
  }

  const payload = parseSaveSlotPayload(row.payload)
  if (!payload) {
    throw new Error('Save slot payload is invalid.')
  }

  if (typeof window === 'undefined') {
    throw new Error('Save slots are unavailable outside the browser runtime.')
  }

  window.localStorage.setItem(
    RUNTIME_STATE_STORAGE_KEY,
    JSON.stringify(payload.runtimeSnapshot),
  )
  window.localStorage.setItem(
    UI_PREFERENCES_STORAGE_KEY,
    JSON.stringify(payload.uiPreferences),
  )

  await gameDb.transaction('rw', gameDb.inventory, gameDb.worldSession, async () => {
    await gameDb.inventory.clear()
    await gameDb.worldSession.clear()

    if (payload.inventoryRows.length > 0) {
      await gameDb.inventory.bulkPut(payload.inventoryRows)
    }

    if (payload.worldSessionRows.length > 0) {
      await gameDb.worldSession.bulkPut(payload.worldSessionRows)
    }
  })
}
