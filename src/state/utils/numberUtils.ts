export function roundQty(value: number): number {
  const rounded = Number(value.toFixed(4))
  return rounded < 0 ? 0 : rounded
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function normalizeNumber(value: unknown, fallback: number): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}
