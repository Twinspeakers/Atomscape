import type { ResourceId } from '@domain/resources/resourceCatalog'

export interface BatteryUpgradeCost {
  energyCell: number
  steelIngot: number
  carbon: number
}

export interface BatteryUpgradePlan {
  tier: number
  currentMaxEnergy: number
  nextMaxEnergy: number
  gain: number
  atCap: boolean
  cost: BatteryUpgradeCost
}

export const BATTERY_CAPACITY_BASE = 2000
export const BATTERY_CAPACITY_UPGRADE_STEP = 500
export const BATTERY_CAPACITY_UPGRADE_MAX = 10000

const BATTERY_UPGRADE_BASE_COST: BatteryUpgradeCost = {
  energyCell: 4,
  steelIngot: 8,
  carbon: 40,
}

const BATTERY_UPGRADE_TIER_LINEAR_COST_DELTA: BatteryUpgradeCost = {
  energyCell: 2,
  steelIngot: 4,
  carbon: 18,
}

const BATTERY_UPGRADE_TIER_QUADRATIC_COST_DELTA: BatteryUpgradeCost = {
  energyCell: 1,
  steelIngot: 2,
  carbon: 7,
}

export function batteryUpgradeCostEntries(
  cost: BatteryUpgradeCost,
): Array<[ResourceId, number]> {
  return [
    ['energyCell', cost.energyCell],
    ['steelIngot', cost.steelIngot],
    ['carbon', cost.carbon],
  ]
}

export function deriveBatteryUpgradePlan(maxEnergy: number): BatteryUpgradePlan {
  const finiteMaxEnergy = Number.isFinite(maxEnergy)
    ? maxEnergy
    : BATTERY_CAPACITY_BASE
  const currentMaxEnergy = Math.max(
    1,
    Math.min(BATTERY_CAPACITY_UPGRADE_MAX, finiteMaxEnergy),
  )
  const normalizedTier = Math.max(
    0,
    Math.floor((currentMaxEnergy - BATTERY_CAPACITY_BASE) / BATTERY_CAPACITY_UPGRADE_STEP),
  )
  const atCap = currentMaxEnergy >= BATTERY_CAPACITY_UPGRADE_MAX - 0.0001
  const nextMaxEnergy = atCap
    ? BATTERY_CAPACITY_UPGRADE_MAX
    : Math.min(
      BATTERY_CAPACITY_UPGRADE_MAX,
      currentMaxEnergy + BATTERY_CAPACITY_UPGRADE_STEP,
    )

  return {
    tier: normalizedTier,
    currentMaxEnergy,
    nextMaxEnergy,
    gain: Math.max(0, nextMaxEnergy - currentMaxEnergy),
    atCap,
    cost: {
      energyCell: BATTERY_UPGRADE_BASE_COST.energyCell
        + normalizedTier * BATTERY_UPGRADE_TIER_LINEAR_COST_DELTA.energyCell
        + (normalizedTier ** 2) * BATTERY_UPGRADE_TIER_QUADRATIC_COST_DELTA.energyCell,
      steelIngot: BATTERY_UPGRADE_BASE_COST.steelIngot
        + normalizedTier * BATTERY_UPGRADE_TIER_LINEAR_COST_DELTA.steelIngot
        + (normalizedTier ** 2) * BATTERY_UPGRADE_TIER_QUADRATIC_COST_DELTA.steelIngot,
      carbon: BATTERY_UPGRADE_BASE_COST.carbon
        + normalizedTier * BATTERY_UPGRADE_TIER_LINEAR_COST_DELTA.carbon
        + (normalizedTier ** 2) * BATTERY_UPGRADE_TIER_QUADRATIC_COST_DELTA.carbon,
    },
  }
}
