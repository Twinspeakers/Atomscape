import type { Mesh, TransformNode, Vector3 } from 'babylonjs'
import type { ResourceId } from '@domain/resources/resourceCatalog'
import type {
  CleanupTargetClassId,
  CleanupTargetKind,
  CleanupZoneDefinition,
  CleanupZoneId,
} from '@domain/spec/worldSpec'
import type { SectorId } from '@domain/spec/sectorSpec'
import type {
  ExtractionTargetPayload,
  FailureReason,
  RadarContact,
  SelectedObject,
  ShipTelemetry,
} from '@state/types'

export interface SpaceViewportProps {
  inputSuppressed?: boolean
  paused?: boolean
  respawnSignal?: number
  charging?: boolean
  docked?: boolean
  activeSectorId?: SectorId
  questFocusTarget?: string | null
  currentTutorialStepId?: string | null
  worldSeed?: string
  depletedTargetIds?: string[]
  onTryFireLaser: () => boolean
  onExtractionHit: (target: ExtractionTargetPayload) => void
  onTargetDepleted?: (target: ExtractionTargetPayload) => void
  onStationDistance: (distance: number) => void
  onActiveZoneChange?: (zoneId: CleanupZoneId | null) => void
  onSelectObject: (selection: SelectedObject | null) => void
  onTelemetry: (telemetry: ShipTelemetry) => void
  onRadarContacts: (contacts: RadarContact[]) => void
  onShipFailure: (reason: FailureReason) => void
  onShipCollisionEvent?: (event: ShipCollisionEvent) => void
  onStationFeedback?: (event: StationFeedbackEvent) => void
  onAimStateChange?: (state: CrosshairAimState) => void
  onCrosshairFeedback?: (feedback: CrosshairFeedback) => void
  onTargetLabelAnchors?: (anchors: TargetLabelAnchor[]) => void
  onPortalTransit?: (targetSectorId: SectorId) => void
}

export interface ShipCollisionEvent {
  source: 'asteroid' | 'station' | 'boundary' | 'celestial'
  impactSpeed: number
}

export type StationFeedbackKind =
  | 'enteredRange'
  | 'leftRange'
  | 'chargingBlocked'
  | 'dockAvailable'
  | 'dockUnavailable'
  | 'docked'
  | 'undocked'

export interface StationFeedbackEvent {
  kind: StationFeedbackKind
  distance: number
}

export interface CrosshairAimState {
  targetLocked: boolean
  targetDistance: number | null
}

export type CrosshairFeedback = 'fired' | 'blocked' | 'hit'

export interface TargetLabelAnchor {
  targetId: string
  label: string
  x: number
  y: number
  priority: 'normal' | 'selected' | 'locked'
}

export interface AsteroidEntity {
  targetId: string
  mesh: Mesh
  classId: CleanupTargetClassId
  kind: CleanupTargetKind
  zoneId: CleanupZoneId
  label: string
  description: string
  signatureElementSymbol: string
  riskRating: number
  yieldPreview: string
  expectedYield: Partial<Record<ResourceId, number>>
  radius: number
  integrity: number
}

export interface ExtractionNodeEntity {
  nodeId: string
  mesh: Mesh
  classId: CleanupTargetClassId
  kind: CleanupTargetKind
  zoneId: CleanupZoneId
  label: string
  description: string
  signatureElementSymbol: string
  riskRating: number
  yieldPreview: string
  expectedYield: Partial<Record<ResourceId, number>>
  extractionRange: number
  extractionIntervalSeconds: number
}

export interface CelestialLabelTarget {
  id: string
  label: string
  node: TransformNode | Mesh
}

export interface SectorMapTelemetry {
  sectorId: SectorId
  worldSeed: string
  worldTargetCount: number
  worldDestroyedCount: number
  worldRemainingCount: number
  visitedZoneCount: number
  updatedAt: number
  stationName: string
  zoneDefinitions: CleanupZoneDefinition[]
}

export interface ProjectileEntity {
  mesh: Mesh
  velocity: Vector3
  ttl: number
}

export interface DynamicCollisionBody {
  id: string
  source: 'celestial'
  mesh: Mesh
  radius: number
  isActive: () => boolean
}
