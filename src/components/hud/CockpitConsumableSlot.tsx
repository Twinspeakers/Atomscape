import { ResourceIcon } from '../resources/ResourceIcon'
import type { CockpitConsumableSlotVm } from './ShipCockpitHud'

interface CockpitConsumableSlotProps {
  slot: CockpitConsumableSlotVm
  onUseSlot: (slotId: CockpitConsumableSlotVm['id']) => void
}

function formatQuantity(quantity: number): string {
  if (quantity <= 0) {
    return '--'
  }

  const rounded = Math.round(quantity)
  if (Math.abs(quantity - rounded) < 0.0001) {
    return rounded.toString()
  }

  return quantity.toFixed(1)
}

export function CockpitConsumableSlot({ slot, onUseSlot }: CockpitConsumableSlotProps) {
  return (
    <button
      type="button"
      onClick={() => onUseSlot(slot.id)}
      disabled={!slot.enabled}
      className={`cockpit-slot ${slot.enabled ? 'cockpit-slot--ready' : 'cockpit-slot--disabled'}`}
      title={slot.reasonIfDisabled ?? slot.label}
    >
      <span className="cockpit-slot__hotkey">{slot.hotkey}</span>
      <span className="cockpit-slot__qty">{formatQuantity(slot.quantity)}</span>
      <span className="cockpit-slot__icon">
        <span className="cockpit-slot__icon-frame">
          {slot.resourceId ? (
            <ResourceIcon resourceId={slot.resourceId} size="100%" className="cockpit-slot__icon-svg" />
          ) : (
            <span className="cockpit-slot__placeholder">+</span>
          )}
        </span>
      </span>
    </button>
  )
}
