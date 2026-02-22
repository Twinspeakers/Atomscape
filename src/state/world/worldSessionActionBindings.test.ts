import { DEFAULT_START_SECTOR_ID } from '@domain/spec/sectorSpec'
import type { WorldSessionRow } from '@platform/db/gameDb'
import type { SimulationLogEntry } from '@state/types'
import { describe, expect, it, vi } from 'vitest'
import {
  buildWorldSessionActionBindings,
  type WorldSessionActionState,
} from './worldSessionActionBindings'

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

function createState(overrides: Partial<WorldSessionActionState> = {}): WorldSessionActionState {
  return {
    activeSectorId: DEFAULT_START_SECTOR_ID,
    worldStateLoaded: false,
    worldSeed: 'seed-a',
    worldDepletedTargetIds: [],
    worldDestroyedCount: 0,
    worldRemainingCount: 38,
    worldVisitedZoneIds: [],
    worldZoneDestroyedCounts: {},
    worldClassDestroyedCounts: {},
    activeCleanupZoneId: null,
    visitedCleanupZones: [],
    simulationLog: [],
    selectedObject: null,
    radarContacts: [],
    ...overrides,
  }
}

describe('worldSessionActionBindings', () => {
  it('hydrates world session for active sector and updates tutorial progress', async () => {
    let state = createState()
    const updateTutorialProgress = vi.fn()
    const readWorldSessionById = vi.fn(async () => undefined as WorldSessionRow | undefined)

    const bindings = buildWorldSessionActionBindings({
      setState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      getState: () => state,
      appendLog,
      updateTutorialProgress,
      worldSessionVersion: 1,
      legacyRowId: 'legacy',
      readWorldSessionById,
    })

    await bindings.hydrateWorldSession()

    expect(readWorldSessionById).toHaveBeenCalled()
    expect(state.worldStateLoaded).toBe(true)
    expect(state.worldRemainingCount).toBeGreaterThan(0)
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })

  it('performs jump transitions and no-ops when target sector is unchanged', async () => {
    let state = createState({
      activeSectorId: 'earthCorridor',
      simulationLog: [],
    })
    const updateTutorialProgress = vi.fn()
    const readWorldSessionById = vi.fn(async () => undefined as WorldSessionRow | undefined)

    const bindings = buildWorldSessionActionBindings({
      setState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      getState: () => state,
      appendLog,
      updateTutorialProgress,
      worldSessionVersion: 1,
      legacyRowId: 'legacy',
      readWorldSessionById,
    })

    await bindings.jumpToSector('earthCorridor')
    expect(readWorldSessionById).not.toHaveBeenCalled()

    await bindings.jumpToSector('marsCorridor')

    expect(state.activeSectorId).toBe('marsCorridor')
    expect(state.simulationLog[0]?.message).toContain('Arrived in')
    expect(state.simulationLog.some((entry) => entry.message.includes('Sector transit'))).toBe(true)
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })

  it('falls back to default world state on load errors', async () => {
    let state = createState({
      worldStateLoaded: false,
      worldSeed: 'broken',
      worldDepletedTargetIds: ['x'],
      worldDestroyedCount: 1,
      worldRemainingCount: 1,
    })
    const updateTutorialProgress = vi.fn()
    const readWorldSessionById = vi.fn(async () => undefined as WorldSessionRow | undefined)
    const failingLoader = vi.fn(async () => {
      throw new Error('db failure')
    })

    const bindings = buildWorldSessionActionBindings(
      {
        setState: (updater) => {
          state = { ...state, ...updater(state) }
        },
        getState: () => state,
        appendLog,
        updateTutorialProgress,
        worldSessionVersion: 1,
        legacyRowId: 'legacy',
        readWorldSessionById,
      },
      {
        loadWorldSessionRowForSector: failingLoader as unknown as typeof failingLoader,
      },
    )

    await bindings.loadWorldSessionForSector('marsCorridor')

    expect(state.worldStateLoaded).toBe(true)
    expect(state.worldDestroyedCount).toBe(0)
    expect(state.worldDepletedTargetIds).toEqual([])
    expect(state.worldRemainingCount).toBeGreaterThan(0)
    expect(updateTutorialProgress).not.toHaveBeenCalled()
  })
})
