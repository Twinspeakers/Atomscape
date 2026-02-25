import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  buildQuestProgressModel,
  CONTROL_SHIP_QUEST_ID,
  GALAXY_BAR_AUTOMATION_SIDE_QUEST_ID,
  type QuestProgressView,
} from '@features/quests/questDefinitions'
import { gameDb } from '@platform/db/gameDb'
import * as questUiSelectors from '@state/selectors/questUiSelectors'
import { useAppStore, worldSessionRowIdForSector } from '@state/store'
import type { GameMenuSection } from '@state/types'
import { StructuredText } from './ui/StructuredText'
import {
  orderedSectors,
  resolveSectorWorldTargetCount,
  TRAINING_SECTOR_ID,
  type SectorId,
} from '@domain/spec/sectorSpec'
import type { SectorMapTelemetry } from '@features/viewport/types'

export type GameModalSection = GameMenuSection

interface GameModalProps {
  section: GameModalSection
  onSectionChange: (section: GameModalSection) => void
  onClose: () => void
}

function tabClass(active: boolean): string {
  return [
    'ui-action-button transition-colors',
    active
      ? 'bg-slate-200/15 text-slate-100'
      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800/80',
  ].join(' ')
}

function statusClass(step: { completed: boolean; current: boolean }): string {
  if (step.completed) {
    return 'bg-slate-900/35 text-slate-300'
  }

  if (step.current) {
    return 'bg-slate-800/55 text-slate-100'
  }

  return 'bg-slate-950/40 text-slate-300'
}

function questTypeClass(type: 'Main Quest' | 'Side Quest'): string {
  return [
    'ui-status-tag',
    type === 'Main Quest'
      ? 'bg-slate-700/40 text-slate-100'
      : 'bg-slate-900/40 text-slate-300',
  ].join(' ')
}

function questTypeLabel(type: 'Main Quest' | 'Side Quest'): string {
  return type === 'Main Quest' ? 'Main' : 'Side'
}

function questProgressBadge(quest: QuestProgressView): { label: string; color: string } {
  if (quest.completed) {
    return {
      label: 'Complete',
      color: '#78ef00',
    }
  }

  const hasProgress = quest.current || quest.steps.some((step) => step.completed)
  if (hasProgress) {
    return {
      label: 'In Progress',
      color: '#d89a2b',
    }
  }

  return {
    label: 'Not Started',
    color: '#f87171',
  }
}

function summarizeStepText(text: string, limit = 150): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= limit) {
    return compact
  }

  return `${compact.slice(0, limit).trimEnd()}...`
}

function galaxyBarCounterColor(value: number): string {
  if (value <= 0) {
    return '#f87171'
  }

  if (value < 100) {
    return '#d89a2b'
  }

  return '#78ef00'
}

const InventoryPanel = lazy(async () => {
  const module = await import('./panels/InventoryPanel')
  return { default: module.InventoryPanel }
})

const ShipOverlay = lazy(async () => {
  const module = await import('./overlay/ShipOverlay')
  return { default: module.ShipOverlay }
})

const LaboratoryOverlay = lazy(async () => {
  const module = await import('./overlay/LaboratoryOverlay')
  return { default: module.LaboratoryOverlay }
})

const StationOverlay = lazy(async () => {
  const module = await import('./overlay/StationOverlay')
  return { default: module.StationOverlay }
})

const StoreOverlay = lazy(async () => {
  const module = await import('./overlay/StoreOverlay')
  return { default: module.StoreOverlay }
})

const CrewOverlay = lazy(async () => {
  const module = await import('./overlay/CrewOverlay')
  return { default: module.CrewOverlay }
})

const FailuresOverlay = lazy(async () => {
  const module = await import('./overlay/FailuresOverlay')
  return { default: module.FailuresOverlay }
})

const LogOverlay = lazy(async () => {
  const module = await import('./overlay/LogOverlay')
  return { default: module.LogOverlay }
})

const WikiOverlay = lazy(async () => {
  const module = await import('./overlay/WikiOverlay')
  return { default: module.WikiOverlay }
})

