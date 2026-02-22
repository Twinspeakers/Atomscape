import { describe, expect, it } from 'vitest'
import { mainQuestDefinitions } from '@features/quests/questDefinitions'
import {
  DEFAULT_LEFT_PANELS,
  DEFAULT_PANEL_OPACITY,
  DEFAULT_RIGHT_PANELS,
  DEFAULT_UI_DENSITY,
  normalizePanelOpacity,
  normalizeUiDensity,
  sanitizeDockLists,
  sanitizeMainQuestId,
  sanitizePanelSlotHints,
  workspacePresetLayout,
} from './workspacePreferences'

describe('workspacePreferences', () => {
  it('sanitizes dock lists and enforces one ownership per panel', () => {
    const dockState = sanitizeDockLists(
      ['tutorial', 'inventory', 'tutorial'],
      ['inventory', 'hud'],
    )

    expect(dockState.leftPanels).toEqual(['tutorial', 'inventory'])
    expect(dockState.rightPanels).toEqual(['hud', 'object', 'actions'])
  })

  it('sanitizes panel slot hints by filtering invalid keys and normalizing values', () => {
    const hints = sanitizePanelSlotHints({
      tutorial: 2.9,
      hud: -1,
      actions: '3',
      invalidPanel: 8,
      object: Number.NaN,
    })

    expect(hints).toEqual({
      tutorial: 2,
      hud: 0,
      actions: 3,
    })
  })

  it('normalizes density and opacity bounds', () => {
    expect(normalizeUiDensity('compact')).toBe('compact')
    expect(normalizeUiDensity('something-else')).toBe('comfortable')
    expect(normalizePanelOpacity(0.2)).toBe(0.45)
    expect(normalizePanelOpacity(2)).toBe(0.98)
    expect(normalizePanelOpacity(Number.NaN)).toBe(DEFAULT_PANEL_OPACITY)
  })

  it('returns balanced preset defaults', () => {
    expect(workspacePresetLayout('balanced')).toEqual({
      leftPanels: DEFAULT_LEFT_PANELS,
      rightPanels: DEFAULT_RIGHT_PANELS,
      hiddenPanels: [],
      uiDensity: DEFAULT_UI_DENSITY,
      panelOpacity: DEFAULT_PANEL_OPACITY,
    })
  })

  it('sanitizes main quest id against known quest definitions', () => {
    const firstQuestId = mainQuestDefinitions[0]?.id
    if (!firstQuestId) {
      throw new Error('Expected at least one main quest definition.')
    }

    expect(sanitizeMainQuestId(firstQuestId)).toBe(firstQuestId)
    expect(sanitizeMainQuestId(` ${firstQuestId} `)).toBe(firstQuestId)
    expect(sanitizeMainQuestId('unknown-quest')).toBeNull()
    expect(sanitizeMainQuestId(42)).toBeNull()
  })
})
