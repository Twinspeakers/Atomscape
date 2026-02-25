import {
  CREW_MEMBER_GALAXY_BAR_HUNGER_RESTORE,
  CREW_STARVING_THRESHOLD,
  ENERGY_CELL_DISCHARGE_ENERGY,
  FRIDGE_DEFAULT_WATER_CAPACITY_LITERS,
} from '@domain/spec/gameSpec'
import {
  batteryUpgradeCostEntries,
  deriveBatteryUpgradePlan,
} from '@domain/spec/batteryUpgrade'
import { buildSimulationSummary } from '@features/simulation/engine'
import {
  deriveCrewAggregateMetrics,
  deriveCrewStatusFromMembers,
} from '@state/runtime/snapshotSanitizers'
import { clamp, roundQty } from '@state/utils/numberUtils'
import { formatQty, resourceById } from '@domain/resources/resourceCatalog'
import type {
  CrewAggregateMetrics,
  CrewMemberState,
  CrewStatus,
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

export interface UseEnergyCellTransitionState {
  inventory: ResourceInventory
  energy: number
  maxEnergy: number
  stationDistance: number
  charging: boolean
  containmentOn: boolean
  containmentPower: number
  simulationLog: SimulationLogEntry[]
}

export type UseEnergyCellTransitionResult =
  | {
      kind: 'noop'
    }
  | {
      kind: 'success'
      inventory: ResourceInventory
      energy: number
      simulationSummary: SimulationSummary
      simulationLog: SimulationLogEntry[]
      restoredEnergy: number
      persistInventory: true
    }

export function applyUseEnergyCellTransition(
  state: UseEnergyCellTransitionState,
  appendLog: AppendLog,
): UseEnergyCellTransitionResult {
  const availableCells = state.inventory.energyCell ?? 0
  if (availableCells < 1) {
    return {
      kind: 'noop',
    }
  }

  const energyDeficit = Math.max(0, state.maxEnergy - state.energy)
  if (energyDeficit <= 0.0001) {
    return {
      kind: 'noop',
    }
  }

  const restoredEnergy = roundQty(Math.min(ENERGY_CELL_DISCHARGE_ENERGY, energyDeficit))
  if (restoredEnergy <= 0) {
    return {
      kind: 'noop',
    }
  }

  const nextInventory = {
    ...state.inventory,
    energyCell: roundQty(Math.max(0, availableCells - 1)),
  }

  return {
    kind: 'success',
    inventory: nextInventory,
    energy: roundQty(clamp(state.energy + restoredEnergy, 0, state.maxEnergy)),
    simulationSummary: buildSimulationSummary({
      stationDistance: state.stationDistance,
      charging: state.charging,
      containmentOn: state.containmentOn,
      containmentPower: state.containmentPower,
    }),
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: `Energy cell discharged: +${restoredEnergy.toFixed(1)} energy.`,
    }),
    restoredEnergy,
    persistInventory: true,
  }
}

export interface UpgradeBatteryCapacityTransitionState {
  inventory: ResourceInventory
  energy: number
  maxEnergy: number
  simulationLog: SimulationLogEntry[]
}

export type UpgradeBatteryCapacityTransitionResult =
  | {
      kind: 'log-only'
      simulationLog: SimulationLogEntry[]
      persistInventory: false
    }
  | {
      kind: 'success'
      inventory: ResourceInventory
      energy: number
      maxEnergy: number
      simulationLog: SimulationLogEntry[]
      persistInventory: true
      gainedCapacity: number
    }

function batteryUpgradeCostText(maxEnergy: number): string {
  const plan = deriveBatteryUpgradePlan(maxEnergy)
  return batteryUpgradeCostEntries(plan.cost)
    .map(([resourceId, amount]) => `${formatQty(amount)} ${resourceById[resourceId].label}`)
    .join(', ')
}

