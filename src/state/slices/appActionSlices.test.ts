import { describe, expect, it, vi } from 'vitest'
import type { AppActionSliceState } from './appActionSlices'
import { buildAppActionSlices } from './appActionSlices'

describe('appActionSlices', () => {
  it('wires shared runtime orchestration callbacks across action-binding builders', () => {
    const runtimeStoreOrchestration = {
      persistUiPreferencesFromState: vi.fn(),
      applyOfflineCatchupFromHydratedState: vi.fn(),
      updateTutorialProgress: vi.fn(),
    }
    const worldSessionActionBindings = {
      loadWorldSessionForSector: vi.fn(),
      hydrateWorldSession: vi.fn(),
      jumpToSector: vi.fn(),
    }
    const worldTargetActionBindings = {
      recordWorldTargetDepleted: vi.fn(),
    }
    const extractionActionBindings = {
      mineElement: vi.fn(),
      tryFireMiningLaser: vi.fn(),
      recordExtractionHit: vi.fn(),
    }
    const runtimeActionBindings = {
      hydrateInventory: vi.fn(),
      resetAllProgress: vi.fn(),
    }
    const simulationActionBindings = {
      runProcess: vi.fn(),
      tickSimulation: vi.fn(),
    }
    const resourceActionBindings = {
      useEnergyCell: vi.fn(),
      upgradeBatteryCapacity: vi.fn(() => false),
      useConsumableSlot: vi.fn(),
      feedCrewGalaxyBar: vi.fn(),
      loadFridgeWater: vi.fn(),
      loadFridgeGalaxyBars: vi.fn(),
      handleFailure: vi.fn(),
      sellMarketProduct: vi.fn(),
    }
    const stationControlActionBindings = {
      setStationDistanceFromScene: vi.fn(),
      setStationDistanceManual: vi.fn(),
      setUseSceneDistance: vi.fn(),
      toggleDocked: vi.fn(),
      startCharging: vi.fn(),
      stopCharging: vi.fn(),
      setContainmentOn: vi.fn(),
      setContainmentPower: vi.fn(),
    }
    const basicStateActionBindings = {
      setFoodAutomationEnabled: vi.fn(),
      setWaterAutomationEnabled: vi.fn(),
      setGalaxyBarAutomationEnabled: vi.fn(),
      setLabActiveTab: vi.fn(),
      setSelectedObject: vi.fn(),
      setPlayerUsername: vi.fn(),
      setActiveCommsSpeaker: vi.fn(),
      appendSimulationLog: vi.fn(),
      setShipTelemetry: vi.fn(),
      setRadarContacts: vi.fn(),
    }
    const uiWorkflowActionBindings = {
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
    }
    const processActionBindings = {
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
    }

    const dependencies = {
      buildRuntimeStoreOrchestration: vi.fn(() => runtimeStoreOrchestration),
      buildWorldSessionActionBindings: vi.fn(() => worldSessionActionBindings),
      buildWorldTargetActionBindings: vi.fn(() => worldTargetActionBindings),
      buildExtractionActionBindings: vi.fn(() => extractionActionBindings),
      buildRuntimeActionBindings: vi.fn(() => runtimeActionBindings),
      buildSimulationActionBindings: vi.fn(() => simulationActionBindings),
      buildResourceActionBindings: vi.fn(() => resourceActionBindings),
      buildStationControlActionBindings: vi.fn(() => stationControlActionBindings),
      buildBasicStateActionBindings: vi.fn(() => basicStateActionBindings),
      buildUiWorkflowActionBindings: vi.fn(() => uiWorkflowActionBindings),
      buildProcessActionBindings: vi.fn(() => processActionBindings),
    }

    const state = {
      handleFailure: vi.fn(),
    } as unknown as AppActionSliceState

    const slices = buildAppActionSlices(
      {
        setState: vi.fn(),
        setPatch: vi.fn(),
        getState: () => state,
        appendLog: ({ logs }) => logs,
        persistInventorySnapshotSafely: vi.fn(),
        sanitizePlayerUsername: (value) => String(value ?? ''),
        shouldSkipPersistence: () => false,
        questRewardHistoryLimit: 32,
        worldSessionVersion: 1,
        legacyWorldSessionRowId: 'active-world-session',
        readWorldSessionById: vi.fn(async () => undefined),
        readInventoryRows: vi.fn(async () => []),
        markProgressResetInFlight: vi.fn(),
        progressResetStorageKeys: {
          uiPreferencesStorageKey: 'ui',
          runtimeStateStorageKey: 'runtime',
          inventoryPanelHeightStorageKey: 'panel',
        },
        failureReportLimit: 80,
      },
      dependencies,
    )

    expect(slices.runtimeStoreOrchestration).toBe(runtimeStoreOrchestration)
    expect(slices.worldSessionActionBindings).toBe(worldSessionActionBindings)
    expect(slices.worldTargetActionBindings).toBe(worldTargetActionBindings)
    expect(slices.extractionActionBindings).toBe(extractionActionBindings)
    expect(slices.runtimeActionBindings).toBe(runtimeActionBindings)
    expect(slices.simulationActionBindings).toBe(simulationActionBindings)
    expect(slices.resourceActionBindings).toBe(resourceActionBindings)
    expect(slices.stationControlActionBindings).toBe(stationControlActionBindings)
    expect(slices.basicStateActionBindings).toBe(basicStateActionBindings)
    expect(slices.uiWorkflowActionBindings).toBe(uiWorkflowActionBindings)
    expect(slices.processActionBindings).toBe(processActionBindings)

    const worldSessionOptions = (
      dependencies.buildWorldSessionActionBindings as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]?.[0] as { updateTutorialProgress: unknown } | undefined
    expect(worldSessionOptions?.updateTutorialProgress).toBe(
      runtimeStoreOrchestration.updateTutorialProgress,
    )

    const runtimeOptions = (
      dependencies.buildRuntimeActionBindings as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]?.[0] as {
      applyOfflineCatchupFromHydratedState: unknown
      updateTutorialProgress: unknown
    } | undefined
    expect(runtimeOptions?.applyOfflineCatchupFromHydratedState).toBe(
      runtimeStoreOrchestration.applyOfflineCatchupFromHydratedState,
    )
    expect(runtimeOptions?.updateTutorialProgress).toBe(
      runtimeStoreOrchestration.updateTutorialProgress,
    )

    const uiWorkflowOptions = (
      dependencies.buildUiWorkflowActionBindings as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]?.[0] as { persistUiPreferencesFromState: unknown } | undefined
    expect(uiWorkflowOptions?.persistUiPreferencesFromState).toBe(
      runtimeStoreOrchestration.persistUiPreferencesFromState,
    )

    const processOptions = (
      dependencies.buildProcessActionBindings as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]?.[0] as { runProcess: unknown } | undefined
    expect(processOptions?.runProcess).toBe(simulationActionBindings.runProcess)
  })
})
