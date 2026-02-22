import { useEffect } from 'react'
import type { QuestRewardNotification } from '../state/types'

interface QuestRewardModalProps {
  notification: QuestRewardNotification
  onClose: () => void
  onOpenQuests: () => void
}

export function QuestRewardModal({
  notification,
  onClose,
  onOpenQuests,
}: QuestRewardModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'escape') {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      onClose()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [onClose])

  return (
    <div className="pointer-events-auto absolute inset-0 z-[75] flex items-center justify-center bg-black/50 px-3 py-4">
      <section className="panel-shell ui-stack-sm w-[min(660px,100%)] rounded-xl p-5">
        <header className="ui-stack-xs">
          <p className="panel-heading">Quest Complete</p>
          <p className="ui-title">{notification.questTitle}</p>
          <p className="ui-subtitle">Rewards have been added to your current save.</p>
        </header>

        <div className="ui-surface-card ui-stack-xs">
          <p className="ui-label">Reward Pack</p>
          {notification.rewards.map((reward) => (
            <div key={reward.id}>
              <p className="ui-body-copy font-semibold">{reward.label}</p>
              <p className="ui-note">{reward.description}</p>
            </div>
          ))}
        </div>

        <div className="ui-surface-card ui-stack-xs">
          <p className="ui-label">Rewards Attained</p>
          {notification.grants.length > 0 && (
            <div>
              <p className="ui-note">Items / Materials</p>
              <ul className="ui-body-copy list-disc space-y-0.5 pl-4">
                {notification.grants.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {notification.unlocks.length > 0 && (
            <div>
              <p className="ui-note">Unlocks</p>
              <ul className="ui-body-copy list-disc space-y-0.5 pl-4">
                {notification.unlocks.map((unlock) => (
                  <li key={unlock}>{unlock}</li>
                ))}
              </ul>
            </div>
          )}
          {notification.grants.length === 0 && notification.unlocks.length === 0 && (
            <p className="ui-body-copy">No tangible rewards in this package.</p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-1">
          <button onClick={onOpenQuests} className="ui-action-button-sm">
            Open Quests
          </button>
          <button onClick={onClose} className="ui-action-button">
            Continue
          </button>
        </footer>
      </section>
    </div>
  )
}
