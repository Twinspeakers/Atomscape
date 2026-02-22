import { buildSimulationSummary } from '@features/simulation/engine'
import type { SimulationLogEntry } from '@state/types'
import { describe, expect, it, vi } from 'vitest'
import {
  buildStationControlActionBindings,
  type StationControlActionState,
} from './stationControlActionBindings'

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

function createState(overrides: Partial<StationControlActionState> = {}): StationControlActionState {
  return {
    stationDistance: 50,
    stationDistanceScene: 50,
    stationDistanceManual: 50,
    useSceneDistance: true,
    docked: false,
    charging: false,
    containmentOn: false,
    containmentPower: 60,
    simulationSummary: buildSimulationSummary({
      stationDistance: 50,
      charging: false,
      containmentOn: false,
      containmentPower: 60,
    }),
    simulationLog: [],
    ...overrides,
  }
}

describe('stationControlActionBindings', () => {
  it('runs dock toggles and updates tutorial progress', () => {
    let state = createState()
    const updateTutorialProgress = vi.fn()

    const bindings = buildStationControlActionBindings({
      setState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      appendLog,
      updateTutorialProgress,
    })

    bindings.toggleDocked()

    expect(state.docked).toBe(true)
    expect(state.stationDistance).toBe(0)
    expect(state.simulationLog[0]?.message).toContain('Docking clamps engaged')
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })

  it('applies containment power updates and tutorial progression updates', () => {
    let state = createState({
      containmentPower: 60,
    })
    const updateTutorialProgress = vi.fn()

    const bindings = buildStationControlActionBindings({
      setState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      appendLog,
      updateTutorialProgress,
    })

    bindings.setContainmentPower(120)

    expect(state.containmentPower).toBe(100)
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })

  it('logs charging refusal when out of range and still updates tutorial progress', () => {
    let state = createState({
      stationDistance: 400,
      charging: false,
    })
    const updateTutorialProgress = vi.fn()

    const bindings = buildStationControlActionBindings({
      setState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      appendLog,
      updateTutorialProgress,
    })

    bindings.startCharging()

    expect(state.charging).toBe(false)
    expect(state.simulationLog[0]?.message).toContain('Charging refused')
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })
})
