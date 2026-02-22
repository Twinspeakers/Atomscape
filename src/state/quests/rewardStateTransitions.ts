import {
  firstContractSideQuest,
  mainQuestDefinitions,
  type QuestRewardDefinition,
} from '@features/quests/questDefinitions'
import {
  applyQuestRewardGrants,
  buildQuestRewardNotification,
} from '@state/quests/rewardUtils'
import type {
  FridgeState,
  QuestRewardNotification,
  ResourceInventory,
  SimulationLogEntry,
} from '@state/types'
import type { TutorialCompletion } from './tutorialProgression'

const FEED_CREW_QUEST_ID = 'main-feed-the-crew'
const feedCrewQuest = mainQuestDefinitions.find((quest) => quest.id === FEED_CREW_QUEST_ID)

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface LegacyRewardBackfillState {
  inventory: ResourceInventory
  fridge: FridgeState
  simulationLog: SimulationLogEntry[]
  claimedQuestRewardIds: string[]
}

export interface LegacyRewardBackfillResult extends LegacyRewardBackfillState {
  rewardsApplied: boolean
  persistInventory: boolean
}

export function applyLegacyFeedCrewRewardBackfill(
  state: LegacyRewardBackfillState,
  appendLog: AppendLog,
): LegacyRewardBackfillResult {
  let inventory = state.inventory
  let fridge = state.fridge
  let simulationLog = state.simulationLog
  let rewardsApplied = false
  let persistInventory = false

  const feedCrewClaimed = Boolean(
    feedCrewQuest
      && state.claimedQuestRewardIds.includes(feedCrewQuest.id),
  )

  if (feedCrewQuest && feedCrewClaimed && !fridge.unlocked) {
    const legacyBackfill = applyQuestRewardGrants(inventory, fridge, feedCrewQuest.rewards)
    if (legacyBackfill.inventoryChanged || legacyBackfill.fridgeChanged) {
      inventory = legacyBackfill.inventory
      fridge = legacyBackfill.fridge
      rewardsApplied = true
      if (legacyBackfill.inventoryChanged) {
        persistInventory = true
      }
      simulationLog = appendLog({
        logs: simulationLog,
        message: 'Legacy quest reward backfill applied: Feed The Crew fridge unlock package restored.',
      })
    }
  }

  return {
    inventory,
    fridge,
    simulationLog,
    claimedQuestRewardIds: state.claimedQuestRewardIds,
    rewardsApplied,
    persistInventory,
  }
}

export interface QuestRewardTransitionState {
  inventory: ResourceInventory
  sideQuestProgressInventory: ResourceInventory
  fridge: FridgeState
  simulationLog: SimulationLogEntry[]
  claimedQuestRewardIds: string[]
  questRewardNotifications: QuestRewardNotification[]
  questRewardHistory: QuestRewardNotification[]
  pinnedQuestIds: string[]
  tutorialCompletion: TutorialCompletion
  credits: number
}

export interface QuestRewardTransitionResult {
  inventory: ResourceInventory
  fridge: FridgeState
  simulationLog: SimulationLogEntry[]
  claimedQuestRewardIds: string[]
  questRewardNotifications: QuestRewardNotification[]
  questRewardHistory: QuestRewardNotification[]
  pinnedQuestIds: string[]
  rewardsApplied: boolean
  persistInventory: boolean
  pinnedQuestIdsChanged: boolean
}

interface ApplyQuestRewardTransitionsOptions {
  questRewardHistoryLimit: number
}

export function applyQuestRewardTransitions(
  state: QuestRewardTransitionState,
  options: ApplyQuestRewardTransitionsOptions,
  appendLog: AppendLog,
): QuestRewardTransitionResult {
  let inventory = state.inventory
  let fridge = state.fridge
  let simulationLog = state.simulationLog
  let claimedQuestRewardIds = state.claimedQuestRewardIds
  let questRewardNotifications = state.questRewardNotifications
  let questRewardHistory = state.questRewardHistory
  let pinnedQuestIds = state.pinnedQuestIds

  let rewardsApplied = false
  let persistInventory = false
  let pinnedQuestIdsChanged = false

  const claimQuestRewards = (questId: string, questTitle: string, rewards: QuestRewardDefinition[]) => {
    if (claimedQuestRewardIds.includes(questId)) {
      return
    }

    const rewardResult = applyQuestRewardGrants(inventory, fridge, rewards)
    const unlockLines = rewards.flatMap((reward) => reward.grants?.unlocks ?? [])
    const grantsSummary = rewardResult.grantedLines.length > 0
      ? `Grants: ${rewardResult.grantedLines.join(', ')}.`
      : 'Grants: none.'
    const unlockSummary = unlockLines.length > 0
      ? ` Unlocks: ${unlockLines.join('; ')}.`
      : ''

    inventory = rewardResult.inventory
    fridge = rewardResult.fridge
    rewardsApplied = true
    claimedQuestRewardIds = [...claimedQuestRewardIds, questId]
    if (rewardResult.inventoryChanged) {
      persistInventory = true
    }

    simulationLog = appendLog({
      logs: simulationLog,
      message: `Quest rewards delivered - ${questTitle}. ${grantsSummary}${unlockSummary}`,
    })

    const questRewardNotification = buildQuestRewardNotification(
      questId,
      questTitle,
      rewards,
      rewardResult.grantedLines,
      unlockLines,
    )

    questRewardNotifications = [
      ...questRewardNotifications,
      questRewardNotification,
    ]
    questRewardHistory = [...questRewardHistory, questRewardNotification]
      .slice(-options.questRewardHistoryLimit)
  }

  const completedQuestIds = new Set<string>()
  mainQuestDefinitions.forEach((quest) => {
    const complete = quest.stepIds.every((stepId) => state.tutorialCompletion[stepId])
    if (complete) {
      completedQuestIds.add(quest.id)
      claimQuestRewards(quest.id, quest.title, quest.rewards)
    }
  })

  const sideQuestCraftComplete = (state.sideQuestProgressInventory.boxOfSand ?? 0) > 0 || state.credits > 0
  const sideQuestSellComplete = state.credits > 0
  const sideQuestComplete = sideQuestCraftComplete && sideQuestSellComplete
  if (sideQuestComplete) {
    completedQuestIds.add(firstContractSideQuest.id)
    claimQuestRewards(
      firstContractSideQuest.id,
      firstContractSideQuest.title,
      firstContractSideQuest.rewards,
    )
  }

  if (pinnedQuestIds.length > 0) {
    const nextPinnedQuestIds = pinnedQuestIds.filter((questId) => !completedQuestIds.has(questId))
    if (nextPinnedQuestIds.length !== pinnedQuestIds.length) {
      pinnedQuestIds = nextPinnedQuestIds
      pinnedQuestIdsChanged = true
    }
  }

  return {
    inventory,
    fridge,
    simulationLog,
    claimedQuestRewardIds,
    questRewardNotifications,
    questRewardHistory,
    pinnedQuestIds,
    rewardsApplied,
    persistInventory,
    pinnedQuestIdsChanged,
  }
}
