import { describe, expect, it } from 'vitest'
import { createMarketState } from '@features/simulation/engine'
import type { SimulationLogEntry } from '@state/types'
import { applyMarketSaleTransition } from './marketTransitions'

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

describe('marketTransitions', () => {
  it('applies successful market sale transitions', () => {
    const market = createMarketState()
    const result = applyMarketSaleTransition(
      {
        inventory: {
          boxOfSand: 3,
        },
        market,
        credits: 0,
        simulationLog: [],
      },
      'boxOfSand',
      2,
      appendLog,
    )

    expect(result.inventory.boxOfSand).toBe(1)
    expect(result.credits).toBeGreaterThan(0)
    expect(result.persistInventory).toBe(true)
    expect(result.simulationLog[0]?.message).toContain('Sold')
  })

  it('keeps state and emits blocked log when stock is missing', () => {
    const market = createMarketState()
    const result = applyMarketSaleTransition(
      {
        inventory: {
          boxOfSand: 0,
        },
        market,
        credits: 10,
        simulationLog: [],
      },
      'boxOfSand',
      1,
      appendLog,
    )

    expect(result.inventory.boxOfSand).toBe(0)
    expect(result.credits).toBe(10)
    expect(result.persistInventory).toBe(false)
    expect(result.simulationLog[0]?.message).toContain('Sale blocked')
  })
})
