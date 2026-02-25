import { CREW_DEBUFF_MAX } from '@domain/spec/gameSpec'
import {
  runSimulationTick,
  type MarketState,
} from '@features/simulation/engine'
import {
  deriveCrewAggregateMetrics,
  deriveCrewStatusFromMembers,
} from '@state/runtime/snapshotSanitizers'
import { clamp, normalizeNumber } from '@state/utils/numberUtils'
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

export interface OfflineCatchupTickInput {
  startCycleTimeSeconds: number
  nowCycleTimeSeconds: number
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
  galaxyBarAutomationEnabled?: boolean
  galaxyBarsCrafted?: number
  stationDistance: number
  simulationSummary: SimulationSummary
  simulationLog: SimulationLogEntry[]
  starvationFailureLock: boolean
}

export interface OfflineCatchupTickResult {
  elapsedSeconds: number
  inventory: ResourceInventory
  market: MarketState
  energy: number
  charging: boolean
  containmentOn: boolean
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  crewAggregateMetrics: CrewAggregateMetrics
  fridge: FridgeState
  waterAutomationEnabled: boolean
  galaxyBarAutomationEnabled: boolean
  galaxyBarsCrafted: number
  stationDistance: number
  simulationSummary: SimulationSummary
  simulationLog: SimulationLogEntry[]
  cycleTimeSeconds: number
  starvationFailureLock: boolean
  triggerFailureReason: FailureReason | null
  persistInventory: boolean
  fedCrewCount: number
}

export interface LiveSimulationTickInput {
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
  fridge: FridgeState
  waterAutomationEnabled: boolean
  galaxyBarAutomationEnabled?: boolean
  galaxyBarsCrafted?: number
  simulationLog: SimulationLogEntry[]
  cycleTimeSeconds: number
  starvationFailureLock: boolean
  crewFeedsDelivered: number
}

export interface LiveSimulationTickResult {
  inventory: ResourceInventory
  market: MarketState
  energy: number
  charging: boolean
  containmentOn: boolean
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  crewAggregateMetrics: CrewAggregateMetrics
  fridge: FridgeState
  waterAutomationEnabled: boolean
  galaxyBarAutomationEnabled: boolean
  galaxyBarsCrafted: number
  starvationFailureLock: boolean
  stationDistance: number
  simulationSummary: SimulationSummary
  simulationLog: SimulationLogEntry[]
  cycleTimeSeconds: number
  crewFeedsDelivered: number
  triggerFailureReason: FailureReason | null
  persistInventory: boolean
}

export function mirrorAggregateCrewToMembers(
  crewMembers: CrewMemberState[],
  crewStatus: CrewStatus,
): CrewMemberState[] {
  return crewMembers.map((member) => ({
    ...member,
    hunger: clamp(normalizeNumber(crewStatus.hunger, member.hunger), 0, 100),
    debuff: clamp(normalizeNumber(crewStatus.debuff, member.debuff), 0, 100),
    starving: Boolean(crewStatus.starving),
  }))
}

function resolveCrewTransitionFromTick(
  tick: ReturnType<typeof runSimulationTick>,
  currentCrewMembers: CrewMemberState[],
  foodAutomationEnabled: boolean,
): {
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  crewAggregateMetrics: CrewAggregateMetrics
} {
  const fallbackCrewStatus: CrewStatus = {
    hunger: tick.crewHunger,
    debuff: tick.crewDebuff,
    starving: tick.crewStarving,
    foodAutomationEnabled,
  }
  const nextCrewMembers =
    tick.crewMembers ?? mirrorAggregateCrewToMembers(currentCrewMembers, fallbackCrewStatus)

  return {
    crewMembers: nextCrewMembers,
    crewStatus: deriveCrewStatusFromMembers(nextCrewMembers, foodAutomationEnabled),
    crewAggregateMetrics: tick.crewMetrics ?? deriveCrewAggregateMetrics(nextCrewMembers),
  }
}

function resolveStarvationFailureTransition(
  state: {
    starvationFailureLock: boolean
  },
  tick: ReturnType<typeof runSimulationTick>,
): {
  starvationFailureLock: boolean
  triggerFailureReason: FailureReason | null
} {
  if (tick.crewCriticalFailure === 'starvation') {
    return {
      starvationFailureLock: true,
      triggerFailureReason: state.starvationFailureLock ? null : 'starvation',
    }
  }

  if (!tick.crewStarving || tick.crewDebuff < CREW_DEBUFF_MAX * 0.45) {
    return {
      starvationFailureLock: false,
      triggerFailureReason: null,
    }
  }

  return {
    starvationFailureLock: state.starvationFailureLock,
    triggerFailureReason: null,
  }
}

