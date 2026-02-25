import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import { MINING_ASTEROID_RUBBLE_YIELD } from '@domain/spec/gameSpec'
import { TRAINING_SECTOR_ID } from '@domain/spec/sectorSpec'
import type {
  ExtractionEvent,
  ExtractionTargetPayload,
  ResourceInventory,
  SimulationSummary,
} from '@state/types'
import { describe, expect, it, vi } from 'vitest'
import {
  buildExtractionActionBindings,
  type ExtractionActionBindingDependencies,
  type ExtractionActionState,
} from './extractionActionBindings'

function createSimulationSummary(): SimulationSummary {
  return {
    chargingRate: 0,
    containmentDrain: 0,
    recombinationRate: 0,
    inRange: true,
    netEnergyPerSecond: 0,
  }
}

function createInventory(): ResourceInventory {
  return {
    rubble: 0,
    waterIce: 0,
  }
}

function createTarget(overrides: Partial<ExtractionTargetPayload> = {}): ExtractionTargetPayload {
  return {
    targetId: 'target-a',
    classId: 'rockBody',
    kind: 'asteroid',
    zoneId: 'nearStationBelt',
    riskRating: 0.4,
    signatureElementSymbol: 'Si',
    expectedYield: {
      rubble: 1,
    },
    ...overrides,
  }
}

function createExtractionEvent(overrides: Partial<ExtractionEvent> = {}): ExtractionEvent {
  return {
    id: 1,
    timestamp: 1,
    type: 'laserFired',
    succeeded: true,
    message: 'event',
    energyCost: 5,
    ...overrides,
  }
}

function createState(overrides: Partial<ExtractionActionState> = {}): ExtractionActionState {
  const inventory = createInventory()

  return {
    inventory,
    atomCounter: computeAtomTotals(inventory),
    energy: 100,
    maxEnergy: 500,
    activeSectorId: 'earthCorridor',
    stationDistance: 0,
    charging: false,
    containmentOn: false,
    containmentPower: 60,
    crewStatus: {
      hunger: 100,
      debuff: 0,
      starving: false,
      foodAutomationEnabled: true,
    },
    simulationSummary: createSimulationSummary(),
    simulationLog: [],
    extractionEvents: [],
    ...overrides,
  }
}

