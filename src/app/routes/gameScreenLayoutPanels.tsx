import { type DragEvent, type ReactNode } from 'react'
import type { GameModalSection } from '@components/GameModal'
import { TutorialOverlay } from '@components/TutorialOverlay'
import { ActionsPanel } from '@components/panels/ActionsPanel'
import { HudPanel } from '@components/panels/HudPanel'
import { InventoryPanel } from '@components/panels/InventoryPanel'
import { ObjectPanel } from '@components/panels/ObjectPanel'
import type { DockSide, PanelId, UiDensity, WorkspacePreset } from '@state/types'
import { workspacePresets } from '@app/routes/workspacePresets'

const panelLabels: Record<PanelId, string> = {
  tutorial: 'Quests',
  inventory: 'Inventory',
  object: 'Object',
  hud: 'HUD + Radar',
  actions: 'Actions',
}

function DockPanel({
  panelId,
  title,
  side,
  density,
  children,
  headerActions,
  onHide,
  onSwapSide,
  onPanelDragStart,
  onPanelDragEnd,
}: {
  panelId: PanelId
  title: string
  side: DockSide
  density: UiDensity
  children: ReactNode
  headerActions?: ReactNode
  onHide: () => void
  onSwapSide: () => void
  onPanelDragStart: (panelId: PanelId) => void
  onPanelDragEnd: () => void
}) {
  const onDragStart = (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-panel', panelId)
    onPanelDragStart(panelId)
  }

  const onDragEnd = () => {
    onPanelDragEnd()
  }

  return (
    <section
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`panel-shell pointer-events-auto rounded-xl ${density === 'compact' ? 'p-2' : 'p-2.5'}`}
    >
      <header
        className={`flex items-center justify-between gap-2.5 ${density === 'compact' ? 'mb-1.5' : 'mb-2.5'}`}
      >
        <p className="panel-heading">{title}</p>
        <div className="flex items-center gap-1">
          {headerActions}
          <button onClick={onSwapSide} className="ui-action-button-sm bg-slate-900/70 text-slate-200 hover:bg-slate-800/80">
            {side === 'left' ? 'R' : 'L'}
          </button>
          <button onClick={onHide} className="ui-action-button-sm bg-slate-900/70 text-slate-200 hover:bg-slate-800/80">
            Hide
          </button>
        </div>
      </header>
      {children}
    </section>
  )
}

