import { describe, expect, it } from 'vitest'
import { PROCESS_CATALOG } from '@domain/spec/processCatalog'
import type { SimulationLogEntry } from '@state/types'
import { applyProcessRunTransition } from './processTransitions'

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

describe('processTransitions', () => {
  it('applies successful process transitions with inventory and energy changes', () => {
    const result = applyProcessRunTransition(
      {
        inventory: {
          waterIce: 1,
          water: 0,
        },
        energy: 10,
        maxEnergy: 200,
        stationDistance: 0,
        charging: false,
        containmentOn: false,
        containmentPower: 60,
        simulationLog: [],
      },
      PROCESS_CATALOG.iceMelter,
      appendLog,
    )

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      return
    }

    expect(result.inventory.waterIce).toBe(0)
    expect(result.inventory.water).toBe(1)
    expect(result.energy).toBe(9)
    expect(result.persistInventory).toBe(true)
    expect(result.simulationLog[0]?.message).toContain('Ice melter converted')
  })

  it('returns log-only transitions when process requirements fail', () => {
    const result = applyProcessRunTransition(
      {
        inventory: {
          waterIce: 0,
        },
        energy: 100,
        maxEnergy: 200,
        stationDistance: 0,
        charging: false,
        containmentOn: false,
        containmentPower: 60,
        simulationLog: [],
      },
      PROCESS_CATALOG.iceMelter,
      appendLog,
    )

    expect(result.kind).toBe('log-only')
    if (result.kind !== 'log-only') {
      return
    }

    expect(result.persistInventory).toBe(false)
    expect(result.simulationLog[0]?.message).toContain('failed')
  })
})