export function applyUpgradeBatteryCapacityTransition(
  state: UpgradeBatteryCapacityTransitionState,
  appendLog: AppendLog,
): UpgradeBatteryCapacityTransitionResult {
  const plan = deriveBatteryUpgradePlan(state.maxEnergy)
  if (plan.atCap || plan.gain <= 0) {
    return {
      kind: 'log-only',
      simulationLog: appendLog({
        logs: state.simulationLog,
        message: `Battery upgrade blocked: capacity is already maxed at ${formatQty(plan.currentMaxEnergy)} energy.`,
      }),
      persistInventory: false,
    }
  }

  const costEntries = batteryUpgradeCostEntries(plan.cost)
  const missing = costEntries.filter(
    ([resourceId, required]) => (state.inventory[resourceId] ?? 0) + 0.0001 < required,
  )

  if (missing.length > 0) {
    const missingText = missing
      .map(([resourceId, required]) => {
        const available = state.inventory[resourceId] ?? 0
        return `${resourceById[resourceId].label} ${formatQty(available)}/${formatQty(required)}`
      })
      .join(', ')

    return {
      kind: 'log-only',
      simulationLog: appendLog({
        logs: state.simulationLog,
        message: `Battery upgrade blocked: missing ${missingText}.`,
      }),
      persistInventory: false,
    }
  }

  const nextInventory = {
    ...state.inventory,
  }
  costEntries.forEach(([resourceId, required]) => {
    const available = state.inventory[resourceId] ?? 0
    nextInventory[resourceId] = roundQty(Math.max(0, available - required))
  })

  const nextMaxEnergy = roundQty(plan.nextMaxEnergy)
  const gainedCapacity = roundQty(Math.max(0, nextMaxEnergy - state.maxEnergy))

  return {
    kind: 'success',
    inventory: nextInventory,
    energy: roundQty(clamp(state.energy, 0, nextMaxEnergy)),
    maxEnergy: nextMaxEnergy,
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: `Battery upgraded: +${formatQty(gainedCapacity)} max energy (${formatQty(state.maxEnergy)} -> ${formatQty(nextMaxEnergy)}). Materials consumed: ${batteryUpgradeCostText(state.maxEnergy)}.`,
    }),
    persistInventory: true,
    gainedCapacity,
  }
}

export interface FeedCrewTransitionState {
  inventory: ResourceInventory
  fridge: FridgeState
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  crewFeedsDelivered: number
  starvationFailureLock: boolean
  simulationLog: SimulationLogEntry[]
}

export type FeedCrewTransitionResult =
  | {
      kind: 'log-only'
      simulationLog: SimulationLogEntry[]
      persistInventory: false
    }
  | {
      kind: 'success'
      inventory: ResourceInventory
      fridge: FridgeState
      crewStatus: CrewStatus
      crewMembers: CrewMemberState[]
      crewAggregateMetrics: CrewAggregateMetrics
      crewFeedsDelivered: number
      starvationFailureLock: boolean
      simulationLog: SimulationLogEntry[]
      persistInventory: boolean
    }

export function applyFeedCrewGalaxyBarTransition(
  state: FeedCrewTransitionState,
  appendLog: AppendLog,
): FeedCrewTransitionResult {
  const availableCargoBars = state.inventory.galaxyBar ?? 0
  const availableFridgeBars = state.fridge.unlocked ? state.fridge.galaxyBars : 0
  if (availableCargoBars < 1 && availableFridgeBars < 1) {
    return {
      kind: 'log-only',
      simulationLog: appendLog({
        logs: state.simulationLog,
        message: 'Crew feeding blocked: no Galaxy Bars in cargo or fridge.',
      }),
      persistInventory: false,
    }
  }

  if (state.crewMembers.length === 0) {
    return {
      kind: 'log-only',
      simulationLog: appendLog({
        logs: state.simulationLog,
        message: 'Crew feeding blocked: no crew members available.',
      }),
      persistInventory: false,
    }
  }

  const consumedFromFridge = availableFridgeBars >= 1
  const inventory = consumedFromFridge
    ? state.inventory
    : {
        ...state.inventory,
        galaxyBar: roundQty(availableCargoBars - 1),
      }
  const nextFridge = consumedFromFridge
    ? {
        ...state.fridge,
        galaxyBars: roundQty(
          clamp(
            availableFridgeBars - 1,
            0,
            Math.max(1, state.fridge.capacity),
          ),
        ),
      }
    : state.fridge
  const targetIndex = state.crewMembers.reduce(
    (lowestIndex, member, index, members) =>
      member.hunger < members[lowestIndex].hunger ? index : lowestIndex,
    0,
  )
  const targetCrewMember = state.crewMembers[targetIndex]
  const hungerBefore = targetCrewMember.hunger
  const firstBoostApplies = !targetCrewMember.firstGalaxyBarBoostApplied
  const hungerAfter = firstBoostApplies
    ? 100
    : clamp(hungerBefore + CREW_MEMBER_GALAXY_BAR_HUNGER_RESTORE, 0, 100)
  const hungerGain = hungerAfter - hungerBefore
  const nextCrewMembers = state.crewMembers.map((member, index) =>
    index === targetIndex
      ? {
          ...member,
          hunger: hungerAfter,
          starving: hungerAfter <= CREW_STARVING_THRESHOLD,
          firstGalaxyBarBoostApplied: true,
        }
      : member,
  )
  const nextCrewStatus = deriveCrewStatusFromMembers(
    nextCrewMembers,
    state.crewStatus.foodAutomationEnabled,
  )
  const nextCrewAggregateMetrics = deriveCrewAggregateMetrics(nextCrewMembers)

  return {
    kind: 'success',
    inventory,
    fridge: nextFridge,
    crewStatus: nextCrewStatus,
    crewMembers: nextCrewMembers,
    crewAggregateMetrics: nextCrewAggregateMetrics,
    crewFeedsDelivered: state.crewFeedsDelivered + 1,
    starvationFailureLock: nextCrewStatus.starving ? state.starvationFailureLock : false,
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: `Crew fed manually: ${targetCrewMember.name} consumed 1 Galaxy Bar from ${consumedFromFridge ? 'fridge' : 'cargo'} (+${hungerGain.toFixed(1)} hunger${firstBoostApplies ? ', first meal boosted to 100%' : ''}).`,
    }),
    persistInventory: !consumedFromFridge,
  }
}

