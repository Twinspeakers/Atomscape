import { SIMULATION_LOG_LIMIT } from '@domain/spec/gameSpec'
import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import type { MarketState } from '@features/simulation/engine'
import { runOfflineCatchupTicks } from '@state/simulation/tickOrchestration'
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

export interface OfflineCatchupHydrationState {
  inventoryLoaded: boolean
  cycleTimeSeconds: number
  inventory: ResourceInventory
  market: MarketState
  energy: number
  maxEnergy: number
  charging: boolean
  docked: boolean
  useSceneDistance: boolean
  stationDistanceScene: number
  stationDistanceManual: number
  containmentOn: boolean
  containmentPower: number
  crewMembers: CrewMemberState[]
  crewStatus: CrewStatus
  crewAggregateMetrics: CrewAggregateMetrics
  fridge: FridgeState
  waterAutomationEnabled: boolean
  stationDistance: number
  simulationSummary: SimulationSummary
  simulationLog: SimulationLogEntry[]
  starvationFailureLock: boolean
  crewFeedsDelivered: number
}

export interface OfflineCatchupHydrationPatch {
  inventory: ResourceInventory
  atomCounter: ReturnType<typeof computeAtomTotals>
  energy: number
  charging: boolean
  containmentOn: boolean
  market: MarketState
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  crewAggregateMetrics: CrewAggregateMetrics
  fridge: FridgeState
  waterAutomationEnabled: boolean
  starvationFailureLock: boolean
  stationDistance: number
  simulationSummary: SimulationSummary
  simulationLog: SimulationLogEntry[]
  cycleTimeSeconds: number
  crewFeedsDelivered: number
}

export interface ResolveOfflineCatchupHydrationOptions {
  alreadyApplied: boolean
  state: OfflineCatchupHydrationState
  nowMs?: number
}

export interface ResolveOfflineCatchupHydrationResult {
  nextApplied: boolean
  kind: 'skip' | 'noop' | 'applied'
  patch?: OfflineCatchupHydrationPatch
  persistInventory: boolean
  inventoryToPersist?: ResourceInventory
  triggerFailureReason: FailureReason | null
}

function pushLogAtTimestamp(
  logs: SimulationLogEntry[],
  message: string,
  timestampMs: number,
): SimulationLogEntry[] {
  const timestamp = Math.max(0, Math.floor(timestampMs))
  const entry: SimulationLogEntry = {
    id: timestamp * 1000 + Math.floor(Math.random() * 1000),
    message,
    timestamp,
  }

  return [entry, ...logs].slice(0, SIMULATION_LOG_LIMIT)
}

function formatDurationFromSeconds(totalSeconds: number): string {
  const normalized = Math.max(0, Math.floor(totalSeconds))
  const days = Math.floor(normalized / (24 * 60 * 60))
  const hours = Math.floor((normalized % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((normalized % (60 * 60)) / 60)
  const seconds = normalized % 60
  return `${days}d ${hours}h ${minutes}m ${seconds}s`
}

export function resolveOfflineCatchupHydration(
  options: ResolveOfflineCatchupHydrationOptions,
): ResolveOfflineCatchupHydrationResult {
  if (options.alreadyApplied) {
    return {
      nextApplied: true,
      kind: 'skip',
      persistInventory: false,
      triggerFailureReason: null,
    }
  }

  if (!options.state.inventoryLoaded) {
    return {
      nextApplied: false,
      kind: 'skip',
      persistInventory: false,
      triggerFailureReason: null,
    }
  }

  const nowMs = options.nowMs ?? Date.now()
  const startCycleTimeSeconds = Math.max(0, Math.floor(options.state.cycleTimeSeconds))
  const nowCycleTimeSeconds = Math.max(0, Math.floor(nowMs / 1000))

  const catchup = runOfflineCatchupTicks({
    startCycleTimeSeconds,
    nowCycleTimeSeconds,
    inventory: options.state.inventory,
    market: options.state.market,
    energy: options.state.energy,
    maxEnergy: options.state.maxEnergy,
    charging: options.state.charging,
    docked: options.state.docked,
    useSceneDistance: options.state.useSceneDistance,
    stationDistanceScene: options.state.stationDistanceScene,
    stationDistanceManual: options.state.stationDistanceManual,
    containmentOn: options.state.containmentOn,
    containmentPower: options.state.containmentPower,
    crewMembers: options.state.crewMembers,
    crewStatus: options.state.crewStatus,
    crewAggregateMetrics: options.state.crewAggregateMetrics,
    fridge: options.state.fridge,
    waterAutomationEnabled: options.state.waterAutomationEnabled,
    stationDistance: options.state.stationDistance,
    simulationSummary: options.state.simulationSummary,
    simulationLog: options.state.simulationLog,
    starvationFailureLock: options.state.starvationFailureLock,
  })

  if (!catchup) {
    return {
      nextApplied: true,
      kind: 'noop',
      persistInventory: false,
      triggerFailureReason: null,
    }
  }

  const nextSimulationLog = pushLogAtTimestamp(
    catchup.simulationLog,
    `Offline catch-up complete: replayed ${formatDurationFromSeconds(catchup.elapsedSeconds)} while away.`,
    catchup.cycleTimeSeconds * 1000,
  )

  return {
    nextApplied: true,
    kind: 'applied',
    patch: {
      inventory: catchup.inventory,
      atomCounter: computeAtomTotals(catchup.inventory),
      energy: catchup.energy,
      charging: catchup.charging,
      containmentOn: catchup.containmentOn,
      market: catchup.market,
      crewStatus: catchup.crewStatus,
      crewMembers: catchup.crewMembers,
      crewAggregateMetrics: catchup.crewAggregateMetrics,
      fridge: catchup.fridge,
      waterAutomationEnabled: catchup.waterAutomationEnabled,
      starvationFailureLock: catchup.starvationFailureLock,
      stationDistance: catchup.stationDistance,
      simulationSummary: catchup.simulationSummary,
      simulationLog: nextSimulationLog,
      cycleTimeSeconds: catchup.cycleTimeSeconds,
      crewFeedsDelivered: options.state.crewFeedsDelivered + catchup.fedCrewCount,
    },
    persistInventory: catchup.persistInventory,
    inventoryToPersist: catchup.inventory,
    triggerFailureReason: catchup.triggerFailureReason,
  }
}
