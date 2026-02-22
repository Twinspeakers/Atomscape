import type { ResourceId } from '@domain/resources/resourceCatalog'

export interface WorldVector3 {
  x: number
  y: number
  z: number
}

export type CleanupTargetKind = 'asteroid' | 'spaceJunk'

export type CleanupTargetClassId =
  | 'rockBody'
  | 'metalScrap'
  | 'compositeJunk'
  | 'carbonRichAsteroid'
  | 'volatileIceChunk'

export type CleanupZoneId =
  | 'nearStationBelt'
  | 'denseDebrisLane'
  | 'highRiskSalvagePocket'

export type CleanupYieldProfile = Partial<Record<ResourceId, number>>

export interface CleanupTargetClassDefinition {
  id: CleanupTargetClassId
  kind: CleanupTargetKind
  label: string
  description: string
  riskRating: number
  signatureElementSymbol: string
  baseIntegrity: number
  minRadius: number
  maxRadius: number
  yieldProfile: CleanupYieldProfile
}

export interface CleanupZoneDefinition {
  id: CleanupZoneId
  label: string
  description: string
  center: WorldVector3
  radius: number
  targetCount: number
  riskRating: number
  classWeights: Record<CleanupTargetClassId, number>
}

export const DEFAULT_WORLD_SEED = 'orbital-cleanup-v1'
export const WORLD_COORDINATE_LIMIT = 1200

export const CLEANUP_ZONES: CleanupZoneDefinition[] = [
  {
    id: 'nearStationBelt',
    label: 'Near-Station Belt',
    description: 'Low-risk cleanup ring around station traffic lanes.',
    center: { x: 0, y: 0, z: 0 },
    radius: 250,
    targetCount: 120,
    riskRating: 0.32,
    classWeights: {
      rockBody: 0.38,
      metalScrap: 0.22,
      compositeJunk: 0.16,
      carbonRichAsteroid: 0.12,
      volatileIceChunk: 0.12,
    },
  },
  {
    id: 'denseDebrisLane',
    label: 'Dense Debris Lane',
    description: 'Higher-density orbital garbage stream with mixed salvage quality.',
    center: { x: 210, y: 24, z: -160 },
    radius: 220,
    targetCount: 100,
    riskRating: 0.56,
    classWeights: {
      rockBody: 0.17,
      metalScrap: 0.28,
      compositeJunk: 0.25,
      carbonRichAsteroid: 0.2,
      volatileIceChunk: 0.1,
    },
  },
  {
    id: 'highRiskSalvagePocket',
    label: 'High-Risk Salvage Pocket',
    description: 'Volatile cold pocket with unstable chunks and high-value mixed feeds.',
    center: { x: -230, y: -50, z: 220 },
    radius: 220,
    targetCount: 90,
    riskRating: 0.78,
    classWeights: {
      rockBody: 0.1,
      metalScrap: 0.12,
      compositeJunk: 0.18,
      carbonRichAsteroid: 0.3,
      volatileIceChunk: 0.3,
    },
  },
]
