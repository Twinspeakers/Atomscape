import { periodicElements } from '@domain/elements/periodicElements'

const cumulativeWeights: number[] = []
let totalWeight = 0

periodicElements.forEach((element, index) => {
  const rarityWeight = 1 / Math.sqrt(element.atomicNumber)
  totalWeight += rarityWeight
  cumulativeWeights[index] = totalWeight
})

export function pickWeightedRandomElementIndex(): number {
  const target = Math.random() * totalWeight
  let low = 0
  let high = cumulativeWeights.length - 1

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (cumulativeWeights[mid] < target) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  return low
}
