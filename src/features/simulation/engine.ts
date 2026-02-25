import { CHARGING_RANGE_METERS, SIMULATION_LOG_LIMIT } from '@domain/spec/gameSpec'
import type { SimulationLogEntry, SimulationSummary } from '@state/types'
import { applyContainmentDrain, containmentDrainRate } from './systems/containment'
import { applyCrewSurvivalTick } from './systems/crew'
import {
  attemptMiningLaserFire,
  miningLaserEnergyCost,
  resolveExtractionHit,
} from './systems/extraction'
import {
  computeMarketPrice,
  createMarketState,
  executeMarketSale,
  tickMarketState,
} from './systems/market'
import { executeProcess } from './systems/process'
import { applyPlasmaRecombination, recombinationRate } from './systems/recombination'
import {
  applyDockingOverride,
  applyStationCharging,
  resolveStationDistance,
  stationChargeRate,
} from './systems/station'
import type {
  MarketState,
  SimulationSummaryInput,
  SimulationTickInput,
  SimulationTickMutableState,
  SimulationTickResult,
} from './types'

function appendSimulationLog(
  logs: SimulationLogEntry[],
  message: string,
  timestamp: number,
  id: number,
): SimulationLogEntry[] {
  return [{ id, message, timestamp }, ...logs].slice(0, SIMULATION_LOG_LIMIT)
}

export function buildSimulationSummary(input: SimulationSummaryInput): SimulationSummary {
  const inRange = input.stationDistance <= CHARGING_RANGE_METERS
  const chargingRate = input.charging && inRange ? stationChargeRate(input.stationDistance) : 0
  const containmentDrain = input.containmentOn
    ? containmentDrainRate(input.containmentPower)
    : 0
  const recombination = recombinationRate(input.containmentOn, input.containmentPower)

  return {
    chargingRate,
    containmentDrain,
    recombinationRate: recombination,
    inRange,
    netEnergyPerSecond: chargingRate - containmentDrain,
  }
}

export function runSimulationTick(input: SimulationTickInput): SimulationTickResult {
  const now = input.now ?? Date.now()

  const mutable: SimulationTickMutableState = {
    inventory: { ...input.inventory },
    market: tickMarketState(input.market, input.random ?? Math.random),
    energy: input.energy,
    maxEnergy: input.maxEnergy,
    charging: input.charging,
    docked: input.docked,
    useSceneDistance: input.useSceneDistance,
    stationDistanceScene: input.stationDistanceScene,
    stationDistanceManual: input.stationDistanceManual,
    stationDistance: resolveStationDistance(input),
    containmentOn: input.containmentOn,
    containmentPower: input.containmentPower,
    crewHunger: input.crewHunger,
    crewDebuff: input.crewDebuff,
    crewStarving: input.crewStarving,
    foodAutomationEnabled: input.foodAutomationEnabled,
    galaxyBarAutomationEnabled: input.galaxyBarAutomationEnabled ?? false,
    crewMembers: input.crewMembers ? input.crewMembers.map((member) => ({ ...member })) : undefined,
    fridge: input.fridge ? { ...input.fridge } : undefined,
    waterAutomationEnabled: input.waterAutomationEnabled,
    cycleTimeSeconds:
      Number.isFinite(input.cycleTimeSeconds ?? NaN)
        ? (input.cycleTimeSeconds as number)
        : now / 1000,
  }

  let logs = input.simulationLog
  let logIndex = 0
  const pushLog = (message: string): void => {
    logs = appendSimulationLog(logs, message, now, now * 1000 + logIndex)
    logIndex += 1
  }

  applyStationCharging(mutable, pushLog)
  applyContainmentDrain(mutable, pushLog)
  const recombinationChanged = applyPlasmaRecombination(mutable)
  applyDockingOverride(mutable)
  const crewTick = applyCrewSurvivalTick(mutable, pushLog)
  const inventoryChanged = recombinationChanged || crewTick.inventoryChanged

  return {
    inventory: mutable.inventory,
    market: mutable.market,
    energy: mutable.energy,
    charging: mutable.charging,
    containmentOn: mutable.containmentOn,
    stationDistance: mutable.stationDistance,
    simulationSummary: buildSimulationSummary({
      stationDistance: mutable.stationDistance,
      charging: mutable.charging,
      containmentOn: mutable.containmentOn,
      containmentPower: mutable.containmentPower,
    }),
    simulationLog: logs,
    inventoryChanged,
    crewHunger: mutable.crewHunger,
    crewDebuff: mutable.crewDebuff,
    crewStarving: mutable.crewStarving,
    crewMembers: crewTick.crewMembers ?? mutable.crewMembers,
    fridge: mutable.fridge,
    waterAutomationEnabled: mutable.waterAutomationEnabled,
    galaxyBarAutomationEnabled: mutable.galaxyBarAutomationEnabled,
    crewMetrics: crewTick.crewMetrics,
    fedCrew: crewTick.fedCrew,
    autoCraftedFood: crewTick.autoCraftedFood,
    autoCraftedGalaxyBars: crewTick.autoCraftedGalaxyBars,
    crewCriticalFailure: crewTick.criticalFailure,
  }
}

export {
  attemptMiningLaserFire,
  computeMarketPrice,
  createMarketState,
  executeMarketSale,
  miningLaserEnergyCost,
  executeProcess,
  resolveExtractionHit,
  resolveStationDistance,
  type MarketState,
}

export type { ExtractionEvent, ExtractionTargetSnapshot } from './systems/extraction'
