import { CREW_DEFAULT_ROSTER } from '@domain/spec/gameSpec'
import {
  DEFAULT_START_SECTOR_ID,
  resolveSectorDefinition,
  resolveSectorWorldTargetCount,
  type SectorId,
} from '@domain/spec/sectorSpec'
import { DEFAULT_WORLD_SEED } from '@domain/spec/worldSpec'
import { createMarketState, type MarketState } from '@features/simulation/engine'
import { GALAXY_BAR_AUTOMATION_SIDE_QUEST_ID } from '@features/quests/questDefinitions'
import { resourceIds } from '@domain/resources/resourceCatalog'
import { initialDailyCrewSchedule } from '@state/crew/crewScheduleUtils'
import {
  loadRuntimeSnapshot,
  type RuntimeStateSnapshot,
} from '@state/runtime/snapshotPersistence'
import {
  DEFAULT_CREW_STATUS,
  DEFAULT_FRIDGE_STATE,
  deriveCrewAggregateMetrics,
  deriveCrewStatusFromMembers,
} from '@state/runtime/snapshotSanitizers'
import {
  DEFAULT_LEFT_PANELS,
  DEFAULT_PANEL_OPACITY,
  DEFAULT_PINNED_QUEST_IDS,
  DEFAULT_RIGHT_PANELS,
  DEFAULT_UI_DENSITY,
  loadUiPreferences,
  normalizePanelOpacity,
  sanitizeDockLists,
  sanitizeHiddenPanels,
  sanitizePanelSlotHints,
  type UiPreferencesSnapshot,
} from '@state/ui/workspacePreferences'
import { clamp, normalizeNumber } from '@state/utils/numberUtils'
import type {
  CrewAggregateMetrics,
  CrewMemberState,
  CrewStatus,
  FridgeState,
  PanelId,
  ResourceInventory,
  ShipTelemetry,
  UiDensity,
} from '@state/types'

export const DEFAULT_SHIP_TELEMETRY: ShipTelemetry = {
  speed: 0,
  health: 100,
  attacks: 0,
  cooldown: 0,
}

export const DEFAULT_WATER_AUTOMATION_ENABLED = true
export const DEFAULT_GALAXY_BAR_AUTOMATION_ENABLED = false
export const DEFAULT_PLAYER_USERNAME = 'Captain Orbit'

export interface StoreBootstrapDependencies {
  nowMs: () => number
  loadUiPreferences: () => Partial<UiPreferencesSnapshot>
  createMarketState: () => MarketState
  loadRuntimeSnapshot: typeof loadRuntimeSnapshot
}

const defaultStoreBootstrapDependencies: StoreBootstrapDependencies = {
  nowMs: () => Date.now(),
  loadUiPreferences,
  createMarketState,
  loadRuntimeSnapshot,
}

export interface StoreBootstrapContext {
  defaultMarketState: MarketState
  loadedRuntimeSnapshot: Partial<RuntimeStateSnapshot>
  loadedUiPreferences: Partial<UiPreferencesSnapshot>
  initialActiveSectorId: SectorId
  initialWorldSeed: string
  initialWorldTargetCount: number
  initialDockState: { leftPanels: PanelId[]; rightPanels: PanelId[] }
  initialHiddenPanels: PanelId[]
  initialPanelSlotHints: Partial<Record<PanelId, number>>
  initialUiDensity: UiDensity
  initialPanelOpacity: number
  initialStationDistanceManual: number
  initialStationDistanceScene: number
  initialUseSceneDistance: boolean
  initialDocked: boolean
  initialStationDistance: number
  initialContainmentPower: number
  initialCharging: boolean
  initialContainmentOn: boolean
  initialCycleTimeSeconds: number
  initialCrewStatus: CrewStatus
  initialCrewMembers: CrewMemberState[]
  initialCrewAggregateMetrics: CrewAggregateMetrics
  initialFridge: FridgeState
  initialWaterAutomationEnabled: boolean
  initialGalaxyBarAutomationEnabled: boolean
  initialGalaxyBarsCrafted: number
}

export function createEmptyInventory(): ResourceInventory {
  return resourceIds.reduce<ResourceInventory>((inventory, resourceId) => {
    inventory[resourceId] = 0
    return inventory
  }, {})
}

export function sanitizePlayerUsername(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_PLAYER_USERNAME
  }

  const collapsed = value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)

  return collapsed.length > 0 ? collapsed : DEFAULT_PLAYER_USERNAME
}

