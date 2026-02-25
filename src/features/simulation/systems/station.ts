import { CHARGING_RANGE_METERS } from '@domain/spec/gameSpec'
import { clamp } from '../math'
import type { SimulationTickMutableState, StationDistanceState } from '../types'

export function resolveStationDistance(state: StationDistanceState): number {
  if (state.docked) {
    return 0
  }

  return state.useSceneDistance ? state.stationDistanceScene : state.stationDistanceManual
}

export function stationChargeRate(distance: number): number {
  if (distance > CHARGING_RANGE_METERS) {
    return 0
  }

  const closeness = 1 - distance / CHARGING_RANGE_METERS
  return 2 + closeness * 10
}

export function applyStationCharging(
  state: SimulationTickMutableState,
  pushLog: (message: string) => void,
): void {
  if (!state.charging) {
    return
  }

  if (!state.docked) {
    state.charging = false
    pushLog('Charging stopped: docking clamps disengaged.')
    return
  }

  if (state.stationDistance > CHARGING_RANGE_METERS) {
    state.charging = false
    pushLog(`Charging stopped: you drifted outside station range (${CHARGING_RANGE_METERS} m).`)
    return
  }

  state.energy = clamp(state.energy + stationChargeRate(state.stationDistance), 0, state.maxEnergy)
}

export function applyDockingOverride(state: SimulationTickMutableState): void {
  if (state.docked) {
    state.stationDistance = 0
  }
}
