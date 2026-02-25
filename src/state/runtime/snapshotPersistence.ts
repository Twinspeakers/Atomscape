import { FRIDGE_DEFAULT_WATER_CAPACITY_LITERS } from '@domain/spec/gameSpec'
import {
  DEFAULT_START_SECTOR_ID,
  isSectorId,
  type SectorId,
} from '@domain/spec/sectorSpec'
import type {
  CleanupTargetClassId,
  CleanupZoneId,
} from '@domain/spec/worldSpec'
import type { MarketState } from '@features/simulation/engine'
import type { WorldSessionRow } from '@platform/db/gameDb'
import type {
  CrewMemberState,
  CrewStatus,
  FridgeState,
  LabTab,
  QuestRewardNotification,
} from '@state/types'
import { clamp, normalizeNumber, roundQty } from '@state/utils/numberUtils'
import { worldSessionRowIdForSector } from '@state/world/worldStateUtils'
import {
  isCleanupZoneId,
  isLabTab,
  sanitizeClassDestroyedCounts,
  sanitizeCrewMembers,
  sanitizeCrewStatus,
  sanitizeFridge,
  sanitizeMarketState,
  sanitizePinnedQuestIds,
  sanitizeQuestRewardHistory,
  sanitizeStringList,
  sanitizeZoneDestroyedCounts,
} from './snapshotSanitizers'

export const RUNTIME_STATE_STORAGE_KEY = 'space-runtime-state-v1'
export const WORLD_SESSION_VERSION = 1

export interface RuntimeStateSnapshot {
  version: 1
  playerUsername: string
  activeSectorId: SectorId
  cycleTimeSeconds: number
  energy: number
  maxEnergy: number
  credits: number
  stationDistanceScene: number
  stationDistanceManual: number
  useSceneDistance: boolean
  charging: boolean
  docked: boolean
  containmentOn: boolean
  containmentPower: number
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  fridge: FridgeState
  waterAutomationEnabled: boolean
  galaxyBarAutomationEnabled: boolean
  galaxyBarsCrafted: number
  crewFeedsDelivered: number
  market: MarketState
  labActiveTab: LabTab
  failureCount: number
  claimedQuestRewardIds: string[]
  questRewardHistory: QuestRewardNotification[]
}

export interface RuntimeSnapshotStateSource {
  playerUsername: string
  activeSectorId: SectorId
  cycleTimeSeconds: number
  energy: number
  maxEnergy: number
  credits: number
  stationDistanceScene: number
  stationDistanceManual: number
  useSceneDistance: boolean
  charging: boolean
  docked: boolean
  containmentOn: boolean
  containmentPower: number
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  fridge: FridgeState
  waterAutomationEnabled: boolean
  galaxyBarAutomationEnabled: boolean
  galaxyBarsCrafted: number
  crewFeedsDelivered: number
  market: MarketState
  labActiveTab: LabTab
  failureCount: number
  claimedQuestRewardIds: string[]
  questRewardHistory: QuestRewardNotification[]
}

export interface WorldSessionSnapshotStateSource {
  activeSectorId: SectorId
  worldSeed: string
  worldDepletedTargetIds: string[]
  worldVisitedZoneIds: CleanupZoneId[]
  worldZoneDestroyedCounts: Partial<Record<CleanupZoneId, number>>
  worldClassDestroyedCounts: Partial<Record<CleanupTargetClassId, number>>
  worldDestroyedCount: number
}

interface LoadRuntimeSnapshotOptions {
  defaultMarket: MarketState
  defaultWaterAutomationEnabled: boolean
  questRewardHistoryLimit: number
  sanitizePlayerUsername: (value: unknown) => string
}

interface BuildRuntimeSnapshotOptions {
  questRewardHistoryLimit: number
  sanitizePlayerUsername: (value: unknown) => string
}

