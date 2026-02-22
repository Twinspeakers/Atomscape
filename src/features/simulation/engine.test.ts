import { PROCESS_CATALOG } from '@domain/spec/processCatalog'
import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import { CREW_DEFAULT_ROSTER, MINING_ASTEROID_RUBBLE_YIELD } from '@domain/spec/gameSpec'
import type { CrewMemberState } from '@state/types'
import { describe, expect, it } from 'vitest'
import {
  attemptMiningLaserFire,
  createMarketState,
  executeMarketSale,
  executeProcess,
  miningLaserEnergyCost,
  resolveExtractionHit,
  runSimulationTick,
} from './engine'

function createCrewMembers(): CrewMemberState[] {
  const currentDayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000))

  return CREW_DEFAULT_ROSTER.map((entry) => ({
    id: entry.id,
    name: entry.name,
    hunger: 100,
    thirst: 100,
    debuff: 0,
    starving: false,
    dehydrated: false,
    sleepShiftStartHour: entry.sleepShiftStartHour,
    sleeping: false,
    firstGalaxyBarBoostApplied: false,
    dailyScheduleDayIndex: currentDayIndex,
    dailyBreakfastServed: false,
    dailyLunchServed: false,
    dailyDinnerServed: false,
    dailyWaterServedCount: 0,
  }))
}

describe('simulation tick determinism', () => {
  it('produces identical output for identical fixed inputs', () => {
    const input = {
      inventory: {
        hydrogenIonized: 10,
        hydrogenNeutral: 0,
      },
      market: createMarketState(),
      energy: 120,
      maxEnergy: 200,
      charging: true,
      docked: false,
      useSceneDistance: false,
      stationDistanceScene: 0,
      stationDistanceManual: 100,
      containmentOn: true,
      containmentPower: 60,
      crewHunger: 80,
      crewDebuff: 0,
      crewStarving: false,
      foodAutomationEnabled: false,
      simulationLog: [],
      now: 1_710_000_000_000,
      random: () => 0.5,
    }

    const first = runSimulationTick(input)
    const second = runSimulationTick(input)

    expect(first).toEqual(second)
  })
})

describe('process execution invariants', () => {
  it('never allows energy above max or below zero', () => {
    const result = executeProcess(
      {
        inventory: { waterIce: 1 },
        energy: 3,
        maxEnergy: 4,
      },
      {
        ...PROCESS_CATALOG.iceMelter,
        energyGain: 100,
      },
    )

    expect(result.succeeded).toBe(true)
    expect(result.energy).toBe(4)
  })

  it('keeps hydrogen atom totals stable for ionization state changes', () => {
    const inventory = {
      hydrogenNeutral: 16,
      hydrogenIonized: 0,
    }

    const before = computeAtomTotals(inventory)
    const result = executeProcess(
      {
        inventory,
        energy: 100,
        maxEnergy: 100,
      },
      PROCESS_CATALOG.ionizer,
    )
    const after = computeAtomTotals(result.inventory)

    expect(result.succeeded).toBe(true)
    expect(after).toEqual(before)
  })

  it('blocks process runs when required resources are missing', () => {
    const result = executeProcess(
      {
        inventory: { waterIce: 0 },
        energy: 100,
        maxEnergy: 100,
      },
      PROCESS_CATALOG.iceMelter,
    )

    expect(result.succeeded).toBe(false)
    expect(result.inventoryChanged).toBe(false)
  })
})

describe('market sale invariants', () => {
  it('blocks sales when stock is insufficient', () => {
    const market = createMarketState()
    const result = executeMarketSale({
      inventory: { boxOfSand: 0 },
      market,
      credits: 0,
      productId: 'boxOfSand',
      quantity: 1,
    })

    expect(result.succeeded).toBe(false)
    expect(result.credits).toBe(0)
    expect(result.inventoryChanged).toBe(false)
  })

  it('applies sale effects and clamps demand', () => {
    const market = createMarketState()
    const result = executeMarketSale({
      inventory: { boxOfSand: 120 },
      market,
      credits: 0,
      productId: 'boxOfSand',
      quantity: 50,
    })

    expect(result.succeeded).toBe(true)
    expect(result.inventory.boxOfSand).toBe(70)
    expect(result.credits).toBeGreaterThan(0)
    expect(result.market.boxOfSand.demand).toBe(0.55)
  })
})

