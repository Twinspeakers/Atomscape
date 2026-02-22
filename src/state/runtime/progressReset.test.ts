import { describe, expect, it, vi } from 'vitest'
import { resetAllProgressData } from './progressReset'

describe('progressReset', () => {
  it('cleans storage, deletes database, and reloads', async () => {
    const removeItem = vi.fn()
    const closeDatabase = vi.fn()
    const deleteDatabase = vi.fn(async () => undefined)
    const clearInventory = vi.fn(async () => undefined)
    const clearWorldSession = vi.fn(async () => undefined)
    const reload = vi.fn()

    await resetAllProgressData(
      {
        uiPreferencesStorageKey: 'ui',
        runtimeStateStorageKey: 'runtime',
        inventoryPanelHeightStorageKey: 'panel',
      },
      {
        storage: { removeItem },
        closeDatabase,
        deleteDatabase,
        clearInventory,
        clearWorldSession,
        reload,
      },
    )

    expect(removeItem).toHaveBeenCalledTimes(3)
    expect(removeItem).toHaveBeenCalledWith('ui')
    expect(removeItem).toHaveBeenCalledWith('runtime')
    expect(removeItem).toHaveBeenCalledWith('panel')
    expect(closeDatabase).toHaveBeenCalledOnce()
    expect(deleteDatabase).toHaveBeenCalledOnce()
    expect(clearInventory).not.toHaveBeenCalled()
    expect(clearWorldSession).not.toHaveBeenCalled()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('falls back to table clears when database deletion fails', async () => {
    const closeDatabase = vi.fn()
    const deleteDatabase = vi.fn(async () => {
      throw new Error('delete failed')
    })
    const clearInventory = vi.fn(async () => undefined)
    const clearWorldSession = vi.fn(async () => undefined)
    const reload = vi.fn()

    await resetAllProgressData(
      {
        uiPreferencesStorageKey: 'ui',
        runtimeStateStorageKey: 'runtime',
        inventoryPanelHeightStorageKey: 'panel',
      },
      {
        closeDatabase,
        deleteDatabase,
        clearInventory,
        clearWorldSession,
        reload,
      },
    )

    expect(closeDatabase).toHaveBeenCalledOnce()
    expect(deleteDatabase).toHaveBeenCalledOnce()
    expect(clearInventory).toHaveBeenCalledOnce()
    expect(clearWorldSession).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
  })
})