function applyTickToState(
  tick: ReturnType<typeof runSimulationTick>,
  state: {
    inventory: ResourceInventory
    market: MarketState
    energy: number
    charging: boolean
    containmentOn: boolean
    crewMembers: CrewMemberState[]
    crewStatus: CrewStatus
    crewAggregateMetrics: CrewAggregateMetrics
    fridge: FridgeState
    waterAutomationEnabled: boolean
    galaxyBarAutomationEnabled: boolean
    galaxyBarsCrafted: number
    stationDistance: number
    simulationSummary: SimulationSummary
    simulationLog: SimulationLogEntry[]
    cycleTimeSeconds: number
  },
): void {
  const crewTransition = resolveCrewTransitionFromTick(
    tick,
    state.crewMembers,
    state.crewStatus.foodAutomationEnabled,
  )

  state.crewMembers = crewTransition.crewMembers
  state.crewStatus = crewTransition.crewStatus
  state.crewAggregateMetrics = crewTransition.crewAggregateMetrics
  state.inventory = tick.inventory
  state.market = tick.market
  state.energy = tick.energy
  state.charging = tick.charging
  state.containmentOn = tick.containmentOn
  state.fridge = tick.fridge ?? state.fridge
  state.waterAutomationEnabled = tick.waterAutomationEnabled ?? state.waterAutomationEnabled
  state.galaxyBarAutomationEnabled =
    tick.galaxyBarAutomationEnabled ?? state.galaxyBarAutomationEnabled
  state.galaxyBarsCrafted = tick.autoCraftedGalaxyBars != null
    ? state.galaxyBarsCrafted + tick.autoCraftedGalaxyBars
    : state.galaxyBarsCrafted
  state.stationDistance = tick.stationDistance
  state.simulationSummary = tick.simulationSummary
  state.simulationLog = tick.simulationLog
}

export function runLiveSimulationTick(input: LiveSimulationTickInput): LiveSimulationTickResult {
  const tick = runSimulationTick({
    inventory: input.inventory,
    market: input.market,
    energy: input.energy,
    maxEnergy: input.maxEnergy,
    charging: input.charging,
    docked: input.docked,
    useSceneDistance: input.useSceneDistance,
    stationDistanceScene: input.stationDistanceScene,
    stationDistanceManual: input.stationDistanceManual,
    containmentOn: input.containmentOn,
    containmentPower: input.containmentPower,
    crewHunger: input.crewStatus.hunger,
    crewDebuff: input.crewStatus.debuff,
    crewStarving: input.crewStatus.starving,
    foodAutomationEnabled: input.crewStatus.foodAutomationEnabled,
    galaxyBarAutomationEnabled: input.galaxyBarAutomationEnabled ?? false,
    crewMembers: input.crewMembers,
    fridge: input.fridge,
    waterAutomationEnabled: input.waterAutomationEnabled,
    cycleTimeSeconds: input.cycleTimeSeconds,
    simulationLog: input.simulationLog,
  })

  const failureTransition = resolveStarvationFailureTransition(
    {
      starvationFailureLock: input.starvationFailureLock,
    },
    tick,
  )
  const crewTransition = resolveCrewTransitionFromTick(
    tick,
    input.crewMembers,
    input.crewStatus.foodAutomationEnabled,
  )

  return {
    inventory: tick.inventory,
    market: tick.market,
    energy: tick.energy,
    charging: tick.charging,
    containmentOn: tick.containmentOn,
    crewStatus: crewTransition.crewStatus,
    crewMembers: crewTransition.crewMembers,
    crewAggregateMetrics: crewTransition.crewAggregateMetrics,
    fridge: tick.fridge ?? input.fridge,
    waterAutomationEnabled: tick.waterAutomationEnabled ?? input.waterAutomationEnabled,
    galaxyBarAutomationEnabled: input.galaxyBarAutomationEnabled ?? false,
    galaxyBarsCrafted:
      (input.galaxyBarsCrafted ?? 0) + (tick.autoCraftedGalaxyBars ?? 0),
    starvationFailureLock: failureTransition.starvationFailureLock,
    stationDistance: tick.stationDistance,
    simulationSummary: tick.simulationSummary,
    simulationLog: tick.simulationLog,
    cycleTimeSeconds: input.cycleTimeSeconds + 1,
    crewFeedsDelivered: input.crewFeedsDelivered + (tick.fedCrew ? 1 : 0),
    triggerFailureReason: failureTransition.triggerFailureReason,
    persistInventory: tick.inventoryChanged,
  }
}

