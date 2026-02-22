import { CLEANUP_ZONES } from '@domain/spec/worldSpec'
import { describe, expect, it } from 'vitest'
import {
  cleanupTargetClassCatalog,
  generateCleanupWorld,
  totalCleanupTargetCount,
} from './cleanupCatalog'

describe('cleanup world generation', () => {
  it('is deterministic for the same seed', () => {
    const first = generateCleanupWorld({ seed: 'seed-alpha' })
    const second = generateCleanupWorld({ seed: 'seed-alpha' })

    expect(first.targets).toEqual(second.targets)
    expect(first.zones).toEqual(second.zones)
  })

  it('changes target distribution for different seeds', () => {
    const first = generateCleanupWorld({ seed: 'seed-alpha' })
    const second = generateCleanupWorld({ seed: 'seed-beta' })

    const firstFingerprint = first.targets
      .slice(0, 8)
      .map((target) => `${target.id}:${target.classId}:${target.position.x}:${target.position.y}:${target.position.z}`)
      .join('|')

    const secondFingerprint = second.targets
      .slice(0, 8)
      .map((target) => `${target.id}:${target.classId}:${target.position.x}:${target.position.y}:${target.position.z}`)
      .join('|')

    expect(firstFingerprint).not.toEqual(secondFingerprint)
  })

  it('spawns exactly the expected target count with unique ids', () => {
    const world = generateCleanupWorld({ seed: 'seed-alpha' })
    const expectedCount = totalCleanupTargetCount(CLEANUP_ZONES)
    const ids = world.targets.map((target) => target.id)

    expect(world.targets).toHaveLength(expectedCount)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('cleanup target class taxonomy', () => {
  it('includes the required cleanup classes', () => {
    expect(Object.keys(cleanupTargetClassCatalog).sort()).toEqual([
      'carbonRichAsteroid',
      'compositeJunk',
      'metalScrap',
      'rockBody',
      'volatileIceChunk',
    ])
  })

  it('defines mixed-yield outputs (not single-resource extraction)', () => {
    Object.values(cleanupTargetClassCatalog).forEach((definition) => {
      const nonZeroOutputs = Object.values(definition.yieldProfile).filter((amount) => amount > 0)
      expect(nonZeroOutputs.length).toBeGreaterThanOrEqual(2)
    })
  })
})
