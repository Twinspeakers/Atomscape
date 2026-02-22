import { describe, expect, it } from 'vitest'
import type { QuestRewardNotification, SimulationLogEntry } from '@state/types'
import {
  applyDismissQuestRewardNotificationTransition,
  applyDismissTutorialTransition,
  applyMovePanelTransition,
  applyResetTutorialTransition,
  applySetActiveCleanupZoneTransition,
  applySetWorkspacePresetTransition,
  applyTogglePanelVisibilityTransition,
  applyToggleTutorialCollapsedTransition,
} from './uiActionTransitions'

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

describe('uiActionTransitions', () => {
  it('marks newly selected cleanup zone as visited in both zone collections', () => {
    const patch = applySetActiveCleanupZoneTransition(
      {
        activeCleanupZoneId: null,
        visitedCleanupZones: [],
        worldVisitedZoneIds: [],
      },
      'highRiskSalvagePocket',
    )

    expect(patch).toEqual({
      activeCleanupZoneId: 'highRiskSalvagePocket',
      visitedCleanupZones: ['highRiskSalvagePocket'],
      worldVisitedZoneIds: ['highRiskSalvagePocket'],
    })
  })

  it('resets tutorial state and appends reset log entry', () => {
    const patch = applyResetTutorialTransition(
      {
        simulationLog: [],
      },
      appendLog,
    )

    expect(patch.tutorialEnabled).toBe(true)
    expect(patch.tutorialCollapsed).toBe(false)
    expect(patch.tutorialComplete).toBe(false)
    expect(patch.tutorialCurrentStepIndex).toBe(0)
    expect(patch.activeCleanupZoneId).toBeNull()
    expect(patch.visitedCleanupZones).toEqual([])
    expect(patch.labActiveTab).toBe('station')
    expect(patch.simulationLog[0]?.message).toContain('Questline reset')
  })

  it('toggles tutorial collapsed state only when tutorial is enabled', () => {
    const enabledPatch = applyToggleTutorialCollapsedTransition({
      tutorialEnabled: true,
      tutorialCollapsed: false,
    })
    const disabledPatch = applyToggleTutorialCollapsedTransition({
      tutorialEnabled: false,
      tutorialCollapsed: false,
    })

    expect(enabledPatch).toEqual({ tutorialCollapsed: true })
    expect(disabledPatch).toBeNull()
  })

  it('builds workspace preset patch with clean slot hints and closed customizer', () => {
    const patch = applySetWorkspacePresetTransition('flight')

    expect(patch.panelSlotHints).toEqual({})
    expect(patch.workspaceCustomizerOpen).toBe(false)
    expect(patch.rightPanels).toContain('hud')
    expect(patch.hiddenPanels).toContain('tutorial')
  })

  it('moves panel between rails and updates slot hints', () => {
    const patch = applyMovePanelTransition(
      {
        leftPanels: ['tutorial', 'inventory'],
        rightPanels: ['object', 'hud', 'actions'],
        panelSlotHints: { tutorial: 1 },
      },
      'tutorial',
      'right',
      'actions',
      3.8,
    )

    expect(patch.leftPanels).toEqual(['inventory'])
    expect(patch.rightPanels).toEqual(['object', 'hud', 'tutorial', 'actions'])
    expect(patch.panelSlotHints.tutorial).toBe(3)
  })

  it('toggles panel visibility and dismisses queued reward notifications', () => {
    const shown = applyTogglePanelVisibilityTransition(
      { hiddenPanels: ['inventory'] },
      'inventory',
    )
    const hidden = applyTogglePanelVisibilityTransition(
      shown,
      'tutorial',
    )
    const notifications: QuestRewardNotification[] = [
      {
        id: 2,
        questId: 'main-2',
        questTitle: 'Second',
        rewards: [],
        grants: [],
        unlocks: [],
        timestamp: 2,
      },
      {
        id: 1,
        questId: 'main-1',
        questTitle: 'First',
        rewards: [],
        grants: [],
        unlocks: [],
        timestamp: 1,
      },
    ]
    const dismissPatch = applyDismissQuestRewardNotificationTransition({
      questRewardNotifications: notifications,
    })
    const emptyDismissPatch = applyDismissQuestRewardNotificationTransition({
      questRewardNotifications: [],
    })
    const dismissTutorialPatch = applyDismissTutorialTransition(
      { simulationLog: [] },
      appendLog,
    )

    expect(shown.hiddenPanels).toEqual([])
    expect(hidden.hiddenPanels).toEqual(['tutorial'])
    expect(dismissPatch?.questRewardNotifications).toEqual([notifications[1]])
    expect(emptyDismissPatch).toBeNull()
    expect(dismissTutorialPatch.tutorialEnabled).toBe(false)
    expect(dismissTutorialPatch.tutorialCollapsed).toBe(false)
    expect(dismissTutorialPatch.simulationLog[0]?.message).toContain('Quests dismissed')
  })
})
