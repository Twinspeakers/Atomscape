import { describe, expect, it } from 'vitest'
import { buildSimulationSummary, createMarketState } from '@features/simulation/engine'
import {
  DEFAULT_CREW_STATUS,
  deriveCrewAggregateMetrics,
  sanitizeCrewMembers,
} from '@state/runtime/snapshotSanitizers'
import {
  mirrorAggregateCrewToMembers,
  runLiveSimulationTick,
  runOfflineCatchupTicks,
} from './tickOrchestration'

describe('tickOrchestration', () => {
  it('mirrors aggregate crew status to crew members', () => {
    const crewMembers = sanitizeCrewMembers([], DEFAULT_CREW_STATUS, 0)
    const mirrored = mirrorAggregateCrewToMembers(crewMembers, {
      hunger: 40,
      debuff: 10,
      starving: true,
      foodAutomationEnabled: true,
    })

    expect(mirrored.every((member) => member.hunger === 40)).toBe(true)
    expect(mirrored.every((member) => member.debuff === 10)).toBe(true)
    expect(mirrored.every((member) => member.starving)).toBe(true)
  })

  it('returns null when no offline time elapsed', () => {
    const crewMembers = sanitizeCrewMembers([], DEFAULT_CREW_STATUS, 0)
    const crewMetrics = deriveCrewAggregateMetrics(crewMembers)

    const result = runOfflineCatchupTicks({
      startCycleTimeSeconds: 100,
      nowCycleTimeSeconds: 100,
      inventory: {},
      market: createMarketState(),
      energy: 100,
      maxEnergy: 2000,
      charging: false,
      docked: false,
      useSceneDistance: true,
      stationDistanceScene: 500,
      stationDistanceManual: 500,
      containmentOn: false,
      containmentPower: 60,
      crewMembers,
      crewStatus: { ...DEFAULT_CREW_STATUS },
      crewAggregateMetrics: crewMetrics,
      fridge: {
        unlocked: false,
        galaxyBars: 0,
        capacity: 5,
        waterLiters: 0,
        waterCapacityLiters: 10,
      },
      waterAutomationEnabled: true,
      stationDistance: 500,
      simulationSummary: buildSimulationSummary({
        stationDistance: 500,
        charging: false,
        containmentOn: false,
        containmentPower: 60,
      }),
      simulationLog: [],
      starvationFailureLock: false,
    })

    expect(result).toBeNull()
  })

  it('runs offline catch-up ticks and advances cycle time', () => {
    const startCycleTimeSeconds = 100
    const nowCycleTimeSeconds = 103
    const crewMembers = sanitizeCrewMembers([], DEFAULT_CREW_STATUS, startCycleTimeSeconds * 1000)
    const crewMetrics = deriveCrewAggregateMetrics(crewMembers)

    const result = runOfflineCatchupTicks({
      startCycleTimeSeconds,
      nowCycleTimeSeconds,
      inventory: {},
      market: createMarketState(),
      energy: 100,
      maxEnergy: 2000,
      charging: false,
      docked: false,
      useSceneDistance: true,
      stationDistanceScene: 500,
      stationDistanceManual: 500,
      containmentOn: false,
      containmentPower: 60,
      crewMembers,
      crewStatus: { ...DEFAULT_CREW_STATUS },
      crewAggregateMetrics: crewMetrics,
      fridge: {
        unlocked: false,
        galaxyBars: 0,
        capacity: 5,
        waterLiters: 0,
        waterCapacityLiters: 10,
      },
      waterAutomationEnabled: true,
      stationDistance: 500,
      simulationSummary: buildSimulationSummary({
        stationDistance: 500,
        charging: false,
        containmentOn: false,
        containmentPower: 60,
      }),
      simulationLog: [],
      starvationFailureLock: false,
    })

    expect(result).not.toBeNull()
    if (!result) {
      return
    }

    expect(result.elapsedSeconds).toBe(3)
    expect(result.cycleTimeSeconds).toBe(nowCycleTimeSeconds)
    expect(result.crewMembers.length).toBe(crewMembers.length)
  })

  it('runs one live tick transition for store updates', () => {
    const cycleTimeSeconds = 100
    const crewMembers = sanitizeCrewMembers([], DEFAULT_CREW_STATUS, cycleTimeSeconds * 1000)

    const result = runLiveSimulationTick({
      inventory: {},
      market: createMarketState(),
      energy: 100,
      maxEnergy: 2000,
      charging: false,
      docked: false,
      useSceneDistance: true,
      stationDistanceScene: 500,
      stationDistanceManual: 500,
      containmentOn: false,
      containmentPower: 60,
      crewMembers,
      crewStatus: { ...DEFAULT_CREW_STATUS },
      fridge: {
        unlocked: false,
        galaxyBars: 0,
        capacity: 5,
        waterLiters: 0,
        waterCapacityLiters: 10,
      },
      waterAutomationEnabled: true,
      simulationLog: [],
      cycleTimeSeconds,
      starvationFailureLock: false,
      crewFeedsDelivered: 2,
    })

    expect(result.cycleTimeSeconds).toBe(cycleTimeSeconds + 1)
    expect(result.crewFeedsDelivered).toBe(2)
    expect(result.stationDistance).toBe(500)
    expect(result.triggerFailureReason).toBeNull()
    expect(result.persistInventory).toBe(false)
    expect(result.crewMembers.length).toBe(crewMembers.length)
  })
})
