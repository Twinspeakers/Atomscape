import {
  CREW_DEFAULT_ROSTER,
  FRIDGE_DEFAULT_CAPACITY_BARS,
  FRIDGE_DEFAULT_WATER_CAPACITY_LITERS,
} from '@domain/spec/gameSpec'
import {
  CLEANUP_ZONES,
  type CleanupTargetClassId,
  type CleanupZoneId,
} from '@domain/spec/worldSpec'
import { isSectorId, resolveSectorDefinition, type SectorId } from '@domain/spec/sectorSpec'
import { cleanupTargetClassCatalog } from '@domain/world/cleanupCatalog'
import type { MarketState } from '@features/simulation/engine'
import type { WorldSessionRow } from '@platform/db/gameDb'
import { initialDailyCrewSchedule } from '@state/crew/crewScheduleUtils'
import { clamp, normalizeNumber, roundQty } from '@state/utils/numberUtils'
import type {
  CrewAggregateMetrics,
  CrewMemberState,
  CrewStatus,
  FridgeState,
  LabTab,
  MarketProductId,
  QuestRewardNotification,
} from '@state/types'

const cleanupZoneIds = CLEANUP_ZONES.map((zone) => zone.id) as CleanupZoneId[]
const cleanupClassIds = Object.keys(cleanupTargetClassCatalog) as CleanupTargetClassId[]

const labTabValues: LabTab[] = [
  'station',
  'sorting',
  'hydrogen',
  'refining',
  'manufacturing',
  'market',
  'atoms',
  'failures',
  'logs',
]

export const DEFAULT_CREW_STATUS: CrewStatus = {
  hunger: 100,
  debuff: 0,
  starving: false,
  foodAutomationEnabled: true,
}

export const DEFAULT_FRIDGE_STATE: FridgeState = {
  unlocked: false,
  galaxyBars: 0,
  capacity: FRIDGE_DEFAULT_CAPACITY_BARS,
  waterLiters: 0,
  waterCapacityLiters: FRIDGE_DEFAULT_WATER_CAPACITY_LITERS,
}

export function isCleanupZoneId(value: string): value is CleanupZoneId {
  return (cleanupZoneIds as string[]).includes(value)
}

function isCleanupTargetClassId(value: string): value is CleanupTargetClassId {
  return (cleanupClassIds as string[]).includes(value)
}

export function sanitizePinnedQuestIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const seen = new Set<string>()
  return raw
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false
      }

      seen.add(value)
      return true
    })
}

export function sanitizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const seen = new Set<string>()
  return raw
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => {
      if (!entry || seen.has(entry)) {
        return false
      }

      seen.add(entry)
      return true
    })
}

export function sanitizeQuestRewardHistory(
  raw: unknown,
  historyLimit: number,
): QuestRewardNotification[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const parsed = raw.reduce<QuestRewardNotification[]>((list, entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return list
    }

    const source = entry as Partial<QuestRewardNotification>
    const questId = typeof source.questId === 'string' ? source.questId.trim() : ''
    const questTitle = typeof source.questTitle === 'string' ? source.questTitle.trim() : ''
    if (!questId || !questTitle) {
      return list
    }

    const rewards = Array.isArray(source.rewards)
      ? source.rewards
          .filter((reward): reward is NonNullable<QuestRewardNotification['rewards']>[number] => {
            return Boolean(
              reward
              && typeof reward.id === 'string'
              && reward.id.trim().length > 0
              && typeof reward.label === 'string'
              && reward.label.trim().length > 0
              && typeof reward.description === 'string',
            )
          })
          .map((reward) => ({
            id: reward.id.trim(),
            label: reward.label.trim(),
            description: reward.description.trim(),
          }))
      : []

    const timestamp = Math.max(0, Math.floor(normalizeNumber(source.timestamp, Date.now())))
    const id = Math.max(
      1,
      Math.floor(
        normalizeNumber(source.id, timestamp + index),
      ),
    )

    list.push({
      id,
      questId,
      questTitle,
      rewards,
      grants: sanitizeStringList(source.grants),
      unlocks: sanitizeStringList(source.unlocks),
      timestamp,
    })

    return list
  }, [])

  return parsed.slice(-historyLimit)
}

