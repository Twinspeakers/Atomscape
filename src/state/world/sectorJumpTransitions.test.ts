import { describe, expect, it } from 'vitest'
import type { SimulationLogEntry } from '@state/types'
import {
  applySectorJumpArrivalTransition,
  applySectorJumpDepartureTransition,
} from './sectorJumpTransitions'

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

describe('sectorJumpTransitions', () => {
  it('builds departure transition with transit log and reset fields', () => {
    const transition = applySectorJumpDepartureTransition(
      {
        activeSectorId: 'earthCorridor',
        simulationLog: [],
      },
      'marsCorridor',
      appendLog,
    )

    expect(transition.activeSectorId).toBe('marsCorridor')
    expect(transition.worldStateLoaded).toBe(false)
    expect(transition.activeCleanupZoneId).toBeNull()
    expect(transition.selectedObject).toBeNull()
    expect(transition.radarContacts).toEqual([])
    expect(transition.simulationLog[0]?.message).toContain('Sector transit')
    expect(transition.simulationLog[0]?.message).toContain('Earth Corridor')
    expect(transition.simulationLog[0]?.message).toContain('Mars Corridor')
  })

  it('builds arrival transition log for destination sector', () => {
    const transition = applySectorJumpArrivalTransition(
      {
        activeSectorId: 'marsCorridor',
        simulationLog: [],
      },
      'marsCorridor',
      appendLog,
    )

    expect(transition.simulationLog[0]?.message).toContain('Arrived in Mars Corridor')
  })
})
