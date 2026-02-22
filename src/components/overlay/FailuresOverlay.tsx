import { formatQty } from '@domain/resources/resourceCatalog'
import { useAppStore } from '@state/store'

interface FailuresOverlayProps {
  embedded?: boolean
  onClose?: () => void
}

export function FailuresOverlay({ embedded = false, onClose }: FailuresOverlayProps) {
  const failureReports = useAppStore((state) => state.failureReports)

  const shellClass = embedded
    ? 'panel-shell flex h-full min-h-0 flex-col rounded-xl p-3.5'
    : 'panel-shell pointer-events-auto absolute right-0 top-0 h-full w-[clamp(380px,34vw,620px)] rounded-l-xl px-4 py-4'
  const contentClass = embedded
    ? 'ui-content-scroll min-h-0 flex-1 overflow-auto'
    : 'ui-content-scroll h-[calc(100%-186px)] overflow-auto'

  return (
    <aside className={`${shellClass} ui-stack-sm`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="ui-title">Failure Report</h2>
        {onClose && (
          <button onClick={onClose} className="ui-action-button-sm rounded bg-slate-900/80 text-slate-200 hover:bg-slate-800/80">
            Close
          </button>
        )}
      </div>

      <div className={contentClass}>
        <div className="ui-stack-sm">
          {failureReports.length === 0 && (
            <p className="ui-note">
              No failure reports yet. Events appear here when emergency repairs are triggered.
            </p>
          )}
          {failureReports.map((report) => (
            <div key={report.id} className="ui-surface-card">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="ui-body-copy font-semibold text-slate-100">
                  {report.reason === 'combat' ? 'Combat Failure' : 'Starvation Failure'}
                </p>
                <p className="ui-note">
                  {new Date(report.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <p className="ui-note mb-1">
                Repair #{report.repairCount} | -{formatQty(report.creditsPenalty)} cr | -{formatQty(report.energyPenalty)} energy
              </p>
              {report.hadMaterialShortage && (
                <p className="ui-note mb-1 text-amber-300">
                  Material shortage detected during emergency repair.
                </p>
              )}
              <div className="space-y-1">
                {report.materials.map((material) => (
                  <div key={`${report.id}-${material.resourceId}`} className="ui-surface-card-strong">
                    <p className="ui-body-copy">{material.label}</p>
                    <p className="ui-note">
                      Required {formatQty(material.required)} | Used {formatQty(material.used)} | Shortage {formatQty(material.shortage)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

