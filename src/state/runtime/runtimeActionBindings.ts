import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import type { InventoryRow } from '@platform/db/gameDb'
import { buildInventoryFromRows } from '@state/runtime/hydrationLoaders'
import {
  resetAllProgressData,
  type ProgressResetStorageKeys,
} from '@state/runtime/progressReset'
import type { ResourceInventory } from '@state/types'

export interface RuntimeActionState {
  inventory: ResourceInventory
  inventoryLoaded: boolean
  atomCounter: ReturnType<typeof computeAtomTotals>
}

export interface RuntimeActionBindings {
  hydrateInventory: () => Promise<void>
  resetAllProgress: () => Promise<void>
}

export interface BuildRuntimeActionBindingsOptions {
  setPatch: (patch: Partial<RuntimeActionState>) => void
  readInventoryRows: () => Promise<ReadonlyArray<InventoryRow>>
  applyOfflineCatchupFromHydratedState: () => void
  updateTutorialProgress: () => void
  markProgressResetInFlight: (inFlight: boolean) => void
  progressResetStorageKeys: ProgressResetStorageKeys
}

export interface RuntimeActionBindingDependencies {
  buildInventoryFromRows: typeof buildInventoryFromRows
  resetAllProgressData: typeof resetAllProgressData
}

const defaultRuntimeActionBindingDependencies: RuntimeActionBindingDependencies = {
  buildInventoryFromRows,
  resetAllProgressData,
}

export function buildRuntimeActionBindings(
  options: BuildRuntimeActionBindingsOptions,
  dependencies: Partial<RuntimeActionBindingDependencies> = {},
): RuntimeActionBindings {
  const runtimeDependencies: RuntimeActionBindingDependencies = {
    ...defaultRuntimeActionBindingDependencies,
    ...dependencies,
  }

  return {
    hydrateInventory: async () => {
      const rows = await options.readInventoryRows()
      const inventory = runtimeDependencies.buildInventoryFromRows(rows)

      options.setPatch({
        inventory,
        inventoryLoaded: true,
        atomCounter: computeAtomTotals(inventory),
      })

      options.applyOfflineCatchupFromHydratedState()
      options.updateTutorialProgress()
    },
    resetAllProgress: async () => {
      options.markProgressResetInFlight(true)
      await runtimeDependencies.resetAllProgressData(
        options.progressResetStorageKeys,
      )
    },
  }
}
