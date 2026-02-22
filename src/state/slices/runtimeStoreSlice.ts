import type { InventoryRow, WorldSessionRow } from '@platform/db/gameDb'
import {
  RUNTIME_STATE_STORAGE_KEY,
  WORLD_SESSION_VERSION,
} from '@state/runtime/snapshotPersistence'
import {
  buildStoreBootstrapContext,
  sanitizePlayerUsername,
} from '@state/runtime/storeBootstrap'
import {
  DEFAULT_PINNED_QUEST_IDS,
  UI_PREFERENCES_STORAGE_KEY,
} from '@state/ui/workspacePreferences'
import { buildAppActionSlices } from '@state/slices/appActionSlices'
import { buildAppInitialState } from '@state/slices/appInitialState'
import { SIMULATION_LOG_LIMIT } from '@domain/spec/gameSpec'
import type { AppState } from '@state/appStoreState'
import type { ResourceInventory, SimulationLogEntry } from '@state/types'

const INVENTORY_PANEL_HEIGHT_STORAGE_KEY = 'inventory-panel-height-v1'
const FAILURE_REPORT_LIMIT = 80
const LEGACY_WORLD_SESSION_ROW_ID = 'active-world-session'
export const QUEST_REWARD_HISTORY_LIMIT = 32

function pushLog(logs: SimulationLogEntry[], message: string): SimulationLogEntry[] {
  return pushLogAtTimestamp(logs, message, Date.now())
}

function pushLogAtTimestamp(
  logs: SimulationLogEntry[],
  message: string,
  timestampMs: number,
): SimulationLogEntry[] {
  const timestamp = Math.max(0, Math.floor(timestampMs))
  const entry: SimulationLogEntry = {
    id: timestamp * 1000 + Math.floor(Math.random() * 1000),
    message,
    timestamp,
  }

  return [entry, ...logs].slice(0, SIMULATION_LOG_LIMIT)
}

export interface BuildRuntimeStoreStateOptions {
  setState: (updater: (state: AppState) => Partial<AppState>) => void
  setPatch: (patch: Partial<AppState>) => void
  getState: () => AppState
  shouldSkipPersistence: () => boolean
  persistInventorySnapshotSafely: (inventory: ResourceInventory) => void
  readWorldSessionById: (rowId: string) => Promise<WorldSessionRow | undefined>
  readInventoryRows: () => Promise<ReadonlyArray<InventoryRow>>
  markProgressResetInFlight: (inFlight: boolean) => void
}

export function buildRuntimeStoreState(options: BuildRuntimeStoreStateOptions): AppState {
  const bootstrap = buildStoreBootstrapContext({
    questRewardHistoryLimit: QUEST_REWARD_HISTORY_LIMIT,
  })

  const actionSlices = buildAppActionSlices({
    setState: options.setState,
    setPatch: options.setPatch,
    getState: options.getState,
    appendLog: ({ logs, message }) => pushLog(logs, message),
    persistInventorySnapshotSafely: options.persistInventorySnapshotSafely,
    sanitizePlayerUsername,
    shouldSkipPersistence: options.shouldSkipPersistence,
    questRewardHistoryLimit: QUEST_REWARD_HISTORY_LIMIT,
    worldSessionVersion: WORLD_SESSION_VERSION,
    legacyWorldSessionRowId: LEGACY_WORLD_SESSION_ROW_ID,
    readWorldSessionById: options.readWorldSessionById,
    readInventoryRows: options.readInventoryRows,
    markProgressResetInFlight: options.markProgressResetInFlight,
    progressResetStorageKeys: {
      uiPreferencesStorageKey: UI_PREFERENCES_STORAGE_KEY,
      runtimeStateStorageKey: RUNTIME_STATE_STORAGE_KEY,
      inventoryPanelHeightStorageKey: INVENTORY_PANEL_HEIGHT_STORAGE_KEY,
    },
    failureReportLimit: FAILURE_REPORT_LIMIT,
  })

  return buildAppInitialState({
    bootstrap,
    actionSlices,
  })
}

export { DEFAULT_PINNED_QUEST_IDS }
