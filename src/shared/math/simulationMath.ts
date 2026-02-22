export function roundQty(value: number): number {
  const rounded = Number(value.toFixed(4))
  return rounded < 0 ? 0 : rounded
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function hashSeed(seed: string | number): number {
  const normalized = String(seed)
  let hash = 2166136261

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function createSeededRandom(seed: string | number): () => number {
  let state = hashSeed(seed)

  return () => {
    state += 0x6d2b79f5
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export function randomRange(random: () => number, min: number, max: number): number {
  return min + (max - min) * random()
}

export function pickWeightedKey<T extends string>(
  random: () => number,
  weights: Record<T, number>,
): T {
  const entries = Object.entries(weights) as Array<[T, number]>
  const totalWeight = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0)

  if (totalWeight <= 0) {
    return entries[0][0]
  }

  let roll = random() * totalWeight

  for (const [key, weight] of entries) {
    roll -= Math.max(0, weight)
    if (roll <= 0) {
      return key
    }
  }

  return entries[entries.length - 1][0]
}
