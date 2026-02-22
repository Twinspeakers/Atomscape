interface StartupSignInModalProps {
  cloudBusy: boolean
  authEmail: string
  statusMessage: string | null
  errorMessage: string | null
  onAuthEmailChange: (value: string) => void
  onSendMagicLink: () => void
}

function actionButtonClass(disabled: boolean): string {
  return [
    'ui-action-button w-full justify-center rounded py-2.5 text-sm font-semibold tracking-[0.06em] uppercase transition-colors',
    disabled
      ? 'cursor-not-allowed bg-slate-900/40 text-slate-500'
      : 'bg-slate-200/15 text-slate-100 hover:bg-slate-200/25',
  ].join(' ')
}

export function StartupSignInModal({
  cloudBusy,
  authEmail,
  statusMessage,
  errorMessage,
  onAuthEmailChange,
  onSendMagicLink,
}: StartupSignInModalProps) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-[74] flex items-center justify-center bg-slate-950/78 px-4 py-6 backdrop-blur-[2px]">
      <section className="panel-shell ui-stack-sm w-[min(520px,100%)] rounded-xl p-5">
        <header className="space-y-1 pb-1">
          <p className="panel-heading">Sign In</p>
          <p className="ui-note">
            Sign in with email to access your cloud save.
          </p>
        </header>

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
            className={actionButtonClass(cloudBusy)}
          >
            {cloudBusy ? 'Sending...' : 'Send Magic Link'}
          </button>
        </div>

        {(statusMessage || errorMessage) && (
          <footer className="pt-1">
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
