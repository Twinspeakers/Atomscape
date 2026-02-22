import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildQuestProgressModel } from '@features/quests/questDefinitions'
import * as questUiSelectors from '@state/selectors/questUiSelectors'
import { useAppStore } from '@state/store'
import type { GameMenuSection, TutorialChecklistItem } from '@state/types'
import { StructuredText } from './ui/StructuredText'

interface TutorialOverlayProps {
  docked?: boolean
  gameMenuSection?: GameMenuSection | null
  onOpenGameMenuSection?: (section: GameMenuSection) => void
}

interface SpotlightRect {
  left: number
  top: number
  width: number
  height: number
}

function selectorForFocusTarget(target: string): string {
  return `[data-tutorial-focus="${target}"]`
}

function sectionForLabTab(labTab: TutorialChecklistItem['labTab']): GameMenuSection | null {
  if (!labTab) {
    return null
  }

  if (labTab === 'station') {
    return 'station'
  }

  if (labTab === 'market') {
    return 'store'
  }

  if (labTab === 'failures') {
    return 'failures'
  }

  if (labTab === 'logs') {
    return 'log'
  }

  return 'laboratory'
}

function menuButtonFocusTarget(section: GameMenuSection): string {
  if (section === 'laboratory') {
    return 'game-menu-laboratory'
  }

  if (section === 'station') {
    return 'game-menu-station'
  }

  if (section === 'store') {
    return 'game-menu-store'
  }

  if (section === 'failures') {
    return 'game-menu-failures'
  }

  if (section === 'log') {
    return 'game-menu-log'
  }

  if (section === 'inventory') {
    return 'game-menu-inventory'
  }

  if (section === 'quests') {
    return 'game-menu-quests'
  }

  if (section === 'crew') {
    return 'game-menu-crew'
  }

  return 'game-menu-wiki'
}

function resolveFocusTarget(
  currentStep: TutorialChecklistItem | null,
  gameMenuSection: GameMenuSection | null,
): string | null {
  if (!currentStep?.focusTarget) {
    return null
  }

  const requiredSection = sectionForLabTab(currentStep.labTab)
  if (requiredSection && gameMenuSection !== requiredSection) {
    return menuButtonFocusTarget(requiredSection)
  }

  if (currentStep.focusTarget.startsWith('space-')) {
    return 'space-viewport'
  }

  return currentStep.focusTarget
}

const actionButtonClass = 'ui-action-button'
const miniButtonClass = 'ui-action-button-sm'
const statusTagClass = 'ui-status-tag'

