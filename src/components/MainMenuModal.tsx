import { useState } from 'react'
import type { SaveSlotSummary } from '@state/runtime/saveSlotPersistence'

type MainMenuView = 'main' | 'save' | 'load'
type SlotAction = 'save' | 'load' | 'rename'

interface MainMenuModalProps {
  canContinue: boolean
  canManageSaves: boolean
  saveSlots: SaveSlotSummary[]
  saveSlotsLoading: boolean
  statusMessage: string | null
  onContinue: () => void
  onStartNewGame: () => void
  onSaveToSlot: (slotId: number) => Promise<void>
  onLoadFromSlot: (slotId: number) => Promise<void>
  onRenameSlot: (slotId: number, nextName: string) => Promise<void>
}

function menuActionClass(disabled: boolean): string {
  return [
    'ui-action-button w-full justify-center rounded py-2.5 text-sm font-semibold tracking-[0.06em] uppercase transition-colors',
    disabled
      ? 'cursor-not-allowed bg-slate-900/40 text-slate-500'
      : 'bg-slate-200/15 text-slate-100 hover:bg-slate-200/25',
  ].join(' ')
}

function smallActionClass(disabled: boolean, emphasis: 'primary' | 'neutral'): string {
  const styleClass = emphasis === 'primary'
    ? 'bg-[#78ef00]/25 text-[#d9ffb7] hover:bg-[#78ef00]/35'
    : 'bg-slate-200/10 text-slate-200 hover:bg-slate-200/20'

  return [
    'ui-action-button rounded px-2.5 py-1.5 text-[0.68rem] font-semibold tracking-[0.05em] uppercase transition-colors',
    disabled ? 'cursor-not-allowed bg-slate-900/40 text-slate-500' : styleClass,
  ].join(' ')
}

function formatSlotTimestamp(timestamp: number | null): string {
  if (timestamp === null) {
    return 'Empty'
  }

  return new Date(timestamp).toLocaleString()
}