export interface LoadFridgeTransitionState {
  inventory: ResourceInventory
  fridge: FridgeState
  simulationLog: SimulationLogEntry[]
}

export type LoadFridgeTransitionResult =
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
      fridge: FridgeState
      simulationLog: SimulationLogEntry[]
      persistInventory: true
    }

export function applyLoadFridgeWaterTransition(
  state: LoadFridgeTransitionState,
  liters: number,
  appendLog: AppendLog,
): LoadFridgeTransitionResult {
  if (!state.fridge.unlocked) {
    return {
      kind: 'log-only',
      simulationLog: appendLog({
        logs: state.simulationLog,
        message: 'Fridge load blocked: fridge is locked.',
      }),
      persistInventory: false,
    }
  }

  const requestedLiters = roundQty(Math.max(0, Number.isFinite(liters) ? liters : 0))
  if (requestedLiters <= 0) {
    return {
      kind: 'noop',
      persistInventory: false,
    }
  }

  const availableCargoWater = state.inventory.water ?? 0
  const waterCapacityLiters = roundQty(
    Math.max(1, state.fridge.waterCapacityLiters ?? FRIDGE_DEFAULT_WATER_CAPACITY_LITERS),
  )
  const currentFridgeWater = roundQty(
    clamp(state.fridge.waterLiters ?? 0, 0, waterCapacityLiters),
  )
  const remainingCapacity = roundQty(Math.max(0, waterCapacityLiters - currentFridgeWater))
  const transferLiters = roundQty(
    Math.min(requestedLiters, availableCargoWater, remainingCapacity),
  )

  if (transferLiters <= 0) {
    const blockedReason = remainingCapacity <= 0
      ? 'Fridge load blocked: fridge water tank is full.'
      : 'Fridge load blocked: not enough water in cargo.'

    return {
      kind: 'log-only',
      simulationLog: appendLog({
        logs: state.simulationLog,
        message: blockedReason,
      }),
      persistInventory: false,
    }
  }

  const nextInventory = {
    ...state.inventory,
    water: roundQty(Math.max(0, availableCargoWater - transferLiters)),
  }

  return {
    kind: 'success',
    inventory: nextInventory,
    fridge: {
      ...state.fridge,
      waterLiters: roundQty(currentFridgeWater + transferLiters),
      waterCapacityLiters,
    },
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: `Fridge loaded: moved ${transferLiters.toFixed(2)} L water from cargo to fridge.`,
    }),
    persistInventory: true,
  }
}

export function applyLoadFridgeGalaxyBarsTransition(
  state: LoadFridgeTransitionState,
  quantity: number,
  appendLog: AppendLog,
): LoadFridgeTransitionResult {
  if (!state.fridge.unlocked) {
    return {
      kind: 'log-only',
      simulationLog: appendLog({
        logs: state.simulationLog,
        message: 'Fridge load blocked: fridge is locked.',
      }),
      persistInventory: false,
    }
  }

  const requestedBars = Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0))
  if (requestedBars <= 0) {
    return {
      kind: 'noop',
      persistInventory: false,
    }
  }

  const availableCargoBars = state.inventory.galaxyBar ?? 0
  const barCapacity = Math.max(1, state.fridge.capacity)
  const currentFridgeBars = roundQty(clamp(state.fridge.galaxyBars, 0, barCapacity))
  const remainingCapacity = roundQty(Math.max(0, barCapacity - currentFridgeBars))
  const transferBars = roundQty(
    Math.min(requestedBars, availableCargoBars, remainingCapacity),
  )

  if (transferBars <= 0) {
    const blockedReason = remainingCapacity <= 0
      ? 'Fridge load blocked: fridge bar storage is full.'
      : 'Fridge load blocked: no Galaxy Bars in cargo.'

    return {
      kind: 'log-only',
      simulationLog: appendLog({
        logs: state.simulationLog,
        message: blockedReason,
      }),
      persistInventory: false,
    }
  }

  const nextInventory = {
    ...state.inventory,
    galaxyBar: roundQty(Math.max(0, availableCargoBars - transferBars)),
  }

  return {
    kind: 'success',
    inventory: nextInventory,
    fridge: {
      ...state.fridge,
      galaxyBars: roundQty(currentFridgeBars + transferBars),
    },
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: `Fridge loaded: moved ${formatQty(transferBars)} Galaxy Bars from cargo to fridge.`,
    }),
    persistInventory: true,
  }
}