export function DockSidebar({
  side,
  panelIds,
  hiddenPanels,
  panelSlotHints,
  movePanel,
  togglePanelVisibility,
  rightInset,
  uiDensity,
  draggingPanelId,
  dragPreview,
  onDragPreviewChange,
  onPanelDragStart,
  onPanelDragEnd,
  selectedScene,
  onSwitchScene,
  gameMenuSection,
  onOpenGameMenuSection,
}: {
  side: DockSide
  panelIds: PanelId[]
  hiddenPanels: PanelId[]
  panelSlotHints: Partial<Record<PanelId, number>>
  movePanel: (
    panelId: PanelId,
    nextSide: DockSide,
    beforePanelId?: PanelId | null,
    targetSlot?: number | null,
  ) => void
  togglePanelVisibility: (panelId: PanelId) => void
  rightInset: string
  uiDensity: UiDensity
  draggingPanelId: PanelId | null
  dragPreview: { side: DockSide; beforePanelId: PanelId | null; targetSlot: number } | null
  onDragPreviewChange: (preview: { side: DockSide; beforePanelId: PanelId | null; targetSlot: number } | null) => void
  onPanelDragStart: (panelId: PanelId) => void
  onPanelDragEnd: () => void
  selectedScene: 'space' | 'interior'
  onSwitchScene: (nextScene: 'space' | 'interior') => void
  gameMenuSection: GameModalSection | null
  onOpenGameMenuSection: (section: GameModalSection) => void
}) {
  const slotHeightPx = uiDensity === 'compact' ? 32 : 36
  const dockTopInsetPx = 12
  const dockBottomInsetPx = 16
  const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight
  const availableDockHeight = Math.max(220, viewportHeight - dockTopInsetPx - dockBottomInsetPx)
  const maxSlot = Math.max(0, Math.floor(availableDockHeight / slotHeightPx))

  const resolveBeforePanelId = (event: DragEvent<HTMLElement>): PanelId | null => {
    const slots = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-panel-item="true"]'))
    for (const slot of slots) {
      const candidateId = slot.dataset.panelId as PanelId | undefined
      if (!candidateId || candidateId === draggingPanelId) {
        continue
      }

      const rect = slot.getBoundingClientRect()
      if (event.clientY < rect.top + rect.height * 0.5) {
        return candidateId
      }
    }

    return null
  }

  const resolveTargetSlot = (event: DragEvent<HTMLElement>): number => {
    const rect = event.currentTarget.getBoundingClientRect()
    const maxSlotFromRect = Math.max(0, Math.floor(rect.height / slotHeightPx))
    const rawSlot = Math.max(0, Math.floor((event.clientY - rect.top) / slotHeightPx))
    return Math.min(maxSlot, maxSlotFromRect, rawSlot)
  }

  const resolveShouldSnap = (event: DragEvent<HTMLElement>): boolean => {
    const target = event.target as HTMLElement | null
    const panelItem = target?.closest<HTMLElement>('[data-panel-item="true"]')
    if (!panelItem) {
      return false
    }

    const targetPanelId = panelItem.dataset.panelId as PanelId | undefined
    return Boolean(targetPanelId && targetPanelId !== draggingPanelId)
  }

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const panelId = event.dataTransfer.getData('application/x-panel') as PanelId
    if (panelId) {
      const beforePanelId = resolveBeforePanelId(event)
      const shouldSnap = resolveShouldSnap(event)
      const targetSlot = shouldSnap ? -1 : resolveTargetSlot(event)
      movePanel(panelId, side, beforePanelId, targetSlot < 0 ? null : targetSlot)
    }

    onDragPreviewChange(null)
    onPanelDragEnd()
  }

  const visiblePanelIds = panelIds.filter((panelId) => !hiddenPanels.includes(panelId))
  const verticalClass = uiDensity === 'compact' ? 'top-2.5 bottom-3 gap-1' : 'top-2.5 bottom-3 gap-2'
  const widthClass = 'w-[clamp(284px,22vw,340px)]'
  const activeSnapPreview = dragPreview?.side === side && dragPreview.targetSlot < 0
  const activeBeforePanelId = activeSnapPreview ? dragPreview.beforePanelId : null
  const dropZoneActive = dragPreview?.side === side
  const resolvedLayout = visiblePanelIds.reduce<{
    slotCursor: number
    items: Array<{ panelId: PanelId; marginTopPx: number }>
  }>(
    (acc, panelId) => {
      const hintedSlot = panelSlotHints[panelId]
      const boundedHintedSlot =
        typeof hintedSlot === 'number' ? Math.min(maxSlot, Math.max(0, Math.floor(hintedSlot))) : undefined
      const preferredSlot =
        typeof boundedHintedSlot === 'number'
          ? Math.max(acc.slotCursor, boundedHintedSlot)
          : acc.slotCursor
      const slot = Math.min(maxSlot, preferredSlot)
      const gapUnits = Math.max(0, slot - acc.slotCursor)

      return {
        slotCursor: Math.min(maxSlot, slot + 1),
        items: [...acc.items, { panelId, marginTopPx: gapUnits * slotHeightPx }],
      }
    },
    { slotCursor: 0, items: [] },
  ).items

  return (
    <aside
      onDragOver={(event) => {
        if (draggingPanelId) {
          event.preventDefault()
          const beforePanelId = resolveBeforePanelId(event)
          const shouldSnap = resolveShouldSnap(event)
          const targetSlot = shouldSnap ? -1 : resolveTargetSlot(event)
          onDragPreviewChange({ side, beforePanelId, targetSlot })
        }
      }}
      onDragLeave={(event) => {
        if (!draggingPanelId) {
          return
        }

        const current = event.currentTarget
        const next = event.relatedTarget as Node | null
        if (next && current.contains(next)) {
          return
        }

        onDragPreviewChange(null)
      }}
      onDrop={onDrop}
      className={`absolute z-20 flex flex-col overflow-hidden ${verticalClass} ${widthClass} ${
        draggingPanelId ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      style={{
        ...(side === 'left' ? { left: '0.75rem' } : { right: rightInset }),
        outline: dropZoneActive ? '1px solid rgba(226, 232, 240, 0.55)' : 'none',
        borderRadius: '0.55rem',
      }}
    >
      {resolvedLayout.map(({ panelId, marginTopPx }) => {
        const showInsertBefore = Boolean(draggingPanelId && activeSnapPreview && activeBeforePanelId === panelId)

        if (panelId === 'inventory') {
          return (
            <div key={panelId} data-panel-item="true" data-panel-id={panelId} style={{ marginTop: `${marginTopPx}px` }}>
              {showInsertBefore && <div className="mb-1 h-1 rounded bg-slate-100/75" />}
              <DockPanel
                panelId={panelId}
                title={panelLabels[panelId]}
                side={side}
                density={uiDensity}
                onHide={() => togglePanelVisibility(panelId)}
                onSwapSide={() => movePanel(panelId, side === 'left' ? 'right' : 'left')}
                onPanelDragStart={onPanelDragStart}
                onPanelDragEnd={onPanelDragEnd}
              >
                <InventoryPanel />
              </DockPanel>
            </div>
          )
        }

        if (panelId === 'object') {
          return (
            <div key={panelId} data-panel-item="true" data-panel-id={panelId} style={{ marginTop: `${marginTopPx}px` }}>
              {showInsertBefore && <div className="mb-1 h-1 rounded bg-slate-100/75" />}
              <DockPanel
                panelId={panelId}
                title={panelLabels[panelId]}
                side={side}
                density={uiDensity}
                onHide={() => togglePanelVisibility(panelId)}
                onSwapSide={() => movePanel(panelId, side === 'left' ? 'right' : 'left')}
                onPanelDragStart={onPanelDragStart}
                onPanelDragEnd={onPanelDragEnd}
              >
                <ObjectPanel />
              </DockPanel>
            </div>
          )
        }

        if (panelId === 'tutorial') {
          return (
            <div key={panelId} data-panel-item="true" data-panel-id={panelId} style={{ marginTop: `${marginTopPx}px` }}>
              {showInsertBefore && <div className="mb-1 h-1 rounded bg-slate-100/75" />}
              <DockPanel
                panelId={panelId}
                title={panelLabels[panelId]}
                side={side}
                density={uiDensity}
                onHide={() => togglePanelVisibility(panelId)}
                onSwapSide={() => movePanel(panelId, side === 'left' ? 'right' : 'left')}
                onPanelDragStart={onPanelDragStart}
                onPanelDragEnd={onPanelDragEnd}
              >
                <TutorialOverlay
                  docked
                  gameMenuSection={gameMenuSection}
                  onOpenGameMenuSection={onOpenGameMenuSection}
                />
              </DockPanel>
            </div>
          )
        }

        if (panelId === 'actions') {
          return (
            <div key={panelId} data-panel-item="true" data-panel-id={panelId} style={{ marginTop: `${marginTopPx}px` }}>
              {showInsertBefore && <div className="mb-1 h-1 rounded bg-slate-100/75" />}
              <DockPanel
                panelId={panelId}
                title={panelLabels[panelId]}
                side={side}
                density={uiDensity}
                onHide={() => togglePanelVisibility(panelId)}
                onSwapSide={() => movePanel(panelId, side === 'left' ? 'right' : 'left')}
                onPanelDragStart={onPanelDragStart}
                onPanelDragEnd={onPanelDragEnd}
              >
                <ActionsPanel />
              </DockPanel>
            </div>
          )
        }

        return (
          <div key={panelId} data-panel-item="true" data-panel-id={panelId} style={{ marginTop: `${marginTopPx}px` }}>
            {showInsertBefore && <div className="mb-1 h-1 rounded bg-slate-100/75" />}
            <DockPanel
              panelId={panelId}
              title={panelLabels[panelId]}
              side={side}
              density={uiDensity}
              headerActions={(
                <button
                  onClick={() => onSwitchScene(selectedScene === 'space' ? 'interior' : 'space')}
                  className="ui-action-button-sm bg-slate-900/70 text-slate-200 hover:bg-slate-800/80"
                >
                  {selectedScene === 'space' ? 'Ship Interior' : 'Flight Exterior'}
                </button>
              )}
              onHide={() => togglePanelVisibility(panelId)}
              onSwapSide={() => movePanel(panelId, side === 'left' ? 'right' : 'left')}
              onPanelDragStart={onPanelDragStart}
              onPanelDragEnd={onPanelDragEnd}
            >
              <HudPanel />
            </DockPanel>
          </div>
        )
      })}
      {draggingPanelId && activeSnapPreview && activeBeforePanelId === null && (
        <div className="mt-1 h-1 rounded bg-slate-100/75" />
      )}
    </aside>
  )
}

export function WorkspaceCustomizer({
  open,
  rightOffset,
  uiDensity,
  panelOpacity,
  onSetDensity,
  onSetOpacity,
  onPreset,
  onReset,
  onClose,
}: {
  open: boolean
  rightOffset: string
  uiDensity: UiDensity
  panelOpacity: number
  onSetDensity: (density: UiDensity) => void
  onSetOpacity: (opacity: number) => void
  onPreset: (preset: WorkspacePreset) => void
  onReset: () => void
  onClose: () => void
}) {
  if (!open) {
    return null
  }

  return (
    <aside
      className="panel-shell pointer-events-auto absolute top-[5.15rem] z-40 w-[min(520px,calc(100%-1.5rem))] rounded-xl p-3.5"
      style={{ right: rightOffset }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="panel-heading">Workspace</p>
          <p className="ui-note">Quick customization for layout and readability.</p>
        </div>
        <button onClick={onClose} className="ui-action-button-sm rounded bg-slate-900/80 text-slate-200 hover:bg-slate-800/80">
          Close
        </button>
      </div>

      <div className="ui-surface-card mb-3">
        <p className="ui-label mb-2">Presets</p>
        <div className="flex flex-wrap gap-1">
          {workspacePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onPreset(preset.id)}
              className="ui-action-button-sm rounded bg-slate-900/80 text-slate-300 transition-colors hover:bg-slate-800/80"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ui-surface-card">
        <p className="ui-label mb-2">Appearance</p>
        <div className="mb-2 flex flex-wrap gap-1">
          <button
            onClick={() => onSetDensity('compact')}
            className={`ui-action-button-sm transition-colors ${
              uiDensity === 'compact'
                ? 'bg-slate-100/15 text-slate-100'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800/80'
            }`}
          >
            Compact
          </button>
          <button
            onClick={() => onSetDensity('comfortable')}
            className={`ui-action-button-sm transition-colors ${
              uiDensity === 'comfortable'
                ? 'bg-slate-100/15 text-slate-100'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800/80'
            }`}
          >
            Comfortable
          </button>
        </div>
        <label className="ui-body-copy block">
          Panel Opacity: {(panelOpacity * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min={45}
          max={98}
          step={1}
          value={Math.round(panelOpacity * 100)}
          onChange={(event) => onSetOpacity(Number(event.target.value) / 100)}
          className="w-full"
        />
        <button onClick={onReset} className="ui-action-button mt-2 rounded bg-slate-900/80 text-slate-200 hover:bg-slate-800/80">
          Reset Workspace
        </button>
      </div>
    </aside>
  )
}
