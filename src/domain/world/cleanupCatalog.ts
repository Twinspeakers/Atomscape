import {
  CLEANUP_ZONES,
  DEFAULT_WORLD_SEED,
  type CleanupTargetClassDefinition,
  type CleanupTargetClassId,
  type CleanupZoneDefinition,
  type CleanupZoneId,
  type CleanupYieldProfile,
  type WorldVector3,
} from '@domain/spec/worldSpec'
import {
  clamp,
  createSeededRandom,
  pickWeightedKey,
  randomRange,
  roundQty,
} from '@shared/math/simulationMath'

export interface CleanupTargetInstance {
  id: string
  zoneId: CleanupZoneId
  classId: CleanupTargetClassId
  label: string
  description: string
  signatureElementSymbol: string
  riskRating: number
  position: WorldVector3
  radius: number
  integrity: number
  expectedYield: CleanupYieldProfile
}

export interface CleanupWorldModel {
  seed: string
  zones: CleanupZoneDefinition[]
  targets: CleanupTargetInstance[]
}

export interface GenerateCleanupWorldOptions {
  seed?: string
  zones?: CleanupZoneDefinition[]
}

export const cleanupTargetClassCatalog: Record<CleanupTargetClassId, CleanupTargetClassDefinition> = {
  rockBody: {
    id: 'rockBody',
    kind: 'asteroid',
    label: 'Rock Body',
    description: 'Silicate-heavy asteroid chunk with trace metals and low volatiles.',
    riskRating: 0.35,
    signatureElementSymbol: 'Si',
    baseIntegrity: 100,
    minRadius: 0.9,
    maxRadius: 2.4,
    yieldProfile: {
      rubble: 1.35,
      silicaSand: 0.24,
      ironOre: 0.26,
      carbonRock: 0.07,
      waterIce: 0.05,
      slagWaste: 0.16,
    },
  },
  metalScrap: {
    id: 'metalScrap',
    kind: 'spaceJunk',
    label: 'Metal Scrap Cluster',
    description: 'Fragmented station hull pieces mixed with oxidized ore dust.',
    riskRating: 0.52,
    signatureElementSymbol: 'Fe',
    baseIntegrity: 82,
    minRadius: 0.75,
    maxRadius: 1.9,
    yieldProfile: {
      rubble: 1.04,
      ironOre: 0.58,
      ironMetal: 0.16,
      carbonRock: 0.08,
      slagWaste: 0.3,
    },
  },
  compositeJunk: {
    id: 'compositeJunk',
    kind: 'spaceJunk',
    label: 'Composite Junk Cluster',
    description: 'Mixed polymer, alloy, and shielding debris from orbital construction waste.',
    riskRating: 0.64,
    signatureElementSymbol: 'C',
    baseIntegrity: 76,
    minRadius: 0.8,
    maxRadius: 2.2,
    yieldProfile: {
      rubble: 1.2,
      silicaSand: 0.18,
      ironOre: 0.22,
      carbonRock: 0.32,
      co2Ice: 0.14,
      slagWaste: 0.36,
    },
  },
  carbonRichAsteroid: {
    id: 'carbonRichAsteroid',
    kind: 'asteroid',
    label: 'Carbon-rich Asteroid',
    description: 'Dark carbonaceous body with high organic feedstock and trapped volatile carbon compounds.',
    riskRating: 0.58,
    signatureElementSymbol: 'C',
    baseIntegrity: 68,
    minRadius: 0.85,
    maxRadius: 2.3,
    yieldProfile: {
      rubble: 0.96,
      carbonRock: 1.12,
      co2Ice: 0.3,
      waterIce: 0.08,
      silicaSand: 0.06,
      slagWaste: 0.22,
    },
  },
  volatileIceChunk: {
    id: 'volatileIceChunk',
    kind: 'asteroid',
    label: 'Volatile Ice Chunk',
    description: 'Cryogenic body rich in water and CO2 ice mixed with brittle regolith.',
    riskRating: 0.74,
    signatureElementSymbol: 'O',
    baseIntegrity: 62,
    minRadius: 0.95,
    maxRadius: 2.6,
    yieldProfile: {
      rubble: 0.72,
      waterIce: 0.78,
      co2Ice: 0.52,
      carbonRock: 0.12,
      slagWaste: 0.18,
    },
  },
}

