import { PROCESS_CATALOG } from '@domain/spec/processCatalog'
import {
  CREW_DEHYDRATED_THRESHOLD,
  CREW_DEBUFF_GAIN_PER_SECOND,
  CREW_DEBUFF_MAX,
  CREW_DEBUFF_RECOVERY_PER_SECOND,
  CREW_FEED_THRESHOLD,
  CREW_GALAXY_BAR_HUNGER_RESTORE,
  CREW_HUNGER_DECAY_PER_SECOND,
  CREW_MEMBER_DEBUFF_GAIN_DEHYDRATED_PER_SECOND,
  CREW_MEMBER_DEBUFF_GAIN_STARVING_PER_SECOND,
  CREW_MEMBER_DEBUFF_RECOVERY_PER_SECOND,
  CREW_MEMBER_GALAXY_BAR_HUNGER_RESTORE,
  CREW_MEMBER_HUNGER_DECAY_PER_SECOND,
  CREW_MEMBER_MEALS_PER_DAY,
  CREW_MEMBER_THIRST_DECAY_PER_SECOND,
  CREW_MEMBER_WATER_DRINK_COST_L,
  CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER,
  CREW_MEMBER_WATER_HYDRATION_RESTORE,
  CREW_MEMBER_WATER_LITERS_PER_DAY_BASE,
  CREW_SLEEP_CYCLE_HOURS,
  CREW_SLEEP_WINDOW_HOURS,
  CREW_STARVING_THRESHOLD,
} from '@domain/spec/gameSpec'
import type { CrewAggregateMetrics, CrewMemberState, FailureReason } from '@state/types'
import { clamp, roundQty } from '../math'
import { executeProcess } from './process'
import type { SimulationTickMutableState } from '../types'

export interface CrewTickResult {
  inventoryChanged: boolean
  fedCrew: boolean
  autoCraftedFood: boolean
  autoCraftedGalaxyBars: number
  criticalFailure: FailureReason | null
  crewMembers?: CrewMemberState[]
  crewMetrics?: CrewAggregateMetrics
}

const SECONDS_PER_HOUR = 60 * 60
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR
const BREAKFAST_OFFSET_HOURS = 1
const LUNCH_OFFSET_HOURS = 6
const DINNER_BEFORE_SLEEP_HOURS = 6

function toCycleHour(cycleTimeSeconds: number): number {
  const cycleSeconds = CREW_SLEEP_CYCLE_HOURS * SECONDS_PER_HOUR
  const wrappedSeconds = ((cycleTimeSeconds % cycleSeconds) + cycleSeconds) % cycleSeconds
  return wrappedSeconds / SECONDS_PER_HOUR
}

function toUtcDayIndex(cycleTimeSeconds: number): number {
  return Math.floor(Math.max(0, cycleTimeSeconds) / SECONDS_PER_DAY)
}

