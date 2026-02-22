import { DEFAULT_START_SECTOR_ID } from '@domain/spec/sectorSpec'
import { createMarketState } from '@features/simulation/engine'
import { DEFAULT_PLAYER_USERNAME, type StoreBootstrapContext } from '@state/runtime/storeBootstrap'
import type { AppActionSlices } from '@state/slices/appActionSlices'
import { describe, expect, it, vi } from 'vitest'
import { buildAppInitialState } from './appInitialState'

function createBootstrapContext(
  overrides: Partial<StoreBootstrapContext> = {},
): StoreBootstrapContext {
  const defaultMarketState = createMarketState()

  return {
    defaultMarketState,
    loadedRuntimeSnapshot: {},
    loadedUiPreferences: {},
    initialActiveSectorId: DEFAULT_START_SECTOR_ID,
    initialWorldSeed: 'test-seed',
    initialWorldTargetCount: 120,
    initialDockState: {
      leftPanels: ['tutorial', 'inventory'],
      rightPanels: ['hud'],
    },
    initialHiddenPanels: ['actions'],
    initialPanelSlotHints: { tutorial: 0 },
    initialUiDensity: 'comfortable',
    initialPanelOpacity: 0.9,
    initialStationDistanceManual: 35,
    initialStationDistanceScene: 12,
    initialUseSceneDistance: true,
    initialDocked: false,
    initialStationDistance: 12,
    initialContainmentPower: 70,
    initialCharging: false,
    initialContainmentOn: true,
    initialCycleTimeSeconds: 123,
    initialCrewStatus: {
      hunger: 90,
      debuff: 5,
      starving: false,
      foodAutomationEnabled: true,
    },
    initialCrewMembers: [
      {
        id: 'crew-1',
        name: 'Crew One',
        hunger: 90,
        thirst: 88,
        debuff: 4,
        starving: false,
        dehydrated: false,
        sleepShiftStartHour: 0,
        sleeping: false,
        firstGalaxyBarBoostApplied: false,
        dailyScheduleDayIndex: 1,
        dailyBreakfastServed: false,
        dailyLunchServed: false,
        dailyDinnerServed: false,
        dailyWaterServedCount: 0,
      },
    ],
    initialCrewAggregateMetrics: {
      awakeCount: 1,
      averageHunger: 90,
      averageThirst: 88,
      averageDebuff: 4,
      starvingCount: 0,
      dehydratedCount: 0,
    },
    initialFridge: {
      unlocked: true,
      galaxyBars: 2,
      capacity: 8,
      waterLiters: 4,
      waterCapacityLiters: 12,
    },
    initialWaterAutomationEnabled: true,
    ...overrides,
  }
}

