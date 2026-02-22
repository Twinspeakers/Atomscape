import {
  RECOMBINATION_BASE_RATE,
  RECOMBINATION_MAX_CONTAINMENT_EFFECT,
} from '@domain/spec/gameSpec'
import { clamp, roundQty } from '../math'
import type { SimulationTickMutableState } from '../types'

export function recombinationRate(containmentOn: boolean, containmentPower: number): number {
  if (!containmentOn) {
    return RECOMBINATION_BASE_RATE
  }

  const containmentEffect =
    RECOMBINATION_MAX_CONTAINMENT_EFFECT * (clamp(containmentPower, 0, 100) / 100)
  return RECOMBINATION_BASE_RATE * (1 - containmentEffect)
}

export function applyPlasmaRecombination(state: SimulationTickMutableState): boolean {
  const ionizedHydrogen = state.inventory.hydrogenIonized ?? 0
  if (ionizedHydrogen <= 0) {
    return false
  }

  const rate = recombinationRate(state.containmentOn, state.containmentPower)
  const recombined = roundQty(Math.min(ionizedHydrogen, ionizedHydrogen * rate))
  if (recombined <= 0) {
    return false
  }

  state.inventory.hydrogenIonized = roundQty(ionizedHydrogen - recombined)
  state.inventory.hydrogenNeutral = roundQty((state.inventory.hydrogenNeutral ?? 0) + recombined)
  return true
}
