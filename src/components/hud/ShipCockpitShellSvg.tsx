interface ShipCockpitShellSvgProps {
  healthPct: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

interface RgbColor {
  r: number
  g: number
  b: number
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function gradientColorAt(progress: number): string {
  const stops: Array<{ t: number; color: RgbColor }> = [
    { t: 0, color: { r: 239, g: 68, b: 68 } },
    { t: 0.2, color: { r: 249, g: 115, b: 22 } },
    { t: 0.4, color: { r: 250, g: 204, b: 21 } },
    { t: 0.65, color: { r: 132, g: 204, b: 22 } },
    { t: 1, color: { r: 120, g: 239, b: 0 } },
  ]

  const t = clamp(progress, 0, 1)
  const upperIndex = stops.findIndex((stop) => stop.t >= t)
  if (upperIndex <= 0) {
    const first = stops[0].color
    return `rgb(${first.r}, ${first.g}, ${first.b})`
  }

  const upper = stops[upperIndex]
  const lower = stops[upperIndex - 1]
  const local = (t - lower.t) / Math.max(0.0001, upper.t - lower.t)
  const r = Math.round(lerp(lower.color.r, upper.color.r, local))
  const g = Math.round(lerp(lower.color.g, upper.color.g, local))
  const b = Math.round(lerp(lower.color.b, upper.color.b, local))
  return `rgb(${r}, ${g}, ${b})`
}

export function ShipCockpitShellSvg({ healthPct }: ShipCockpitShellSvgProps) {
  const normalizedHealth = clamp(healthPct, 0, 100)
  const segmentCount = 28
  const activeSegments = Math.round((normalizedHealth / 100) * segmentCount)
  const startAngle = 205
  const endAngle = -22
  const shellPath = 'M395 246 A205 205 0 0 1 805 246'
  const innerGuidePath = 'M430 246 A170 170 0 0 1 770 246'

  return (
    <svg viewBox="0 0 1200 280" className="cockpit-hud__shell-svg" aria-hidden>
      <path
        d={shellPath}
        fill="none"
        stroke="rgba(0, 0, 0, 0.44)"
        strokeWidth="38"
        strokeLinecap="round"
      />
      <path
        d={shellPath}
        fill="none"
        stroke="rgba(24, 24, 24, 0.96)"
        strokeWidth="34"
        strokeLinecap="round"
      />
      <path
        d={shellPath}
        fill="none"
        stroke="rgba(255, 255, 255, 0.06)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d={innerGuidePath}
        fill="none"
        stroke="rgba(118, 124, 132, 0.42)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      <g transform="translate(600 246) rotate(-75)">
        {Array.from({ length: segmentCount }).map((_, index) => {
          const progress = segmentCount <= 1 ? 0 : index / (segmentCount - 1)
          const angle = startAngle + (endAngle - startAngle) * progress
          const active = index < activeSegments
          const litColor = gradientColorAt(progress)

          return (
            <rect
              key={`segment-${index}`}
              x={-8}
              y={-203}
              width={16}
              height={24}
              rx={3.2}
              fill={active ? litColor : 'rgba(152, 158, 164, 0.36)'}
              stroke="rgba(8, 8, 8, 0.56)"
              strokeWidth="0.9"
              transform={`rotate(${angle})`}
            />
          )
        })}
      </g>
    </svg>
  )
}