export function MainMenuModal({
  canContinue,
  canManageSaves,
  saveSlots,
  saveSlotsLoading,
  statusMessage,
  onContinue,
  onStartNewGame,
  onSaveToSlot,
  onLoadFromSlot,
  onRenameSlot,
}: MainMenuModalProps) {
  const [view, setView] = useState<MainMenuView>('main')
  const [pendingAction, setPendingAction] = useState<{ slotId: number; action: SlotAction } | null>(null)
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null)
  const [slotNameDraft, setSlotNameDraft] = useState('')

  const openSlotView = (nextView: MainMenuView) => {
    setView(nextView)
    setEditingSlotId(null)
    setSlotNameDraft('')
  }

  const runSlotAction = async (
    slotId: number,
    action: SlotAction,
    callback: () => Promise<void>,
  ) => {
    setPendingAction({ slotId, action })
    try {
      await callback()
    } finally {
      setPendingAction(null)
    }
  }

  const saveLoadView = view === 'save' || view === 'load'
  const slotActionTitle = view === 'save' ? 'Save Game' : 'Load Game'

  return (
    <div className="pointer-events-auto absolute inset-0 z-[72] flex items-center justify-center bg-black/92 px-4 py-6">
      <section className={`panel-shell ui-stack-sm rounded-xl p-5 ${saveLoadView ? 'w-[min(920px,100%)] max-h-[80vh]' : 'w-[min(520px,100%)]'}`}>
        <header className="space-y-1 pb-1">
          <div className="flex items-center justify-between gap-3">
            <p className="panel-heading">{saveLoadView ? slotActionTitle : 'Main Menu'}</p>
            {saveLoadView && (
              <button
                onClick={() => openSlotView('main')}
                className={smallActionClass(false, 'neutral')}
              >
                Back
              </button>
            )}
          </div>
          <p className="ui-note">
            {saveLoadView
              ? 'Select one of 10 save slots. Renamed slots help organize milestones.'
              : 'Esc resumes the current run when available.'}
          </p>
        </header>

        {view === 'main' ? (
          <div className="space-y-2.5">
            {canContinue && (
              <button onClick={onContinue} className={menuActionClass(false)}>
                Continue
              </button>
            )}

            <button
              onClick={onStartNewGame}
              className={menuActionClass(false)}
            >
              Start New Game
            </button>

            {canManageSaves && (
              <>
                <button
                  onClick={() => openSlotView('save')}
                  className={menuActionClass(false)}
                >
                  Save Game
                </button>
                <button
                  onClick={() => openSlotView('load')}
                  className={menuActionClass(false)}
                >
                  Load Game
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {saveSlotsLoading ? (
              <div className="panel-shell rounded-md px-3 py-2.5">
                <p className="ui-note text-slate-200">Loading save slots...</p>
              </div>
            ) : (
              <div className="grid max-h-[58vh] grid-cols-1 gap-2.5 overflow-y-auto pr-1 md:grid-cols-2">
                {saveSlots.map((slot) => {
                  const isPendingSave = pendingAction?.slotId === slot.slotId && pendingAction.action === 'save'
                  const isPendingLoad = pendingAction?.slotId === slot.slotId && pendingAction.action === 'load'
                  const isPendingRename = pendingAction?.slotId === slot.slotId && pendingAction.action === 'rename'
                  const hasPendingAction = isPendingSave || isPendingLoad || isPendingRename
                  const editingName = editingSlotId === slot.slotId
                  const loadDisabled = !slot.hasData || hasPendingAction
                  const mainActionLabel = view === 'save'
                    ? slot.hasData ? 'Overwrite' : 'Save'
                    : 'Load'

                  return (
                    <article key={slot.slotId} className="panel-shell rounded-md px-3 py-2.5">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="ui-note text-slate-200">Slot {slot.slotId.toString().padStart(2, '0')}</p>
                        <p className="ui-note text-slate-400">{formatSlotTimestamp(slot.updatedAt)}</p>
                      </div>

                      {editingName ? (
                        <div className="mb-2 flex items-center gap-1.5">
                          <input
                            value={slotNameDraft}
                            onChange={(event) => setSlotNameDraft(event.target.value)}
                            className="w-full rounded bg-slate-950/70 px-2 py-1.5 text-sm text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-[#78ef00]/70"
                            maxLength={28}
                          />
                          <button
                            onClick={() => {
                              void runSlotAction(slot.slotId, 'rename', async () => {
                                await onRenameSlot(slot.slotId, slotNameDraft)
                                setEditingSlotId(null)
                                setSlotNameDraft('')
                              })
                            }}
                            className={smallActionClass(isPendingRename, 'primary')}
                            disabled={isPendingRename}
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => {
                              setEditingSlotId(null)
                              setSlotNameDraft('')
                            }}
                            className={smallActionClass(false, 'neutral')}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p className="mb-1.5 truncate text-sm font-semibold text-slate-100">
                          {slot.name}
                        </p>
                      )}

                      <p className="ui-note mb-2 min-h-[1.2rem] text-slate-300">
                        {slot.hasData
                          ? `${slot.activeSectorId ?? 'Unknown sector'} - ${(slot.credits ?? 0).toFixed(1)} credits`
                          : 'No save captured yet.'}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            if (view === 'save') {
                              void runSlotAction(slot.slotId, 'save', () => onSaveToSlot(slot.slotId))
                              return
                            }

                            void runSlotAction(slot.slotId, 'load', () => onLoadFromSlot(slot.slotId))
                          }}
                          className={smallActionClass(view === 'load' ? loadDisabled : hasPendingAction, 'primary')}
                          disabled={view === 'load' ? loadDisabled : hasPendingAction}
                        >
                          {isPendingSave || isPendingLoad ? 'Working...' : mainActionLabel}
                        </button>
                        <button
                          onClick={() => {
                            setEditingSlotId(slot.slotId)
                            setSlotNameDraft(slot.name)
                          }}
                          className={smallActionClass(!slot.hasData || hasPendingAction, 'neutral')}
                          disabled={!slot.hasData || hasPendingAction}
                        >
                          Rename
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {statusMessage && (
          <footer className="panel-shell rounded-md px-3 py-2">
            <p className="ui-note text-slate-200">{statusMessage}</p>
          </footer>
        )}
      </section>
    </div>
  )
}

