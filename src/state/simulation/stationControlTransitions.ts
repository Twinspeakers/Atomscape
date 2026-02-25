import {
  CHARGING_RANGE_METERS,
  STATION_DOCKING_RANGE_METERS,
} from '@domain/spec/gameSpec'
import { buildSimulationSummary, resolveStationDistance } from '@features/simulation/engine'
import { clamp, roundQty } from '@state/utils/numberUtils'
import type {
  SimulationLogEntry,
  SimulationSummary,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface StationControlTransitionState {
  stationDistance: number
  stationDistanceScene: number
  stationDistanceManual: number
  useSceneDistance: boolean
  docked: boolean
  charging: boolean
  containmentOn: boolean
  containmentPower: number
  simulationLog: SimulationLogEntry[]
}

export interface StationControlTransitionPatch {
  stationDistance?: number
  stationDistanceScene?: number
  stationDistanceManual?: number
  useSceneDistance?: boolean
  docked?: boolean
  charging?: boolean
  containmentOn?: boolean
  containmentPower?: number
  simulationSummary?: SimulationSummary
  simulationLog?: SimulationLogEntry[]
}

function buildSummary(
  state: StationControlTransitionState,
  overrides?: Partial<{
    stationDistance: number
    charging: boolean
    containmentOn: boolean
    containmentPower: number
  }>,
): SimulationSummary {
  return buildSimulationSummary({
    stationDistance: overrides?.stationDistance ?? state.stationDistance,
    charging: overrides?.charging ?? state.charging,
    containmentOn: overrides?.containmentOn ?? state.containmentOn,
    containmentPower: overrides?.containmentPower ?? state.containmentPower,
  })
}

export function applySetStationDistanceFromSceneTransition(
  state: StationControlTransitionState,
  distance: number,
  appendLog: AppendLog,
): StationControlTransitionPatch {
  const stationDistanceScene = roundQty(Math.max(distance, 0))
  const forcedUndock =
    state.useSceneDistance
    && state.docked
    && stationDistanceScene > STATION_DOCKING_RANGE_METERS
  const docked = forcedUndock ? false : state.docked
  const charging = forcedUndock ? false : state.charging
  const stationDistance = docked
    ? 0
    : state.useSceneDistance
      ? stationDistanceScene
      : state.stationDistanceManual

  return {
    stationDistanceScene,
    docked,
    charging,
    stationDistance,
    simulationSummary: buildSummary(state, {
      stationDistance,
      charging,
    }),
    simulationLog: forcedUndock
      ? appendLog({
          logs: state.simulationLog,
          message: `Auto-undocked: outside docking corridor (${STATION_DOCKING_RANGE_METERS} m).`,
        })
      : state.simulationLog,
  }
}

export function applySetStationDistanceManualTransition(
  state: StationControlTransitionState,
  distance: number,
): StationControlTransitionPatch {
  const stationDistanceManual = roundQty(clamp(distance, 0, 1200))
  const stationDistance = state.docked
    ? 0
    : state.useSceneDistance
      ? state.stationDistanceScene
      : stationDistanceManual

  return {
    stationDistanceManual,
    stationDistance,
    simulationSummary: buildSummary(state, { stationDistance }),
  }
}

export function applySetUseSceneDistanceTransition(
  state: StationControlTransitionState,
  enabled: boolean,
): StationControlTransitionPatch {
  const useSceneDistance = enabled
  const stationDistance = state.docked
    ? 0
    : useSceneDistance
      ? state.stationDistanceScene
      : state.stationDistanceManual

  return {
    useSceneDistance,
    stationDistance,
    simulationSummary: buildSummary(state, { stationDistance }),
  }
}

export function applyToggleDockedTransition(
  state: StationControlTransitionState,
  appendLog: AppendLog,
): StationControlTransitionPatch {
  const docked = !state.docked
  const stationDistance = docked ? 0 : resolveStationDistance({ ...state, docked: false })
  const charging = docked ? state.charging : false

  return {
    docked,
    charging,
    stationDistance,
    simulationSummary: buildSummary(state, { stationDistance, charging }),
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: docked
        ? 'Docking clamps engaged: station distance pinned to 0 m.'
        : state.charging
          ? 'Undocked: charging sequence stopped; distance now follows live telemetry.'
          : 'Undocked: distance now follows live telemetry.',
    }),
  }
}

export function applyStartChargingTransition(
  state: StationControlTransitionState,
  appendLog: AppendLog,
): StationControlTransitionPatch {
  if (!state.docked) {
    return {
      simulationLog: appendLog({
        logs: state.simulationLog,
        message: 'Charging refused: dock to station before starting charge.',
      }),
    }
  }

  if (state.stationDistance > CHARGING_RANGE_METERS) {
    return {
      simulationLog: appendLog({
        logs: state.simulationLog,
        message: `Charging refused: station is ${state.stationDistance.toFixed(1)} m away (max ${CHARGING_RANGE_METERS} m).`,
      }),
    }
  }

  return {
    charging: true,
    simulationSummary: buildSummary(state, { charging: true }),
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: 'Charging sequence started.',
    }),
  }
}

export function applyStopChargingTransition(
  state: StationControlTransitionState,
  appendLog: AppendLog,
): StationControlTransitionPatch {
  return {
    charging: false,
    simulationSummary: buildSummary(state, { charging: false }),
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: 'Charging sequence stopped.',
    }),
  }
}

export function applySetContainmentOnTransition(
  state: StationControlTransitionState,
  enabled: boolean,
  appendLog: AppendLog,
): StationControlTransitionPatch {
  return {
    containmentOn: enabled,
    simulationSummary: buildSummary(state, { containmentOn: enabled }),
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: enabled
        ? 'Magnetic containment enabled.'
        : 'Magnetic containment disabled.',
    }),
  }
}

export function applySetContainmentPowerTransition(
  state: StationControlTransitionState,
  power: number,
): StationControlTransitionPatch {
  const containmentPower = clamp(power, 0, 100)

  return {
    containmentPower,
    simulationSummary: buildSummary(state, { containmentPower }),
  }
}