export function runOfflineCatchupTicks(input: OfflineCatchupTickInput): OfflineCatchupTickResult | null {
  const elapsedSeconds = Math.max(0, input.nowCycleTimeSeconds - input.startCycleTimeSeconds)
  if (elapsedSeconds <= 0) {
    return null
  }

  const nextState = {
    inventory: input.inventory,
    market: input.market,
    energy: input.energy,
    charging: input.charging,
    containmentOn: input.containmentOn,
    crewMembers: input.crewMembers,
    crewStatus: input.crewStatus,
    crewAggregateMetrics: input.crewAggregateMetrics,
    fridge: input.fridge,
    waterAutomationEnabled: input.waterAutomationEnabled,
    galaxyBarAutomationEnabled: input.galaxyBarAutomationEnabled ?? false,
    galaxyBarsCrafted: input.galaxyBarsCrafted ?? 0,
    stationDistance: input.stationDistance,
    simulationSummary: input.simulationSummary,
    simulationLog: input.simulationLog,
    cycleTimeSeconds: input.startCycleTimeSeconds,
  }

  let starvationFailureLock = input.starvationFailureLock
  let triggerFailureReason: FailureReason | null = null
  let persistInventory = false
  let fedCrewCount = 0

  for (let secondOffset = 0; secondOffset < elapsedSeconds; secondOffset += 1) {
    const simulatedNowSeconds = nextState.cycleTimeSeconds + 1
    const tick = runSimulationTick({
      inventory: nextState.inventory,
      market: nextState.market,
      energy: nextState.energy,
      maxEnergy: input.maxEnergy,
      charging: nextState.charging,
      docked: input.docked,
      useSceneDistance: input.useSceneDistance,
      stationDistanceScene: input.stationDistanceScene,
      stationDistanceManual: input.stationDistanceManual,
      containmentOn: nextState.containmentOn,
      containmentPower: input.containmentPower,
      crewHunger: nextState.crewStatus.hunger,
      crewDebuff: nextState.crewStatus.debuff,
      crewStarving: nextState.crewStatus.starving,
      foodAutomationEnabled: nextState.crewStatus.foodAutomationEnabled,
      galaxyBarAutomationEnabled: nextState.galaxyBarAutomationEnabled,
      crewMembers: nextState.crewMembers,
      fridge: nextState.fridge,
      waterAutomationEnabled: nextState.waterAutomationEnabled,
      cycleTimeSeconds: nextState.cycleTimeSeconds,
      simulationLog: nextState.simulationLog,
      now: simulatedNowSeconds * 1000,
    })

    persistInventory = persistInventory || tick.inventoryChanged

    const failureTransition = resolveStarvationFailureTransition(
      {
        starvationFailureLock,
      },
      tick,
    )
    starvationFailureLock = failureTransition.starvationFailureLock
    triggerFailureReason = triggerFailureReason ?? failureTransition.triggerFailureReason

    applyTickToState(tick, nextState)
    nextState.cycleTimeSeconds = simulatedNowSeconds

    if (tick.fedCrew) {
      fedCrewCount += 1
    }
  }

  return {
    elapsedSeconds,
    inventory: nextState.inventory,
    market: nextState.market,
    energy: nextState.energy,
    charging: nextState.charging,
    containmentOn: nextState.containmentOn,
    crewStatus: nextState.crewStatus,
    crewMembers: nextState.crewMembers,
    crewAggregateMetrics: nextState.crewAggregateMetrics,
    fridge: nextState.fridge,
    waterAutomationEnabled: nextState.waterAutomationEnabled,
    galaxyBarAutomationEnabled: nextState.galaxyBarAutomationEnabled,
    galaxyBarsCrafted: nextState.galaxyBarsCrafted,
    stationDistance: nextState.stationDistance,
    simulationSummary: nextState.simulationSummary,
    simulationLog: nextState.simulationLog,
    cycleTimeSeconds: nextState.cycleTimeSeconds,
    starvationFailureLock,
    triggerFailureReason,
    persistInventory,
    fedCrewCount,
  }
}
