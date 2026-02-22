import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import type { ProcessRunOptions } from '@domain/spec/processCatalog'
import type { MarketState } from '@features/simulation/engine'
import { applyProcessRunTransition } from '@state/simulation/processTransitions'
import { runLiveSimulationTick } from '@state/simulation/tickOrchestration'
import type {
  CrewAggregateMetrics,
  CrewMemberState,
  CrewStatus,
  FailureReason,
  FridgeState,
  ResourceInventory,
  SimulationLogEntry,
  SimulationSummary,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface SimulationActionState {
  inventory: ResourceInventory
  atomCounter: ReturnType<typeof computeAtomTotals>
  energy: number
  maxEnergy: number
  stationDistance: number
  charging: boolean
  containmentOn: boolean
  containmentPower: number
  simulationSummary: SimulationSummary
  simulationLog: SimulationLogEntry[]
  market: MarketState
  docked: boolean
  useSceneDistance: boolean
  stationDistanceScene: number
  stationDistanceManual: number
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  crewAggregateMetrics: CrewAggregateMetrics
  fridge: FridgeState
  waterAutomationEnabled: boolean
  cycleTimeSeconds: number
  starvationFailureLock: boolean
  crewFeedsDelivered: number
}

export interface SimulationActionBindings {
  runProcess: (options: ProcessRunOptions) => void
  tickSimulation: () => void
}

export interface BuildSimulationActionBindingsOptions {
  setState: (
    updater: (state: SimulationActionState) => Partial<SimulationActionState>,
  ) => void
  getState: () => SimulationActionState
  appendLog: AppendLog
  persistInventorySnapshotSafely: (inventory: ResourceInventory) => void
  updateTutorialProgress: () => void
  handleFailure: (reason: FailureReason) => void
}

export interface SimulationActionBindingDependencies {
  applyProcessRunTransition: typeof applyProcessRunTransition
  runLiveSimulationTick: typeof runLiveSimulationTick
}

const defaultSimulationActionBindingDependencies: SimulationActionBindingDependencies = {
  applyProcessRunTransition,
  runLiveSimulationTick,
}

export function buildSimulationActionBindings(
  options: BuildSimulationActionBindingsOptions,
  dependencies: Partial<SimulationActionBindingDependencies> = {},
): SimulationActionBindings {
  const runtimeDependencies: SimulationActionBindingDependencies = {
    ...defaultSimulationActionBindingDependencies,
    ...dependencies,
  }

  return {
    runProcess: (processOptions) => {
      let persistInventory = false

      options.setState((state) => {
        const transition = runtimeDependencies.applyProcessRunTransition(
          {
            inventory: state.inventory,
            energy: state.energy,
            maxEnergy: state.maxEnergy,
            stationDistance: state.stationDistance,
            charging: state.charging,
            containmentOn: state.containmentOn,
            containmentPower: state.containmentPower,
            simulationLog: state.simulationLog,
          },
          processOptions,
          options.appendLog,
        )

        if (transition.kind === 'noop') {
          return {}
        }

        if (transition.kind === 'log-only') {
          return {
            simulationLog: transition.simulationLog,
          }
        }

        persistInventory = transition.persistInventory

        return {
          inventory: transition.inventory,
          energy: transition.energy,
          atomCounter: computeAtomTotals(transition.inventory),
          simulationSummary: transition.simulationSummary,
          simulationLog: transition.simulationLog,
        }
      })

      if (persistInventory) {
        options.persistInventorySnapshotSafely(options.getState().inventory)
      }

      options.updateTutorialProgress()
    },
    tickSimulation: () => {
      let persistInventory = false
      let triggerFailureReason: FailureReason | null = null

      options.setState((state) => {
        const next = runtimeDependencies.runLiveSimulationTick({
          inventory: state.inventory,
          market: state.market,
          energy: state.energy,
          maxEnergy: state.maxEnergy,
          charging: state.charging,
          docked: state.docked,
          useSceneDistance: state.useSceneDistance,
          stationDistanceScene: state.stationDistanceScene,
          stationDistanceManual: state.stationDistanceManual,
          containmentOn: state.containmentOn,
          containmentPower: state.containmentPower,
          crewStatus: state.crewStatus,
          crewMembers: state.crewMembers,
          fridge: state.fridge,
          waterAutomationEnabled: state.waterAutomationEnabled,
          cycleTimeSeconds: state.cycleTimeSeconds,
          simulationLog: state.simulationLog,
          starvationFailureLock: state.starvationFailureLock,
          crewFeedsDelivered: state.crewFeedsDelivered,
        })

        persistInventory = next.persistInventory
        triggerFailureReason = next.triggerFailureReason

        return {
          inventory: next.inventory,
          atomCounter: computeAtomTotals(next.inventory),
          energy: next.energy,
          charging: next.charging,
          containmentOn: next.containmentOn,
          market: next.market,
          crewStatus: next.crewStatus,
          crewMembers: next.crewMembers,
          crewAggregateMetrics: next.crewAggregateMetrics,
          fridge: next.fridge,
          waterAutomationEnabled: next.waterAutomationEnabled,
          starvationFailureLock: next.starvationFailureLock,
          stationDistance: next.stationDistance,
          simulationSummary: next.simulationSummary,
          simulationLog: next.simulationLog,
          cycleTimeSeconds: next.cycleTimeSeconds,
          crewFeedsDelivered: next.crewFeedsDelivered,
        }
      })

      if (persistInventory) {
        options.persistInventorySnapshotSafely(options.getState().inventory)
      }

      if (triggerFailureReason) {
        options.handleFailure(triggerFailureReason)
      }

      options.updateTutorialProgress()
    },
  }
}
