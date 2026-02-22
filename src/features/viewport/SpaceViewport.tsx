import { useEffect, useRef, useState } from 'react'
import {
  Color3,
  Color4,
  Engine,
  Matrix,
  MeshBuilder,
  Quaternion,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from 'babylonjs'
import {
  CHARGING_RANGE_METERS,
  STATION_DOCKING_RANGE_METERS,
} from '@domain/spec/gameSpec'
import type { CleanupZoneDefinition, CleanupZoneId } from '@domain/spec/worldSpec'
import type { SectorId } from '@domain/spec/sectorSpec'
import { buildSpaceScene } from '@features/viewport/sceneBuilder'
import { createViewportInputController } from '@features/viewport/inputController'
import {
  buildRadarContacts,
  buildSelectionFromAsteroid,
  buildSelectionFromExtractionNode,
} from '@features/viewport/targetRendering'
import type {
  AsteroidEntity,
  DynamicCollisionBody,
  ExtractionNodeEntity,
  ShipCollisionEvent,
  CrosshairAimState,
  StationFeedbackEvent,
  SpaceViewportProps,
  TargetLabelAnchor,
} from '@features/viewport/types'

export type {
  CrosshairAimState,
  CrosshairFeedback,
  ShipCollisionEvent,
  StationFeedbackEvent,
} from '@features/viewport/types'

interface PersistedFlightState {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number; w: number }
  velocity: { x: number; y: number; z: number }
  shipHealth: number
  shotsFired: number
  fireCooldown: number
}

interface FlightDiagnosticsSettings {
  enabled: boolean
  cameraHardLock: boolean
  inputSmoothingEnabled: boolean
  fixedStepEnabled: boolean
}

interface FlightDiagnosticsSnapshot {
  fps: number
  frameDeltaMs: number
  simStepMs: number
  yawInputRaw: number
  pitchInputRaw: number
  yawInputApplied: number
  pitchInputApplied: number
  yawDelta: number
  pitchDelta: number
  speed: number
  cameraError: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) <= deadzone) {
    return 0
  }

  const sign = Math.sign(value)
  return ((Math.abs(value) - deadzone) / (1 - deadzone)) * sign
}

function shipBasis(node: TransformNode): { forward: Vector3; right: Vector3; up: Vector3 } {
  const rotation = node.rotationQuaternion ?? Quaternion.FromEulerVector(node.rotation)
  const rotationMatrix = Matrix.Identity()
  rotation.toRotationMatrix(rotationMatrix)

  const forward = Vector3.TransformNormal(new Vector3(0, 0, 1), rotationMatrix).normalize()
  const right = Vector3.TransformNormal(new Vector3(1, 0, 0), rotationMatrix).normalize()
  const up = Vector3.TransformNormal(new Vector3(0, 1, 0), rotationMatrix).normalize()

  return { forward, right, up }
}

function resolveActiveCleanupZoneId(
  position: Vector3,
  cleanupZones: CleanupZoneDefinition[],
): CleanupZoneId | null {
  let bestMatch: { zoneId: CleanupZoneId; distanceSquared: number } | null = null

  for (const zone of cleanupZones) {
    const dx = position.x - zone.center.x
    const dy = position.y - zone.center.y
    const dz = position.z - zone.center.z
    const distanceSquared = dx * dx + dy * dy + dz * dz
    const radiusSquared = zone.radius * zone.radius
    if (distanceSquared > radiusSquared) {
      continue
    }

    if (!bestMatch || distanceSquared < bestMatch.distanceSquared) {
      bestMatch = {
        zoneId: zone.id,
        distanceSquared,
      }
    }
  }

  if (!bestMatch) {
    return null
  }

  return bestMatch.zoneId
}

