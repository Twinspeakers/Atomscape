import type {
  CrewAggregateMetrics,
  CrewMemberState,
  FailureReason,
  FridgeState,
  MarketProductId,
  MarketProductState,
  ResourceInventory,
  SimulationLogEntry,
  SimulationSummary,
} from '@state/types'

export type MarketState = Record<MarketProductId, MarketProductState>

export interface StationDistanceState {
  docked: boolean
  useSceneDistance: boolean
  stationDistanceScene: number
  stationDistanceManual: number
}

export interface SimulationSummaryInput {
  stationDistance: number
  charging: boolean
  containmentOn: boolean
  containmentPower: number
}

export interface CrewSimulationState {
  crewHunger: number
  crewDebuff: number
  crewStarving: boolean
  foodAutomationEnabled: boolean
  crewMembers?: CrewMemberState[]
  fridge?: FridgeState
  waterAutomationEnabled?: boolean
  cycleTimeSeconds?: number
}

export interface SimulationTickInput extends StationDistanceState {
  inventory: ResourceInventory
  market: MarketState
  energy: number
  maxEnergy: number
  charging: boolean
  containmentOn: boolean
  containmentPower: number
  crewHunger: number
  crewDebuff: number
  crewStarving: boolean
  foodAutomationEnabled: boolean
  crewMembers?: CrewMemberState[]
  fridge?: FridgeState
  waterAutomationEnabled?: boolean
  cycleTimeSeconds?: number
  simulationLog: SimulationLogEntry[]
  now?: number
  random?: () => number
}

export interface SimulationTickMutableState
  extends StationDistanceState,
    SimulationSummaryInput,
    CrewSimulationState {
  inventory: ResourceInventory
  market: MarketState
  energy: number
  maxEnergy: number
}

export interface SimulationTickResult {
  inventory: ResourceInventory
  market: MarketState
  energy: number
  charging: boolean
  containmentOn: boolean
  stationDistance: number
  simulationSummary: SimulationSummary
  simulationLog: SimulationLogEntry[]
  inventoryChanged: boolean
  crewHunger: number
  crewDebuff: number
  crewStarving: boolean
  crewMembers?: CrewMemberState[]
  fridge?: FridgeState
  waterAutomationEnabled?: boolean
  crewMetrics?: CrewAggregateMetrics
  fedCrew: boolean
  autoCraftedFood: boolean
  crewCriticalFailure: FailureReason | null
}
