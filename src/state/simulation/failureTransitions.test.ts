import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CREW_STATUS,
  sanitizeCrewMembers,
} from '@state/runtime/snapshotSanitizers'
import type { SimulationLogEntry } from '@state/types'
import { applyFailureTransition } from './failureTransitions'

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

describe('failureTransitions', () => {
  it('applies combat failure penalties and repair report', () => {
    const crewMembers = sanitizeCrewMembers([], DEFAULT_CREW_STATUS, 0)
    const result = applyFailureTransition(
      {
        inventory: {
          steel: 1,
          silicaSand: 2,
          carbon: 1,
        },
        credits: 100,
        energy: 120,
        maxEnergy: 200,
        crewStatus: { ...DEFAULT_CREW_STATUS },
        crewMembers,
        shipRespawnSignal: 2,
        failureCount: 3,
        starvationFailureLock: false,
        stationDistance: 50,
        containmentPower: 60,
        simulationLog: [],
      },
      'combat',
      appendLog,
      {
        now: 1_000,
        random: () => 0,
      },
    )

    expect(result.inventory.steel).toBeCloseTo(0.6)
    expect(result.inventory.silicaSand).toBeCloseTo(1.2)
    expect(result.inventory.carbon).toBeCloseTo(0.8)
    expect(result.credits).toBe(82)
    expect(result.energy).toBe(85)
    expect(result.failureCount).toBe(4)
    expect(result.shipRespawnSignal).toBe(3)
    expect(result.failureReport.id).toBe(1000)
    expect(result.failureReport.reason).toBe('combat')
    expect(result.persistInventory).toBe(true)
    expect(result.simulationLog[0]?.message).toContain('Emergency reset')
  })

  it('applies starvation recovery and locks starvation failure', () => {
    const crewMembers = sanitizeCrewMembers([], DEFAULT_CREW_STATUS, 0).map((member) => ({
      ...member,
      hunger: 10,
      starving: true,
      dehydrated: true,
      debuff: 40,
    }))
    const result = applyFailureTransition(
      {
        inventory: {},
        credits: 10,
        energy: 20,
        maxEnergy: 200,
        crewStatus: {
          hunger: 10,
          debuff: 40,
          starving: true,
          foodAutomationEnabled: true,
        },
        crewMembers,
        shipRespawnSignal: 0,
        failureCount: 0,
        starvationFailureLock: false,
        stationDistance: 0,
        containmentPower: 60,
        simulationLog: [],
      },
      'starvation',
      appendLog,
      {
        now: 2_000,
        random: () => 0,
      },
    )

    expect(result.crewStatus.starving).toBe(false)
    expect(result.crewMembers.every((member) => member.hunger >= 42)).toBe(true)
    expect(result.crewMembers.every((member) => member.dehydrated === false)).toBe(true)
    expect(result.starvationFailureLock).toBe(true)
    expect(result.failureReport.reason).toBe('starvation')
    expect(result.simulationLog[0]?.message).toContain('crew critical condition')
  })
})
