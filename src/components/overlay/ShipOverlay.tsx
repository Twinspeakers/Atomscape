import { useMemo } from 'react'
import { formatQty, resourceById } from '@domain/resources/resourceCatalog'
import {
  batteryUpgradeCostEntries,
  deriveBatteryUpgradePlan,
} from '@domain/spec/batteryUpgrade'
import { useAppStore } from '@state/store'
import { ResourceIcon } from '../resources/ResourceIcon'

interface ShipOverlayProps {
  embedded?: boolean
  onClose?: () => void
}

function actionButtonClass(enabled: boolean): string {
  return enabled
    ? 'ui-action-button-sm px-2 py-1'
    : 'ui-action-button-sm cursor-not-allowed px-2 py-1 text-slate-500'
}

export function ShipOverlay({ embedded = false, onClose }: ShipOverlayProps) {
  const energy = useAppStore((state) => state.energy)
  const maxEnergy = useAppStore((state) => state.maxEnergy)
  const inventory = useAppStore((state) => state.inventory)
  const charging = useAppStore((state) => state.charging)
  const docked = useAppStore((state) => state.docked)
  const stationDistance = useAppStore((state) => state.stationDistance)
  const simulationSummary = useAppStore((state) => state.simulationSummary)
  const upgradeBatteryCapacity = useAppStore((state) => state.upgradeBatteryCapacity)
  const useEnergyCell = useAppStore((state) => state.useEnergyCell)

  const shellClass = embedded
    ? 'panel-shell flex h-full min-h-0 flex-col rounded-xl p-3.5'
    : 'panel-shell pointer-events-auto absolute right-0 top-0 h-full w-[clamp(380px,34vw,620px)] rounded-l-xl px-4 py-4'
  const contentClass = embedded
    ? 'ui-content-scroll min-h-0 flex-1 overflow-auto'
    : 'ui-content-scroll h-[calc(100%-186px)] overflow-auto'

  const energyPercent = useMemo(() => {
    if (maxEnergy <= 0) {
      return 0
    }

    return Math.max(0, Math.min(100, (energy / maxEnergy) * 100))
  }, [energy, maxEnergy])

  const batteryUpgradePlan = deriveBatteryUpgradePlan(maxEnergy)
  const upgradeCostRows = batteryUpgradeCostEntries(batteryUpgradePlan.cost)
  const missingCostRows = upgradeCostRows.filter(
    ([resourceId, amount]) => (inventory[resourceId] ?? 0) + 0.0001 < amount,
  )
  const batteryUpgradeBlockedReason = batteryUpgradePlan.atCap
    ? `Max capacity reached at ${formatQty(batteryUpgradePlan.currentMaxEnergy)} energy.`
    : missingCostRows.length > 0
      ? `Missing materials: ${missingCostRows
          .map(([resourceId, amount]) => `${resourceById[resourceId].label} ${formatQty(inventory[resourceId] ?? 0)}/${formatQty(amount)}`)
          .join(' | ')}`
      : null
  const canUpgradeBattery = batteryUpgradeBlockedReason === null && batteryUpgradePlan.gain > 0

  const energyCellCount = inventory.energyCell ?? 0
  const canDischargeEnergyCell = energyCellCount >= 1 && energy < maxEnergy - 0.0001
  const chargeStateLabel = charging
    ? 'Charging'
    : docked
      ? 'Docked'
      : 'Cruise'

  return (
    <aside className={`${shellClass} ui-stack-sm`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="ui-title">Ship</h2>
        {onClose && (
          <button onClick={onClose} className="ui-action-button-sm rounded bg-slate-900/80 text-slate-200 hover:bg-slate-800/80">
            Close
          </button>
        )}
      </div>

      <div className={contentClass}>
        <div className="ui-stack-md">
          <div className="ui-surface-card">
            <p className="ui-label">Systems Deck</p>
            <p className="ui-note mt-1">
              Power management for long hauls and heavy industry.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="ui-surface-card ui-stack-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="ui-label">Reactor + Battery</p>
                <span className="ui-status-tag bg-slate-900/60 text-slate-200">{chargeStateLabel}</span>
              </div>
              <div className="flex items-center justify-between ui-body-copy">
                <span>{formatQty(energy)} / {formatQty(maxEnergy)} energy</span>
                <span>{energyPercent.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-slate-900/80">
                <div className="h-full bg-slate-300/80 transition-all" style={{ width: `${energyPercent}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-1 ui-note">
                <span>Station Dist: {stationDistance.toFixed(1)} m</span>
                <span>In Range: {simulationSummary.inRange ? 'Yes' : 'No'}</span>
                <span>Charge/s: +{simulationSummary.chargingRate.toFixed(2)}</span>
                <span>Net/s: {simulationSummary.netEnergyPerSecond >= 0 ? '+' : ''}{simulationSummary.netEnergyPerSecond.toFixed(2)}</span>
              </div>
            </div>

            <div className="ui-surface-card ui-stack-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="ui-label">Battery Upgrade</p>
                <span className="ui-status-tag bg-slate-900/60 text-slate-200">
                  Tier {batteryUpgradePlan.tier + 1}
                </span>
              </div>
              <p className="ui-note">
                Capacity gain per upgrade: +{formatQty(batteryUpgradePlan.gain)} energy
              </p>
              <p className="ui-note">
                Next cap: {formatQty(batteryUpgradePlan.currentMaxEnergy)} -&gt; {formatQty(batteryUpgradePlan.nextMaxEnergy)}
              </p>
              <div className="ui-surface-card-strong space-y-1.5">
                {upgradeCostRows.map(([resourceId, amount]) => {
                  const available = inventory[resourceId] ?? 0
                  const met = available + 0.0001 >= amount
                  return (
                    <div key={resourceId} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                      <ResourceIcon resourceId={resourceId} size={26} />
                      <span className="ui-note truncate">{resourceById[resourceId].label}</span>
                      <span className={`ui-note ${met ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {formatQty(available)}/{formatQty(amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
              {batteryUpgradeBlockedReason && (
                <p className={`ui-note ${batteryUpgradePlan.atCap ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {batteryUpgradeBlockedReason}
                </p>
              )}
              <button
                onClick={canUpgradeBattery ? upgradeBatteryCapacity : undefined}
                disabled={!canUpgradeBattery}
                className={actionButtonClass(canUpgradeBattery)}
              >
                {batteryUpgradePlan.atCap ? 'Max Capacity Reached' : 'Commit Upgrade'}
              </button>
            </div>
          </div>

          <div className="ui-surface-card ui-stack-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="ui-label">Emergency Power Cells</p>
              <span className="ui-pill">{formatQty(energyCellCount)} in cargo</span>
            </div>
            <p className="ui-note">
              Manual discharge restores onboard energy for short-term recovery.
            </p>
            <button
              onClick={canDischargeEnergyCell ? () => {
                useEnergyCell()
              } : undefined}
              disabled={!canDischargeEnergyCell}
              className={actionButtonClass(canDischargeEnergyCell)}
            >
              Discharge 1 Energy Cell
            </button>
            {!canDischargeEnergyCell && (
              <p className="ui-note text-amber-300">
                {energyCellCount < 1 ? 'No Energy Cells in cargo.' : 'Battery already full.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
