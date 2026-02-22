import type { SectorId } from '@domain/spec/sectorSpec'
import { loadWorldSessionRowForSector } from '@state/runtime/hydrationLoaders'
import type { WorldSessionRow } from '@platform/db/gameDb'
import type { RadarContact, SelectedObject, SimulationLogEntry } from '@state/types'
import {
  applySectorJumpArrivalTransition,
  applySectorJumpDepartureTransition,
} from '@state/world/sectorJumpTransitions'
import {
  buildWorldSessionFallbackState,
  resolveHydratedWorldSessionTransition,
  type WorldSessionTransitionState,
} from '@state/world/worldSessionTransitions'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface WorldSessionActionState extends WorldSessionTransitionState {
  selectedObject: SelectedObject | null
  radarContacts: RadarContact[]
}

export interface WorldSessionActionBindings {
  loadWorldSessionForSector: (sectorId: SectorId) => Promise<void>
  hydrateWorldSession: () => Promise<void>
  jumpToSector: (sectorId: SectorId) => Promise<void>
}

export interface BuildWorldSessionActionBindingsOptions {
  setState: (
    updater: (state: WorldSessionActionState) => Partial<WorldSessionActionState>,
  ) => void
  getState: () => WorldSessionActionState
  appendLog: AppendLog
  updateTutorialProgress: () => void
  worldSessionVersion: number
  legacyRowId: string
  readWorldSessionById: (rowId: string) => Promise<WorldSessionRow | undefined>
}

export interface WorldSessionActionBindingDependencies {
  loadWorldSessionRowForSector: typeof loadWorldSessionRowForSector
  buildWorldSessionFallbackState: typeof buildWorldSessionFallbackState
  resolveHydratedWorldSessionTransition: typeof resolveHydratedWorldSessionTransition
  applySectorJumpDepartureTransition: typeof applySectorJumpDepartureTransition
  applySectorJumpArrivalTransition: typeof applySectorJumpArrivalTransition
}

const defaultWorldSessionActionBindingDependencies: WorldSessionActionBindingDependencies = {
  loadWorldSessionRowForSector,
  buildWorldSessionFallbackState,
  resolveHydratedWorldSessionTransition,
  applySectorJumpDepartureTransition,
  applySectorJumpArrivalTransition,
}

export function buildWorldSessionActionBindings(
  options: BuildWorldSessionActionBindingsOptions,
  dependencies: Partial<WorldSessionActionBindingDependencies> = {},
): WorldSessionActionBindings {
  const runtimeDependencies: WorldSessionActionBindingDependencies = {
    ...defaultWorldSessionActionBindingDependencies,
    ...dependencies,
  }

  const loadWorldSessionForSector = async (sectorId: SectorId) => {
    const fallbackState = runtimeDependencies.buildWorldSessionFallbackState(sectorId)

    try {
      const row = await runtimeDependencies.loadWorldSessionRowForSector({
        sectorId,
        legacyRowId: options.legacyRowId,
        readWorldSessionById: options.readWorldSessionById,
      })

      options.setState((state) => ({
        ...runtimeDependencies.resolveHydratedWorldSessionTransition(
          {
            sectorId,
            worldSessionRow: row,
            worldSessionVersion: options.worldSessionVersion,
            existingVisitedCleanupZones: state.visitedCleanupZones,
            simulationLog: state.simulationLog,
          },
          options.appendLog,
        ),
      }))

      options.updateTutorialProgress()
    } catch {
      options.setState((state) => ({
        ...fallbackState,
        simulationLog: state.simulationLog,
      }))
    }
  }

  return {
    loadWorldSessionForSector,
    hydrateWorldSession: async () => {
      await loadWorldSessionForSector(options.getState().activeSectorId)
    },
    jumpToSector: async (sectorId) => {
      const currentSectorId = options.getState().activeSectorId
      if (sectorId === currentSectorId) {
        return
      }

      options.setState((state) =>
        runtimeDependencies.applySectorJumpDepartureTransition(
          state,
          sectorId,
          options.appendLog,
        ))

      await loadWorldSessionForSector(sectorId)

      options.setState((state) =>
        runtimeDependencies.applySectorJumpArrivalTransition(
          state,
          sectorId,
          options.appendLog,
        ))
    },
  }
}