function roundVector(position: WorldVector3): WorldVector3 {
  return {
    x: Number(position.x.toFixed(3)),
    y: Number(position.y.toFixed(3)),
    z: Number(position.z.toFixed(3)),
  }
}

function scaleYieldProfile(profile: CleanupYieldProfile, scalar: number): CleanupYieldProfile {
  const scaledEntries = Object.entries(profile).map(([resourceId, amount]) => [
    resourceId,
    roundQty(amount * scalar),
  ])

  return Object.fromEntries(scaledEntries)
}

function zonePosition(
  random: () => number,
  zone: CleanupZoneDefinition,
  targetRadius: number,
): WorldVector3 {
  const maxSpawnRadius = Math.max(8, zone.radius - targetRadius)
  const radial = Math.cbrt(random()) * maxSpawnRadius
  let directionX = 0
  let directionY = 1
  let directionZ = 0

  // Rejection sampling for a stable, deterministic random unit direction.
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidateX = random() * 2 - 1
    const candidateY = random() * 2 - 1
    const candidateZ = random() * 2 - 1
    const lengthSquared =
      candidateX * candidateX
      + candidateY * candidateY
      + candidateZ * candidateZ

    if (lengthSquared <= 0.000001 || lengthSquared > 1) {
      continue
    }

    const inverseLength = 1 / Math.sqrt(lengthSquared)
    directionX = candidateX * inverseLength
    directionY = candidateY * inverseLength
    directionZ = candidateZ * inverseLength
    break
  }

  return roundVector({
    x: zone.center.x + directionX * radial,
    y: zone.center.y + directionY * radial,
    z: zone.center.z + directionZ * radial,
  })
}

function spawnTargetInZone(
  random: () => number,
  zone: CleanupZoneDefinition,
  indexInZone: number,
): CleanupTargetInstance {
  const classId = pickWeightedKey(random, zone.classWeights)
  const definition = cleanupTargetClassCatalog[classId]
  const radius = roundQty(randomRange(random, definition.minRadius, definition.maxRadius))
  const integrityJitter = randomRange(random, -12, 12)
  const integrity = roundQty(clamp(definition.baseIntegrity + integrityJitter, 35, 100))
  const expectedYield = scaleYieldProfile(
    definition.yieldProfile,
    clamp(radius / definition.minRadius, 0.85, 2.2),
  )

  return {
    id: `${zone.id}-${String(indexInZone).padStart(3, '0')}`,
    zoneId: zone.id,
    classId,
    label: definition.label,
    description: definition.description,
    signatureElementSymbol: definition.signatureElementSymbol,
    riskRating: roundQty((definition.riskRating + zone.riskRating) * 0.5),
    radius,
    integrity,
    position: zonePosition(random, zone, radius),
    expectedYield,
  }
}

export function generateCleanupWorld(options?: GenerateCleanupWorldOptions): CleanupWorldModel {
  const zones = options?.zones ?? CLEANUP_ZONES
  const seed = options?.seed ?? DEFAULT_WORLD_SEED
  const random = createSeededRandom(seed)
  const targets: CleanupTargetInstance[] = []

  zones.forEach((zone) => {
    for (let index = 0; index < zone.targetCount; index += 1) {
      targets.push(spawnTargetInZone(random, zone, index))
    }
  })

  return {
    seed,
    zones,
    targets,
  }
}

export function totalCleanupTargetCount(zones: CleanupZoneDefinition[] = CLEANUP_ZONES): number {
  return zones.reduce((sum, zone) => sum + zone.targetCount, 0)
}
