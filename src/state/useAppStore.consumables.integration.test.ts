import { ENERGY_CELL_DISCHARGE_ENERGY } from '@domain/spec/gameSpec'
import { describe, expect, it } from 'vitest'
import { useAppStore } from '@state/store'

describe('energy cell discharge', () => {
  it('consumes one energy cell and restores ship energy', () => {
    const initialState = useAppStore.getState()
    const originalSnapshot = {
      inventory: { ...initialState.inventory },
      energy: initialState.energy,
      maxEnergy: initialState.maxEnergy,
      simulationLog: [...initialState.simulationLog],
    }

    try {
      useAppStore.setState({
        inventory: {
          ...initialState.inventory,
          energyCell: 3,
        },
        energy: 40,
        maxEnergy: 400,
        simulationLog: [],
      })

      const used = useAppStore.getState().useEnergyCell()
      const after = useAppStore.getState()

      expect(used).toBe(true)
      expect(after.energy).toBeCloseTo(40 + ENERGY_CELL_DISCHARGE_ENERGY)
      expect(after.inventory.energyCell).toBe(2)
      expect(
        after.simulationLog.some((entry) => entry.message.includes('Energy cell discharged')),
      ).toBe(true)
    } finally {
      useAppStore.setState({
        inventory: originalSnapshot.inventory,
        energy: originalSnapshot.energy,
        maxEnergy: originalSnapshot.maxEnergy,
        simulationLog: originalSnapshot.simulationLog,
      })
    }
  })

  it('does not consume a cell when ship energy is full', () => {
    const initialState = useAppStore.getState()
    const originalSnapshot = {
      inventory: { ...initialState.inventory },
      energy: initialState.energy,
      maxEnergy: initialState.maxEnergy,
      simulationLog: [...initialState.simulationLog],
    }

    try {
      useAppStore.setState({
        inventory: {
          ...initialState.inventory,
          energyCell: 2,
        },
        energy: 250,
        maxEnergy: 250,
        simulationLog: [],
      })

      const used = useAppStore.getState().useEnergyCell()
      const after = useAppStore.getState()

      expect(used).toBe(false)
      expect(after.energy).toBe(250)
      expect(after.inventory.energyCell).toBe(2)
      expect(after.simulationLog).toHaveLength(0)
    } finally {
      useAppStore.setState({
        inventory: originalSnapshot.inventory,
        energy: originalSnapshot.energy,
        maxEnergy: originalSnapshot.maxEnergy,
        simulationLog: originalSnapshot.simulationLog,
      })
    }
  })

  it('routes consumable slot 1 to energy cell discharge', () => {
    const initialState = useAppStore.getState()
    const originalSnapshot = {
      inventory: { ...initialState.inventory },
      energy: initialState.energy,
      maxEnergy: initialState.maxEnergy,
    }

    try {
      useAppStore.setState({
        inventory: {
          ...initialState.inventory,
          energyCell: 1,
        },
        energy: 10,
        maxEnergy: 300,
      })

      const used = useAppStore.getState().useConsumableSlot(1)
      const after = useAppStore.getState()

      expect(used).toBe(true)
      expect(after.inventory.energyCell).toBe(0)
      expect(after.energy).toBeGreaterThan(10)
    } finally {
      useAppStore.setState({
        inventory: originalSnapshot.inventory,
        energy: originalSnapshot.energy,
        maxEnergy: originalSnapshot.maxEnergy,
      })
    }
  })

  it('returns false for unassigned consumable slots', () => {
    const initialState = useAppStore.getState()
    const originalSnapshot = {
      inventory: { ...initialState.inventory },
      energy: initialState.energy,
      maxEnergy: initialState.maxEnergy,
    }

    try {
      useAppStore.setState({
        inventory: {
          ...initialState.inventory,
          energyCell: 2,
        },
        energy: 22,
        maxEnergy: 220,
      })

      const before = useAppStore.getState()
      const slot2 = before.useConsumableSlot(2)
      const slot3 = before.useConsumableSlot(3)
      const slot4 = before.useConsumableSlot(4)
      const after = useAppStore.getState()

      expect(slot2).toBe(false)
      expect(slot3).toBe(false)
      expect(slot4).toBe(false)
      expect(after.inventory.energyCell).toBe(before.inventory.energyCell)
      expect(after.energy).toBe(before.energy)
    } finally {
      useAppStore.setState({
        inventory: originalSnapshot.inventory,
        energy: originalSnapshot.energy,
        maxEnergy: originalSnapshot.maxEnergy,
      })
    }
  })

  it('upgrades battery capacity using crafted resources', () => {
    const initialState = useAppStore.getState()
    const originalSnapshot = {
      inventory: { ...initialState.inventory },
      energy: initialState.energy,
      maxEnergy: initialState.maxEnergy,
      simulationLog: [...initialState.simulationLog],
    }

    try {
      useAppStore.setState({
        inventory: {
          ...initialState.inventory,
          energyCell: 10,
          steelIngot: 20,
          carbon: 90,
        },
        energy: 120,
        maxEnergy: 2000,
        simulationLog: [],
      })

      const upgraded = useAppStore.getState().upgradeBatteryCapacity()
      const after = useAppStore.getState()

      expect(upgraded).toBe(true)
      expect(after.maxEnergy).toBe(2500)
      expect(after.inventory.energyCell).toBe(6)
      expect(after.inventory.steelIngot).toBe(12)
      expect(after.inventory.carbon).toBe(50)
      expect(after.simulationLog[0]?.message).toContain('Battery upgraded')
    } finally {
      useAppStore.setState({
        inventory: originalSnapshot.inventory,
        energy: originalSnapshot.energy,
        maxEnergy: originalSnapshot.maxEnergy,
        simulationLog: originalSnapshot.simulationLog,
      })
    }
  })
})
