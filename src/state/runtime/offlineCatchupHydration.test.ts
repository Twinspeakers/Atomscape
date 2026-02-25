import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import { useAppStore } from '@state/store'
import { describe, expect, it } from 'vitest'
import {
  resolveOfflineCatchupHydration,
  type OfflineCatchupHydrationState,
} from './offlineCatchupHydration'

function buildState(overrides: Partial<OfflineCatchupHydrationState> = {}): OfflineCatchupHydrationState {
  const state = useAppStore.getState()

  return {
    inventoryLoaded: state.inventoryLoaded,
    cycleTimeSeconds: state.cycleTimeSeconds,
    inventory: state.inventory,
    market: state.market,
    energy: state.energy,
    maxEnergy: state.maxEnergy,
    charging: state.charging,
    docked: state.docked,
    useSceneDistance: state.useSceneDistance,
    stationDistanceScene: state.stationDistanceScene,
    stationDistanceManual: state.stationDistanceManual,
    containmentOn: state.containmentOn,
    containmentPower: state.containmentPower,
    crewMembers: state.crewMembers,
    crewStatus: state.crewStatus,
    crewAggregateMetrics: state.crewAggregateMetrics,
    fridge: state.fridge,
    waterAutomationEnabled: state.waterAutomationEnabled,
    galaxyBarAutomationEnabled: state.galaxyBarAutomationEnabled,
    galaxyBarsCrafted: state.galaxyBarsCrafted,
    stationDistance: state.stationDistance,
    simulationSummary: state.simulationSummary,
    simulationLog: state.simulationLog,
    starvationFailureLock: state.starvationFailureLock,
    crewFeedsDelivered: state.crewFeedsDelivered,
    ...overrides,
  }
}

describe('offline catchup hydration', () => {
  it('skips when catchup already ran', () => {
    const result = resolveOfflineCatchupHydration({
      alreadyApplied: true,
      state: buildState({ inventoryLoaded: true }),
    })

    expect(result.kind).toBe('skip')
    expect(result.nextApplied).toBe(true)
  })

  it('skips while inventory is not loaded', () => {
    const result = resolveOfflineCatchupHydration({
      alreadyApplied: false,
      state: buildState({ inventoryLoaded: false }),
    })

    expect(result.kind).toBe('skip')
    expect(result.nextApplied).toBe(false)
  })

  it('returns noop when no elapsed time exists', () => {
    const cycleTimeSeconds = 1200
    const result = resolveOfflineCatchupHydration({
      alreadyApplied: false,
      state: buildState({
        inventoryLoaded: true,
        cycleTimeSeconds,
      }),
      nowMs: cycleTimeSeconds * 1000,
    })

    expect(result.kind).toBe('noop')
    expect(result.nextApplied).toBe(true)
    expect(result.persistInventory).toBe(false)
  })

  it('returns an applied patch for positive elapsed time', () => {
    const cycleTimeSeconds = 2000
    const elapsedSeconds = 3
    const result = resolveOfflineCatchupHydration({
      alreadyApplied: false,
      state: buildState({
        inventoryLoaded: true,
        cycleTimeSeconds,
      }),
      nowMs: (cycleTimeSeconds + elapsedSeconds) * 1000,
    })

    expect(result.kind).toBe('applied')
    expect(result.nextApplied).toBe(true)
    expect(result.patch).toBeDefined()
    if (!result.patch) {
      throw new Error('Expected an applied patch.')
    }
    expect(result.patch.cycleTimeSeconds).toBe(cycleTimeSeconds + elapsedSeconds)
    expect(result.patch.simulationLog[0]?.message).toContain('Offline catch-up complete')
    expect(result.patch.atomCounter).toEqual(computeAtomTotals(result.patch.inventory))
  })
})
