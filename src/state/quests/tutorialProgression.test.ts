import { describe, expect, it } from 'vitest'
import { mainQuestDefinitions, tutorialStepDescriptors } from '@features/quests/questDefinitions'
import type { TutorialProgressState } from './tutorialProgression'
import {
  buildTutorialChecklist,
  createTutorialCompletion,
  evaluateTutorial,
  resolveActiveMainQuestId,
  resolveTutorialStepTitle,
} from './tutorialProgression'

function createBaseState(overrides: Partial<TutorialProgressState> = {}): TutorialProgressState {
  return {
    stationDistance: 9999,
    labActiveTab: 'sorting',
    charging: false,
    docked: false,
    containmentOn: false,
    energy: 0,
    inventory: {},
    simulationSummary: {
      chargingRate: 0,
      containmentDrain: 0,
      recombinationRate: 0,
      inRange: false,
      netEnergyPerSecond: 0,
    },
    extractionEvents: [],
    worldClassDestroyedCounts: {},
    visitedCleanupZones: [],
    worldVisitedZoneIds: [],
    tutorialCompletion: createTutorialCompletion(),
    ...overrides,
  }
}

describe('tutorialProgression', () => {
  it('creates completion state for every tutorial step', () => {
    const completion = createTutorialCompletion()
    const completionStepIds = Object.keys(completion).sort()
    const descriptorStepIds = tutorialStepDescriptors.map((step) => step.id).sort()

    expect(completionStepIds).toEqual(descriptorStepIds)
    expect(Object.values(completion).every((value) => value === false)).toBe(true)
  })

  it('builds checklist rows aligned to descriptor count', () => {
    const completion = createTutorialCompletion()
    const checklist = buildTutorialChecklist(completion)

    expect(checklist).toHaveLength(tutorialStepDescriptors.length)
    expect(checklist.every((entry) => entry.completed === false)).toBe(true)
  })

  it('advances early charging steps when docked charging prerequisites are met', () => {
    const completion = createTutorialCompletion()
    completion.lookAroundWithMouse = true
    completion.strafeLeftAndRight = true
    completion.strafeUpAndDown = true
    completion.forwardReverseRun = true
    completion.boostThroughRing = true
    completion.lockOnTrainingDrone = true
    completion.destroyTrainingDrone = true

    const baseState = createBaseState({
      stationDistance: 0,
      labActiveTab: 'station',
      docked: true,
      charging: true,
      tutorialCompletion: completion,
      simulationSummary: {
        chargingRate: 1,
        containmentDrain: 0,
        recombinationRate: 0,
        inRange: true,
        netEnergyPerSecond: 1,
      },
    })

    const evaluation = evaluateTutorial(baseState)

    expect(evaluation.completion.approachStationForCharging).toBe(true)
    expect(evaluation.completion.openStationTabForCharging).toBe(true)
    expect(evaluation.completion.engageCharging).toBe(true)
    expect(evaluation.completion.startCharging).toBe(true)
    expect(evaluation.currentStepIndex).toBe(
      tutorialStepDescriptors.findIndex((step) => step.id === 'approachHighRiskZone'),
    )
  })

  it('regresses provisional resource steps when consumed before next step completion', () => {
    const completion = createTutorialCompletion()
    completion.mineRubble = true
    completion.sortRubble = false

    const evaluation = evaluateTutorial(createBaseState({
      inventory: { rubble: 0 },
      tutorialCompletion: completion,
    }))

    expect(evaluation.completion.mineRubble).toBe(false)
    expect(evaluation.changed).toBe(true)
  })

  it('resolves active main quest to next incomplete quest when selected quest is complete', () => {
    const completion = createTutorialCompletion()
    const firstQuest = mainQuestDefinitions[0]
    firstQuest.stepIds.forEach((stepId) => {
      completion[stepId] = true
    })

    const expectedFallback = mainQuestDefinitions.find(
      (quest) => quest.stepIds.some((stepId) => !completion[stepId]),
    )?.id

    expect(resolveActiveMainQuestId(firstQuest.id, completion)).toBe(expectedFallback)
  })

  it('returns step titles for known tutorial step ids', () => {
    expect(resolveTutorialStepTitle('mineRubble')).toBe('Mine Asteroid Rubble')
  })
})
