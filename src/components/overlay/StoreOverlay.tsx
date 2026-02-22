import { useMemo } from 'react'
import { formatQty, resourceById } from '@domain/resources/resourceCatalog'
import { useAppStore } from '@state/store'
import type { MarketProductId } from '@state/types'

interface StoreOverlayProps {
  embedded?: boolean
  onClose?: () => void
}

function nodeButtonClass(): string {
  return 'ui-action-button bg-slate-900/70 text-slate-100 hover:bg-slate-800/80'
}

function blockedButtonClass(): string {
  return 'ui-action-button cursor-not-allowed bg-slate-950/70 text-slate-500'
}

function marketBadgeClass(demand: number): string {
  if (demand >= 1.08) {
    return 'bg-emerald-400/20 text-emerald-200'
  }

  if (demand <= 0.92) {
    return 'bg-amber-400/20 text-amber-200'
  }

  return 'bg-slate-700/40 text-slate-200'
}

export function StoreOverlay({ embedded = false, onClose }: StoreOverlayProps) {
  const inventory = useAppStore((state) => state.inventory)
  const credits = useAppStore((state) => state.credits)
  const market = useAppStore((state) => state.market)
  const sellMarketProduct = useAppStore((state) => state.sellMarketProduct)

  const marketRows = useMemo(
    () =>
      (Object.keys(market) as MarketProductId[])
        .map((productId) => ({
          productId,
          quote: market[productId],
          stock: inventory[productId] ?? 0,
          definition: resourceById[productId],
        }))
        .sort((a, b) => b.quote.price - a.quote.price),
    [inventory, market],
  )

  const shellClass = embedded
    ? 'panel-shell flex h-full min-h-0 flex-col rounded-xl p-3.5'
    : 'panel-shell pointer-events-auto absolute right-0 top-0 h-full w-[clamp(380px,34vw,620px)] rounded-l-xl px-4 py-4'
  const contentClass = embedded
    ? 'ui-content-scroll min-h-0 flex-1 overflow-auto'
    : 'ui-content-scroll h-[calc(100%-186px)] overflow-auto'

  return (
    <aside className={`${shellClass} ui-stack-sm`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="ui-title">Store</h2>
        {onClose && (
          <button onClick={onClose} className="ui-action-button-sm rounded bg-slate-900/80 text-slate-200 hover:bg-slate-800/80">
            Close
          </button>
        )}
      </div>

      <div className={contentClass}>
        <div className="ui-stack-md">
          <div className="ui-surface-card">
            <div className="flex items-center justify-between">
              <p className="ui-body-copy">Store Credits</p>
              <p className="ui-title">{formatQty(credits)} cr</p>
            </div>
            <p className="ui-note mt-1">
              Prices fluctuate with supply and demand. Heavy selling depresses short-term price.
            </p>
          </div>

          <div className="space-y-2">
            {marketRows.map(({ productId, quote, stock, definition }) => (
              <div key={productId} className="ui-surface-card">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="ui-body-copy font-semibold text-slate-100">{definition.label}</p>
                    <p className="ui-note">Stock: {formatQty(stock)} {definition.unit}</p>
                  </div>
                  <div className={`ui-status-tag ${marketBadgeClass(quote.demand)}`}>
                    Demand {(quote.demand * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="ui-body-copy">
                    {formatQty(quote.price)} cr / {definition.unit}
                  </p>
                  <div className="flex gap-1">
                    <button
                      data-tutorial-focus={productId === 'boxOfSand' ? 'lab-sell-box-of-sand' : undefined}
                      onClick={stock >= 1 ? () => sellMarketProduct(productId, 1) : undefined}
                      disabled={stock < 1}
                      className={stock >= 1 ? nodeButtonClass() : blockedButtonClass()}
                    >
                      Sell 1
                    </button>
                    <button
                      onClick={stock >= 5 ? () => sellMarketProduct(productId, 5) : undefined}
                      disabled={stock < 5}
                      className={stock >= 5 ? nodeButtonClass() : blockedButtonClass()}
                    >
                      Sell 5
                    </button>
                  </div>
                </div>
                {stock < 1 && (
                  <p className="ui-note mt-1 text-amber-300">
                    Blocked: no stock available for this product.
                  </p>
                )}
                {stock >= 1 && stock < 5 && (
                  <p className="ui-note mt-1 text-amber-300">
                    Blocked for Sell 5: need 5 units (have {formatQty(stock)}).
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

