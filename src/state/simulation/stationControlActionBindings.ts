import {
  applySetContainmentOnTransition,
  applySetContainmentPowerTransition,
  applySetStationDistanceFromSceneTransition,
  applySetStationDistanceManualTransition,
  applySetUseSceneDistanceTransition,
  applyStartChargingTransition,
  applyStopChargingTransition,
  applyToggleDockedTransition,
  type StationControlTransitionState,
} from '@state/simulation/stationControlTransitions'
import type {
  SimulationLogEntry,
  SimulationSummary,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface StationControlActionState extends StationControlTransitionState {
  simulationSummary: SimulationSummary
}

export interface StationControlActionBindings {
  setStationDistanceFromScene: (distance: number) => void
  setStationDistanceManual: (distance: number) => void
  setUseSceneDistance: (enabled: boolean) => void
  toggleDocked: () => void
  startCharging: () => void
  stopCharging: () => void
  setContainmentOn: (enabled: boolean) => void
  setContainmentPower: (power: number) => void
}

export interface BuildStationControlActionBindingsOptions {
  setState: (
    updater: (state: StationControlActionState) => Partial<StationControlActionState>,
  ) => void
  appendLog: AppendLog
  updateTutorialProgress: () => void
}

export interface StationControlActionBindingDependencies {
  applySetStationDistanceFromSceneTransition: typeof applySetStationDistanceFromSceneTransition
  applySetStationDistanceManualTransition: typeof applySetStationDistanceManualTransition
  applySetUseSceneDistanceTransition: typeof applySetUseSceneDistanceTransition
  applyToggleDockedTransition: typeof applyToggleDockedTransition
  applyStartChargingTransition: typeof applyStartChargingTransition
  applyStopChargingTransition: typeof applyStopChargingTransition
  applySetContainmentOnTransition: typeof applySetContainmentOnTransition
  applySetContainmentPowerTransition: typeof applySetContainmentPowerTransition
}

const defaultStationControlActionBindingDependencies: StationControlActionBindingDependencies = {
  applySetStationDistanceFromSceneTransition,
  applySetStationDistanceManualTransition,
  applySetUseSceneDistanceTransition,
  applyToggleDockedTransition,
  applyStartChargingTransition,
  applyStopChargingTransition,
  applySetContainmentOnTransition,
  applySetContainmentPowerTransition,
}

export function buildStationControlActionBindings(
  options: BuildStationControlActionBindingsOptions,
  dependencies: Partial<StationControlActionBindingDependencies> = {},
): StationControlActionBindings {
  const runtimeDependencies: StationControlActionBindingDependencies = {
    ...defaultStationControlActionBindingDependencies,
    ...dependencies,
  }

  return {
    setStationDistanceFromScene: (distance) => {
      options.setState((state) =>
        runtimeDependencies.applySetStationDistanceFromSceneTransition(
          state,
          distance,
          options.appendLog,
        ))

      options.updateTutorialProgress()
    },
    setStationDistanceManual: (distance) => {
      options.setState((state) =>
        runtimeDependencies.applySetStationDistanceManualTransition(state, distance))

      options.updateTutorialProgress()
    },
    setUseSceneDistance: (enabled) => {
      options.setState((state) =>
        runtimeDependencies.applySetUseSceneDistanceTransition(state, enabled))

      options.updateTutorialProgress()
    },
    toggleDocked: () => {
      options.setState((state) =>
        runtimeDependencies.applyToggleDockedTransition(
          state,
          options.appendLog,
        ))

      options.updateTutorialProgress()
    },
    startCharging: () => {
      options.setState((state) =>
        runtimeDependencies.applyStartChargingTransition(
          state,
          options.appendLog,
        ))

      options.updateTutorialProgress()
    },
    stopCharging: () => {
      options.setState((state) =>
        runtimeDependencies.applyStopChargingTransition(
          state,
          options.appendLog,
        ))

      options.updateTutorialProgress()
    },
    setContainmentOn: (enabled) => {
      options.setState((state) =>
        runtimeDependencies.applySetContainmentOnTransition(
          state,
          enabled,
          options.appendLog,
        ))

      options.updateTutorialProgress()
    },
    setContainmentPower: (power) => {
      options.setState((state) =>
        runtimeDependencies.applySetContainmentPowerTransition(state, power))

      options.updateTutorialProgress()
    },
  }
}
