import { mainQuestDefinitions } from '@features/quests/questDefinitions'
import { sanitizePinnedQuestIds } from '@state/runtime/snapshotSanitizers'
import { clamp } from '@state/utils/numberUtils'
import type {
  PanelId,
  UiDensity,
  WorkspacePreset,
} from '@state/types'

const allPanelIds: PanelId[] = ['tutorial', 'inventory', 'object', 'hud', 'actions']

export const DEFAULT_LEFT_PANELS: PanelId[] = ['tutorial', 'inventory']
export const DEFAULT_RIGHT_PANELS: PanelId[] = ['object', 'hud', 'actions']
export const DEFAULT_UI_DENSITY: UiDensity = 'comfortable'
export const DEFAULT_PANEL_OPACITY = 0.88
export const UI_PREFERENCES_STORAGE_KEY = 'space-ui-preferences-v1'

export const DEFAULT_PINNED_QUEST_IDS = mainQuestDefinitions.at(0)?.id
  ? [mainQuestDefinitions[0].id]
  : []

export interface UiPreferencesSnapshot {
  leftPanels: PanelId[]
  rightPanels: PanelId[]
  hiddenPanels: PanelId[]
  panelSlotHints: Partial<Record<PanelId, number>>
  pinnedQuestIds: string[]
  activeMainQuestId: string | null
  uiDensity: UiDensity
  panelOpacity: number
}

function isPanelId(value: string): value is PanelId {
  return (allPanelIds as string[]).includes(value)
}

function uniquePanelIds(panelIds: PanelId[]): PanelId[] {
  const seen = new Set<PanelId>()
  return panelIds.filter((panelId) => {
    if (seen.has(panelId)) {
      return false
    }

    seen.add(panelId)
    return true
  })
}

export function sanitizeDockLists(
  leftInput: PanelId[],
  rightInput: PanelId[],
): { leftPanels: PanelId[]; rightPanels: PanelId[] } {
  const leftPanels = uniquePanelIds(leftInput.filter((panelId) => isPanelId(panelId)))
  const claimed = new Set<PanelId>(leftPanels)

  const rightPanels = uniquePanelIds(
    rightInput.filter((panelId) => isPanelId(panelId) && !claimed.has(panelId)),
  )

  rightPanels.forEach((panelId) => {
    claimed.add(panelId)
  })

  allPanelIds.forEach((panelId) => {
    if (!claimed.has(panelId)) {
      rightPanels.push(panelId)
    }
  })

  return { leftPanels, rightPanels }
}

export function sanitizeHiddenPanels(hiddenPanels: PanelId[]): PanelId[] {
  return uniquePanelIds(hiddenPanels.filter((panelId) => isPanelId(panelId)))
}

export function sanitizePanelSlotHints(raw: unknown): Partial<Record<PanelId, number>> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const entries = Object.entries(raw as Record<string, unknown>)
  const hints: Partial<Record<PanelId, number>> = {}

  entries.forEach(([panelId, value]) => {
    if (!isPanelId(panelId)) {
      return
    }

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) {
      return
    }

    hints[panelId] = Math.max(0, Math.floor(numericValue))
  })

  return hints
}

export function sanitizeMainQuestId(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null
  }

  const questId = raw.trim()
  if (!questId) {
    return null
  }

  const exists = mainQuestDefinitions.some((quest) => quest.id === questId)
  return exists ? questId : null
}

export function normalizeUiDensity(value: unknown): UiDensity {
  return value === 'compact' ? 'compact' : 'comfortable'
}

export function normalizePanelOpacity(value: number): number {
  return clamp(Number.isFinite(value) ? value : DEFAULT_PANEL_OPACITY, 0.45, 0.98)
}

export function workspacePresetLayout(preset: WorkspacePreset): {
  leftPanels: PanelId[]
  rightPanels: PanelId[]
  hiddenPanels: PanelId[]
  uiDensity: UiDensity
  panelOpacity: number
} {
  switch (preset) {
    case 'flight':
      return {
        leftPanels: [],
        rightPanels: ['hud'],
        hiddenPanels: ['tutorial', 'inventory', 'object', 'actions'],
        uiDensity: 'compact',
        panelOpacity: 0.74,
      }
    case 'combat':
      return {
        leftPanels: [],
        rightPanels: ['hud', 'object'],
        hiddenPanels: ['tutorial', 'inventory', 'actions'],
        uiDensity: 'compact',
        panelOpacity: 0.68,
      }
    case 'mining':
      return {
        leftPanels: ['tutorial', 'inventory', 'object'],
        rightPanels: ['hud', 'actions'],
        hiddenPanels: [],
        uiDensity: 'comfortable',
        panelOpacity: 0.9,
      }
    case 'analysis':
      return {
        leftPanels: ['tutorial', 'inventory'],
        rightPanels: ['object', 'hud', 'actions'],
        hiddenPanels: ['hud'],
        uiDensity: 'comfortable',
        panelOpacity: 0.94,
      }
    case 'labFirst':
      return {
        leftPanels: ['tutorial', 'inventory'],
        rightPanels: ['object', 'hud', 'actions'],
        hiddenPanels: ['object', 'hud', 'actions'],
        uiDensity: 'compact',
        panelOpacity: 0.82,
      }
    case 'balanced':
    default:
      return {
        leftPanels: DEFAULT_LEFT_PANELS,
        rightPanels: DEFAULT_RIGHT_PANELS,
        hiddenPanels: [],
        uiDensity: DEFAULT_UI_DENSITY,
        panelOpacity: DEFAULT_PANEL_OPACITY,
      }
  }
}

export function loadUiPreferences(): Partial<UiPreferencesSnapshot> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Partial<UiPreferencesSnapshot>
    const leftInput = Array.isArray(parsed.leftPanels)
      ? parsed.leftPanels.filter(isPanelId)
      : DEFAULT_LEFT_PANELS
    const rightInput = Array.isArray(parsed.rightPanels)
      ? parsed.rightPanels.filter(isPanelId)
      : DEFAULT_RIGHT_PANELS
    const hiddenInput = Array.isArray(parsed.hiddenPanels)
      ? parsed.hiddenPanels.filter(isPanelId)
      : []
    const pinnedQuestIds = Array.isArray(parsed.pinnedQuestIds)
      ? sanitizePinnedQuestIds(parsed.pinnedQuestIds)
      : DEFAULT_PINNED_QUEST_IDS
    const dockState = sanitizeDockLists(leftInput, rightInput)

    return {
      leftPanels: dockState.leftPanels,
      rightPanels: dockState.rightPanels,
      hiddenPanels: sanitizeHiddenPanels(hiddenInput),
      panelSlotHints: sanitizePanelSlotHints(parsed.panelSlotHints),
      pinnedQuestIds,
      activeMainQuestId: sanitizeMainQuestId(parsed.activeMainQuestId),
      uiDensity: normalizeUiDensity(parsed.uiDensity),
      panelOpacity: normalizePanelOpacity(Number(parsed.panelOpacity)),
    }
  } catch {
    return {}
  }
}

export function persistUiPreferences(snapshot: UiPreferencesSnapshot): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Ignore storage persistence failures.
  }
}
