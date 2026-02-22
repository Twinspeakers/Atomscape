import type { CleanupZoneId } from '@domain/spec/worldSpec'
import {
  buildTutorialChecklist,
  createTutorialCompletion,
  type TutorialCompletion,
} from '@state/quests/tutorialProgression'
import {
  DEFAULT_LEFT_PANELS,
  DEFAULT_PANEL_OPACITY,
  DEFAULT_RIGHT_PANELS,
  DEFAULT_UI_DENSITY,
  normalizePanelOpacity,
  sanitizeDockLists,
  sanitizeHiddenPanels,
  workspacePresetLayout,
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

export interface ActiveCleanupZoneTransitionState {
  activeCleanupZoneId: CleanupZoneId | null
  visitedCleanupZones: CleanupZoneId[]
  worldVisitedZoneIds: CleanupZoneId[]
}

export interface ActiveCleanupZoneTransitionPatch {
  activeCleanupZoneId: CleanupZoneId | null
  visitedCleanupZones: CleanupZoneId[]
  worldVisitedZoneIds: CleanupZoneId[]
}

export function applySetActiveCleanupZoneTransition(
  state: ActiveCleanupZoneTransitionState,
  zoneId: CleanupZoneId | null,
): ActiveCleanupZoneTransitionPatch | null {
  const nextVisited = zoneId && !state.visitedCleanupZones.includes(zoneId)
    ? [...state.visitedCleanupZones, zoneId]
    : state.visitedCleanupZones
  const nextWorldVisited = zoneId && !state.worldVisitedZoneIds.includes(zoneId)
    ? [...state.worldVisitedZoneIds, zoneId]
    : state.worldVisitedZoneIds
  const changed = state.activeCleanupZoneId !== zoneId
    || nextVisited !== state.visitedCleanupZones
    || nextWorldVisited !== state.worldVisitedZoneIds

  if (!changed) {
    return null
  }

  return {
    activeCleanupZoneId: zoneId,
    visitedCleanupZones: nextVisited,
    worldVisitedZoneIds: nextWorldVisited,
  }
}

export interface TutorialVisibilityTransitionState {
  tutorialEnabled: boolean
  tutorialCollapsed: boolean
}

export function applyToggleTutorialCollapsedTransition(
  state: TutorialVisibilityTransitionState,
): Pick<TutorialVisibilityTransitionState, 'tutorialCollapsed'> | null {
  if (!state.tutorialEnabled) {
    return null
  }

  return { tutorialCollapsed: !state.tutorialCollapsed }
}

export interface DismissTutorialTransitionState {
  simulationLog: SimulationLogEntry[]
}

export interface DismissTutorialTransitionPatch {
  tutorialEnabled: false
  tutorialCollapsed: false
  simulationLog: SimulationLogEntry[]
}

export function applyDismissTutorialTransition(
  state: DismissTutorialTransitionState,
  appendLog: AppendLog,
): DismissTutorialTransitionPatch {
  return {
    tutorialEnabled: false,
    tutorialCollapsed: false,
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: 'Quests dismissed. You can continue in free-flight mode.',
    }),
  }
}

export interface ResetTutorialTransitionState {
  simulationLog: SimulationLogEntry[]
}

export interface ResetTutorialTransitionPatch {
  tutorialEnabled: true
  tutorialCollapsed: false
  tutorialComplete: false
  tutorialCurrentStepIndex: number
  tutorialChecklist: TutorialChecklistItem[]
  tutorialCompletion: TutorialCompletion
  activeCleanupZoneId: null
  visitedCleanupZones: CleanupZoneId[]
  labActiveTab: LabTab
  simulationLog: SimulationLogEntry[]
}

export function applyResetTutorialTransition(
  state: ResetTutorialTransitionState,
  appendLog: AppendLog,
): ResetTutorialTransitionPatch {
  const completion = createTutorialCompletion()

  return {
    tutorialEnabled: true,
    tutorialCollapsed: false,
    tutorialComplete: false,
    tutorialCurrentStepIndex: 0,
    tutorialChecklist: buildTutorialChecklist(completion),
    tutorialCompletion: completion,
    activeCleanupZoneId: null,
    visitedCleanupZones: [],
    labActiveTab: 'station',
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: 'Questline reset. Guidance objectives restored.',
    }),
  }
}

export interface PinnedQuestTransitionState {
  pinnedQuestIds: string[]
}

export function applyToggleQuestPinTransition(
  state: PinnedQuestTransitionState,
  questId: string,
): Pick<PinnedQuestTransitionState, 'pinnedQuestIds'> {
  const alreadyPinned = state.pinnedQuestIds.includes(questId)
  return {
    pinnedQuestIds: alreadyPinned
      ? state.pinnedQuestIds.filter((id) => id !== questId)
      : [...state.pinnedQuestIds, questId],
  }
}

