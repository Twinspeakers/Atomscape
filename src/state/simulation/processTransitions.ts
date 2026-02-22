import type { ProcessRunOptions } from '@domain/spec/processCatalog'
import { buildSimulationSummary, executeProcess } from '@features/simulation/engine'
import type {
  ResourceInventory,
  SimulationLogEntry,
  SimulationSummary,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface ProcessTransitionState {
  inventory: ResourceInventory
  energy: number
  maxEnergy: number
  stationDistance: number
  charging: boolean
  containmentOn: boolean
  containmentPower: number
  simulationLog: SimulationLogEntry[]
}

export type ProcessRunTransitionResult =
  | {
      kind: 'noop'
      persistInventory: false
    }
  | {
      kind: 'log-only'
      simulationLog: SimulationLogEntry[]
      persistInventory: false
    }
  | {
      kind: 'success'
      inventory: ResourceInventory
      energy: number
      simulationSummary: SimulationSummary
      simulationLog: SimulationLogEntry[]
      persistInventory: boolean
    }

export function applyProcessRunTransition(
  state: ProcessTransitionState,
  options: ProcessRunOptions,
  appendLog: AppendLog,
): ProcessRunTransitionResult {
  const result = executeProcess(
    {
      inventory: state.inventory,
      energy: state.energy,
      maxEnergy: state.maxEnergy,
    },
    options,
  )

  if (!result.succeeded) {
    if (!result.logMessage) {
      return {
        kind: 'noop',
        persistInventory: false,
      }
    }

    return {
      kind: 'log-only',
      simulationLog: appendLog({
        logs: state.simulationLog,
        message: result.logMessage,
      }),
      persistInventory: false,
    }
  }

  return {
    kind: 'success',
    inventory: result.inventory,
    energy: result.energy,
    simulationSummary: buildSimulationSummary({
      stationDistance: state.stationDistance,
      charging: state.charging,
      containmentOn: state.containmentOn,
      containmentPower: state.containmentPower,
    }),
    simulationLog: result.logMessage
      ? appendLog({
          logs: state.simulationLog,
          message: result.logMessage,
        })
      : state.simulationLog,
    persistInventory: result.inventoryChanged,
  }
}