export function TutorialOverlay({
  docked = false,
  gameMenuSection = null,
  onOpenGameMenuSection,
}: TutorialOverlayProps) {
  const tutorialEnabled = useAppStore(questUiSelectors.selectTutorialEnabled)
  const tutorialCollapsed = useAppStore(questUiSelectors.selectTutorialCollapsed)
  const tutorialComplete = useAppStore(questUiSelectors.selectTutorialComplete)
  const tutorialCurrentStepIndex = useAppStore(questUiSelectors.selectTutorialCurrentStepIndex)
  const tutorialChecklist = useAppStore(questUiSelectors.selectTutorialChecklist)
  const activeMainQuestId = useAppStore(questUiSelectors.selectActiveMainQuestId)
  const inventory = useAppStore(questUiSelectors.selectInventory)
  const energy = useAppStore(questUiSelectors.selectEnergy)
  const credits = useAppStore(questUiSelectors.selectCredits)
  const pinnedQuestIds = useAppStore(questUiSelectors.selectPinnedQuestIds)
  const toggleTutorialCollapsed = useAppStore(questUiSelectors.selectToggleTutorialCollapsed)
  const dismissTutorial = useAppStore(questUiSelectors.selectDismissTutorial)
  const resetTutorial = useAppStore(questUiSelectors.selectResetTutorial)
  const setLabActiveTab = useAppStore(questUiSelectors.selectSetLabActiveTab)

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
      }),
    [tutorialChecklist, tutorialCurrentStepIndex, tutorialComplete, activeMainQuestId, inventory, credits, energy],
  )
  const mainQuestRows = useMemo(
    () => questRows.filter((quest) => quest.type === 'Main Quest'),
    [questRows],
  )
  const activeMainQuest = useMemo(() => {
    const currentQuest = mainQuestRows.find((quest) => quest.current)
    if (currentQuest) {
      return currentQuest
    }

    const pendingQuest = mainQuestRows.find((quest) => !quest.completed)
    if (pendingQuest) {
      return pendingQuest
    }

    return mainQuestRows.at(-1) ?? null
  }, [mainQuestRows])
  const activeMainCompletedCount = activeMainQuest
    ? activeMainQuest.steps.filter((step) => step.completed).length
    : 0
  const activeMainTotalCount = activeMainQuest?.steps.length ?? 0
  const pinnedQuestRows = useMemo(
    () =>
      questRows.filter(
        (quest) =>
          pinnedQuestIds.includes(quest.id),
      ),
    [questRows, pinnedQuestIds],
  )
  const primaryPinnedQuest = useMemo(
    () => pinnedQuestRows.find((quest) => quest.current) ?? pinnedQuestRows[0] ?? null,
    [pinnedQuestRows],
  )
  const primaryPinnedStep = useMemo(
    () =>
      primaryPinnedQuest
        ? primaryPinnedQuest.steps.find((step) => step.current)
          ?? primaryPinnedQuest.steps.find((step) => !step.completed)
          ?? primaryPinnedQuest.steps.at(-1)
          ?? null
        : null,
    [primaryPinnedQuest],
  )
  const activeMainCurrentIndex = activeMainQuest
    ? activeMainQuest.steps.findIndex((step) => step.current)
    : -1
  const currentStep = activeMainCurrentIndex >= 0 && activeMainQuest
    ? activeMainQuest.steps[activeMainCurrentIndex]
    : null
  const requiredMenuSection = sectionForLabTab(currentStep?.labTab)
  const canFocusFromQuickPanel = Boolean(
    !tutorialComplete &&
      currentStep &&
      activeMainQuest &&
      pinnedQuestRows.some((quest) => quest.id === activeMainQuest.id),
  )
  const currentFocusTarget = useMemo(
    () => resolveFocusTarget(currentStep, gameMenuSection),
    [currentStep, gameMenuSection],
  )
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)

  const refreshSpotlight = useCallback(() => {
    if (!tutorialEnabled || !currentFocusTarget || tutorialComplete) {
      setSpotlightRect(null)
      return
    }

    const target = document.querySelector<HTMLElement>(selectorForFocusTarget(currentFocusTarget))
    if (!target) {
      setSpotlightRect(null)
      return
    }

    const rect = target.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      setSpotlightRect(null)
      return
    }

    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight)
    const targetArea = rect.width * rect.height
    if (targetArea / viewportArea > 0.85) {
      setSpotlightRect(null)
      return
    }

    const nextRect: SpotlightRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }

    setSpotlightRect((previous) => {
      if (
        previous &&
        Math.abs(previous.left - nextRect.left) < 0.5 &&
        Math.abs(previous.top - nextRect.top) < 0.5 &&
        Math.abs(previous.width - nextRect.width) < 0.5 &&
        Math.abs(previous.height - nextRect.height) < 0.5
      ) {
        return previous
      }

      return nextRect
    })
  }, [currentFocusTarget, tutorialComplete, tutorialEnabled])

  useEffect(() => {
    let raf = window.requestAnimationFrame(refreshSpotlight)
    const scheduleRefresh = () => {
      window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(refreshSpotlight)
    }

    window.addEventListener('resize', scheduleRefresh)
    window.addEventListener('scroll', scheduleRefresh, true)
    const interval = window.setInterval(scheduleRefresh, 220)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', scheduleRefresh)
      window.removeEventListener('scroll', scheduleRefresh, true)
      window.clearInterval(interval)
    }
  }, [refreshSpotlight])

  const focusCurrentStep = useCallback(() => {
    if (!currentStep) {
      return
    }

    if (currentStep.labTab) {
      setLabActiveTab(currentStep.labTab)
      onOpenGameMenuSection?.(requiredMenuSection ?? 'laboratory')
    }

    const nextTarget = resolveFocusTarget(
      currentStep,
      requiredMenuSection ?? gameMenuSection,
    )
    if (!nextTarget) {
      return
    }

    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(selectorForFocusTarget(nextTarget))
      target?.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      })
    }, 80)
  }, [currentStep, gameMenuSection, onOpenGameMenuSection, requiredMenuSection, setLabActiveTab])

  const highlightPadding = 8
  const highlightLeft = spotlightRect ? spotlightRect.left - highlightPadding : 0
  const highlightTop = spotlightRect ? spotlightRect.top - highlightPadding : 0
  const highlightWidth = spotlightRect ? spotlightRect.width + highlightPadding * 2 : 0
  const highlightHeight = spotlightRect ? spotlightRect.height + highlightPadding * 2 : 0
  const labelWidth = 260
  const labelLeft = spotlightRect
    ? Math.max(8, Math.min(window.innerWidth - labelWidth - 8, highlightLeft))
    : 8
  const labelTop = spotlightRect
    ? highlightTop >= 36
      ? highlightTop - 30
      : highlightTop + highlightHeight + 10
    : 8

  const focusActionLabel =
    requiredMenuSection && gameMenuSection !== requiredMenuSection
      ? 'Open Menu + Section'
      : currentStep?.focusTarget?.startsWith('space-')
        ? 'Focus In Space'
        : 'Focus This Step'

  const spotlight = tutorialEnabled && currentStep && spotlightRect ? (
    <div className="pointer-events-none fixed inset-0 z-40">
      <div
        className="absolute rounded-lg bg-transparent ring-1 ring-slate-200/80 transition-all duration-200"
        style={{
          left: `${highlightLeft}px`,
          top: `${highlightTop}px`,
          width: `${highlightWidth}px`,
          height: `${highlightHeight}px`,
        }}
      />
      <div
        className="ui-action-button-sm absolute rounded bg-slate-950/90 text-slate-100"
        style={{
          left: `${labelLeft}px`,
          top: `${labelTop}px`,
          maxWidth: `${labelWidth}px`,
        }}
      >
        Focus Area: {currentStep.title}
      </div>
    </div>
  ) : null

  if (!tutorialEnabled) {
    if (!docked) {
      return null
    }

    return (
      <div className="ui-stack-sm">
        {spotlight}
        <p className="ui-body-copy">Quests are disabled for this session.</p>
        <button
          onClick={resetTutorial}
          className={actionButtonClass}
        >
          Enable Quests
        </button>
      </div>
    )
  }

  if (docked) {
    return (
      <div className="ui-stack-sm">
        {spotlight}
        {tutorialCollapsed ? (
          <div className="ui-surface-card flex items-center justify-between gap-2">
            <div>
              <p className="ui-title">
                {tutorialComplete
                  ? 'Main Quest Complete'
                  : primaryPinnedStep
                    ? `Current: ${primaryPinnedStep.title}`
                    : 'No pinned quests'}
              </p>
              <p className="ui-note">
                {primaryPinnedStep ? 'Press J for full quest log' : 'Press J and pin quests to show them here'}
              </p>
            </div>
            <div className="flex gap-1">
              {canFocusFromQuickPanel && (
                <button
                  onClick={focusCurrentStep}
                  className={miniButtonClass}
                >
                  Focus
                </button>
              )}
              <button
                onClick={toggleTutorialCollapsed}
                className={miniButtonClass}
              >
                Expand
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="panel-heading">Quests</p>
                <p className="ui-subtitle">
                  Pinned Quests {pinnedQuestRows.length}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={toggleTutorialCollapsed}
                  className={miniButtonClass}
                >
                  Collapse
                </button>
                <button
                  onClick={dismissTutorial}
                  className={miniButtonClass}
                >
                  Disable
                </button>
              </div>
            </div>

            {pinnedQuestRows.length === 0 && (
              <div className="ui-surface-card">
                <p className="ui-title">No quests pinned</p>
                <p className="ui-body-copy mt-1">
                  Open the Game Menu with J, go to Quests, and pin what you want to track in this panel.
                </p>
              </div>
            )}

            {pinnedQuestRows.map((quest) => {
              const currentStepIndex = quest.steps.findIndex((step) => step.current)
              const firstIncompleteIndex = quest.steps.findIndex((step) => !step.completed)
              const resolvedCurrentStepIndex =
                currentStepIndex >= 0
                  ? currentStepIndex
                  : firstIncompleteIndex
              const previousStep =
                resolvedCurrentStepIndex > 0
                  ? quest.steps[resolvedCurrentStepIndex - 1]
                  : null
              const currentTrackedStep =
                resolvedCurrentStepIndex >= 0
                  ? quest.steps[resolvedCurrentStepIndex]
                  : null
              const nextStep =
                resolvedCurrentStepIndex >= 0
                  ? quest.steps[resolvedCurrentStepIndex + 1] ?? null
                  : null

              return (
                <div key={quest.id} className="ui-surface-card">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="ui-title">{quest.title}</p>
                    <span
                      className={`${statusTagClass} ${
                        quest.type === 'Main Quest'
                          ? 'bg-slate-700/40 text-slate-100'
                          : 'bg-slate-900/40 text-slate-300'
                      }`}
                    >
                      {quest.type === 'Main Quest' ? 'Main' : 'Side'}
                    </span>
                  </div>
                  {!currentTrackedStep && (
                    <div className="rounded bg-slate-900/35 px-2 py-1">
                      <p className="ui-label">Quest Status</p>
                      <p className="ui-body-copy">All steps complete.</p>
                    </div>
                  )}
                  {currentTrackedStep && (
                    <div className="space-y-1">
                      {previousStep && (
                        <div className="ui-surface-card-strong px-2 py-1.5">
                          <p className="ui-label">Last Step Done</p>
                          <p className="ui-body-copy">{previousStep.title}</p>
                        </div>
                      )}
                      <div className="ui-surface-card px-2 py-1.5">
                        <p className="ui-label">Current Step</p>
                        <p className="ui-body-copy font-semibold text-slate-100">{currentTrackedStep.title}</p>
                        <StructuredText
                          text={currentTrackedStep.detail ?? currentTrackedStep.description}
                          containerClassName="mt-1 space-y-1"
                          paragraphClassName="ui-note text-slate-100"
                          listClassName="ui-note list-disc space-y-0.5 pl-4 text-slate-100"
                          orderedListClassName="ui-note list-decimal space-y-0.5 pl-4 text-slate-100"
                        />
                        {currentTrackedStep.hint && (
                          <p className="ui-note mt-1 text-slate-200">Hint: {currentTrackedStep.hint}</p>
                        )}
                      </div>
                      {nextStep && (
                        <div className="ui-surface-card-strong px-2 py-1.5">
                          <p className="ui-label">Next Step</p>
                          <p className="ui-body-copy">{nextStep.title}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    )
  }

  if (tutorialCollapsed) {
    return (
      <>
        {spotlight}
        <aside className="panel-shell pointer-events-auto absolute left-3 top-20 z-50 w-[min(400px,calc(100%-1.5rem))] rounded-xl p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="ui-title">
              {tutorialComplete ? 'Questline Complete' : `Active Quest: ${currentStep?.title ?? 'In Progress'}`}
            </p>
            <div className="flex gap-1">
              {!tutorialComplete && currentStep && (
                <button
                  onClick={focusCurrentStep}
                  className={miniButtonClass}
                >
                  Focus
                </button>
              )}
              <button
                onClick={toggleTutorialCollapsed}
                className={miniButtonClass}
              >
                Expand
              </button>
              <button
                onClick={dismissTutorial}
                className={miniButtonClass}
              >
                Hide
              </button>
            </div>
          </div>
        </aside>
      </>
    )
  }

  return (
    <>
      {spotlight}
      <aside className="panel-shell pointer-events-auto absolute left-3 top-20 z-50 w-[min(460px,calc(100%-1.5rem))] rounded-xl p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="panel-heading">Quests</p>
            <p className="ui-subtitle">
              Quest Progress {activeMainCompletedCount}/{activeMainTotalCount}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={toggleTutorialCollapsed}
              className={miniButtonClass}
            >
              Collapse
            </button>
            <button
              onClick={dismissTutorial}
              className={miniButtonClass}
            >
              Hide
            </button>
          </div>
        </div>

        {!tutorialComplete && currentStep && (
          <div className="ui-surface-card mb-3">
            <p className="ui-title">Current Active Quest: {currentStep.title}</p>
            <StructuredText
              text={currentStep.description}
              containerClassName="mt-1 space-y-2"
              paragraphClassName="ui-body-copy"
            />
            {currentStep.hint && <p className="ui-note mt-1">Hint: {currentStep.hint}</p>}
            <button
              onClick={focusCurrentStep}
              className={`mt-2 ${actionButtonClass}`}
            >
              {focusActionLabel}
            </button>
          </div>
        )}

        {tutorialComplete && (
          <div className="ui-surface-card mb-3">
            <p className="ui-title">All quest objectives complete.</p>
            <p className="ui-body-copy mt-1">You can keep expanding your resource loops and optimize throughput.</p>
            <button
              onClick={resetTutorial}
              className={`mt-2 ${actionButtonClass}`}
            >
              Restart Questline
            </button>
          </div>
        )}

        <div className="space-y-1">
          {tutorialChecklist.map((step, index) => (
            <div
              key={step.id}
              className={`rounded px-2 py-1 ${
                step.completed
                  ? ' bg-slate-900/35 text-slate-200'
                  : index === tutorialCurrentStepIndex
                    ? ' bg-slate-800/45 text-slate-100'
                    : ' bg-slate-950/35 text-slate-300'
              }`}
            >
              <p className="ui-body-copy font-semibold">{step.completed ? 'Done' : 'Step'}: {step.title}</p>
              <p className="ui-note">{step.description}</p>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}





