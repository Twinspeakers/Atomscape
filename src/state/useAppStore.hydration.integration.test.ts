import { CHARGING_RANGE_METERS } from '@domain/spec/gameSpec'
import { gameDb } from '@platform/db/gameDb'
import { describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@state/store'

describe('offline catch-up hydration', () => {
  it('replays elapsed simulation time with simulated event timestamps', async () => {
    const nowMs = Date.UTC(2026, 1, 21, 12, 0, 0)
    const nowSeconds = Math.floor(nowMs / 1000)
    const replaySeconds = 120
    const startingCycle = nowSeconds - replaySeconds

    const initialState = useAppStore.getState()
    const originalSnapshot = {
      inventory: { ...initialState.inventory },
      inventoryLoaded: initialState.inventoryLoaded,
      atomCounter: { ...initialState.atomCounter },
      cycleTimeSeconds: initialState.cycleTimeSeconds,
      charging: initialState.charging,
      docked: initialState.docked,
      useSceneDistance: initialState.useSceneDistance,
      stationDistance: initialState.stationDistance,
      stationDistanceScene: initialState.stationDistanceScene,
      stationDistanceManual: initialState.stationDistanceManual,
      simulationSummary: { ...initialState.simulationSummary },
      simulationLog: [...initialState.simulationLog],
      starvationFailureLock: initialState.starvationFailureLock,
      crewStatus: { ...initialState.crewStatus },
      crewMembers: initialState.crewMembers.map((member) => ({ ...member })),
      crewAggregateMetrics: { ...initialState.crewAggregateMetrics },
      fridge: { ...initialState.fridge },
      waterAutomationEnabled: initialState.waterAutomationEnabled,
      market: { ...initialState.market },
      energy: initialState.energy,
      maxEnergy: initialState.maxEnergy,
      crewFeedsDelivered: initialState.crewFeedsDelivered,
      tutorialEnabled: initialState.tutorialEnabled,
      tutorialComplete: initialState.tutorialComplete,
      tutorialCurrentStepIndex: initialState.tutorialCurrentStepIndex,
      tutorialCompletion: { ...initialState.tutorialCompletion },
      tutorialChecklist: initialState.tutorialChecklist.map((item) => ({ ...item })),
      pinnedQuestIds: [...initialState.pinnedQuestIds],
      activeMainQuestId: initialState.activeMainQuestId,
      claimedQuestRewardIds: [...initialState.claimedQuestRewardIds],
      questRewardNotifications: [...initialState.questRewardNotifications],
      questRewardHistory: [...initialState.questRewardHistory],
    }

    const toArraySpy = vi.spyOn(gameDb.inventory, 'toArray').mockResolvedValue([])
    vi.useFakeTimers()
    vi.setSystemTime(nowMs)

    try {
      useAppStore.setState({
        inventoryLoaded: false,
        cycleTimeSeconds: startingCycle,
        charging: true,
        docked: false,
        useSceneDistance: false,
        stationDistance: CHARGING_RANGE_METERS + 80,
        stationDistanceScene: CHARGING_RANGE_METERS + 80,
        stationDistanceManual: CHARGING_RANGE_METERS + 80,
        simulationLog: [
          {
            id: 1,
            message: 'seed log',
            timestamp: (startingCycle - 1) * 1000,
          },
        ],
      })

      await useAppStore.getState().hydrateInventory()

      const after = useAppStore.getState()
      const catchupSummary = after.simulationLog.find((entry) =>
        entry.message.includes('Offline catch-up complete'),
      )
      const chargingStoppedLog = after.simulationLog.find((entry) =>
        entry.message.includes('Charging stopped: you drifted outside station range'),
      )

      expect(after.cycleTimeSeconds).toBe(nowSeconds)
      expect(catchupSummary).toBeDefined()
      expect(catchupSummary?.timestamp).toBe(nowSeconds * 1000)
      expect(chargingStoppedLog).toBeDefined()
      expect(chargingStoppedLog?.timestamp).toBe((startingCycle + 1) * 1000)
      expect(chargingStoppedLog?.timestamp).toBeLessThan(catchupSummary?.timestamp ?? 0)
    } finally {
      toArraySpy.mockRestore()
      vi.useRealTimers()
      useAppStore.setState({
        inventory: originalSnapshot.inventory,
        inventoryLoaded: originalSnapshot.inventoryLoaded,
        atomCounter: originalSnapshot.atomCounter,
        cycleTimeSeconds: originalSnapshot.cycleTimeSeconds,
        charging: originalSnapshot.charging,
        docked: originalSnapshot.docked,
        useSceneDistance: originalSnapshot.useSceneDistance,
        stationDistance: originalSnapshot.stationDistance,
        stationDistanceScene: originalSnapshot.stationDistanceScene,
        stationDistanceManual: originalSnapshot.stationDistanceManual,
        simulationSummary: originalSnapshot.simulationSummary,
        simulationLog: originalSnapshot.simulationLog,
        starvationFailureLock: originalSnapshot.starvationFailureLock,
        crewStatus: originalSnapshot.crewStatus,
        crewMembers: originalSnapshot.crewMembers,
        crewAggregateMetrics: originalSnapshot.crewAggregateMetrics,
        fridge: originalSnapshot.fridge,
        waterAutomationEnabled: originalSnapshot.waterAutomationEnabled,
        market: originalSnapshot.market,
        energy: originalSnapshot.energy,
        maxEnergy: originalSnapshot.maxEnergy,
        crewFeedsDelivered: originalSnapshot.crewFeedsDelivered,
        tutorialEnabled: originalSnapshot.tutorialEnabled,
        tutorialComplete: originalSnapshot.tutorialComplete,
        tutorialCurrentStepIndex: originalSnapshot.tutorialCurrentStepIndex,
        tutorialCompletion: originalSnapshot.tutorialCompletion,
        tutorialChecklist: originalSnapshot.tutorialChecklist,
        pinnedQuestIds: originalSnapshot.pinnedQuestIds,
        activeMainQuestId: originalSnapshot.activeMainQuestId,
        claimedQuestRewardIds: originalSnapshot.claimedQuestRewardIds,
        questRewardNotifications: originalSnapshot.questRewardNotifications,
        questRewardHistory: originalSnapshot.questRewardHistory,
      })
    }
  })
})
