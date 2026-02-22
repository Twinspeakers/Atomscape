import type { SectorId } from '@domain/spec/sectorSpec'

const BASE_ACTIVE_WORLD_TARGET_FLOOR = 15
const ACTIVE_WORLD_TARGET_FLOOR_RATIO = 0.45

export function computeMinActiveWorldTargetCount(totalWorldTargetCount: number): number {
  const normalizedTotal = Math.max(0, Math.floor(totalWorldTargetCount))
  if (normalizedTotal === 0) {
    return 0
  }

  const ratioFloor = Math.floor(normalizedTotal * ACTIVE_WORLD_TARGET_FLOOR_RATIO)
  const floor = Math.max(BASE_ACTIVE_WORLD_TARGET_FLOOR, ratioFloor)
  return Math.min(normalizedTotal, floor)
}

export function trimDepletedTargetIdsForPopulationFloor(
  depletedTargetIds: string[],
  totalWorldTargetCount: number,
): {
  depletedTargetIds: string[]
  replenishedCount: number
} {
  const minActiveWorldTargetCount = computeMinActiveWorldTargetCount(totalWorldTargetCount)
  const maxAllowedDepleted = Math.max(0, totalWorldTargetCount - minActiveWorldTargetCount)
  if (depletedTargetIds.length <= maxAllowedDepleted) {
    return {
      depletedTargetIds,
      replenishedCount: 0,
    }
  }

  const replenishedCount = depletedTargetIds.length - maxAllowedDepleted
  return {
    depletedTargetIds: depletedTargetIds.slice(replenishedCount),
    replenishedCount,
  }
}

export function worldSessionRowIdForSector(sectorId: SectorId): string {
  return `world-session-${sectorId}`
}