function createActionSlices(): AppActionSlices {
  return {
    runtimeStoreOrchestration: {
      persistUiPreferencesFromState: vi.fn(),
      applyOfflineCatchupFromHydratedState: vi.fn(),
      updateTutorialProgress: vi.fn(),
    },
    worldSessionActionBindings: {
      loadWorldSessionForSector: vi.fn(async () => {}),
      hydrateWorldSession: vi.fn(async () => {}),
      jumpToSector: vi.fn(async () => {}),
    },
    worldTargetActionBindings: {
      recordWorldTargetDepleted: vi.fn(),
    },
    extractionActionBindings: {
      mineElement: vi.fn(async () => {}),
      tryFireMiningLaser: vi.fn(() => true),
      recordExtractionHit: vi.fn(async () => {}),
    },
    runtimeActionBindings: {
      hydrateInventory: vi.fn(async () => {}),
      resetAllProgress: vi.fn(async () => {}),
    },
    simulationActionBindings: {
      runProcess: vi.fn(),
      tickSimulation: vi.fn(),
    },
    resourceActionBindings: {
      useEnergyCell: vi.fn(() => true),
      useConsumableSlot: vi.fn(() => false),
      feedCrewGalaxyBar: vi.fn(),
      loadFridgeWater: vi.fn(),
      loadFridgeGalaxyBars: vi.fn(),
      handleFailure: vi.fn(),
      sellMarketProduct: vi.fn(),
    },
    stationControlActionBindings: {
      setStationDistanceFromScene: vi.fn(),
      setStationDistanceManual: vi.fn(),
      setUseSceneDistance: vi.fn(),
      toggleDocked: vi.fn(),
      startCharging: vi.fn(),
      stopCharging: vi.fn(),
      setContainmentOn: vi.fn(),
      setContainmentPower: vi.fn(),
    },
    basicStateActionBindings: {
      setFoodAutomationEnabled: vi.fn(),
      setWaterAutomationEnabled: vi.fn(),
      setLabActiveTab: vi.fn(),
      setSelectedObject: vi.fn(),
      setPlayerUsername: vi.fn(),
      setActiveCommsSpeaker: vi.fn(),
      appendSimulationLog: vi.fn(),
      setShipTelemetry: vi.fn(),
      setRadarContacts: vi.fn(),
    },
    uiWorkflowActionBindings: {
      setActiveCleanupZone: vi.fn(),
      toggleTutorialCollapsed: vi.fn(),
      dismissTutorial: vi.fn(),
      resetTutorial: vi.fn(),
      toggleQuestPin: vi.fn(),
      setActiveMainQuest: vi.fn(),
      dismissQuestRewardNotification: vi.fn(),
      setUiDensity: vi.fn(),
      setPanelOpacity: vi.fn(),
      toggleWorkspaceCustomizer: vi.fn(),
      setWorkspacePreset: vi.fn(),
      resetWorkspaceUi: vi.fn(),
      movePanel: vi.fn(),
      togglePanelVisibility: vi.fn(),
    },
    processActionBindings: {
      runRockSorter: vi.fn(),
      runIceMelter: vi.fn(),
      runElectrolyzer: vi.fn(),
      runIonizer: vi.fn(),
      runCo2Sublimator: vi.fn(),
      runCarbonRefiner: vi.fn(),
      runBlastFurnace: vi.fn(),
      runCoBurner: vi.fn(),
      runGlassForge: vi.fn(),
      runSteelMill: vi.fn(),
      runGreenhouse: vi.fn(),
      runWoodWorkshop: vi.fn(),
      runGalaxyBarAssembler: vi.fn(),
      runBoxOfSandPress: vi.fn(),
      runSteelIngotCaster: vi.fn(),
      runEnergyCellAssembler: vi.fn(),
    },
  }
}

describe('appInitialState', () => {
  it('builds defaults and binds actions from composed app action slices', () => {
    const nowMs = Date.UTC(2026, 1, 22, 19, 12, 33)
    vi.useFakeTimers()
    vi.setSystemTime(nowMs)

    try {
      const runtimeMarket = createMarketState()
      runtimeMarket.boxOfSand.price = 33

      const bootstrap = createBootstrapContext({
        loadedRuntimeSnapshot: {
          energy: 444,
          market: runtimeMarket,
          labActiveTab: 'manufacturing',
        },
        loadedUiPreferences: {
          pinnedQuestIds: ['quest-alpha'],
          activeMainQuestId: 'main-quest',
        },
      })
      const actionSlices = createActionSlices()
      const state = buildAppInitialState({ bootstrap, actionSlices })

      expect(state.playerUsername).toBe(DEFAULT_PLAYER_USERNAME)
      expect(state.energy).toBe(444)
      expect(state.maxEnergy).toBe(2000)
      expect(state.market).toBe(runtimeMarket)
      expect(state.labActiveTab).toBe('manufacturing')
      expect(state.pinnedQuestIds).toEqual(['quest-alpha'])
      expect(state.activeMainQuestId).toBe('main-quest')
      expect(state.simulationLog[0]?.timestamp).toBe(nowMs)
      expect(state.hydrateInventory).toBe(actionSlices.runtimeActionBindings.hydrateInventory)
      expect(state.hydrateWorldSession).toBe(actionSlices.worldSessionActionBindings.hydrateWorldSession)
      expect(state.tickSimulation).toBe(actionSlices.simulationActionBindings.tickSimulation)
      expect(state.resetAllProgress).toBe(actionSlices.runtimeActionBindings.resetAllProgress)
      expect(state.runRockSorter).toBe(actionSlices.processActionBindings.runRockSorter)
    } finally {
      vi.useRealTimers()
    }
  })
})
