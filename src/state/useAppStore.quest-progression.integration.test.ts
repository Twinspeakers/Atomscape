import { describe, expect, it } from 'vitest'
import {
  CHARGE_SHIP_QUEST_ID,
  CONTROL_SHIP_QUEST_ID,
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

describe('quest progression invariants', () => {
  it('automatically unpins quests when they become completed', () => {
    const controlQuest = mainQuestDefinitions.find((quest) => quest.id === CONTROL_SHIP_QUEST_ID)
    const learningQuest = mainQuestDefinitions.find((quest) => quest.id === CHARGE_SHIP_QUEST_ID)
    const feedQuest = mainQuestDefinitions.find((quest) => quest.id === 'main-feed-the-crew')
    if (!controlQuest || !learningQuest || !feedQuest) {
      throw new Error('Expected main quests not found.')
    }

    const initialState = useAppStore.getState()
    const originalSnapshot = {
      tutorialEnabled: initialState.tutorialEnabled,
      tutorialComplete: initialState.tutorialComplete,
      tutorialCurrentStepIndex: initialState.tutorialCurrentStepIndex,
      tutorialCompletion: { ...initialState.tutorialCompletion },
      tutorialChecklist: initialState.tutorialChecklist.map((item) => ({ ...item })),
      pinnedQuestIds: [...initialState.pinnedQuestIds],
      activeMainQuestId: initialState.activeMainQuestId,
      stationDistance: initialState.stationDistance,
      stationDistanceScene: initialState.stationDistanceScene,
      stationDistanceManual: initialState.stationDistanceManual,
      useSceneDistance: initialState.useSceneDistance,
      charging: initialState.charging,
      docked: initialState.docked,
      simulationSummary: { ...initialState.simulationSummary },
      labActiveTab: initialState.labActiveTab,
      containmentPower: initialState.containmentPower,
      claimedQuestRewardIds: [...initialState.claimedQuestRewardIds],
      questRewardNotifications: [...initialState.questRewardNotifications],
      questRewardHistory: [...initialState.questRewardHistory],
      simulationLog: [...initialState.simulationLog],
      galaxyBarsCrafted: initialState.galaxyBarsCrafted,
      inventory: { ...initialState.inventory },
      fridge: { ...initialState.fridge },
      atomCounter: { ...initialState.atomCounter },
    }

    try {
      const completion = buildCompletion()
      controlQuest.stepIds.forEach((stepId) => {
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
        tutorialCurrentStepIndex: 0,
        tutorialCompletion: completion,
        tutorialChecklist: checklist,
        pinnedQuestIds: [learningQuest.id, feedQuest.id],
        activeMainQuestId: learningQuest.id,
        stationDistance: 0,
        stationDistanceScene: 0,
        stationDistanceManual: 0,
        useSceneDistance: true,
        charging: true,
        docked: true,
        labActiveTab: 'station',
        simulationSummary: {
          ...initialState.simulationSummary,
          chargingRate: 12,
          inRange: true,
          netEnergyPerSecond: 12,
        },
        claimedQuestRewardIds: [],
        questRewardNotifications: [],
        questRewardHistory: [],
        galaxyBarsCrafted: 0,
      })

      const currentState = useAppStore.getState()
      currentState.setContainmentPower(currentState.containmentPower)

      const after = useAppStore.getState()
      expect(after.pinnedQuestIds).not.toContain(learningQuest.id)
      expect(after.pinnedQuestIds).toContain(feedQuest.id)
    } finally {
      useAppStore.setState({
        tutorialEnabled: originalSnapshot.tutorialEnabled,
        tutorialComplete: originalSnapshot.tutorialComplete,
        tutorialCurrentStepIndex: originalSnapshot.tutorialCurrentStepIndex,
        tutorialCompletion: originalSnapshot.tutorialCompletion,
        tutorialChecklist: originalSnapshot.tutorialChecklist,
        pinnedQuestIds: originalSnapshot.pinnedQuestIds,
        activeMainQuestId: originalSnapshot.activeMainQuestId,
        stationDistance: originalSnapshot.stationDistance,
        stationDistanceScene: originalSnapshot.stationDistanceScene,
        stationDistanceManual: originalSnapshot.stationDistanceManual,
        useSceneDistance: originalSnapshot.useSceneDistance,
        charging: originalSnapshot.charging,
        docked: originalSnapshot.docked,
        simulationSummary: originalSnapshot.simulationSummary,
        labActiveTab: originalSnapshot.labActiveTab,
        containmentPower: originalSnapshot.containmentPower,
        claimedQuestRewardIds: originalSnapshot.claimedQuestRewardIds,
        questRewardNotifications: originalSnapshot.questRewardNotifications,
        questRewardHistory: originalSnapshot.questRewardHistory,
        simulationLog: originalSnapshot.simulationLog,
        galaxyBarsCrafted: originalSnapshot.galaxyBarsCrafted,
        inventory: originalSnapshot.inventory,
        fridge: originalSnapshot.fridge,
        atomCounter: originalSnapshot.atomCounter,
      })
    }
  })

  it('regresses to prior resource step when required inventory is consumed', () => {
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
      galaxyBarsCrafted: initialState.galaxyBarsCrafted,
      energy: initialState.energy,
      charging: initialState.charging,
      docked: initialState.docked,
      containmentOn: initialState.containmentOn,
      containmentPower: initialState.containmentPower,
    }

    try {
      const completion = buildCompletion()
      const controlQuest = mainQuestDefinitions.find((quest) => quest.id === CONTROL_SHIP_QUEST_ID)
      const learningQuest = mainQuestDefinitions.find((quest) => quest.id === CHARGE_SHIP_QUEST_ID)
      if (!controlQuest || !learningQuest) {
        throw new Error('Expected main learning quest not found.')
      }
      controlQuest.stepIds.forEach((stepId) => {
        completion[stepId] = true
      })
      learningQuest.stepIds.forEach((stepId) => {
        completion[stepId] = true
      })
      completion.approachHighRiskZone = true
      completion.salvageCompositeJunk = true
      completion.returnToStation = true
      completion.targetFeedstock = true

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

      const targetFeedstockIndex = tutorialStepDescriptors.findIndex(
        (step) => step.id === 'targetFeedstock',
      )
      const createWaterIndex = tutorialStepDescriptors.findIndex(
        (step) => step.id === 'createWaterForRations',
      )

      useAppStore.setState({
        tutorialEnabled: true,
        tutorialComplete: false,
        tutorialCurrentStepIndex: createWaterIndex,
        tutorialCompletion: completion,
        tutorialChecklist: checklist,
        claimedQuestRewardIds: [],
        questRewardNotifications: [],
        questRewardHistory: [],
        galaxyBarsCrafted: 0,
        charging: true,
        docked: true,
        containmentOn: false,
        inventory: {
          waterIce: 0,
          co2Ice: 12,
          carbonRock: 0.4,
        },
        energy: Math.max(initialState.energy, 20),
      })

      const currentState = useAppStore.getState()
      currentState.setContainmentPower(currentState.containmentPower)

      const after = useAppStore.getState()
      expect(after.tutorialCompletion.targetFeedstock).toBe(false)
      expect(after.tutorialCurrentStepIndex).toBe(targetFeedstockIndex)
      expect(after.tutorialChecklist[targetFeedstockIndex]?.completed).toBe(false)
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
        galaxyBarsCrafted: originalSnapshot.galaxyBarsCrafted,
        energy: originalSnapshot.energy,
        charging: originalSnapshot.charging,
        docked: originalSnapshot.docked,
        containmentOn: originalSnapshot.containmentOn,
        containmentPower: originalSnapshot.containmentPower,
      })
    }
  })

  it('keeps Shoot The Right Targets complete when equivalent processed stock exists', () => {
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
      galaxyBarsCrafted: initialState.galaxyBarsCrafted,
      energy: initialState.energy,
      charging: initialState.charging,
      docked: initialState.docked,
      containmentOn: initialState.containmentOn,
      containmentPower: initialState.containmentPower,
    }

    try {
      const completion = buildCompletion()
      const controlQuest = mainQuestDefinitions.find((quest) => quest.id === CONTROL_SHIP_QUEST_ID)
      const learningQuest = mainQuestDefinitions.find((quest) => quest.id === CHARGE_SHIP_QUEST_ID)
      if (!controlQuest || !learningQuest) {
        throw new Error('Expected main learning quest not found.')
      }
      controlQuest.stepIds.forEach((stepId) => {
        completion[stepId] = true
      })
      learningQuest.stepIds.forEach((stepId) => {
        completion[stepId] = true
      })
      completion.approachHighRiskZone = true
      completion.salvageCompositeJunk = true
      completion.returnToStation = true
      completion.targetFeedstock = true

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

      const targetFeedstockIndex = tutorialStepDescriptors.findIndex(
        (step) => step.id === 'targetFeedstock',
      )
      const createWaterIndex = tutorialStepDescriptors.findIndex(
        (step) => step.id === 'createWaterForRations',
      )

      useAppStore.setState({
        tutorialEnabled: true,
        tutorialComplete: false,
        tutorialCurrentStepIndex: createWaterIndex,
        tutorialCompletion: completion,
        tutorialChecklist: checklist,
        claimedQuestRewardIds: [],
        questRewardNotifications: [],
        questRewardHistory: [],
        galaxyBarsCrafted: 0,
        charging: true,
        docked: true,
        containmentOn: false,
        inventory: {
          waterIce: 10,
          water: 1,
          co2Ice: 12,
          carbonRock: 0.4,
        },
        energy: Math.max(initialState.energy, 20),
      })

      const currentState = useAppStore.getState()
      currentState.setContainmentPower(currentState.containmentPower)

      const after = useAppStore.getState()
      expect(after.tutorialCompletion.targetFeedstock).toBe(true)
      expect(after.tutorialCurrentStepIndex).toBeGreaterThanOrEqual(createWaterIndex)
      expect(after.tutorialChecklist[targetFeedstockIndex]?.completed).toBe(true)
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
        galaxyBarsCrafted: originalSnapshot.galaxyBarsCrafted,
        energy: originalSnapshot.energy,
        charging: originalSnapshot.charging,
        docked: originalSnapshot.docked,
        containmentOn: originalSnapshot.containmentOn,
        containmentPower: originalSnapshot.containmentPower,
      })
    }
  })

  it('keeps Feed The Crew resource steps complete when stock is embodied in Galaxy Bars', () => {
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
      galaxyBarsCrafted: initialState.galaxyBarsCrafted,
      energy: initialState.energy,
      charging: initialState.charging,
      docked: initialState.docked,
      containmentOn: initialState.containmentOn,
      containmentPower: initialState.containmentPower,
    }

    try {
      const completion = buildCompletion()
      const controlQuest = mainQuestDefinitions.find((quest) => quest.id === CONTROL_SHIP_QUEST_ID)
      const learningQuest = mainQuestDefinitions.find((quest) => quest.id === CHARGE_SHIP_QUEST_ID)
      if (!controlQuest || !learningQuest) {
        throw new Error('Expected main learning quest not found.')
      }
      controlQuest.stepIds.forEach((stepId) => {
        completion[stepId] = true
      })
      learningQuest.stepIds.forEach((stepId) => {
        completion[stepId] = true
      })
      completion.approachHighRiskZone = true
      completion.salvageCompositeJunk = true
      completion.returnToStation = true
      completion.targetFeedstock = true

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

      const targetFeedstockIndex = tutorialStepDescriptors.findIndex(
        (step) => step.id === 'targetFeedstock',
      )
      const createWaterIndex = tutorialStepDescriptors.findIndex(
        (step) => step.id === 'createWaterForRations',
      )

      useAppStore.setState({
        tutorialEnabled: true,
        tutorialComplete: false,
        tutorialCurrentStepIndex: createWaterIndex,
        tutorialCompletion: completion,
        tutorialChecklist: checklist,
        claimedQuestRewardIds: [],
        questRewardNotifications: [],
        questRewardHistory: [],
        galaxyBarsCrafted: 0,
        charging: true,
        docked: true,
        containmentOn: false,
        inventory: {
          galaxyBar: 1,
        },
        energy: Math.max(initialState.energy, 20),
      })

      const currentState = useAppStore.getState()
      currentState.setContainmentPower(currentState.containmentPower)

      const after = useAppStore.getState()
      expect(after.tutorialCompletion.targetFeedstock).toBe(true)
      expect(after.tutorialCurrentStepIndex).toBeGreaterThan(createWaterIndex)
      expect(after.tutorialChecklist[targetFeedstockIndex]?.completed).toBe(true)
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
        galaxyBarsCrafted: originalSnapshot.galaxyBarsCrafted,
        energy: originalSnapshot.energy,
        charging: originalSnapshot.charging,
        docked: originalSnapshot.docked,
        containmentOn: originalSnapshot.containmentOn,
        containmentPower: originalSnapshot.containmentPower,
      })
    }
  })
})
