import { formatQty, resourceById, type ResourceId } from '@domain/resources/resourceCatalog'
import type { QuestRewardDefinition } from '@features/quests/questDefinitions'
import { sanitizeStringList } from '@state/runtime/snapshotSanitizers'
import { clamp, roundQty } from '@state/utils/numberUtils'
import type { FridgeState, QuestRewardNotification, ResourceInventory } from '@state/types'

export interface QuestRewardGrantResult {
  inventory: ResourceInventory
  inventoryChanged: boolean
  fridge: FridgeState
  fridgeChanged: boolean
  grantedLines: string[]
}

export function applyQuestRewardGrants(
  inventory: ResourceInventory,
  fridge: FridgeState,
  rewards: QuestRewardDefinition[],
): QuestRewardGrantResult {
  let inventoryChanged = false
  let fridgeChanged = false
  const nextInventory = { ...inventory }
  const nextFridge = { ...fridge }
  const grantedLines: string[] = []

  rewards.forEach((reward) => {
    const itemGrants = reward.grants?.items
    if (itemGrants) {
      ;(Object.entries(itemGrants) as Array<[ResourceId, number]>).forEach(([resourceId, amount]) => {
        if (!Number.isFinite(amount) || amount <= 0) {
          return
        }

        nextInventory[resourceId] = roundQty((nextInventory[resourceId] ?? 0) + amount)
        inventoryChanged = true
        grantedLines.push(`${formatQty(amount)} ${resourceById[resourceId].label}`)
      })
    }

    const unlocks = reward.grants?.unlocks ?? []
    if (unlocks.includes('Fridge') && !nextFridge.unlocked) {
      nextFridge.unlocked = true
      fridgeChanged = true
    }

    const fridgeBarGrant = reward.grants?.fridge?.galaxyBars ?? 0
    if (Number.isFinite(fridgeBarGrant) && fridgeBarGrant > 0 && nextFridge.unlocked) {
      const capacity = Math.max(1, nextFridge.capacity)
      const barsBefore = clamp(nextFridge.galaxyBars, 0, capacity)
      const barsAfter = clamp(roundQty(barsBefore + fridgeBarGrant), 0, capacity)
      const barsGranted = roundQty(barsAfter - barsBefore)

      if (barsGranted > 0) {
        nextFridge.galaxyBars = barsAfter
        fridgeChanged = true
        grantedLines.push(`${formatQty(barsGranted)} Galaxy Bars (Fridge)`)
      }
    }
  })

  return {
    inventory: inventoryChanged ? nextInventory : inventory,
    inventoryChanged,
    fridge: fridgeChanged ? nextFridge : fridge,
    fridgeChanged,
    grantedLines,
  }
}

export function buildQuestRewardNotification(
  questId: string,
  questTitle: string,
  rewards: QuestRewardDefinition[],
  grants: string[],
  unlocks: string[],
): QuestRewardNotification {
  const timestamp = Date.now()

  return {
    id: timestamp + Math.floor(Math.random() * 1000),
    questId,
    questTitle,
    rewards: rewards.map((reward) => ({
      id: reward.id,
      label: reward.label,
      description: reward.description,
    })),
    grants: sanitizeStringList(grants),
    unlocks: sanitizeStringList(unlocks),
    timestamp,
  }
}
