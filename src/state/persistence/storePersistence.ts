interface SubscribableStore<TState> {
  getState: () => TState
  subscribe: (listener: (state: TState) => void) => () => void
}

interface InstallStorePersistenceOptions<TState, TRuntimeSnapshot, TWorldSnapshot> {
  store: SubscribableStore<TState>
  buildRuntimeSnapshot: (state: TState) => TRuntimeSnapshot
  buildWorldSessionSnapshot: (state: TState) => TWorldSnapshot
  persistRuntimeSnapshot: (snapshot: TRuntimeSnapshot) => void
  persistWorldSessionSnapshot: (snapshot: TWorldSnapshot) => Promise<unknown>
  shouldSkipPersistence: () => boolean
  shouldPersistWorldSession: (state: TState) => boolean
}

export function installStorePersistenceSubscriptions<
  TState,
  TRuntimeSnapshot,
  TWorldSnapshot,
>({
  store,
  buildRuntimeSnapshot,
  buildWorldSessionSnapshot,
  persistRuntimeSnapshot,
  persistWorldSessionSnapshot,
  shouldSkipPersistence,
  shouldPersistWorldSession,
}: InstallStorePersistenceOptions<TState, TRuntimeSnapshot, TWorldSnapshot>): void {
  let lastRuntimeSnapshotSerialized = JSON.stringify(
    buildRuntimeSnapshot(store.getState()),
  )
  let lastWorldSessionSerialized: string | null = null

  store.subscribe((state) => {
    if (shouldSkipPersistence()) {
      return
    }

    const snapshot = buildRuntimeSnapshot(state)
    const serialized = JSON.stringify(snapshot)
    if (serialized === lastRuntimeSnapshotSerialized) {
      return
    }

    lastRuntimeSnapshotSerialized = serialized
    persistRuntimeSnapshot(snapshot)
  })

  store.subscribe((state) => {
    if (shouldSkipPersistence()) {
      return
    }

    if (!shouldPersistWorldSession(state)) {
      return
    }

    const snapshot = buildWorldSessionSnapshot(state)
    const serialized = JSON.stringify({
      ...snapshot,
      updatedAt: 0,
    })
    if (serialized === lastWorldSessionSerialized) {
      return
    }

    lastWorldSessionSerialized = serialized
    void persistWorldSessionSnapshot(snapshot).catch(() => {
      // Ignore world-session persistence failures.
    })
  })
}