describe('crew survival invariants', () => {
  it('auto-feeds crew when hungry and galaxy bars are available', () => {
    const next = runSimulationTick({
      inventory: { galaxyBar: 2 },
      market: createMarketState(),
      energy: 120,
      maxEnergy: 200,
      charging: false,
      docked: false,
      useSceneDistance: false,
      stationDistanceScene: 0,
      stationDistanceManual: 100,
      containmentOn: false,
      containmentPower: 0,
      crewHunger: 10,
      crewDebuff: 5,
      crewStarving: true,
      foodAutomationEnabled: true,
      simulationLog: [],
      now: 1_710_000_000_000,
      random: () => 0.5,
    })

    expect(next.inventory.galaxyBar).toBe(1)
    expect(next.crewHunger).toBeGreaterThan(60)
    expect(next.crewStarving).toBe(false)
    expect(next.crewDebuff).toBeLessThan(5)
    expect(next.crewCriticalFailure).toBeNull()
  })

  it('raises debuff when starving and no food is available', () => {
    const next = runSimulationTick({
      inventory: { galaxyBar: 0 },
      market: createMarketState(),
      energy: 120,
      maxEnergy: 200,
      charging: false,
      docked: false,
      useSceneDistance: false,
      stationDistanceScene: 0,
      stationDistanceManual: 100,
      containmentOn: false,
      containmentPower: 0,
      crewHunger: 5,
      crewDebuff: 2,
      crewStarving: true,
      foodAutomationEnabled: false,
      simulationLog: [],
      now: 1_710_000_000_000,
      random: () => 0.5,
    })

    expect(next.crewStarving).toBe(true)
    expect(next.crewDebuff).toBeGreaterThan(2)
    expect(next.crewCriticalFailure).toBeNull()
  })

  it('auto-crafts food when enabled and raw nutrition inputs are available', () => {
    const next = runSimulationTick({
      inventory: {
        cellulose: 3,
        water: 2,
        carbon: 1,
        galaxyBar: 0,
      },
      market: createMarketState(),
      energy: 120,
      maxEnergy: 200,
      charging: false,
      docked: false,
      useSceneDistance: false,
      stationDistanceScene: 0,
      stationDistanceManual: 100,
      containmentOn: false,
      containmentPower: 0,
      crewHunger: 18,
      crewDebuff: 0,
      crewStarving: false,
      foodAutomationEnabled: true,
      simulationLog: [],
      now: 1_710_000_000_000,
      random: () => 0.5,
    })

    expect(next.energy).toBeLessThan(120)
    expect(next.inventory.galaxyBar ?? 0).toBe(0)
    expect(next.crewHunger).toBeGreaterThan(70)
    expect(next.crewCriticalFailure).toBeNull()
  })

  it('consumes fridge bars before cargo bars during auto-feed', () => {
    const tickNow = Date.UTC(2024, 0, 1, 18, 30, 0)
    const dayIndex = Math.floor(tickNow / (24 * 60 * 60 * 1000))
    const crewMembers = createCrewMembers().map((member, index) =>
      index === 0
        ? {
            ...member,
            hunger: 20,
            dailyScheduleDayIndex: dayIndex,
            dailyBreakfastServed: true,
            dailyLunchServed: true,
            dailyDinnerServed: false,
          }
        : {
            ...member,
            dailyScheduleDayIndex: dayIndex,
            dailyBreakfastServed: true,
            dailyLunchServed: true,
            dailyDinnerServed: true,
            dailyWaterServedCount: 8,
          },
    )

    const next = runSimulationTick({
      inventory: { galaxyBar: 3 },
      market: createMarketState(),
      energy: 120,
      maxEnergy: 200,
      charging: false,
      docked: false,
      useSceneDistance: false,
      stationDistanceScene: 0,
      stationDistanceManual: 100,
      containmentOn: false,
      containmentPower: 0,
      crewHunger: 20,
      crewDebuff: 0,
      crewStarving: false,
      foodAutomationEnabled: true,
      crewMembers,
      fridge: {
        unlocked: true,
        galaxyBars: 2,
        capacity: 40,
      },
      simulationLog: [],
      now: tickNow,
      random: () => 0.5,
    })

    expect(next.fridge?.galaxyBars).toBe(1)
    expect(next.inventory.galaxyBar).toBe(3)
    expect(next.fedCrew).toBe(true)
    expect(next.crewCriticalFailure).toBeNull()
  })

  it('does not consume a galaxy bar when the scheduled meal would not restore hunger', () => {
    const tickNow = Date.UTC(2024, 0, 1, 18, 30, 0)
    const dayIndex = Math.floor(tickNow / (24 * 60 * 60 * 1000))
    const crewMembers = createCrewMembers().map((member, index) =>
      index === 0
        ? {
            ...member,
            hunger: 100,
            firstGalaxyBarBoostApplied: true,
            dailyScheduleDayIndex: dayIndex,
            dailyBreakfastServed: true,
            dailyLunchServed: true,
            dailyDinnerServed: false,
          }
        : {
            ...member,
            dailyScheduleDayIndex: dayIndex,
            dailyBreakfastServed: true,
            dailyLunchServed: true,
            dailyDinnerServed: true,
            dailyWaterServedCount: 8,
          },
    )

    const next = runSimulationTick({
      inventory: { galaxyBar: 3 },
      market: createMarketState(),
      energy: 120,
      maxEnergy: 200,
      charging: false,
      docked: false,
      useSceneDistance: false,
      stationDistanceScene: 0,
      stationDistanceManual: 100,
      containmentOn: false,
      containmentPower: 0,
      crewHunger: 100,
      crewDebuff: 0,
      crewStarving: false,
      foodAutomationEnabled: true,
      crewMembers,
      simulationLog: [],
      now: tickNow,
      random: () => 0.5,
    })

    expect(next.inventory.galaxyBar).toBe(3)
    expect(next.fedCrew).toBe(false)
    expect(next.crewCriticalFailure).toBeNull()
  })

  it('limits overdue hydration to one drink per tick instead of catching up in bursts', () => {
    const tickNow = Date.UTC(2024, 0, 1, 23, 59, 0)
    const dayIndex = Math.floor(tickNow / (24 * 60 * 60 * 1000))
    const crewMembers = createCrewMembers().map((member, index) =>
      index === 0
        ? {
            ...member,
            dailyScheduleDayIndex: dayIndex,
            dailyBreakfastServed: true,
            dailyLunchServed: true,
            dailyDinnerServed: true,
            dailyWaterServedCount: 0,
          }
        : {
            ...member,
            dailyScheduleDayIndex: dayIndex,
            dailyBreakfastServed: true,
            dailyLunchServed: true,
            dailyDinnerServed: true,
            dailyWaterServedCount: 8,
          },
    )

    const next = runSimulationTick({
      inventory: { water: 12 },
      market: createMarketState(),
      energy: 120,
      maxEnergy: 200,
      charging: false,
      docked: false,
      useSceneDistance: false,
      stationDistanceScene: 0,
      stationDistanceManual: 100,
      containmentOn: false,
      containmentPower: 0,
      crewHunger: 100,
      crewDebuff: 0,
      crewStarving: false,
      foodAutomationEnabled: false,
      crewMembers,
      waterAutomationEnabled: true,
      simulationLog: [],
      now: tickNow,
      random: () => 0.5,
    })

    expect(next.inventory.water).toBe(11.75)
    expect(next.crewMembers?.[0].dailyWaterServedCount).toBe(8)
    expect(next.crewCriticalFailure).toBeNull()
  })

  it('flags starvation critical failure when debuff reaches cap while starving', () => {
    const next = runSimulationTick({
      inventory: {},
      market: createMarketState(),
      energy: 120,
      maxEnergy: 200,
      charging: false,
      docked: false,
      useSceneDistance: false,
      stationDistanceScene: 0,
      stationDistanceManual: 100,
      containmentOn: false,
      containmentPower: 0,
      crewHunger: 4,
      crewDebuff: 54.6,
      crewStarving: true,
      foodAutomationEnabled: false,
      simulationLog: [],
      now: 1_710_000_000_000,
      random: () => 0.5,
    })

    expect(next.crewStarving).toBe(true)
    expect(next.crewDebuff).toBe(55)
    expect(next.crewCriticalFailure).toBe('starvation')
  })
})

