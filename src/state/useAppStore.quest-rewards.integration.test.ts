import { FRIDGE_UNLOCK_REWARD_GALAXY_BARS } from '@domain/spec/gameSpec'
import { describe, expect, it } from 'vitest'
import {
  firstContractSideQuest,
  mainQuestDefinitions,
  tutorialStepDescriptors,
  type TutorialStepId,
} from '../features/quests/questDefinitions'
import { useAppStore } from '@state/store'

function buildCompletion(): Record<TutorialStepId, boolean> {
  return tutorialStepDescriptors.reduce<Record<TutorialStepId, boolean>>((map, step) => {
    map[step.id] = false
    return map
  }, {} as Record<TutorialStepId, boolean>)
}

describe('quest reward delivery invariants', () => {
  it('unlocks and preloads fridge once for Feed The Crew reward', () => {
    const learningQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-learning-charge')
    const feedQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-feed-the-crew')
    if (!learningQuest || !feedQuest) {
      throw new Error('Expected main quests not found.')
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
      energy: initialState.energy,
      containmentPower: initialState.containmentPower,
    }

    try {
      const completion = buildCompletion()
      learningQuest.stepIds.forEach((stepId) => {
        completion[stepId] = true
      })
      completion.approachHighRiskZone = true
      completion.salvageCompositeJunk = true
      completion.returnToStation = true
      completion.targetFeedstock = true
      completion.createWaterForRations = true
      completion.createCo2GasForRations = true
      completion.createCellulose = true
      completion.createCarbonForRations = true
      completion.stageGalaxyBarIngredients = true
      completion.craftGalaxyBar = true

      const checklist = tutorialStepDescriptors.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        detail: step.detail,
        hint: step.hint,
        focusTarget: step.focusTarget,
        labTab: step.labTab,
        completed: completion[step.id],
      }))

      useAppStore.setState({
        tutorialEnabled: true,
        tutorialComplete: false,
        tutorialCurrentStepIndex: tutorialStepDescriptors.findIndex((step) => !completion[step.id]),
        tutorialCompletion: completion,
        tutorialChecklist: checklist,
        claimedQuestRewardIds: [learningQuest.id],
        questRewardNotifications: [],
        questRewardHistory: [],
        fridge: {
          unlocked: false,
          galaxyBars: 0,
          capacity: 40,
        },
        inventory: {
          waterIce: 11,
          co2Ice: 12,
          carbonRock: 0.4,
          cellulose: 2,
          water: 11,
          co2Gas: 12,
          carbon: 0.4,
          galaxyBar: 1,
          boxOfSand: 0,
          steelIngot: 0,
          energyCell: 0,
        },
        energy: Math.max(initialState.energy, 12),
      })

      const firstTickState = useAppStore.getState()
      firstTickState.setContainmentPower(firstTickState.containmentPower)

      const afterFirst = useAppStore.getState()
      expect(afterFirst.fridge.unlocked).toBe(true)
      expect(afterFirst.fridge.galaxyBars).toBe(FRIDGE_UNLOCK_REWARD_GALAXY_BARS)
      expect(afterFirst.claimedQuestRewardIds.filter((id) => id === feedQuest.id)).toHaveLength(1)
      expect(afterFirst.questRewardNotifications).toHaveLength(1)
      expect(afterFirst.questRewardNotifications[0]?.questId).toBe(feedQuest.id)
      expect(afterFirst.questRewardHistory).toHaveLength(1)
      expect(afterFirst.questRewardHistory[0]?.questId).toBe(feedQuest.id)

      afterFirst.setContainmentPower(afterFirst.containmentPower)

      const afterSecond = useAppStore.getState()
      expect(afterSecond.fridge.galaxyBars).toBe(FRIDGE_UNLOCK_REWARD_GALAXY_BARS)
      expect(afterSecond.claimedQuestRewardIds.filter((id) => id === feedQuest.id)).toHaveLength(1)
      expect(afterSecond.questRewardNotifications).toHaveLength(1)
      expect(afterSecond.questRewardHistory).toHaveLength(1)
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
        energy: originalSnapshot.energy,
        containmentPower: originalSnapshot.containmentPower,
      })
    }
  })

  it('unlocks fridge and enqueues Feed The Crew reward modal when final craft step completes', () => {
    const learningQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-learning-charge')
    const feedQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-feed-the-crew')
    if (!learningQuest || !feedQuest) {
      throw new Error('Expected main quests not found.')
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
      energy: initialState.energy,
      charging: initialState.charging,
      containmentOn: initialState.containmentOn,
      containmentPower: initialState.containmentPower,
      docked: initialState.docked,
      atomCounter: { ...initialState.atomCounter },
    }

    try {
      const completion = buildCompletion()
      learningQuest.stepIds.forEach((stepId) => {
        completion[stepId] = true
      })
      completion.approachHighRiskZone = true
      completion.salvageCompositeJunk = true
      completion.returnToStation = true
      completion.targetFeedstock = true
      completion.createWaterForRations = true
      completion.createCo2GasForRations = true
      completion.createCellulose = true
      completion.createCarbonForRations = true
      completion.stageGalaxyBarIngredients = true
      completion.craftGalaxyBar = false

      const checklist = tutorialStepDescriptors.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        detail: step.detail,
        hint: step.hint,
        focusTarget: step.focusTarget,
        labTab: step.labTab,
        completed: completion[step.id],
      }))

      const craftStepIndex = tutorialStepDescriptors.findIndex((step) => step.id === 'craftGalaxyBar')

      useAppStore.setState({
        tutorialEnabled: true,
        tutorialComplete: false,
        tutorialCurrentStepIndex: craftStepIndex,
        tutorialCompletion: completion,
        tutorialChecklist: checklist,
        claimedQuestRewardIds: [learningQuest.id],
        questRewardNotifications: [],
        questRewardHistory: [],
        fridge: {
          unlocked: false,
          galaxyBars: 0,
          capacity: 40,
        },
        inventory: {
          water: 11,
          co2Gas: 12,
          carbon: 0.8,
          cellulose: 2,
          galaxyBar: 0,
        },
        charging: false,
        containmentOn: false,
        docked: true,
        energy: Math.max(initialState.energy, 40),
        atomCounter: { ...initialState.atomCounter },
      })

      useAppStore.getState().runGalaxyBarAssembler()

      const after = useAppStore.getState()
      expect(after.inventory.galaxyBar ?? 0).toBeGreaterThanOrEqual(1)
      expect(after.tutorialCompletion.craftGalaxyBar).toBe(true)
      expect(after.fridge.unlocked).toBe(true)
      expect(after.fridge.galaxyBars).toBe(FRIDGE_UNLOCK_REWARD_GALAXY_BARS)
      expect(after.claimedQuestRewardIds).toContain(feedQuest.id)
      expect(after.questRewardNotifications).toHaveLength(1)
      expect(after.questRewardNotifications[0]?.questId).toBe(feedQuest.id)
      expect(after.questRewardHistory).toHaveLength(1)
      expect(after.questRewardHistory[0]?.questId).toBe(feedQuest.id)
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
        energy: originalSnapshot.energy,
        charging: originalSnapshot.charging,
        containmentOn: originalSnapshot.containmentOn,
        containmentPower: originalSnapshot.containmentPower,
        docked: originalSnapshot.docked,
        atomCounter: originalSnapshot.atomCounter,
      })
    }
  })

  it('queues reward notifications in deterministic order and dismisses FIFO without duplicate re-claims', () => {
    const learningQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-learning-charge')
    const feedQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-feed-the-crew')
    const cleanupQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-orbital-cleanup-protocol')
    if (!learningQuest || !feedQuest || !cleanupQuest) {
      throw new Error('Expected main quests not found.')
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
      energy: initialState.energy,
      charging: initialState.charging,
      docked: initialState.docked,
      containmentOn: initialState.containmentOn,
      containmentPower: initialState.containmentPower,
      credits: initialState.credits,
      visitedCleanupZones: [...initialState.visitedCleanupZones],
      worldVisitedZoneIds: [...initialState.worldVisitedZoneIds],
      worldClassDestroyedCounts: { ...initialState.worldClassDestroyedCounts },
      extractionEvents: [...initialState.extractionEvents],
    }

    try {
      const completion = buildCompletion()
      ;(Object.keys(completion) as TutorialStepId[]).forEach((stepId) => {
        completion[stepId] = true
      })

      const checklist = tutorialStepDescriptors.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        detail: step.detail,
        hint: step.hint,
        focusTarget: step.focusTarget,
        labTab: step.labTab,
        completed: completion[step.id],
      }))

      useAppStore.setState({
        tutorialEnabled: true,
        tutorialComplete: false,
        tutorialCurrentStepIndex: tutorialStepDescriptors.length,
        tutorialCompletion: completion,
        tutorialChecklist: checklist,
        claimedQuestRewardIds: [],
        questRewardNotifications: [],
        questRewardHistory: [],
        charging: true,
        docked: true,
        containmentOn: true,
        inventory: {
          waterIce: 11,
          co2Ice: 12,
          carbonRock: 0.4,
          cellulose: 2,
          water: 11,
          co2Gas: 12,
          carbon: 0.4,
          galaxyBar: 1,
          rubble: 6,
          silicaSand: 1,
          ironOre: 1,
          hydrogenNeutral: 2,
          oxygenGas: 1,
          hydrogenIonized: 1,
          boxOfSand: 1,
          steelIngot: 0,
          energyCell: 0,
        },
        credits: 1,
        energy: Math.max(initialState.energy, 12),
        visitedCleanupZones: ['highRiskSalvagePocket'],
        worldVisitedZoneIds: ['highRiskSalvagePocket'],
        worldClassDestroyedCounts: {
          ...initialState.worldClassDestroyedCounts,
          compositeJunk: 2,
        },
      })

      const firstTickState = useAppStore.getState()
      firstTickState.setContainmentPower(firstTickState.containmentPower)

      const afterFirstClaim = useAppStore.getState()
      expect(afterFirstClaim.questRewardNotifications.map((entry) => entry.questId)).toEqual([
        learningQuest.id,
        feedQuest.id,
        cleanupQuest.id,
        firstContractSideQuest.id,
      ])
      expect(afterFirstClaim.questRewardHistory.map((entry) => entry.questId)).toEqual([
        learningQuest.id,
        feedQuest.id,
        cleanupQuest.id,
        firstContractSideQuest.id,
      ])

      afterFirstClaim.dismissQuestRewardNotification()
      const afterFirstDismiss = useAppStore.getState()
      expect(afterFirstDismiss.questRewardNotifications.map((entry) => entry.questId)).toEqual([
        feedQuest.id,
        cleanupQuest.id,
        firstContractSideQuest.id,
      ])

      afterFirstDismiss.setContainmentPower(afterFirstDismiss.containmentPower)

      const afterSecondTick = useAppStore.getState()
      expect(afterSecondTick.questRewardNotifications.map((entry) => entry.questId)).toEqual([
        feedQuest.id,
        cleanupQuest.id,
        firstContractSideQuest.id,
      ])
      expect(afterSecondTick.questRewardHistory.map((entry) => entry.questId)).toEqual([
        learningQuest.id,
        feedQuest.id,
        cleanupQuest.id,
        firstContractSideQuest.id,
      ])
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
        energy: originalSnapshot.energy,
        charging: originalSnapshot.charging,
        docked: originalSnapshot.docked,
        containmentOn: originalSnapshot.containmentOn,
        containmentPower: originalSnapshot.containmentPower,
        credits: originalSnapshot.credits,
        visitedCleanupZones: originalSnapshot.visitedCleanupZones,
        worldVisitedZoneIds: originalSnapshot.worldVisitedZoneIds,
        worldClassDestroyedCounts: originalSnapshot.worldClassDestroyedCounts,
        extractionEvents: originalSnapshot.extractionEvents,
      })
    }
  })

  it('auto-completes and rewards main quests when live state already satisfies all steps', () => {
    const learningQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-learning-charge')
    const feedQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-feed-the-crew')
    const cleanupQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-orbital-cleanup-protocol')
    if (!learningQuest || !feedQuest || !cleanupQuest) {
      throw new Error('Expected main quests not found.')
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
      energy: initialState.energy,
      charging: initialState.charging,
      docked: initialState.docked,
      containmentOn: initialState.containmentOn,
      containmentPower: initialState.containmentPower,
      credits: initialState.credits,
      visitedCleanupZones: [...initialState.visitedCleanupZones],
      worldVisitedZoneIds: [...initialState.worldVisitedZoneIds],
      worldClassDestroyedCounts: { ...initialState.worldClassDestroyedCounts },
      extractionEvents: [...initialState.extractionEvents],
    }

    try {
      const completion = buildCompletion()
      const checklist = tutorialStepDescriptors.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        detail: step.detail,
        hint: step.hint,
        focusTarget: step.focusTarget,
        labTab: step.labTab,
        completed: completion[step.id],
      }))

      useAppStore.setState({
        tutorialEnabled: true,
        tutorialComplete: false,
        tutorialCurrentStepIndex: 0,
        tutorialCompletion: completion,
        tutorialChecklist: checklist,
        claimedQuestRewardIds: [],
        questRewardNotifications: [],
        questRewardHistory: [],
        labActiveTab: 'station',
        charging: true,
        docked: true,
        containmentOn: true,
        inventory: {
          waterIce: 11,
          co2Ice: 12,
          carbonRock: 0.4,
          cellulose: 2,
          water: 11,
          co2Gas: 12,
          carbon: 0.4,
          galaxyBar: 1,
          rubble: 6,
          silicaSand: 1,
          ironOre: 1,
          hydrogenNeutral: 2,
          oxygenGas: 1,
          hydrogenIonized: 1,
          boxOfSand: 1,
        },
        credits: 0,
        energy: Math.max(initialState.energy, 20),
        visitedCleanupZones: ['highRiskSalvagePocket'],
        worldVisitedZoneIds: ['highRiskSalvagePocket'],
        worldClassDestroyedCounts: {
          ...initialState.worldClassDestroyedCounts,
          compositeJunk: 2,
        },
      })

      const currentState = useAppStore.getState()
      currentState.setContainmentPower(currentState.containmentPower)

      const after = useAppStore.getState()
      expect(after.tutorialComplete).toBe(true)
      expect(after.claimedQuestRewardIds).toEqual(
        expect.arrayContaining([learningQuest.id, feedQuest.id, cleanupQuest.id]),
      )
      expect(after.claimedQuestRewardIds).not.toContain(firstContractSideQuest.id)
      expect(after.questRewardHistory.map((entry) => entry.questId)).toEqual([
        learningQuest.id,
        feedQuest.id,
        cleanupQuest.id,
      ])
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
        energy: originalSnapshot.energy,
        charging: originalSnapshot.charging,
        docked: originalSnapshot.docked,
        containmentOn: originalSnapshot.containmentOn,
        containmentPower: originalSnapshot.containmentPower,
        credits: originalSnapshot.credits,
        visitedCleanupZones: originalSnapshot.visitedCleanupZones,
        worldVisitedZoneIds: originalSnapshot.worldVisitedZoneIds,
        worldClassDestroyedCounts: originalSnapshot.worldClassDestroyedCounts,
        extractionEvents: originalSnapshot.extractionEvents,
      })
    }
  })
})
