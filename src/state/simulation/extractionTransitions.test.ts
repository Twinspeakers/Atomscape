import { describe, expect, it } from 'vitest'
import type { SimulationLogEntry } from '@state/types'
import {
  applyRecordExtractionHitTransition,
  applyTryFireMiningLaserTransition,
  type FireMiningLaserTransitionState,
} from './extractionTransitions'

function appendLog({ logs, message }: { logs: SimulationLogEntry[]; message: string }): SimulationLogEntry[] {
  return [
    {
      id: logs.length + 1,
      message,
      timestamp: logs.length + 1,
    },
    ...logs,
  ]
}

function createFireState(overrides?: Partial<FireMiningLaserTransitionState>): FireMiningLaserTransitionState {
  return {
    energy: 100,
    maxEnergy: 200,
    crewDebuff: 0,
    stationDistance: 100,
    charging: false,
    containmentOn: false,
    containmentPower: 60,
    simulationLog: [],
    extractionEvents: [],
    ...overrides,
  }
}

describe('extractionTransitions', () => {
  it('returns success transition when mining laser can fire', () => {
    const transition = applyTryFireMiningLaserTransition(
      createFireState(),
      0,
      appendLog,
      { now: 10_000 },
    )

    expect(transition.kind).toBe('success')
    if (transition.kind !== 'success') {
      throw new Error('Expected success transition.')
    }

    expect(transition.fired).toBe(true)
    expect(transition.energy).toBeLessThan(100)
    expect(transition.extractionEvents[0]?.type).toBe('laserFired')
  })

  it('rate limits low-power logs and emits blocked event when logging allowed', () => {
    const loggedTransition = applyTryFireMiningLaserTransition(
      createFireState({ energy: 0 }),
      0,
      appendLog,
      { now: 10_000 },
    )
    const silentTransition = applyTryFireMiningLaserTransition(
      createFireState({ energy: 0 }),
      9_000,
      appendLog,
      { now: 10_000 },
    )

    expect(loggedTransition.kind).toBe('blocked-logged')
    if (loggedTransition.kind !== 'blocked-logged') {
      throw new Error('Expected blocked-logged transition.')
    }

    expect(loggedTransition.fired).toBe(false)
    expect(loggedTransition.simulationLog[0]?.message).toContain('Mining laser blocked')
    expect(loggedTransition.extractionEvents[0]?.type).toBe('laserBlocked')
    expect(loggedTransition.nextLowPowerLogTime).toBe(10_000)

    expect(silentTransition.kind).toBe('blocked-silent')
    if (silentTransition.kind !== 'blocked-silent') {
      throw new Error('Expected blocked-silent transition.')
    }
    expect(silentTransition.fired).toBe(false)
    expect(silentTransition.nextLowPowerLogTime).toBe(9_000)
  })

  it('applies extraction hit transition and requests inventory persistence', () => {
    const transition = applyRecordExtractionHitTransition(
      {
        inventory: {},
        simulationLog: [],
        extractionEvents: [],
      },
      {
        targetId: 'target-1',
        classId: 'rockBody',
        kind: 'asteroid',
        zoneId: 'nearStationBelt',
        riskRating: 0.25,
        signatureElementSymbol: 'Si',
        expectedYield: { rubble: 2.5 },
      },
      appendLog,
      { now: 12_000 },
    )

    expect(transition.persistInventory).toBe(true)
    expect(transition.inventory.rubble).toBeCloseTo(2.5)
    expect(transition.simulationLog[0]?.message).toContain('Extraction resolved')
    expect(transition.extractionEvents[0]?.type).toBe('targetExtracted')
  })
})
