import {
  FRIDGE_DEFAULT_WATER_CAPACITY_LITERS,
  FRIDGE_UNLOCK_REWARD_GALAXY_BARS,
} from '@domain/spec/gameSpec'
import { describe, expect, it } from 'vitest'
import { mainQuestDefinitions } from '../features/quests/questDefinitions'
import { useAppStore } from '@state/store'

describe('fridge loading', () => {
  it('loads user-selected water liters and galaxy bars into unlocked fridge with capacity clamping', () => {
    const initialState = useAppStore.getState()
    const originalSnapshot = {
      inventory: { ...initialState.inventory },
      fridge: { ...initialState.fridge },
      simulationLog: [...initialState.simulationLog],
      tutorialEnabled: initialState.tutorialEnabled,
      claimedQuestRewardIds: [...initialState.claimedQuestRewardIds],
      atomCounter: { ...initialState.atomCounter },
    }

    try {
      useAppStore.setState({
        tutorialEnabled: false,
        claimedQuestRewardIds: [],
        inventory: {
          ...initialState.inventory,
          water: 10,
          galaxyBar: 9,
        },
        fridge: {
          unlocked: true,
          galaxyBars: 37,
          capacity: 40,
          waterLiters: 118,
          waterCapacityLiters: FRIDGE_DEFAULT_WATER_CAPACITY_LITERS,
        },
        simulationLog: [],
      })

      const state = useAppStore.getState()
      state.loadFridgeWater(5)
      state.loadFridgeGalaxyBars(6)

      const after = useAppStore.getState()
      expect(after.fridge.waterLiters).toBe(FRIDGE_DEFAULT_WATER_CAPACITY_LITERS)
      expect(after.inventory.water).toBe(8)
      expect(after.fridge.galaxyBars).toBe(40)
      expect(after.inventory.galaxyBar).toBe(6)
      expect(
        after.simulationLog.some((entry) =>
          entry.message.includes('Fridge loaded: moved 2.00 L water'),
        ),
      ).toBe(true)
      expect(
        after.simulationLog.some((entry) =>
          entry.message.includes('Fridge loaded: moved')
          && entry.message.includes('Galaxy Bars from cargo to fridge.'),
        ),
      ).toBe(true)
    } finally {
      useAppStore.setState({
        inventory: originalSnapshot.inventory,
        fridge: originalSnapshot.fridge,
        simulationLog: originalSnapshot.simulationLog,
        tutorialEnabled: originalSnapshot.tutorialEnabled,
        claimedQuestRewardIds: originalSnapshot.claimedQuestRewardIds,
        atomCounter: originalSnapshot.atomCounter,
      })
    }
  })

  it('backfills Feed The Crew fridge reward for legacy claimed saves', () => {
    const feedQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-feed-the-crew')
    if (!feedQuest) {
      throw new Error('Expected Feed The Crew quest not found.')
    }

    const initialState = useAppStore.getState()
    const originalSnapshot = {
      inventory: { ...initialState.inventory },
      tutorialEnabled: initialState.tutorialEnabled,
      tutorialComplete: initialState.tutorialComplete,
      tutorialCurrentStepIndex: initialState.tutorialCurrentStepIndex,
      tutorialCompletion: { ...initialState.tutorialCompletion },
      tutorialChecklist: initialState.tutorialChecklist.map((item) => ({ ...item })),
      claimedQuestRewardIds: [...initialState.claimedQuestRewardIds],
      questRewardNotifications: [...initialState.questRewardNotifications],
      questRewardHistory: [...initialState.questRewardHistory],
      fridge: { ...initialState.fridge },
      simulationLog: [...initialState.simulationLog],
      containmentPower: initialState.containmentPower,
    }

    try {
      useAppStore.setState({
        tutorialEnabled: false,
        claimedQuestRewardIds: [feedQuest.id],
        questRewardNotifications: [],
        questRewardHistory: [],
        fridge: {
          unlocked: false,
          galaxyBars: 0,
          capacity: 40,
        },
        simulationLog: [],
      })

      const currentState = useAppStore.getState()
      currentState.setContainmentPower(currentState.containmentPower)

      const after = useAppStore.getState()
      expect(after.fridge.unlocked).toBe(true)
      expect(after.fridge.galaxyBars).toBe(FRIDGE_UNLOCK_REWARD_GALAXY_BARS)
      expect(after.questRewardNotifications).toHaveLength(0)
      expect(after.questRewardHistory).toHaveLength(0)
      expect(
        after.simulationLog.some((entry) =>
          entry.message.includes('Legacy quest reward backfill applied: Feed The Crew'),
        ),
      ).toBe(true)
    } finally {
      useAppStore.setState({
        inventory: originalSnapshot.inventory,
        tutorialEnabled: originalSnapshot.tutorialEnabled,
        tutorialComplete: originalSnapshot.tutorialComplete,
        tutorialCurrentStepIndex: originalSnapshot.tutorialCurrentStepIndex,
        tutorialCompletion: originalSnapshot.tutorialCompletion,
        tutorialChecklist: originalSnapshot.tutorialChecklist,
        claimedQuestRewardIds: originalSnapshot.claimedQuestRewardIds,
        questRewardNotifications: originalSnapshot.questRewardNotifications,
        questRewardHistory: originalSnapshot.questRewardHistory,
        fridge: originalSnapshot.fridge,
        simulationLog: originalSnapshot.simulationLog,
        containmentPower: originalSnapshot.containmentPower,
      })
    }
  })
})
