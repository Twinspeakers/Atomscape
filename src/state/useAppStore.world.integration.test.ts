import { STATION_DOCKING_RANGE_METERS } from '@domain/spec/gameSpec'
import { EARTH_CORRIDOR_SECTOR_ID, resolveSectorWorldTargetCount } from '@domain/spec/sectorSpec'
import { gameDb } from '@platform/db/gameDb'
import { describe, expect, it, vi } from 'vitest'
import { computeMinActiveWorldTargetCount, useAppStore } from '@state/store'

describe('world session persistence invariants', () => {
  const worldTargetCount = resolveSectorWorldTargetCount(EARTH_CORRIDOR_SECTOR_ID)
  const minActiveTargetFloor = computeMinActiveWorldTargetCount(worldTargetCount)

  it('deduplicates depleted targets and hydrates world session snapshots safely', async () => {
    const initialState = useAppStore.getState()
    const originalSnapshot = {
      activeSectorId: initialState.activeSectorId,
      worldStateLoaded: initialState.worldStateLoaded,
      worldSeed: initialState.worldSeed,
      worldDepletedTargetIds: [...initialState.worldDepletedTargetIds],
      worldDestroyedCount: initialState.worldDestroyedCount,
      worldRemainingCount: initialState.worldRemainingCount,
      worldVisitedZoneIds: [...initialState.worldVisitedZoneIds],
      worldZoneDestroyedCounts: { ...initialState.worldZoneDestroyedCounts },
      worldClassDestroyedCounts: { ...initialState.worldClassDestroyedCounts },
      visitedCleanupZones: [...initialState.visitedCleanupZones],
      activeCleanupZoneId: initialState.activeCleanupZoneId,
    }

    const persistedWorldRow = {
      id: 'active-world-session',
      version: 1,
      seed: 'test-world-seed',
      depletedTargetIds: ['target-alpha', 'target-alpha', 'target-beta'],
      visitedZoneIds: ['highRiskSalvagePocket', 'nearStationBelt', 'nearStationBelt'],
      zoneDestroyedCounts: { highRiskSalvagePocket: 2, nearStationBelt: 1, fakeZone: 999 },
      classDestroyedCounts: { compositeJunk: 2, metalScrap: 1, fakeClass: 999 },
      destroyedCount: 1,
      updatedAt: Date.now(),
    }

    const worldSessionGetSpy = vi.spyOn(gameDb.worldSession, 'get').mockResolvedValue(
      persistedWorldRow as Awaited<ReturnType<typeof gameDb.worldSession.get>>,
    )

    try {
      useAppStore.setState({
        activeSectorId: EARTH_CORRIDOR_SECTOR_ID,
        worldStateLoaded: false,
        worldSeed: 'reset-seed',
        worldDepletedTargetIds: [],
        worldDestroyedCount: 0,
        worldRemainingCount: worldTargetCount,
        worldVisitedZoneIds: [],
        worldZoneDestroyedCounts: {},
        worldClassDestroyedCounts: {},
        visitedCleanupZones: [],
        activeCleanupZoneId: null,
      })

      await useAppStore.getState().hydrateWorldSession()

      const hydrated = useAppStore.getState()
      expect(hydrated.worldStateLoaded).toBe(true)
      expect(hydrated.worldSeed).toBe('test-world-seed')
      expect(hydrated.worldDepletedTargetIds).toEqual(['target-alpha', 'target-beta'])
      expect(hydrated.worldDestroyedCount).toBe(2)
      expect(hydrated.worldRemainingCount).toBe(worldTargetCount - 2)
      expect(hydrated.worldVisitedZoneIds).toEqual(['highRiskSalvagePocket', 'nearStationBelt'])
      expect(hydrated.visitedCleanupZones).toEqual(['highRiskSalvagePocket', 'nearStationBelt'])
      expect(hydrated.worldZoneDestroyedCounts.highRiskSalvagePocket).toBe(2)
      expect(hydrated.worldZoneDestroyedCounts.nearStationBelt).toBe(1)
      expect((hydrated.worldZoneDestroyedCounts as Record<string, number>).fakeZone).toBeUndefined()
      expect(hydrated.worldClassDestroyedCounts.compositeJunk).toBe(2)
      expect(hydrated.worldClassDestroyedCounts.metalScrap).toBe(1)
      expect((hydrated.worldClassDestroyedCounts as Record<string, number>).fakeClass).toBeUndefined()

      hydrated.recordWorldTargetDepleted({
        targetId: 'target-beta',
        classId: 'compositeJunk',
        kind: 'spaceJunk',
        zoneId: 'highRiskSalvagePocket',
        riskRating: 0.8,
        signatureElementSymbol: 'C',
        expectedYield: { rubble: 1 },
      })
      hydrated.recordWorldTargetDepleted({
        targetId: 'target-gamma',
        classId: 'compositeJunk',
        kind: 'spaceJunk',
        zoneId: 'highRiskSalvagePocket',
        riskRating: 0.8,
        signatureElementSymbol: 'C',
        expectedYield: { rubble: 1 },
      })

      const afterDepletionEvents = useAppStore.getState()
      expect(afterDepletionEvents.worldDepletedTargetIds).toEqual([
        'target-alpha',
        'target-beta',
        'target-gamma',
      ])
      expect(afterDepletionEvents.worldDestroyedCount).toBe(3)
      expect(afterDepletionEvents.worldRemainingCount).toBe(worldTargetCount - 3)
      expect(afterDepletionEvents.worldZoneDestroyedCounts.highRiskSalvagePocket).toBe(3)
      expect(afterDepletionEvents.worldClassDestroyedCounts.compositeJunk).toBe(3)
    } finally {
      worldSessionGetSpy.mockRestore()
      useAppStore.setState({
        activeSectorId: originalSnapshot.activeSectorId,
        worldStateLoaded: originalSnapshot.worldStateLoaded,
        worldSeed: originalSnapshot.worldSeed,
        worldDepletedTargetIds: originalSnapshot.worldDepletedTargetIds,
        worldDestroyedCount: originalSnapshot.worldDestroyedCount,
        worldRemainingCount: originalSnapshot.worldRemainingCount,
        worldVisitedZoneIds: originalSnapshot.worldVisitedZoneIds,
        worldZoneDestroyedCounts: originalSnapshot.worldZoneDestroyedCounts,
        worldClassDestroyedCounts: originalSnapshot.worldClassDestroyedCounts,
        visitedCleanupZones: originalSnapshot.visitedCleanupZones,
        activeCleanupZoneId: originalSnapshot.activeCleanupZoneId,
      })
    }
  })

  it('replenishes oldest depleted targets when active field drops below floor', () => {
    const initialState = useAppStore.getState()
    const originalSnapshot = {
      activeSectorId: initialState.activeSectorId,
      worldStateLoaded: initialState.worldStateLoaded,
      worldSeed: initialState.worldSeed,
      worldDepletedTargetIds: [...initialState.worldDepletedTargetIds],
      worldDestroyedCount: initialState.worldDestroyedCount,
      worldRemainingCount: initialState.worldRemainingCount,
      worldVisitedZoneIds: [...initialState.worldVisitedZoneIds],
      worldZoneDestroyedCounts: { ...initialState.worldZoneDestroyedCounts },
      worldClassDestroyedCounts: { ...initialState.worldClassDestroyedCounts },
      visitedCleanupZones: [...initialState.visitedCleanupZones],
      simulationLog: [...initialState.simulationLog],
    }

    try {
      const priorSeed = 'test-floor-seed'
      const maxDepletedTargetCount = Math.max(0, worldTargetCount - minActiveTargetFloor)
      const nearDepletedIds = Array.from(
        { length: maxDepletedTargetCount },
        (_, index) => `target-${index}`,
      )
      useAppStore.setState({
        activeSectorId: EARTH_CORRIDOR_SECTOR_ID,
        worldStateLoaded: true,
        worldSeed: priorSeed,
        worldDepletedTargetIds: nearDepletedIds,
        worldDestroyedCount: nearDepletedIds.length,
        worldRemainingCount: minActiveTargetFloor,
        worldVisitedZoneIds: ['nearStationBelt'],
        worldZoneDestroyedCounts: { nearStationBelt: nearDepletedIds.length },
        worldClassDestroyedCounts: { rockBody: nearDepletedIds.length },
        visitedCleanupZones: ['nearStationBelt'],
      })

      useAppStore.getState().recordWorldTargetDepleted({
        targetId: 'target-final',
        classId: 'compositeJunk',
        kind: 'spaceJunk',
        zoneId: 'highRiskSalvagePocket',
        riskRating: 0.8,
        signatureElementSymbol: 'C',
        expectedYield: { rubble: 1 },
      })

      const after = useAppStore.getState()
      expect(after.worldSeed).toBe(priorSeed)
      expect(after.worldDepletedTargetIds).toHaveLength(maxDepletedTargetCount)
      expect(after.worldDepletedTargetIds).not.toContain('target-0')
      expect(after.worldDepletedTargetIds).toContain('target-final')
      expect(after.worldDestroyedCount).toBe(maxDepletedTargetCount)
      expect(after.worldRemainingCount).toBe(minActiveTargetFloor)
      expect(after.worldClassDestroyedCounts.compositeJunk).toBe(1)
      expect(after.worldVisitedZoneIds).toEqual(expect.arrayContaining(['nearStationBelt', 'highRiskSalvagePocket']))
      expect(
        after.simulationLog.some((entry) => entry.message.includes(`Cleanup wave replenished 1 targets to maintain at least ${minActiveTargetFloor} active.`)),
      ).toBe(true)
    } finally {
      useAppStore.setState({
        activeSectorId: originalSnapshot.activeSectorId,
        worldStateLoaded: originalSnapshot.worldStateLoaded,
        worldSeed: originalSnapshot.worldSeed,
        worldDepletedTargetIds: originalSnapshot.worldDepletedTargetIds,
        worldDestroyedCount: originalSnapshot.worldDestroyedCount,
        worldRemainingCount: originalSnapshot.worldRemainingCount,
        worldVisitedZoneIds: originalSnapshot.worldVisitedZoneIds,
        worldZoneDestroyedCounts: originalSnapshot.worldZoneDestroyedCounts,
        worldClassDestroyedCounts: originalSnapshot.worldClassDestroyedCounts,
        visitedCleanupZones: originalSnapshot.visitedCleanupZones,
        simulationLog: originalSnapshot.simulationLog,
      })
    }
  })

  it('replenishes low-population world sessions during hydration', async () => {
    const initialState = useAppStore.getState()
    const originalSnapshot = {
      activeSectorId: initialState.activeSectorId,
      worldStateLoaded: initialState.worldStateLoaded,
      worldSeed: initialState.worldSeed,
      worldDepletedTargetIds: [...initialState.worldDepletedTargetIds],
      worldDestroyedCount: initialState.worldDestroyedCount,
      worldRemainingCount: initialState.worldRemainingCount,
      worldVisitedZoneIds: [...initialState.worldVisitedZoneIds],
      worldZoneDestroyedCounts: { ...initialState.worldZoneDestroyedCounts },
      worldClassDestroyedCounts: { ...initialState.worldClassDestroyedCounts },
      visitedCleanupZones: [...initialState.visitedCleanupZones],
      activeCleanupZoneId: initialState.activeCleanupZoneId,
      simulationLog: [...initialState.simulationLog],
    }

    const priorSeed = 'test-hydrate-floor-seed'
    const maxDepletedTargetCount = Math.max(0, worldTargetCount - minActiveTargetFloor)
    const depletedCount = Math.max(0, worldTargetCount - (minActiveTargetFloor - 1))
    const depletedIds = Array.from({ length: depletedCount }, (_, index) => `hydrate-target-${index}`)

    const persistedWorldRow = {
      id: 'active-world-session',
      version: 1,
      seed: priorSeed,
      depletedTargetIds: depletedIds,
      visitedZoneIds: ['nearStationBelt'],
      zoneDestroyedCounts: { nearStationBelt: depletedIds.length },
      classDestroyedCounts: { rockBody: depletedIds.length },
      destroyedCount: depletedIds.length,
      updatedAt: Date.now(),
    }

    const worldSessionGetSpy = vi.spyOn(gameDb.worldSession, 'get').mockResolvedValue(
      persistedWorldRow as Awaited<ReturnType<typeof gameDb.worldSession.get>>,
    )

    try {
      useAppStore.setState({
        activeSectorId: EARTH_CORRIDOR_SECTOR_ID,
        worldStateLoaded: false,
        worldSeed: 'reset-seed',
        worldDepletedTargetIds: [],
        worldDestroyedCount: 0,
        worldRemainingCount: worldTargetCount,
        worldVisitedZoneIds: [],
        worldZoneDestroyedCounts: {},
        worldClassDestroyedCounts: {},
        visitedCleanupZones: [],
        activeCleanupZoneId: null,
      })

      await useAppStore.getState().hydrateWorldSession()

      const hydrated = useAppStore.getState()
      expect(hydrated.worldStateLoaded).toBe(true)
      expect(hydrated.worldSeed).toBe(priorSeed)
      expect(hydrated.worldDepletedTargetIds).toHaveLength(maxDepletedTargetCount)
      expect(hydrated.worldDepletedTargetIds).not.toContain('hydrate-target-0')
      expect(hydrated.worldDestroyedCount).toBe(maxDepletedTargetCount)
      expect(hydrated.worldRemainingCount).toBe(minActiveTargetFloor)
      expect(hydrated.worldVisitedZoneIds).toEqual(['nearStationBelt'])
      expect(hydrated.worldZoneDestroyedCounts.nearStationBelt).toBe(depletedIds.length)
      expect(hydrated.worldClassDestroyedCounts.rockBody).toBe(depletedIds.length)
      expect(
        hydrated.simulationLog.some((entry) => entry.message.includes(`Cleanup wave replenished 1 targets to maintain at least ${minActiveTargetFloor} active.`)),
      ).toBe(true)
    } finally {
      worldSessionGetSpy.mockRestore()
      useAppStore.setState({
        activeSectorId: originalSnapshot.activeSectorId,
        worldStateLoaded: originalSnapshot.worldStateLoaded,
        worldSeed: originalSnapshot.worldSeed,
        worldDepletedTargetIds: originalSnapshot.worldDepletedTargetIds,
        worldDestroyedCount: originalSnapshot.worldDestroyedCount,
        worldRemainingCount: originalSnapshot.worldRemainingCount,
        worldVisitedZoneIds: originalSnapshot.worldVisitedZoneIds,
        worldZoneDestroyedCounts: originalSnapshot.worldZoneDestroyedCounts,
        worldClassDestroyedCounts: originalSnapshot.worldClassDestroyedCounts,
        visitedCleanupZones: originalSnapshot.visitedCleanupZones,
        activeCleanupZoneId: originalSnapshot.activeCleanupZoneId,
        simulationLog: originalSnapshot.simulationLog,
      })
    }
  })
})

