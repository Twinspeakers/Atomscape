import { computeAtomTotals, type AtomTotals } from '@domain/resources/resourceCatalog'
import {
  applyLegacyFeedCrewRewardBackfill,
  applyQuestRewardTransitions,
} from '@state/quests/rewardStateTransitions'
import {
  evaluateTutorial,
  resolveActiveMainQuestId,
  resolveTutorialStepTitle,
  type TutorialCompletion,
  type TutorialProgressState,
} from '@state/quests/tutorialProgression'
import type {
  FridgeState,
  QuestRewardNotification,
  ResourceInventory,
  SimulationLogEntry,
  TutorialChecklistItem,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface TutorialProgressTransitionState extends TutorialProgressState {
  atomCounter: AtomTotals
  fridge: FridgeState
  simulationLog: SimulationLogEntry[]
  claimedQuestRewardIds: string[]
  questRewardNotifications: QuestRewardNotification[]
  questRewardHistory: QuestRewardNotification[]
  pinnedQuestIds: string[]
  tutorialEnabled: boolean
  tutorialComplete: boolean
  tutorialCurrentStepIndex: number
  activeMainQuestId: string | null
  credits: number
}

interface ApplyTutorialProgressTransitionOptions {
  questRewardHistoryLimit: number
}

export interface TutorialProgressTransitionPatch {
  tutorialCompletion?: TutorialCompletion
  tutorialChecklist?: TutorialChecklistItem[]
  tutorialCurrentStepIndex?: number
  tutorialComplete?: boolean
  activeMainQuestId?: string | null
  inventory?: ResourceInventory
  fridge?: FridgeState
  atomCounter?: AtomTotals
  claimedQuestRewardIds?: string[]
  pinnedQuestIds?: string[]
  simulationLog?: SimulationLogEntry[]
  questRewardNotifications?: QuestRewardNotification[]
  questRewardHistory?: QuestRewardNotification[]
}

export type TutorialProgressTransitionResult =
  | {
      kind: 'noop'
      persistInventory: false
      persistUiPreferences: false
    }
  | {
      kind: 'updated'
      patch: TutorialProgressTransitionPatch
      persistInventory: boolean
      persistUiPreferences: boolean
    }

export function applyTutorialProgressTransition(
  state: TutorialProgressTransitionState,
  options: ApplyTutorialProgressTransitionOptions,
  appendLog: AppendLog,
): TutorialProgressTransitionResult {
  let persistInventory = false
  let persistUiPreferences = false
  let simulationLog = state.simulationLog
  let inventory = state.inventory
  let fridge = state.fridge
  let atomCounter = state.atomCounter
  let claimedQuestRewardIds = state.claimedQuestRewardIds
  let questRewardNotifications = state.questRewardNotifications
  let questRewardHistory = state.questRewardHistory
  let pinnedQuestIds = state.pinnedQuestIds
  let rewardsApplied = false
  let pinnedQuestIdsChanged = false

  const legacyBackfill = applyLegacyFeedCrewRewardBackfill(
    {
      inventory,
      fridge,
      simulationLog,
      claimedQuestRewardIds,
    },
    appendLog,
  )
  inventory = legacyBackfill.inventory
  fridge = legacyBackfill.fridge
  simulationLog = legacyBackfill.simulationLog
  rewardsApplied = rewardsApplied || legacyBackfill.rewardsApplied
  persistInventory = persistInventory || legacyBackfill.persistInventory

  if (!state.tutorialEnabled) {
    if (!rewardsApplied) {
      return {
        kind: 'noop',
        persistInventory: false,
        persistUiPreferences: false,
      }
    }

    atomCounter = computeAtomTotals(inventory)
    return {
      kind: 'updated',
      patch: {
        inventory,
        fridge,
        atomCounter,
        simulationLog,
      },
      persistInventory,
      persistUiPreferences,
    }
  }

  const evaluation = evaluateTutorial(state)
  const nextActiveMainQuestId = resolveActiveMainQuestId(
    state.activeMainQuestId,
    evaluation.completion,
  )
  const activeMainQuestChanged = nextActiveMainQuestId !== state.activeMainQuestId
  if (activeMainQuestChanged) {
    persistUiPreferences = true
  }

  const rewardTransition = applyQuestRewardTransitions(
    {
      inventory,
      sideQuestProgressInventory: state.inventory,
      fridge,
      simulationLog,
      claimedQuestRewardIds,
      questRewardNotifications,
      questRewardHistory,
      pinnedQuestIds,
      tutorialCompletion: evaluation.completion,
      credits: state.credits,
    },
    {
      questRewardHistoryLimit: options.questRewardHistoryLimit,
    },
    appendLog,
  )
  inventory = rewardTransition.inventory
  fridge = rewardTransition.fridge
  simulationLog = rewardTransition.simulationLog
  claimedQuestRewardIds = rewardTransition.claimedQuestRewardIds
  questRewardNotifications = rewardTransition.questRewardNotifications
  questRewardHistory = rewardTransition.questRewardHistory
  pinnedQuestIds = rewardTransition.pinnedQuestIds
  rewardsApplied = rewardsApplied || rewardTransition.rewardsApplied
  persistInventory = persistInventory || rewardTransition.persistInventory
  pinnedQuestIdsChanged = rewardTransition.pinnedQuestIdsChanged
  if (pinnedQuestIdsChanged) {
    persistUiPreferences = true
  }

  if (
    !evaluation.changed
    && evaluation.currentStepIndex === state.tutorialCurrentStepIndex
    && evaluation.complete === state.tutorialComplete
    && !rewardsApplied
    && !activeMainQuestChanged
    && !pinnedQuestIdsChanged
  ) {
    return {
      kind: 'noop',
      persistInventory: false,
      persistUiPreferences: false,
    }
  }

  evaluation.newlyCompleted.forEach((stepId) => {
    const stepTitle = resolveTutorialStepTitle(stepId)
    if (stepTitle) {
      simulationLog = appendLog({
        logs: simulationLog,
        message: `Quest objective complete: ${stepTitle}`,
      })
    }
  })

  if (evaluation.complete && !state.tutorialComplete) {
    simulationLog = appendLog({
      logs: simulationLog,
      message: 'Questline complete: You now control the full station loop. Continue optimizing your production chain.',
    })
  }

  if (rewardsApplied) {
    atomCounter = computeAtomTotals(inventory)
  }

  return {
    kind: 'updated',
    patch: {
      tutorialCompletion: evaluation.completion,
      tutorialChecklist: evaluation.checklist,
      tutorialCurrentStepIndex: evaluation.currentStepIndex,
      tutorialComplete: evaluation.complete,
      activeMainQuestId: nextActiveMainQuestId,
      inventory: rewardsApplied ? inventory : state.inventory,
      fridge: rewardsApplied ? fridge : state.fridge,
      atomCounter,
      claimedQuestRewardIds,
      pinnedQuestIds,
      simulationLog,
      questRewardNotifications,
      questRewardHistory,
    },
    persistInventory,
    persistUiPreferences,
  }
}
