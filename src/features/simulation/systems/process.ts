import type { ResourceId } from '@domain/resources/resourceCatalog'
import { resourceIds } from '@domain/resources/resourceCatalog'
import type { ResourceInventory } from '@state/types'
import type { ProcessRunOptions, ResourceAmounts } from '@domain/spec/processCatalog'
import { clamp, roundQty } from '../math'

function isResourceId(value: string): value is ResourceId {
  return (resourceIds as string[]).includes(value)
}

function hasResources(inventory: ResourceInventory, consume: ResourceAmounts): boolean {
  return Object.entries(consume).every(([resourceId, amount]) => {
    if (!amount || !isResourceId(resourceId)) {
      return true
    }

    return (inventory[resourceId] ?? 0) >= amount
  })
}

function applyInventoryDelta(
  base: ResourceInventory,
  consume: ResourceAmounts,
  produce: ResourceAmounts,
): ResourceInventory {
  const inventory = { ...base }

  Object.entries(consume).forEach(([resourceId, amount]) => {
    if (!amount || !isResourceId(resourceId)) {
      return
    }

    const current = inventory[resourceId] ?? 0
    inventory[resourceId] = roundQty(current - amount)
  })

  Object.entries(produce).forEach(([resourceId, amount]) => {
    if (!amount || !isResourceId(resourceId)) {
      return
    }

    const current = inventory[resourceId] ?? 0
    inventory[resourceId] = roundQty(current + amount)
  })

  return inventory
}

function hasInventoryDelta(consume: ResourceAmounts, produce: ResourceAmounts): boolean {
  const consumeDelta = Object.values(consume).some((value) => Boolean(value && value > 0))
  const produceDelta = Object.values(produce).some((value) => Boolean(value && value > 0))
  return consumeDelta || produceDelta
}

export interface ExecuteProcessInput {
  inventory: ResourceInventory
  energy: number
  maxEnergy: number
}

export interface ExecuteProcessResult {
  succeeded: boolean
  inventory: ResourceInventory
  energy: number
  inventoryChanged: boolean
  logMessage: string | null
}

export function executeProcess(
  input: ExecuteProcessInput,
  options: ProcessRunOptions,
): ExecuteProcessResult {
  const energyCost = options.energyCost ?? 0
  const energyGain = options.energyGain ?? 0
  const consume = options.consume ?? {}
  const produce = options.produce ?? {}

  if (energyCost > 0 && input.energy < energyCost) {
    return {
      succeeded: false,
      inventory: input.inventory,
      energy: input.energy,
      inventoryChanged: false,
      logMessage: options.failMessage ?? `${options.name} failed: not enough energy.`,
    }
  }

  if (!hasResources(input.inventory, consume)) {
    return {
      succeeded: false,
      inventory: input.inventory,
      energy: input.energy,
      inventoryChanged: false,
      logMessage: options.failMessage ?? `${options.name} failed: missing required materials.`,
    }
  }

  const inventory = applyInventoryDelta(input.inventory, consume, produce)
  const energy = clamp(input.energy - energyCost + energyGain, 0, input.maxEnergy)

  return {
    succeeded: true,
    inventory,
    energy,
    inventoryChanged: hasInventoryDelta(consume, produce),
    logMessage: options.silentSuccess
      ? null
      : options.successMessage ?? `${options.name} completed.`,
  }
}
