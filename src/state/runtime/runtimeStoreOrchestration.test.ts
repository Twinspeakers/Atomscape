import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import type { MarketState } from '@features/simulation/engine'
import { createTutorialCompletion } from '@state/quests/tutorialProgression'
import type {
  CrewAggregateMetrics,
  CrewStatus,
  FailureReason,
  FridgeState,
  ResourceInventory,
  SimulationSummary,
} from '@state/types'
import { describe, expect, it, vi } from 'vitest'
import {
  buildRuntimeStoreOrchestration,
  type RuntimeStoreOrchestrationState,
} from './runtimeStoreOrchestration'

function createInventory(overrides: Partial<ResourceInventory> = {}): ResourceInventory {
  return {
    waterIce: 0,
    water: 0,
    ...overrides,
  }
}

function createCrewStatus(overrides: Partial<CrewStatus> = {}): CrewStatus {
  return {
    hunger: 0,
    debuff: 0,
    starving: false,
    foodAutomationEnabled: false,
    ...overrides,
  }
}

function createCrewAggregateMetrics(
  overrides: Partial<CrewAggregateMetrics> = {},
): CrewAggregateMetrics {
  return {
    awakeCount: 0,
    averageHunger: 0,
    averageThirst: 0,
    averageDebuff: 0,
    starvingCount: 0,
    dehydratedCount: 0,
    ...overrides,
  }
}

function createFridge(overrides: Partial<FridgeState> = {}): FridgeState {
  return {
    unlocked: false,
    galaxyBars: 0,
    capacity: 40,
    ...overrides,
  }
}

function createSimulationSummary(
  overrides: Partial<SimulationSummary> = {},
): SimulationSummary {
  return {
    chargingRate: 0,
    containmentDrain: 0,
    recombinationRate: 0,
    inRange: true,
    netEnergyPerSecond: 0,
    ...overrides,
  }
}

function createState(
  overrides: Partial<RuntimeStoreOrchestrationState> = {},
): RuntimeStoreOrchestrationState {
  const inventory = createInventory()
  const tutorialCompletion = createTutorialCompletion()

  return {
    inventory,
    inventoryLoaded: true,
    atomCounter: computeAtomTotals(inventory),
    tutorialCompletion,
    tutorialChecklist: [],
    tutorialCurrentStepIndex: 0,
    tutorialComplete: false,
    labActiveTab: 'sorting',
    extractionEvents: [],
    worldClassDestroyedCounts: {},
    visitedCleanupZones: [],
    worldVisitedZoneIds: [],
    fridge: createFridge(),
    simulationLog: [],
    claimedQuestRewardIds: [],
    questRewardNotifications: [],
    questRewardHistory: [],
    pinnedQuestIds: [],
    tutorialEnabled: true,
    activeMainQuestId: null,
    credits: 0,
    cycleTimeSeconds: 0,
    market: {} as MarketState,
    energy: 0,
    maxEnergy: 100,
    charging: false,
    docked: false,
    useSceneDistance: true,
    stationDistanceScene: 0,
    stationDistanceManual: 0,
    containmentOn: false,
    containmentPower: 0,
    crewMembers: [],
    crewStatus: createCrewStatus(),
    crewAggregateMetrics: createCrewAggregateMetrics(),
    waterAutomationEnabled: false,
    galaxyBarAutomationEnabled: false,
    galaxyBarsCrafted: 0,
    stationDistance: 0,
    simulationSummary: createSimulationSummary(),
    starvationFailureLock: false,
    crewFeedsDelivered: 0,
    leftPanels: ['tutorial'],
    rightPanels: ['hud'],
    hiddenPanels: [],
    panelSlotHints: {},
    uiDensity: 'comfortable',
    panelOpacity: 0.88,
    ...overrides,
  }
}