const sectionLoadingFallback = (
  <div className="ui-surface-card ui-note">
    Loading section...
  </div>
)

export function GameModal({ section, onSectionChange, onClose }: GameModalProps) {
  const tutorialChecklist = useAppStore(questUiSelectors.selectTutorialChecklist)
  const tutorialCurrentStepIndex = useAppStore(questUiSelectors.selectTutorialCurrentStepIndex)
  const tutorialComplete = useAppStore(questUiSelectors.selectTutorialComplete)
  const inventory = useAppStore(questUiSelectors.selectInventory)
  const energy = useAppStore(questUiSelectors.selectEnergy)
  const credits = useAppStore(questUiSelectors.selectCredits)
  const galaxyBarsCrafted = useAppStore(questUiSelectors.selectGalaxyBarsCrafted)
  const activeSectorId = useAppStore(questUiSelectors.selectActiveSectorId)
  const worldDestroyedCount = useAppStore(questUiSelectors.selectWorldDestroyedCount)
  const worldRemainingCount = useAppStore(questUiSelectors.selectWorldRemainingCount)
  const worldVisitedZoneIds = useAppStore(questUiSelectors.selectWorldVisitedZoneIds)
  const jumpToSector = useAppStore(questUiSelectors.selectJumpToSector)
  const activeMainQuestId = useAppStore(questUiSelectors.selectActiveMainQuestId)
  const pinnedQuestIds = useAppStore(questUiSelectors.selectPinnedQuestIds)
  const questRewardHistory = useAppStore(questUiSelectors.selectQuestRewardHistory)
  const claimedQuestRewardIds = useAppStore(questUiSelectors.selectClaimedQuestRewardIds)
  const toggleQuestPin = useAppStore(questUiSelectors.selectToggleQuestPin)
  const setActiveMainQuest = useAppStore(questUiSelectors.selectSetActiveMainQuest)
  const [expandedQuestState, setExpandedQuestState] = useState<Record<string, boolean>>({})
  const [expandedStepState, setExpandedStepState] = useState<Record<string, boolean>>({})
  const [sectorTelemetryById, setSectorTelemetryById] = useState<Partial<Record<SectorId, SectorMapTelemetry>>>({})
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 })
  const dragStateRef = useRef<{
    originX: number
    originY: number
    pointerStartX: number
    pointerStartY: number
  } | null>(null)

  const questRows = useMemo(
    () =>
      buildQuestProgressModel({
        tutorialChecklist,
        tutorialCurrentStepIndex,
        tutorialComplete,
        activeMainQuestId,
        inventory,
        credits,
        energy,
        galaxyBarsCrafted,
      }),
    [
      tutorialChecklist,
      tutorialCurrentStepIndex,
      tutorialComplete,
      activeMainQuestId,
      inventory,
      credits,
      energy,
      galaxyBarsCrafted,
    ],
  )

  const isStepExpanded = (questId: string, step: { id: string; current: boolean }): boolean => {
    const key = `${questId}:${step.id}`
    const explicitValue = expandedStepState[key]
    if (typeof explicitValue === 'boolean') {
      return explicitValue
    }

    return step.current
  }

  const toggleStepExpanded = (questId: string, step: { id: string; current: boolean }): void => {
    const key = `${questId}:${step.id}`
    setExpandedStepState((current) => {
      const explicitValue = current[key]
      const baseValue = typeof explicitValue === 'boolean' ? explicitValue : step.current
      return {
        ...current,
        [key]: !baseValue,
      }
    })
  }

  const isQuestExpanded = (questId: string): boolean => expandedQuestState[questId] === true

  const toggleQuestExpanded = (questId: string): void => {
    setExpandedQuestState((current) => ({
      ...current,
      [questId]: !(current[questId] === true),
    }))
  }

  const recentRewardHistory = useMemo(
    () => questRewardHistory.slice(-8).reverse(),
    [questRewardHistory],
  )
  const mapSectors = useMemo(
    () => orderedSectors.filter((sectorDef) => sectorDef.id !== TRAINING_SECTOR_ID),
    [],
  )
  const completedQuestCount = useMemo(
    () => questRows.filter((quest) => quest.completed).length,
    [questRows],
  )
  const controlQuestComplete = claimedQuestRewardIds.includes(CONTROL_SHIP_QUEST_ID)

  useEffect(() => {
    if (section !== 'map') {
      return
    }

    let cancelled = false

    const loadSectorTelemetry = async () => {
      const entries = await Promise.all(
        mapSectors.map(async (sectorDef) => {
          const worldTargetCount = resolveSectorWorldTargetCount(sectorDef.id)
          const persisted = await gameDb.worldSession.get(worldSessionRowIdForSector(sectorDef.id))
          const persistedDepletedCount = Array.isArray(persisted?.depletedTargetIds)
            ? persisted.depletedTargetIds.length
            : 0
          const persistedDestroyedCount = Math.max(
            0,
            Math.floor(Number(persisted?.destroyedCount ?? persistedDepletedCount)),
          )
          const fallbackDestroyedCount = sectorDef.id === activeSectorId ? worldDestroyedCount : persistedDestroyedCount
          const worldDestroyed = Math.min(worldTargetCount, fallbackDestroyedCount)
          const worldRemaining = sectorDef.id === activeSectorId
            ? worldRemainingCount
            : Math.max(0, worldTargetCount - worldDestroyed)
          const visitedZoneCount = sectorDef.id === activeSectorId
            ? worldVisitedZoneIds.length
            : Array.isArray(persisted?.visitedZoneIds)
              ? persisted.visitedZoneIds.length
              : 0

          const telemetry: SectorMapTelemetry = {
            sectorId: sectorDef.id,
            worldSeed: persisted?.seed ?? sectorDef.worldSeed,
            worldTargetCount,
            worldDestroyedCount: worldDestroyed,
            worldRemainingCount: Math.max(0, worldRemaining),
            visitedZoneCount,
            updatedAt: Number.isFinite(Number(persisted?.updatedAt))
              ? Number(persisted?.updatedAt)
              : Date.now(),
            stationName: sectorDef.stationName,
            zoneDefinitions: sectorDef.cleanupZones,
          }

          return [sectorDef.id, telemetry] as const
        }),
      )

      if (cancelled) {
        return
      }

      setSectorTelemetryById(Object.fromEntries(entries) as Partial<Record<SectorId, SectorMapTelemetry>>)
    }

    void loadSectorTelemetry()

    return () => {
      cancelled = true
    }
  }, [
    section,
    activeSectorId,
    mapSectors,
    worldDestroyedCount,
    worldRemainingCount,
    worldVisitedZoneIds.length,
  ])

  useEffect(() => {
    const handleWindowMouseMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) {
        return
      }

      const deltaX = event.clientX - dragState.pointerStartX
      const deltaY = event.clientY - dragState.pointerStartY
      setModalOffset({
        x: dragState.originX + deltaX,
        y: dragState.originY + deltaY,
      })
    }

    const handleWindowMouseUp = () => {
      dragStateRef.current = null
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [])

  const beginModalDrag = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement | null
    if (target?.closest('button, a, input, textarea, select, [role="button"]')) {
      return
    }

    dragStateRef.current = {
      originX: modalOffset.x,
      originY: modalOffset.y,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
    }
    event.preventDefault()
  }, [modalOffset.x, modalOffset.y])

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-transparent px-4 py-5">
      <section
        className="pointer-events-auto panel-shell ui-stack-sm flex h-[min(88vh,800px)] w-[min(1120px,100%)] flex-col rounded-xl p-4"
        style={{ transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)` }}
      >
        <header
          onMouseDown={beginModalDrag}
          className="flex cursor-grab select-none items-center justify-between gap-3 pb-3 active:cursor-grabbing"
        >
          <div>
            <p className="panel-heading">Game Menu</p>
          </div>
          <button
            onClick={onClose}
            className="ui-action-button-sm rounded bg-slate-900/80 text-slate-200 hover:bg-slate-800/80"
          >
            Close
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-1.5">
          <button data-tutorial-focus="game-menu-quests" onClick={() => onSectionChange('quests')} className={tabClass(section === 'quests')}>
            Quests (J)
          </button>
          <button data-tutorial-focus="game-menu-ship" onClick={() => onSectionChange('ship')} className={tabClass(section === 'ship')}>
            Ship (H)
          </button>
          <button data-tutorial-focus="game-menu-inventory" onClick={() => onSectionChange('inventory')} className={tabClass(section === 'inventory')}>
            Inventory (I)
          </button>
          <button
            data-tutorial-focus="game-menu-map"
            onClick={() => onSectionChange('map')}
            className={tabClass(section === 'map')}
          >
            Map (M)
          </button>
          <button
            data-tutorial-focus="game-menu-laboratory"
            onClick={() => onSectionChange('laboratory')}
            className={tabClass(section === 'laboratory')}
          >
            Laboratory (L)
          </button>
          <button
            data-tutorial-focus="game-menu-station"
            onClick={() => onSectionChange('station')}
            className={tabClass(section === 'station')}
          >
            Station (P)
          </button>
          <button
            data-tutorial-focus="game-menu-store"
            onClick={() => onSectionChange('store')}
            className={tabClass(section === 'store')}
          >
            Store (O)
          </button>
          <button data-tutorial-focus="game-menu-crew" onClick={() => onSectionChange('crew')} className={tabClass(section === 'crew')}>
            Crew (C)
          </button>
          <button data-tutorial-focus="game-menu-failures" onClick={() => onSectionChange('failures')} className={tabClass(section === 'failures')}>
            Failure Report
          </button>
          <button data-tutorial-focus="game-menu-log" onClick={() => onSectionChange('log')} className={tabClass(section === 'log')}>
            Log
          </button>
          <button data-tutorial-focus="game-menu-wiki" onClick={() => onSectionChange('wiki')} className={tabClass(section === 'wiki')}>
            Wiki (`)
          </button>
        </div>

        {section === 'ship' && (
          <div className="min-h-0 flex-1">
            <Suspense fallback={sectionLoadingFallback}>
              <ShipOverlay embedded />
            </Suspense>
          </div>
        )}

        {section === 'inventory' && (
          <div className="min-h-0 flex-1">
            <Suspense fallback={sectionLoadingFallback}>
              <InventoryPanel mode="menu" />
            </Suspense>
          </div>
        )}

        {section === 'map' && (
          <div className="ui-content-scroll min-h-0 flex-1 space-y-3 overflow-auto pr-1">
            <div className="ui-surface-card">
              <p className="ui-title">Galaxy Map</p>
              <p className="ui-note mt-1">
                Current Sector: {orderedSectors.find((sectorDef) => sectorDef.id === activeSectorId)?.label ?? activeSectorId}
              </p>
              {!controlQuestComplete && (
                <p className="ui-note text-amber-200">
                  Jump locked: complete Control The Ship to unlock sector travel.
                </p>
              )}
              <p className="ui-note">
                Live Cleanup: {worldDestroyedCount} cleared, {worldRemainingCount} active contacts.
              </p>
              <p className="ui-note">Visited Zones: {worldVisitedZoneIds.length}</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {mapSectors.map((sectorDef) => {
                const active = sectorDef.id === activeSectorId
                const jumpLockedByControlQuest = !controlQuestComplete
                const jumpDisabled = active || jumpLockedByControlQuest
                const telemetry = sectorTelemetryById[sectorDef.id]
                return (
                  <article key={sectorDef.id} className="ui-surface-card-strong ui-stack-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="ui-body-copy font-semibold">{sectorDef.label}</p>
                      <span className={`ui-status-tag ${active ? 'bg-slate-700/40 text-slate-100' : 'bg-slate-900/40 text-slate-300'}`}>
                        {active ? 'Active' : 'Ready'}
                      </span>
                    </div>
                    <p className="ui-note">{sectorDef.description}</p>
                    <p className="ui-note">Station: {telemetry?.stationName ?? sectorDef.stationName}</p>
                    <p className="ui-note">
                      Targets: {telemetry?.worldTargetCount ?? resolveSectorWorldTargetCount(sectorDef.id)}
                    </p>
                    <p className="ui-note">
                      Cleared: {telemetry?.worldDestroyedCount ?? 0} | Remaining: {telemetry?.worldRemainingCount ?? 0}
                    </p>
                    <p className="ui-note">Visited Zones: {telemetry?.visitedZoneCount ?? 0}</p>
                    <p className="ui-note">Seed: {telemetry?.worldSeed ?? sectorDef.worldSeed}</p>
                    <p className="ui-note">
                      Last Sync: {telemetry ? new Date(telemetry.updatedAt).toLocaleString() : 'No data yet'}
                    </p>
                    <button
                      onClick={() => {
                        if (jumpDisabled) {
                          return
                        }

                        void jumpToSector(sectorDef.id)
                      }}
                      className="ui-action-button-sm mt-1"
                      disabled={jumpDisabled}
                    >
                      {active ? 'In Sector' : jumpLockedByControlQuest ? 'Locked' : 'Jump'}
                    </button>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {section === 'laboratory' && (
          <div className="min-h-0 flex-1">
            <Suspense fallback={sectionLoadingFallback}>
              <LaboratoryOverlay embedded />
            </Suspense>
          </div>
        )}

        {section === 'station' && (
          <div className="min-h-0 flex-1">
            <Suspense fallback={sectionLoadingFallback}>
              <StationOverlay embedded />
            </Suspense>
          </div>
        )}

        {section === 'store' && (
          <div className="min-h-0 flex-1">
            <Suspense fallback={sectionLoadingFallback}>
              <StoreOverlay embedded />
            </Suspense>
          </div>
        )}

        {section === 'crew' && (
          <div className="min-h-0 flex-1">
            <Suspense fallback={sectionLoadingFallback}>
              <CrewOverlay embedded />
            </Suspense>
          </div>
        )}

        {section === 'failures' && (
          <div className="min-h-0 flex-1">
            <Suspense fallback={sectionLoadingFallback}>
              <FailuresOverlay embedded />
            </Suspense>
          </div>
        )}

        {section === 'log' && (
          <div className="min-h-0 flex-1">
            <Suspense fallback={sectionLoadingFallback}>
              <LogOverlay embedded />
            </Suspense>
          </div>
        )}

        {section === 'wiki' && (
          <div className="min-h-0 flex-1">
            <Suspense fallback={sectionLoadingFallback}>
              <WikiOverlay embedded />
            </Suspense>
          </div>
        )}

        {section === 'quests' && (
          <div className="ui-content-scroll min-h-0 flex-1 space-y-4 overflow-auto pr-1">
            <div className="ui-surface-card">
              <p className="ui-title">Quests Completed</p>
              <p className="ui-note mt-1">{completedQuestCount}/{questRows.length}</p>
            </div>

            <div className="ui-surface-card ui-stack-xs">
              <p className="ui-label">Recent Reward Deliveries</p>
              {recentRewardHistory.length === 0 && (
                <p className="ui-note">No quest rewards have been delivered in this save yet.</p>
              )}
              {recentRewardHistory.map((entry) => (
                <div key={`${entry.id}-${entry.questId}`} className="ui-surface-card-strong ui-stack-xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="ui-body-copy font-semibold">{entry.questTitle}</p>
                    <p className="ui-note">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {entry.grants.length > 0 && (
                    <p className="ui-note">Attained: {entry.grants.join(', ')}</p>
                  )}
                  {entry.unlocks.length > 0 && (
                    <p className="ui-note">Unlocks: {entry.unlocks.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>

            {questRows.map((quest) => (
              <article key={quest.id} className="ui-surface-card-strong">
                {(() => {
                  const questHasSteps = quest.steps.length > 0
                  const questExpanded = isQuestExpanded(quest.id)
                  const progressBadge = questProgressBadge(quest)
                  const galaxyBarCounterMatch = quest.id === GALAXY_BAR_AUTOMATION_SIDE_QUEST_ID
                    ? quest.summary.match(/\b\d+\/100\b/)
                    : null
                  const questSummaryContent =
                    galaxyBarCounterMatch && galaxyBarCounterMatch.index != null
                      ? (
                          <>
                            {quest.summary.slice(0, galaxyBarCounterMatch.index)}
                            <span style={{ color: galaxyBarCounterColor(galaxyBarsCrafted) }}>
                              {galaxyBarCounterMatch[0]}
                            </span>
                            {quest.summary.slice(galaxyBarCounterMatch.index + galaxyBarCounterMatch[0].length)}
                          </>
                        )
                      : quest.summary

                  return (
                    <>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="ui-title">{quest.title}</p>
                    <p className="ui-subtitle">{questSummaryContent}</p>
                    {quest.rewards.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        <p className="ui-note">Rewards:</p>
                        {quest.rewards.map((reward) => (
                          <p key={reward.id} className="ui-note">
                            {reward.label} - {reward.description}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {questHasSteps && (
                      <button
                        onClick={() => toggleQuestExpanded(quest.id)}
                        className="ui-action-button-sm px-2 py-0.5 text-[11px]"
                      >
                        {questExpanded ? 'Collapse' : 'Expand'}
                      </button>
                    )}
                    {quest.type === 'Main Quest' && (
                      <button
                        onClick={() => setActiveMainQuest(quest.id)}
                        className="ui-action-button-sm px-2 py-0.5 text-[11px]"
                        disabled={quest.current}
                      >
                        {quest.current ? 'Active' : 'Set Active'}
                      </button>
                    )}
                    <button
                      onClick={() => toggleQuestPin(quest.id)}
                      className="ui-action-button-sm px-2 py-0.5 text-[11px]"
                    >
                      {pinnedQuestIds.includes(quest.id) ? 'Unpin' : 'Pin'}
                    </button>
                    <span className={questTypeClass(quest.type)}>{questTypeLabel(quest.type)}</span>
                    <span
                      className="ui-status-tag bg-transparent"
                      style={{ color: progressBadge.color }}
                    >
                      {progressBadge.label}
                    </span>
                  </div>
                </div>

                {questHasSteps && questExpanded && (
                  <div className="space-y-1.5">
                    {quest.steps.map((step, index) => {
                      const expanded = isStepExpanded(quest.id, step)

                      return (
                        <div key={step.id} className={`rounded px-2 py-1.5 ${statusClass(step)}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="ui-body-copy font-semibold">
                              {step.completed ? 'Done' : step.current ? 'Current' : 'Next'} Step {index + 1}: {step.title}
                            </p>
                            <button
                              onClick={() => toggleStepExpanded(quest.id, step)}
                              className="ui-action-button-sm px-2 py-0.5 text-[11px]"
                            >
                              {expanded ? 'Minimize' : 'Expand'}
                            </button>
                          </div>

                          {!expanded && (
                            <p className="ui-note mt-1 text-slate-200">
                              {summarizeStepText(step.description)}
                            </p>
                          )}

                          {expanded && (
                            <>
                              <StructuredText
                                text={step.description}
                                containerClassName="mt-1 space-y-1"
                                paragraphClassName="ui-note"
                                listClassName="ui-note list-disc space-y-0.5 pl-4"
                                orderedListClassName="ui-note list-decimal space-y-0.5 pl-4"
                              />
                              {step.detail && (
                                <StructuredText
                                  text={step.detail}
                                  containerClassName="mt-1 space-y-1"
                                  paragraphClassName="ui-note text-slate-100"
                                  listClassName="ui-note list-disc space-y-0.5 pl-4 text-slate-100"
                                  orderedListClassName="ui-note list-decimal space-y-0.5 pl-4 text-slate-100"
                                />
                              )}
                              {step.hint && (
                                <p className="ui-note mt-1 text-slate-200">
                                  Hint: {step.hint}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                    </>
                  )
                })()}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

