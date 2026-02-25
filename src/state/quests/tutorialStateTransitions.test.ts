import { mainQuestDefinitions } from '@features/quests/questDefinitions'
import { describe, expect, it } from 'vitest'
import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import {
  createTutorialCompletion,
} from '@state/quests/tutorialProgression'
import {
  applyTutorialProgressTransition,
  type TutorialProgressTransitionState,
} from './tutorialStateTransitions'

function appendLog({ logs, message }: { logs: { id: number; message: string; timestamp: number }[]; message: string }) {
  return [
    {
      id: logs.length + 1,
      message,
      timestamp: logs.length + 1,
    },
    ...logs,
  ]
}

function createState(overrides?: Partial<TutorialProgressTransitionState>): TutorialProgressTransitionState {
  const completion = createTutorialCompletion()
  const state = {
    stationDistance: 0,
    labActiveTab: 'sorting',
    charging: false,
    docked: false,
    containmentOn: false,
    energy: 100,
    inventory: {},
    simulationSummary: {
      chargingRate: 0,
      containmentDrain: 0,
      recombinationRate: 0,
      inRange: true,
      netEnergyPerSecond: 0,
    },
    extractionEvents: [],
    worldClassDestroyedCounts: {},
    visitedCleanupZones: [],
    worldVisitedZoneIds: [],
    tutorialCompletion: completion,
    atomCounter: computeAtomTotals({}),
    fridge: {
      unlocked: false,
      galaxyBars: 0,
      capacity: 40,
    },
    simulationLog: [],
    claimedQuestRewardIds: [],
    questRewardNotifications: [],
    questRewardHistory: [],
    pinnedQuestIds: [],
    tutorialEnabled: true,
    tutorialComplete: false,
    tutorialCurrentStepIndex: 0,
    activeMainQuestId: mainQuestDefinitions[0]?.id ?? null,
    credits: 0,
    galaxyBarsCrafted: 0,
    ...overrides,
  } as TutorialProgressTransitionState

  state.galaxyBarsCrafted = state.galaxyBarsCrafted ?? 0
  return state
}

describe('tutorialStateTransitions', () => {
  it('returns noop when tutorial is disabled and no reward backfill is needed', () => {
    const result = applyTutorialProgressTransition(
      createState({
        tutorialEnabled: false,
      }),
      { questRewardHistoryLimit: 32 },
      appendLog,
    )

    expect(result.kind).toBe('noop')
  })

  it('applies legacy feed-crew reward backfill while tutorial is disabled', () => {
    const result = applyTutorialProgressTransition(
      createState({
        tutorialEnabled: false,
        claimedQuestRewardIds: ['main-feed-the-crew'],
        fridge: {
          unlocked: false,
          galaxyBars: 0,
          capacity: 40,
        },
      }),
      { questRewardHistoryLimit: 32 },
      appendLog,
    )

    expect(result.kind).toBe('updated')
    if (result.kind !== 'updated') {
      throw new Error('Expected updated transition.')
    }

    expect(result.patch.fridge?.unlocked).toBe(true)
    expect(result.patch.simulationLog?.[0]?.message).toContain('Legacy quest reward backfill applied')
    expect(result.persistUiPreferences).toBe(false)
  })

  it('flags ui preference persistence when active quest id needs resolution', () => {
    const result = applyTutorialProgressTransition(
      createState({
        activeMainQuestId: null,
      }),
      { questRewardHistoryLimit: 32 },
      appendLog,
    )

    expect(result.kind).toBe('updated')
    if (result.kind !== 'updated') {
      throw new Error('Expected updated transition.')
    }

    expect(result.persistUiPreferences).toBe(true)
    expect(result.patch.activeMainQuestId).toBe(mainQuestDefinitions[0]?.id ?? null)
  })
})
