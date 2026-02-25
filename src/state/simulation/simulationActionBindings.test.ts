import { PROCESS_CATALOG } from '@domain/spec/processCatalog'
import { createMarketState } from '@features/simulation/engine'
import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import type { ResourceInventory, SimulationSummary } from '@state/types'
import { describe, expect, it, vi } from 'vitest'
import {
  buildSimulationActionBindings,
  type SimulationActionState,
} from './simulationActionBindings'

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
    waterIce: 1,
    water: 0,
  }
}

function createState(): SimulationActionState {
  return {
    inventory: createInventory(),
    atomCounter: computeAtomTotals(createInventory()),
    energy: 100,
    maxEnergy: 500,
    stationDistance: 0,
    charging: false,
    containmentOn: false,
    containmentPower: 60,
    simulationSummary: createSimulationSummary(),
    simulationLog: [],
    market: createMarketState(),
    docked: true,
    useSceneDistance: true,
    stationDistanceScene: 0,
    stationDistanceManual: 0,
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
    fridge: {
      unlocked: false,
      galaxyBars: 0,
      capacity: 40,
    },
    waterAutomationEnabled: true,
    galaxyBarAutomationEnabled: false,
    galaxyBarsCrafted: 0,
    cycleTimeSeconds: 1000,
    starvationFailureLock: false,
    crewFeedsDelivered: 0,
  }
}

describe('simulationActionBindings', () => {
  it('runs process transitions and persists inventory for successful transitions', () => {
    let state = createState()
    const persistInventorySnapshotSafely = vi.fn()
    const updateTutorialProgress = vi.fn()
    const handleFailure = vi.fn()
    const applyProcessRunTransition = vi.fn(() => ({
      kind: 'success' as const,
      inventory: {
        ...state.inventory,
        waterIce: 0,
        water: 1,
      },
      energy: 99,
      simulationSummary: createSimulationSummary(),
      simulationLog: [{ id: 1, message: 'ok', timestamp: 1 }],
      persistInventory: true,
    }))
    const runLiveSimulationTick = vi.fn()

    const bindings = buildSimulationActionBindings(
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
        handleFailure,
      },
      {
        applyProcessRunTransition: applyProcessRunTransition as unknown as typeof applyProcessRunTransition,
        runLiveSimulationTick: runLiveSimulationTick as unknown as typeof runLiveSimulationTick,
      },
    )

    bindings.runProcess(PROCESS_CATALOG.iceMelter)

    expect(applyProcessRunTransition).toHaveBeenCalledOnce()
    expect(state.inventory.water).toBe(1)
    expect(state.energy).toBe(99)
    expect(persistInventorySnapshotSafely).toHaveBeenCalledWith(state.inventory)
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
    expect(handleFailure).not.toHaveBeenCalled()
  })

  it('runs tick transitions and delegates failure handling when required', () => {
    let state = createState()
    const persistInventorySnapshotSafely = vi.fn()
    const updateTutorialProgress = vi.fn()
    const handleFailure = vi.fn()
    const runLiveSimulationTick = vi.fn(() => ({
      inventory: {
        ...state.inventory,
      },
      market: state.market,
      energy: 88,
      charging: false,
      containmentOn: false,
      crewStatus: state.crewStatus,
      crewMembers: state.crewMembers,
      crewAggregateMetrics: state.crewAggregateMetrics,
      fridge: state.fridge,
      waterAutomationEnabled: state.waterAutomationEnabled,
      galaxyBarAutomationEnabled: state.galaxyBarAutomationEnabled,
      galaxyBarsCrafted: state.galaxyBarsCrafted,
      starvationFailureLock: true,
      stationDistance: state.stationDistance,
      simulationSummary: state.simulationSummary,
      simulationLog: state.simulationLog,
      cycleTimeSeconds: state.cycleTimeSeconds + 1,
      crewFeedsDelivered: state.crewFeedsDelivered,
      triggerFailureReason: 'starvation' as const,
      persistInventory: true,
    }))
    const applyProcessRunTransition = vi.fn()

    const bindings = buildSimulationActionBindings(
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
        handleFailure,
      },
      {
        applyProcessRunTransition: applyProcessRunTransition as unknown as typeof applyProcessRunTransition,
        runLiveSimulationTick: runLiveSimulationTick as unknown as typeof runLiveSimulationTick,
      },
    )

    bindings.tickSimulation()

    expect(runLiveSimulationTick).toHaveBeenCalledOnce()
    expect(state.energy).toBe(88)
    expect(state.cycleTimeSeconds).toBe(1001)
    expect(persistInventorySnapshotSafely).toHaveBeenCalledWith(state.inventory)
    expect(handleFailure).toHaveBeenCalledWith('starvation')
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })
})
