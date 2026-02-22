import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import { createMarketState } from '@features/simulation/engine'
import type {
  FailureReportEntry,
  ResourceInventory,
  SimulationSummary,
} from '@state/types'
import { describe, expect, it, vi } from 'vitest'
import {
  buildResourceActionBindings,
  type ResourceActionState,
} from './resourceActionBindings'

function createSimulationSummary(): SimulationSummary {
  return {
    chargingRate: 0,
    containmentDrain: 0,
    recombinationRate: 0,
    inRange: true,
    netEnergyPerSecond: 0,
  }
}

function createInventory(): ResourceInventory {
  return {
    energyCell: 1,
    water: 4,
    galaxyBar: 3,
    steel: 1,
    silicaSand: 1,
    carbon: 1,
  }
}

function createFailureReport(id: number): FailureReportEntry {
  return {
    id,
    timestamp: id,
    reason: 'combat',
    reasonLabel: 'combat hull breach',
    creditsPenalty: 5,
    energyPenalty: 5,
    materials: [],
    hadMaterialShortage: false,
    resetToStart: true,
    repairCount: id,
  }
}

function createState(overrides: Partial<ResourceActionState> = {}): ResourceActionState {
  const inventory = createInventory()

  return {
    inventory,
    atomCounter: computeAtomTotals(inventory),
    fridge: {
      unlocked: true,
      galaxyBars: 0,
      capacity: 40,
      waterLiters: 0,
      waterCapacityLiters: 40,
    },
    crewStatus: {
      hunger: 100,
      debuff: 0,
      starving: false,
      foodAutomationEnabled: true,
    },
    crewMembers: [],
    crewAggregateMetrics: {
      awakeCount: 0,
      averageHunger: 0,
      averageThirst: 0,
      averageDebuff: 0,
      starvingCount: 0,
      dehydratedCount: 0,
    },
    crewFeedsDelivered: 0,
    starvationFailureLock: false,
    simulationLog: [],
    energy: 75,
    maxEnergy: 200,
    stationDistance: 0,
    charging: false,
    containmentOn: false,
    containmentPower: 60,
    credits: 20,
    shipRespawnSignal: 0,
    failureCount: 0,
    failureReports: [],
    simulationSummary: createSimulationSummary(),
    market: createMarketState(),
    ...overrides,
  }
}

describe('resourceActionBindings', () => {
  it('uses energy cells and persists inventory only on success', () => {
    let state = createState()
    const persistInventorySnapshotSafely = vi.fn()
    const updateTutorialProgress = vi.fn()
    const applyUseEnergyCellTransition = vi.fn(() => ({
      kind: 'success' as const,
      inventory: {
        ...state.inventory,
        energyCell: 0,
      },
      energy: 100,
      simulationSummary: state.simulationSummary,
      simulationLog: [{ id: 1, message: 'discharged', timestamp: 1 }],
      restoredEnergy: 25,
      persistInventory: true as const,
    }))

    const bindings = buildResourceActionBindings(
      {
        setState: (updater) => {
          state = { ...state, ...updater(state) }
        },
        getState: () => state,
        appendLog: ({ logs, message }) => [
          { id: logs.length + 1, message, timestamp: logs.length + 1 },
          ...logs,
        ],
        persistInventorySnapshotSafely,
        updateTutorialProgress,
        failureReportLimit: 5,
      },
      {
        applyUseEnergyCellTransition:
          applyUseEnergyCellTransition as unknown as typeof applyUseEnergyCellTransition,
      },
    )

    const used = bindings.useEnergyCell()

    expect(used).toBe(true)
    expect(state.inventory.energyCell).toBe(0)
    expect(state.energy).toBe(100)
    expect(persistInventorySnapshotSafely).toHaveBeenCalledWith(state.inventory)
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })

  it('updates tutorial progress for non-persist fridge load outcomes', () => {
    let state = createState()
    const persistInventorySnapshotSafely = vi.fn()
    const updateTutorialProgress = vi.fn()
    const applyLoadFridgeWaterTransition = vi.fn(() => ({
      kind: 'log-only' as const,
      simulationLog: [{ id: 1, message: 'blocked', timestamp: 1 }],
      persistInventory: false as const,
    }))

    const bindings = buildResourceActionBindings(
      {
        setState: (updater) => {
          state = { ...state, ...updater(state) }
        },
        getState: () => state,
        appendLog: ({ logs, message }) => [
          { id: logs.length + 1, message, timestamp: logs.length + 1 },
          ...logs,
        ],
        persistInventorySnapshotSafely,
        updateTutorialProgress,
        failureReportLimit: 5,
      },
      {
        applyLoadFridgeWaterTransition:
          applyLoadFridgeWaterTransition as unknown as typeof applyLoadFridgeWaterTransition,
      },
    )

    bindings.loadFridgeWater(2)

    expect(state.simulationLog[0]?.message).toBe('blocked')
    expect(persistInventorySnapshotSafely).not.toHaveBeenCalled()
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })

  it('records failure reports with limit and persists when transition requests it', () => {
    let state = createState({
      failureReports: [createFailureReport(2), createFailureReport(1)],
    })
    const persistInventorySnapshotSafely = vi.fn()
    const updateTutorialProgress = vi.fn()
    const applyFailureTransition = vi.fn(() => ({
      inventory: state.inventory,
      credits: 10,
      energy: 20,
      charging: false as const,
      containmentOn: false as const,
      crewStatus: state.crewStatus,
      crewMembers: state.crewMembers,
      crewAggregateMetrics: state.crewAggregateMetrics,
      shipRespawnSignal: 1,
      failureCount: 1,
      failureReport: createFailureReport(3),
      starvationFailureLock: true,
      simulationSummary: state.simulationSummary,
      simulationLog: [{ id: 3, message: 'failure', timestamp: 3 }],
      persistInventory: true,
    }))

    const bindings = buildResourceActionBindings(
      {
        setState: (updater) => {
          state = { ...state, ...updater(state) }
        },
        getState: () => state,
        appendLog: ({ logs, message }) => [
          { id: logs.length + 1, message, timestamp: logs.length + 1 },
          ...logs,
        ],
        persistInventorySnapshotSafely,
        updateTutorialProgress,
        failureReportLimit: 2,
      },
      {
        applyFailureTransition: applyFailureTransition as unknown as typeof applyFailureTransition,
      },
    )

    bindings.handleFailure('combat')

    expect(state.failureReports).toHaveLength(2)
    expect(state.failureReports[0]?.id).toBe(3)
    expect(state.failureReports[1]?.id).toBe(2)
    expect(persistInventorySnapshotSafely).toHaveBeenCalledWith(state.inventory)
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })
})
