import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { CrosshairOverlay } from '@components/CrosshairOverlay'
import { GameModal, type GameModalSection } from '@components/GameModal'
import { MainMenuModal } from '@components/MainMenuModal'
import { QuestRewardModal } from '@components/QuestRewardModal'
import { ShipStatusBar } from '@components/ShipStatusBar'
import { TargetLabelsOverlay } from '@components/TargetLabelsOverlay'
import { DockSidebar, WorkspaceCustomizer } from '@app/routes/gameScreenLayoutPanels'
import { workspacePresets } from '@app/routes/workspacePresets'
import {
  type CrosshairFeedback,
  type ShipCollisionEvent,
  type StationFeedbackEvent,
  type TargetLabelAnchor,
} from '@features/viewport/types'
import {
  getPrimaryCloudSave,
  getCloudSaveUser,
  isCloudRepositoryEnabled,
  savePrimaryCloudSave,
  sendCloudMagicLink,
  signOutCloudSave,
  subscribeCloudSaveAuth,
} from '@platform/cloud/cloudSaveRepository'
import { CHARGING_RANGE_METERS, STATION_DOCKING_RANGE_METERS } from '@domain/spec/gameSpec'
import { useAppStore } from '@state/store'
import * as gameScreenSelectors from '@state/selectors/gameScreenSelectors'
import {
  applyCloudSavePayload,
  buildCloudSavePayloadFromState,
  hasPersistedRuntimeSnapshot,
  isCloudSavePayloadV1,
  MAIN_MENU_AUTOSTART_STORAGE_KEY,
} from '@state/persistence/cloudSavePayload'
import type { DockSide, PanelId, WorkspacePreset } from '@state/types'