export function sanitizeZoneDestroyedCounts(
  raw: unknown,
): Partial<Record<CleanupZoneId, number>> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const next: Partial<Record<CleanupZoneId, number>> = {}
  Object.entries(raw as Record<string, unknown>).forEach(([zoneId, value]) => {
    if (!isCleanupZoneId(zoneId)) {
      return
    }

    const count = Math.max(0, Math.floor(normalizeNumber(value, 0)))
    if (count > 0) {
      next[zoneId] = count
    }
  })

  return next
}

export function sanitizeClassDestroyedCounts(
  raw: unknown,
): Partial<Record<CleanupTargetClassId, number>> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const next: Partial<Record<CleanupTargetClassId, number>> = {}
  Object.entries(raw as Record<string, unknown>).forEach(([classId, value]) => {
    if (!isCleanupTargetClassId(classId)) {
      return
    }

    const count = Math.max(0, Math.floor(normalizeNumber(value, 0)))
    if (count > 0) {
      next[classId] = count
    }
  })

  return next
}

export function isLabTab(value: unknown): value is LabTab {
  return typeof value === 'string' && (labTabValues as string[]).includes(value)
}

export function sanitizeCrewStatus(raw: unknown): CrewStatus {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CREW_STATUS }
  }

  const source = raw as Partial<CrewStatus>
  return {
    hunger: clamp(normalizeNumber(source.hunger, DEFAULT_CREW_STATUS.hunger), 0, 100),
    debuff: clamp(normalizeNumber(source.debuff, DEFAULT_CREW_STATUS.debuff), 0, 100),
    starving: Boolean(source.starving),
    foodAutomationEnabled:
      typeof source.foodAutomationEnabled === 'boolean'
        ? source.foodAutomationEnabled
        : DEFAULT_CREW_STATUS.foodAutomationEnabled,
  }
}

function createCrewMembersFromStatus(status: CrewStatus, nowMs = Date.now()): CrewMemberState[] {
  return CREW_DEFAULT_ROSTER.map((entry) => {
    const schedule = initialDailyCrewSchedule(entry.id, entry.sleepShiftStartHour, nowMs)

    return {
      id: entry.id,
      name: entry.name,
      hunger: clamp(normalizeNumber(status.hunger, 100), 0, 100),
      thirst: 100,
      debuff: clamp(normalizeNumber(status.debuff, 0), 0, 100),
      starving: Boolean(status.starving),
      dehydrated: false,
      sleepShiftStartHour: entry.sleepShiftStartHour,
      sleeping: false,
      firstGalaxyBarBoostApplied: false,
      dailyScheduleDayIndex: schedule.dayIndex,
      dailyBreakfastServed: schedule.breakfastServed,
      dailyLunchServed: schedule.lunchServed,
      dailyDinnerServed: schedule.dinnerServed,
      dailyWaterServedCount: schedule.waterServedCount,
    }
  })
}

