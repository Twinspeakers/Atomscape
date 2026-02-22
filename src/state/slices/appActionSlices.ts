import type { InventoryRow, WorldSessionRow } from '@platform/db/gameDb'
import type { ProgressResetStorageKeys } from '@state/runtime/progressReset'
import {
  buildRuntimeActionBindings,
  type RuntimeActionBindings,
  type RuntimeActionState,
} from '@state/runtime/runtimeActionBindings'
import {
  buildRuntimeStoreOrchestration,
  type RuntimeStoreOrchestration,
  type RuntimeStoreOrchestrationState,
} from '@state/runtime/runtimeStoreOrchestration'
import {
  buildBasicStateActionBindings,
  type BasicStateActionBindings,
  type BasicStateActionState,
} from '@state/ui/basicStateActionBindings'
import {
  buildUiWorkflowActionBindings,
  type UiWorkflowActionBindings,
  type UiWorkflowActionState,
} from '@state/ui/uiWorkflowActionBindings'
import {
  buildExtractionActionBindings,
  type ExtractionActionBindings,
  type ExtractionActionState,
} from '@state/simulation/extractionActionBindings'
import {
  buildProcessActionBindings,
  type ProcessActionBindings,
} from '@state/simulation/processActionBindings'
import {
  buildResourceActionBindings,
  type ResourceActionBindings,
  type ResourceActionState,
} from '@state/simulation/resourceActionBindings'
import {
  buildSimulationActionBindings,
  type SimulationActionBindings,
  type SimulationActionState,
} from '@state/simulation/simulationActionBindings'
import {
  buildStationControlActionBindings,
  type StationControlActionBindings,
  type StationControlActionState,
} from '@state/simulation/stationControlActionBindings'
import {
  buildWorldTargetActionBindings,
  type WorldTargetActionBindings,
  type WorldTargetActionState,
} from '@state/world/worldTargetActionBindings'
import {
  buildWorldSessionActionBindings,
  type WorldSessionActionBindings,
  type WorldSessionActionState,
} from '@state/world/worldSessionActionBindings'
import type {
  FailureReason,
  ResourceInventory,
  SimulationLogEntry,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export type AppActionSliceState =
  & RuntimeStoreOrchestrationState
  & WorldSessionActionState
  & WorldTargetActionState
  & ExtractionActionState
  & RuntimeActionState
  & SimulationActionState
  & ResourceActionState
  & StationControlActionState
  & BasicStateActionState
  & UiWorkflowActionState
  & {
    handleFailure: (reason: FailureReason) => void
  }

export interface AppActionSlices {
  runtimeStoreOrchestration: RuntimeStoreOrchestration
  worldSessionActionBindings: WorldSessionActionBindings
  worldTargetActionBindings: WorldTargetActionBindings
  extractionActionBindings: ExtractionActionBindings
  runtimeActionBindings: RuntimeActionBindings
  simulationActionBindings: SimulationActionBindings
  resourceActionBindings: ResourceActionBindings
  stationControlActionBindings: StationControlActionBindings
  basicStateActionBindings: BasicStateActionBindings
  uiWorkflowActionBindings: UiWorkflowActionBindings
  processActionBindings: ProcessActionBindings
}

export interface BuildAppActionSlicesOptions {
  setState: (
    updater: (state: AppActionSliceState) => Partial<AppActionSliceState>,
  ) => void
  setPatch: (patch: Partial<AppActionSliceState>) => void
  getState: () => AppActionSliceState
  appendLog: AppendLog
  persistInventorySnapshotSafely: (inventory: ResourceInventory) => void
  sanitizePlayerUsername: (value: unknown) => string
  shouldSkipPersistence: () => boolean
  questRewardHistoryLimit: number
  worldSessionVersion: number
  legacyWorldSessionRowId: string
  readWorldSessionById: (rowId: string) => Promise<WorldSessionRow | undefined>
  readInventoryRows: () => Promise<ReadonlyArray<InventoryRow>>
  markProgressResetInFlight: (inFlight: boolean) => void
  progressResetStorageKeys: ProgressResetStorageKeys
  failureReportLimit: number
}

export interface AppActionSliceDependencies {
  buildRuntimeStoreOrchestration: typeof buildRuntimeStoreOrchestration
  buildWorldSessionActionBindings: typeof buildWorldSessionActionBindings
  buildWorldTargetActionBindings: typeof buildWorldTargetActionBindings
  buildExtractionActionBindings: typeof buildExtractionActionBindings
  buildRuntimeActionBindings: typeof buildRuntimeActionBindings
  buildSimulationActionBindings: typeof buildSimulationActionBindings
  buildResourceActionBindings: typeof buildResourceActionBindings
  buildStationControlActionBindings: typeof buildStationControlActionBindings
  buildBasicStateActionBindings: typeof buildBasicStateActionBindings
  buildUiWorkflowActionBindings: typeof buildUiWorkflowActionBindings
  buildProcessActionBindings: typeof buildProcessActionBindings
}

const defaultAppActionSliceDependencies: AppActionSliceDependencies = {
  buildRuntimeStoreOrchestration,
  buildWorldSessionActionBindings,
  buildWorldTargetActionBindings,
  buildExtractionActionBindings,
  buildRuntimeActionBindings,
  buildSimulationActionBindings,
  buildResourceActionBindings,
  buildStationControlActionBindings,
  buildBasicStateActionBindings,
  buildUiWorkflowActionBindings,
  buildProcessActionBindings,
}

export function buildAppActionSlices(
  options: BuildAppActionSlicesOptions,
  dependencies: Partial<AppActionSliceDependencies> = {},
): AppActionSlices {
  const runtimeDependencies: AppActionSliceDependencies = {
    ...defaultAppActionSliceDependencies,
    ...dependencies,
  }

  const runtimeStoreOrchestration = runtimeDependencies.buildRuntimeStoreOrchestration({
    setState: (updater) => {
      options.setState((state) => updater(state as unknown as RuntimeStoreOrchestrationState))
    },
    setPatch: (patch) => {
      options.setPatch(patch)
    },
    getState: () => options.getState() as unknown as RuntimeStoreOrchestrationState,
    appendLog: options.appendLog,
    persistInventorySnapshotSafely: options.persistInventorySnapshotSafely,
    handleFailure: (reason) => options.getState().handleFailure(reason),
    shouldSkipPersistence: options.shouldSkipPersistence,
    questRewardHistoryLimit: options.questRewardHistoryLimit,
  })

  const worldSessionActionBindings = runtimeDependencies.buildWorldSessionActionBindings({
    setState: (updater) => {
      options.setState((state) => updater(state as unknown as WorldSessionActionState))
    },
    getState: () => options.getState() as unknown as WorldSessionActionState,
    appendLog: options.appendLog,
    updateTutorialProgress: runtimeStoreOrchestration.updateTutorialProgress,
    worldSessionVersion: options.worldSessionVersion,
    legacyRowId: options.legacyWorldSessionRowId,
    readWorldSessionById: options.readWorldSessionById,
  })

  const worldTargetActionBindings = runtimeDependencies.buildWorldTargetActionBindings({
    setState: (updater) => {
      options.setState((state) => updater(state as unknown as WorldTargetActionState))
    },
    appendLog: options.appendLog,
    updateTutorialProgress: runtimeStoreOrchestration.updateTutorialProgress,
  })

  const extractionActionBindings = runtimeDependencies.buildExtractionActionBindings({
    setState: (updater) => {
      options.setState((state) => updater(state as unknown as ExtractionActionState))
    },
    getState: () => options.getState() as unknown as ExtractionActionState,
    appendLog: options.appendLog,
    persistInventorySnapshotSafely: options.persistInventorySnapshotSafely,
    updateTutorialProgress: runtimeStoreOrchestration.updateTutorialProgress,
  })

  const runtimeActionBindings = runtimeDependencies.buildRuntimeActionBindings({
    setPatch: (patch) => {
      options.setPatch(patch)
    },
    readInventoryRows: options.readInventoryRows,
    applyOfflineCatchupFromHydratedState:
      runtimeStoreOrchestration.applyOfflineCatchupFromHydratedState,
    updateTutorialProgress: runtimeStoreOrchestration.updateTutorialProgress,
    markProgressResetInFlight: options.markProgressResetInFlight,
    progressResetStorageKeys: options.progressResetStorageKeys,
  })

  const simulationActionBindings = runtimeDependencies.buildSimulationActionBindings({
    setState: (updater) => {
      options.setState((state) => updater(state as unknown as SimulationActionState))
    },
    getState: () => options.getState() as unknown as SimulationActionState,
    appendLog: options.appendLog,
    persistInventorySnapshotSafely: options.persistInventorySnapshotSafely,
    updateTutorialProgress: runtimeStoreOrchestration.updateTutorialProgress,
    handleFailure: (reason) => options.getState().handleFailure(reason),
  })

  const resourceActionBindings = runtimeDependencies.buildResourceActionBindings({
    setState: (updater) => {
      options.setState((state) => updater(state as unknown as ResourceActionState))
    },
    getState: () => options.getState() as unknown as ResourceActionState,
    appendLog: options.appendLog,
    persistInventorySnapshotSafely: options.persistInventorySnapshotSafely,
    updateTutorialProgress: runtimeStoreOrchestration.updateTutorialProgress,
    failureReportLimit: options.failureReportLimit,
  })

  const stationControlActionBindings = runtimeDependencies.buildStationControlActionBindings({
    setState: (updater) => {
      options.setState((state) => updater(state as unknown as StationControlActionState))
    },
    appendLog: options.appendLog,
    updateTutorialProgress: runtimeStoreOrchestration.updateTutorialProgress,
  })

  const basicStateActionBindings = runtimeDependencies.buildBasicStateActionBindings({
    setWithState: (updater) => {
      options.setState((state) => updater(state as unknown as BasicStateActionState))
    },
    setPatch: (patch) => {
      options.setPatch(patch)
    },
    appendLog: options.appendLog,
    sanitizePlayerUsername: options.sanitizePlayerUsername,
  })

  const uiWorkflowActionBindings = runtimeDependencies.buildUiWorkflowActionBindings({
    setState: (updater) => {
      options.setState((state) => updater(state as unknown as UiWorkflowActionState))
    },
    appendLog: options.appendLog,
    updateTutorialProgress: runtimeStoreOrchestration.updateTutorialProgress,
    persistUiPreferencesFromState:
      runtimeStoreOrchestration.persistUiPreferencesFromState,
  })

  const processActionBindings = runtimeDependencies.buildProcessActionBindings({
    runProcess: simulationActionBindings.runProcess,
  })

  return {
    runtimeStoreOrchestration,
    worldSessionActionBindings,
    worldTargetActionBindings,
    extractionActionBindings,
    runtimeActionBindings,
    simulationActionBindings,
    resourceActionBindings,
    stationControlActionBindings,
    basicStateActionBindings,
    uiWorkflowActionBindings,
    processActionBindings,
  }
}
