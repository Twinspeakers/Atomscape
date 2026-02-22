import { CHARGING_RANGE_METERS } from '@domain/spec/gameSpec'
import type { CleanupTargetClassId, CleanupZoneId } from '@domain/spec/worldSpec'
import {
  mainQuestDefinitions,
  tutorialStepDescriptors,
  type TutorialStepId,
} from '@features/quests/questDefinitions'
import {
  isFeedCrewCraftGalaxyBarSatisfied,
  isFeedCrewCreateCarbonSatisfied,
  isFeedCrewCreateCelluloseSatisfied,
  isFeedCrewCreateCo2Satisfied,
  isFeedCrewCreateWaterSatisfied,
  isFeedCrewStageIngredientsSatisfied,
  isFeedCrewTargetFeedstockSatisfied,
} from '@features/quests/feedCrewProgress'
import type {
  ExtractionEvent,
  LabTab,
  ResourceInventory,
  SimulationSummary,
  TutorialChecklistItem,
} from '@state/types'

const PROVISIONAL_RESOURCE_STEPS = new Set<TutorialStepId>([
  'targetFeedstock',
  'createWaterForRations',
  'createCo2GasForRations',
  'createCellulose',
  'createCarbonForRations',
  'stageGalaxyBarIngredients',
  'craftGalaxyBar',
  'mineRubble',
  'sortRubble',
  'electrolyzeWater',
  'ionizeHydrogen',
  'manufacturePart',
])

export type TutorialCompletion = Record<TutorialStepId, boolean>

export interface TutorialProgressState {
  stationDistance: number
  labActiveTab: LabTab
  charging: boolean
  docked: boolean
  containmentOn: boolean
  energy: number
  inventory: ResourceInventory
  simulationSummary: SimulationSummary
  extractionEvents: ExtractionEvent[]
  worldClassDestroyedCounts: Partial<Record<CleanupTargetClassId, number>>
  visitedCleanupZones: CleanupZoneId[]
  worldVisitedZoneIds: CleanupZoneId[]
  tutorialCompletion: TutorialCompletion
}

export interface TutorialEvaluation {
  completion: TutorialCompletion
  checklist: TutorialChecklistItem[]
  currentStepIndex: number
  complete: boolean
  newlyCompleted: TutorialStepId[]
  changed: boolean
}

function tutorialStepSatisfied(stepId: TutorialStepId, state: TutorialProgressState): boolean {
  const extractedCompositeJunkCount = Math.max(
    state.extractionEvents.filter(
      (event) =>
        event.type === 'targetExtracted'
        && event.succeeded
        && event.targetClassId === 'compositeJunk',
    ).length,
    state.worldClassDestroyedCounts.compositeJunk ?? 0,
  )

  switch (stepId) {
    case 'approachStationForCharging':
      return state.stationDistance <= CHARGING_RANGE_METERS
    case 'openStationTabForCharging':
      return state.stationDistance <= CHARGING_RANGE_METERS && state.labActiveTab === 'station'
    case 'engageCharging':
      return state.stationDistance <= CHARGING_RANGE_METERS && state.charging
    case 'startCharging':
      return state.charging && state.simulationSummary.chargingRate > 0
    case 'approachHighRiskZone':
      return (
        state.visitedCleanupZones.includes('highRiskSalvagePocket')
        || state.worldVisitedZoneIds.includes('highRiskSalvagePocket')
      )
    case 'salvageCompositeJunk':
      return extractedCompositeJunkCount >= 2
    case 'returnToStation':
      return state.docked
    case 'targetFeedstock':
      return isFeedCrewTargetFeedstockSatisfied(state.inventory)
    case 'createCellulose':
      return isFeedCrewCreateCelluloseSatisfied(state.inventory)
    case 'createWaterForRations':
      return isFeedCrewCreateWaterSatisfied(state.inventory)
    case 'createCo2GasForRations':
      return isFeedCrewCreateCo2Satisfied(state.inventory)
    case 'createCarbonForRations':
      return isFeedCrewCreateCarbonSatisfied(state.inventory)
    case 'stageGalaxyBarIngredients':
      return isFeedCrewStageIngredientsSatisfied(state.inventory, state.energy)
    case 'craftGalaxyBar':
      return isFeedCrewCraftGalaxyBarSatisfied(state.inventory)
    case 'mineRubble':
      return (state.inventory.rubble ?? 0) >= 6
    case 'sortRubble':
      return (
        (state.inventory.silicaSand ?? 0) > 0
        && (state.inventory.ironOre ?? 0) > 0
        && (state.inventory.waterIce ?? 0) > 0
      )
    case 'electrolyzeWater':
      return (state.inventory.hydrogenNeutral ?? 0) >= 2 && (state.inventory.oxygenGas ?? 0) >= 1
    case 'ionizeHydrogen':
      return (state.inventory.hydrogenIonized ?? 0) >= 1 && state.containmentOn
    case 'manufacturePart':
      return (
        (state.inventory.boxOfSand ?? 0) > 0
        || (state.inventory.steelIngot ?? 0) > 0
        || (state.inventory.energyCell ?? 0) > 0
        || (state.inventory.glass ?? 0) > 0
        || (state.inventory.steel ?? 0) > 0
        || (state.inventory.wood ?? 0) > 0
      )
    default:
      return false
  }
}

