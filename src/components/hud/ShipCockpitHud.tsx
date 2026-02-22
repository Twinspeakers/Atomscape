import type { ResourceId } from '@domain/resources/resourceCatalog'
import type { PanelId } from '@state/types'
import { CockpitConsumableSlot } from './CockpitConsumableSlot'
import { SevenSegmentValue } from './SevenSegmentValue'
import { ShipCockpitShellSvg } from './ShipCockpitShellSvg'

export interface CockpitConsumableSlotVm {
  id: 1 | 2 | 3 | 4
  resourceId: ResourceId | null
  label: string
  quantity: number
  enabled: boolean
  reasonIfDisabled: string | null
  hotkey: string
}

export interface CockpitHudVm {
  speed: number
  healthPct: number
  tempDisplay: string
  slots: CockpitConsumableSlotVm[]
  panelToggles: Array<{
    panelId: PanelId
    label: string
    hidden: boolean
  }>
}

interface ShipCockpitHudProps {
  vm: CockpitHudVm
  onUseSlot: (slotId: CockpitConsumableSlotVm['id']) => void
  onTogglePanel: (panelId: PanelId) => void
}

function panelQuickToggleClass(hidden: boolean): string {
  return [
    'ui-action-button-sm transition-colors',
    hidden
      ? 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80'
      : 'cursor-default bg-slate-900/35 text-slate-500',
  ].join(' ')
}

export function ShipCockpitHud({ vm, onUseSlot, onTogglePanel }: ShipCockpitHudProps) {
  return (
    <div className="cockpit-hud pointer-events-none w-[clamp(860px,72vw,1160px)] max-w-[95vw] select-none">
      <div className="cockpit-hud__frame">
        <div className="cockpit-hud__gauge-area">
          <ShipCockpitShellSvg healthPct={vm.healthPct} />
          <section className="cockpit-hud__core">
            <div className="cockpit-hud__readouts">
              <div className="cockpit-hud__readout cockpit-hud__readout--speed">
                <p className="panel-heading cockpit-hud__speed-title">Speed</p>
                <div className="cockpit-hud__speed-row">
                  <SevenSegmentValue
                    value={vm.speed.toFixed(1).padStart(5, '0')}
                    label="Ship speed"
                    className="cockpit-hud__numeric-display"
                  />
                  <span className="cockpit-hud__unit">u/s</span>
                </div>
              </div>
              <div className="cockpit-hud__readout">
                <p className="panel-heading">Temp</p>
                <SevenSegmentValue
                  value={vm.tempDisplay}
                  label="Ship temperature"
                  className="cockpit-hud__numeric-display cockpit-hud__numeric-display--temp"
                />
              </div>
            </div>
          </section>
        </div>
        <div className="cockpit-hud__slots">
          {vm.slots.map((slot) => (
            <CockpitConsumableSlot key={slot.id} slot={slot} onUseSlot={onUseSlot} />
          ))}
        </div>
      </div>
      <div className="pointer-events-auto mt-2 flex flex-wrap items-center justify-center gap-0.5">
        <span className="ui-label">Panels</span>
        {vm.panelToggles.map((panelToggle) => (
          <button
            key={panelToggle.panelId}
            type="button"
            onClick={panelToggle.hidden ? () => onTogglePanel(panelToggle.panelId) : undefined}
            disabled={!panelToggle.hidden}
            className={panelQuickToggleClass(panelToggle.hidden)}
          >
            {panelToggle.label}
          </button>
        ))}
      </div>
    </div>
  )
}