export function sanitizeCrewMembers(
  raw: unknown,
  fallbackStatus: CrewStatus,
  nowMs = Date.now(),
): CrewMemberState[] {
  const fallbackMembers = createCrewMembersFromStatus(fallbackStatus, nowMs)
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallbackMembers
  }

  const sourceById = new Map<string, Partial<CrewMemberState>>()
  const sourceByIndex = raw.map((entry) =>
    entry && typeof entry === 'object' ? (entry as Partial<CrewMemberState>) : undefined,
  )

  sourceByIndex.forEach((entry) => {
    if (!entry || typeof entry.id !== 'string' || entry.id.length === 0) {
      return
    }

    sourceById.set(entry.id, entry)
  })

  return CREW_DEFAULT_ROSTER.map((entry, index) => {
    const fallback = fallbackMembers[index]
    const source = sourceById.get(entry.id) ?? sourceByIndex[index] ?? {}
    const scheduleFallback = initialDailyCrewSchedule(entry.id, entry.sleepShiftStartHour, nowMs)

    return {
      id: entry.id,
      name: typeof source.name === 'string' && source.name.trim().length > 0 ? source.name : entry.name,
      portraitUrl:
        typeof source.portraitUrl === 'string' && source.portraitUrl.trim().length > 0
          ? source.portraitUrl
          : undefined,
      hunger: clamp(normalizeNumber(source.hunger, fallback.hunger), 0, 100),
      thirst: clamp(normalizeNumber(source.thirst, fallback.thirst), 0, 100),
      debuff: clamp(normalizeNumber(source.debuff, fallback.debuff), 0, 100),
      starving: Boolean(source.starving),
      dehydrated: Boolean(source.dehydrated),
      sleepShiftStartHour: entry.sleepShiftStartHour,
      sleeping: Boolean(source.sleeping),
      firstGalaxyBarBoostApplied:
        typeof source.firstGalaxyBarBoostApplied === 'boolean'
          ? source.firstGalaxyBarBoostApplied
          : fallback.firstGalaxyBarBoostApplied,
      dailyScheduleDayIndex: Math.floor(
        normalizeNumber(source.dailyScheduleDayIndex, scheduleFallback.dayIndex),
      ),
      dailyBreakfastServed:
        typeof source.dailyBreakfastServed === 'boolean'
          ? source.dailyBreakfastServed
          : scheduleFallback.breakfastServed,
      dailyLunchServed:
        typeof source.dailyLunchServed === 'boolean'
          ? source.dailyLunchServed
          : scheduleFallback.lunchServed,
      dailyDinnerServed:
        typeof source.dailyDinnerServed === 'boolean'
          ? source.dailyDinnerServed
          : scheduleFallback.dinnerServed,
      dailyWaterServedCount: Math.max(
        0,
        Math.floor(normalizeNumber(source.dailyWaterServedCount, scheduleFallback.waterServedCount)),
      ),
    }
  })
}

export function deriveCrewAggregateMetrics(crewMembers: CrewMemberState[]): CrewAggregateMetrics {
  if (crewMembers.length === 0) {
    return {
      awakeCount: 0,
      averageHunger: 0,
      averageThirst: 0,
      averageDebuff: 0,
      starvingCount: 0,
      dehydratedCount: 0,
    }
  }

  const totals = crewMembers.reduce(
    (acc, member) => ({
      awakeCount: acc.awakeCount + (member.sleeping ? 0 : 1),
      hunger: acc.hunger + clamp(member.hunger, 0, 100),
      thirst: acc.thirst + clamp(member.thirst, 0, 100),
      debuff: acc.debuff + clamp(member.debuff, 0, 100),
      starvingCount: acc.starvingCount + (member.starving ? 1 : 0),
      dehydratedCount: acc.dehydratedCount + (member.dehydrated ? 1 : 0),
    }),
    {
      awakeCount: 0,
      hunger: 0,
      thirst: 0,
      debuff: 0,
      starvingCount: 0,
      dehydratedCount: 0,
    },
  )

  return {
    awakeCount: totals.awakeCount,
    averageHunger: totals.hunger / crewMembers.length,
    averageThirst: totals.thirst / crewMembers.length,
    averageDebuff: totals.debuff / crewMembers.length,
    starvingCount: totals.starvingCount,
    dehydratedCount: totals.dehydratedCount,
  }
}

export function deriveCrewStatusFromMembers(
  crewMembers: CrewMemberState[],
  foodAutomationEnabled: boolean,
): CrewStatus {
  if (crewMembers.length === 0) {
    return {
      hunger: 100,
      debuff: 0,
      starving: false,
      foodAutomationEnabled,
    }
  }

  const metrics = deriveCrewAggregateMetrics(crewMembers)
  return {
    hunger: metrics.averageHunger,
    debuff: metrics.averageDebuff,
    starving: metrics.starvingCount > 0,
    foodAutomationEnabled,
  }
}