function toSecondOfUtcDay(cycleTimeSeconds: number): number {
  const wrappedSeconds = ((cycleTimeSeconds % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY
  return Math.floor(wrappedSeconds)
}

function isWithinSleepWindow(cycleHour: number, shiftStartHour: number): boolean {
  const start = ((shiftStartHour % CREW_SLEEP_CYCLE_HOURS) + CREW_SLEEP_CYCLE_HOURS) % CREW_SLEEP_CYCLE_HOURS
  const end = (start + CREW_SLEEP_WINDOW_HOURS) % CREW_SLEEP_CYCLE_HOURS

  if (CREW_SLEEP_WINDOW_HOURS >= CREW_SLEEP_CYCLE_HOURS) {
    return true
  }

  if (start < end) {
    return cycleHour >= start && cycleHour < end
  }

  return cycleHour >= start || cycleHour < end
}

function summarizeCrewMembers(members: CrewMemberState[]): CrewAggregateMetrics {
  if (members.length === 0) {
    return {
      awakeCount: 0,
      averageHunger: 0,
      averageThirst: 0,
      averageDebuff: 0,
      starvingCount: 0,
      dehydratedCount: 0,
    }
  }

  const totals = members.reduce(
    (acc, member) => ({
      hunger: acc.hunger + clamp(member.hunger, 0, 100),
      thirst: acc.thirst + clamp(member.thirst, 0, 100),
      debuff: acc.debuff + clamp(member.debuff, 0, 100),
      awakeCount: acc.awakeCount + (member.sleeping ? 0 : 1),
      starvingCount: acc.starvingCount + (member.starving ? 1 : 0),
      dehydratedCount: acc.dehydratedCount + (member.dehydrated ? 1 : 0),
    }),
    {
      hunger: 0,
      thirst: 0,
      debuff: 0,
      awakeCount: 0,
      starvingCount: 0,
      dehydratedCount: 0,
    },
  )

  return {
    awakeCount: totals.awakeCount,
    averageHunger: totals.hunger / members.length,
    averageThirst: totals.thirst / members.length,
    averageDebuff: totals.debuff / members.length,
    starvingCount: totals.starvingCount,
    dehydratedCount: totals.dehydratedCount,
  }
}

function applySleepRotation(state: SimulationTickMutableState): CrewAggregateMetrics | undefined {
  if (!state.crewMembers || state.crewMembers.length === 0) {
    return undefined
  }

  const cycleTimeSeconds = Number.isFinite(state.cycleTimeSeconds ?? NaN) ? (state.cycleTimeSeconds as number) : 0
  const cycleHour = toCycleHour(cycleTimeSeconds)
  state.crewMembers = state.crewMembers.map((member) => ({
    ...member,
    sleeping: isWithinSleepWindow(cycleHour, member.sleepShiftStartHour),
  }))

  return summarizeCrewMembers(state.crewMembers)
}

type GalaxyBarSource = 'fridge' | 'cargo'

function consumeGalaxyBar(state: SimulationTickMutableState): GalaxyBarSource | null {
  if (state.fridge?.unlocked && state.fridge.galaxyBars > 0) {
    state.fridge.galaxyBars = roundQty(
      clamp(state.fridge.galaxyBars - 1, 0, Math.max(1, state.fridge.capacity)),
    )
    return 'fridge'
  }

  const available = state.inventory.galaxyBar ?? 0
  if (available <= 0) {
    return null
  }

  state.inventory.galaxyBar = roundQty(available - 1)
  return 'cargo'
}

function consumeWaterDrink(state: SimulationTickMutableState): boolean {
  if (state.fridge?.unlocked) {
    const waterCapacityLiters = Math.max(1, state.fridge.waterCapacityLiters ?? 0)
    const availableFridgeWater = clamp(
      roundQty(state.fridge.waterLiters ?? 0),
      0,
      waterCapacityLiters,
    )
    if (availableFridgeWater >= CREW_MEMBER_WATER_DRINK_COST_L) {
      state.fridge.waterLiters = roundQty(
        Math.max(0, availableFridgeWater - CREW_MEMBER_WATER_DRINK_COST_L),
      )
      return true
    }
  }

  const available = state.inventory.water ?? 0
  if (available < CREW_MEMBER_WATER_DRINK_COST_L) {
    return false
  }

  state.inventory.water = roundQty(Math.max(0, available - CREW_MEMBER_WATER_DRINK_COST_L))
  return true
}

function attemptAutoCraftGalaxyBar(
  state: SimulationTickMutableState,
  pushLog: (message: string) => void,
  options: {
    logSuccess: boolean
  } = {
    logSuccess: true,
  },
): { crafted: boolean; inventoryChanged: boolean } {
  const crafted = executeProcess(
    {
      inventory: state.inventory,
      energy: state.energy,
      maxEnergy: state.maxEnergy,
    },
    PROCESS_CATALOG.galaxyBarAssembler,
  )

  if (!crafted.succeeded) {
    return { crafted: false, inventoryChanged: false }
  }

  state.inventory = crafted.inventory
  state.energy = crafted.energy
  if (options.logSuccess && crafted.logMessage) {
    pushLog(`Auto-crafting: ${crafted.logMessage}`)
  }

  return {
    crafted: true,
    inventoryChanged: crafted.inventoryChanged,
  }
}

function applyLegacyCrewSurvivalTick(
  state: SimulationTickMutableState,
  pushLog: (message: string) => void,
): CrewTickResult {
  let inventoryChanged = false
  let fedCrew = false
  let autoCraftedFood = false
  let autoCraftedGalaxyBars = 0

  if (state.galaxyBarAutomationEnabled) {
    const automationCraftResult = attemptAutoCraftGalaxyBar(state, pushLog, { logSuccess: false })
    if (automationCraftResult.crafted) {
      autoCraftedGalaxyBars += 1
    }
    inventoryChanged = inventoryChanged || automationCraftResult.inventoryChanged
  }

  if (state.foodAutomationEnabled && state.crewHunger <= CREW_FEED_THRESHOLD) {
    if (consumeGalaxyBar(state)) {
      fedCrew = true
      inventoryChanged = true
      state.crewHunger = clamp(
        state.crewHunger + CREW_GALAXY_BAR_HUNGER_RESTORE,
        0,
        100,
      )
      pushLog('Crew auto-fed: consumed 1 Galaxy Bar ration.')
    }
  }

  state.crewHunger = clamp(state.crewHunger - CREW_HUNGER_DECAY_PER_SECOND, 0, 100)

  const wasStarving = state.crewStarving
  state.crewStarving = state.crewHunger <= CREW_STARVING_THRESHOLD

  if (state.crewStarving) {
    state.crewDebuff = clamp(
      state.crewDebuff + CREW_DEBUFF_GAIN_PER_SECOND,
      0,
      CREW_DEBUFF_MAX,
    )
  } else {
    state.crewDebuff = clamp(
      state.crewDebuff - CREW_DEBUFF_RECOVERY_PER_SECOND,
      0,
      CREW_DEBUFF_MAX,
    )
  }

  if (state.crewStarving && !wasStarving) {
    pushLog('Crew is starving: operational debuffs now active until fed.')
  } else if (!state.crewStarving && wasStarving) {
    pushLog('Crew stabilized: starvation debuffs are recovering.')
  }

  const criticalFailure =
    state.crewStarving && state.crewDebuff >= CREW_DEBUFF_MAX ? 'starvation' : null

  return {
    inventoryChanged,
    fedCrew,
    autoCraftedFood,
    autoCraftedGalaxyBars,
    criticalFailure,
    crewMembers: state.crewMembers,
    crewMetrics: undefined,
  }
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seedToUnit(seed: number): number {
  let value = seed >>> 0
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  return (value >>> 0) / 4294967295
}

function toMealSecond(hour: number): number {
  const normalizedHour = ((hour % 24) + 24) % 24
  return Math.floor(normalizedHour * SECONDS_PER_HOUR)
}

function mealScheduleSeconds(member: CrewMemberState): {
  breakfast: number
  lunch: number
  dinner: number
} {
  const wakeHour = (member.sleepShiftStartHour + CREW_SLEEP_WINDOW_HOURS) % 24
  const breakfastHour = wakeHour + BREAKFAST_OFFSET_HOURS
  const lunchHour = wakeHour + LUNCH_OFFSET_HOURS
  const dinnerHour = member.sleepShiftStartHour - DINNER_BEFORE_SLEEP_HOURS

  return {
    breakfast: toMealSecond(breakfastHour),
    lunch: toMealSecond(lunchHour),
    dinner: toMealSecond(dinnerHour),
  }
}

function dailyWaterEventCount(): number {
  const litersPerCrewPerDay =
    CREW_MEMBER_WATER_LITERS_PER_DAY_BASE * CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER
  const events = litersPerCrewPerDay / CREW_MEMBER_WATER_DRINK_COST_L
  return Math.max(1, Math.round(events))
}

function generateDailyWaterScheduleSeconds(
  memberId: string,
  dayIndex: number,
  eventCount: number,
): number[] {
  const slots: number[] = []
  const spacing = SECONDS_PER_DAY / eventCount
  const jitterWindow = spacing * 0.72
  const baseSeed = hashString(`${memberId}:${dayIndex}`)

  for (let index = 0; index < eventCount; index += 1) {
    const seed = baseSeed ^ Math.imul(index + 1, 374761393)
    const jitterUnit = seedToUnit(seed)
    const base = spacing * (index + 0.5)
    const jitter = (jitterUnit - 0.5) * jitterWindow
    const slot = Math.floor(clamp(base + jitter, 0, SECONDS_PER_DAY - 1))
    slots.push(slot)
  }

  slots.sort((a, b) => a - b)
  for (let index = 1; index < slots.length; index += 1) {
    if (slots[index] <= slots[index - 1]) {
      slots[index] = Math.min(SECONDS_PER_DAY - 1, slots[index - 1] + 1)
    }
  }

  return slots
}

function resetMemberDailySchedule(member: CrewMemberState, dayIndex: number): CrewMemberState {
  return {
    ...member,
    dailyScheduleDayIndex: dayIndex,
    dailyBreakfastServed: false,
    dailyLunchServed: false,
    dailyDinnerServed: false,
    dailyWaterServedCount: 0,
  }
}

function feedMemberScheduledMeal(
  state: SimulationTickMutableState,
  member: CrewMemberState,
  mealLabel: 'breakfast' | 'lunch' | 'dinner',
  pushLog: (message: string) => void,
): {
  member: CrewMemberState
  fed: boolean
  inventoryChanged: boolean
  autoCraftedFood: boolean
} {
  if (!state.foodAutomationEnabled) {
    return {
      member,
      fed: false,
      inventoryChanged: false,
      autoCraftedFood: false,
    }
  }

  let inventoryChanged = false
  const autoCraftedFood = false

  const firstBoostApplies = !member.firstGalaxyBarBoostApplied
  const hungerAfter = firstBoostApplies
    ? 100
    : clamp(member.hunger + CREW_MEMBER_GALAXY_BAR_HUNGER_RESTORE, 0, 100)
  const hungerGain = hungerAfter - member.hunger

  if (hungerGain <= 0.05) {
    return {
      member,
      fed: false,
      inventoryChanged,
      autoCraftedFood,
    }
  }

  const foodSource = consumeGalaxyBar(state)
  if (!foodSource) {
    return {
      member,
      fed: false,
      inventoryChanged,
      autoCraftedFood,
    }
  }

  const nextMember = {
    ...member,
    hunger: hungerAfter,
    firstGalaxyBarBoostApplied: true,
  }

  if (foodSource === 'cargo') {
    inventoryChanged = true
  }

  pushLog(
    `${nextMember.name} is having ${mealLabel} (${foodSource}; +${hungerGain.toFixed(1)} hunger${firstBoostApplies ? ', first bar -> 100%' : ''}).`,
  )

  return {
    member: nextMember,
    fed: true,
    inventoryChanged,
    autoCraftedFood,
  }
}

function hydrateMemberScheduledDrink(
  state: SimulationTickMutableState,
  member: CrewMemberState,
  pushLog: (message: string) => void,
): {
  member: CrewMemberState
  drank: boolean
  inventoryChanged: boolean
} {
  if (!state.waterAutomationEnabled) {
    return {
      member,
      drank: false,
      inventoryChanged: false,
    }
  }

  if (!consumeWaterDrink(state)) {
    return {
      member,
      drank: false,
      inventoryChanged: false,
    }
  }

  const thirstAfter = clamp(
    member.thirst + CREW_MEMBER_WATER_HYDRATION_RESTORE,
    0,
    100,
  )
  const thirstGain = thirstAfter - member.thirst
  const nextMember = {
    ...member,
    thirst: thirstAfter,
  }

  pushLog(
    `${nextMember.name} drinks ${CREW_MEMBER_WATER_DRINK_COST_L.toFixed(2)} L water (+${thirstGain.toFixed(1)} thirst).`,
  )

  return {
    member: nextMember,
    drank: true,
    inventoryChanged: true,
  }
}

function applyPerMemberCrewSurvivalTick(
  state: SimulationTickMutableState,
  pushLog: (message: string) => void,
): CrewTickResult {
  const previousMetrics = summarizeCrewMembers(state.crewMembers ?? [])
  let inventoryChanged = false
  let fedCrew = false
  let autoCraftedFood = false
  let autoCraftedGalaxyBars = 0

  if (state.galaxyBarAutomationEnabled) {
    const automationCraftResult = attemptAutoCraftGalaxyBar(state, pushLog, { logSuccess: false })
    if (automationCraftResult.crafted) {
      autoCraftedGalaxyBars += 1
    }
    inventoryChanged = inventoryChanged || automationCraftResult.inventoryChanged
  }

  applySleepRotation(state)

  const cycleTimeSeconds = Number.isFinite(state.cycleTimeSeconds ?? NaN)
    ? (state.cycleTimeSeconds as number)
    : 0
  const dayIndex = toUtcDayIndex(cycleTimeSeconds)
  const secondOfDay = toSecondOfUtcDay(cycleTimeSeconds)
  const waterEventCount = dailyWaterEventCount()

  const members = (state.crewMembers ?? []).map((member) => {
    const next = {
      ...member,
      hunger: clamp(member.hunger - CREW_MEMBER_HUNGER_DECAY_PER_SECOND, 0, 100),
      thirst: clamp(member.thirst - CREW_MEMBER_THIRST_DECAY_PER_SECOND, 0, 100),
    }

    return next.dailyScheduleDayIndex === dayIndex
      ? next
      : resetMemberDailySchedule(next, dayIndex)
  })

  for (let index = 0; index < members.length; index += 1) {
    let member = members[index]
    const mealSeconds = mealScheduleSeconds(member)
    const mealChecklist: Array<{
      label: 'breakfast' | 'lunch' | 'dinner'
      second: number
      served: boolean
      markServed: (updated: CrewMemberState) => CrewMemberState
    }> = [
      {
        label: 'breakfast',
        second: mealSeconds.breakfast,
        served: member.dailyBreakfastServed,
        markServed: (updated) => ({ ...updated, dailyBreakfastServed: true }),
      },
      {
        label: 'lunch',
        second: mealSeconds.lunch,
        served: member.dailyLunchServed,
        markServed: (updated) => ({ ...updated, dailyLunchServed: true }),
      },
      {
        label: 'dinner',
        second: mealSeconds.dinner,
        served: member.dailyDinnerServed,
        markServed: (updated) => ({ ...updated, dailyDinnerServed: true }),
      },
    ]

    const dueMeals = mealChecklist.filter((meal) => !meal.served && secondOfDay >= meal.second)
    if (dueMeals.length > 0) {
      if (dueMeals.length > 1) {
        dueMeals.slice(0, -1).forEach((meal) => {
          member = meal.markServed(member)
        })
      }

      const activeMeal = dueMeals[dueMeals.length - 1]
      const mealResult = feedMemberScheduledMeal(state, member, activeMeal.label, pushLog)
      member = activeMeal.markServed(mealResult.member)
      fedCrew = fedCrew || mealResult.fed
      inventoryChanged = inventoryChanged || mealResult.inventoryChanged
    }

    const waterSchedule = generateDailyWaterScheduleSeconds(member.id, dayIndex, waterEventCount)
    let waterCount = Math.max(0, Math.min(waterEventCount, Math.floor(member.dailyWaterServedCount)))
    const dueWaterCount = waterSchedule.reduce(
      (count, slot) => (slot <= secondOfDay ? count + 1 : count),
      0,
    )

    if (dueWaterCount > waterCount + 1) {
      waterCount = dueWaterCount - 1
    }

    if (waterCount < waterEventCount && secondOfDay >= waterSchedule[waterCount]) {
      const waterResult = hydrateMemberScheduledDrink(state, member, pushLog)
      const nextWaterCount = waterCount + 1
      member = {
        ...waterResult.member,
        dailyWaterServedCount: nextWaterCount,
      }
      waterCount = nextWaterCount
      inventoryChanged = inventoryChanged || waterResult.inventoryChanged
    } else if (waterCount !== member.dailyWaterServedCount) {
      member = {
        ...member,
        dailyWaterServedCount: waterCount,
      }
    }

    const starving = member.hunger <= CREW_STARVING_THRESHOLD
    const dehydrated = member.thirst <= CREW_DEHYDRATED_THRESHOLD
    let nextDebuff = member.debuff

    if (starving) {
      nextDebuff += CREW_MEMBER_DEBUFF_GAIN_STARVING_PER_SECOND
    }

    if (dehydrated) {
      nextDebuff += CREW_MEMBER_DEBUFF_GAIN_DEHYDRATED_PER_SECOND
    }

    if (!starving && !dehydrated) {
      nextDebuff -= CREW_MEMBER_DEBUFF_RECOVERY_PER_SECOND
    }

    members[index] = {
      ...member,
      starving,
      dehydrated,
      debuff: clamp(nextDebuff, 0, CREW_DEBUFF_MAX),
    }
  }

  state.crewMembers = members
  const crewMetrics = summarizeCrewMembers(members)
  state.crewHunger = crewMetrics.averageHunger
  state.crewDebuff = crewMetrics.averageDebuff
  state.crewStarving = crewMetrics.starvingCount > 0

  if (crewMetrics.starvingCount > 0 && previousMetrics.starvingCount === 0) {
    pushLog('Crew is starving: operational debuffs now active until fed.')
  } else if (crewMetrics.starvingCount === 0 && previousMetrics.starvingCount > 0) {
    pushLog('Crew stabilized: starvation debuffs are recovering.')
  }

  if (crewMetrics.dehydratedCount > 0 && previousMetrics.dehydratedCount === 0) {
    pushLog('Crew dehydration warning: hydrate crew to prevent escalating debuffs.')
  } else if (crewMetrics.dehydratedCount === 0 && previousMetrics.dehydratedCount > 0) {
    pushLog('Crew hydration stabilized: dehydration debuffs are recovering.')
  }

  const allCrewInCriticalState =
    members.length > 0 &&
    members.every((member) => member.starving || member.dehydrated)
  const criticalFailure =
    allCrewInCriticalState && crewMetrics.averageDebuff >= CREW_DEBUFF_MAX
      ? 'starvation'
      : null

  return {
    inventoryChanged,
    fedCrew,
    autoCraftedFood,
    autoCraftedGalaxyBars,
    criticalFailure,
    crewMembers: members,
    crewMetrics,
  }
}

export function applyCrewSurvivalTick(
  state: SimulationTickMutableState,
  pushLog: (message: string) => void,
): CrewTickResult {
  if (state.crewMembers && state.crewMembers.length > 0) {
    return applyPerMemberCrewSurvivalTick(state, pushLog)
  }

  return applyLegacyCrewSurvivalTick(state, pushLog)
}

export const CREW_SCHEDULE_FORECAST = {
  mealsPerDayPerCrew: CREW_MEMBER_MEALS_PER_DAY,
  waterLitersPerDayPerCrew: CREW_MEMBER_WATER_LITERS_PER_DAY_BASE * CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER,
}
