import type { InventoryRow } from '@platform/db/gameDb'
import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import type { ResourceInventory } from '@state/types'
import { describe, expect, it, vi } from 'vitest'
import {
  buildRuntimeActionBindings,
  type RuntimeActionState,
} from './runtimeActionBindings'

function createInventory(overrides: Partial<ResourceInventory> = {}): ResourceInventory {
  return {
    waterIce: 0,
    water: 0,
    ...overrides,
  }
}

function createState(overrides: Partial<RuntimeActionState> = {}): RuntimeActionState {
  const inventory = createInventory()

  return {
    inventory,
    inventoryLoaded: false,
    atomCounter: computeAtomTotals(inventory),
    ...overrides,
  }
}

describe('runtimeActionBindings', () => {
  it('hydrates inventory, applies catchup, and updates tutorial progress', async () => {
    let state = createState()
    const applyOfflineCatchupFromHydratedState = vi.fn()
    const updateTutorialProgress = vi.fn()
    const markProgressResetInFlight = vi.fn()
    const readInventoryRows = vi.fn(async () => [
      { symbol: 'waterIce', count: 2 } as InventoryRow,
      { symbol: 'water', count: 1 } as InventoryRow,
    ])

    const bindings = buildRuntimeActionBindings({
      setPatch: (patch) => {
        state = { ...state, ...patch }
      },
      readInventoryRows,
      applyOfflineCatchupFromHydratedState,
      updateTutorialProgress,
      markProgressResetInFlight,
      progressResetStorageKeys: {
        uiPreferencesStorageKey: 'ui',
        runtimeStateStorageKey: 'runtime',
        inventoryPanelHeightStorageKey: 'panel',
      },
    })

    await bindings.hydrateInventory()

    expect(state.inventoryLoaded).toBe(true)
    expect(state.inventory.waterIce).toBe(2)
    expect(state.inventory.water).toBe(1)
    expect(readInventoryRows).toHaveBeenCalledOnce()
    expect(applyOfflineCatchupFromHydratedState).toHaveBeenCalledOnce()
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
    expect(markProgressResetInFlight).not.toHaveBeenCalled()
  })

  it('marks reset in-flight and calls reset progress with keys', async () => {
    const setPatch = vi.fn()
    const readInventoryRows = vi.fn(async () => [] as InventoryRow[])
    const applyOfflineCatchupFromHydratedState = vi.fn()
    const updateTutorialProgress = vi.fn()
    const markProgressResetInFlight = vi.fn()
    const resetAllProgressData = vi.fn(async () => undefined)

    const bindings = buildRuntimeActionBindings(
      {
        setPatch,
        readInventoryRows,
        applyOfflineCatchupFromHydratedState,
        updateTutorialProgress,
        markProgressResetInFlight,
        progressResetStorageKeys: {
          uiPreferencesStorageKey: 'ui',
          runtimeStateStorageKey: 'runtime',
          inventoryPanelHeightStorageKey: 'panel',
        },
      },
      {
        resetAllProgressData:
          resetAllProgressData as unknown as typeof resetAllProgressData,
      },
    )

    await bindings.resetAllProgress()

    expect(markProgressResetInFlight).toHaveBeenCalledWith(true)
    expect(resetAllProgressData).toHaveBeenCalledWith({
      uiPreferencesStorageKey: 'ui',
      runtimeStateStorageKey: 'runtime',
      inventoryPanelHeightStorageKey: 'panel',
    })
  })
})
