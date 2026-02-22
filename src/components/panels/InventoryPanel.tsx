import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { formatQty, type ResourceId, type ResourceDefinition } from '@domain/resources/resourceCatalog'
import { resourcePresentationById, type ResourceCategory } from '@domain/resources/resourcePresentation'
import { searchResources } from '../../search/resourceSearch'
import { useAppStore } from '@state/store'
import { ResourceIcon } from '../resources/ResourceIcon'

type InventoryPanelMode = 'panel' | 'menu'
type InventorySortMode = 'countDesc' | 'countAsc' | 'nameAsc' | 'nameDesc'
type InventoryGroupMode = 'category' | 'none'

interface InventoryPanelProps {
  mode?: InventoryPanelMode
}

interface InventoryRow extends ResourceDefinition {
  count: number
}

interface InventorySection {
  key: string
  label: string
  items: InventoryRow[]
}

type VirtualListEntry =
  | { kind: 'section'; key: string; label: string }
  | { kind: 'item'; key: string; row: InventoryRow }

const categoryOrder: ResourceCategory[] = [
  'Raw Feedstock',
  'Refined Material',
  'Chemical',
  'Bio Product',
  'Manufactured Product',
  'Waste',
]

const inventoryPanelHeightStorageKey = 'inventory-panel-height-v1'
const inventoryPanelMinHeightPx = 170
const uiConfineTopPx = 12
const uiConfineBottomPx = 16

function clampPanelInventoryHeight(value: number, maxHeight?: number): number {
  const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight
  const fallbackMaxHeight = Math.max(260, viewportHeight - 260)
  const resolvedMaxHeight =
    typeof maxHeight === 'number'
      ? Math.max(inventoryPanelMinHeightPx, maxHeight)
      : fallbackMaxHeight

  return Math.max(inventoryPanelMinHeightPx, Math.min(resolvedMaxHeight, value))
}

function sortRows(rows: InventoryRow[], sortMode: InventorySortMode): InventoryRow[] {
  return [...rows].sort((a, b) => {
    if (sortMode === 'countDesc') {
      if (a.count !== b.count) {
        return b.count - a.count
      }

      return a.label.localeCompare(b.label)
    }

    if (sortMode === 'countAsc') {
      if (a.count !== b.count) {
        return a.count - b.count
      }

      return a.label.localeCompare(b.label)
    }

    if (sortMode === 'nameDesc') {
      return b.label.localeCompare(a.label)
    }

    return a.label.localeCompare(b.label)
  })
}

function groupRows(rows: InventoryRow[], groupMode: InventoryGroupMode): InventorySection[] {
  if (groupMode === 'none') {
    return [{ key: 'all', label: 'All Resources', items: rows }]
  }

  const byCategory = new Map<ResourceCategory, InventoryRow[]>()
  rows.forEach((row) => {
    const category = resourcePresentationById[row.id].category
    const bucket = byCategory.get(category) ?? []
    bucket.push(row)
    byCategory.set(category, bucket)
  })

  return categoryOrder
    .map((category) => ({
      key: category,
      label: category,
      items: byCategory.get(category) ?? [],
    }))
    .filter((section) => section.items.length > 0)
}

