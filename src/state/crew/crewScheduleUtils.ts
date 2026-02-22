import {
  CREW_MEMBER_WATER_DRINK_COST_L,
  CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER,
  CREW_MEMBER_WATER_LITERS_PER_DAY_BASE,
} from '@domain/spec/gameSpec'
import { clamp } from '@state/utils/numberUtils'

const SECONDS_PER_HOUR = 60 * 60
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR
const BREAKFAST_OFFSET_HOURS = 1
const LUNCH_OFFSET_HOURS = 6
const DINNER_BEFORE_SLEEP_HOURS = 6
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

function currentUtcDayIndex(nowMs = Date.now()): number {
  return Math.floor(Math.max(0, nowMs) / MILLISECONDS_PER_DAY)
}

function currentSecondOfUtcDay(nowMs = Date.now()): number {
  const nowSeconds = Math.floor(Math.max(0, nowMs) / 1000)
  return nowSeconds % SECONDS_PER_DAY
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

function mealSecondsForShift(shiftStartHour: number): {
  breakfast: number
  lunch: number
  dinner: number
} {
  const wakeHour = (shiftStartHour + 8) % 24
  return {
    breakfast: toMealSecond(wakeHour + BREAKFAST_OFFSET_HOURS),
    lunch: toMealSecond(wakeHour + LUNCH_OFFSET_HOURS),
    dinner: toMealSecond(shiftStartHour - DINNER_BEFORE_SLEEP_HOURS),
  }
}

function dailyWaterEventCount(): number {
  const litersPerCrewPerDay =
    CREW_MEMBER_WATER_LITERS_PER_DAY_BASE * CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER
  return Math.max(1, Math.round(litersPerCrewPerDay / CREW_MEMBER_WATER_DRINK_COST_L))
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
    slots.push(Math.floor(clamp(base + jitter, 0, SECONDS_PER_DAY - 1)))
  }

  slots.sort((a, b) => a - b)
  for (let index = 1; index < slots.length; index += 1) {
    if (slots[index] <= slots[index - 1]) {
      slots[index] = Math.min(SECONDS_PER_DAY - 1, slots[index - 1] + 1)
    }
  }

  return slots
}

export function initialDailyCrewSchedule(
  memberId: string,
  shiftStartHour: number,
  nowMs = Date.now(),
): {
  dayIndex: number
  breakfastServed: boolean
  lunchServed: boolean
  dinnerServed: boolean
  waterServedCount: number
} {
  const dayIndex = currentUtcDayIndex(nowMs)
  const secondOfDay = currentSecondOfUtcDay(nowMs)
  const mealSeconds = mealSecondsForShift(shiftStartHour)
  const waterSchedule = generateDailyWaterScheduleSeconds(memberId, dayIndex, dailyWaterEventCount())
  const waterServedCount = waterSchedule.filter((slot) => slot <= secondOfDay).length

  return {
    dayIndex,
    breakfastServed: secondOfDay >= mealSeconds.breakfast,
    lunchServed: secondOfDay >= mealSeconds.lunch,
    dinnerServed: secondOfDay >= mealSeconds.dinner,
    waterServedCount,
  }
}
