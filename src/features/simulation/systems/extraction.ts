import {
  MINING_ASTEROID_RUBBLE_YIELD,
  MINING_CREW_DEBUFF_ENERGY_FACTOR,
  MINING_LASER_ENERGY_COST,
} from '@domain/spec/gameSpec'
import { resourceIds, type ResourceId } from '@domain/resources/resourceCatalog'
import type {
  CleanupTargetClassId,
  CleanupTargetKind,
  CleanupYieldProfile,
  CleanupZoneId,
} from '@domain/spec/worldSpec'
import type { ResourceInventory } from '@state/types'
import { clamp, roundQty } from '../math'

export interface ExtractionTargetSnapshot {
  targetId: string
  classId: CleanupTargetClassId
  kind: CleanupTargetKind
  zoneId: CleanupZoneId
  riskRating: number
  signatureElementSymbol: string
  expectedYield: CleanupYieldProfile
}

export type ExtractionEventType = 'laserFired' | 'laserBlocked' | 'targetExtracted'

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
  yieldApplied?: CleanupYieldProfile
}

export interface AttemptMiningLaserFireInput {
  energy: number
  maxEnergy: number
  crewDebuff: number
  now?: number
}

export interface AttemptMiningLaserFireResult {
  succeeded: boolean
  energy: number
  energyCost: number
  logMessage: string | null
  event: ExtractionEvent
}

export interface ResolveExtractionHitInput {
  inventory: ResourceInventory
  target: ExtractionTargetSnapshot
  now?: number
}

export interface ResolveExtractionHitResult {
  inventory: ResourceInventory
  inventoryChanged: boolean
  logMessage: string
  event: ExtractionEvent
}

function isResourceId(value: string): value is ResourceId {
  return (resourceIds as string[]).includes(value)
}

function normalizeExpectedYield(expectedYield: CleanupYieldProfile): CleanupYieldProfile {
  const normalizedEntries = Object.entries(expectedYield)
    .filter(([resourceId, amount]) => isResourceId(resourceId) && Number.isFinite(amount) && amount > 0)
    .map(([resourceId, amount]) => [resourceId, roundQty(amount)])

  if (normalizedEntries.length === 0) {
    return { rubble: MINING_ASTEROID_RUBBLE_YIELD }
  }

  return Object.fromEntries(normalizedEntries)
}

function summarizeYield(yieldProfile: CleanupYieldProfile): string {
  const topRows = (Object.entries(yieldProfile) as Array<[ResourceId, number]>)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([resourceId, amount]) => `${amount.toFixed(2)} ${resourceId}`)

  return topRows.length > 0 ? topRows.join(', ') : 'no recoverable output'
}

export function miningLaserEnergyCost(crewDebuff: number): number {
  const debuff = clamp(crewDebuff, 0, 100)
  const multiplier = 1 + (debuff / 100) * MINING_CREW_DEBUFF_ENERGY_FACTOR
  return roundQty(MINING_LASER_ENERGY_COST * multiplier)
}

export function attemptMiningLaserFire(
  input: AttemptMiningLaserFireInput,
): AttemptMiningLaserFireResult {
  const now = input.now ?? Date.now()
  const energyCost = miningLaserEnergyCost(input.crewDebuff)

  if (input.energy < energyCost) {
    const message = `Mining laser blocked: insufficient energy (${energyCost.toFixed(2)} required).`

    return {
      succeeded: false,
      energy: input.energy,
      energyCost: 0,
      logMessage: message,
      event: {
        id: now,
        timestamp: now,
        type: 'laserBlocked',
        succeeded: false,
        message,
        energyCost: 0,
        requiredEnergy: energyCost,
      },
    }
  }

  const energy = roundQty(clamp(input.energy - energyCost, 0, input.maxEnergy))

  return {
    succeeded: true,
    energy,
    energyCost,
    logMessage: null,
    event: {
      id: now,
      timestamp: now,
      type: 'laserFired',
      succeeded: true,
      message: `Mining laser fired (${energyCost.toFixed(2)} energy).`,
      energyCost,
    },
  }
}

export function resolveExtractionHit(
  input: ResolveExtractionHitInput,
): ResolveExtractionHitResult {
  const now = input.now ?? Date.now()
  const appliedYield = normalizeExpectedYield(input.target.expectedYield)
  const inventory = { ...input.inventory }

  ;(Object.entries(appliedYield) as Array<[ResourceId, number]>).forEach(([resourceId, amount]) => {
    inventory[resourceId] = roundQty((inventory[resourceId] ?? 0) + amount)
  })

  const message = `Extraction resolved: ${input.target.classId} (${input.target.signatureElementSymbol}) yielded ${summarizeYield(appliedYield)}.`

  return {
    inventory,
    inventoryChanged: true,
    logMessage: message,
    event: {
      id: now,
      timestamp: now,
      type: 'targetExtracted',
      succeeded: true,
      message,
      energyCost: 0,
      targetClassId: input.target.classId,
      targetId: input.target.targetId,
      targetKind: input.target.kind,
      zoneId: input.target.zoneId,
      riskRating: roundQty(clamp(input.target.riskRating, 0, 1)),
      signatureElementSymbol: input.target.signatureElementSymbol,
      yieldApplied: appliedYield,
    },
  }
}
