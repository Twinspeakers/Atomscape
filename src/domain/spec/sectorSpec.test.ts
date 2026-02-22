import { describe, expect, it } from 'vitest'
import { resolveSectorCelestialConfig } from './sectorSpec'

describe('sector celestial config', () => {
  it('keeps Earth Corridor Earth as a background celestial body', () => {
    const config = resolveSectorCelestialConfig('earthCorridor')
    const earth = config.bodies.find((body) => body.id === 'earth')
    const moon = config.bodies.find((body) => body.id === 'moon')

    expect(earth).toBeDefined()
    expect(earth?.renderMode).toBe('background')
    expect(moon).toBeDefined()
    expect(moon?.anchor).toBe('primary')
  })

  it('provides Mars Corridor bodies with Mars moon identities', () => {
    const config = resolveSectorCelestialConfig('marsCorridor')
    const bodyIds = config.bodies.map((body) => body.id)

    expect(bodyIds).toContain('sun')
    expect(bodyIds).toContain('mars')
    expect(bodyIds).toContain('phobos')
    expect(bodyIds).toContain('deimos')
    expect(bodyIds).not.toContain('earth')
  })
})
