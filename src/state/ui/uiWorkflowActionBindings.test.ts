import type { CleanupZoneId } from '@domain/spec/worldSpec'
import {
  buildTutorialChecklist,
  createTutorialCompletion,
} from '@state/quests/tutorialProgression'
import type {
  PanelId,
  SimulationLogEntry,
} from '@state/types'
import { describe, expect, it, vi } from 'vitest'
import {
  buildUiWorkflowActionBindings,
  type UiWorkflowActionState,
} from './uiWorkflowActionBindings'

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

function createState(overrides: Partial<UiWorkflowActionState> = {}): UiWorkflowActionState {
  const tutorialCompletion = createTutorialCompletion()

  return {
    activeCleanupZoneId: null,
    visitedCleanupZones: [],
    worldVisitedZoneIds: [],
    tutorialEnabled: true,
    tutorialCollapsed: false,
    tutorialComplete: false,
    tutorialCurrentStepIndex: 0,
    tutorialChecklist: buildTutorialChecklist(tutorialCompletion),
    tutorialCompletion,
    labActiveTab: 'sorting',
    pinnedQuestIds: [],
    activeMainQuestId: null,
    questRewardNotifications: [],
    uiDensity: 'comfortable',
    panelOpacity: 0.88,
    workspaceCustomizerOpen: false,
    leftPanels: ['tutorial', 'inventory'],
    rightPanels: ['object', 'hud', 'actions'],
    hiddenPanels: [],
    panelSlotHints: {},
    simulationLog: [],
    ...overrides,
  }
}

describe('uiWorkflowActionBindings', () => {
  it('updates cleanup zone state and tutorial progress', () => {
    let state = createState()
    const updateTutorialProgress = vi.fn()
    const persistUiPreferencesFromState = vi.fn()

    const bindings = buildUiWorkflowActionBindings({
      setState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      appendLog,
      updateTutorialProgress,
      persistUiPreferencesFromState,
    })

    const zoneId: CleanupZoneId = 'nearStationBelt'
    bindings.setActiveCleanupZone(zoneId)

    expect(state.activeCleanupZoneId).toBe(zoneId)
    expect(state.visitedCleanupZones).toContain(zoneId)
    expect(state.worldVisitedZoneIds).toContain(zoneId)
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
    expect(persistUiPreferencesFromState).not.toHaveBeenCalled()
  })

  it('persists preferences for quest pin and main quest changes', () => {
    let state = createState()
    const updateTutorialProgress = vi.fn()
    const persistUiPreferencesFromState = vi.fn()

    const bindings = buildUiWorkflowActionBindings({
      setState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      appendLog,
      updateTutorialProgress,
      persistUiPreferencesFromState,
    })

    bindings.toggleQuestPin('quest-a')
    bindings.setActiveMainQuest('not-a-real-quest')

    expect(state.pinnedQuestIds).toContain('quest-a')
    expect(state.activeMainQuestId).toBeNull()
    expect(persistUiPreferencesFromState).toHaveBeenCalledTimes(2)
    expect(updateTutorialProgress).not.toHaveBeenCalled()
  })

  it('resets tutorial and persists panel changes where required', () => {
    let state = createState({
      tutorialEnabled: false,
      tutorialCollapsed: true,
      tutorialComplete: true,
      tutorialCurrentStepIndex: 3,
      simulationLog: [{ id: 1, message: 'before', timestamp: 1 }],
      hiddenPanels: ['hud'],
    })
    const updateTutorialProgress = vi.fn()
    const persistUiPreferencesFromState = vi.fn()

    const bindings = buildUiWorkflowActionBindings({
      setState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      appendLog,
      updateTutorialProgress,
      persistUiPreferencesFromState,
    })

    bindings.resetTutorial()
    const panelId: PanelId = 'hud'
    bindings.togglePanelVisibility(panelId)

    expect(state.tutorialEnabled).toBe(true)
    expect(state.tutorialCollapsed).toBe(false)
    expect(state.tutorialCurrentStepIndex).toBe(0)
    expect(state.simulationLog[0]?.message).toContain('Questline reset')
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
    expect(state.hiddenPanels).not.toContain(panelId)
    expect(persistUiPreferencesFromState).toHaveBeenCalledOnce()
  })
})