describe('extractionActionBindings', () => {
  it('fires mining laser and updates state on successful transitions', () => {
    let state = createState()
    const updateTutorialProgress = vi.fn()
    const persistInventorySnapshotSafely = vi.fn()
    const applyTryFireMiningLaserTransition = vi.fn(() => ({
      kind: 'success' as const,
      fired: true as const,
      energy: 95,
      extractionEvents: [createExtractionEvent()],
      simulationSummary: createSimulationSummary(),
      nextLowPowerLogTime: 0,
    }))

    const bindings = buildExtractionActionBindings(
      {
        setState: (updater) => {
          state = { ...state, ...updater(state) }
        },
        getState: () => state,
        appendLog: ({ logs, message }) => [
          { id: logs.length + 1, message, timestamp: logs.length + 1 },
          ...logs,
        ],
        persistInventorySnapshotSafely,
        updateTutorialProgress,
      },
      {
        applyTryFireMiningLaserTransition:
          applyTryFireMiningLaserTransition as unknown as ExtractionActionBindingDependencies['applyTryFireMiningLaserTransition'],
      },
    )

    const fired = bindings.tryFireMiningLaser()

    expect(fired).toBe(true)
    expect(state.energy).toBe(95)
    expect(state.extractionEvents).toHaveLength(1)
    expect(updateTutorialProgress).not.toHaveBeenCalled()
    expect(persistInventorySnapshotSafely).not.toHaveBeenCalled()
  })

  it('records extraction hits, persists inventory, and updates tutorial progress', async () => {
    let state = createState()
    const updateTutorialProgress = vi.fn()
    const persistInventorySnapshotSafely = vi.fn()
    const applyRecordExtractionHitTransition = vi.fn(() => ({
      inventory: {
        ...state.inventory,
        rubble: 2,
      },
      simulationLog: [{ id: 1, message: 'hit', timestamp: 1 }],
      extractionEvents: [createExtractionEvent({ type: 'targetExtracted', message: 'hit' })],
      persistInventory: true,
    }))

    const bindings = buildExtractionActionBindings(
      {
        setState: (updater) => {
          state = { ...state, ...updater(state) }
        },
        getState: () => state,
        appendLog: ({ logs, message }) => [
          { id: logs.length + 1, message, timestamp: logs.length + 1 },
          ...logs,
        ],
        persistInventorySnapshotSafely,
        updateTutorialProgress,
      },
      {
        applyRecordExtractionHitTransition:
          applyRecordExtractionHitTransition as unknown as ExtractionActionBindingDependencies['applyRecordExtractionHitTransition'],
      },
    )

    await bindings.recordExtractionHit(createTarget())

    expect(state.inventory.rubble).toBe(2)
    expect(state.extractionEvents).toHaveLength(1)
    expect(persistInventorySnapshotSafely).toHaveBeenCalledWith(state.inventory)
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
  })

  it('does not drain real energy when firing in the training sector', () => {
    let state = createState({
      activeSectorId: TRAINING_SECTOR_ID,
      energy: 2,
      maxEnergy: 500,
    })
    const updateTutorialProgress = vi.fn()
    const persistInventorySnapshotSafely = vi.fn()
    const applyTryFireMiningLaserTransition = vi.fn((input: { energy: number; maxEnergy: number }) => ({
      kind: 'success' as const,
      fired: true as const,
      energy: input.energy - 5,
      extractionEvents: [createExtractionEvent()],
      simulationSummary: createSimulationSummary(),
      nextLowPowerLogTime: 0,
    }))

    const bindings = buildExtractionActionBindings(
      {
        setState: (updater) => {
          state = { ...state, ...updater(state) }
        },
        getState: () => state,
        appendLog: ({ logs, message }) => [
          { id: logs.length + 1, message, timestamp: logs.length + 1 },
          ...logs,
        ],
        persistInventorySnapshotSafely,
        updateTutorialProgress,
      },
      {
        applyTryFireMiningLaserTransition:
          applyTryFireMiningLaserTransition as unknown as ExtractionActionBindingDependencies['applyTryFireMiningLaserTransition'],
      },
    )

    const fired = bindings.tryFireMiningLaser()

    expect(fired).toBe(true)
    expect(applyTryFireMiningLaserTransition).toHaveBeenCalledWith(
      expect.objectContaining({ energy: 500 }),
      0,
      expect.any(Function),
    )
    expect(state.energy).toBe(2)
    expect(state.extractionEvents).toHaveLength(1)
    expect(updateTutorialProgress).not.toHaveBeenCalled()
    expect(persistInventorySnapshotSafely).not.toHaveBeenCalled()
  })

  it('routes mineElement through recordExtractionHit with debug extraction payload', async () => {
    let state = createState()
    const updateTutorialProgress = vi.fn()
    const persistInventorySnapshotSafely = vi.fn()
    const applyRecordExtractionHitTransition = vi.fn(() => ({
      inventory: state.inventory,
      simulationLog: state.simulationLog,
      extractionEvents: state.extractionEvents,
      persistInventory: false,
    }))

    const bindings = buildExtractionActionBindings(
      {
        setState: (updater) => {
          state = { ...state, ...updater(state) }
        },
        getState: () => state,
        appendLog: ({ logs, message }) => [
          { id: logs.length + 1, message, timestamp: logs.length + 1 },
          ...logs,
        ],
        persistInventorySnapshotSafely,
        updateTutorialProgress,
      },
      {
        applyRecordExtractionHitTransition:
          applyRecordExtractionHitTransition as unknown as ExtractionActionBindingDependencies['applyRecordExtractionHitTransition'],
      },
    )

    await bindings.mineElement('Fe')

    const recordHitMock = applyRecordExtractionHitTransition as unknown as {
      mock: { calls: unknown[][] }
    }
    const target = recordHitMock.mock.calls[0]?.[1] as ExtractionTargetPayload
    expect(target.signatureElementSymbol).toBe('Fe')
    expect(target.expectedYield.rubble).toBe(MINING_ASTEROID_RUBBLE_YIELD)
    expect(updateTutorialProgress).toHaveBeenCalledOnce()
    expect(persistInventorySnapshotSafely).not.toHaveBeenCalled()
  })
})
