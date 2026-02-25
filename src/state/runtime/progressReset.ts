import { gameDb } from '@platform/db/gameDb'

export interface ProgressResetStorageKeys {
  uiPreferencesStorageKey: string
  runtimeStateStorageKey: string
  inventoryPanelHeightStorageKey: string
}

export interface ProgressResetDependencies {
  storage?: Pick<Storage, 'removeItem'>
  closeDatabase: () => void
  deleteDatabase: () => Promise<void>
  clearInventory: () => Promise<void>
  clearWorldSession: () => Promise<void>
  reload: () => void
}

function removeStorageItemSafely(storage: Pick<Storage, 'removeItem'> | undefined, key: string): void {
  if (!storage) {
    return
  }

  try {
    storage.removeItem(key)
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function createDefaultProgressResetDependencies(): ProgressResetDependencies {
  const storage = typeof window !== 'undefined'
    ? window.localStorage
    : undefined
  const reload = () => {
    if (typeof window === 'undefined') {
      return
    }

    window.location.replace(window.location.pathname + window.location.search + window.location.hash)
  }

  return {
    storage,
    closeDatabase: () => {
      gameDb.close()
    },
    deleteDatabase: async () => {
      await gameDb.delete()
    },
    clearInventory: async () => {
      await gameDb.inventory.clear()
    },
    clearWorldSession: async () => {
      await gameDb.worldSession.clear()
    },
    reload,
  }
}

export async function resetAllProgressData(
  keys: ProgressResetStorageKeys,
  dependencies: ProgressResetDependencies = createDefaultProgressResetDependencies(),
): Promise<void> {
  removeStorageItemSafely(dependencies.storage, keys.uiPreferencesStorageKey)
  removeStorageItemSafely(dependencies.storage, keys.runtimeStateStorageKey)
  removeStorageItemSafely(dependencies.storage, keys.inventoryPanelHeightStorageKey)

  try {
    await Promise.all([
      dependencies.clearInventory(),
      dependencies.clearWorldSession(),
    ])
  } catch {
    try {
      dependencies.closeDatabase()
      await dependencies.deleteDatabase()
    } catch {
      // Ignore indexedDB cleanup failures.
    }
  }

  dependencies.reload()
}