export interface QuestRewardNotificationTransitionState {
  questRewardNotifications: QuestRewardNotification[]
}

export function applyDismissQuestRewardNotificationTransition(
  state: QuestRewardNotificationTransitionState,
): Pick<QuestRewardNotificationTransitionState, 'questRewardNotifications'> | null {
  if (state.questRewardNotifications.length === 0) {
    return null
  }

  return {
    questRewardNotifications: state.questRewardNotifications.slice(1),
  }
}

export interface WorkspaceCustomizerTransitionState {
  workspaceCustomizerOpen: boolean
}

export function applyToggleWorkspaceCustomizerTransition(
  state: WorkspaceCustomizerTransitionState,
): Pick<WorkspaceCustomizerTransitionState, 'workspaceCustomizerOpen'> {
  return {
    workspaceCustomizerOpen: !state.workspaceCustomizerOpen,
  }
}

export interface WorkspaceLayoutTransitionPatch {
  leftPanels: PanelId[]
  rightPanels: PanelId[]
  hiddenPanels: PanelId[]
  panelSlotHints: Partial<Record<PanelId, number>>
  uiDensity: UiDensity
  panelOpacity: number
  workspaceCustomizerOpen: false
}

export function applySetWorkspacePresetTransition(
  preset: WorkspacePreset,
): WorkspaceLayoutTransitionPatch {
  const presetLayout = workspacePresetLayout(preset)
  const dockState = sanitizeDockLists(presetLayout.leftPanels, presetLayout.rightPanels)

  return {
    leftPanels: dockState.leftPanels,
    rightPanels: dockState.rightPanels,
    hiddenPanels: sanitizeHiddenPanels(presetLayout.hiddenPanels),
    panelSlotHints: {},
    uiDensity: presetLayout.uiDensity,
    panelOpacity: normalizePanelOpacity(presetLayout.panelOpacity),
    workspaceCustomizerOpen: false,
  }
}

export function applyResetWorkspaceUiTransition(): WorkspaceLayoutTransitionPatch {
  const dockState = sanitizeDockLists(DEFAULT_LEFT_PANELS, DEFAULT_RIGHT_PANELS)

  return {
    leftPanels: dockState.leftPanels,
    rightPanels: dockState.rightPanels,
    hiddenPanels: [],
    panelSlotHints: {},
    uiDensity: DEFAULT_UI_DENSITY,
    panelOpacity: DEFAULT_PANEL_OPACITY,
    workspaceCustomizerOpen: false,
  }
}

export interface MovePanelTransitionState {
  leftPanels: PanelId[]
  rightPanels: PanelId[]
  panelSlotHints: Partial<Record<PanelId, number>>
}

export interface MovePanelTransitionPatch {
  leftPanels: PanelId[]
  rightPanels: PanelId[]
  panelSlotHints: Partial<Record<PanelId, number>>
}

export function applyMovePanelTransition(
  state: MovePanelTransitionState,
  panelId: PanelId,
  side: DockSide,
  beforePanelId?: PanelId | null,
  targetSlot?: number | null,
): MovePanelTransitionPatch {
  const leftPanels = state.leftPanels.filter((id) => id !== panelId)
  const rightPanels = state.rightPanels.filter((id) => id !== panelId)
  const targetPanels = side === 'left' ? leftPanels : rightPanels
  const panelSlotHints = { ...state.panelSlotHints }

  if (beforePanelId && targetPanels.includes(beforePanelId)) {
    const insertIndex = targetPanels.indexOf(beforePanelId)
    targetPanels.splice(insertIndex, 0, panelId)
  } else {
    targetPanels.push(panelId)
  }

  if (targetSlot === null || typeof targetSlot === 'undefined') {
    delete panelSlotHints[panelId]
  } else if (Number.isFinite(targetSlot)) {
    panelSlotHints[panelId] = Math.max(0, Math.floor(targetSlot))
  }

  return { leftPanels, rightPanels, panelSlotHints }
}

export interface PanelVisibilityTransitionState {
  hiddenPanels: PanelId[]
}

export function applyTogglePanelVisibilityTransition(
  state: PanelVisibilityTransitionState,
  panelId: PanelId,
): Pick<PanelVisibilityTransitionState, 'hiddenPanels'> {
  if (state.hiddenPanels.includes(panelId)) {
    return {
      hiddenPanels: state.hiddenPanels.filter((id) => id !== panelId),
    }
  }

  return {
    hiddenPanels: [...state.hiddenPanels, panelId],
  }
}
