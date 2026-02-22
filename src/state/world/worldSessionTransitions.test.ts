import { describe, expect, it } from 'vitest'
import {
  resolveSectorDefinition,
  resolveSectorWorldTargetCount,
} from '@domain/spec/sectorSpec'
import { computeMinActiveWorldTargetCount } from '@state/world/worldStateUtils'
import type { SimulationLogEntry } from '@state/types'
import {
  applyWorldTargetDepletionTransition,
  buildWorldSessionFallbackState,
  resolveHydratedWorldSessionTransition,
} from './worldSessionTransitions'

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

describe('worldSessionTransitions', () => {
  it('builds sector fallback world state', () => {
    const sectorId = 'earthCorridor'
    const fallback = buildWorldSessionFallbackState(sectorId)
    const worldTargetCount = resolveSectorWorldTargetCount(sectorId)

    expect(fallback.activeSectorId).toBe(sectorId)
    expect(fallback.worldStateLoaded).toBe(true)
    expect(fallback.worldSeed).toBe(resolveSectorDefinition(sectorId).worldSeed)
    expect(fallback.worldRemainingCount).toBe(worldTargetCount)
    expect(fallback.worldDepletedTargetIds).toHaveLength(0)
    expect(fallback.worldDestroyedCount).toBe(0)
    expect(fallback.worldVisitedZoneIds).toEqual([])
    expect(fallback.visitedCleanupZones).toEqual([])
  })

  it('hydrates sanitized world state and replenishes above-floor depletion', () => {
    const sectorId = 'earthCorridor'
    const worldTargetCount = resolveSectorWorldTargetCount(sectorId)
    const minActiveWorldTargetCount = computeMinActiveWorldTargetCount(worldTargetCount)
    const depletedCount = worldTargetCount - (minActiveWorldTargetCount - 1)
    const depletedTargetIds = Array.from(
      { length: depletedCount },
      (_, index) => `hydrate-target-${index}`,
    )
    const baseLog: SimulationLogEntry[] = [
      {
        id: 1,
        message: 'base log',
        timestamp: 1,
      },
    ]

    const hydrated = resolveHydratedWorldSessionTransition(
      {
        sectorId,
        worldSessionRow: {
          id: 'world-session-earth',
          version: 1,
          sectorId,
          seed: 'hydrate-seed',
          depletedTargetIds,
          visitedZoneIds: ['nearStationBelt'],
          zoneDestroyedCounts: { nearStationBelt: depletedTargetIds.length },
          classDestroyedCounts: { rockBody: depletedTargetIds.length },
          destroyedCount: depletedTargetIds.length,
          updatedAt: 1,
        },
        worldSessionVersion: 1,
        existingVisitedCleanupZones: ['denseDebrisLane'],
        simulationLog: baseLog,
      },
      appendLog,
    )

    const maxDepletedTargetCount = Math.max(0, worldTargetCount - minActiveWorldTargetCount)
    expect(hydrated.worldDepletedTargetIds).toHaveLength(maxDepletedTargetCount)
    expect(hydrated.worldDepletedTargetIds).not.toContain('hydrate-target-0')
    expect(hydrated.worldDestroyedCount).toBe(maxDepletedTargetCount)
    expect(hydrated.worldRemainingCount).toBe(minActiveWorldTargetCount)
    expect(hydrated.worldSeed).toBe('hydrate-seed')
    expect(hydrated.visitedCleanupZones).toEqual(['denseDebrisLane'])
    expect(hydrated.worldVisitedZoneIds).toEqual(['nearStationBelt'])
    expect(hydrated.simulationLog[0]?.message).toContain('Cleanup wave replenished 1 targets')
  })

  it('returns fallback world projection when hydrated row is invalid', () => {
    const sectorId = 'marsCorridor'
    const baseLog: SimulationLogEntry[] = [
      {
        id: 1,
        message: 'base log',
        timestamp: 1,
      },
    ]

    const hydrated = resolveHydratedWorldSessionTransition(
      {
        sectorId,
        worldSessionRow: null,
        worldSessionVersion: 1,
        existingVisitedCleanupZones: ['nearStationBelt'],
        simulationLog: baseLog,
      },
      appendLog,
    )

    expect(hydrated.worldSeed).toBe(resolveSectorDefinition(sectorId).worldSeed)
    expect(hydrated.worldDestroyedCount).toBe(0)
    expect(hydrated.worldDepletedTargetIds).toEqual([])
    expect(hydrated.visitedCleanupZones).toEqual([])
    expect(hydrated.simulationLog).toBe(baseLog)
  })

  it('applies depletion transition with floor replenishment and duplicate suppression', () => {
    const sectorId = 'earthCorridor'
    const worldTargetCount = resolveSectorWorldTargetCount(sectorId)
    const minActiveWorldTargetCount = computeMinActiveWorldTargetCount(worldTargetCount)
    const maxDepletedTargetCount = Math.max(0, worldTargetCount - minActiveWorldTargetCount)
    const baseDepleted = Array.from(
      { length: maxDepletedTargetCount },
      (_, index) => `target-${index}`,
    )

    const duplicate = applyWorldTargetDepletionTransition(
      {
        activeSectorId: sectorId,
        worldDepletedTargetIds: baseDepleted,
        worldVisitedZoneIds: ['nearStationBelt'],
        worldZoneDestroyedCounts: { nearStationBelt: baseDepleted.length },
        worldClassDestroyedCounts: { rockBody: baseDepleted.length },
        visitedCleanupZones: ['nearStationBelt'],
        simulationLog: [],
      },
      {
        targetId: baseDepleted[0],
        classId: 'compositeJunk',
        kind: 'spaceJunk',
        zoneId: 'highRiskSalvagePocket',
        riskRating: 0.8,
        signatureElementSymbol: 'C',
        expectedYield: { rubble: 1 },
      },
      appendLog,
    )

    expect(duplicate).toBeNull()

    const transitioned = applyWorldTargetDepletionTransition(
      {
        activeSectorId: sectorId,
        worldDepletedTargetIds: baseDepleted,
        worldVisitedZoneIds: ['nearStationBelt'],
        worldZoneDestroyedCounts: { nearStationBelt: baseDepleted.length },
        worldClassDestroyedCounts: { rockBody: baseDepleted.length },
        visitedCleanupZones: ['nearStationBelt'],
        simulationLog: [],
      },
      {
        targetId: 'target-final',
        classId: 'compositeJunk',
        kind: 'spaceJunk',
        zoneId: 'highRiskSalvagePocket',
        riskRating: 0.8,
        signatureElementSymbol: 'C',
        expectedYield: { rubble: 1 },
      },
      appendLog,
    )

    expect(transitioned).not.toBeNull()
    if (!transitioned) {
      return
    }

    expect(transitioned.worldDepletedTargetIds).toHaveLength(maxDepletedTargetCount)
    expect(transitioned.worldDepletedTargetIds).not.toContain('target-0')
    expect(transitioned.worldDepletedTargetIds).toContain('target-final')
    expect(transitioned.worldDestroyedCount).toBe(maxDepletedTargetCount)
    expect(transitioned.worldRemainingCount).toBe(minActiveWorldTargetCount)
    expect(transitioned.worldZoneDestroyedCounts.highRiskSalvagePocket).toBe(1)
    expect(transitioned.worldClassDestroyedCounts.compositeJunk).toBe(1)
    expect(transitioned.worldVisitedZoneIds).toEqual(
      expect.arrayContaining(['nearStationBelt', 'highRiskSalvagePocket']),
    )
    expect(transitioned.visitedCleanupZones).toEqual(
      expect.arrayContaining(['nearStationBelt', 'highRiskSalvagePocket']),
    )
    expect(transitioned.simulationLog[0]?.message).toContain('Cleanup wave replenished 1 targets')
  })
})
