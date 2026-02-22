import { resolveOfflineCatchupHydration } from '@state/runtime/offlineCatchupHydration'
import { applyTutorialProgressTransition } from '@state/quests/tutorialStateTransitions'
import {
  persistUiPreferences,
  type UiPreferencesSnapshot,
} from '@state/ui/workspacePreferences'
import type {
  FailureReason,
  PanelId,
  ResourceInventory,
  SimulationLogEntry,
  TutorialChecklistItem,
  UiDensity,
} from '@state/types'
import type { OfflineCatchupHydrationState } from '@state/runtime/offlineCatchupHydration'
import type { TutorialProgressTransitionState } from '@state/quests/tutorialStateTransitions'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface RuntimeStoreOrchestrationState
  extends TutorialProgressTransitionState,
    OfflineCatchupHydrationState {
  leftPanels: PanelId[]
  rightPanels: PanelId[]
  hiddenPanels: PanelId[]
  panelSlotHints: Partial<Record<PanelId, number>>
  uiDensity: UiDensity
  panelOpacity: number
  tutorialChecklist: TutorialChecklistItem[]
}

export interface RuntimeStoreOrchestration {
  persistUiPreferencesFromState: () => void
  applyOfflineCatchupFromHydratedState: () => void
  updateTutorialProgress: () => void
}

export interface BuildRuntimeStoreOrchestrationOptions {
  setState: (
    updater: (
      state: RuntimeStoreOrchestrationState,
    ) => Partial<RuntimeStoreOrchestrationState>,
  ) => void
  setPatch: (patch: Partial<RuntimeStoreOrchestrationState>) => void
  getState: () => RuntimeStoreOrchestrationState
  appendLog: AppendLog
  persistInventorySnapshotSafely: (inventory: ResourceInventory) => void
  handleFailure: (reason: FailureReason) => void
  shouldSkipPersistence: () => boolean
  questRewardHistoryLimit: number
}

export interface RuntimeStoreOrchestrationDependencies {
  resolveOfflineCatchupHydration: typeof resolveOfflineCatchupHydration
  applyTutorialProgressTransition: typeof applyTutorialProgressTransition
  persistUiPreferences: typeof persistUiPreferences
}

const defaultRuntimeStoreOrchestrationDependencies: RuntimeStoreOrchestrationDependencies = {
  resolveOfflineCatchupHydration,
  applyTutorialProgressTransition,
  persistUiPreferences,
}

function buildUiPreferencesSnapshot(
  state: RuntimeStoreOrchestrationState,
): UiPreferencesSnapshot {
  return {
    leftPanels: state.leftPanels,
    rightPanels: state.rightPanels,
    hiddenPanels: state.hiddenPanels,
    panelSlotHints: state.panelSlotHints,
    pinnedQuestIds: state.pinnedQuestIds,
    activeMainQuestId: state.activeMainQuestId,
    uiDensity: state.uiDensity,
    panelOpacity: state.panelOpacity,
  }
}

export function buildRuntimeStoreOrchestration(
  options: BuildRuntimeStoreOrchestrationOptions,
  dependencies: Partial<RuntimeStoreOrchestrationDependencies> = {},
): RuntimeStoreOrchestration {
  const runtimeDependencies: RuntimeStoreOrchestrationDependencies = {
    ...defaultRuntimeStoreOrchestrationDependencies,
    ...dependencies,
  }
  let offlineCatchupApplied = false

  const persistUiPreferencesFromState = () => {
    if (options.shouldSkipPersistence()) {
      return
    }

    runtimeDependencies.persistUiPreferences(
      buildUiPreferencesSnapshot(options.getState()),
    )
  }

  const applyOfflineCatchupFromHydratedState = () => {
    const transition = runtimeDependencies.resolveOfflineCatchupHydration({
      alreadyApplied: offlineCatchupApplied,
      state: options.getState(),
    })
    offlineCatchupApplied = transition.nextApplied

    if (transition.kind !== 'applied' || !transition.patch) {
      return
    }

    options.setPatch(transition.patch)

    if (transition.persistInventory && transition.inventoryToPersist) {
      options.persistInventorySnapshotSafely(transition.inventoryToPersist)
    }

    if (transition.triggerFailureReason) {
      options.handleFailure(transition.triggerFailureReason)
    }
  }

  const updateTutorialProgress = () => {
    let persistInventory = false
    let persistUiPreferences = false

    options.setState((state) => {
      const transition = runtimeDependencies.applyTutorialProgressTransition(
        state,
        {
          questRewardHistoryLimit: options.questRewardHistoryLimit,
        },
        options.appendLog,
      )

      if (transition.kind === 'noop') {
        return {}
      }

      persistInventory = transition.persistInventory
      persistUiPreferences = transition.persistUiPreferences

      return transition.patch
    })

    if (persistInventory) {
      options.persistInventorySnapshotSafely(options.getState().inventory)
    }

    if (persistUiPreferences) {
      persistUiPreferencesFromState()
    }
  }

  return {
    persistUiPreferencesFromState,
    applyOfflineCatchupFromHydratedState,
    updateTutorialProgress,
  }
}
