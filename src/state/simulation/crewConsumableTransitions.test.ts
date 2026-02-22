import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CREW_STATUS,
  sanitizeCrewMembers,
} from '@state/runtime/snapshotSanitizers'
import type { SimulationLogEntry } from '@state/types'
import {
  applyFeedCrewGalaxyBarTransition,
  applyLoadFridgeGalaxyBarsTransition,
  applyLoadFridgeWaterTransition,
  applyUseEnergyCellTransition,
} from './crewConsumableTransitions'

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

describe('crewConsumableTransitions', () => {
  it('discharges an energy cell when deficit exists', () => {
    const result = applyUseEnergyCellTransition(
      {
        inventory: {
          energyCell: 2,
        },
        energy: 40,
        maxEnergy: 400,
        stationDistance: 0,
        charging: false,
        containmentOn: false,
        containmentPower: 60,
        simulationLog: [],
      },
      appendLog,
    )

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      return
    }

    expect(result.inventory.energyCell).toBe(1)
    expect(result.energy).toBeGreaterThan(40)
    expect(result.simulationLog[0]?.message).toContain('Energy cell discharged')
    expect(result.persistInventory).toBe(true)
  })

  it('does nothing when energy cell discharge is not needed', () => {
    const noCells = applyUseEnergyCellTransition(
      {
        inventory: { energyCell: 0 },
        energy: 100,
        maxEnergy: 200,
        stationDistance: 0,
        charging: false,
        containmentOn: false,
        containmentPower: 60,
        simulationLog: [],
      },
      appendLog,
    )

    const fullEnergy = applyUseEnergyCellTransition(
      {
        inventory: { energyCell: 1 },
        energy: 200,
        maxEnergy: 200,
        stationDistance: 0,
        charging: false,
        containmentOn: false,
        containmentPower: 60,
        simulationLog: [],
      },
      appendLog,
    )

    expect(noCells.kind).toBe('noop')
    expect(fullEnergy.kind).toBe('noop')
  })

  it('feeds crew from fridge first when bars are available', () => {
    const crewMembers = sanitizeCrewMembers([], DEFAULT_CREW_STATUS, 0).map((member, index) => ({
      ...member,
      hunger: index === 0 ? 20 : 80,
    }))
    const result = applyFeedCrewGalaxyBarTransition(
      {
        inventory: { galaxyBar: 5 },
        fridge: {
          unlocked: true,
          galaxyBars: 2,
          capacity: 10,
          waterLiters: 0,
          waterCapacityLiters: 10,
        },
        crewStatus: { ...DEFAULT_CREW_STATUS },
        crewMembers,
        crewFeedsDelivered: 3,
        starvationFailureLock: true,
        simulationLog: [],
      },
      appendLog,
    )

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      return
    }

    expect(result.fridge.galaxyBars).toBe(1)
    expect(result.inventory.galaxyBar).toBe(5)
    expect(result.crewFeedsDelivered).toBe(4)
    expect(result.persistInventory).toBe(false)
    expect(result.simulationLog[0]?.message).toContain('from fridge')
  })

  it('loads water into fridge and reports locked fridge state', () => {
    const locked = applyLoadFridgeWaterTransition(
      {
        inventory: { water: 5 },
        fridge: {
          unlocked: false,
          galaxyBars: 0,
          capacity: 10,
          waterLiters: 0,
          waterCapacityLiters: 10,
        },
        simulationLog: [],
      },
      2,
      appendLog,
    )

    expect(locked.kind).toBe('log-only')
    if (locked.kind !== 'log-only') {
      return
    }
    expect(locked.simulationLog[0]?.message).toContain('fridge is locked')

    const loaded = applyLoadFridgeWaterTransition(
      {
        inventory: { water: 5 },
        fridge: {
          unlocked: true,
          galaxyBars: 0,
          capacity: 10,
          waterLiters: 4,
          waterCapacityLiters: 10,
        },
        simulationLog: [],
      },
      3,
      appendLog,
    )

    expect(loaded.kind).toBe('success')
    if (loaded.kind !== 'success') {
      return
    }

    expect(loaded.inventory.water).toBe(2)
    expect(loaded.fridge.waterLiters).toBe(7)
    expect(loaded.persistInventory).toBe(true)
  })

  it('loads galaxy bars into fridge with capacity limits', () => {
    const loaded = applyLoadFridgeGalaxyBarsTransition(
      {
        inventory: { galaxyBar: 7 },
        fridge: {
          unlocked: true,
          galaxyBars: 8,
          capacity: 10,
          waterLiters: 0,
          waterCapacityLiters: 10,
        },
        simulationLog: [],
      },
      5,
      appendLog,
    )

    expect(loaded.kind).toBe('success')
    if (loaded.kind !== 'success') {
      return
    }

    expect(loaded.inventory.galaxyBar).toBe(5)
    expect(loaded.fridge.galaxyBars).toBe(10)
    expect(loaded.simulationLog[0]?.message).toContain('Galaxy Bars from cargo to fridge')
  })
})
