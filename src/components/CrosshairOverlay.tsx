import type { CSSProperties } from 'react'
import type { CrosshairFeedback } from '../features/viewport/types'

interface CrosshairOverlayProps {
  targetLocked: boolean
  targetDistance: number | null
  feedback: CrosshairFeedback | 'idle'
  suppressed?: boolean
}

function toneColor(targetLocked: boolean, feedback: CrosshairFeedback | 'idle', suppressed: boolean): string {
  if (suppressed) {
    return 'rgba(148, 163, 184, 0.55)'
  }

  if (feedback === 'blocked') {
    return '#f97316'
  }

  if (targetLocked || feedback === 'fired' || feedback === 'hit') {
    return '#78EF00'
  }

  return 'rgba(226, 232, 240, 0.82)'
}

export function CrosshairOverlay({
  targetLocked,
  targetDistance,
  feedback,
  suppressed = false,
}: CrosshairOverlayProps) {
  const color = toneColor(targetLocked, feedback, suppressed)
  const style = { '--crosshair-color': color } as CSSProperties

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div
        className={[
          'crosshair',
          targetLocked ? 'is-locked' : '',
          feedback === 'fired' ? 'is-fired' : '',
          feedback === 'hit' ? 'is-hit' : '',
          feedback === 'blocked' ? 'is-blocked' : '',
          suppressed ? 'is-suppressed' : '',
        ].join(' ')}
        style={style}
      >
        <span className="crosshair__arm crosshair__arm--top" />
        <span className="crosshair__arm crosshair__arm--right" />
        <span className="crosshair__arm crosshair__arm--bottom" />
        <span className="crosshair__arm crosshair__arm--left" />
        <span className="crosshair__dot" />
      </div>

      {!suppressed && (
        <div className="crosshair__status">
          {targetLocked && typeof targetDistance === 'number'
            ? `Target Locked - ${targetDistance.toFixed(0)} m`
            : 'Free Aim'}
        </div>
      )}
    </div>
  )
}
