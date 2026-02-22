import { useAppStore } from '@state/store'

interface LogOverlayProps {
  embedded?: boolean
  onClose?: () => void
}

export function LogOverlay({ embedded = false, onClose }: LogOverlayProps) {
  const simulationLog = useAppStore((state) => state.simulationLog)

  const shellClass = embedded
    ? 'panel-shell flex h-full min-h-0 flex-col rounded-xl p-3.5'
    : 'panel-shell pointer-events-auto absolute right-0 top-0 h-full w-[clamp(380px,34vw,620px)] rounded-l-xl px-4 py-4'
  const contentClass = embedded
    ? 'ui-content-scroll min-h-0 flex-1 overflow-auto'
    : 'ui-content-scroll h-[calc(100%-186px)] overflow-auto'

  return (
    <aside className={`${shellClass} ui-stack-sm`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="ui-title">Log</h2>
        {onClose && (
          <button onClick={onClose} className="ui-action-button-sm rounded bg-slate-900/80 text-slate-200 hover:bg-slate-800/80">
            Close
          </button>
        )}
      </div>

      <div className={contentClass}>
        <div className="ui-stack-sm">
          {simulationLog.length === 0 && <p className="ui-note">No simulation events yet.</p>}
          {simulationLog.map((entry) => (
            <div key={entry.id} className="ui-surface-card">
              <p className="ui-note">{new Date(entry.timestamp).toLocaleTimeString()}</p>
              <p className="ui-body-copy">{entry.message}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

