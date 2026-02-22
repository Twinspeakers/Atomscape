import { create } from 'zustand'
import { gameDb } from '@platform/db/gameDb'
import {
  buildRuntimeSnapshotFromState,
  buildWorldSessionSnapshotFromState,
  persistRuntimeSnapshot,
} from '@state/runtime/snapshotPersistence'
import { sanitizePlayerUsername } from '@state/runtime/storeBootstrap'
import { installStorePersistenceSubscriptions } from '@state/persistence/storePersistence'
import { persistInventorySnapshotSafely as persistInventorySnapshotSafelyInternal } from '@state/persistence/inventoryPersistence'
import {
  buildRuntimeStoreState,
  DEFAULT_PINNED_QUEST_IDS,
  QUEST_REWARD_HISTORY_LIMIT,
} from '@state/slices/runtimeStoreSlice'
import type { AppState } from '@state/appStoreState'
import type { ResourceInventory } from '@state/types'

export { computeMinActiveWorldTargetCount, worldSessionRowIdForSector } from '@state/world/worldStateUtils'
export { DEFAULT_PINNED_QUEST_IDS }
export type { AppState } from '@state/appStoreState'

let progressResetInFlight = false

function persistInventorySnapshotSafely(inventory: ResourceInventory): void {
  persistInventorySnapshotSafelyInternal(inventory, {
    shouldSkip: () => progressResetInFlight,
  })
}

export const useAppStore = create<AppState>((set, get) =>
  buildRuntimeStoreState({
    setState: (updater) => {
      set((state) => updater(state))
    },
    setPatch: (patch) => {
      set(patch)
    },
    getState: () => get(),
    shouldSkipPersistence: () => progressResetInFlight,
    persistInventorySnapshotSafely,
    readWorldSessionById: (rowId) => gameDb.worldSession.get(rowId),
    readInventoryRows: () => gameDb.inventory.toArray(),
    markProgressResetInFlight: (inFlight) => {
      progressResetInFlight = inFlight
    },
  }),
)

installStorePersistenceSubscriptions({
  store: useAppStore,
  buildRuntimeSnapshot: (state) =>
    buildRuntimeSnapshotFromState(state, {
      questRewardHistoryLimit: QUEST_REWARD_HISTORY_LIMIT,
      sanitizePlayerUsername,
    }),
  buildWorldSessionSnapshot: buildWorldSessionSnapshotFromState,
  persistRuntimeSnapshot: (snapshot) => {
    if (progressResetInFlight) {
      return
    }

    persistRuntimeSnapshot(snapshot)
  },
  persistWorldSessionSnapshot: (snapshot) => gameDb.worldSession.put(snapshot),
  shouldSkipPersistence: () => progressResetInFlight,
  shouldPersistWorldSession: (state) => state.worldStateLoaded,
})
