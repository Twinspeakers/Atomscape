import type { SectorId } from '@domain/spec/sectorSpec'
import type { CleanupTargetClassId, CleanupZoneId } from '@domain/spec/worldSpec'
import { applyWorldTargetDepletionTransition } from '@state/world/worldSessionTransitions'
import type {
  ExtractionTargetPayload,
  SimulationLogEntry,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface WorldTargetActionState {
  activeSectorId: SectorId
  worldDepletedTargetIds: string[]
  worldDestroyedCount: number
  worldRemainingCount: number
  worldVisitedZoneIds: CleanupZoneId[]
  worldZoneDestroyedCounts: Partial<Record<CleanupZoneId, number>>
  worldClassDestroyedCounts: Partial<Record<CleanupTargetClassId, number>>
  visitedCleanupZones: CleanupZoneId[]
  simulationLog: SimulationLogEntry[]
}

export interface WorldTargetActionBindings {
  recordWorldTargetDepleted: (target: ExtractionTargetPayload) => void
}

export interface BuildWorldTargetActionBindingsOptions {
  setState: (
    updater: (state: WorldTargetActionState) => Partial<WorldTargetActionState>,
  ) => void
  appendLog: AppendLog
  updateTutorialProgress: () => void
}

export interface WorldTargetActionBindingDependencies {
  applyWorldTargetDepletionTransition: typeof applyWorldTargetDepletionTransition
}

const defaultWorldTargetActionBindingDependencies: WorldTargetActionBindingDependencies = {
  applyWorldTargetDepletionTransition,
}

export function buildWorldTargetActionBindings(
  options: BuildWorldTargetActionBindingsOptions,
  dependencies: Partial<WorldTargetActionBindingDependencies> = {},
): WorldTargetActionBindings {
  const runtimeDependencies: WorldTargetActionBindingDependencies = {
    ...defaultWorldTargetActionBindingDependencies,
    ...dependencies,
  }

  return {
    recordWorldTargetDepleted: (target) => {
      options.setState((state) =>
        runtimeDependencies.applyWorldTargetDepletionTransition(
          {
            activeSectorId: state.activeSectorId,
            worldDepletedTargetIds: state.worldDepletedTargetIds,
            worldVisitedZoneIds: state.worldVisitedZoneIds,
            worldZoneDestroyedCounts: state.worldZoneDestroyedCounts,
            worldClassDestroyedCounts: state.worldClassDestroyedCounts,
            visitedCleanupZones: state.visitedCleanupZones,
            simulationLog: state.simulationLog,
          },
          target,
          options.appendLog,
        ) ?? {})

      options.updateTutorialProgress()
    },
  }
}
