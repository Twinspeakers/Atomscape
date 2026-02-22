import {
  CONTAINMENT_DRAIN_BASE,
  CONTAINMENT_DRAIN_POWER_FACTOR,
} from '@domain/spec/gameSpec'
import { clamp, roundQty } from '../math'
import type { SimulationTickMutableState } from '../types'

export function containmentDrainRate(power: number): number {
  return CONTAINMENT_DRAIN_BASE + (clamp(power, 0, 100) / 100) * CONTAINMENT_DRAIN_POWER_FACTOR
}

export function applyContainmentDrain(
  state: SimulationTickMutableState,
  pushLog: (message: string) => void,
): void {
  if (!state.containmentOn) {
    return
  }

  const drain = containmentDrainRate(state.containmentPower)
  if (state.energy >= drain) {
    state.energy = roundQty(state.energy - drain)
    return
  }

  state.containmentOn = false
  pushLog('Containment shut off: not enough energy to maintain magnetic field.')
}
