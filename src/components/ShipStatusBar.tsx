import { ShipCockpitHud, type CockpitConsumableSlotVm, type CockpitHudVm } from './hud/ShipCockpitHud'
import { useAppStore } from '@state/store'
import type { PanelId } from '@state/types'

const cockpitDockablePanels: PanelId[] = ['tutorial', 'inventory', 'object', 'hud', 'actions']

const cockpitPanelLabels: Record<PanelId, string> = {
  tutorial: 'Quests',
  inventory: 'Inventory',
  object: 'Object',
  hud: 'HUD + Radar',
  actions: 'Actions',
}

export function ShipStatusBar() {
  const telemetry = useAppStore((state) => state.shipTelemetry)
  const energy = useAppStore((state) => state.energy)
  const maxEnergy = useAppStore((state) => state.maxEnergy)
  const energyCellCount = useAppStore((state) => state.inventory.energyCell ?? 0)
  const hiddenPanels = useAppStore((state) => state.hiddenPanels)
  const triggerConsumableSlot = useAppStore((state) => state.useConsumableSlot)
  const togglePanelVisibility = useAppStore((state) => state.togglePanelVisibility)
  const healthPct = Math.max(0, Math.min(100, telemetry.health))

  const energyCellEnabled = energyCellCount >= 1 && energy < maxEnergy - 0.0001

  const slots: CockpitConsumableSlotVm[] = [
    {
      id: 1,
      resourceId: 'energyCell',
      label: 'Energy Cell',
      quantity: energyCellCount,
      enabled: energyCellEnabled,
      reasonIfDisabled: energyCellEnabled
        ? null
        : energyCellCount > 0
          ? 'Battery full'
          : 'No cells in cargo',
      hotkey: '1',
    },
    {
      id: 2,
      resourceId: null,
      label: 'Slot 2',
      quantity: 0,
      enabled: false,
      reasonIfDisabled: 'Consumable not installed',
      hotkey: '2',
    },
    {
      id: 3,
      resourceId: null,
      label: 'Slot 3',
      quantity: 0,
      enabled: false,
      reasonIfDisabled: 'Consumable not installed',
      hotkey: '3',
    },
    {
      id: 4,
      resourceId: null,
      label: 'Slot 4',
      quantity: 0,
      enabled: false,
      reasonIfDisabled: 'Consumable not installed',
      hotkey: '4',
    },
  ]

  const vm: CockpitHudVm = {
    speed: telemetry.speed,
    healthPct,
    tempDisplay: '--',
    slots,
    panelToggles: cockpitDockablePanels.map((panelId) => ({
      panelId,
      label: cockpitPanelLabels[panelId],
      hidden: hiddenPanels.includes(panelId),
    })),
  }

  return <ShipCockpitHud vm={vm} onUseSlot={triggerConsumableSlot} onTogglePanel={togglePanelVisibility} />
}