export function loadRuntimeSnapshot(options: LoadRuntimeSnapshotOptions): Partial<RuntimeStateSnapshot> {
  const {
    defaultMarket,
    defaultWaterAutomationEnabled,
    questRewardHistoryLimit,
    sanitizePlayerUsername,
  } = options

  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(RUNTIME_STATE_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Partial<RuntimeStateSnapshot> & { version?: number }
    if (parsed.version !== 1) {
      return {}
    }

    const activeSectorId =
      typeof parsed.activeSectorId === 'string' && isSectorId(parsed.activeSectorId)
        ? parsed.activeSectorId
        : DEFAULT_START_SECTOR_ID
    const cycleTimeSeconds = Math.max(
      0,
      Math.floor(normalizeNumber(parsed.cycleTimeSeconds, Date.now() / 1000)),
    )
    const scheduleNowMs = cycleTimeSeconds * 1000
    const maxEnergy = clamp(normalizeNumber(parsed.maxEnergy, 2000), 1, 100000)
    const energy = clamp(normalizeNumber(parsed.energy, 120), 0, maxEnergy)
    const crewStatus = sanitizeCrewStatus(parsed.crewStatus)
    const crewMembers = sanitizeCrewMembers(parsed.crewMembers, crewStatus, scheduleNowMs)
    const fridge = sanitizeFridge(parsed.fridge)
    const waterAutomationEnabled =
      typeof parsed.waterAutomationEnabled === 'boolean'
        ? parsed.waterAutomationEnabled
        : defaultWaterAutomationEnabled
    const galaxyBarAutomationEnabled =
      typeof parsed.galaxyBarAutomationEnabled === 'boolean'
        ? parsed.galaxyBarAutomationEnabled
        : false
    const galaxyBarsCrafted = Math.max(
      0,
      Math.floor(normalizeNumber(parsed.galaxyBarsCrafted, 0)),
    )

    return {
      playerUsername: sanitizePlayerUsername(parsed.playerUsername),
      activeSectorId,
      cycleTimeSeconds,
      energy: roundQty(energy),
      maxEnergy: roundQty(maxEnergy),
      credits: roundQty(Math.max(0, normalizeNumber(parsed.credits, 0))),
      stationDistanceScene: roundQty(Math.max(0, normalizeNumber(parsed.stationDistanceScene, 0))),
      stationDistanceManual: roundQty(clamp(normalizeNumber(parsed.stationDistanceManual, 0), 0, 1200)),
      useSceneDistance:
        typeof parsed.useSceneDistance === 'boolean' ? parsed.useSceneDistance : true,
      charging: Boolean(parsed.charging),
      docked: Boolean(parsed.docked),
      containmentOn: Boolean(parsed.containmentOn),
      containmentPower: roundQty(clamp(normalizeNumber(parsed.containmentPower, 60), 0, 100)),
      crewStatus,
      crewMembers,
      fridge,
      waterAutomationEnabled,
      galaxyBarAutomationEnabled,
      galaxyBarsCrafted,
      crewFeedsDelivered: Math.max(0, Math.floor(normalizeNumber(parsed.crewFeedsDelivered, 0))),
      market: sanitizeMarketState(parsed.market, defaultMarket),
      labActiveTab: isLabTab(parsed.labActiveTab) ? parsed.labActiveTab : 'sorting',
      failureCount: Math.max(0, Math.floor(normalizeNumber(parsed.failureCount, 0))),
      claimedQuestRewardIds: sanitizePinnedQuestIds(parsed.claimedQuestRewardIds),
      questRewardHistory: sanitizeQuestRewardHistory(
        parsed.questRewardHistory,
        questRewardHistoryLimit,
      ),
    }
  } catch {
    return {}
  }
}

export function persistRuntimeSnapshot(snapshot: RuntimeStateSnapshot): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(RUNTIME_STATE_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Ignore storage persistence failures.
  }
}