describe('runtimeStoreOrchestration', () => {
  it('persists UI preferences from current state and honors skip guard', () => {
    let state = createState()
    let shouldSkipPersistence = true
    const persistUiPreferences = vi.fn()

    const orchestration = buildRuntimeStoreOrchestration(
      {
        setState: (updater) => {
          state = { ...state, ...updater(state) }
        },
        setPatch: (patch) => {
          state = { ...state, ...patch }
        },
        getState: () => state,
        appendLog: ({ logs }) => logs,
        persistInventorySnapshotSafely: vi.fn(),
        handleFailure: vi.fn(),
        shouldSkipPersistence: () => shouldSkipPersistence,
        questRewardHistoryLimit: 32,
      },
      {
        persistUiPreferences,
      },
    )

    orchestration.persistUiPreferencesFromState()
    expect(persistUiPreferences).not.toHaveBeenCalled()

    shouldSkipPersistence = false
    orchestration.persistUiPreferencesFromState()
    expect(persistUiPreferences).toHaveBeenCalledWith({
      leftPanels: ['tutorial'],
      rightPanels: ['hud'],
      hiddenPanels: [],
      panelSlotHints: {},
      pinnedQuestIds: [],
      activeMainQuestId: null,
      uiDensity: 'comfortable',
      panelOpacity: 0.88,
    })
  })

  it('applies offline catchup patch once and triggers side effects', () => {
    let state = createState()
    const setPatch = vi.fn((patch: Partial<RuntimeStoreOrchestrationState>) => {
      state = { ...state, ...patch }
    })
    const persistInventorySnapshotSafely = vi.fn()
    const handleFailure = vi.fn()
    const catchupInventory = createInventory({ water: 4 })
    const resolveOfflineCatchupHydration = vi
      .fn()
      .mockReturnValueOnce({
        nextApplied: true,
        kind: 'applied',
        patch: {
          inventory: catchupInventory,
          atomCounter: computeAtomTotals(catchupInventory),
          energy: 5,
          charging: false,
          containmentOn: false,
          market: state.market,
          crewStatus: state.crewStatus,
          crewMembers: state.crewMembers,
          crewAggregateMetrics: state.crewAggregateMetrics,
          fridge: state.fridge,
          waterAutomationEnabled: false,
          galaxyBarAutomationEnabled: false,
          galaxyBarsCrafted: 3,
          starvationFailureLock: false,
          stationDistance: 1,
          simulationSummary: state.simulationSummary,
          simulationLog: state.simulationLog,
          cycleTimeSeconds: 10,
          crewFeedsDelivered: 2,
        },
        persistInventory: true,
        inventoryToPersist: catchupInventory,
        triggerFailureReason: 'starvation' as FailureReason,
      })
      .mockReturnValueOnce({
        nextApplied: true,
        kind: 'skip',
        persistInventory: false,
        triggerFailureReason: null,
      })

    const orchestration = buildRuntimeStoreOrchestration(
      {
        setState: (updater) => {
          state = { ...state, ...updater(state) }
        },
        setPatch,
        getState: () => state,
        appendLog: ({ logs }) => logs,
        persistInventorySnapshotSafely,
        handleFailure,
        shouldSkipPersistence: () => false,
        questRewardHistoryLimit: 32,
      },
      {
        resolveOfflineCatchupHydration:
          resolveOfflineCatchupHydration as unknown as typeof resolveOfflineCatchupHydration,
      },
    )

    orchestration.applyOfflineCatchupFromHydratedState()
    orchestration.applyOfflineCatchupFromHydratedState()

    expect(resolveOfflineCatchupHydration).toHaveBeenCalledTimes(2)
    expect(resolveOfflineCatchupHydration.mock.calls[0]?.[0]?.alreadyApplied).toBe(false)
    expect(resolveOfflineCatchupHydration.mock.calls[1]?.[0]?.alreadyApplied).toBe(true)
    expect(setPatch).toHaveBeenCalledTimes(1)
    expect(state.inventory.water).toBe(4)
    expect(persistInventorySnapshotSafely).toHaveBeenCalledWith(catchupInventory)
    expect(handleFailure).toHaveBeenCalledWith('starvation')
  })

  it('updates tutorial progress and runs inventory/UI persistence side effects', () => {
    let state = createState({
      leftPanels: ['tutorial', 'inventory'],
      rightPanels: ['hud'],
      panelOpacity: 0.9,
    })
    const nextInventory = createInventory({ waterIce: 3 })
    const persistInventorySnapshotSafely = vi.fn()
    const persistUiPreferences = vi.fn()
    const applyTutorialProgressTransition = vi.fn(() => ({
      kind: 'updated' as const,
      patch: {
        inventory: nextInventory,
        atomCounter: computeAtomTotals(nextInventory),
        tutorialComplete: true,
      },
      persistInventory: true,
      persistUiPreferences: true,
    }))

    const orchestration = buildRuntimeStoreOrchestration(
      {
        setState: (updater) => {
          state = { ...state, ...updater(state) }
        },
        setPatch: (patch) => {
          state = { ...state, ...patch }
        },
        getState: () => state,
        appendLog: ({ logs }) => logs,
        persistInventorySnapshotSafely,
        handleFailure: vi.fn(),
        shouldSkipPersistence: () => false,
        questRewardHistoryLimit: 32,
      },
      {
        applyTutorialProgressTransition:
          applyTutorialProgressTransition as unknown as typeof applyTutorialProgressTransition,
        persistUiPreferences,
      },
    )

    orchestration.updateTutorialProgress()

    expect(applyTutorialProgressTransition).toHaveBeenCalledOnce()
    expect(persistInventorySnapshotSafely).toHaveBeenCalledWith(nextInventory)
    expect(persistUiPreferences).toHaveBeenCalledWith({
      leftPanels: ['tutorial', 'inventory'],
      rightPanels: ['hud'],
      hiddenPanels: [],
      panelSlotHints: {},
      pinnedQuestIds: [],
      activeMainQuestId: null,
      uiDensity: 'comfortable',
      panelOpacity: 0.9,
    })
    expect(state.tutorialComplete).toBe(true)
  })
})
