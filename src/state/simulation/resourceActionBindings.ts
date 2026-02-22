import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import type { MarketState } from '@features/simulation/engine'
import {
  applyFeedCrewGalaxyBarTransition,
  applyLoadFridgeGalaxyBarsTransition,
  applyLoadFridgeWaterTransition,
  applyUseEnergyCellTransition,
} from '@state/simulation/crewConsumableTransitions'
import { applyFailureTransition } from '@state/simulation/failureTransitions'
import { applyMarketSaleTransition } from '@state/simulation/marketTransitions'
import type {
  CrewAggregateMetrics,
  CrewMemberState,
  CrewStatus,
  FailureReason,
  FailureReportEntry,
  FridgeState,
  MarketProductId,
  ResourceInventory,
  SimulationLogEntry,
  SimulationSummary,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface ResourceActionState {
  inventory: ResourceInventory
  atomCounter: ReturnType<typeof computeAtomTotals>
  fridge: FridgeState
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  crewAggregateMetrics: CrewAggregateMetrics
  crewFeedsDelivered: number
  starvationFailureLock: boolean
  simulationLog: SimulationLogEntry[]
  energy: number
  maxEnergy: number
  stationDistance: number
  charging: boolean
  containmentOn: boolean
  containmentPower: number
  credits: number
  shipRespawnSignal: number
  failureCount: number
  failureReports: FailureReportEntry[]
  simulationSummary: SimulationSummary
  market: MarketState
}

export interface ResourceActionBindings {
  useEnergyCell: () => boolean
  useConsumableSlot: (slotId: number) => boolean
  feedCrewGalaxyBar: () => void
  loadFridgeWater: (liters: number) => void
  loadFridgeGalaxyBars: (quantity: number) => void
  handleFailure: (reason: FailureReason) => void
  sellMarketProduct: (productId: MarketProductId, quantity?: number) => void
}

export interface BuildResourceActionBindingsOptions {
  setState: (
    updater: (state: ResourceActionState) => Partial<ResourceActionState>,
  ) => void
  getState: () => ResourceActionState
  appendLog: AppendLog
  persistInventorySnapshotSafely: (inventory: ResourceInventory) => void
  updateTutorialProgress: () => void
  failureReportLimit: number
}

export interface ResourceActionBindingDependencies {
  applyUseEnergyCellTransition: typeof applyUseEnergyCellTransition
  applyFeedCrewGalaxyBarTransition: typeof applyFeedCrewGalaxyBarTransition
  applyLoadFridgeWaterTransition: typeof applyLoadFridgeWaterTransition
  applyLoadFridgeGalaxyBarsTransition: typeof applyLoadFridgeGalaxyBarsTransition
  applyFailureTransition: typeof applyFailureTransition
  applyMarketSaleTransition: typeof applyMarketSaleTransition
}

const defaultResourceActionBindingDependencies: ResourceActionBindingDependencies = {
  applyUseEnergyCellTransition,
  applyFeedCrewGalaxyBarTransition,
  applyLoadFridgeWaterTransition,
  applyLoadFridgeGalaxyBarsTransition,
  applyFailureTransition,
  applyMarketSaleTransition,
}

function pushFailureReport(
  reports: FailureReportEntry[],
  report: FailureReportEntry,
  limit: number,
): FailureReportEntry[] {
  return [report, ...reports].slice(0, limit)
}

export function buildResourceActionBindings(
  options: BuildResourceActionBindingsOptions,
  dependencies: Partial<ResourceActionBindingDependencies> = {},
): ResourceActionBindings {
  const runtimeDependencies: ResourceActionBindingDependencies = {
    ...defaultResourceActionBindingDependencies,
    ...dependencies,
  }

  const bindings: ResourceActionBindings = {
    useEnergyCell: () => {
      let used = false

      options.setState((state) => {
        const transition = runtimeDependencies.applyUseEnergyCellTransition(
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
          options.appendLog,
        )

        if (transition.kind !== 'success') {
          return {}
        }

        used = true

        return {
          inventory: transition.inventory,
          energy: transition.energy,
          atomCounter: computeAtomTotals(transition.inventory),
          simulationSummary: transition.simulationSummary,
          simulationLog: transition.simulationLog,
        }
      })

      if (used) {
        options.persistInventorySnapshotSafely(options.getState().inventory)
        options.updateTutorialProgress()
      }

      return used
    },
    useConsumableSlot: (slotId) => {
      const normalizedSlot = Number.isFinite(slotId) ? Math.floor(slotId) : -1
      if (normalizedSlot === 1) {
        return bindings.useEnergyCell()
      }

      return false
    },
    feedCrewGalaxyBar: () => {
      let persistInventory = false

      options.setState((state) => {
        const transition = runtimeDependencies.applyFeedCrewGalaxyBarTransition(
          {
            inventory: state.inventory,
            fridge: state.fridge,
            crewStatus: state.crewStatus,
            crewMembers: state.crewMembers,
            crewFeedsDelivered: state.crewFeedsDelivered,
            starvationFailureLock: state.starvationFailureLock,
            simulationLog: state.simulationLog,
          },
          options.appendLog,
        )

        if (transition.kind === 'log-only') {
          return {
            simulationLog: transition.simulationLog,
          }
        }

        persistInventory = transition.persistInventory

        return {
          inventory: transition.inventory,
          fridge: transition.fridge,
          atomCounter: computeAtomTotals(transition.inventory),
          crewStatus: transition.crewStatus,
          crewMembers: transition.crewMembers,
          crewAggregateMetrics: transition.crewAggregateMetrics,
          crewFeedsDelivered: transition.crewFeedsDelivered,
          starvationFailureLock: transition.starvationFailureLock,
          simulationLog: transition.simulationLog,
        }
      })

      if (persistInventory) {
        options.persistInventorySnapshotSafely(options.getState().inventory)
      }

      options.updateTutorialProgress()
    },
    loadFridgeWater: (liters) => {
      let persistInventory = false

      options.setState((state) => {
        const transition = runtimeDependencies.applyLoadFridgeWaterTransition(
          {
            inventory: state.inventory,
            fridge: state.fridge,
            simulationLog: state.simulationLog,
          },
          liters,
          options.appendLog,
        )

        if (transition.kind === 'log-only') {
          return {
            simulationLog: transition.simulationLog,
          }
        }

        if (transition.kind === 'noop') {
          return {}
        }

        persistInventory = transition.persistInventory

        return {
          inventory: transition.inventory,
          atomCounter: computeAtomTotals(transition.inventory),
          fridge: transition.fridge,
          simulationLog: transition.simulationLog,
        }
      })

      if (persistInventory) {
        options.persistInventorySnapshotSafely(options.getState().inventory)
      }

      options.updateTutorialProgress()
    },
    loadFridgeGalaxyBars: (quantity) => {
      let persistInventory = false

      options.setState((state) => {
        const transition = runtimeDependencies.applyLoadFridgeGalaxyBarsTransition(
          {
            inventory: state.inventory,
            fridge: state.fridge,
            simulationLog: state.simulationLog,
          },
          quantity,
          options.appendLog,
        )

        if (transition.kind === 'log-only') {
          return {
            simulationLog: transition.simulationLog,
          }
        }

        if (transition.kind === 'noop') {
          return {}
        }

        persistInventory = transition.persistInventory

        return {
          inventory: transition.inventory,
          atomCounter: computeAtomTotals(transition.inventory),
          fridge: transition.fridge,
          simulationLog: transition.simulationLog,
        }
      })

      if (persistInventory) {
        options.persistInventorySnapshotSafely(options.getState().inventory)
      }

      options.updateTutorialProgress()
    },
    handleFailure: (reason) => {
      let persistInventory = false

      options.setState((state) => {
        const transition = runtimeDependencies.applyFailureTransition(
          {
            inventory: state.inventory,
            credits: state.credits,
            energy: state.energy,
            maxEnergy: state.maxEnergy,
            crewStatus: state.crewStatus,
            crewMembers: state.crewMembers,
            shipRespawnSignal: state.shipRespawnSignal,
            failureCount: state.failureCount,
            starvationFailureLock: state.starvationFailureLock,
            stationDistance: state.stationDistance,
            containmentPower: state.containmentPower,
            simulationLog: state.simulationLog,
          },
          reason,
          options.appendLog,
        )

        persistInventory = transition.persistInventory

        return {
          inventory: transition.inventory,
          atomCounter: computeAtomTotals(transition.inventory),
          credits: transition.credits,
          energy: transition.energy,
          charging: transition.charging,
          containmentOn: transition.containmentOn,
          crewStatus: transition.crewStatus,
          crewMembers: transition.crewMembers,
          crewAggregateMetrics: transition.crewAggregateMetrics,
          shipRespawnSignal: transition.shipRespawnSignal,
          failureCount: transition.failureCount,
          failureReports: pushFailureReport(
            state.failureReports,
            transition.failureReport,
            options.failureReportLimit,
          ),
          starvationFailureLock: transition.starvationFailureLock,
          simulationSummary: transition.simulationSummary,
          simulationLog: transition.simulationLog,
        }
      })

      if (persistInventory) {
        options.persistInventorySnapshotSafely(options.getState().inventory)
      }

      options.updateTutorialProgress()
    },
    sellMarketProduct: (productId, quantity = 1) => {
      let persistInventory = false

      options.setState((state) => {
        const sale = runtimeDependencies.applyMarketSaleTransition(
          {
            inventory: state.inventory,
            market: state.market,
            credits: state.credits,
            simulationLog: state.simulationLog,
          },
          productId,
          quantity,
          options.appendLog,
        )

        persistInventory = sale.persistInventory

        return {
          inventory: sale.inventory,
          market: sale.market,
          credits: sale.credits,
          atomCounter: computeAtomTotals(sale.inventory),
          simulationLog: sale.simulationLog,
        }
      })

      if (persistInventory) {
        options.persistInventorySnapshotSafely(options.getState().inventory)
      }

      options.updateTutorialProgress()
    },
  }

  return bindings
}
