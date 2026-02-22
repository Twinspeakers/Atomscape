interface MainMenuModalProps {
  canContinue: boolean
  onContinue: () => void
  onStartNewGame: () => void
}

function menuActionClass(disabled: boolean): string {
  return [
    'ui-action-button w-full justify-center rounded py-2.5 text-sm font-semibold tracking-[0.06em] uppercase transition-colors',
    disabled
      ? 'cursor-not-allowed bg-slate-900/40 text-slate-500'
      : 'bg-slate-200/15 text-slate-100 hover:bg-slate-200/25',
  ].join(' ')
}

export function MainMenuModal({
  canContinue,
  onContinue,
  onStartNewGame,
}: MainMenuModalProps) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-[72] flex items-center justify-center bg-slate-950/72 px-4 py-6 backdrop-blur-[2px]">
      <section className="panel-shell ui-stack-sm w-[min(520px,100%)] rounded-xl p-5">
        <header className="space-y-1 pb-1">
          <p className="panel-heading">Main Menu</p>
          <p className="ui-note">
            Esc: Pause/Resume cycle. Continue returns to live simulation.
          </p>
        </header>

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
        </div>
      </section>
    </div>
  )
}
