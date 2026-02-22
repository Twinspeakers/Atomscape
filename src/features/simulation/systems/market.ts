import {
  MARKET_DEMAND_RECOVERY_PER_SECOND,
  MARKET_PRICE_CEIL_MULTIPLIER,
  MARKET_PRICE_FLOOR_MULTIPLIER,
  MARKET_PRODUCTS,
  MARKET_RANDOM_SWAY,
} from '@domain/spec/gameSpec'
import type { ResourceInventory, MarketProductId } from '@state/types'
import { clamp, roundQty } from '../math'
import type { MarketState } from '../types'

export function computeMarketPrice(basePrice: number, demand: number, recentSales: number): number {
  const salesPressure = clamp(recentSales * 0.06, 0, 0.7)
  const rawPrice = basePrice * demand * (1 - salesPressure)

  return roundQty(
    clamp(
      rawPrice,
      basePrice * MARKET_PRICE_FLOOR_MULTIPLIER,
      basePrice * MARKET_PRICE_CEIL_MULTIPLIER,
    ),
  )
}

export function createMarketState(): MarketState {
  return MARKET_PRODUCTS.reduce<MarketState>((market, product) => {
    market[product.productId] = {
      productId: product.productId,
      basePrice: product.basePrice,
      demand: 1,
      recentSales: 0,
      price: product.basePrice,
    }
    return market
  }, {} as MarketState)
}

export function tickMarketState(market: MarketState, random: () => number = Math.random): MarketState {
  return MARKET_PRODUCTS.reduce<MarketState>((nextState, product) => {
    const current = market[product.productId]
    const demandTargeted =
      current.demand + (1 - current.demand) * MARKET_DEMAND_RECOVERY_PER_SECOND
    const demand = clamp(
      demandTargeted + (random() * 2 - 1) * MARKET_RANDOM_SWAY,
      0.55,
      1.45,
    )
    const recentSales = roundQty(current.recentSales * 0.88)

    nextState[product.productId] = {
      ...current,
      demand,
      recentSales,
      price: computeMarketPrice(current.basePrice, demand, recentSales),
    }
    return nextState
  }, {} as MarketState)
}

function marketProductLabel(productId: MarketProductId): string {
  return MARKET_PRODUCTS.find((entry) => entry.productId === productId)?.label ?? productId
}

export interface ExecuteMarketSaleInput {
  inventory: ResourceInventory
  market: MarketState
  credits: number
  productId: MarketProductId
  quantity?: number
}

export interface ExecuteMarketSaleResult {
  succeeded: boolean
  inventoryChanged: boolean
  inventory: ResourceInventory
  market: MarketState
  credits: number
  logMessage: string | null
}

export function executeMarketSale(input: ExecuteMarketSaleInput): ExecuteMarketSaleResult {
  const product = input.market[input.productId]
  if (!product) {
    return {
      succeeded: false,
      inventoryChanged: false,
      inventory: input.inventory,
      market: input.market,
      credits: input.credits,
      logMessage: null,
    }
  }

  const units = Math.max(1, Math.floor(input.quantity ?? 1))
  const available = input.inventory[input.productId] ?? 0
  const label = marketProductLabel(input.productId)

  if (available < units) {
    return {
      succeeded: false,
      inventoryChanged: false,
      inventory: input.inventory,
      market: input.market,
      credits: input.credits,
      logMessage: `Sale blocked: not enough ${label}.`,
    }
  }

  const inventory = { ...input.inventory }
  inventory[input.productId] = roundQty(available - units)
  const creditsEarned = roundQty(product.price * units)
  const demand = clamp(product.demand - units * 0.04, 0.55, 1.45)
  const recentSales = roundQty(product.recentSales + units)
  const market: MarketState = {
    ...input.market,
    [input.productId]: {
      ...product,
      demand,
      recentSales,
      price: computeMarketPrice(product.basePrice, demand, recentSales),
    },
  }

  return {
    succeeded: true,
    inventoryChanged: true,
    inventory,
    market,
    credits: roundQty(input.credits + creditsEarned),
    logMessage: `Sold ${units} ${label} for ${creditsEarned.toFixed(1)} cr.`,
  }
}
