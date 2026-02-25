import { describe, expect, it, vi } from 'vitest'
import { resetAllProgressData } from './progressReset'

describe('progressReset', () => {
  it('cleans storage, clears active runtime tables, and reloads', async () => {
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
    expect(clearInventory).toHaveBeenCalledOnce()
    expect(clearWorldSession).toHaveBeenCalledOnce()
    expect(closeDatabase).not.toHaveBeenCalled()
    expect(deleteDatabase).not.toHaveBeenCalled()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('falls back to deleting the database when table clear fails', async () => {
    const closeDatabase = vi.fn()
    const deleteDatabase = vi.fn(async () => undefined)
    const clearInventory = vi.fn(async () => {
      throw new Error('clear failed')
    })
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