describe('crew sleep rotation', () => {
  it('computes deterministic sleeping states from fixed shift windows', () => {
    const common = {
      inventory: {},
      market: createMarketState(),
      energy: 120,
      maxEnergy: 200,
      charging: false,
      docked: false,
      useSceneDistance: false,
      stationDistanceScene: 0,
      stationDistanceManual: 100,
      containmentOn: false,
      containmentPower: 0,
      crewHunger: 100,
      crewDebuff: 0,
      crewStarving: false,
      foodAutomationEnabled: false,
      simulationLog: [],
      random: () => 0.5,
    }

    const hour0 = runSimulationTick({
      ...common,
      crewMembers: createCrewMembers(),
      now: 0,
    })

    expect(hour0.crewMembers?.filter((member) => member.sleeping)).toHaveLength(2)
    expect(hour0.crewMetrics?.awakeCount).toBe(2)

    const hour9 = runSimulationTick({
      ...common,
      crewMembers: createCrewMembers(),
      now: 9 * 60 * 60 * 1000,
    })

    expect(hour9.crewMembers?.filter((member) => member.sleeping)).toHaveLength(1)
    expect(hour9.crewMetrics?.awakeCount).toBe(3)
  })
})

describe('extraction system invariants', () => {
  it('applies mining laser energy cost with debuff multiplier', () => {
    const expectedCost = miningLaserEnergyCost(40)
    const result = attemptMiningLaserFire({
      energy: 100,
      maxEnergy: 200,
      crewDebuff: 40,
      now: 1_710_000_000_000,
    })

    expect(result.succeeded).toBe(true)
    expect(result.energyCost).toBe(expectedCost)
    expect(result.energy).toBe(100 - expectedCost)
    expect(result.event.type).toBe('laserFired')
  })

  it('blocks mining laser shots when energy is insufficient', () => {
    const result = attemptMiningLaserFire({
      energy: 1,
      maxEnergy: 200,
      crewDebuff: 0,
      now: 1_710_000_000_000,
    })

    expect(result.succeeded).toBe(false)
    expect(result.energy).toBe(1)
    expect(result.event.type).toBe('laserBlocked')
    expect(result.logMessage).toContain('insufficient energy')
  })

  it('resolves extraction hits using target mixed-yield profiles', () => {
    const result = resolveExtractionHit({
      inventory: { rubble: 1, ironOre: 0.5 },
      target: {
        targetId: 'test-target-metal-1',
        classId: 'metalScrap',
        kind: 'spaceJunk',
        zoneId: 'denseDebrisLane',
        riskRating: 0.6,
        signatureElementSymbol: 'Fe',
        expectedYield: {
          rubble: 2.5,
          ironOre: 1.25,
          slagWaste: 0.5,
        },
      },
      now: 1_710_000_000_000,
    })

    expect(result.inventoryChanged).toBe(true)
    expect(result.inventory.rubble).toBe(3.5)
    expect(result.inventory.ironOre).toBe(1.75)
    expect(result.inventory.slagWaste).toBe(0.5)
    expect(result.event.type).toBe('targetExtracted')
    expect(result.event.targetClassId).toBe('metalScrap')
  })

  it('falls back to baseline rubble yield when target profile is empty', () => {
    const result = resolveExtractionHit({
      inventory: { rubble: 0 },
      target: {
        targetId: 'test-target-rock-1',
        classId: 'rockBody',
        kind: 'asteroid',
        zoneId: 'nearStationBelt',
        riskRating: 0.3,
        signatureElementSymbol: 'Si',
        expectedYield: {},
      },
      now: 1_710_000_000_000,
    })

    expect(result.inventory.rubble).toBe(MINING_ASTEROID_RUBBLE_YIELD)
  })
})
