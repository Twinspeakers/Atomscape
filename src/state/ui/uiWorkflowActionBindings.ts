import type { CleanupZoneId } from '@domain/spec/worldSpec'
import type { TutorialCompletion } from '@state/quests/tutorialProgression'
import {
  applyDismissQuestRewardNotificationTransition,
  applyDismissTutorialTransition,
  applyMovePanelTransition,
  applyResetTutorialTransition,
  applyResetWorkspaceUiTransition,
  applySetActiveCleanupZoneTransition,
  applySetWorkspacePresetTransition,
  applyTogglePanelVisibilityTransition,
  applyToggleQuestPinTransition,
  applyToggleTutorialCollapsedTransition,
  applyToggleWorkspaceCustomizerTransition,
} from '@state/ui/uiActionTransitions'
import {
  normalizePanelOpacity,
  normalizeUiDensity,
  sanitizeMainQuestId,
} from '@state/ui/workspacePreferences'
import type {
  DockSide,
  LabTab,
  PanelId,
  QuestRewardNotification,
  SimulationLogEntry,
  TutorialChecklistItem,
  UiDensity,
  WorkspacePreset,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface UiWorkflowActionState {
  activeCleanupZoneId: CleanupZoneId | null
  visitedCleanupZones: CleanupZoneId[]
  worldVisitedZoneIds: CleanupZoneId[]
  tutorialEnabled: boolean
  tutorialCollapsed: boolean
  tutorialComplete: boolean
  tutorialCurrentStepIndex: number
  tutorialChecklist: TutorialChecklistItem[]
  tutorialCompletion: TutorialCompletion
  labActiveTab: LabTab
  pinnedQuestIds: string[]
  activeMainQuestId: string | null
  questRewardNotifications: QuestRewardNotification[]
  uiDensity: UiDensity
  panelOpacity: number
  workspaceCustomizerOpen: boolean
  leftPanels: PanelId[]
  rightPanels: PanelId[]
  hiddenPanels: PanelId[]
  panelSlotHints: Partial<Record<PanelId, number>>
  simulationLog: SimulationLogEntry[]
}

export interface UiWorkflowActionBindings {
  setActiveCleanupZone: (zoneId: CleanupZoneId | null) => void
  toggleTutorialCollapsed: () => void
  dismissTutorial: () => void
  resetTutorial: () => void
  toggleQuestPin: (questId: string) => void
  setActiveMainQuest: (questId: string | null) => void
  dismissQuestRewardNotification: () => void
  setUiDensity: (density: UiDensity) => void
  setPanelOpacity: (opacity: number) => void
  toggleWorkspaceCustomizer: () => void
  setWorkspacePreset: (preset: WorkspacePreset) => void
  resetWorkspaceUi: () => void
  movePanel: (
    panelId: PanelId,
    side: DockSide,
    beforePanelId?: PanelId | null,
    targetSlot?: number | null,
  ) => void
  togglePanelVisibility: (panelId: PanelId) => void
}

export interface BuildUiWorkflowActionBindingsOptions {
  setState: (
    updater: (state: UiWorkflowActionState) => Partial<UiWorkflowActionState>,
  ) => void
  appendLog: AppendLog
  updateTutorialProgress: () => void
  persistUiPreferencesFromState: () => void
}

export interface UiWorkflowActionBindingDependencies {
  applySetActiveCleanupZoneTransition: typeof applySetActiveCleanupZoneTransition
  applyToggleTutorialCollapsedTransition: typeof applyToggleTutorialCollapsedTransition
  applyDismissTutorialTransition: typeof applyDismissTutorialTransition
  applyResetTutorialTransition: typeof applyResetTutorialTransition
  applyToggleQuestPinTransition: typeof applyToggleQuestPinTransition
  applyDismissQuestRewardNotificationTransition: typeof applyDismissQuestRewardNotificationTransition
  applyToggleWorkspaceCustomizerTransition: typeof applyToggleWorkspaceCustomizerTransition
  applySetWorkspacePresetTransition: typeof applySetWorkspacePresetTransition
  applyResetWorkspaceUiTransition: typeof applyResetWorkspaceUiTransition
  applyMovePanelTransition: typeof applyMovePanelTransition
  applyTogglePanelVisibilityTransition: typeof applyTogglePanelVisibilityTransition
  sanitizeMainQuestId: typeof sanitizeMainQuestId
  normalizeUiDensity: typeof normalizeUiDensity
  normalizePanelOpacity: typeof normalizePanelOpacity
}

const defaultUiWorkflowActionBindingDependencies: UiWorkflowActionBindingDependencies = {
  applySetActiveCleanupZoneTransition,
  applyToggleTutorialCollapsedTransition,
  applyDismissTutorialTransition,
  applyResetTutorialTransition,
  applyToggleQuestPinTransition,
  applyDismissQuestRewardNotificationTransition,
  applyToggleWorkspaceCustomizerTransition,
  applySetWorkspacePresetTransition,
  applyResetWorkspaceUiTransition,
  applyMovePanelTransition,
  applyTogglePanelVisibilityTransition,
  sanitizeMainQuestId,
  normalizeUiDensity,
  normalizePanelOpacity,
}

export function buildUiWorkflowActionBindings(
  options: BuildUiWorkflowActionBindingsOptions,
  dependencies: Partial<UiWorkflowActionBindingDependencies> = {},
): UiWorkflowActionBindings {
  const runtimeDependencies: UiWorkflowActionBindingDependencies = {
    ...defaultUiWorkflowActionBindingDependencies,
    ...dependencies,
  }

  return {
    setActiveCleanupZone: (zoneId) => {
      options.setState((state) =>
        runtimeDependencies.applySetActiveCleanupZoneTransition(state, zoneId) ?? {})

      options.updateTutorialProgress()
    },
    toggleTutorialCollapsed: () => {
      options.setState((state) =>
        runtimeDependencies.applyToggleTutorialCollapsedTransition(state) ?? {})
    },
    dismissTutorial: () => {
      options.setState((state) =>
        runtimeDependencies.applyDismissTutorialTransition(
          state,
          options.appendLog,
        ))
    },
    resetTutorial: () => {
      options.setState((state) =>
        runtimeDependencies.applyResetTutorialTransition(
          state,
          options.appendLog,
        ))
      options.updateTutorialProgress()
    },
    toggleQuestPin: (questId) => {
      options.setState((state) =>
        runtimeDependencies.applyToggleQuestPinTransition(state, questId))

      options.persistUiPreferencesFromState()
    },
    setActiveMainQuest: (questId) => {
      options.setState(() => ({
        activeMainQuestId: runtimeDependencies.sanitizeMainQuestId(questId),
      }))

      options.persistUiPreferencesFromState()
    },
    dismissQuestRewardNotification: () => {
      options.setState((state) =>
        runtimeDependencies.applyDismissQuestRewardNotificationTransition(state) ?? {})
    },
    setUiDensity: (density) => {
      options.setState(() => ({
        uiDensity: runtimeDependencies.normalizeUiDensity(density),
      }))

      options.persistUiPreferencesFromState()
    },
    setPanelOpacity: (opacity) => {
      options.setState(() => ({
        panelOpacity: runtimeDependencies.normalizePanelOpacity(opacity),
      }))

      options.persistUiPreferencesFromState()
    },
    toggleWorkspaceCustomizer: () => {
      options.setState((state) =>
        runtimeDependencies.applyToggleWorkspaceCustomizerTransition(state))
    },
    setWorkspacePreset: (preset) => {
      options.setState(() =>
        runtimeDependencies.applySetWorkspacePresetTransition(preset))

      options.persistUiPreferencesFromState()
    },
    resetWorkspaceUi: () => {
      options.setState(() =>
        runtimeDependencies.applyResetWorkspaceUiTransition())

      options.persistUiPreferencesFromState()
    },
    movePanel: (panelId, side, beforePanelId, targetSlot) => {
      options.setState((state) =>
        runtimeDependencies.applyMovePanelTransition(
          state,
          panelId,
          side,
          beforePanelId,
          targetSlot,
        ))

      options.persistUiPreferencesFromState()
    },
    togglePanelVisibility: (panelId) => {
      options.setState((state) =>
        runtimeDependencies.applyTogglePanelVisibilityTransition(
          state,
          panelId,
        ))

      options.persistUiPreferencesFromState()
    },
  }
}
