import { describe, expect, it } from 'vitest'
import { mainQuestDefinitions } from '../features/quests/questDefinitions'
import { DEFAULT_PINNED_QUEST_IDS } from '@state/store'

describe('store quest defaults', () => {
  it('derives default pinned quest from the first main quest definition', () => {
    const expectedDefaultQuestId = mainQuestDefinitions.at(0)?.id

    if (!expectedDefaultQuestId) {
      throw new Error('Expected at least one main quest definition.')
    }

    expect(DEFAULT_PINNED_QUEST_IDS).toEqual([expectedDefaultQuestId])
  })
})
