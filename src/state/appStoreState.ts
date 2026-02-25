import type {
  CleanupTargetClassId,
  CleanupZoneId,
} from '@domain/spec/worldSpec'
import type { SectorId } from '@domain/spec/sectorSpec'
import type { MarketState } from '@features/simulation/engine'
import type { AtomTotals } from '@domain/resources/resourceCatalog'
import type {
  TutorialCompletion,
} from '@state/quests/tutorialProgression'
import type {
  CommsSpeaker,
  CrewAggregateMetrics,
  CrewMemberState,
  CrewStatus,
  DockSide,
  ExtractionEvent,
  ExtractionTargetPayload,
  FailureReason,
  FailureReportEntry,
  FridgeState,
  LabTab,
  MarketProductId,
  PanelId,
  QuestRewardNotification,
  RadarContact,
  ResourceInventory,
  SelectedObject,
  ShipTelemetry,
  SimulationLogEntry,
  SimulationSummary,
  TutorialChecklistItem,
  UiDensity,
  WorkspacePreset,
} from '@state/types'

export interface AppState {
  inventory: ResourceInventory
  inventoryLoaded: boolean
  atomCounter: AtomTotals
  selectedObject: SelectedObject | null
  playerUsername: string
  activeCommsSpeaker: CommsSpeaker | null
  shipTelemetry: ShipTelemetry
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  crewAggregateMetrics: CrewAggregateMetrics
  fridge: FridgeState
  waterAutomationEnabled: boolean
  galaxyBarAutomationEnabled: boolean
  galaxyBarsCrafted: number
  radarContacts: RadarContact[]
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
  pinnedQuestIds: string[]
  activeMainQuestId: string | null
  leftPanels: PanelId[]
  rightPanels: PanelId[]
  hiddenPanels: PanelId[]
  panelSlotHints: Partial<Record<PanelId, number>>
  uiDensity: UiDensity
  panelOpacity: number
  workspaceCustomizerOpen: boolean
  stationDistance: number
  stationDistanceScene: number
  stationDistanceManual: number
  useSceneDistance: boolean
  charging: boolean
  docked: boolean
  containmentOn: boolean
  containmentPower: number
  cycleTimeSeconds: number
  energy: number
  maxEnergy: number
  credits: number
  shipRespawnSignal: number
  failureCount: number
  failureReports: FailureReportEntry[]
  starvationFailureLock: boolean
  market: MarketState
  simulationSummary: SimulationSummary
  simulationLog: SimulationLogEntry[]
  questRewardNotifications: QuestRewardNotification[]
  questRewardHistory: QuestRewardNotification[]
  extractionEvents: ExtractionEvent[]
  crewFeedsDelivered: number
  claimedQuestRewardIds: string[]
  tutorialEnabled: boolean
  tutorialCollapsed: boolean
  tutorialComplete: boolean
  tutorialCurrentStepIndex: number
  tutorialChecklist: TutorialChecklistItem[]
  tutorialCompletion: TutorialCompletion
  labActiveTab: LabTab
  hydrateInventory: () => Promise<void>
  hydrateWorldSession: () => Promise<void>
  jumpToSector: (sectorId: SectorId) => Promise<void>
  mineElement: (symbol: string, amount?: number) => Promise<void>
  tryFireMiningLaser: () => boolean
  recordExtractionHit: (target: ExtractionTargetPayload) => Promise<void>
  recordWorldTargetDepleted: (target: ExtractionTargetPayload) => void
  runRockSorter: () => void
  runIceMelter: () => void
  runElectrolyzer: () => void
  runIonizer: () => void
  runCo2Sublimator: () => void
  runCarbonRefiner: () => void
  runBlastFurnace: () => void
  runCoBurner: () => void
  runGlassForge: () => void
  runSteelMill: () => void
  runGreenhouse: () => void
  runWoodWorkshop: () => void
  runGalaxyBarAssembler: () => void
  runBoxOfSandPress: () => void
  runSteelIngotCaster: () => void
  runEnergyCellAssembler: () => void
  useEnergyCell: () => boolean
  upgradeBatteryCapacity: () => boolean
  useConsumableSlot: (slotId: number) => boolean
  feedCrewGalaxyBar: () => void
  loadFridgeWater: (liters: number) => void
  loadFridgeGalaxyBars: (quantity: number) => void
  sellMarketProduct: (productId: MarketProductId, quantity?: number) => void
  handleFailure: (reason: FailureReason) => void
  tickSimulation: () => void
  setStationDistanceFromScene: (distance: number) => void
  setStationDistanceManual: (distance: number) => void
  setUseSceneDistance: (enabled: boolean) => void
  toggleDocked: () => void
  startCharging: () => void
  stopCharging: () => void
  setContainmentOn: (enabled: boolean) => void
  setContainmentPower: (power: number) => void
  setFoodAutomationEnabled: (enabled: boolean) => void
  setWaterAutomationEnabled: (enabled: boolean) => void
  setGalaxyBarAutomationEnabled: (enabled: boolean) => void
  setLabActiveTab: (tab: LabTab) => void
  setSelectedObject: (selection: SelectedObject | null) => void
  setPlayerUsername: (name: string) => void
  setActiveCommsSpeaker: (speaker: CommsSpeaker | null) => void
  appendSimulationLog: (message: string) => void
  setShipTelemetry: (telemetry: ShipTelemetry) => void
  setRadarContacts: (contacts: RadarContact[]) => void
  setActiveCleanupZone: (zoneId: CleanupZoneId | null) => void
  toggleTutorialCollapsed: () => void
  dismissTutorial: () => void
  resetTutorial: () => void
  toggleQuestPin: (questId: string) => void
  setActiveMainQuest: (questId: string | null) => void
  dismissQuestRewardNotification: () => void
  setUiDensity: (density: UiDensity) => void
  setPanelOpacity: (opacity: number) => void
  toggleWorkspaceCustomizer: () => void
  setWorkspacePreset: (preset: WorkspacePreset) => void
  resetWorkspaceUi: () => void
  resetAllProgress: () => Promise<void>
  movePanel: (
    panelId: PanelId,
    side: DockSide,
    beforePanelId?: PanelId | null,
    targetSlot?: number | null,
  ) => void
  togglePanelVisibility: (panelId: PanelId) => void
}