export function createTutorialCompletion(): TutorialCompletion {
  return tutorialStepDescriptors.reduce<TutorialCompletion>((map, step) => {
    map[step.id] = false
    return map
  }, {} as TutorialCompletion)
}

export function buildTutorialChecklist(completion: TutorialCompletion): TutorialChecklistItem[] {
  return tutorialStepDescriptors.map((step) => ({
    id: step.id,
    title: step.title,
    description: step.description,
    detail: step.detail,
    hint: step.hint,
    focusTarget: step.focusTarget,
    labTab: step.labTab,
    completed: completion[step.id],
  }))
}

function currentTutorialStepIndex(completion: TutorialCompletion): number {
  const nextIndex = tutorialStepDescriptors.findIndex((step) => !completion[step.id])
  return nextIndex === -1 ? tutorialStepDescriptors.length : nextIndex
}

export function evaluateTutorial(state: TutorialProgressState): TutorialEvaluation {
  const completion: TutorialCompletion = { ...state.tutorialCompletion }
  const newlyCompleted: TutorialStepId[] = []
  let changed = false

  for (let index = 0; index < tutorialStepDescriptors.length - 1; index += 1) {
    const stepId = tutorialStepDescriptors[index].id
    const nextStepId = tutorialStepDescriptors[index + 1].id

    if (!PROVISIONAL_RESOURCE_STEPS.has(stepId)) {
      continue
    }

    if (completion[stepId] && !completion[nextStepId] && !tutorialStepSatisfied(stepId, state)) {
      completion[stepId] = false
      changed = true
    }
  }

  let foundIncomplete = false
  tutorialStepDescriptors.forEach((step) => {
    if (!completion[step.id]) {
      foundIncomplete = true
      return
    }

    if (foundIncomplete) {
      completion[step.id] = false
      changed = true
    }
  })

  let stepIndex = currentTutorialStepIndex(completion)
  while (stepIndex < tutorialStepDescriptors.length) {
    const step = tutorialStepDescriptors[stepIndex]
    if (!tutorialStepSatisfied(step.id, state)) {
      break
    }

    if (!completion[step.id]) {
      completion[step.id] = true
      newlyCompleted.push(step.id)
      changed = true
    }

    stepIndex += 1
  }

  const currentStepIndex = currentTutorialStepIndex(completion)
  const complete = currentStepIndex >= tutorialStepDescriptors.length
  const checklist = buildTutorialChecklist(completion)

  return { completion, checklist, currentStepIndex, complete, newlyCompleted, changed }
}

export function resolveActiveMainQuestId(
  activeMainQuestId: string | null,
  completion: TutorialCompletion,
): string | null {
  const fallbackQuestId = mainQuestDefinitions.find(
    (quest) => quest.stepIds.some((stepId) => !completion[stepId]),
  )?.id
    ?? mainQuestDefinitions.at(-1)?.id
    ?? null

  if (typeof activeMainQuestId !== 'string' || activeMainQuestId.trim().length === 0) {
    return fallbackQuestId
  }

  const selectedQuest = mainQuestDefinitions.find((quest) => quest.id === activeMainQuestId)
  if (!selectedQuest) {
    return fallbackQuestId
  }

  const selectedQuestComplete =
    selectedQuest.stepIds.length > 0 &&
    selectedQuest.stepIds.every((stepId) => completion[stepId])

  return selectedQuestComplete ? fallbackQuestId : selectedQuest.id
}

export function resolveTutorialStepTitle(stepId: TutorialStepId): string | null {
  const step = tutorialStepDescriptors.find((entry) => entry.id === stepId)
  return step ? step.title : null
}
