import { useMemo, useState } from 'react'

type MainMenuView = 'menu' | 'settings'

interface MainMenuModalProps {
  canContinue: boolean
  canSave: boolean
  canLoad: boolean
  cloudEnabled: boolean
  cloudSignedIn: boolean
  cloudBusy: boolean
  cloudUserEmail: string | null
  cloudSaveUpdatedAt: string | null
  authEmail: string
  statusMessage: string | null
  errorMessage: string | null
  onAuthEmailChange: (value: string) => void
  onContinue: () => void
  onStartNewGame: () => void
  onSave: () => void
  onLoad: () => void
  onSendMagicLink: () => void
  onSignOut: () => void
}

function menuActionClass(disabled: boolean): string {
  return [
    'ui-action-button w-full justify-center rounded py-2.5 text-sm font-semibold tracking-[0.06em] uppercase transition-colors',
    disabled
      ? 'cursor-not-allowed bg-slate-900/40 text-slate-500'
      : 'bg-slate-200/15 text-slate-100 hover:bg-slate-200/25',
  ].join(' ')
}

function formatCloudSaveTime(value: string | null): string {
  if (!value) {
    return 'No cloud save uploaded yet.'
  }

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    return 'Cloud save timestamp unavailable.'
  }

  return `Last cloud save: ${new Date(timestamp).toLocaleString()}`
}

export function MainMenuModal({
  canContinue,
  canSave,
  canLoad,
  cloudEnabled,
  cloudSignedIn,
  cloudBusy,
  cloudUserEmail,
  cloudSaveUpdatedAt,
  authEmail,
  statusMessage,
  errorMessage,
  onAuthEmailChange,
  onContinue,
  onStartNewGame,
  onSave,
  onLoad,
  onSendMagicLink,
  onSignOut,
}: MainMenuModalProps) {
  const [view, setView] = useState<MainMenuView>('menu')
  const cloudStatusLabel = useMemo(
    () => formatCloudSaveTime(cloudSaveUpdatedAt),
    [cloudSaveUpdatedAt],
  )

  return (
    <div className="pointer-events-auto absolute inset-0 z-[72] flex items-center justify-center bg-slate-950/72 px-4 py-6 backdrop-blur-[2px]">
      <section className="panel-shell ui-stack-sm w-[min(520px,100%)] rounded-xl p-5">
        <header className="space-y-1 pb-1">
          <p className="panel-heading">Main Menu</p>
          <p className="ui-note">
            Esc: Pause/Resume cycle. Continue returns to live simulation.
          </p>
        </header>

        {view === 'menu' && (
          <div className="space-y-2.5">
            {canContinue && (
              <button onClick={onContinue} className={menuActionClass(false)}>
                Continue
              </button>
            )}

            <button
              onClick={onStartNewGame}
              disabled={cloudBusy}
              className={menuActionClass(cloudBusy)}
            >
              Start New Game
            </button>

            <button
              onClick={onSave}
              disabled={!canSave || cloudBusy}
              className={menuActionClass(!canSave || cloudBusy)}
              title={!cloudEnabled
                ? 'Cloud saves are disabled in this build.'
                : !cloudSignedIn
                  ? 'Sign in through Settings to save to cloud.'
                  : undefined}
            >
              Save
            </button>

            <button
              onClick={onLoad}
              disabled={!canLoad || cloudBusy}
              className={menuActionClass(!canLoad || cloudBusy)}
              title={!cloudEnabled
                ? 'Cloud saves are disabled in this build.'
                : !cloudSignedIn
                  ? 'Sign in through Settings to load from cloud.'
                  : undefined}
            >
              Load
            </button>

            <button
              onClick={() => setView('settings')}
              className={menuActionClass(false)}
            >
              Settings
            </button>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-3.5">
            <div className="ui-surface-card space-y-1.5">
              <p className="ui-title">Cloud Save Login</p>
              {!cloudEnabled && (
                <p className="ui-note text-amber-200">
                  Cloud saves are disabled by environment settings.
                </p>
              )}
              {cloudEnabled && cloudSignedIn && (
                <p className="ui-note text-[#d6ffb2]">
                  Signed in as {cloudUserEmail ?? 'Unknown account'}.
                </p>
              )}
              {cloudEnabled && !cloudSignedIn && (
                <p className="ui-note">
                  Enter your email to receive a magic-link sign-in.
                </p>
              )}
              <p className="ui-note">{cloudStatusLabel}</p>
            </div>

            {cloudEnabled && !cloudSignedIn && (
              <div className="ui-surface-card space-y-2">
                <label className="ui-body-copy block">Email</label>
                <input
                  type="email"
                  className="ui-input-field w-full"
                  value={authEmail}
                  onChange={(event) => onAuthEmailChange(event.target.value)}
                  autoComplete="email"
                  placeholder="captain@orbit.com"
                />
                <button
                  onClick={onSendMagicLink}
                  disabled={cloudBusy}
                  className={menuActionClass(cloudBusy)}
                >
                  Send Magic Link
                </button>
              </div>
            )}

            {cloudEnabled && cloudSignedIn && (
              <button
                onClick={onSignOut}
                disabled={cloudBusy}
                className={menuActionClass(cloudBusy)}
              >
                Sign Out
              </button>
            )}

            <button
              onClick={() => setView('menu')}
              className="ui-action-button w-full justify-center rounded py-2.5 text-sm font-semibold tracking-[0.06em] uppercase"
            >
              Back
            </button>
          </div>
        )}

        {(statusMessage || errorMessage) && (
          <footer className="pt-2">
            {statusMessage && (
              <p className="ui-note text-[#d6ffb2]">{statusMessage}</p>
            )}
            {errorMessage && (
              <p className="ui-note text-amber-200">{errorMessage}</p>
            )}
          </footer>
        )}
      </section>
    </div>
  )
}