export function sanitizeFridge(raw: unknown): FridgeState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_FRIDGE_STATE }
  }

  const source = raw as Partial<FridgeState>
  const capacity = Math.max(1, Math.floor(normalizeNumber(source.capacity, DEFAULT_FRIDGE_STATE.capacity)))
  const galaxyBars = clamp(normalizeNumber(source.galaxyBars, DEFAULT_FRIDGE_STATE.galaxyBars), 0, capacity)
  const waterCapacityLiters = roundQty(
    Math.max(
      1,
      normalizeNumber(
        source.waterCapacityLiters,
        DEFAULT_FRIDGE_STATE.waterCapacityLiters ?? FRIDGE_DEFAULT_WATER_CAPACITY_LITERS,
      ),
    ),
  )
  const waterLiters = clamp(
    normalizeNumber(source.waterLiters, DEFAULT_FRIDGE_STATE.waterLiters ?? 0),
    0,
    waterCapacityLiters,
  )

  return {
    unlocked: Boolean(source.unlocked),
    galaxyBars: roundQty(galaxyBars),
    capacity,
    waterLiters: roundQty(waterLiters),
    waterCapacityLiters,
  }
}

export function sanitizeMarketState(raw: unknown, fallback: MarketState): MarketState {
  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const source = raw as Record<string, unknown>
  const market: MarketState = { ...fallback }

  ;(Object.keys(fallback) as MarketProductId[]).forEach((productId) => {
    const entry = source[productId]
    if (!entry || typeof entry !== 'object') {
      return
    }

    const marketEntry = entry as Partial<{
      price: number
      demand: number
      recentSales: number
    }>
    const fallbackEntry = fallback[productId]

    market[productId] = {
      ...fallbackEntry,
      price: Math.max(0.01, normalizeNumber(marketEntry.price, fallbackEntry.price)),
      demand: clamp(normalizeNumber(marketEntry.demand, fallbackEntry.demand), 0.1, 3),
      recentSales: Math.max(0, normalizeNumber(marketEntry.recentSales, fallbackEntry.recentSales)),
    }
  })

  return market
}

export interface SanitizedWorldSession {
  sectorId: SectorId
  seed: string
  depletedTargetIds: string[]
  visitedZoneIds: CleanupZoneId[]
  zoneDestroyedCounts: Partial<Record<CleanupZoneId, number>>
  classDestroyedCounts: Partial<Record<CleanupTargetClassId, number>>
  destroyedCount: number
}

export function sanitizeWorldSessionRow(
  raw: unknown,
  sectorId: SectorId,
  worldSessionVersion: number,
): SanitizedWorldSession | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = raw as Partial<WorldSessionRow>
  if (source.version !== worldSessionVersion) {
    return null
  }

  const resolvedSectorId = typeof source.sectorId === 'string' && isSectorId(source.sectorId)
    ? source.sectorId
    : sectorId
  if (resolvedSectorId !== sectorId) {
    return null
  }

  const fallbackSeed = resolveSectorDefinition(sectorId).worldSeed
  const seed = typeof source.seed === 'string' && source.seed.trim().length > 0
    ? source.seed.trim()
    : fallbackSeed

  const depletedTargetIds = sanitizeStringList(source.depletedTargetIds)
  const visitedZoneIds = sanitizeStringList(source.visitedZoneIds)
    .filter((zoneId): zoneId is CleanupZoneId => isCleanupZoneId(zoneId))
  const zoneDestroyedCounts = sanitizeZoneDestroyedCounts(source.zoneDestroyedCounts)
  const classDestroyedCounts = sanitizeClassDestroyedCounts(source.classDestroyedCounts)

  const destroyedCount = Math.max(
    Math.floor(normalizeNumber(source.destroyedCount, depletedTargetIds.length)),
    depletedTargetIds.length,
  )

  return {
    sectorId,
    seed,
    depletedTargetIds,
    visitedZoneIds,
    zoneDestroyedCounts,
    classDestroyedCounts,
    destroyedCount,
  }
}
