import { describe, expect, it } from 'vitest'
import { mainQuestDefinitions } from '@features/quests/questDefinitions'
import type { SimulationLogEntry } from '@state/types'
import { createTutorialCompletion } from './tutorialProgression'
import {
  applyLegacyFeedCrewRewardBackfill,
  applyQuestRewardTransitions,
} from './rewardStateTransitions'

function appendLog({ logs, message }: { logs: SimulationLogEntry[]; message: string }): SimulationLogEntry[] {
  return [{ id: logs.length + 1, message, timestamp: 0 }, ...logs]
}

describe('rewardStateTransitions', () => {
  it('applies legacy feed crew backfill when reward was already claimed', () => {
    const result = applyLegacyFeedCrewRewardBackfill(
      {
        inventory: {},
        fridge: {
          unlocked: false,
          galaxyBars: 0,
          capacity: 5,
          waterLiters: 0,
          waterCapacityLiters: 10,
        },
        simulationLog: [],
        claimedQuestRewardIds: ['main-feed-the-crew'],
      },
      appendLog,
    )

    expect(result.rewardsApplied).toBe(true)
    expect(result.fridge.unlocked).toBe(true)
    expect(result.simulationLog.at(0)?.message).toContain('Legacy quest reward backfill applied')
  })

  it('claims completed main quest rewards and removes completed pins', () => {
    const completion = createTutorialCompletion()
    const firstQuest = mainQuestDefinitions[0]
    firstQuest.stepIds.forEach((stepId) => {
      completion[stepId] = true
    })

    const result = applyQuestRewardTransitions(
      {
        inventory: {},
        sideQuestProgressInventory: {},
        fridge: {
          unlocked: false,
          galaxyBars: 0,
          capacity: 5,
          waterLiters: 0,
          waterCapacityLiters: 10,
        },
        simulationLog: [],
        claimedQuestRewardIds: [],
        questRewardNotifications: [],
        questRewardHistory: [],
        pinnedQuestIds: [firstQuest.id],
        tutorialCompletion: completion,
        credits: 0,
      },
      {
        questRewardHistoryLimit: 32,
      },
      appendLog,
    )

    expect(result.claimedQuestRewardIds).toContain(firstQuest.id)
    expect(result.questRewardNotifications.some((entry) => entry.questId === firstQuest.id)).toBe(true)
    expect(result.pinnedQuestIds).not.toContain(firstQuest.id)
    expect(result.pinnedQuestIdsChanged).toBe(true)
  })
})
