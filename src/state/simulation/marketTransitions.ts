import {
  executeMarketSale,
  type MarketState,
} from '@features/simulation/engine'
import type {
  MarketProductId,
  ResourceInventory,
  SimulationLogEntry,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface MarketSaleTransitionState {
  inventory: ResourceInventory
  market: MarketState
  credits: number
  simulationLog: SimulationLogEntry[]
}

export interface MarketSaleTransitionResult {
  inventory: ResourceInventory
  market: MarketState
  credits: number
  simulationLog: SimulationLogEntry[]
  persistInventory: boolean
}

export function applyMarketSaleTransition(
  state: MarketSaleTransitionState,
  productId: MarketProductId,
  quantity: number,
  appendLog: AppendLog,
): MarketSaleTransitionResult {
  const sale = executeMarketSale({
    inventory: state.inventory,
    market: state.market,
    credits: state.credits,
    productId,
    quantity,
  })

  return {
    inventory: sale.inventory,
    market: sale.market,
    credits: sale.credits,
    simulationLog: sale.logMessage
      ? appendLog({
          logs: state.simulationLog,
          message: sale.logMessage,
        })
      : state.simulationLog,
    persistInventory: sale.inventoryChanged,
  }
}
