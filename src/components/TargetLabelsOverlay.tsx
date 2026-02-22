import type { TargetLabelAnchor } from '../features/viewport/types'

interface TargetLabelsOverlayProps {
  labels: TargetLabelAnchor[]
  suppressed?: boolean
}

function classNameForPriority(priority: TargetLabelAnchor['priority']): string {
  if (priority === 'locked') {
    return 'target-label is-locked'
  }

  if (priority === 'selected') {
    return 'target-label is-selected'
  }

  return 'target-label'
}

export function TargetLabelsOverlay({
  labels,
  suppressed = false,
}: TargetLabelsOverlayProps) {
  if (suppressed || labels.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {labels.map((label) => (
        <div
          key={label.targetId}
          className={classNameForPriority(label.priority)}
          style={{ left: `${label.x}px`, top: `${label.y}px` }}
        >
          {label.label}
        </div>
      ))}
    </div>
  )
}