describe('station docking sync', () => {
  it('auto-undocks and clears charging when live scene distance exits docking corridor', () => {
    const initialState = useAppStore.getState()
    const originalSnapshot = {
      useSceneDistance: initialState.useSceneDistance,
      docked: initialState.docked,
      charging: initialState.charging,
      stationDistance: initialState.stationDistance,
      stationDistanceScene: initialState.stationDistanceScene,
      stationDistanceManual: initialState.stationDistanceManual,
      simulationSummary: { ...initialState.simulationSummary },
      simulationLog: [...initialState.simulationLog],
    }

    try {
      useAppStore.setState({
        useSceneDistance: true,
        docked: true,
        charging: true,
        stationDistance: 0,
        stationDistanceScene: 0,
        stationDistanceManual: 0,
        simulationLog: [],
      })

      const outsideDockingRange = STATION_DOCKING_RANGE_METERS + 5
      useAppStore.getState().setStationDistanceFromScene(outsideDockingRange)
      const after = useAppStore.getState()

      expect(after.docked).toBe(false)
      expect(after.charging).toBe(false)
      expect(after.stationDistance).toBe(outsideDockingRange)
      expect(after.simulationSummary.inRange).toBe(false)
      expect(after.simulationLog[0]?.message).toContain('Auto-undocked')
    } finally {
      useAppStore.setState({
        useSceneDistance: originalSnapshot.useSceneDistance,
        docked: originalSnapshot.docked,
        charging: originalSnapshot.charging,
        stationDistance: originalSnapshot.stationDistance,
        stationDistanceScene: originalSnapshot.stationDistanceScene,
        stationDistanceManual: originalSnapshot.stationDistanceManual,
        simulationSummary: originalSnapshot.simulationSummary,
        simulationLog: originalSnapshot.simulationLog,
      })
    }
  })
})