export function buildRuntimeSnapshotFromState(
  state: RuntimeSnapshotStateSource,
  options: BuildRuntimeSnapshotOptions,
): RuntimeStateSnapshot {
  const { questRewardHistoryLimit, sanitizePlayerUsername } = options

  return {
    version: 1,
    playerUsername: sanitizePlayerUsername(state.playerUsername),
    activeSectorId: state.activeSectorId,
    cycleTimeSeconds: Math.max(0, Math.floor(state.cycleTimeSeconds)),
    energy: roundQty(state.energy),
    maxEnergy: roundQty(state.maxEnergy),
    credits: roundQty(state.credits),
    stationDistanceScene: roundQty(Math.max(0, state.stationDistanceScene)),
    stationDistanceManual: roundQty(state.stationDistanceManual),
    useSceneDistance: state.useSceneDistance,
    charging: state.charging,
    docked: state.docked,
    containmentOn: state.containmentOn,
    containmentPower: roundQty(state.containmentPower),
    crewStatus: {
      hunger: roundQty(state.crewStatus.hunger),
      debuff: roundQty(state.crewStatus.debuff),
      starving: state.crewStatus.starving,
      foodAutomationEnabled: state.crewStatus.foodAutomationEnabled,
    },
    crewMembers: state.crewMembers.map((member) => ({
      ...member,
      hunger: roundQty(clamp(member.hunger, 0, 100)),
      thirst: roundQty(clamp(member.thirst, 0, 100)),
      debuff: roundQty(clamp(member.debuff, 0, 100)),
      starving: Boolean(member.starving),
      dehydrated: Boolean(member.dehydrated),
      sleeping: Boolean(member.sleeping),
    })),
    fridge: {
      unlocked: state.fridge.unlocked,
      galaxyBars: roundQty(clamp(state.fridge.galaxyBars, 0, Math.max(1, state.fridge.capacity))),
      capacity: Math.max(1, Math.floor(state.fridge.capacity)),
      waterLiters: roundQty(
        clamp(
          state.fridge.waterLiters ?? 0,
          0,
          Math.max(1, state.fridge.waterCapacityLiters ?? FRIDGE_DEFAULT_WATER_CAPACITY_LITERS),
        ),
      ),
      waterCapacityLiters: roundQty(
        Math.max(1, state.fridge.waterCapacityLiters ?? FRIDGE_DEFAULT_WATER_CAPACITY_LITERS),
      ),
    },
    waterAutomationEnabled: state.waterAutomationEnabled,
    galaxyBarAutomationEnabled: state.galaxyBarAutomationEnabled,
    galaxyBarsCrafted: state.galaxyBarsCrafted,
    crewFeedsDelivered: state.crewFeedsDelivered,
    market: state.market,
    labActiveTab: state.labActiveTab,
    failureCount: state.failureCount,
    claimedQuestRewardIds: sanitizePinnedQuestIds(state.claimedQuestRewardIds),
    questRewardHistory: sanitizeQuestRewardHistory(
      state.questRewardHistory,
      questRewardHistoryLimit,
    ),
  }
}

export function buildWorldSessionSnapshotFromState(
  state: WorldSessionSnapshotStateSource,
): WorldSessionRow {
  return {
    id: worldSessionRowIdForSector(state.activeSectorId),
    version: WORLD_SESSION_VERSION,
    sectorId: state.activeSectorId,
    seed: state.worldSeed,
    depletedTargetIds: sanitizeStringList(state.worldDepletedTargetIds),
    visitedZoneIds: sanitizeStringList(state.worldVisitedZoneIds)
      .filter((zoneId): zoneId is CleanupZoneId => isCleanupZoneId(zoneId)),
    zoneDestroyedCounts: sanitizeZoneDestroyedCounts(state.worldZoneDestroyedCounts),
    classDestroyedCounts: sanitizeClassDestroyedCounts(state.worldClassDestroyedCounts),
    destroyedCount: Math.max(0, Math.floor(state.worldDestroyedCount)),
    updatedAt: Date.now(),
  }
}
