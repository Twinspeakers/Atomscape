import { DEFAULT_WORLD_SEED, type CleanupTargetClassId, type CleanupZoneId } from '@domain/spec/worldSpec'
import {
  resolveSectorDefinition,
  resolveSectorWorldTargetCount,
  type SectorId,
} from '@domain/spec/sectorSpec'
import { sanitizeWorldSessionRow } from '@state/runtime/snapshotSanitizers'
import {
  computeMinActiveWorldTargetCount,
  trimDepletedTargetIdsForPopulationFloor,
} from '@state/world/worldStateUtils'
import type { ExtractionTargetPayload, SimulationLogEntry } from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface WorldSessionTransitionState {
  activeSectorId: SectorId
  worldStateLoaded: boolean
  worldSeed: string
  worldDepletedTargetIds: string[]
  worldDestroyedCount: number
  worldRemainingCount: number
  worldVisitedZoneIds: CleanupZoneId[]
  worldZoneDestroyedCounts: Partial<Record<CleanupZoneId, number>>
  worldClassDestroyedCounts: Partial<Record<CleanupTargetClassId, number>>
  activeCleanupZoneId: CleanupZoneId | null
  visitedCleanupZones: CleanupZoneId[]
  simulationLog: SimulationLogEntry[]
}

export interface ResolveHydratedWorldSessionOptions {
  sectorId: SectorId
  worldSessionRow: unknown
  worldSessionVersion: number
  existingVisitedCleanupZones: CleanupZoneId[]
  simulationLog: SimulationLogEntry[]
}

export function buildWorldSessionFallbackState(sectorId: SectorId): WorldSessionTransitionState {
  const sectorDefinition = resolveSectorDefinition(sectorId)
  const worldTargetCount = resolveSectorWorldTargetCount(sectorId)

  return {
    activeSectorId: sectorId,
    worldStateLoaded: true,
    worldSeed: sectorDefinition.worldSeed ?? DEFAULT_WORLD_SEED,
    worldDepletedTargetIds: [],
    worldDestroyedCount: 0,
    worldRemainingCount: worldTargetCount,
    worldVisitedZoneIds: [],
    worldZoneDestroyedCounts: {},
    worldClassDestroyedCounts: {},
    activeCleanupZoneId: null,
    visitedCleanupZones: [],
    simulationLog: [],
  }
}

export function resolveHydratedWorldSessionTransition(
  options: ResolveHydratedWorldSessionOptions,
  appendLog: AppendLog,
): WorldSessionTransitionState {
  const fallback = buildWorldSessionFallbackState(options.sectorId)
  const sanitized = sanitizeWorldSessionRow(
    options.worldSessionRow,
    options.sectorId,
    options.worldSessionVersion,
  )

  if (!sanitized) {
    return {
      ...fallback,
      simulationLog: options.simulationLog,
    }
  }

  const worldTargetCount = resolveSectorWorldTargetCount(options.sectorId)
  const minActiveWorldTargetCount = computeMinActiveWorldTargetCount(worldTargetCount)
  const trimmedDepleted = trimDepletedTargetIdsForPopulationFloor(
    sanitized.depletedTargetIds,
    worldTargetCount,
  )
  const normalizedDestroyedCount = trimmedDepleted.depletedTargetIds.length
  const normalizedRemainingCount = Math.max(0, worldTargetCount - normalizedDestroyedCount)
  const nextSimulationLog = trimmedDepleted.replenishedCount > 0
    ? appendLog({
        logs: options.simulationLog,
        message: `Cleanup wave replenished ${trimmedDepleted.replenishedCount} targets to maintain at least ${minActiveWorldTargetCount} active.`,
      })
    : options.simulationLog

  return {
    activeSectorId: options.sectorId,
    worldStateLoaded: true,
    worldSeed: sanitized.seed,
    worldDepletedTargetIds: trimmedDepleted.depletedTargetIds,
    worldDestroyedCount: normalizedDestroyedCount,
    worldRemainingCount: normalizedRemainingCount,
    worldVisitedZoneIds: sanitized.visitedZoneIds,
    worldZoneDestroyedCounts: sanitized.zoneDestroyedCounts,
    worldClassDestroyedCounts: sanitized.classDestroyedCounts,
    activeCleanupZoneId: null,
    visitedCleanupZones: options.existingVisitedCleanupZones.length > 0
      ? options.existingVisitedCleanupZones
      : sanitized.visitedZoneIds,
    simulationLog: nextSimulationLog,
  }
}