export function InventoryPanel({ mode = 'panel' }: InventoryPanelProps) {
  const inventory = useAppStore((state) => state.inventory)
  const inventoryLoaded = useAppStore((state) => state.inventoryLoaded)
  const atomCounter = useAppStore((state) => state.atomCounter)
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<InventorySortMode>('countDesc')
  const [groupMode, setGroupMode] = useState<InventoryGroupMode>('category')
  const [selectedResourceId, setSelectedResourceId] = useState<ResourceId | null>(null)
  const [panelListHeightPx, setPanelListHeightPx] = useState(() => {
    if (typeof window === 'undefined') {
      return 250
    }

    try {
      const stored = window.localStorage.getItem(inventoryPanelHeightStorageKey)
      const parsed = stored ? Number(stored) : 250
      return clampPanelInventoryHeight(Number.isFinite(parsed) ? parsed : 250)
    } catch {
      return 250
    }
  })
  const [panelListResizing, setPanelListResizing] = useState(false)
  const panelContainerRef = useRef<HTMLDivElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  const resizeSessionRef = useRef<{
    startY: number
    startHeight: number
    topOffsetPx: number
    chromeHeightPx: number
  } | null>(null)

  const rows = useMemo(() => {
    const normalizedQuery = query.trim()
    const matchedRows = searchResources(normalizedQuery).map((resource) => ({
      ...resource,
      count: inventory[resource.id] ?? 0,
    }))

    const filteredRows =
      mode === 'panel'
        ? matchedRows.filter((resource) => resource.count > 0 || normalizedQuery.length > 0)
        : matchedRows

    return sortRows(filteredRows, sortMode)
  }, [inventory, query, mode, sortMode])

  const sections = useMemo(() => groupRows(rows, groupMode), [rows, groupMode])

  const selectedRow = useMemo(() => {
    if (rows.length === 0) {
      return null
    }

    if (selectedResourceId) {
      const explicitMatch = rows.find((row) => row.id === selectedResourceId)
      if (explicitMatch) {
        return explicitMatch
      }
    }

    return rows.find((row) => row.count > 0) ?? rows[0]
  }, [rows, selectedResourceId])

  const virtualEntries = useMemo(() => {
    const entries: VirtualListEntry[] = []
    sections.forEach((section) => {
      entries.push({
        kind: 'section',
        key: `section-${section.key}`,
        label: section.label,
      })
      section.items.forEach((row) => {
        entries.push({
          kind: 'item',
          key: row.id,
          row,
        })
      })
    })
    return entries
  }, [sections])

  // TanStack virtualizer is consumed locally in this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: virtualEntries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (virtualEntries[index]?.kind === 'section' ? 34 : 58),
    overscan: 8,
  })

  const controls = (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
      <label className="ui-note">
        Group
        <select
          value={groupMode}
          onChange={(event) => setGroupMode(event.target.value as InventoryGroupMode)}
          className="ui-input-field mt-1"
        >
          <option value="category">Category</option>
          <option value="none">None</option>
        </select>
      </label>
      <label className="ui-note">
        Sort
        <select
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as InventorySortMode)}
          className="ui-input-field mt-1"
        >
          <option value="countDesc">Amount (High to Low)</option>
          <option value="countAsc">Amount (Low to High)</option>
          <option value="nameAsc">Name (A to Z)</option>
          <option value="nameDesc">Name (Z to A)</option>
        </select>
      </label>
    </div>
  )

  useEffect(() => {
    if (mode !== 'panel' || typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(inventoryPanelHeightStorageKey, String(panelListHeightPx))
    } catch {
      // Ignore storage write failures.
    }
  }, [mode, panelListHeightPx])

  useEffect(() => {
    if (mode !== 'panel' || typeof window === 'undefined') {
      return
    }

    const clampToConfine = () => {
      setPanelListHeightPx((currentHeight) => {
        const container = panelContainerRef.current
        if (!container) {
          return clampPanelInventoryHeight(currentHeight)
        }

        const rect = container.getBoundingClientRect()
        const topOffsetPx = Math.max(uiConfineTopPx, rect.top)
        const chromeHeightPx = Math.max(0, rect.height - currentHeight)
        const maxHeightPx = Math.max(
          inventoryPanelMinHeightPx,
          Math.floor(window.innerHeight - uiConfineBottomPx - topOffsetPx - chromeHeightPx),
        )
        const clampedHeight = clampPanelInventoryHeight(currentHeight, maxHeightPx)
        return clampedHeight === currentHeight ? currentHeight : clampedHeight
      })
    }

    clampToConfine()
    window.addEventListener('resize', clampToConfine)

    return () => {
      window.removeEventListener('resize', clampToConfine)
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'panel' || !panelListResizing) {
      return
    }

    const onPointerMove = (event: PointerEvent) => {
      const session = resizeSessionRef.current
      if (!session) {
        return
      }

      const delta = event.clientY - session.startY
      const desiredHeight = session.startHeight + delta
      const maxHeightPx = Math.max(
        inventoryPanelMinHeightPx,
        Math.floor(window.innerHeight - uiConfineBottomPx - session.topOffsetPx - session.chromeHeightPx),
      )
      setPanelListHeightPx(clampPanelInventoryHeight(desiredHeight, maxHeightPx))
    }

    const onPointerUp = () => {
      setPanelListResizing(false)
      resizeSessionRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [mode, panelListResizing])

  const onPanelResizeHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (mode !== 'panel') {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const container = panelContainerRef.current
    const rect = container?.getBoundingClientRect()
    const topOffsetPx = Math.max(uiConfineTopPx, rect?.top ?? uiConfineTopPx)
    const chromeHeightPx = Math.max(0, (rect?.height ?? panelListHeightPx) - panelListHeightPx)

    resizeSessionRef.current = {
      startY: event.clientY,
      startHeight: panelListHeightPx,
      topOffsetPx,
      chromeHeightPx,
    }
    setPanelListResizing(true)
  }

  if (mode === 'menu') {
    return (
      <div className="ui-stack-sm flex h-full min-h-0 flex-col">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search resource by name or chemistry term"
          className="ui-input-field"
        />
        {controls}
        {!inventoryLoaded && <p className="ui-note">Syncing cargo database...</p>}
        {inventoryLoaded && rows.length === 0 && (
          <p className="ui-note">No matching resources for that search.</p>
        )}
        <div className="ui-surface-card-strong grid grid-cols-5 gap-1.5 ui-note">
          <span className="text-center">H {formatQty(atomCounter.H)}</span>
          <span className="text-center">C {formatQty(atomCounter.C)}</span>
          <span className="text-center">O {formatQty(atomCounter.O)}</span>
          <span className="text-center">Si {formatQty(atomCounter.Si)}</span>
          <span className="text-center">Fe {formatQty(atomCounter.Fe)}</span>
        </div>

        <div className="min-h-0 flex flex-1 flex-col gap-2.5 lg:flex-row">
          <div className="ui-surface-card-strong min-h-0 flex-1 overflow-auto">
            <div className="space-y-3">
              {sections.map((section) => (
                <section key={section.key}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="ui-label">{section.label}</p>
                    <p className="ui-note">{section.items.length} items</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {section.items.map((row) => {
                      const selected = selectedRow?.id === row.id
                      return (
                        <button
                          key={row.id}
                          onClick={() => setSelectedResourceId(row.id)}
                          className={`rounded p-2 text-left transition-colors ${
                            selected
                              ? 'bg-slate-200/15 text-slate-100'
                              : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <ResourceIcon resourceId={row.id} size={38} />
                            <span className="ui-pill">{formatQty(row.count)}</span>
                          </div>
                          <p className="ui-body-copy font-semibold text-slate-100">{row.label}</p>
                          <p className="ui-note mt-0.5">{row.unit}</p>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <aside className="ui-surface-card-strong min-h-[240px] lg:min-h-0 lg:w-[320px] lg:flex-none">
            {!selectedRow && <p className="ui-note">Select a resource to inspect details.</p>}
            {selectedRow && (
              <div className="ui-stack-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ResourceIcon resourceId={selectedRow.id} size={46} />
                    <div>
                      <p className="ui-title">{selectedRow.label}</p>
                      <p className="ui-note">{selectedRow.unit}</p>
                    </div>
                  </div>
                  <span className="ui-pill">Owned {formatQty(selectedRow.count)}</span>
                </div>

                <div className="ui-surface-card">
                  <p className="ui-label mb-1">Category</p>
                  <p className="ui-body-copy">{resourcePresentationById[selectedRow.id].category}</p>
                </div>

                <div className="ui-surface-card">
                  <p className="ui-label mb-1">Purpose</p>
                  <p className="ui-body-copy">{resourcePresentationById[selectedRow.id].primaryUse}</p>
                </div>

                <div className="ui-surface-card">
                  <p className="ui-label mb-1">Source</p>
                  <p className="ui-body-copy">{resourcePresentationById[selectedRow.id].whereFound}</p>
                </div>

                <div className="ui-surface-card">
                  <p className="ui-label mb-1">Description</p>
                  <p className="ui-body-copy">{selectedRow.description}</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div ref={panelContainerRef} className="ui-stack-sm flex h-full flex-col">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search resource by name"
        className="ui-input-field"
      />
      {controls}
      {!inventoryLoaded && <p className="ui-note">Syncing cargo database...</p>}
      {inventoryLoaded && rows.length === 0 && (
        <p className="ui-note">No resources yet. Mine asteroids and process rubble.</p>
      )}
      <div className="ui-surface-card-strong grid grid-cols-5 gap-1.5 ui-note">
        <span className="text-center">H {formatQty(atomCounter.H)}</span>
        <span className="text-center">C {formatQty(atomCounter.C)}</span>
        <span className="text-center">O {formatQty(atomCounter.O)}</span>
        <span className="text-center">Si {formatQty(atomCounter.Si)}</span>
        <span className="text-center">Fe {formatQty(atomCounter.Fe)}</span>
      </div>
      <div
        ref={parentRef}
        className="ui-surface-card-strong overflow-auto"
        style={{ height: `${panelListHeightPx}px` }}
      >
        <div style={{ height: `${virtualizer.getTotalSize()}px` }} className="relative w-full">
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const entry = virtualEntries[virtualRow.index]

            if (entry.kind === 'section') {
              return (
                <div
                  key={entry.key}
                  className="absolute left-0 top-0 flex w-full items-center px-2.5 py-1.5"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: `${virtualRow.size}px`,
                  }}
                >
                  <p className="ui-label">{entry.label}</p>
                </div>
              )
            }

            return (
              <div
                key={entry.key}
                className="absolute left-0 top-0 flex w-full items-center justify-between gap-2 px-2.5 py-1.5"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                }}
              >
                <div className="flex min-w-0 items-center gap-2 pr-2">
                  <ResourceIcon resourceId={entry.row.id} size={32} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="ui-body-copy truncate font-semibold text-slate-100">{entry.row.label}</p>
                    <p className="ui-note">{entry.row.unit}</p>
                  </div>
                </div>
                <span className="ui-pill">{formatQty(entry.row.count)}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div
        onPointerDown={onPanelResizeHandlePointerDown}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize inventory height"
        title="Drag to resize inventory height"
        className={`flex h-3 cursor-row-resize items-center justify-center rounded-md ${
          panelListResizing ? 'bg-slate-700/70' : 'bg-slate-900/45 hover:bg-slate-800/65'
        }`}
      >
        <span className="h-0.5 w-10 rounded bg-slate-300/65" />
      </div>
    </div>
  )
}

