import type { AtomTotals, ResourceId } from '@domain/resources/resourceCatalog'
import type { MarketProductId as SpecMarketProductId } from '../domain/spec/gameSpec'
import type { CrewSleepShiftStartHour } from '../domain/spec/gameSpec'
import type { CleanupTargetClassId, CleanupTargetKind, CleanupZoneId } from '@domain/spec/worldSpec'
import type { SectorId } from '@domain/spec/sectorSpec'

export type PanelId = 'tutorial' | 'inventory' | 'object' | 'hud' | 'actions'
export type DockSide = 'left' | 'right'
export type GameMenuSection =
  | 'quests'
  | 'ship'
  | 'inventory'
  | 'map'
  | 'laboratory'
  | 'station'
  | 'store'
  | 'crew'
  | 'failures'
  | 'log'
  | 'wiki'
export type LabTab =
  | 'station'
  | 'sorting'
  | 'hydrogen'
  | 'refining'
  | 'manufacturing'
  | 'market'
  | 'atoms'
  | 'failures'
  | 'logs'
export type UiDensity = 'compact' | 'comfortable'
export type WorkspacePreset = 'balanced' | 'flight' | 'combat' | 'mining' | 'analysis' | 'labFirst'
export type MarketProductId = SpecMarketProductId
export type FailureReason = 'combat' | 'starvation'
export type ExtractionEventType = 'laserFired' | 'laserBlocked' | 'targetExtracted'

export interface ExtractionTargetPayload {
  targetId: string
  classId: CleanupTargetClassId
  kind: CleanupTargetKind
  zoneId: CleanupZoneId
  riskRating: number
  signatureElementSymbol: string
  expectedYield: Partial<Record<ResourceId, number>>
}

export interface ExtractionEvent {
  id: number
  timestamp: number
  type: ExtractionEventType
  succeeded: boolean
  message: string
  energyCost: number
  requiredEnergy?: number
  targetId?: string
  targetClassId?: CleanupTargetClassId
  targetKind?: CleanupTargetKind
  zoneId?: CleanupZoneId
  riskRating?: number
  signatureElementSymbol?: string
  yieldApplied?: Partial<Record<ResourceId, number>>
}

export interface SelectedObject {
  id: string
  type: 'asteroid' | 'spaceJunk' | 'ship' | 'station' | 'extractionNode'
  name: string
  description: string
  distance: number
  elementSymbol?: string
  integrity?: number
  targetClassId?: CleanupTargetClassId
  targetClassLabel?: string
  targetKind?: CleanupTargetKind
  targetKindLabel?: string
  zoneId?: CleanupZoneId
  zoneLabel?: string
  riskRating?: number
  riskBand?: string
  expectedYieldPreview?: string
  expectedYieldTop?: string[]
}

export interface ShipTelemetry {
  speed: number
  health: number
  attacks: number
  cooldown: number
  lookInputX?: number
  lookInputY?: number
  strafeInput?: number
  verticalInput?: number
  targetLocked?: boolean
  trainingLookComplete?: boolean
  trainingHorizontalStrafeComplete?: boolean
  trainingVerticalStrafeComplete?: boolean
  trainingForwardReverseComplete?: boolean
  trainingBoostComplete?: boolean
  trainingDroneLockComplete?: boolean
  trainingDroneDestroyed?: boolean
}

export interface CrewStatus {
  hunger: number
  debuff: number
  starving: boolean
  foodAutomationEnabled: boolean
}

export interface CrewMemberState {
  id: string
  name: string
  portraitUrl?: string
  hunger: number
  thirst: number
  debuff: number
  starving: boolean
  dehydrated: boolean
  sleepShiftStartHour: CrewSleepShiftStartHour
  sleeping: boolean
  firstGalaxyBarBoostApplied: boolean
  dailyScheduleDayIndex: number
  dailyBreakfastServed: boolean
  dailyLunchServed: boolean
  dailyDinnerServed: boolean
  dailyWaterServedCount: number
}

export interface FridgeState {
  unlocked: boolean
  galaxyBars: number
  capacity: number
  waterLiters?: number
  waterCapacityLiters?: number
}

export interface CrewAggregateMetrics {
  awakeCount: number
  averageHunger: number
  averageThirst: number
  averageDebuff: number
  starvingCount: number
  dehydratedCount: number
}

export interface CommsSpeaker {
  id: string
  name: string
  role: string
  imageUrl: string
}

export interface RadarContact {
  id: string
  x: number
  z: number
  distance: number
  symbol: string
  integrity: number
  contactRole?: 'target' | 'node'
  targetClassId?: CleanupTargetClassId
  targetClassLabel?: string
  targetKind?: CleanupTargetKind
  targetKindLabel?: string
  zoneId?: CleanupZoneId
  zoneLabel?: string
  riskRating?: number
  riskBand?: string
  expectedYieldPreview?: string
}

export interface SimulationSummary {
  chargingRate: number
  containmentDrain: number
  recombinationRate: number
  inRange: boolean
  netEnergyPerSecond: number
}

export interface SimulationLogEntry {
  id: number
  message: string
  timestamp: number
}

export interface FailureMaterialCost {
  resourceId: ResourceId
  label: string
  required: number
  used: number
  shortage: number
}

export interface FailureReportEntry {
  id: number
  timestamp: number
  reason: FailureReason
  reasonLabel: string
  creditsPenalty: number
  energyPenalty: number
  materials: FailureMaterialCost[]
  hadMaterialShortage: boolean
  resetToStart: boolean
  repairCount: number
}

export interface MarketProductState {
  productId: MarketProductId
  basePrice: number
  price: number
  demand: number
  recentSales: number
}

export interface TutorialChecklistItem {
  id: string
  title: string
  description: string
  detail?: string
  hint?: string
  focusTarget?: string
  labTab?: LabTab
  completed: boolean
}

export interface QuestRewardEntryView {
  id: string
  label: string
  description: string
}

export interface QuestRewardNotification {
  id: number
  questId: string
  questTitle: string
  rewards: QuestRewardEntryView[]
  grants: string[]
  unlocks: string[]
  timestamp: number
}

export interface StationState {
  activeSectorId?: SectorId
  stationDistance: number
  stationDistanceScene: number
  stationDistanceManual: number
  useSceneDistance: boolean
  charging: boolean
  docked: boolean
  containmentOn: boolean
  containmentPower: number
  energy: number
  maxEnergy: number
}

export type ResourceInventory = Partial<Record<ResourceId, number>>

export type AtomCounter = AtomTotals

