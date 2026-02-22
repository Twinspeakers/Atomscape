import {
  DEFAULT_START_SECTOR_ID,
  resolveSectorWorldTargetCount,
} from '@domain/spec/sectorSpec'
import type { ExtractionTargetPayload, SimulationLogEntry } from '@state/types'
import { computeMinActiveWorldTargetCount } from '@state/world/worldStateUtils'
import { describe, expect, it, vi } from 'vitest'
import {
  buildWorldTargetActionBindings,
  type WorldTargetActionState,
} from './worldTargetActionBindings'

function appendLog({ logs, message }: { logs: SimulationLogEntry[]; message: string }): SimulationLogEntry[] {
  return [
    {
      id: logs.length + 1,
      message,
      timestamp: logs.length + 1,
    },
    ...logs,
  ]
}

function createTarget(overrides: Partial<ExtractionTargetPayload> = {}): ExtractionTargetPayload {
  return {
    targetId: 'target-a',
    classId: 'rockBody',
    kind: 'asteroid',
    zoneId: 'nearStationBelt',
    riskRating: 0.4,
    signatureElementSymbol: 'Si',
    expectedYield: {
      rubble: 1,
    },
    ...overrides,
  }
}

function createState(overrides: Partial<WorldTargetActionState> = {}): WorldTargetActionState {
  const worldTargetCount = resolveSectorWorldTargetCount(DEFAULT_START_SECTOR_ID)

  return {
    activeSectorId: DEFAULT_START_SECTOR_ID,
    worldDepletedTargetIds: [],
    worldDestroyedCount: 0,
    worldRemainingCount: worldTargetCount,
    worldVisitedZoneIds: [],
    worldZoneDestroyedCounts: {},
    worldClassDestroyedCounts: {},
    visitedCleanupZones: [],
    simulationLog: [],
    ...overrides,
  }
}

describe('worldTargetActionBindings', () => {
  it('records world target depletion and updates tutorial progress', () => {
    let state = createState()
    const updateTutorialProgress = vi.fn()

    const bindings = buildWorldTargetActionBindings({
      setState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      appendLog,
      updateTutorialProgress,
    })

    bindings.recordWorldTargetDepleted(createTarget())

    expect(state.worldDepletedTargetIds).toContain('target-a')
    expect(state.worldDestroyedCount).toBe(1)
    expect(state.worldVisitedZoneIds).toContain('nearStationBelt')
    expect(state.worldClassDestroyedCounts.rockBody).toBe(1)
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })

  it('keeps floor by replenishing oldest depleted targets', () => {
    const worldTargetCount = resolveSectorWorldTargetCount(DEFAULT_START_SECTOR_ID)
    const floor = computeMinActiveWorldTargetCount(worldTargetCount)
    const maxDepletedCount = Math.max(0, worldTargetCount - floor)
    const nearDepletedIds = Array.from(
      { length: maxDepletedCount },
      (_, index) => `target-${index}`,
    )
    let state = createState({
      worldDepletedTargetIds: nearDepletedIds,
      worldDestroyedCount: nearDepletedIds.length,
      worldRemainingCount: floor,
      worldVisitedZoneIds: ['nearStationBelt'],
      worldZoneDestroyedCounts: { nearStationBelt: nearDepletedIds.length },
      worldClassDestroyedCounts: { rockBody: nearDepletedIds.length },
      visitedCleanupZones: ['nearStationBelt'],
    })
    const updateTutorialProgress = vi.fn()

    const bindings = buildWorldTargetActionBindings({
      setState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      appendLog,
      updateTutorialProgress,
    })

    bindings.recordWorldTargetDepleted(
      createTarget({
        targetId: 'target-final',
        classId: 'compositeJunk',
        kind: 'spaceJunk',
        zoneId: 'highRiskSalvagePocket',
      }),
    )

    expect(state.worldDepletedTargetIds).toHaveLength(maxDepletedCount)
    expect(state.worldDepletedTargetIds).not.toContain('target-0')
    expect(state.worldDepletedTargetIds).toContain('target-final')
    expect(state.worldRemainingCount).toBe(floor)
    expect(state.worldClassDestroyedCounts.compositeJunk).toBe(1)
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })
})