function createCrewMembersFromStatus(status: CrewStatus, nowMs: number): CrewMemberState[] {
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

export interface BuildStoreBootstrapContextOptions {
  questRewardHistoryLimit: number
  dependencies?: Partial<StoreBootstrapDependencies>
}

export function buildStoreBootstrapContext(
  options: BuildStoreBootstrapContextOptions,
): StoreBootstrapContext {
  const dependencies: StoreBootstrapDependencies = {
    ...defaultStoreBootstrapDependencies,
    ...options.dependencies,
  }
  const nowMs = dependencies.nowMs()
  const loadedUiPreferences = dependencies.loadUiPreferences()
  const defaultMarketState = dependencies.createMarketState()
  const loadedRuntimeSnapshot = dependencies.loadRuntimeSnapshot({
    defaultMarket: defaultMarketState,
    defaultWaterAutomationEnabled: DEFAULT_WATER_AUTOMATION_ENABLED,
    questRewardHistoryLimit: options.questRewardHistoryLimit,
    sanitizePlayerUsername,
  })

  const initialActiveSectorId = loadedRuntimeSnapshot.activeSectorId ?? DEFAULT_START_SECTOR_ID
  const initialSectorDefinition = resolveSectorDefinition(initialActiveSectorId)
  const initialWorldTargetCount = resolveSectorWorldTargetCount(initialActiveSectorId)
  const initialDockState = sanitizeDockLists(
    loadedUiPreferences.leftPanels ?? DEFAULT_LEFT_PANELS,
    loadedUiPreferences.rightPanels ?? DEFAULT_RIGHT_PANELS,
  )
  const initialHiddenPanels = sanitizeHiddenPanels(loadedUiPreferences.hiddenPanels ?? [])
  const initialPanelSlotHints = sanitizePanelSlotHints(loadedUiPreferences.panelSlotHints ?? {})
  const initialUiDensity = loadedUiPreferences.uiDensity ?? DEFAULT_UI_DENSITY
  const initialPanelOpacity = normalizePanelOpacity(
    loadedUiPreferences.panelOpacity ?? DEFAULT_PANEL_OPACITY,
  )
  const initialStationDistanceManual = loadedRuntimeSnapshot.stationDistanceManual ?? 0
  const initialStationDistanceScene = loadedRuntimeSnapshot.stationDistanceScene ?? 0
  const initialUseSceneDistance = loadedRuntimeSnapshot.useSceneDistance ?? true
  const initialDocked = loadedRuntimeSnapshot.docked ?? false
  const initialStationDistance = initialDocked
    ? 0
    : initialUseSceneDistance
      ? initialStationDistanceScene
      : initialStationDistanceManual
  const initialContainmentPower = loadedRuntimeSnapshot.containmentPower ?? 60
  const initialCharging = loadedRuntimeSnapshot.charging ?? false
  const initialContainmentOn = loadedRuntimeSnapshot.containmentOn ?? false
  const initialCycleTimeSeconds =
    loadedRuntimeSnapshot.cycleTimeSeconds ?? Math.floor(nowMs / 1000)
  const initialCrewStatusSeed = loadedRuntimeSnapshot.crewStatus ?? { ...DEFAULT_CREW_STATUS }
  const initialCrewMembers =
    loadedRuntimeSnapshot.crewMembers
    ?? createCrewMembersFromStatus(initialCrewStatusSeed, initialCycleTimeSeconds * 1000)
  const initialCrewStatus = deriveCrewStatusFromMembers(
    initialCrewMembers,
    initialCrewStatusSeed.foodAutomationEnabled,
  )
  const initialCrewAggregateMetrics = deriveCrewAggregateMetrics(initialCrewMembers)
  const initialFridge = loadedRuntimeSnapshot.fridge ?? { ...DEFAULT_FRIDGE_STATE }
  const initialWaterAutomationEnabled =
    loadedRuntimeSnapshot.waterAutomationEnabled ?? DEFAULT_WATER_AUTOMATION_ENABLED
  const galaxyBarAutomationUnlocked = (
    loadedRuntimeSnapshot.claimedQuestRewardIds ?? []
  ).includes(GALAXY_BAR_AUTOMATION_SIDE_QUEST_ID)
  const initialGalaxyBarAutomationEnabled =
    galaxyBarAutomationUnlocked
      ? loadedRuntimeSnapshot.galaxyBarAutomationEnabled ?? DEFAULT_GALAXY_BAR_AUTOMATION_ENABLED
      : false
  const initialGalaxyBarsCrafted = loadedRuntimeSnapshot.galaxyBarsCrafted ?? 0

  return {
    defaultMarketState,
    loadedRuntimeSnapshot,
    loadedUiPreferences,
    initialActiveSectorId,
    initialWorldSeed: initialSectorDefinition.worldSeed ?? DEFAULT_WORLD_SEED,
    initialWorldTargetCount,
    initialDockState,
    initialHiddenPanels,
    initialPanelSlotHints,
    initialUiDensity,
    initialPanelOpacity,
    initialStationDistanceManual,
    initialStationDistanceScene,
    initialUseSceneDistance,
    initialDocked,
    initialStationDistance,
    initialContainmentPower,
    initialCharging,
    initialContainmentOn,
    initialCycleTimeSeconds,
    initialCrewStatus,
    initialCrewMembers,
    initialCrewAggregateMetrics,
    initialFridge,
    initialWaterAutomationEnabled,
    initialGalaxyBarAutomationEnabled,
    initialGalaxyBarsCrafted,
  }
}

export function resolveInitialPinnedQuestIds(
  loadedUiPreferences: Partial<UiPreferencesSnapshot>,
): string[] {
  return loadedUiPreferences.pinnedQuestIds ?? DEFAULT_PINNED_QUEST_IDS
}
