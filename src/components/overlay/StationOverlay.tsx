import { useMemo } from 'react'
import { CHARGING_RANGE_METERS, STATION_DOCKING_RANGE_METERS } from '@domain/spec/gameSpec'
import { formatQty } from '@domain/resources/resourceCatalog'
import { useAppStore } from '@state/store'

interface StationOverlayProps {
  embedded?: boolean
  onClose?: () => void
}

function nodeButtonClass(): string {
  return 'ui-action-button bg-slate-900/70 text-slate-100 hover:bg-slate-800/80'
}

function blockedButtonClass(): string {
  return 'ui-action-button cursor-not-allowed bg-slate-950/70 text-slate-500'
}

export function StationOverlay({ embedded = false, onClose }: StationOverlayProps) {
  const energy = useAppStore((state) => state.energy)
  const maxEnergy = useAppStore((state) => state.maxEnergy)
  const charging = useAppStore((state) => state.charging)
  const stationDistance = useAppStore((state) => state.stationDistance)
  const stationDistanceManual = useAppStore((state) => state.stationDistanceManual)
  const useSceneDistance = useAppStore((state) => state.useSceneDistance)
  const docked = useAppStore((state) => state.docked)
  const simulationSummary = useAppStore((state) => state.simulationSummary)
  const setUseSceneDistance = useAppStore((state) => state.setUseSceneDistance)
  const setStationDistanceManual = useAppStore((state) => state.setStationDistanceManual)
  const toggleDocked = useAppStore((state) => state.toggleDocked)
  const startCharging = useAppStore((state) => state.startCharging)
  const stopCharging = useAppStore((state) => state.stopCharging)

  const energyPercent = useMemo(() => {
    if (maxEnergy <= 0) {
      return 0
    }

    return Math.max(0, Math.min(100, (energy / maxEnergy) * 100))
  }, [energy, maxEnergy])

  const canStartCharging = charging || simulationSummary.inRange
  const shellClass = embedded
    ? 'panel-shell flex h-full min-h-0 flex-col rounded-xl p-3.5'
    : 'panel-shell pointer-events-auto absolute right-0 top-0 h-full w-[clamp(380px,34vw,620px)] rounded-l-xl px-4 py-4'
  const contentClass = embedded
    ? 'ui-content-scroll min-h-0 flex-1 overflow-auto'
    : 'ui-content-scroll h-[calc(100%-186px)] overflow-auto'

  return (
    <aside className={`${shellClass} ui-stack-sm`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="ui-title">Station</h2>
        {onClose && (
          <button onClick={onClose} className="ui-action-button-sm rounded bg-slate-900/80 text-slate-200 hover:bg-slate-800/80">
            Close
          </button>
        )}
      </div>

      <div className={contentClass}>
        <div className="ui-stack-md">
          <div className="ui-surface-card mb-3">
            <div className="mb-1 flex items-center justify-between ui-body-copy">
              <span>Battery</span>
              <span>{formatQty(energy)} / {formatQty(maxEnergy)} energy</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-slate-900/80">
              <div className="h-full bg-slate-300/80 transition-all" style={{ width: `${energyPercent}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 ui-note">
              <span>Distance: {stationDistance.toFixed(1)} m</span>
              <span>In Range: {simulationSummary.inRange ? 'Yes' : 'No'}</span>
              <span>Charge/s: +{simulationSummary.chargingRate.toFixed(2)}</span>
              <span>Containment/s: -{simulationSummary.containmentDrain.toFixed(2)}</span>
            </div>
          </div>

          <div className="ui-surface-card">
            <p className="ui-label mb-1">Live Station Telemetry</p>
            <p className="ui-body-copy">
              {useSceneDistance
                ? 'Babylon scene distance is active.'
                : 'Manual distance override is active (testing fallback).'}
            </p>
            <p className="ui-note mt-1">
              Gameplay should run on live scene distance. Use manual override only for testing.
            </p>
            {!useSceneDistance && (
              <p className="ui-note mt-1 text-amber-300">
                Test mode active: charging and docking checks now use the manual slider value.
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setUseSceneDistance(true)}
                className={useSceneDistance ? blockedButtonClass() : nodeButtonClass()}
                disabled={useSceneDistance}
              >
                Use Live Scene Distance
              </button>
              <button
                onClick={toggleDocked}
                className={nodeButtonClass()}
              >
                {docked ? 'Undock' : 'Dock to Station'}
              </button>
            </div>
          </div>

          <details className="ui-surface-card">
            <summary className="ui-label cursor-pointer">Testing Fallback: Manual Distance Override</summary>
            <div className="mt-2 ui-stack-sm">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setUseSceneDistance(false)}
                  className={!useSceneDistance ? blockedButtonClass() : nodeButtonClass()}
                  disabled={!useSceneDistance}
                >
                  Enable Manual Override
                </button>
                <button
                  onClick={() => setUseSceneDistance(true)}
                  className={useSceneDistance ? blockedButtonClass() : nodeButtonClass()}
                  disabled={useSceneDistance}
                >
                  Disable Manual Override
                </button>
              </div>
              <label className="ui-label block">Manual Station Distance (m)</label>
              <input
                type="range"
                min={0}
                max={1200}
                step={1}
                value={stationDistanceManual}
                disabled={useSceneDistance || docked}
                onChange={(event) => setStationDistanceManual(Number(event.target.value))}
                className="w-full"
              />
              <p className="ui-note">
                {docked
                  ? 'Docked: distance pinned to 0 m.'
                  : useSceneDistance
                    ? 'Manual slider disabled while live scene telemetry is active.'
                    : `Manual test distance: ${stationDistanceManual.toFixed(1)} m`}
              </p>
            </div>
          </details>

          <div className="flex flex-wrap gap-2">
            <button
              data-tutorial-focus="lab-start-charging"
              onClick={charging ? stopCharging : canStartCharging ? startCharging : undefined}
              disabled={!canStartCharging}
              className={canStartCharging ? nodeButtonClass() : blockedButtonClass()}
            >
              {charging ? 'Stop Charging' : 'Start Charging'}
            </button>
          </div>
          {!charging && !simulationSummary.inRange && (
            <p className="ui-note text-amber-300">
              Charging blocked: move within {CHARGING_RANGE_METERS} m of the station.
            </p>
          )}

          <div className="ui-surface-card ui-body-copy">
            <p>Charge range: {CHARGING_RANGE_METERS} m</p>
            <p>Docking corridor: {STATION_DOCKING_RANGE_METERS} m</p>
            <p>Net energy delta: {simulationSummary.netEnergyPerSecond >= 0 ? '+' : ''}{simulationSummary.netEnergyPerSecond.toFixed(2)} / sec</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

