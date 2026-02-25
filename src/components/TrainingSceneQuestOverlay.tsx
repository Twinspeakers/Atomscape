import type { TutorialChecklistItem } from '@state/types'

interface TrainingSceneQuestOverlayProps {
  step: TutorialChecklistItem
  completedCount: number
  totalCount: number
}

export function TrainingSceneQuestOverlay({
  step,
  completedCount,
  totalCount,
}: TrainingSceneQuestOverlayProps) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[11%] z-30 w-[min(92vw,560px)] -translate-x-1/2">
      <div className="panel-shell rounded-xl px-4 py-3 text-center shadow-[0_10px_32px_rgba(0,0,0,0.5)]">
        <p className="ui-note text-[#b7f7ff]">
          Control The Ship | Step {Math.min(completedCount + 1, totalCount)}/{totalCount}
        </p>
        <p className="mt-1 text-xl font-semibold tracking-[0.04em] text-slate-100">{step.title}</p>
        <p className="ui-note mt-1 text-slate-200">{step.description}</p>
        {step.hint && (
          <p className="mt-2 text-sm font-semibold tracking-[0.02em] text-[#78ef00]">{step.hint}</p>
        )}
      </div>
    </div>
  )
}

