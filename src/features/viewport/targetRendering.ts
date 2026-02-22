import { Vector3 } from 'babylonjs'
import { formatQty, resourceById, type ResourceId } from '@domain/resources/resourceCatalog'
import { CLEANUP_ZONES } from '@domain/spec/worldSpec'
import type { RadarContact, SelectedObject } from '@state/types'
import type { AsteroidEntity, ExtractionNodeEntity } from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function buildYieldPreview(expectedYield: Partial<Record<ResourceId, number>>): string {
  const topRows = (Object.entries(expectedYield) as Array<[ResourceId, number]>)
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([resourceId, amount]) => `${formatQty(amount)} ${resourceById[resourceId].label}`)

  return topRows.length > 0 ? topRows.join(', ') : 'No recoverable materials'
}

function buildYieldTopRows(expectedYield: Partial<Record<ResourceId, number>>, limit = 3): string[] {
  return (Object.entries(expectedYield) as Array<[ResourceId, number]>)
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([resourceId, amount]) => `${resourceById[resourceId].label}: ${formatQty(amount)}`)
}

function readableTargetKind(kind: AsteroidEntity['kind']): string {
  return kind === 'spaceJunk' ? 'Space Junk' : 'Asteroid'
}

function riskBand(riskRating: number): string {
  if (riskRating >= 0.75) {
    return 'Critical'
  }

  if (riskRating >= 0.55) {
    return 'High'
  }

  if (riskRating >= 0.35) {
    return 'Moderate'
  }

  return 'Low'
}

const zoneLabelById = Object.fromEntries(CLEANUP_ZONES.map((zone) => [zone.id, zone.label]))

export function buildSelectionFromAsteroid(
  asteroid: AsteroidEntity,
  shipPosition: Vector3,
): SelectedObject {
  const readableType = asteroid.kind === 'spaceJunk' ? 'spaceJunk' : 'asteroid'
  const risk = clamp(asteroid.riskRating, 0, 1)
  const yieldPreview = buildYieldPreview(asteroid.expectedYield)
  const yieldTop = buildYieldTopRows(asteroid.expectedYield)

  return {
    id: asteroid.mesh.id,
    type: readableType,
    name: asteroid.label,
    description: `${asteroid.description} Expected outputs: ${yieldPreview}.`,
    distance: Vector3.Distance(shipPosition, asteroid.mesh.position),
    elementSymbol: asteroid.signatureElementSymbol,
    integrity: asteroid.integrity,
    targetClassId: asteroid.classId,
    targetClassLabel: asteroid.label,
    targetKind: asteroid.kind,
    targetKindLabel: readableTargetKind(asteroid.kind),
    zoneId: asteroid.zoneId,
    zoneLabel: zoneLabelById[asteroid.zoneId] ?? asteroid.zoneId,
    riskRating: risk,
    riskBand: riskBand(risk),
    expectedYieldPreview: yieldPreview,
    expectedYieldTop: yieldTop,
  }
}

export function buildSelectionFromExtractionNode(
  extractionNode: ExtractionNodeEntity,
  shipPosition: Vector3,
): SelectedObject {
  const risk = clamp(extractionNode.riskRating, 0, 1)
  const yieldPreview = buildYieldPreview(extractionNode.expectedYield)
  const yieldTop = buildYieldTopRows(extractionNode.expectedYield)

  return {
    id: extractionNode.mesh.id,
    type: 'extractionNode',
    name: extractionNode.label,
    description: `${extractionNode.description} Sustained extraction profile: ${yieldPreview}.`,
    distance: Vector3.Distance(shipPosition, extractionNode.mesh.position),
    elementSymbol: extractionNode.signatureElementSymbol,
    integrity: 100,
    targetClassId: extractionNode.classId,
    targetClassLabel: extractionNode.label,
    targetKind: extractionNode.kind,
    targetKindLabel: `Extraction Node (${readableTargetKind(extractionNode.kind)})`,
    zoneId: extractionNode.zoneId,
    zoneLabel: zoneLabelById[extractionNode.zoneId] ?? extractionNode.zoneId,
    riskRating: risk,
    riskBand: riskBand(risk),
    expectedYieldPreview: yieldPreview,
    expectedYieldTop: yieldTop,
  }
}

export function buildRadarContacts(
  asteroids: AsteroidEntity[],
  extractionNodes: ExtractionNodeEntity[],
  shipPosition: Vector3,
  radarRange: number,
): RadarContact[] {
  const asteroidContacts = asteroids
    .map((asteroid) => {
      const offset = asteroid.mesh.position.subtract(shipPosition)
      return {
        asteroid,
        distance: offset.length(),
        x: clamp(offset.x / radarRange, -1, 1),
        z: clamp(offset.z / radarRange, -1, 1),
      }
    })
    .filter((entry) => entry.distance <= radarRange)
    .map((entry) => ({
      id: entry.asteroid.mesh.id,
      x: entry.x,
      z: entry.z,
      distance: entry.distance,
      symbol: entry.asteroid.signatureElementSymbol,
      integrity: entry.asteroid.integrity,
      contactRole: 'target' as const,
      targetClassId: entry.asteroid.classId,
      targetClassLabel: entry.asteroid.label,
      targetKind: entry.asteroid.kind,
      targetKindLabel: readableTargetKind(entry.asteroid.kind),
      zoneId: entry.asteroid.zoneId,
      zoneLabel: zoneLabelById[entry.asteroid.zoneId] ?? entry.asteroid.zoneId,
      riskRating: clamp(entry.asteroid.riskRating, 0, 1),
      riskBand: riskBand(clamp(entry.asteroid.riskRating, 0, 1)),
      expectedYieldPreview: buildYieldPreview(entry.asteroid.expectedYield),
    }))

  const nodeContacts = extractionNodes
    .map((extractionNode) => {
      const offset = extractionNode.mesh.position.subtract(shipPosition)
      return {
        extractionNode,
        distance: offset.length(),
        x: clamp(offset.x / radarRange, -1, 1),
        z: clamp(offset.z / radarRange, -1, 1),
      }
    })
    .filter((entry) => entry.distance <= radarRange)
    .map((entry) => ({
      id: entry.extractionNode.mesh.id,
      x: entry.x,
      z: entry.z,
      distance: entry.distance,
      symbol: entry.extractionNode.signatureElementSymbol,
      integrity: 100,
      contactRole: 'node' as const,
      targetClassId: entry.extractionNode.classId,
      targetClassLabel: entry.extractionNode.label,
      targetKind: entry.extractionNode.kind,
      targetKindLabel: `Extraction Node (${readableTargetKind(entry.extractionNode.kind)})`,
      zoneId: entry.extractionNode.zoneId,
      zoneLabel: zoneLabelById[entry.extractionNode.zoneId] ?? entry.extractionNode.zoneId,
      riskRating: clamp(entry.extractionNode.riskRating, 0, 1),
      riskBand: riskBand(clamp(entry.extractionNode.riskRating, 0, 1)),
      expectedYieldPreview: entry.extractionNode.yieldPreview,
    }))

  return [...nodeContacts, ...asteroidContacts]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 36)
}