export function SpaceViewport({
  inputSuppressed = false,
  paused = false,
  respawnSignal = 0,
  charging = false,
  docked = false,
  activeSectorId = 'earthCorridor',
  questFocusTarget = null,
  worldSeed,
  depletedTargetIds = [],
  onTryFireLaser,
  onExtractionHit,
  onTargetDepleted,
  onStationDistance,
  onActiveZoneChange,
  onStationFeedback,
  onSelectObject,
  onTelemetry,
  onRadarContacts,
  onShipFailure,
  onShipCollisionEvent,
  onAimStateChange,
  onCrosshairFeedback,
  onTargetLabelAnchors,
  onPortalTransit,
}: SpaceViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const persistedFlightStateRef = useRef<PersistedFlightState | null>(null)
  const depletedTargetIdsRef = useRef<string[]>(depletedTargetIds)
  const lastWorldSeedRef = useRef<string | undefined>(worldSeed)
  const lastActiveSectorIdRef = useRef<SectorId>(activeSectorId)
  if (lastWorldSeedRef.current !== worldSeed) {
    lastWorldSeedRef.current = worldSeed
    depletedTargetIdsRef.current = depletedTargetIds
    persistedFlightStateRef.current = null
  }
  if (lastActiveSectorIdRef.current !== activeSectorId) {
    lastActiveSectorIdRef.current = activeSectorId
    depletedTargetIdsRef.current = depletedTargetIds
    persistedFlightStateRef.current = null
  }
  const inputSuppressedRef = useRef(inputSuppressed)
  const pausedRef = useRef(paused)
  const respawnSignalRef = useRef(respawnSignal)
  const chargingRef = useRef(charging)
  const dockedRef = useRef(docked)
  const questFocusTargetRef = useRef(questFocusTarget)
  const onTargetDepletedRef = useRef(onTargetDepleted)
  const onTryFireLaserRef = useRef(onTryFireLaser)
  const onExtractionHitRef = useRef(onExtractionHit)
  const onStationDistanceRef = useRef(onStationDistance)
  const onActiveZoneChangeRef = useRef(onActiveZoneChange)
  const onStationFeedbackRef = useRef(onStationFeedback)
  const onSelectObjectRef = useRef(onSelectObject)
  const onTelemetryRef = useRef(onTelemetry)
  const onRadarContactsRef = useRef(onRadarContacts)
  const onShipFailureRef = useRef(onShipFailure)
  const onShipCollisionEventRef = useRef(onShipCollisionEvent)
  const onAimStateChangeRef = useRef(onAimStateChange)
  const onCrosshairFeedbackRef = useRef(onCrosshairFeedback)
  const onTargetLabelAnchorsRef = useRef(onTargetLabelAnchors)
  const onPortalTransitRef = useRef(onPortalTransit)
  const [diagnosticsSettings, setDiagnosticsSettings] = useState<FlightDiagnosticsSettings>({
    enabled: false,
    cameraHardLock: false,
    inputSmoothingEnabled: true,
    fixedStepEnabled: true,
  })
  const diagnosticsSettingsRef = useRef(diagnosticsSettings)
  const [diagnosticsSnapshot, setDiagnosticsSnapshot] = useState<FlightDiagnosticsSnapshot>({
    fps: 0,
    frameDeltaMs: 0,
    simStepMs: 0,
    yawInputRaw: 0,
    pitchInputRaw: 0,
    yawInputApplied: 0,
    pitchInputApplied: 0,
    yawDelta: 0,
    pitchDelta: 0,
    speed: 0,
    cameraError: 0,
  })

  useEffect(() => {
    inputSuppressedRef.current = inputSuppressed
  }, [inputSuppressed])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    respawnSignalRef.current = respawnSignal
  }, [respawnSignal])

  useEffect(() => {
    chargingRef.current = charging
  }, [charging])

  useEffect(() => {
    dockedRef.current = docked
  }, [docked])

  useEffect(() => {
    questFocusTargetRef.current = questFocusTarget
  }, [questFocusTarget])

  useEffect(() => {
    onTargetDepletedRef.current = onTargetDepleted
  }, [onTargetDepleted])

  useEffect(() => {
    onTryFireLaserRef.current = onTryFireLaser
  }, [onTryFireLaser])

  useEffect(() => {
    onExtractionHitRef.current = onExtractionHit
  }, [onExtractionHit])

  useEffect(() => {
    onStationDistanceRef.current = onStationDistance
  }, [onStationDistance])

  useEffect(() => {
    onActiveZoneChangeRef.current = onActiveZoneChange
  }, [onActiveZoneChange])

  useEffect(() => {
    onStationFeedbackRef.current = onStationFeedback
  }, [onStationFeedback])

  useEffect(() => {
    onSelectObjectRef.current = onSelectObject
  }, [onSelectObject])

  useEffect(() => {
    onTelemetryRef.current = onTelemetry
  }, [onTelemetry])

  useEffect(() => {
    onRadarContactsRef.current = onRadarContacts
  }, [onRadarContacts])

  useEffect(() => {
    onShipFailureRef.current = onShipFailure
  }, [onShipFailure])

  useEffect(() => {
    onShipCollisionEventRef.current = onShipCollisionEvent
  }, [onShipCollisionEvent])

  useEffect(() => {
    onAimStateChangeRef.current = onAimStateChange
  }, [onAimStateChange])

  useEffect(() => {
    onCrosshairFeedbackRef.current = onCrosshairFeedback
  }, [onCrosshairFeedback])

  useEffect(() => {
    onTargetLabelAnchorsRef.current = onTargetLabelAnchors
  }, [onTargetLabelAnchors])

  useEffect(() => {
    onPortalTransitRef.current = onPortalTransit
  }, [onPortalTransit])

  useEffect(() => {
    diagnosticsSettingsRef.current = diagnosticsSettings
  }, [diagnosticsSettings])

  useEffect(() => {
    const handleDiagnosticsToggle = (event: KeyboardEvent) => {
      if (event.code !== 'F8') {
        return
      }

      event.preventDefault()
      setDiagnosticsSettings((current) => ({
        ...current,
        enabled: !current.enabled,
      }))
    }

    window.addEventListener('keydown', handleDiagnosticsToggle)

    return () => {
      window.removeEventListener('keydown', handleDiagnosticsToggle)
    }
  }, [])

  useEffect(() => {
    depletedTargetIdsRef.current = depletedTargetIds
  }, [depletedTargetIds])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
    })
    const scene = new Scene(engine)
    scene.clearColor = new Color4(0, 0, 0, 1)

    const {
      camera,
      ship,
      stationCore,
      stationChargeRing,
      stationDockRing,
      stationBeacon,
      stationChargeRingMaterial,
      stationDockRingMaterial,
      stationBeaconMaterial,
      highlightLayer,
      projectileMaterial,
      asteroids,
      extractionNodes,
      projectiles,
      cleanupZones,
      celestialLabelTargets,
      dynamicCollisionBodies,
      portalGate,
      portalDestinationSectorId,
      worldTargetIds,
      spawnAsteroidByTargetId,
      updateCelestialBodies,
      updateThrusterFx,
    } = buildSpaceScene(scene, {
      seed: worldSeed,
      depletedTargetIds: depletedTargetIdsRef.current,
      sectorId: activeSectorId,
    })

    const questMarkerMaterial = new StandardMaterial('quest-marker-material', scene)
    questMarkerMaterial.diffuseColor = Color3.FromHexString('#78ef00')
    questMarkerMaterial.emissiveColor = Color3.FromHexString('#78ef00')
    questMarkerMaterial.alpha = 0.8

    const zoneFocusMarker = MeshBuilder.CreateTorus(
      'quest-zone-focus-marker',
      { diameter: 20, thickness: 0.65, tessellation: 72 },
      scene,
    )
    zoneFocusMarker.rotation.x = Math.PI * 0.5
    zoneFocusMarker.material = questMarkerMaterial
    zoneFocusMarker.isPickable = false
    zoneFocusMarker.setEnabled(false)

    const targetFocusMarker = MeshBuilder.CreateTorus(
      'quest-target-focus-marker',
      { diameter: 6, thickness: 0.28, tessellation: 48 },
      scene,
    )
    targetFocusMarker.rotation.x = Math.PI * 0.5
    targetFocusMarker.material = questMarkerMaterial
    targetFocusMarker.isPickable = false
    targetFocusMarker.setEnabled(false)

    const stationFocusMarker = MeshBuilder.CreateTorus(
      'quest-station-focus-marker',
      { diameter: 10, thickness: 0.4, tessellation: 60 },
      scene,
    )
    stationFocusMarker.rotation.x = Math.PI * 0.5
    stationFocusMarker.material = questMarkerMaterial
    stationFocusMarker.isPickable = false
    stationFocusMarker.setEnabled(false)
    const shipVelocity = Vector3.Zero()
    const cameraBackDistance = 16
    const cameraUpDistance = 5.2
    const cameraLookAheadDistance = 30
    const cameraLookDownOffset = 2.45
    const minCameraZoom = 1
    const maxCameraZoom = 2.6
    const cameraZoomStep = 0.12
    const cameraZoomSmoothing = 11
    let cameraZoomTarget = minCameraZoom
    let cameraZoomCurrent = minCameraZoom

    let selectedAsteroidId: string | null = null
    let shipHealth = 100
    let shotsFired = 0
    const steeringRate = 2.4
    const steeringDeadzone = 0.05
    const steeringSmoothingStrength = 11
    const steeringOutputDeadband = 0.006
    const shipCollisionRadius = 1.05
    const collisionResolveIterations = 2
    const collisionSweepIterations = 3
    const collisionTimeEpsilon = 0.0025
    const collisionPushEpsilon = 0.001
    const collisionSurfaceDrag = 0.985
    const impactDamageSpeedThreshold = 10
    const impactDamageScale = 0.34
    const maxImpactDamagePerStep = 8
    const stationCoreCollisionRadius = 4.35
    const arenaHalfWidth = 420
    const arenaHalfHeight = 160
    const arenaHalfDepth = 420
    const fixedStepSeconds = 1 / 60
    const maxFixedStepsPerFrame = 6
    const maxFrameDeltaSeconds = 0.1
    let fixedStepAccumulatorSeconds = 0
    let smoothedYawInput = 0
    let smoothedPitchInput = 0
    let lastRespawnSignal = respawnSignalRef.current
    let persistentMiningEnabled = false
    let lastPersistentMiningTogglePressed = false

    const fireIntervalSeconds = 0.23
    let fireCooldown = 0
    let extractionNodeCooldown = 0
    const portalTransitRadius = 5.4
    const portalTransitCooldownMs = 1500
    let portalTransitCooldownUntilMs = 0
    let wasInsidePortalGate = false
    const worldUpAxis = new Vector3(0, 1, 0)
    const orientationMatrix = Matrix.Identity()
    const orientationForward = Vector3.Zero()
    const orientationRight = Vector3.Zero()
    const orientationUp = Vector3.Zero()
    const pitchLimit = Math.PI * 0.49
    let yawAngle = 0
    let pitchAngle = 0
    const aimRange = 430
    const aimLockDotThreshold = 0.996
    const aimUnlockDotThreshold = 0.993
    let lastAimPush = 0
    let lastAimState: CrosshairAimState = {
      targetLocked: false,
      targetDistance: null,
    }
    let aimTargetId: string | null = null
    let lastTargetLabelsPush = 0
    const targetLabelPushThrottleMs = 16
    const targetLabelVisibilityRange = 340
    const targetLabelMaxVisible = 12
    const targetLabelMinSpacingX = 110
    const targetLabelMinSpacingY = 26
    const targetLabelMicroSmoothingFactor = 0.22
    const targetLabelSnapDistancePx = 2.4
    const targetLabelDeadbandPx = 0.35
    const celestialLabelMicroSmoothingFactor = 0.18
    const celestialLabelSnapDistancePx = 180
    const celestialLabelDeadbandPx = 0.45
    const targetLabelHistoryRetentionMs = 900
    const projectionWorldMatrix = Matrix.Identity()
    const labelAnchorHistory = new Map<string, { x: number; y: number; timestamp: number }>()
    const collisionDelta = Vector3.Zero()
    const collisionNormal = Vector3.Zero()
    const collisionFallbackAxis = new Vector3(0, 1, 0)

    let lastTelemetryPush = 0
    let lastStationFeedbackPush = 0
    let lastCollisionFeedbackPush = 0
    let lastWorldStateSyncPush = 0
    let lastDiagnosticsPush = 0
    const stationFeedbackThrottleMs = 260
    const collisionFeedbackThrottleMs = 1200
    const collisionFeedbackMinImpactSpeed = impactDamageSpeedThreshold
    const collisionFeedbackPriorityImpactSpeed = impactDamageSpeedThreshold + 10
    const worldStateSyncThrottleMs = 90
    const asteroidByTargetId = new Map<string, AsteroidEntity>(
      asteroids.map((asteroid) => [asteroid.targetId, asteroid] as const),
    )
    const extractionNodeByMeshId = new Map<string, ExtractionNodeEntity>(
      extractionNodes.map((node) => [node.mesh.id, node] as const),
    )
    const pendingDepletedTargetIds = new Set<string>()

    const resolveCameraRig = (zoomLevel: number) => {
      const zoom = clamp(zoomLevel, minCameraZoom, maxCameraZoom)
      return {
        backDistance: cameraBackDistance * zoom,
        upDistance: cameraUpDistance * zoom,
        lookAheadDistance: cameraLookAheadDistance * zoom,
        lookDownOffset: cameraLookDownOffset * zoom,
      }
    }

    const persistedFlightState = persistedFlightStateRef.current
    if (persistedFlightState) {
      ship.position.copyFromFloats(
        persistedFlightState.position.x,
        persistedFlightState.position.y,
        persistedFlightState.position.z,
      )
      ship.rotationQuaternion = new Quaternion(
        persistedFlightState.rotation.x,
        persistedFlightState.rotation.y,
        persistedFlightState.rotation.z,
        persistedFlightState.rotation.w,
      )
      shipVelocity.copyFromFloats(
        persistedFlightState.velocity.x,
        persistedFlightState.velocity.y,
        persistedFlightState.velocity.z,
      )
      shipHealth = persistedFlightState.shipHealth
      shotsFired = persistedFlightState.shotsFired
      fireCooldown = Math.max(0, persistedFlightState.fireCooldown)

      const { forward, up } = shipBasis(ship)
      const cameraRig = resolveCameraRig(cameraZoomCurrent)
      camera.position.copyFrom(
        ship.position
          .subtract(forward.scale(cameraRig.backDistance))
          .add(up.scale(cameraRig.upDistance)),
      )
      camera.setTarget(
        ship.position
          .add(forward.scale(cameraRig.lookAheadDistance))
          .subtract(up.scale(cameraRig.lookDownOffset)),
      )
      persistedFlightStateRef.current = null
    }

    const syncOrientationFromAngles = () => {
      const cosPitch = Math.cos(pitchAngle)
      orientationForward.copyFromFloats(
        Math.sin(yawAngle) * cosPitch,
        Math.sin(pitchAngle),
        Math.cos(yawAngle) * cosPitch,
      )
      if (orientationForward.lengthSquared() <= 0.000001) {
        orientationForward.copyFromFloats(0, 0, 1)
      }
      orientationForward.normalize()

      orientationRight.copyFrom(Vector3.Cross(worldUpAxis, orientationForward))
      if (orientationRight.lengthSquared() <= 0.0001) {
        const fallbackBasis = shipBasis(ship)
        orientationRight.copyFrom(fallbackBasis.right)
      }
      if (orientationRight.lengthSquared() <= 0.0001) {
        orientationRight.copyFromFloats(1, 0, 0)
      }
      orientationRight.normalize()

      orientationUp.copyFrom(Vector3.Cross(orientationForward, orientationRight))
      if (orientationUp.lengthSquared() <= 0.0001) {
        orientationUp.copyFromFloats(0, 1, 0)
      }
      orientationUp.normalize()

      Matrix.FromXYZAxesToRef(orientationRight, orientationUp, orientationForward, orientationMatrix)
      const nextRotation = Quaternion.FromRotationMatrix(orientationMatrix)
      nextRotation.normalize()
      ship.rotationQuaternion = nextRotation
    }

    const initializeAnglesFromShip = () => {
      const initialBasis = shipBasis(ship)
      yawAngle = Math.atan2(initialBasis.forward.x, initialBasis.forward.z)
      pitchAngle = clamp(Math.asin(clamp(initialBasis.forward.y, -1, 1)), -pitchLimit, pitchLimit)
      syncOrientationFromAngles()
    }

    initializeAnglesFromShip()

    const stationDistanceAtStart = Vector3.Distance(ship.position, stationCore.position)
    let activeZoneId = resolveActiveCleanupZoneId(ship.position, cleanupZones)
    const highRiskZone = cleanupZones.find((zone) => zone.id === 'highRiskSalvagePocket') ?? null
    let wasInChargeRange = stationDistanceAtStart <= CHARGING_RANGE_METERS
    let wasDockable = stationDistanceAtStart <= STATION_DOCKING_RANGE_METERS
    let wasDocked = Boolean(dockedRef.current)

    const stationColorDim = Color3.FromHexString('#2a2a2a')
    const stationColorInRange = Color3.FromHexString('#78ef00')
    const stationColorCharging = Color3.FromHexString('#b8ff6f')
    const stationColorDock = Color3.FromHexString('#e8e8e8')
    const stationColorDocked = Color3.FromHexString('#c6fbff')

    const publishStationFeedback = (
      event: StationFeedbackEvent,
      force = false,
    ) => {
      const callback = onStationFeedbackRef.current
      if (!callback) {
        return
      }

      const now = performance.now()
      if (!force && now - lastStationFeedbackPush < stationFeedbackThrottleMs) {
        return
      }

      lastStationFeedbackPush = now
      callback(event)
    }

    const publishCollisionFeedback = (
      source: ShipCollisionEvent['source'],
      impactSpeed: number,
      force = false,
    ) => {
      const callback = onShipCollisionEventRef.current
      if (!callback || impactSpeed < collisionFeedbackMinImpactSpeed) {
        return
      }

      const now = performance.now()
      const highPriorityImpact = impactSpeed >= collisionFeedbackPriorityImpactSpeed
      if (!force && !highPriorityImpact && now - lastCollisionFeedbackPush < collisionFeedbackThrottleMs) {
        return
      }

      lastCollisionFeedbackPush = now
      callback({
        source,
        impactSpeed,
      })
    }

    const publishAimState = (nextState: CrosshairAimState, force = false) => {
      const aimStateCallback = onAimStateChangeRef.current
      if (!aimStateCallback) {
        return
      }

      const now = performance.now()
      const lockedChanged = nextState.targetLocked !== lastAimState.targetLocked
      const currentDistance = nextState.targetDistance ?? 0
      const previousDistance = lastAimState.targetDistance ?? 0
      const distanceChanged = Math.abs(currentDistance - previousDistance) >= 2
      const throttled = now - lastAimPush < 90

      if (!force && !lockedChanged && !distanceChanged && throttled) {
        return
      }

      lastAimPush = now
      lastAimState = nextState
      aimStateCallback(nextState)
    }

    const selectObjectTarget = (target: AsteroidEntity | ExtractionNodeEntity | null) => {
      highlightLayer.removeAllMeshes()

      if (!target) {
        selectedAsteroidId = null
        onSelectObjectRef.current(null)
        return
      }

      selectedAsteroidId = target.mesh.id
      highlightLayer.addMesh(target.mesh, Color3.FromHexString('#e5e7eb'))
      if ('nodeId' in target) {
        onSelectObjectRef.current(buildSelectionFromExtractionNode(target, ship.position))
      } else {
        onSelectObjectRef.current(buildSelectionFromAsteroid(target, ship.position))
      }
    }

    const removeAsteroidByIndex = (index: number) => {
      const asteroid = asteroids[index]
      asteroidByTargetId.delete(asteroid.targetId)

      if (selectedAsteroidId === asteroid.mesh.id) {
        selectObjectTarget(null)
      }

      if (aimTargetId === asteroid.mesh.id) {
        aimTargetId = null
      }

      asteroid.mesh.dispose()
      asteroids.splice(index, 1)
    }

    const synchronizeWorldTargets = (force = false) => {
      const now = performance.now()
      if (!force && now - lastWorldStateSyncPush < worldStateSyncThrottleMs) {
        return
      }

      lastWorldStateSyncPush = now
      const reportedDepletedTargetSet = new Set(depletedTargetIdsRef.current)
      for (const targetId of pendingDepletedTargetIds) {
        if (reportedDepletedTargetSet.has(targetId)) {
          pendingDepletedTargetIds.delete(targetId)
        }
      }

      const depletedTargetSet = new Set<string>([
        ...reportedDepletedTargetSet,
        ...pendingDepletedTargetIds,
      ])

      for (let index = asteroids.length - 1; index >= 0; index -= 1) {
        const asteroid = asteroids[index]
        if (!depletedTargetSet.has(asteroid.targetId)) {
          continue
        }

        removeAsteroidByIndex(index)
      }

      for (const targetId of worldTargetIds) {
        if (depletedTargetSet.has(targetId) || asteroidByTargetId.has(targetId)) {
          continue
        }

        const spawnedAsteroid = spawnAsteroidByTargetId(targetId)
        if (!spawnedAsteroid) {
          continue
        }

        asteroids.push(spawnedAsteroid)
        asteroidByTargetId.set(spawnedAsteroid.targetId, spawnedAsteroid)
      }
    }

    const pickAsteroidAtClientPoint = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const pickResult = scene.pick(clientX - rect.left, clientY - rect.top)
      if (!pickResult?.hit || !pickResult.pickedMesh) {
        selectObjectTarget(null)
        return
      }

      const asteroid = asteroids.find((entry) => entry.mesh === pickResult.pickedMesh)
      if (asteroid) {
        selectObjectTarget(asteroid)
        return
      }

      const extractionNode = extractionNodes.find((entry) => entry.mesh === pickResult.pickedMesh)
      selectObjectTarget(extractionNode ?? null)
    }

    const inputController = createViewportInputController({
      canvas,
      inputSuppressedRef,
      onPickAsteroidAtClientPoint: pickAsteroidAtClientPoint,
    })
    const handleCanvasWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) {
        return
      }
      event.preventDefault()
      const direction = Math.sign(event.deltaY)
      cameraZoomTarget = clamp(
        cameraZoomTarget + direction * cameraZoomStep,
        minCameraZoom,
        maxCameraZoom,
      )
    }
    canvas.addEventListener('wheel', handleCanvasWheel, { passive: false })
    const pressedKeys = inputController.pressedKeys
    const steeringInput = inputController.steeringInput

    const resolveCameraAimRay = (): { origin: Vector3; direction: Vector3 } => {
      const cameraRay = camera.getForwardRay(1)
      const direction = cameraRay.direction.clone()
      direction.normalize()
      return {
        origin: camera.position.clone(),
        direction,
      }
    }

    const resolveFallbackAimPoint = (distance = aimRange * 2): Vector3 => {
      const ray = resolveCameraAimRay()
      return ray.origin.add(ray.direction.scale(distance))
    }

    const fireProjectile = (aimPoint: Vector3) => {
      const { forward } = shipBasis(ship)
      const spawnPosition = ship.position.add(forward.scale(1.9)).add(new Vector3(0, 0.2, 0))
      const shotDirection = aimPoint.subtract(spawnPosition)
      if (shotDirection.lengthSquared() <= 0.0001) {
        shotDirection.copyFrom(forward)
      }
      shotDirection.normalize()

      const projectileMesh = MeshBuilder.CreateSphere(
        `projectile-${shotsFired}`,
        {
          diameter: 0.28,
          segments: 8,
        },
        scene,
      )
      projectileMesh.material = projectileMaterial
      projectileMesh.position.copyFrom(spawnPosition)

      projectiles.push({
        mesh: projectileMesh,
        velocity: shotDirection.scale(92),
        ttl: 2.6,
      })

      shotsFired += 1
    }

    const resetShipState = () => {
      ship.position.copyFromFloats(0, 0, 0)
      shipVelocity.setAll(0)
      ship.rotationQuaternion = Quaternion.Identity()
      yawAngle = 0
      pitchAngle = 0
      smoothedYawInput = 0
      smoothedPitchInput = 0
      persistentMiningEnabled = false
      lastPersistentMiningTogglePressed = false
      wasInsidePortalGate = false
      syncOrientationFromAngles()
      shipHealth = 100
      extractionNodeCooldown = 0
      inputController.resetInputs()
      selectObjectTarget(null)
      publishAimState({ targetLocked: false, targetDistance: null }, true)
      const stationDistance = Vector3.Distance(ship.position, stationCore.position)
      wasInChargeRange = stationDistance <= CHARGING_RANGE_METERS
      wasDockable = stationDistance <= STATION_DOCKING_RANGE_METERS
      wasDocked = Boolean(dockedRef.current)
    }

    const resolveAimTarget = (): { asteroid: AsteroidEntity; distance: number; dot: number } | null => {
      const { origin, direction } = resolveCameraAimRay()
      let bestMatch: { asteroid: AsteroidEntity; distance: number; dot: number } | null = null

      for (const asteroid of asteroids) {
        const toTarget = asteroid.mesh.position.subtract(origin)
        const distance = toTarget.length()
        if (distance <= 0.001 || distance > aimRange) {
          continue
        }

        const targetDirection = toTarget.scale(1 / distance)
        const dot = Vector3.Dot(direction, targetDirection)
        if (
          !bestMatch
          || dot > bestMatch.dot
          || (Math.abs(dot - bestMatch.dot) < 0.0006 && distance < bestMatch.distance)
        ) {
          bestMatch = {
            asteroid,
            distance,
            dot,
          }
        }
      }

      if (!bestMatch) {
        return null
      }

      return bestMatch
    }

    const resolveNearestExtractionNode = (): {
      node: ExtractionNodeEntity
      distance: number
    } | null => {
      let bestMatch: { node: ExtractionNodeEntity; distance: number } | null = null

      for (const extractionNode of extractionNodes) {
        const distance = Vector3.Distance(ship.position, extractionNode.mesh.position)
        if (distance > extractionNode.extractionRange) {
          continue
        }

        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = {
            node: extractionNode,
            distance,
          }
        }
      }

      return bestMatch
    }

    const updateStationVisuals = (
      stationDistance: number,
      deltaSeconds: number,
      frameTimeMs: number,
    ) => {
      const inChargeRange = stationDistance <= CHARGING_RANGE_METERS
      const dockable = stationDistance <= STATION_DOCKING_RANGE_METERS
      const chargingActive = chargingRef.current
      const dockedActive = dockedRef.current

      const chargeRingColor = dockedActive
        ? stationColorDocked
        : chargingActive
          ? stationColorCharging
          : inChargeRange
            ? stationColorInRange
            : stationColorDim

      stationChargeRingMaterial.diffuseColor = Color3.Lerp(
        stationChargeRingMaterial.diffuseColor,
        chargeRingColor,
        0.11,
      )
      stationChargeRingMaterial.emissiveColor = Color3.Lerp(
        stationChargeRingMaterial.emissiveColor,
        chargeRingColor,
        0.17,
      )
      stationChargeRingMaterial.alpha = dockedActive
        ? 0.64
        : chargingActive
          ? 0.56
          : inChargeRange
            ? 0.36
            : 0.17

      const pulseScale = chargingActive
        ? 1 + Math.sin(frameTimeMs * 0.006) * 0.05
        : inChargeRange
          ? 1 + Math.sin(frameTimeMs * 0.0038) * 0.025
          : 1 + Math.sin(frameTimeMs * 0.0022) * 0.009
      stationChargeRing.scaling.x = pulseScale
      stationChargeRing.scaling.z = pulseScale
      stationChargeRing.rotation.y += deltaSeconds * (chargingActive ? 0.2 : 0.06)

      const dockRingColor = dockedActive
        ? stationColorDocked
        : dockable
          ? stationColorDock
          : stationColorDim
      stationDockRingMaterial.diffuseColor = Color3.Lerp(
        stationDockRingMaterial.diffuseColor,
        dockRingColor,
        0.13,
      )
      stationDockRingMaterial.emissiveColor = Color3.Lerp(
        stationDockRingMaterial.emissiveColor,
        dockRingColor,
        0.2,
      )
      stationDockRingMaterial.alpha = dockedActive ? 0.88 : dockable ? 0.58 : 0.2
      stationDockRing.rotation.y -= deltaSeconds * (dockable ? 0.28 : 0.08)

      const beaconColor = dockedActive
        ? stationColorDocked
        : chargingActive
          ? stationColorCharging
          : inChargeRange
            ? stationColorDock
            : stationColorDim
      stationBeaconMaterial.diffuseColor = Color3.Lerp(
        stationBeaconMaterial.diffuseColor,
        beaconColor,
        0.09,
      )
      stationBeaconMaterial.emissiveColor = Color3.Lerp(
        stationBeaconMaterial.emissiveColor,
        beaconColor,
        0.15,
      )
      stationBeaconMaterial.alpha = chargingActive ? 0.76 : inChargeRange ? 0.6 : 0.45
      stationBeacon.scaling.y = chargingActive
        ? 1 + Math.sin(frameTimeMs * 0.005) * 0.08
        : 1 + Math.sin(frameTimeMs * 0.0027) * 0.03
    }

    const pushStationTransitionFeedback = (
      stationDistance: number,
      inChargeRange: boolean,
      dockable: boolean,
    ) => {
      if (inChargeRange && !wasInChargeRange) {
        publishStationFeedback({ kind: 'enteredRange', distance: stationDistance }, true)
      }

      if (!inChargeRange && wasInChargeRange) {
        publishStationFeedback({ kind: 'leftRange', distance: stationDistance }, true)
        if (chargingRef.current) {
          publishStationFeedback({ kind: 'chargingBlocked', distance: stationDistance }, true)
        }
      }

      if (dockable && !wasDockable) {
        publishStationFeedback({ kind: 'dockAvailable', distance: stationDistance })
      }

      if (!dockable && wasDockable) {
        publishStationFeedback({ kind: 'dockUnavailable', distance: stationDistance })
      }

      const dockedNow = Boolean(dockedRef.current)
      if (dockedNow !== wasDocked) {
        publishStationFeedback(
          { kind: dockedNow ? 'docked' : 'undocked', distance: stationDistance },
          true,
        )
      }

      wasInChargeRange = inChargeRange
      wasDockable = dockable
      wasDocked = dockedNow
    }

    const updateActiveZone = (position: Vector3) => {
      const nextActiveZoneId = resolveActiveCleanupZoneId(position, cleanupZones)
      if (nextActiveZoneId === activeZoneId) {
        return
      }

      activeZoneId = nextActiveZoneId
      onActiveZoneChangeRef.current?.(nextActiveZoneId)
    }

    const nearestAsteroidByClass = (classId: AsteroidEntity['classId']): AsteroidEntity | null => {
      let bestMatch: { asteroid: AsteroidEntity; distanceSquared: number } | null = null

      for (const asteroid of asteroids) {
        if (asteroid.classId !== classId) {
          continue
        }

        const distanceSquared = Vector3.DistanceSquared(ship.position, asteroid.mesh.position)
        if (!bestMatch || distanceSquared < bestMatch.distanceSquared) {
          bestMatch = {
            asteroid,
            distanceSquared,
          }
        }
      }

      return bestMatch?.asteroid ?? null
    }

    const hideQuestFocusMarkers = () => {
      zoneFocusMarker.setEnabled(false)
      targetFocusMarker.setEnabled(false)
      stationFocusMarker.setEnabled(false)
    }

    const updateQuestFocusMarkers = (deltaSeconds: number, frameTimeMs: number) => {
      const focusTarget = questFocusTargetRef.current
      if (!focusTarget) {
        hideQuestFocusMarkers()
        return
      }

      if (focusTarget === 'space-zone-high-risk' && highRiskZone) {
        zoneFocusMarker.setEnabled(true)
        targetFocusMarker.setEnabled(false)
        stationFocusMarker.setEnabled(false)
        zoneFocusMarker.position.copyFromFloats(
          highRiskZone.center.x,
          highRiskZone.center.y,
          highRiskZone.center.z,
        )
        const baseScale = highRiskZone.radius / 10
        const pulse = 1 + Math.sin(frameTimeMs * 0.0034) * 0.06
        zoneFocusMarker.scaling.x = baseScale * pulse
        zoneFocusMarker.scaling.z = baseScale * pulse
        zoneFocusMarker.rotation.y += deltaSeconds * 0.2
        return
      }

      if (focusTarget === 'space-class-composite-junk') {
        const target = nearestAsteroidByClass('compositeJunk')
        if (!target) {
          hideQuestFocusMarkers()
          return
        }

        zoneFocusMarker.setEnabled(false)
        stationFocusMarker.setEnabled(false)
        targetFocusMarker.setEnabled(true)
        targetFocusMarker.position.copyFrom(target.mesh.position)
        targetFocusMarker.position.y += target.radius + 0.9
        const pulse = 1 + Math.sin(frameTimeMs * 0.0085) * 0.13
        targetFocusMarker.scaling.setAll(pulse)
        targetFocusMarker.rotation.y -= deltaSeconds * 0.95
        return
      }

      if (focusTarget === 'space-return-station') {
        zoneFocusMarker.setEnabled(false)
        targetFocusMarker.setEnabled(false)
        stationFocusMarker.setEnabled(true)
        stationFocusMarker.position.copyFrom(stationCore.position)
        stationFocusMarker.position.y += 1.2
        const pulse = 1 + Math.sin(frameTimeMs * 0.0054) * 0.09
        stationFocusMarker.scaling.x = pulse
        stationFocusMarker.scaling.z = pulse
        stationFocusMarker.rotation.y += deltaSeconds * 0.7
        return
      }

      hideQuestFocusMarkers()
    }

    const buildTargetLabelAnchors = (): TargetLabelAnchor[] => {
      const renderWidth = engine.getRenderWidth()
      const renderHeight = engine.getRenderHeight()
      if (renderWidth <= 0 || renderHeight <= 0) {
        return []
      }

      const globalViewport = camera.viewport.toGlobal(renderWidth, renderHeight)
      const transformMatrix = scene.getTransformMatrix()
      const cameraRay = camera.getForwardRay(1)
      cameraRay.direction.normalize()
      const cameraForward = cameraRay.direction
      const cameraRight = Vector3.Cross(cameraForward, new Vector3(0, 1, 0))
      if (cameraRight.lengthSquared() <= 0.0001) {
        cameraRight.copyFrom(Vector3.Cross(cameraForward, new Vector3(0, 0, 1)))
      }
      cameraRight.normalize()
      const cameraUp = Vector3.Cross(cameraRight, cameraForward).normalize()
      const now = performance.now()

      const candidates: Array<{
        targetId: string
        label: string
        x: number
        y: number
        distance: number
        priority: TargetLabelAnchor['priority']
      }> = []

      for (const asteroid of asteroids) {
        const targetId = asteroid.targetId
        const worldOffset = new Vector3(0, asteroid.radius + 1.1, 0)
        const distanceFromShip = Vector3.Distance(ship.position, asteroid.mesh.position)
        if (distanceFromShip > targetLabelVisibilityRange) {
          continue
        }

        const anchorPoint = asteroid.mesh.position.add(worldOffset)
        const toTarget = anchorPoint.subtract(camera.position)
        const distanceFromCamera = toTarget.length()
        if (distanceFromCamera <= 0.001) {
          continue
        }

        const facingDot = Vector3.Dot(cameraRay.direction, toTarget.scale(1 / distanceFromCamera))
        if (facingDot <= 0.05) {
          continue
        }

        const projected = Vector3.Project(anchorPoint, projectionWorldMatrix, transformMatrix, globalViewport)
        if (projected.z <= 0 || projected.z >= 1) {
          continue
        }

        if (
          projected.x < 16
          || projected.x > renderWidth - 16
          || projected.y < 16
          || projected.y > renderHeight - 16
        ) {
          continue
        }

        let priority: TargetLabelAnchor['priority'] = 'normal'
        if (targetId === selectedAsteroidId) {
          priority = 'selected'
        }
        if (targetId === aimTargetId) {
          priority = 'locked'
        }

        candidates.push({
          targetId,
          label: asteroid.label,
          x: projected.x,
          y: projected.y,
          distance: distanceFromShip,
          priority,
        })
      }

      for (const extractionNode of extractionNodes) {
        const targetId = `extraction-node-${extractionNode.nodeId}`
        const worldOffset = new Vector3(0, 2.5, 0)
        const distanceFromShip = Vector3.Distance(ship.position, extractionNode.mesh.position)
        if (distanceFromShip > targetLabelVisibilityRange * 2) {
          continue
        }

        const anchorPoint = extractionNode.mesh.position.add(worldOffset)
        const toTarget = anchorPoint.subtract(camera.position)
        const distanceFromCamera = toTarget.length()
        if (distanceFromCamera <= 0.001) {
          continue
        }

        const facingDot = Vector3.Dot(cameraRay.direction, toTarget.scale(1 / distanceFromCamera))
        if (facingDot <= 0.05) {
          continue
        }

        const projected = Vector3.Project(anchorPoint, projectionWorldMatrix, transformMatrix, globalViewport)
        if (projected.z <= 0 || projected.z >= 1) {
          continue
        }

        if (
          projected.x < 16
          || projected.x > renderWidth - 16
          || projected.y < 16
          || projected.y > renderHeight - 16
        ) {
          continue
        }

        let priority: TargetLabelAnchor['priority'] = 'normal'
        if (selectedAsteroidId === extractionNode.mesh.id) {
          priority = 'selected'
        }

        candidates.push({
          targetId,
          label: extractionNode.label,
          x: projected.x,
          y: projected.y,
          distance: distanceFromShip,
          priority,
        })
      }

      candidates.sort((a, b) => {
        const priorityWeight = (entry: { priority: TargetLabelAnchor['priority'] }) =>
          entry.priority === 'locked' ? 2 : entry.priority === 'selected' ? 1 : 0
        const priorityDelta = priorityWeight(b) - priorityWeight(a)
        if (priorityDelta !== 0) {
          return priorityDelta
        }

        const distanceDelta = a.distance - b.distance
        if (Math.abs(distanceDelta) >= 0.5) {
          return distanceDelta
        }

        return a.targetId.localeCompare(b.targetId)
      })

      const accepted: TargetLabelAnchor[] = []
      const seenTargetIds = new Set<string>()
      for (const candidate of candidates) {
        if (accepted.length >= targetLabelMaxVisible) {
          break
        }

        const overlaps = accepted.some(
          (anchor) =>
            Math.abs(anchor.x - candidate.x) < targetLabelMinSpacingX
            && Math.abs(anchor.y - candidate.y) < targetLabelMinSpacingY,
        )

        if (overlaps && candidate.priority === 'normal') {
          continue
        }

        const previous = labelAnchorHistory.get(candidate.targetId)
        const deltaX = previous ? candidate.x - previous.x : 0
        const deltaY = previous ? candidate.y - previous.y : 0
        const movementDistance = previous ? Math.hypot(deltaX, deltaY) : 0
        const shouldSnapToTarget = !previous || movementDistance > targetLabelSnapDistancePx
        const resolvedX = shouldSnapToTarget
          ? candidate.x
          : previous.x + deltaX * targetLabelMicroSmoothingFactor
        const resolvedY = shouldSnapToTarget
          ? candidate.y
          : previous.y + deltaY * targetLabelMicroSmoothingFactor
        const x = previous && Math.abs(resolvedX - previous.x) < targetLabelDeadbandPx
          ? previous.x
          : resolvedX
        const y = previous && Math.abs(resolvedY - previous.y) < targetLabelDeadbandPx
          ? previous.y
          : resolvedY

        labelAnchorHistory.set(candidate.targetId, { x, y, timestamp: now })
        seenTargetIds.add(candidate.targetId)

        accepted.push({
          targetId: candidate.targetId,
          label: candidate.label,
          x,
          y,
          priority: candidate.priority,
        })
      }

      for (const [targetId, history] of labelAnchorHistory.entries()) {
        if (seenTargetIds.has(targetId)) {
          continue
        }

        if (now - history.timestamp > targetLabelHistoryRetentionMs) {
          labelAnchorHistory.delete(targetId)
        }
      }

      const celestialAnchors: TargetLabelAnchor[] = []
      for (const celestialTarget of celestialLabelTargets) {
        const node = celestialTarget.node
        if (!node.isEnabled()) {
          continue
        }

        const absolutePosition = node.getAbsolutePosition()
        const toCelestial = absolutePosition.subtract(camera.position)
        const celestialDistance = toCelestial.length()
        if (celestialDistance <= 0.0001) {
          continue
        }
        const celestialDirection = toCelestial.scale(1 / celestialDistance)
        const projected = Vector3.Project(
          absolutePosition,
          projectionWorldMatrix,
          transformMatrix,
          globalViewport,
        )

        let x = projected.x
        let y = projected.y
        if (projected.z <= 0 || projected.z >= 1) {
          const forwardDot = Vector3.Dot(celestialDirection, cameraForward)
          const lateralDot = Vector3.Dot(celestialDirection, cameraRight)
          const verticalDot = Vector3.Dot(celestialDirection, cameraUp)
          const edgeLateral = forwardDot < 0 ? -lateralDot : lateralDot
          const edgeVertical = forwardDot < 0 ? -verticalDot : verticalDot
          const edgeMagnitude = Math.max(Math.abs(edgeLateral), Math.abs(edgeVertical), 0.0001)
          const normalizedX = edgeLateral / edgeMagnitude
          const normalizedY = edgeVertical / edgeMagnitude
          const edgeMarginX = 56
          const edgeMarginY = 34
          x = renderWidth * 0.5 + normalizedX * (renderWidth * 0.5 - edgeMarginX)
          y = renderHeight * 0.5 - normalizedY * (renderHeight * 0.5 - edgeMarginY)
        }

        const targetId = `celestial-${celestialTarget.id}`
        const clampedX = clamp(x, 50, renderWidth - 50)
        const clampedY = clamp(y - 26, 18, renderHeight - 18)
        const previous = labelAnchorHistory.get(targetId)
        const deltaX = previous ? clampedX - previous.x : 0
        const deltaY = previous ? clampedY - previous.y : 0
        const movementDistance = previous ? Math.hypot(deltaX, deltaY) : 0
        const shouldSnapToTarget = !previous || movementDistance > celestialLabelSnapDistancePx
        const resolvedX = shouldSnapToTarget
          ? clampedX
          : previous.x + deltaX * celestialLabelMicroSmoothingFactor
        const resolvedY = shouldSnapToTarget
          ? clampedY
          : previous.y + deltaY * celestialLabelMicroSmoothingFactor
        const smoothedX = previous && Math.abs(resolvedX - previous.x) < celestialLabelDeadbandPx
          ? previous.x
          : resolvedX
        const smoothedY = previous && Math.abs(resolvedY - previous.y) < celestialLabelDeadbandPx
          ? previous.y
          : resolvedY

        labelAnchorHistory.set(targetId, { x: smoothedX, y: smoothedY, timestamp: now })
        seenTargetIds.add(targetId)

        celestialAnchors.push({
          targetId,
          label: celestialTarget.label,
          x: smoothedX,
          y: smoothedY,
          priority: 'normal',
        })
      }

      return [...accepted, ...celestialAnchors]
    }

    const publishTargetLabelAnchors = (force = false) => {
      const callback = onTargetLabelAnchorsRef.current
      if (!callback) {
        return
      }

      const now = performance.now()
      if (!force && now - lastTargetLabelsPush < targetLabelPushThrottleMs) {
        return
      }

      lastTargetLabelsPush = now
      callback(buildTargetLabelAnchors())
    }

    const updateScene = () => {
      if (respawnSignalRef.current !== lastRespawnSignal) {
        lastRespawnSignal = respawnSignalRef.current
        resetShipState()
      }

      synchronizeWorldTargets()

      const rawFrameDeltaSeconds = Math.min(
        maxFrameDeltaSeconds,
        Math.max(0, engine.getDeltaTime() / 1000),
      )
      const diagnostics = diagnosticsSettingsRef.current
      const frameTimeMs = performance.now()
      updateCelestialBodies(frameTimeMs)

      if (pausedRef.current || inputSuppressedRef.current) {
        fixedStepAccumulatorSeconds = 0
        inputController.resetInputs()
        persistentMiningEnabled = false
        lastPersistentMiningTogglePressed = false
        const pausedBasis = shipBasis(ship)
        updateThrusterFx({
          forward: pausedBasis.forward,
          velocity: Vector3.ZeroReadOnly,
          thrustInput: 0,
          speed: 0,
          maxSpeed: 40,
          boosting: false,
        })
        const stationDistance = Vector3.Distance(ship.position, stationCore.position)
        const inChargeRange = stationDistance <= CHARGING_RANGE_METERS
        const dockable = stationDistance <= STATION_DOCKING_RANGE_METERS
        updateActiveZone(ship.position)
        updateQuestFocusMarkers(rawFrameDeltaSeconds, frameTimeMs)
        publishTargetLabelAnchors()
        updateStationVisuals(stationDistance, rawFrameDeltaSeconds, frameTimeMs)
        pushStationTransitionFeedback(stationDistance, inChargeRange, dockable)
        if (frameTimeMs - lastTelemetryPush > 180) {
          lastTelemetryPush = frameTimeMs
          onStationDistanceRef.current(stationDistance)
        }
        publishAimState({ targetLocked: false, targetDistance: null })
        return
      }

      let stationDistance = Vector3.Distance(ship.position, stationCore.position)
      let diagnosticsYawInputRaw = 0
      let diagnosticsPitchInputRaw = 0
      let diagnosticsYawDelta = 0
      let diagnosticsPitchDelta = 0
      let diagnosticsStepSeconds = diagnostics.fixedStepEnabled ? fixedStepSeconds : rawFrameDeltaSeconds

      const runSimulationStep = (deltaSeconds: number) => {
        diagnosticsStepSeconds = deltaSeconds
        fireCooldown = Math.max(0, fireCooldown - deltaSeconds)
        extractionNodeCooldown = Math.max(0, extractionNodeCooldown - deltaSeconds)

        const persistentMiningTogglePressed = pressedKeys.has('Equal')
        if (persistentMiningTogglePressed && !lastPersistentMiningTogglePressed) {
          persistentMiningEnabled = !persistentMiningEnabled
        }
        lastPersistentMiningTogglePressed = persistentMiningTogglePressed

        const thrustInput = (pressedKeys.has('KeyW') ? 1 : 0) - (pressedKeys.has('KeyS') ? 1 : 0)
        const strafeInput = (pressedKeys.has('KeyD') ? 1 : 0) - (pressedKeys.has('KeyA') ? 1 : 0)
        const verticalInput = (pressedKeys.has('KeyR') ? 1 : 0) - (pressedKeys.has('KeyF') ? 1 : 0)
        const movementInputActive = thrustInput !== 0 || strafeInput !== 0 || verticalInput !== 0
        if (movementInputActive && persistentMiningEnabled) {
          persistentMiningEnabled = false
        }
        const boosting = pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight')
        const yawInput = applyDeadzone(steeringInput.x, steeringDeadzone)
        const pitchInput = applyDeadzone(steeringInput.y, steeringDeadzone)
        diagnosticsYawInputRaw = yawInput
        diagnosticsPitchInputRaw = pitchInput

        if (diagnostics.inputSmoothingEnabled) {
          const steeringLerp = Math.min(1, steeringSmoothingStrength * deltaSeconds)
          smoothedYawInput += (yawInput - smoothedYawInput) * steeringLerp
          smoothedPitchInput += (pitchInput - smoothedPitchInput) * steeringLerp
          if (Math.abs(smoothedYawInput) < steeringOutputDeadband) {
            smoothedYawInput = 0
          }
          if (Math.abs(smoothedPitchInput) < steeringOutputDeadband) {
            smoothedPitchInput = 0
          }
        } else {
          smoothedYawInput = yawInput
          smoothedPitchInput = pitchInput
        }

        let yawDelta = 0
        let pitchDelta = 0
        if (smoothedYawInput !== 0 || smoothedPitchInput !== 0) {
          yawDelta = smoothedYawInput * steeringRate * deltaSeconds
          pitchDelta = smoothedPitchInput * steeringRate * deltaSeconds
          yawAngle += yawDelta
          pitchAngle = clamp(pitchAngle - pitchDelta, -pitchLimit, pitchLimit)
        }
        diagnosticsYawDelta = yawDelta
        diagnosticsPitchDelta = pitchDelta

        syncOrientationFromAngles()

        const { forward, right, up } = shipBasis(ship)

        const acceleration = boosting ? 45 : 30
        const maxSpeed = boosting ? 70 : 40
        const drag = boosting ? 0.45 : 0.75

        shipVelocity.addInPlace(forward.scale(thrustInput * acceleration * deltaSeconds))
        shipVelocity.addInPlace(right.scale(strafeInput * acceleration * 0.65 * deltaSeconds))
        shipVelocity.addInPlace(up.scale(verticalInput * acceleration * 0.5 * deltaSeconds))
        shipVelocity.scaleInPlace(Math.max(0, 1 - drag * deltaSeconds))

        const speed = shipVelocity.length()
        if (speed > maxSpeed) {
          shipVelocity.scaleInPlace(maxSpeed / speed)
        }

        updateThrusterFx({
          forward,
          velocity: shipVelocity,
          thrustInput,
          speed: shipVelocity.length(),
          maxSpeed,
          boosting,
        })

        let contactingDamageSource = false
        let maxImpactSpeed = 0
        let maxAsteroidImpactSpeed = 0
        let maxStationImpactSpeed = 0
        let maxCelestialImpactSpeed = 0
        let maxBoundaryImpactSpeed = 0
        let remainingTime = deltaSeconds
        for (
          let sweepIteration = 0;
          sweepIteration < collisionSweepIterations && remainingTime > 0.00001;
          sweepIteration += 1
        ) {
          const moveX = shipVelocity.x * remainingTime
          const moveY = shipVelocity.y * remainingTime
          const moveZ = shipVelocity.z * remainingTime
          const displacementLengthSquared = moveX * moveX + moveY * moveY + moveZ * moveZ
          if (displacementLengthSquared <= 0.00000001) {
            break
          }

          let hitAsteroid: AsteroidEntity | null = null
          let hitDynamicBody: DynamicCollisionBody | null = null
          let hitStation = false
          let earliestHitT = 1
          for (const asteroid of asteroids) {
            const startX = ship.position.x - asteroid.mesh.position.x
            const startY = ship.position.y - asteroid.mesh.position.y
            const startZ = ship.position.z - asteroid.mesh.position.z
            const combinedRadius = shipCollisionRadius + asteroid.radius
            const combinedRadiusSquared = combinedRadius * combinedRadius
            const c = startX * startX + startY * startY + startZ * startZ - combinedRadiusSquared
            if (c <= 0) {
              hitAsteroid = asteroid
              hitDynamicBody = null
              earliestHitT = 0
              break
            }

            const b = 2 * (startX * moveX + startY * moveY + startZ * moveZ)
            if (b >= 0) {
              continue
            }

            const discriminant = b * b - 4 * displacementLengthSquared * c
            if (discriminant < 0) {
              continue
            }

            const hitT = (-b - Math.sqrt(discriminant)) / (2 * displacementLengthSquared)
            if (hitT < 0 || hitT > earliestHitT) {
              continue
            }

            hitAsteroid = asteroid
            hitDynamicBody = null
            earliestHitT = hitT
          }

          const stationStartX = ship.position.x - stationCore.position.x
          const stationStartY = ship.position.y - stationCore.position.y
          const stationStartZ = ship.position.z - stationCore.position.z
          const stationCombinedRadius = shipCollisionRadius + stationCoreCollisionRadius
          const stationCombinedRadiusSquared = stationCombinedRadius * stationCombinedRadius
          const stationC = stationStartX * stationStartX
            + stationStartY * stationStartY
            + stationStartZ * stationStartZ
            - stationCombinedRadiusSquared
          const stationStartDotMove = stationStartX * moveX + stationStartY * moveY + stationStartZ * moveZ
          if (stationC <= 0) {
            if (stationStartDotMove <= 0) {
              hitAsteroid = null
              hitDynamicBody = null
              hitStation = true
              earliestHitT = 0
            }
          } else {
            const stationB = 2 * stationStartDotMove
            if (stationB < 0) {
              const stationDiscriminant = stationB * stationB - 4 * displacementLengthSquared * stationC
              if (stationDiscriminant >= 0) {
                const stationHitT = (-stationB - Math.sqrt(stationDiscriminant)) / (2 * displacementLengthSquared)
                if (stationHitT >= 0 && stationHitT <= earliestHitT) {
                  hitAsteroid = null
                  hitDynamicBody = null
                  hitStation = true
                  earliestHitT = stationHitT
                }
              }
            }
          }

          for (const dynamicBody of dynamicCollisionBodies) {
            if (!dynamicBody.isActive()) {
              continue
            }

            const dynamicPosition = dynamicBody.mesh.getAbsolutePosition()
            const dynamicStartX = ship.position.x - dynamicPosition.x
            const dynamicStartY = ship.position.y - dynamicPosition.y
            const dynamicStartZ = ship.position.z - dynamicPosition.z
            const dynamicCombinedRadius = shipCollisionRadius + dynamicBody.radius
            const dynamicCombinedRadiusSquared = dynamicCombinedRadius * dynamicCombinedRadius
            const dynamicC = dynamicStartX * dynamicStartX
              + dynamicStartY * dynamicStartY
              + dynamicStartZ * dynamicStartZ
              - dynamicCombinedRadiusSquared
            const dynamicStartDotMove = dynamicStartX * moveX + dynamicStartY * moveY + dynamicStartZ * moveZ

            if (dynamicC <= 0) {
              if (dynamicStartDotMove <= 0) {
                hitAsteroid = null
                hitDynamicBody = dynamicBody
                hitStation = false
                earliestHitT = 0
              }
              continue
            }

            const dynamicB = 2 * dynamicStartDotMove
            if (dynamicB >= 0) {
              continue
            }

            const dynamicDiscriminant = dynamicB * dynamicB - 4 * displacementLengthSquared * dynamicC
            if (dynamicDiscriminant < 0) {
              continue
            }

            const dynamicHitT = (-dynamicB - Math.sqrt(dynamicDiscriminant)) / (2 * displacementLengthSquared)
            if (dynamicHitT < 0 || dynamicHitT > earliestHitT) {
              continue
            }

            hitAsteroid = null
            hitDynamicBody = dynamicBody
            hitStation = false
            earliestHitT = dynamicHitT
          }

          if (!hitAsteroid && !hitDynamicBody && !hitStation) {
            ship.position.x += moveX
            ship.position.y += moveY
            ship.position.z += moveZ
            remainingTime = 0
            break
          }

          if (hitAsteroid || hitDynamicBody) {
            contactingDamageSource = true
          }
          const safeHitT = Math.max(0, earliestHitT - collisionTimeEpsilon)
          ship.position.x += moveX * safeHitT
          ship.position.y += moveY * safeHitT
          ship.position.z += moveZ * safeHitT

          collisionDelta.copyFrom(ship.position)
          if (hitAsteroid) {
            collisionDelta.subtractInPlace(hitAsteroid.mesh.position)
          } else if (hitDynamicBody) {
            collisionDelta.subtractInPlace(hitDynamicBody.mesh.getAbsolutePosition())
          } else {
            collisionDelta.subtractInPlace(stationCore.position)
          }
          let distance = collisionDelta.length()
          const combinedRadius = shipCollisionRadius
            + (hitAsteroid ? hitAsteroid.radius : hitDynamicBody ? hitDynamicBody.radius : stationCoreCollisionRadius)
          if (distance <= 0.0001) {
            collisionNormal.copyFromFloats(-moveX, -moveY, -moveZ)
            if (collisionNormal.lengthSquared() <= 0.0001) {
              collisionNormal.copyFrom(collisionFallbackAxis)
            }
            collisionNormal.normalize()
            distance = 0
          } else {
            collisionNormal.copyFrom(collisionDelta)
            collisionNormal.scaleInPlace(1 / distance)
          }

          const inwardSpeed = Vector3.Dot(shipVelocity, collisionNormal)
          if (inwardSpeed < 0) {
            maxImpactSpeed = Math.max(maxImpactSpeed, -inwardSpeed)
            if (hitAsteroid) {
              maxAsteroidImpactSpeed = Math.max(maxAsteroidImpactSpeed, -inwardSpeed)
            } else if (hitDynamicBody) {
              maxCelestialImpactSpeed = Math.max(maxCelestialImpactSpeed, -inwardSpeed)
            } else {
              maxStationImpactSpeed = Math.max(maxStationImpactSpeed, -inwardSpeed)
            }
            shipVelocity.x -= collisionNormal.x * inwardSpeed
            shipVelocity.y -= collisionNormal.y * inwardSpeed
            shipVelocity.z -= collisionNormal.z * inwardSpeed
            shipVelocity.scaleInPlace(collisionSurfaceDrag)
          }

          const penetration = combinedRadius - distance + collisionPushEpsilon
          if (penetration > 0) {
            ship.position.x += collisionNormal.x * penetration
            ship.position.y += collisionNormal.y * penetration
            ship.position.z += collisionNormal.z * penetration
          }

          remainingTime *= Math.max(0, 1 - earliestHitT)
        }

        for (let resolvePass = 0; resolvePass < collisionResolveIterations; resolvePass += 1) {
          let resolvedAny = false

          for (const asteroid of asteroids) {
            collisionDelta.copyFrom(ship.position)
            collisionDelta.subtractInPlace(asteroid.mesh.position)
            const combinedRadius = shipCollisionRadius + asteroid.radius
            const combinedRadiusSquared = combinedRadius * combinedRadius
            const distanceSquared = collisionDelta.lengthSquared()
            if (distanceSquared >= combinedRadiusSquared) {
              continue
            }

            contactingDamageSource = true
            resolvedAny = true

            let distance = Math.sqrt(distanceSquared)
            if (distance <= 0.0001) {
              collisionNormal.copyFromFloats(-shipVelocity.x, -shipVelocity.y, -shipVelocity.z)
              if (collisionNormal.lengthSquared() <= 0.0001) {
                collisionNormal.copyFrom(collisionFallbackAxis)
              }
              collisionNormal.normalize()
              distance = 0
            } else {
              collisionNormal.copyFrom(collisionDelta)
              collisionNormal.scaleInPlace(1 / distance)
            }

            const inwardSpeed = Vector3.Dot(shipVelocity, collisionNormal)
            if (inwardSpeed < 0) {
              maxImpactSpeed = Math.max(maxImpactSpeed, -inwardSpeed)
              maxAsteroidImpactSpeed = Math.max(maxAsteroidImpactSpeed, -inwardSpeed)
              shipVelocity.x -= collisionNormal.x * inwardSpeed
              shipVelocity.y -= collisionNormal.y * inwardSpeed
              shipVelocity.z -= collisionNormal.z * inwardSpeed
              shipVelocity.scaleInPlace(collisionSurfaceDrag)
            }

            const penetration = combinedRadius - distance + collisionPushEpsilon
            ship.position.x += collisionNormal.x * penetration
            ship.position.y += collisionNormal.y * penetration
            ship.position.z += collisionNormal.z * penetration
          }

          collisionDelta.copyFrom(ship.position)
          collisionDelta.subtractInPlace(stationCore.position)
          const stationCombinedRadius = shipCollisionRadius + stationCoreCollisionRadius
          const stationCombinedRadiusSquared = stationCombinedRadius * stationCombinedRadius
          const stationDistanceSquared = collisionDelta.lengthSquared()
          if (stationDistanceSquared < stationCombinedRadiusSquared) {
            let distance = Math.sqrt(stationDistanceSquared)
            if (distance <= 0.0001) {
              collisionNormal.copyFromFloats(-shipVelocity.x, -shipVelocity.y, -shipVelocity.z)
              if (collisionNormal.lengthSquared() <= 0.0001) {
                collisionNormal.copyFrom(collisionFallbackAxis)
              }
              collisionNormal.normalize()
              distance = 0
            } else {
              collisionNormal.copyFrom(collisionDelta)
              collisionNormal.scaleInPlace(1 / distance)
            }

            const inwardSpeed = Vector3.Dot(shipVelocity, collisionNormal)
            if (inwardSpeed < 0) {
              resolvedAny = true
              maxImpactSpeed = Math.max(maxImpactSpeed, -inwardSpeed)
              maxStationImpactSpeed = Math.max(maxStationImpactSpeed, -inwardSpeed)
              shipVelocity.x -= collisionNormal.x * inwardSpeed
              shipVelocity.y -= collisionNormal.y * inwardSpeed
              shipVelocity.z -= collisionNormal.z * inwardSpeed
              shipVelocity.scaleInPlace(collisionSurfaceDrag)

              const penetration = stationCombinedRadius - distance + collisionPushEpsilon
              ship.position.x += collisionNormal.x * penetration
              ship.position.y += collisionNormal.y * penetration
              ship.position.z += collisionNormal.z * penetration
            }
          }

          for (const dynamicBody of dynamicCollisionBodies) {
            if (!dynamicBody.isActive()) {
              continue
            }

            collisionDelta.copyFrom(ship.position)
            collisionDelta.subtractInPlace(dynamicBody.mesh.getAbsolutePosition())
            const dynamicCombinedRadius = shipCollisionRadius + dynamicBody.radius
            const dynamicCombinedRadiusSquared = dynamicCombinedRadius * dynamicCombinedRadius
            const dynamicDistanceSquared = collisionDelta.lengthSquared()
            if (dynamicDistanceSquared >= dynamicCombinedRadiusSquared) {
              continue
            }

            contactingDamageSource = true
            resolvedAny = true

            let distance = Math.sqrt(dynamicDistanceSquared)
            if (distance <= 0.0001) {
              collisionNormal.copyFromFloats(-shipVelocity.x, -shipVelocity.y, -shipVelocity.z)
              if (collisionNormal.lengthSquared() <= 0.0001) {
                collisionNormal.copyFrom(collisionFallbackAxis)
              }
              collisionNormal.normalize()
              distance = 0
            } else {
              collisionNormal.copyFrom(collisionDelta)
              collisionNormal.scaleInPlace(1 / distance)
            }

            const inwardSpeed = Vector3.Dot(shipVelocity, collisionNormal)
            if (inwardSpeed < 0) {
              maxImpactSpeed = Math.max(maxImpactSpeed, -inwardSpeed)
              maxCelestialImpactSpeed = Math.max(maxCelestialImpactSpeed, -inwardSpeed)
              shipVelocity.x -= collisionNormal.x * inwardSpeed
              shipVelocity.y -= collisionNormal.y * inwardSpeed
              shipVelocity.z -= collisionNormal.z * inwardSpeed
              shipVelocity.scaleInPlace(collisionSurfaceDrag)
            }

            const penetration = dynamicCombinedRadius - distance + collisionPushEpsilon
            ship.position.x += collisionNormal.x * penetration
            ship.position.y += collisionNormal.y * penetration
            ship.position.z += collisionNormal.z * penetration
          }

          if (!resolvedAny) {
            break
          }
        }

        const minX = -arenaHalfWidth + shipCollisionRadius
        const maxX = arenaHalfWidth - shipCollisionRadius
        const minY = -arenaHalfHeight + shipCollisionRadius
        const maxY = arenaHalfHeight - shipCollisionRadius
        const minZ = -arenaHalfDepth + shipCollisionRadius
        const maxZ = arenaHalfDepth - shipCollisionRadius

        if (ship.position.x < minX) {
          const wallImpactSpeed = Math.max(0, -shipVelocity.x)
          if (wallImpactSpeed > 0) {
            maxImpactSpeed = Math.max(maxImpactSpeed, wallImpactSpeed)
            maxBoundaryImpactSpeed = Math.max(maxBoundaryImpactSpeed, wallImpactSpeed)
            shipVelocity.x = 0
            shipVelocity.y *= collisionSurfaceDrag
            shipVelocity.z *= collisionSurfaceDrag
          }
          ship.position.x = minX + collisionPushEpsilon
        } else if (ship.position.x > maxX) {
          const wallImpactSpeed = Math.max(0, shipVelocity.x)
          if (wallImpactSpeed > 0) {
            maxImpactSpeed = Math.max(maxImpactSpeed, wallImpactSpeed)
            maxBoundaryImpactSpeed = Math.max(maxBoundaryImpactSpeed, wallImpactSpeed)
            shipVelocity.x = 0
            shipVelocity.y *= collisionSurfaceDrag
            shipVelocity.z *= collisionSurfaceDrag
          }
          ship.position.x = maxX - collisionPushEpsilon
        }

        if (ship.position.y < minY) {
          const wallImpactSpeed = Math.max(0, -shipVelocity.y)
          if (wallImpactSpeed > 0) {
            maxImpactSpeed = Math.max(maxImpactSpeed, wallImpactSpeed)
            maxBoundaryImpactSpeed = Math.max(maxBoundaryImpactSpeed, wallImpactSpeed)
            shipVelocity.y = 0
            shipVelocity.x *= collisionSurfaceDrag
            shipVelocity.z *= collisionSurfaceDrag
          }
          ship.position.y = minY + collisionPushEpsilon
        } else if (ship.position.y > maxY) {
          const wallImpactSpeed = Math.max(0, shipVelocity.y)
          if (wallImpactSpeed > 0) {
            maxImpactSpeed = Math.max(maxImpactSpeed, wallImpactSpeed)
            maxBoundaryImpactSpeed = Math.max(maxBoundaryImpactSpeed, wallImpactSpeed)
            shipVelocity.y = 0
            shipVelocity.x *= collisionSurfaceDrag
            shipVelocity.z *= collisionSurfaceDrag
          }
          ship.position.y = maxY - collisionPushEpsilon
        }

        if (ship.position.z < minZ) {
          const wallImpactSpeed = Math.max(0, -shipVelocity.z)
          if (wallImpactSpeed > 0) {
            maxImpactSpeed = Math.max(maxImpactSpeed, wallImpactSpeed)
            maxBoundaryImpactSpeed = Math.max(maxBoundaryImpactSpeed, wallImpactSpeed)
            shipVelocity.z = 0
            shipVelocity.x *= collisionSurfaceDrag
            shipVelocity.y *= collisionSurfaceDrag
          }
          ship.position.z = minZ + collisionPushEpsilon
        } else if (ship.position.z > maxZ) {
          const wallImpactSpeed = Math.max(0, shipVelocity.z)
          if (wallImpactSpeed > 0) {
            maxImpactSpeed = Math.max(maxImpactSpeed, wallImpactSpeed)
            maxBoundaryImpactSpeed = Math.max(maxBoundaryImpactSpeed, wallImpactSpeed)
            shipVelocity.z = 0
            shipVelocity.x *= collisionSurfaceDrag
            shipVelocity.y *= collisionSurfaceDrag
          }
          ship.position.z = maxZ - collisionPushEpsilon
        }

        stationDistance = Vector3.Distance(ship.position, stationCore.position)
        const inChargeRange = stationDistance <= CHARGING_RANGE_METERS
        const dockable = stationDistance <= STATION_DOCKING_RANGE_METERS
        updateActiveZone(ship.position)
        pushStationTransitionFeedback(stationDistance, inChargeRange, dockable)

        if (maxImpactSpeed > 0 && persistentMiningEnabled) {
          persistentMiningEnabled = false
        }

        const holdMiningPressed = pressedKeys.has('KeyE')
        const extractionBeamActive = holdMiningPressed || persistentMiningEnabled
        const nearbyExtractionNode = extractionBeamActive ? resolveNearestExtractionNode() : null

        if (nearbyExtractionNode && extractionNodeCooldown === 0) {
          if (onTryFireLaserRef.current()) {
            onExtractionHitRef.current({
              targetId: `extraction-node-${nearbyExtractionNode.node.nodeId}`,
              classId: nearbyExtractionNode.node.classId,
              kind: nearbyExtractionNode.node.kind,
              zoneId: nearbyExtractionNode.node.zoneId,
              riskRating: nearbyExtractionNode.node.riskRating,
              signatureElementSymbol: nearbyExtractionNode.node.signatureElementSymbol,
              expectedYield: nearbyExtractionNode.node.expectedYield,
            })
            onCrosshairFeedbackRef.current?.('hit')
            extractionNodeCooldown = nearbyExtractionNode.node.extractionIntervalSeconds
          } else {
            onCrosshairFeedbackRef.current?.('blocked')
            extractionNodeCooldown = 0.08
          }
        }

        if (pressedKeys.has('Space') && fireCooldown === 0) {
          if (onTryFireLaserRef.current()) {
            const lockedTarget = aimTargetId
              ? asteroids.find((asteroid) => asteroid.mesh.id === aimTargetId) ?? null
              : null
            const aimPoint = lockedTarget ? lockedTarget.mesh.position.clone() : resolveFallbackAimPoint()
            fireProjectile(aimPoint)
            onCrosshairFeedbackRef.current?.('fired')
            fireCooldown = fireIntervalSeconds
          } else {
            onCrosshairFeedbackRef.current?.('blocked')
            fireCooldown = 0.08
          }
        }

        const portalDistance = Vector3.Distance(ship.position, portalGate.position)
        const insidePortalGate = portalDistance <= portalTransitRadius
        if (
          insidePortalGate
          && !wasInsidePortalGate
          && frameTimeMs >= portalTransitCooldownUntilMs
        ) {
          portalTransitCooldownUntilMs = frameTimeMs + portalTransitCooldownMs
          persistentMiningEnabled = false
          onPortalTransitRef.current?.(portalDestinationSectorId)
        }
        wasInsidePortalGate = insidePortalGate

        const takingDamage = contactingDamageSource

        for (let projectileIndex = projectiles.length - 1; projectileIndex >= 0; projectileIndex -= 1) {
          const projectile = projectiles[projectileIndex]
          projectile.mesh.position.addInPlace(projectile.velocity.scale(deltaSeconds))
          projectile.ttl -= deltaSeconds

          let projectileConsumed = false

          for (let asteroidIndex = asteroids.length - 1; asteroidIndex >= 0; asteroidIndex -= 1) {
            const asteroid = asteroids[asteroidIndex]
            const collisionDistance = asteroid.radius + 0.22

            if (Vector3.DistanceSquared(projectile.mesh.position, asteroid.mesh.position) <= collisionDistance * collisionDistance) {
              onExtractionHitRef.current({
                targetId: asteroid.targetId,
                classId: asteroid.classId,
                kind: asteroid.kind,
                zoneId: asteroid.zoneId,
                riskRating: asteroid.riskRating,
                signatureElementSymbol: asteroid.signatureElementSymbol,
                expectedYield: asteroid.expectedYield,
              })
              onTargetDepletedRef.current?.({
                targetId: asteroid.targetId,
                classId: asteroid.classId,
                kind: asteroid.kind,
                zoneId: asteroid.zoneId,
                riskRating: asteroid.riskRating,
                signatureElementSymbol: asteroid.signatureElementSymbol,
                expectedYield: asteroid.expectedYield,
              })
              onCrosshairFeedbackRef.current?.('hit')
              pendingDepletedTargetIds.add(asteroid.targetId)

              removeAsteroidByIndex(asteroidIndex)

              projectile.mesh.dispose()
              projectiles.splice(projectileIndex, 1)
              projectileConsumed = true
              break
            }
          }

          if (!projectileConsumed && projectile.ttl <= 0) {
            projectile.mesh.dispose()
            projectiles.splice(projectileIndex, 1)
          }
        }

        if (maxImpactSpeed > impactDamageSpeedThreshold) {
          const impactDamage = Math.min(
            maxImpactDamagePerStep,
            (maxImpactSpeed - impactDamageSpeedThreshold) * impactDamageScale,
          )
          shipHealth = Math.max(0, shipHealth - impactDamage)
        }

        if (maxImpactSpeed > 0) {
          let dominantSource: ShipCollisionEvent['source'] = 'boundary'
          let dominantSpeed = maxBoundaryImpactSpeed
          if (maxAsteroidImpactSpeed >= dominantSpeed) {
            dominantSource = 'asteroid'
            dominantSpeed = maxAsteroidImpactSpeed
          }
          if (maxStationImpactSpeed > dominantSpeed) {
            dominantSource = 'station'
            dominantSpeed = maxStationImpactSpeed
          }
          if (maxCelestialImpactSpeed > dominantSpeed) {
            dominantSource = 'celestial'
            dominantSpeed = maxCelestialImpactSpeed
          }

          if (dominantSpeed > 0) {
            publishCollisionFeedback(dominantSource, dominantSpeed)
          }
        }

        if (takingDamage) {
          shipHealth = Math.max(0, shipHealth - deltaSeconds * 18)
        } else {
          shipHealth = Math.min(100, shipHealth + deltaSeconds * 3)
        }

        if (shipHealth <= 0) {
          onShipFailureRef.current('combat')
          shipHealth = 100
        }

        const now = frameTimeMs
        if (now - lastTelemetryPush > 120) {
          lastTelemetryPush = now
          const bestAimTarget = resolveAimTarget()
          const existingAimTarget = aimTargetId
            ? asteroids.find((asteroid) => asteroid.mesh.id === aimTargetId) ?? null
            : null

          let aimTarget: { asteroid: AsteroidEntity; distance: number; dot: number } | null = null
          if (existingAimTarget) {
            const { origin, direction } = resolveCameraAimRay()
            const toTarget = existingAimTarget.mesh.position.subtract(origin)
            const distance = toTarget.length()

            if (distance > 0.001 && distance <= aimRange) {
              const targetDirection = toTarget.scale(1 / distance)
              const dot = Vector3.Dot(direction, targetDirection)
              if (dot >= aimUnlockDotThreshold) {
                aimTarget = {
                  asteroid: existingAimTarget,
                  distance,
                  dot,
                }
              }
            }
          }

          if (!aimTarget && bestAimTarget && bestAimTarget.dot >= aimLockDotThreshold) {
            aimTarget = bestAimTarget
          }

          aimTargetId = aimTarget ? aimTarget.asteroid.mesh.id : null
          publishAimState({
            targetLocked: Boolean(aimTarget),
            targetDistance: aimTarget ? aimTarget.distance : null,
          })

          const radarRange = 230
          const contacts = buildRadarContacts(asteroids, extractionNodes, ship.position, radarRange)

          onRadarContactsRef.current(contacts)
          onStationDistanceRef.current(stationDistance)

          if (selectedAsteroidId) {
            const selectedAsteroid = asteroids.find((asteroid) => asteroid.mesh.id === selectedAsteroidId)
            if (selectedAsteroid) {
              onSelectObjectRef.current(buildSelectionFromAsteroid(selectedAsteroid, ship.position))
            } else {
              const selectedExtractionNode = extractionNodeByMeshId.get(selectedAsteroidId) ?? null
              if (selectedExtractionNode) {
                onSelectObjectRef.current(
                  buildSelectionFromExtractionNode(selectedExtractionNode, ship.position),
                )
              }
            }
          }

          onTelemetryRef.current({
            speed: shipVelocity.length(),
            health: shipHealth,
            attacks: shotsFired,
            cooldown: 1 - fireCooldown / fireIntervalSeconds,
          })
        }
      }

      if (diagnostics.fixedStepEnabled) {
        // Avoid 0/1 alternating sim updates on high-refresh displays (causes visible micro-stutter).
        if (rawFrameDeltaSeconds <= fixedStepSeconds) {
          fixedStepAccumulatorSeconds = 0
          runSimulationStep(rawFrameDeltaSeconds)
        } else {
          fixedStepAccumulatorSeconds = Math.min(
            fixedStepAccumulatorSeconds + rawFrameDeltaSeconds,
            fixedStepSeconds * maxFixedStepsPerFrame,
          )
          let fixedStepsProcessed = 0
          while (
            fixedStepAccumulatorSeconds >= fixedStepSeconds
            && fixedStepsProcessed < maxFixedStepsPerFrame
          ) {
            runSimulationStep(fixedStepSeconds)
            fixedStepAccumulatorSeconds -= fixedStepSeconds
            fixedStepsProcessed += 1
          }
          if (fixedStepsProcessed === maxFixedStepsPerFrame && fixedStepAccumulatorSeconds >= fixedStepSeconds) {
            fixedStepAccumulatorSeconds = 0
          }
        }
      } else {
        fixedStepAccumulatorSeconds = 0
        runSimulationStep(rawFrameDeltaSeconds)
      }

      const zoomLerp = clamp(1 - Math.exp(-cameraZoomSmoothing * rawFrameDeltaSeconds), 0, 1)
      cameraZoomCurrent += (cameraZoomTarget - cameraZoomCurrent) * zoomLerp
      if (Math.abs(cameraZoomCurrent - cameraZoomTarget) < 0.0001) {
        cameraZoomCurrent = cameraZoomTarget
      }

      const cameraRig = resolveCameraRig(cameraZoomCurrent)
      const { forward, up } = shipBasis(ship)
      const desiredCameraPosition = ship.position
        .subtract(forward.scale(cameraRig.backDistance))
        .add(up.scale(cameraRig.upDistance))
      if (diagnostics.cameraHardLock) {
        camera.position.copyFrom(desiredCameraPosition)
      } else {
        const cameraFollowLerp = clamp(1 - Math.exp(-8 * rawFrameDeltaSeconds), 0, 1)
        camera.position = Vector3.Lerp(camera.position, desiredCameraPosition, cameraFollowLerp)
      }
      camera.setTarget(
        ship.position
          .add(forward.scale(cameraRig.lookAheadDistance))
          .subtract(up.scale(cameraRig.lookDownOffset)),
      )

      updateQuestFocusMarkers(rawFrameDeltaSeconds, frameTimeMs)
      publishTargetLabelAnchors()
      updateStationVisuals(stationDistance, rawFrameDeltaSeconds, frameTimeMs)

      const cameraError = Vector3.Distance(camera.position, desiredCameraPosition)
      if (diagnostics.enabled && frameTimeMs - lastDiagnosticsPush > 120) {
        lastDiagnosticsPush = frameTimeMs
        setDiagnosticsSnapshot({
          fps: rawFrameDeltaSeconds > 0 ? 1 / rawFrameDeltaSeconds : 0,
          frameDeltaMs: rawFrameDeltaSeconds * 1000,
          simStepMs: diagnosticsStepSeconds * 1000,
          yawInputRaw: diagnosticsYawInputRaw,
          pitchInputRaw: diagnosticsPitchInputRaw,
          yawInputApplied: smoothedYawInput,
          pitchInputApplied: smoothedPitchInput,
          yawDelta: diagnosticsYawDelta,
          pitchDelta: diagnosticsPitchDelta,
          speed: shipVelocity.length(),
          cameraError,
        })
      }
    }

    scene.onBeforeRenderObservable.add(updateScene)
    onActiveZoneChangeRef.current?.(activeZoneId)
    publishAimState({ targetLocked: false, targetDistance: null }, true)
    synchronizeWorldTargets(true)
    publishTargetLabelAnchors(true)
    engine.runRenderLoop(() => {
      if (!pausedRef.current) {
        scene.render()
      }
    })

    const handleResize = () => {
      engine.resize()
    }

    const resizeObserver = new ResizeObserver(() => {
      engine.resize()
    })

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      const rotation = ship.rotationQuaternion ?? Quaternion.FromEulerVector(ship.rotation)
      persistedFlightStateRef.current = {
        position: {
          x: ship.position.x,
          y: ship.position.y,
          z: ship.position.z,
        },
        rotation: {
          x: rotation.x,
          y: rotation.y,
          z: rotation.z,
          w: rotation.w,
        },
        velocity: {
          x: shipVelocity.x,
          y: shipVelocity.y,
          z: shipVelocity.z,
        },
        shipHealth,
        shotsFired,
        fireCooldown,
      }

      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('wheel', handleCanvasWheel)
      inputController.dispose()
      resizeObserver.disconnect()
      highlightLayer.dispose()
      onActiveZoneChangeRef.current?.(null)
      onAimStateChangeRef.current?.({ targetLocked: false, targetDistance: null })
      onTargetLabelAnchorsRef.current?.([])
      scene.dispose()
      engine.dispose()
    }
  }, [worldSeed, activeSectorId])

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
      {diagnosticsSettings.enabled && (
        <aside className="pointer-events-auto absolute left-3 top-3 z-30 w-[min(330px,calc(100%-1.5rem))] rounded-lg bg-black/85 px-3 py-2 text-[11px] text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-300">
              Flight Diagnostics
            </p>
            <span className="text-[10px] text-slate-400">F8 to close</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={diagnosticsSettings.cameraHardLock}
                onChange={(event) =>
                  setDiagnosticsSettings((current) => ({
                    ...current,
                    cameraHardLock: event.target.checked,
                  }))
                }
              />
              <span>Camera hard lock</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={diagnosticsSettings.inputSmoothingEnabled}
                onChange={(event) =>
                  setDiagnosticsSettings((current) => ({
                    ...current,
                    inputSmoothingEnabled: event.target.checked,
                  }))
                }
              />
              <span>Input smoothing</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={diagnosticsSettings.fixedStepEnabled}
                onChange={(event) =>
                  setDiagnosticsSettings((current) => ({
                    ...current,
                    fixedStepEnabled: event.target.checked,
                  }))
                }
              />
              <span>Fixed step (60Hz)</span>
            </label>
          </div>
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-300">
              <p>FPS: {diagnosticsSnapshot.fps.toFixed(1)}</p>
              <p>Frame: {diagnosticsSnapshot.frameDeltaMs.toFixed(2)} ms</p>
              <p>Step: {diagnosticsSnapshot.simStepMs.toFixed(2)} ms</p>
              <p>Speed: {diagnosticsSnapshot.speed.toFixed(2)} u/s</p>
              <p>Yaw in: {diagnosticsSnapshot.yawInputRaw.toFixed(3)}</p>
              <p>Pitch in: {diagnosticsSnapshot.pitchInputRaw.toFixed(3)}</p>
              <p>Yaw applied: {diagnosticsSnapshot.yawInputApplied.toFixed(3)}</p>
              <p>Pitch applied: {diagnosticsSnapshot.pitchInputApplied.toFixed(3)}</p>
              <p>Yaw d: {diagnosticsSnapshot.yawDelta.toFixed(4)}</p>
              <p>Pitch d: {diagnosticsSnapshot.pitchDelta.toFixed(4)}</p>
              <p>Camera err: {diagnosticsSnapshot.cameraError.toFixed(3)}</p>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