export interface WorldTargetDepletionTransitionInput {
  activeSectorId: SectorId
  worldDepletedTargetIds: string[]
  worldVisitedZoneIds: CleanupZoneId[]
  worldZoneDestroyedCounts: Partial<Record<CleanupZoneId, number>>
  worldClassDestroyedCounts: Partial<Record<CleanupTargetClassId, number>>
  visitedCleanupZones: CleanupZoneId[]
  simulationLog: SimulationLogEntry[]
}

export interface WorldTargetDepletionTransitionResult {
  worldDepletedTargetIds: string[]
  worldDestroyedCount: number
  worldRemainingCount: number
  worldVisitedZoneIds: CleanupZoneId[]
  worldZoneDestroyedCounts: Partial<Record<CleanupZoneId, number>>
  worldClassDestroyedCounts: Partial<Record<CleanupTargetClassId, number>>
  visitedCleanupZones: CleanupZoneId[]
  simulationLog: SimulationLogEntry[]
}

export function applyWorldTargetDepletionTransition(
  state: WorldTargetDepletionTransitionInput,
  target: ExtractionTargetPayload,
  appendLog: AppendLog,
): WorldTargetDepletionTransitionResult | null {
  if (state.worldDepletedTargetIds.includes(target.targetId)) {
    return null
  }

  const worldTargetCount = resolveSectorWorldTargetCount(state.activeSectorId)
  const minActiveWorldTargetCount = computeMinActiveWorldTargetCount(worldTargetCount)
  const nextDepletedTargetIds = [...state.worldDepletedTargetIds, target.targetId]
  const nextZoneDestroyedCounts: Partial<Record<CleanupZoneId, number>> = {
    ...state.worldZoneDestroyedCounts,
    [target.zoneId]: (state.worldZoneDestroyedCounts[target.zoneId] ?? 0) + 1,
  }
  const nextClassDestroyedCounts: Partial<Record<CleanupTargetClassId, number>> = {
    ...state.worldClassDestroyedCounts,
    [target.classId]: (state.worldClassDestroyedCounts[target.classId] ?? 0) + 1,
  }
  const trimmedDepleted = trimDepletedTargetIdsForPopulationFloor(
    nextDepletedTargetIds,
    worldTargetCount,
  )
  const nextDestroyedCount = trimmedDepleted.depletedTargetIds.length
  const nextRemainingCount = Math.max(0, worldTargetCount - nextDestroyedCount)
  const nextWorldVisitedZoneIds = state.worldVisitedZoneIds.includes(target.zoneId)
    ? state.worldVisitedZoneIds
    : [...state.worldVisitedZoneIds, target.zoneId]
  const nextVisitedCleanupZones = state.visitedCleanupZones.includes(target.zoneId)
    ? state.visitedCleanupZones
    : [...state.visitedCleanupZones, target.zoneId]

  return {
    worldDepletedTargetIds: trimmedDepleted.depletedTargetIds,
    worldDestroyedCount: nextDestroyedCount,
    worldRemainingCount: nextRemainingCount,
    worldVisitedZoneIds: nextWorldVisitedZoneIds,
    worldZoneDestroyedCounts: nextZoneDestroyedCounts,
    worldClassDestroyedCounts: nextClassDestroyedCounts,
    visitedCleanupZones: nextVisitedCleanupZones,
    simulationLog: trimmedDepleted.replenishedCount > 0
      ? appendLog({
          logs: state.simulationLog,
          message: `Cleanup wave replenished ${trimmedDepleted.replenishedCount} targets to maintain at least ${minActiveWorldTargetCount} active.`,
        })
      : state.simulationLog,
  }
}
