import {
  CHARGING_RANGE_METERS,
  STATION_DOCKING_RANGE_METERS,
} from '@domain/spec/gameSpec'
import { describe, expect, it } from 'vitest'
import type { SimulationLogEntry } from '@state/types'
import {
  applySetContainmentPowerTransition,
  applySetStationDistanceFromSceneTransition,
  applyStartChargingTransition,
  applyToggleDockedTransition,
  type StationControlTransitionState,
} from './stationControlTransitions'

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

function createState(overrides?: Partial<StationControlTransitionState>): StationControlTransitionState {
  return {
    stationDistance: 120,
    stationDistanceScene: 120,
    stationDistanceManual: 120,
    useSceneDistance: true,
    docked: false,
    charging: false,
    containmentOn: false,
    containmentPower: 60,
    simulationLog: [],
    ...overrides,
  }
}

describe('stationControlTransitions', () => {
  it('auto-undocks and clears charging when scene distance exits docking corridor', () => {
    const transition = applySetStationDistanceFromSceneTransition(
      createState({
        stationDistance: 0,
        stationDistanceScene: 0,
        stationDistanceManual: 0,
        useSceneDistance: true,
        docked: true,
        charging: true,
      }),
      STATION_DOCKING_RANGE_METERS + 5,
      appendLog,
    )

    expect(transition.docked).toBe(false)
    expect(transition.charging).toBe(false)
    expect(transition.stationDistance).toBe(STATION_DOCKING_RANGE_METERS + 5)
    expect(transition.simulationLog?.[0]?.message).toContain('Auto-undocked')
  })

  it('refuses charging when station is out of range', () => {
    const transition = applyStartChargingTransition(
      createState({
        docked: true,
        stationDistance: CHARGING_RANGE_METERS + 10,
      }),
      appendLog,
    )

    expect(transition.charging).toBeUndefined()
    expect(transition.simulationLog?.[0]?.message).toContain('Charging refused')
  })

  it('refuses charging when undocked even if station is in range', () => {
    const transition = applyStartChargingTransition(
      createState({
        docked: false,
        stationDistance: 0,
      }),
      appendLog,
    )

    expect(transition.charging).toBeUndefined()
    expect(transition.simulationLog?.[0]?.message).toContain('dock to station')
  })

  it('clamps containment power and recomputes simulation summary', () => {
    const transition = applySetContainmentPowerTransition(
      createState({
        containmentOn: true,
      }),
      140,
    )

    expect(transition.containmentPower).toBe(100)
    expect(transition.simulationSummary?.containmentDrain ?? 0).toBeGreaterThan(0)
  })

  it('toggles docking and logs the transition', () => {
    const transition = applyToggleDockedTransition(
      createState({
        docked: false,
        stationDistance: 80,
        stationDistanceScene: 80,
        stationDistanceManual: 65,
      }),
      appendLog,
    )

    expect(transition.docked).toBe(true)
    expect(transition.stationDistance).toBe(0)
    expect(transition.simulationLog?.[0]?.message).toContain('Docking clamps engaged')
  })

  it('stops charging immediately when undocking', () => {
    const transition = applyToggleDockedTransition(
      createState({
        docked: true,
        charging: true,
        stationDistance: 0,
        stationDistanceScene: 0,
        stationDistanceManual: 0,
      }),
      appendLog,
    )

    expect(transition.docked).toBe(false)
    expect(transition.charging).toBe(false)
    expect(transition.simulationLog?.[0]?.message).toContain('charging sequence stopped')
  })
})