type SceneView = 'space' | 'interior'
type RuntimeOverlayMode = 'running' | 'paused' | 'mainMenu'
const sceneFadeDurationMs = 220
const sceneLoadingFallback = <div className="h-full w-full bg-black" />
function resolvePublicAssetPath(relativePath: string): string {
  const trimmedPath = relativePath.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${trimmedPath}`
}
const defaultPlayerCommsImage = resolvePublicAssetPath('assets/portraits/player-default.svg')
const cloudSavesEnabled = isCloudRepositoryEnabled()

function resolveInitialRuntimeOverlayMode(): RuntimeOverlayMode {
  if (typeof window === 'undefined') {
    return 'mainMenu'
  }

  const shouldAutostart = window.localStorage.getItem(MAIN_MENU_AUTOSTART_STORAGE_KEY) === '1'
  if (shouldAutostart) {
    window.localStorage.removeItem(MAIN_MENU_AUTOSTART_STORAGE_KEY)
    return 'running'
  }

  return 'mainMenu'
}

const SpaceViewport = lazy(async () => {
  const module = await import('@features/viewport/SpaceViewport')
  return { default: module.SpaceViewport }
})

const ShipInteriorViewport = lazy(async () => {
  const module = await import('@features/viewport/ShipInteriorViewport')
  return { default: module.ShipInteriorViewport }
})

function chipButtonClass(active: boolean): string {
  return [
    'ui-action-button-sm transition-colors',
    active
      ? 'bg-slate-200/15 text-slate-100'
      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800/80',
  ].join(' ')
}

function stationFeedbackToneClass(tone: 'neutral' | 'success' | 'warning'): string {
  if (tone === 'success') {
    return 'text-[#d6ffb2]'
  }

  if (tone === 'warning') {
    return 'text-amber-200'
  }

  return 'text-slate-200'
}

function formatClockLabel(nowMs: number, timeZone: 'UTC' | 'LOCAL'): string {
  if (timeZone === 'UTC') {
    return new Date(nowMs).toLocaleTimeString('en-GB', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    })
  }

  return new Date(nowMs).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function isTextInputTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) {
    return false
  }

  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
    return true
  }

  return element.isContentEditable
}

export function GameScreen() {
  const [draggingPanelId, setDraggingPanelId] = useState<PanelId | null>(null)
  const [dragPreview, setDragPreview] = useState<{ side: DockSide; beforePanelId: PanelId | null; targetSlot: number } | null>(null)
  const [runtimeOverlayMode, setRuntimeOverlayMode] = useState<RuntimeOverlayMode>(() => resolveInitialRuntimeOverlayMode())
  const [sessionStarted, setSessionStarted] = useState<boolean>(() => hasPersistedRuntimeSnapshot())
  const [gameModalSection, setGameModalSection] = useState<GameModalSection | null>(null)
  const [selectedScene, setSelectedScene] = useState<SceneView>('space')
  const [displayedScene, setDisplayedScene] = useState<SceneView>('space')
  const [sceneFading, setSceneFading] = useState(false)
  const [crosshairTargetLocked, setCrosshairTargetLocked] = useState(false)
  const [crosshairTargetDistance, setCrosshairTargetDistance] = useState<number | null>(null)
  const [crosshairFeedback, setCrosshairFeedback] = useState<CrosshairFeedback | 'idle'>('idle')
  const [targetLabelAnchors, setTargetLabelAnchors] = useState<TargetLabelAnchor[]>([])
  const [stationFeedbackMessage, setStationFeedbackMessage] = useState<{
    text: string
    tone: 'neutral' | 'success' | 'warning'
  } | null>(null)
  const [playerNameEditing, setPlayerNameEditing] = useState(false)
  const [clockNowMs, setClockNowMs] = useState(() => Date.now())
  const [portraitImageError, setPortraitImageError] = useState(false)
  const crosshairFeedbackTimeoutRef = useRef<number | null>(null)
  const stationFeedbackTimeoutRef = useRef<number | null>(null)
  const sceneSwapTimeoutRef = useRef<number | null>(null)
  const playerNameEditorRef = useRef<HTMLDivElement | null>(null)
  const cancelPlayerNameEditRef = useRef(false)
  const [cloudAuthEmail, setCloudAuthEmail] = useState('')
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudStatusMessage, setCloudStatusMessage] = useState<string | null>(null)
  const [cloudErrorMessage, setCloudErrorMessage] = useState<string | null>(null)
  const [cloudUserId, setCloudUserId] = useState<string | null>(null)
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null)
  const [cloudHasSave, setCloudHasSave] = useState(false)
  const [cloudSaveUpdatedAt, setCloudSaveUpdatedAt] = useState<string | null>(null)

  const hydrateInventory = useAppStore(gameScreenSelectors.selectHydrateInventory)
  const hydrateWorldSession = useAppStore(gameScreenSelectors.selectHydrateWorldSession)
  const tryFireMiningLaser = useAppStore(gameScreenSelectors.selectTryFireMiningLaser)
  const recordExtractionHit = useAppStore(gameScreenSelectors.selectRecordExtractionHit)
  const recordWorldTargetDepleted = useAppStore(gameScreenSelectors.selectRecordWorldTargetDepleted)
  const handleFailure = useAppStore(gameScreenSelectors.selectHandleFailure)
  const shipRespawnSignal = useAppStore(gameScreenSelectors.selectShipRespawnSignal)
  const worldStateLoaded = useAppStore(gameScreenSelectors.selectWorldStateLoaded)
  const activeSectorId = useAppStore(gameScreenSelectors.selectActiveSectorId)
  const worldSeed = useAppStore(gameScreenSelectors.selectWorldSeed)
  const worldDepletedTargetIds = useAppStore(gameScreenSelectors.selectWorldDepletedTargetIds)
  const jumpToSector = useAppStore(gameScreenSelectors.selectJumpToSector)
  const setStationDistanceFromScene = useAppStore(gameScreenSelectors.selectSetStationDistanceFromScene)
  const setSelectedObject = useAppStore(gameScreenSelectors.selectSetSelectedObject)
  const setShipTelemetry = useAppStore(gameScreenSelectors.selectSetShipTelemetry)
  const setRadarContacts = useAppStore(gameScreenSelectors.selectSetRadarContacts)
  const setActiveCleanupZone = useAppStore(gameScreenSelectors.selectSetActiveCleanupZone)
  const tutorialChecklist = useAppStore(gameScreenSelectors.selectTutorialChecklist)
  const tutorialCurrentStepIndex = useAppStore(gameScreenSelectors.selectTutorialCurrentStepIndex)
  const tutorialComplete = useAppStore(gameScreenSelectors.selectTutorialComplete)
  const questRewardNotifications = useAppStore(gameScreenSelectors.selectQuestRewardNotifications)
  const dismissQuestRewardNotification = useAppStore(gameScreenSelectors.selectDismissQuestRewardNotification)
  const charging = useAppStore(gameScreenSelectors.selectCharging)
  const docked = useAppStore(gameScreenSelectors.selectDocked)
  const stationDistance = useAppStore(gameScreenSelectors.selectStationDistance)
  const energy = useAppStore(gameScreenSelectors.selectEnergy)
  const maxEnergy = useAppStore(gameScreenSelectors.selectMaxEnergy)
  const credits = useAppStore(gameScreenSelectors.selectCredits)
  const playerUsername = useAppStore(gameScreenSelectors.selectPlayerUsername)
  const leftPanels = useAppStore(gameScreenSelectors.selectLeftPanels)
  const rightPanels = useAppStore(gameScreenSelectors.selectRightPanels)
  const hiddenPanels = useAppStore(gameScreenSelectors.selectHiddenPanels)
  const panelSlotHints = useAppStore(gameScreenSelectors.selectPanelSlotHints)
  const uiDensity = useAppStore(gameScreenSelectors.selectUiDensity)
  const panelOpacity = useAppStore(gameScreenSelectors.selectPanelOpacity)
  const workspaceCustomizerOpen = useAppStore(gameScreenSelectors.selectWorkspaceCustomizerOpen)
  const movePanel = useAppStore(gameScreenSelectors.selectMovePanel)
  const togglePanelVisibility = useAppStore(gameScreenSelectors.selectTogglePanelVisibility)
  const setUiDensity = useAppStore(gameScreenSelectors.selectSetUiDensity)
  const setPanelOpacity = useAppStore(gameScreenSelectors.selectSetPanelOpacity)
  const toggleWorkspaceCustomizer = useAppStore(gameScreenSelectors.selectToggleWorkspaceCustomizer)
  const setWorkspacePreset = useAppStore(gameScreenSelectors.selectSetWorkspacePreset)
  const resetWorkspaceUi = useAppStore(gameScreenSelectors.selectResetWorkspaceUi)
  const labActiveTab = useAppStore(gameScreenSelectors.selectLabActiveTab)
  const setLabActiveTab = useAppStore(gameScreenSelectors.selectSetLabActiveTab)
  const triggerConsumableSlot = useAppStore(gameScreenSelectors.selectUseConsumableSlot)
  const setPlayerUsername = useAppStore(gameScreenSelectors.selectSetPlayerUsername)
  const activeCommsSpeaker = useAppStore(gameScreenSelectors.selectActiveCommsSpeaker)
  const appendSimulationLog = useAppStore(gameScreenSelectors.selectAppendSimulationLog)
  const toggleDocked = useAppStore(gameScreenSelectors.selectToggleDocked)
  const startCharging = useAppStore(gameScreenSelectors.selectStartCharging)
  const tickSimulation = useAppStore(gameScreenSelectors.selectTickSimulation)
  const resetAllProgress = useAppStore(gameScreenSelectors.selectResetAllProgress)
  const activeQuestRewardNotification = questRewardNotifications[0] ?? null
  const cloudSignedIn = cloudUserId !== null
  const canCloudSave = cloudSavesEnabled && cloudSignedIn && sessionStarted
  const canCloudLoad = cloudSavesEnabled && cloudSignedIn && cloudHasSave

  const refreshCloudSaveMetadata = useCallback(async () => {
    if (!cloudSavesEnabled || !cloudSignedIn) {
      setCloudHasSave(false)
      setCloudSaveUpdatedAt(null)
      return
    }

    try {
      const primarySave = await getPrimaryCloudSave()
      setCloudHasSave(primarySave !== null)
      setCloudSaveUpdatedAt(primarySave?.updatedAt ?? null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch cloud save metadata.'
      setCloudErrorMessage(message)
    }
  }, [cloudSignedIn])

  const openGameMenuSection = useCallback((section: GameModalSection | null) => {
    if (section === null) {
      setGameModalSection(null)
      return
    }

    if (section === 'station') {
      setLabActiveTab('station')
    } else if (section === 'store') {
      setLabActiveTab('market')
    } else if (section === 'failures') {
      setLabActiveTab('failures')
    } else if (section === 'log') {
      setLabActiveTab('logs')
    } else if (
      section === 'laboratory'
      && (labActiveTab === 'station'
      || labActiveTab === 'market'
      || labActiveTab === 'failures'
      || labActiveTab === 'logs')
    ) {
      setLabActiveTab('sorting')
    }

    setGameModalSection(section)
  }, [labActiveTab, setLabActiveTab])

  const continueSession = useCallback(() => {
    setRuntimeOverlayMode('running')
    setSessionStarted(true)
    setCloudStatusMessage(null)
    setCloudErrorMessage(null)
  }, [])

  const openMainMenu = useCallback(() => {
    setRuntimeOverlayMode('mainMenu')
  }, [])

  const openPausedOverlay = useCallback(() => {
    setRuntimeOverlayMode('paused')
  }, [])

  const handleStartNewGame = useCallback(async () => {
    setCloudStatusMessage(null)
    setCloudErrorMessage(null)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MAIN_MENU_AUTOSTART_STORAGE_KEY, '1')
    }

    await resetAllProgress()
  }, [resetAllProgress])

  const handleCloudSave = useCallback(async () => {
    if (!canCloudSave) {
      setCloudErrorMessage(cloudSavesEnabled
        ? 'Sign in and start a session before saving to cloud.'
        : 'Cloud saves are disabled in this build.')
      setCloudStatusMessage(null)
      return
    }

    setCloudBusy(true)
    setCloudErrorMessage(null)
    setCloudStatusMessage(null)
    try {
      const payload = await buildCloudSavePayloadFromState(useAppStore.getState())
      const saved = await savePrimaryCloudSave(payload)
      setCloudHasSave(true)
      setCloudSaveUpdatedAt(saved.updatedAt)
      setCloudStatusMessage('Cloud save updated.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cloud save failed.'
      setCloudErrorMessage(message)
    } finally {
      setCloudBusy(false)
    }
  }, [canCloudSave])

  const handleCloudLoad = useCallback(async () => {
    if (!canCloudLoad) {
      setCloudErrorMessage(cloudSavesEnabled
        ? 'No cloud save is currently available to load.'
        : 'Cloud saves are disabled in this build.')
      setCloudStatusMessage(null)
      return
    }

    setCloudBusy(true)
    setCloudErrorMessage(null)
    setCloudStatusMessage(null)
    try {
      const primary = await getPrimaryCloudSave()
      if (!primary) {
        setCloudHasSave(false)
        setCloudSaveUpdatedAt(null)
        setCloudErrorMessage('No cloud save found.')
        return
      }

      if (!isCloudSavePayloadV1(primary.payload)) {
        setCloudErrorMessage('Cloud save payload is invalid or incompatible with this build.')
        return
      }

      await applyCloudSavePayload(primary.payload)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MAIN_MENU_AUTOSTART_STORAGE_KEY, '1')
        window.location.replace(window.location.pathname + window.location.search + window.location.hash)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cloud load failed.'
      setCloudErrorMessage(message)
    } finally {
      setCloudBusy(false)
    }
  }, [canCloudLoad])

  const handleSendMagicLink = useCallback(async () => {
    if (!cloudSavesEnabled) {
      setCloudErrorMessage('Cloud saves are disabled in this build.')
      return
    }

    setCloudBusy(true)
    setCloudErrorMessage(null)
    setCloudStatusMessage(null)
    try {
      await sendCloudMagicLink(cloudAuthEmail)
      setCloudStatusMessage('Magic link sent. Check your inbox and return to the game tab.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send magic link.'
      setCloudErrorMessage(message)
    } finally {
      setCloudBusy(false)
    }
  }, [cloudAuthEmail])

  const handleCloudSignOut = useCallback(async () => {
    if (!cloudSavesEnabled) {
      return
    }

    setCloudBusy(true)
    setCloudErrorMessage(null)
    setCloudStatusMessage(null)
    try {
      await signOutCloudSave()
      setCloudUserId(null)
      setCloudUserEmail(null)
      setCloudHasSave(false)
      setCloudSaveUpdatedAt(null)
      setCloudStatusMessage('Signed out from cloud saves.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign out.'
      setCloudErrorMessage(message)
    } finally {
      setCloudBusy(false)
    }
  }, [])

  useEffect(() => {
    if (runtimeOverlayMode === 'running') {
      setSessionStarted(true)
    }
  }, [runtimeOverlayMode])

  useEffect(() => {
    if (!cloudSavesEnabled) {
      return
    }

    let disposed = false
    const syncCurrentCloudUser = async () => {
      const user = await getCloudSaveUser()
      if (disposed) {
        return
      }

      setCloudUserId(user?.id ?? null)
      setCloudUserEmail(user?.email ?? null)
      setCloudAuthEmail(user?.email ?? '')
      setCloudErrorMessage(null)
    }

    void syncCurrentCloudUser()
    const unsubscribe = subscribeCloudSaveAuth(({ user }) => {
      if (disposed) {
        return
      }

      setCloudUserId(user?.id ?? null)
      setCloudUserEmail(user?.email ?? null)
      setCloudAuthEmail(user?.email ?? '')
      setCloudErrorMessage(null)
    })

    return () => {
      disposed = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    void refreshCloudSaveMetadata()
  }, [refreshCloudSaveMetadata])

  useEffect(() => {
    void hydrateInventory()
    void hydrateWorldSession()
  }, [hydrateInventory, hydrateWorldSession])

  useEffect(() => {
    return () => {
      if (crosshairFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(crosshairFeedbackTimeoutRef.current)
      }

      if (sceneSwapTimeoutRef.current !== null) {
        window.clearTimeout(sceneSwapTimeoutRef.current)
      }

      if (stationFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(stationFeedbackTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const tickInterval = window.setInterval(() => {
      if (runtimeOverlayMode !== 'mainMenu') {
        tickSimulation()
      }
      setClockNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(tickInterval)
    }
  }, [runtimeOverlayMode, tickSimulation])

  useEffect(() => {
    const handleModalHotkeys = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'escape') {
        event.preventDefault()
        event.stopPropagation()

        if (gameModalSection) {
          openGameMenuSection(null)
          return
        }

        if (runtimeOverlayMode === 'running') {
          openPausedOverlay()
          return
        }

        if (runtimeOverlayMode === 'paused') {
          openMainMenu()
          return
        }

        openPausedOverlay()
        return
      }

      if (runtimeOverlayMode === 'mainMenu') {
        return
      }

      const slotByKey: Record<string, 1 | 2 | 3 | 4> = {
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
      }
      const slotByCode: Record<string, 1 | 2 | 3 | 4> = {
        Numpad1: 1,
        Numpad2: 2,
        Numpad3: 3,
        Numpad4: 4,
      }
      const slotFromKey = slotByKey[key]
      const slotFromCode = slotByCode[event.code]
      const slot = slotFromKey ?? slotFromCode

      if (runtimeOverlayMode === 'running' && slot) {
        event.preventDefault()
        event.stopPropagation()
        triggerConsumableSlot(slot)
        return
      }

      if (key === 'j') {
        event.preventDefault()
        event.stopPropagation()
        openGameMenuSection('quests')
        return
      }

      if (key === 'i') {
        event.preventDefault()
        event.stopPropagation()
        openGameMenuSection('inventory')
        return
      }

      if (key === 'l') {
        event.preventDefault()
        event.stopPropagation()
        openGameMenuSection('laboratory')
        return
      }

      if (key === 'p') {
        event.preventDefault()
        event.stopPropagation()
        openGameMenuSection('station')
        return
      }

      if (key === 'm') {
        event.preventDefault()
        event.stopPropagation()
        openGameMenuSection('map')
        return
      }

      if (key === 'o') {
        event.preventDefault()
        event.stopPropagation()
        openGameMenuSection('store')
        return
      }

      if (key === 'c') {
        event.preventDefault()
        event.stopPropagation()
        openGameMenuSection('crew')
        return
      }

      if (event.code === 'Backquote' || key === '`') {
        event.preventDefault()
        event.stopPropagation()
        openGameMenuSection('wiki')
        return
      }
    }

    window.addEventListener('keydown', handleModalHotkeys, true)
    return () => {
      window.removeEventListener('keydown', handleModalHotkeys, true)
    }
  }, [
    gameModalSection,
    openGameMenuSection,
    openMainMenu,
    openPausedOverlay,
    runtimeOverlayMode,
    triggerConsumableSlot,
  ])

  useEffect(() => {
    const handleContextInteract = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' || event.repeat) {
        return
      }

      if (isTextInputTarget(event.target)) {
        return
      }

      if (
        runtimeOverlayMode !== 'running'
        || gameModalSection !== null
        || activeQuestRewardNotification !== null
        ||
        selectedScene !== 'space'
        || displayedScene !== 'space'
        || sceneFading
        || !worldStateLoaded
      ) {
        return
      }

      if (!docked && stationDistance <= STATION_DOCKING_RANGE_METERS) {
        event.preventDefault()
        event.stopPropagation()
        toggleDocked()
        return
      }

      if (docked && !charging && stationDistance <= CHARGING_RANGE_METERS) {
        event.preventDefault()
        event.stopPropagation()
        startCharging()
      }
    }

    window.addEventListener('keydown', handleContextInteract, true)
    return () => {
      window.removeEventListener('keydown', handleContextInteract, true)
    }
  }, [
    activeQuestRewardNotification,
    charging,
    displayedScene,
    docked,
    gameModalSection,
    runtimeOverlayMode,
    sceneFading,
    selectedScene,
    startCharging,
    stationDistance,
    toggleDocked,
    worldStateLoaded,
  ])

  const interfaceRightInset = '0.75rem'
  const interfaceCenterX = '50%'
  const utcClock = formatClockLabel(clockNowMs, 'UTC')
  const localClock = formatClockLabel(clockNowMs, 'LOCAL')
  const localZoneShort = Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
    .formatToParts(new Date(clockNowMs))
    .find((part) => part.type === 'timeZoneName')?.value ?? 'Local'
  const panelAlphaStrong = Math.min(1, panelOpacity + 0.1)
  const uiLayerStyle: CSSProperties = {
    '--panel-alpha': panelOpacity.toFixed(2),
    '--panel-alpha-strong': panelAlphaStrong.toFixed(2),
  } as CSSProperties
  const chargeValueLabel = energy.toLocaleString(undefined, { maximumFractionDigits: 4 })
  const chargeMaxLabel = maxEnergy.toLocaleString(undefined, { maximumFractionDigits: 4 })
  const stationPrompt = useMemo(() => {
    const canDock = !docked && stationDistance <= STATION_DOCKING_RANGE_METERS
    if (canDock) {
      return {
        title: 'Station in Range',
        action: 'Press E to Dock',
      }
    }

    const canStartCharge = docked && !charging && stationDistance <= CHARGING_RANGE_METERS
    if (canStartCharge) {
      return {
        title: 'Docked to Station',
        action: 'Press E to Charge',
      }
    }

    return null
  }, [charging, docked, stationDistance])
  const showStationPrompt =
    stationPrompt
    && displayedScene === 'space'
    && selectedScene === 'space'
    && worldStateLoaded
    && !sceneFading
    && runtimeOverlayMode === 'running'
    && gameModalSection === null
    && activeQuestRewardNotification === null
  const overlaySuppressed = gameModalSection !== null || activeQuestRewardNotification !== null || runtimeOverlayMode !== 'running'
  const commsPortrait = useMemo(() => {
    if (activeCommsSpeaker) {
      return activeCommsSpeaker
    }

    return {
      id: 'player',
      name: playerUsername,
      role: 'Player',
      imageUrl: defaultPlayerCommsImage,
    }
  }, [activeCommsSpeaker, playerUsername])
  const commsPortraitImageUrl = portraitImageError ? defaultPlayerCommsImage : commsPortrait.imageUrl

  useEffect(() => {
    setPortraitImageError(false)
  }, [commsPortrait.imageUrl])

  useEffect(() => {
    if (!playerNameEditing) {
      return
    }

    const node = playerNameEditorRef.current
    if (!node) {
      return
    }

    node.textContent = playerUsername
    node.focus()

    const selection = window.getSelection()
    if (!selection) {
      return
    }

    const range = document.createRange()
    range.selectNodeContents(node)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }, [playerNameEditing, playerUsername])

  const beginPlayerNameEdit = () => {
    cancelPlayerNameEditRef.current = false
    setPlayerNameEditing(true)
  }

  const finishPlayerNameEdit = () => {
    const cancelled = cancelPlayerNameEditRef.current
    cancelPlayerNameEditRef.current = false

    const nextName = playerNameEditorRef.current?.textContent ?? playerUsername
    setPlayerNameEditing(false)

    if (!cancelled) {
      setPlayerUsername(nextName)
    }
  }

  const onPlayerNameEditorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancelPlayerNameEditRef.current = true
      event.currentTarget.blur()
    }
  }

  const applyWorkspacePreset = (preset: WorkspacePreset) => {
    setWorkspacePreset(preset)

    if (preset === 'labFirst') {
      openGameMenuSection('laboratory')
      return
    }
  }
  const handlePanelDragStart = (panelId: PanelId) => {
    setDraggingPanelId(panelId)
    setDragPreview(null)
  }
  const handlePanelDragEnd = () => {
    setDraggingPanelId(null)
    setDragPreview(null)
  }
  const pulseCrosshairFeedback = (feedback: CrosshairFeedback) => {
    setCrosshairFeedback(feedback)

    if (crosshairFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(crosshairFeedbackTimeoutRef.current)
    }

    const resetDelay = feedback === 'blocked' ? 200 : 140
    crosshairFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCrosshairFeedback('idle')
      crosshairFeedbackTimeoutRef.current = null
    }, resetDelay)
  }
  const handleStationFeedback = (event: StationFeedbackEvent) => {
    const roundedDistance = Math.max(0, event.distance).toFixed(0)
    const messageByKind: Record<StationFeedbackEvent['kind'], { text: string; tone: 'neutral' | 'success' | 'warning' }> = {
      enteredRange: {
        text: `Station range entered (${roundedDistance} m). Charging available.`,
        tone: 'success',
      },
      leftRange: {
        text: `Station range left (${roundedDistance} m).`,
        tone: 'warning',
      },
      chargingBlocked: {
        text: `Charging blocked: outside ${CHARGING_RANGE_METERS} m station range (${roundedDistance} m).`,
        tone: 'warning',
      },
      dockAvailable: {
        text: `Docking corridor available (${roundedDistance} m).`,
        tone: 'neutral',
      },
      dockUnavailable: {
        text: `Docking corridor left (${roundedDistance} m).`,
        tone: 'neutral',
      },
      docked: {
        text: 'Docking clamps engaged.',
        tone: 'success',
      },
      undocked: {
        text: 'Undocked. Returning to free-flight telemetry.',
        tone: 'neutral',
      },
    }

    const payload = messageByKind[event.kind]
    setStationFeedbackMessage(payload)

    if (stationFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(stationFeedbackTimeoutRef.current)
    }

    stationFeedbackTimeoutRef.current = window.setTimeout(() => {
      setStationFeedbackMessage(null)
      stationFeedbackTimeoutRef.current = null
    }, 1900)
  }
  const handleShipCollisionEvent = (event: ShipCollisionEvent) => {
    const sourceLabel: Record<ShipCollisionEvent['source'], string> = {
      asteroid: 'asteroid',
      station: 'station core',
      boundary: 'flight boundary',
      celestial: 'celestial body',
    }

    appendSimulationLog(
      `Hull impact detected: ${sourceLabel[event.source]} contact at ${event.impactSpeed.toFixed(1)} u/s.`,
    )
  }
  const switchScene = (nextScene: SceneView) => {
    if (nextScene === selectedScene && !sceneFading) {
      return
    }

    setSelectedScene(nextScene)

    if (sceneSwapTimeoutRef.current !== null) {
      window.clearTimeout(sceneSwapTimeoutRef.current)
    }

    setSceneFading(true)
    sceneSwapTimeoutRef.current = window.setTimeout(() => {
      setDisplayedScene(nextScene)
      setCrosshairTargetLocked(false)
      setCrosshairTargetDistance(null)
      setCrosshairFeedback('idle')
      setTargetLabelAnchors([])
      window.requestAnimationFrame(() => {
        setSceneFading(false)
      })
      sceneSwapTimeoutRef.current = null
    }, sceneFadeDurationMs)
  }
  const currentQuestFocusTarget = useMemo(() => {
    if (tutorialComplete) {
      return null
    }

    return tutorialChecklist[tutorialCurrentStepIndex]?.focusTarget ?? null
  }, [tutorialChecklist, tutorialCurrentStepIndex, tutorialComplete])
  return (
    <main className="relative h-full w-full overflow-hidden">
      <div
        data-tutorial-focus="space-viewport"
        className={`absolute inset-0 transition-opacity duration-[220ms] ${sceneFading ? 'opacity-0' : 'opacity-100'}`}
      >
        {displayedScene === 'space' ? (
          worldStateLoaded ? (
            <Suspense fallback={sceneLoadingFallback}>
              <SpaceViewport
                inputSuppressed={
                  overlaySuppressed
                  || selectedScene !== 'space'
                  || sceneFading
                }
                paused={runtimeOverlayMode !== 'running'}
                respawnSignal={shipRespawnSignal}
                charging={charging}
                docked={docked}
                activeSectorId={activeSectorId}
                questFocusTarget={currentQuestFocusTarget}
                worldSeed={worldSeed}
                depletedTargetIds={worldDepletedTargetIds}
                onTryFireLaser={() => tryFireMiningLaser()}
                onExtractionHit={(target) => {
                  void recordExtractionHit(target)
                }}
                onTargetDepleted={recordWorldTargetDepleted}
                onStationDistance={setStationDistanceFromScene}
                onActiveZoneChange={setActiveCleanupZone}
                onStationFeedback={handleStationFeedback}
                onShipCollisionEvent={handleShipCollisionEvent}
                onSelectObject={setSelectedObject}
                onTelemetry={setShipTelemetry}
                onRadarContacts={setRadarContacts}
                onShipFailure={handleFailure}
                onAimStateChange={({ targetLocked, targetDistance }) => {
                  setCrosshairTargetLocked(targetLocked)
                  setCrosshairTargetDistance(targetDistance)
                }}
                onCrosshairFeedback={pulseCrosshairFeedback}
                onTargetLabelAnchors={setTargetLabelAnchors}
                onPortalTransit={(targetSectorId) => {
                  void jumpToSector(targetSectorId)
                }}
              />
            </Suspense>
          ) : (
            <div className="h-full w-full bg-black" />
          )
        ) : (
          <Suspense fallback={sceneLoadingFallback}>
            <ShipInteriorViewport
              inputSuppressed={
                overlaySuppressed
                || selectedScene !== 'interior'
                || sceneFading
              }
            />
          </Suspense>
        )}
      </div>
      {displayedScene === 'space' && selectedScene === 'space' && worldStateLoaded && !sceneFading && (
        <>
          <CrosshairOverlay
            targetLocked={crosshairTargetLocked}
            targetDistance={crosshairTargetDistance}
            feedback={crosshairFeedback}
            suppressed={overlaySuppressed}
          />
          <TargetLabelsOverlay
            labels={targetLabelAnchors}
            suppressed={overlaySuppressed}
          />
        </>
      )}

      <div className="ui-layer pointer-events-none absolute inset-0" data-density={uiDensity} style={uiLayerStyle}>
        {showStationPrompt && (
          <div className="pointer-events-none absolute left-1/2 top-[34%] z-30 -translate-x-1/2 text-center">
            <div className="panel-shell rounded-lg px-4 py-2">
              <p className="ui-note text-slate-200">{stationPrompt.title}</p>
              <p className="text-lg font-semibold tracking-[0.04em] text-[#78ef00]">{stationPrompt.action}</p>
            </div>
          </div>
        )}
        {stationFeedbackMessage && (
          <div
            className="pointer-events-none absolute left-1/2 top-[4.8rem] z-30 -translate-x-1/2"
          >
            <div className={`panel-shell rounded px-3 py-1.5 ui-note ${stationFeedbackToneClass(stationFeedbackMessage.tone)}`}>
              {stationFeedbackMessage.text}
            </div>
          </div>
        )}
        <header
          className={`panel-shell pointer-events-auto absolute top-2.5 z-30 flex -translate-x-1/2 flex-col rounded-xl ${
            uiDensity === 'compact' ? 'gap-1.5 px-3 py-2' : 'gap-2 px-3.5 py-2.5'
          }`}
          style={{
            left: interfaceCenterX,
            width: 'fit-content',
            maxWidth: 'calc(100% - 1.5rem)',
          }}
        >
          <div className="pointer-events-none absolute right-3 top-2 text-right">
            <p className="ui-note text-slate-100">UTC {utcClock}</p>
            <p className="ui-note text-slate-100">{localZoneShort} {localClock}</p>
            <p
              className="ui-note pt-0.5 font-semibold tracking-[0.08em]"
              style={{ color: docked ? '#78ef00' : '#f87171' }}
            >
              {docked ? 'DOCKED' : 'UNDOCKED'}
            </p>
          </div>
          <div className="pointer-events-none absolute bottom-2 right-3 text-right">
            <p className="ui-note mb-1 tracking-[0.06em] text-slate-200">
              CHARGE {chargeValueLabel} / {chargeMaxLabel}
            </p>
            <p className="text-[1.1rem] font-semibold leading-none text-slate-100">
              {credits.toFixed(1)} credits
            </p>
          </div>
          <div className={`flex items-stretch ${uiDensity === 'compact' ? 'gap-2.5 pr-32' : 'gap-3 pr-36'}`}>
            <aside
              className={`relative overflow-hidden rounded-md bg-slate-950/80 shadow-inner shadow-black/40 ${
                uiDensity === 'compact'
                  ? 'h-20 min-h-20 w-20 min-w-20'
                  : 'h-24 min-h-24 w-24 min-w-24'
              }`}
            >
              <img
                src={commsPortraitImageUrl}
                alt={`${commsPortrait.name} portrait`}
                className="h-full w-full object-cover"
                onError={() => setPortraitImageError(true)}
              />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-h-[1.5rem] items-center">
                {playerNameEditing ? (
                  <div
                    ref={playerNameEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    onBlur={finishPlayerNameEdit}
                    onKeyDown={onPlayerNameEditorKeyDown}
                    className="min-w-0 cursor-text truncate text-[1.1rem] leading-none text-slate-200 focus:outline-none"
                    aria-label="Player username"
                    role="textbox"
                  />
                ) : (
                  <div
                    tabIndex={0}
                    onClick={beginPlayerNameEdit}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        beginPlayerNameEdit()
                      }
                    }}
                    className="min-w-0 cursor-text truncate text-left text-[1.1rem] leading-none text-slate-200 hover:text-slate-100 focus:outline-none"
                    aria-label="Edit player username"
                  >
                    {playerUsername}
                  </div>
                )}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-0.5">
                <span className="ui-label pr-[4px]">Preset</span>
                {workspacePresets.map((preset) => (
                  <button key={preset.id} onClick={() => applyWorkspacePreset(preset.id)} className={chipButtonClass(false)}>
                    {preset.label}
                  </button>
                ))}
                <button onClick={toggleWorkspaceCustomizer} className={chipButtonClass(workspaceCustomizerOpen)}>
                  {workspaceCustomizerOpen ? 'Close Customizer' : 'Customize'}
                </button>
              </div>
            </div>
          </div>
        </header>

        <WorkspaceCustomizer
          open={workspaceCustomizerOpen}
          rightOffset={interfaceRightInset}
          uiDensity={uiDensity}
          panelOpacity={panelOpacity}
          onSetDensity={setUiDensity}
          onSetOpacity={setPanelOpacity}
          onPreset={applyWorkspacePreset}
          onReset={resetWorkspaceUi}
          onClose={toggleWorkspaceCustomizer}
        />

        <DockSidebar
          side="left"
          panelIds={leftPanels}
          hiddenPanels={hiddenPanels}
          panelSlotHints={panelSlotHints}
          movePanel={movePanel}
          togglePanelVisibility={togglePanelVisibility}
          rightInset={interfaceRightInset}
          uiDensity={uiDensity}
          draggingPanelId={draggingPanelId}
          dragPreview={dragPreview}
          onDragPreviewChange={setDragPreview}
          onPanelDragStart={handlePanelDragStart}
          onPanelDragEnd={handlePanelDragEnd}
          selectedScene={selectedScene}
          onSwitchScene={switchScene}
          gameMenuSection={gameModalSection}
          onOpenGameMenuSection={openGameMenuSection}
        />

        <DockSidebar
          side="right"
          panelIds={rightPanels}
          hiddenPanels={hiddenPanels}
          panelSlotHints={panelSlotHints}
          movePanel={movePanel}
          togglePanelVisibility={togglePanelVisibility}
          rightInset={interfaceRightInset}
          uiDensity={uiDensity}
          draggingPanelId={draggingPanelId}
          dragPreview={dragPreview}
          onDragPreviewChange={setDragPreview}
          onPanelDragStart={handlePanelDragStart}
          onPanelDragEnd={handlePanelDragEnd}
          selectedScene={selectedScene}
          onSwitchScene={switchScene}
          gameMenuSection={gameModalSection}
          onOpenGameMenuSection={openGameMenuSection}
        />

        <div
          className="pointer-events-none absolute bottom-4 z-30 -translate-x-1/2"
          style={{ left: interfaceCenterX }}
        >
          <ShipStatusBar />
        </div>

        {runtimeOverlayMode !== 'mainMenu' && gameModalSection && (
          <GameModal
            section={gameModalSection}
            onSectionChange={openGameMenuSection}
            onClose={() => openGameMenuSection(null)}
          />
        )}

        {runtimeOverlayMode === 'paused' && (
          <div className="pointer-events-none absolute left-1/2 top-[5.1rem] z-[70] -translate-x-1/2">
            <div className="panel-shell rounded px-3 py-1.5 text-center">
              <p className="ui-note">Scene paused. Press Esc again for Main Menu.</p>
            </div>
          </div>
        )}

        {runtimeOverlayMode === 'mainMenu' && (
          <MainMenuModal
            canContinue={sessionStarted}
            canSave={canCloudSave}
            canLoad={canCloudLoad}
            cloudEnabled={cloudSavesEnabled}
            cloudSignedIn={cloudSignedIn}
            cloudBusy={cloudBusy}
            cloudUserEmail={cloudUserEmail}
            cloudSaveUpdatedAt={cloudSaveUpdatedAt}
            authEmail={cloudAuthEmail}
            statusMessage={cloudStatusMessage}
            errorMessage={cloudErrorMessage}
            onAuthEmailChange={setCloudAuthEmail}
            onContinue={continueSession}
            onStartNewGame={() => {
              void handleStartNewGame()
            }}
            onSave={() => {
              void handleCloudSave()
            }}
            onLoad={() => {
              void handleCloudLoad()
            }}
            onSendMagicLink={() => {
              void handleSendMagicLink()
            }}
            onSignOut={() => {
              void handleCloudSignOut()
            }}
          />
        )}

        {runtimeOverlayMode !== 'mainMenu' && activeQuestRewardNotification && (
          <QuestRewardModal
            notification={activeQuestRewardNotification}
            onClose={dismissQuestRewardNotification}
            onOpenQuests={() => {
              openGameMenuSection('quests')
              dismissQuestRewardNotification()
            }}
          />
        )}
      </div>
    </main>
  )
}








