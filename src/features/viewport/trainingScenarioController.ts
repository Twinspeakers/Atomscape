import { Color3, MeshBuilder, StandardMaterial, Vector3, type Scene } from 'babylonjs'
import type { ShipTelemetry } from '@state/types'
import type { AsteroidEntity } from './types'

const LOOK_STEP_ID = 'lookAroundWithMouse'
const STRAFE_HORIZONTAL_STEP_ID = 'strafeLeftAndRight'
const STRAFE_VERTICAL_STEP_ID = 'strafeUpAndDown'
const FORWARD_REVERSE_STEP_ID = 'forwardReverseRun'
const BOOST_STEP_ID = 'boostThroughRing'
const LOCK_STEP_ID = 'lockOnTrainingDrone'
const DESTROY_STEP_ID = 'destroyTrainingDrone'

export const TRAINING_DRONE_TARGET_ID = 'flight-training-drone'
const TRAINING_DRONE_HIT_POINTS = 2
const BOOST_SPEED_THRESHOLD = 24
const BOOST_HOLD_SECONDS = 0.8

interface CreateTrainingScenarioControllerOptions {
  scene: Scene
  enabled: boolean
  asteroids: AsteroidEntity[]
  asteroidByTargetId: Map<string, AsteroidEntity>
  shipSpawnPosition: Vector3
  shipForward: Vector3
}

interface HandleDroneHitInput {
  targetId: string
  impactPosition: Vector3
}

interface HandleDroneHitResult {
  handled: boolean
  destroyed: boolean
}

interface RegisterInput {
  currentStepId: string | null
  lookInputX: number
  lookInputY: number
  thrustInput: number
  strafeInput: number
  verticalInput: number
  speed: number
  boosting: boolean
  shipPosition: Vector3
  shipForward: Vector3
}

interface ExtendTelemetryInput {
  lookInputX: number
  lookInputY: number
  strafeInput: number
  verticalInput: number
  targetLocked: boolean
}

interface TrainingScenarioController {
  update: (frameTimeMs: number, deltaSeconds: number, currentStepId: string | null) => void
  handleDroneHit: (input: HandleDroneHitInput) => HandleDroneHitResult
  registerInput: (input: RegisterInput) => void
  noteAimTarget: (targetId: string | null) => void
  extendTelemetry: (base: ShipTelemetry, input: ExtendTelemetryInput) => ShipTelemetry
  resolveProjectileHitPadding: (targetId: string) => number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function createGateMesh(
  scene: Scene,
  name: string,
  diameter: number,
  colorHex: string,
): { mesh: ReturnType<typeof MeshBuilder.CreateTorus>; material: StandardMaterial } {
  const material = new StandardMaterial(`${name}-material`, scene)
  const color = Color3.FromHexString(colorHex)
  material.diffuseColor = color
  material.emissiveColor = color.scale(0.22)
  material.alpha = 0.72

  const mesh = MeshBuilder.CreateTorus(
    name,
    {
      diameter,
      thickness: diameter * 0.065,
      tessellation: 72,
    },
    scene,
  )
  mesh.rotation.x = Math.PI * 0.5
  mesh.material = material
  mesh.isPickable = false
  mesh.setEnabled(false)

  return { mesh, material }
}

function setGateVisible(
  mesh: ReturnType<typeof MeshBuilder.CreateTorus>,
  material: StandardMaterial,
  visible: boolean,
): void {
  mesh.setEnabled(visible)
  if (!visible) {
    return
  }

  mesh.scaling.setAll(1)
  material.alpha = 0.68
}

export function createTrainingScenarioController({
  scene,
  enabled,
  asteroids,
  asteroidByTargetId,
  shipSpawnPosition,
  shipForward,
}: CreateTrainingScenarioControllerOptions): TrainingScenarioController {
  if (!enabled) {
    return {
      update: () => {},
      handleDroneHit: () => ({ handled: false, destroyed: false }),
      registerInput: () => {},
      noteAimTarget: () => {},
      extendTelemetry: (base) => base,
      resolveProjectileHitPadding: () => 0,
    }
  }

  const forwardUnit = shipForward.clone()
  if (forwardUnit.lengthSquared() < 0.00001) {
    forwardUnit.copyFromFloats(0, 0, 1)
  }
  forwardUnit.normalize()
  const upUnit = new Vector3(0, 1, 0)

  let maneuverGateCenter = shipSpawnPosition.subtract(forwardUnit.scale(36)).add(upUnit.scale(3))
  const maneuverGateRadius = 27

  const maneuverGate = createGateMesh(scene, 'training-maneuver-gate', maneuverGateRadius * 2, '#57c4ff')
  maneuverGate.mesh.position.copyFrom(maneuverGateCenter)
  const boostGate = createGateMesh(scene, 'training-boost-gate', 54, '#ffd26f')
  boostGate.mesh.position.copyFrom(shipSpawnPosition.add(forwardUnit.scale(108)).add(upUnit.scale(8)))

  let drone: AsteroidEntity | null = null
  let droneVisible = false
  let droneHitPoints = TRAINING_DRONE_HIT_POINTS
  let droneDestroyed = false
  let lookHorizontalComplete = false
  let lookVerticalComplete = false
  let strafeLeftComplete = false
  let strafeRightComplete = false
  let strafeUpComplete = false
  let strafeDownComplete = false
  let reversePassComplete = false
  let exitedRingAfterReverse = false
  let forwardPassComplete = false
  let insideManeuverRing = false
  let boostGateCleared = false
  let boostHoldSeconds = 0
  let latestBoosting = false
  let latestThrustInput = 0
  let latestSpeed = 0
  let droneLockComplete = false
  const latestShipPosition = shipSpawnPosition.clone()
  const latestShipForward = forwardUnit.clone()
  let forwardReverseStepActive = false

  const droneAnchor = shipSpawnPosition.add(forwardUnit.scale(122)).add(upUnit.scale(18))
  const explosionMaterial = new StandardMaterial('training-drone-explosion-material', scene)
  explosionMaterial.diffuseColor = Color3.FromHexString('#ff8d2b')
  explosionMaterial.emissiveColor = Color3.FromHexString('#ff5e00')
  explosionMaterial.alpha = 0
  const explosion = MeshBuilder.CreateSphere(
    'training-drone-explosion',
    { diameter: 1.2, segments: 20 },
    scene,
  )
  explosion.material = explosionMaterial
  explosion.isPickable = false
  explosion.setEnabled(false)
  let explosionStartMs = 0
  const explosionDurationMs = 520

  const droneMaterial = new StandardMaterial('training-drone-material', scene)
  droneMaterial.diffuseColor = Color3.FromHexString('#8ecbff')
  droneMaterial.emissiveColor = Color3.FromHexString('#153d63')
  const droneMesh = MeshBuilder.CreateBox(
    'training-drone',
    { width: 4.4, height: 1.6, depth: 3.2 },
    scene,
  )
  droneMesh.material = droneMaterial
  droneMesh.isPickable = true
  droneMesh.position.copyFrom(droneAnchor)
  droneMesh.setEnabled(false)
  drone = {
    targetId: TRAINING_DRONE_TARGET_ID,
    mesh: droneMesh,
    classId: 'metalScrap',
    kind: 'spaceJunk',
    zoneId: 'nearStationBelt',
    label: 'Training Drone',
    description: 'Non-hostile target drone for lock and fire drills.',
    signatureElementSymbol: 'DRN',
    riskRating: 0.08,
    yieldPreview: 'Training target only',
    expectedYield: {},
    radius: 2.6,
    integrity: 100,
  }
  asteroids.push(drone)
  asteroidByTargetId.set(drone.targetId, drone)

  return {
    update: (frameTimeMs, deltaSeconds, currentStepId) => {
      const showForwardReverseGates = currentStepId === FORWARD_REVERSE_STEP_ID
      if (showForwardReverseGates && !forwardReverseStepActive) {
        const deployForward =
          latestShipForward.lengthSquared() > 0.00001
            ? latestShipForward.clone().normalize()
            : forwardUnit
        maneuverGateCenter = latestShipPosition
          .subtract(deployForward.scale(32))
          .add(upUnit.scale(3))
        maneuverGate.mesh.position.copyFrom(maneuverGateCenter)
        reversePassComplete = false
        exitedRingAfterReverse = false
        forwardPassComplete = false
        insideManeuverRing = false
      }
      forwardReverseStepActive = showForwardReverseGates
      setGateVisible(maneuverGate.mesh, maneuverGate.material, showForwardReverseGates)
      const showBoostGate = currentStepId === BOOST_STEP_ID && !boostGateCleared
      setGateVisible(boostGate.mesh, boostGate.material, showBoostGate)

      if (currentStepId === BOOST_STEP_ID && !boostGateCleared) {
        const boostSustained = latestBoosting
          && latestThrustInput > 0
          && latestSpeed >= BOOST_SPEED_THRESHOLD
        if (boostSustained) {
          boostHoldSeconds = Math.min(BOOST_HOLD_SECONDS, boostHoldSeconds + deltaSeconds)
          if (boostHoldSeconds >= BOOST_HOLD_SECONDS) {
            boostGateCleared = true
          }
        } else {
          boostHoldSeconds = Math.max(0, boostHoldSeconds - deltaSeconds * 1.6)
        }
      } else if (!boostGateCleared) {
        boostHoldSeconds = 0
      }

      if (drone && !droneDestroyed) {
        droneVisible = currentStepId === LOCK_STEP_ID || currentStepId === DESTROY_STEP_ID
        drone.mesh.setEnabled(droneVisible)
        if (droneVisible) {
          const phase = frameTimeMs * 0.0011
          drone.mesh.position.x = droneAnchor.x
          drone.mesh.position.y = droneAnchor.y + Math.sin(phase * 0.9) * 0.25
          drone.mesh.position.z = droneAnchor.z
          drone.mesh.rotation.y += deltaSeconds * 0.7
          drone.mesh.rotation.x = Math.sin(phase * 1.1) * 0.04
        }
      }

      if (!explosion.isEnabled()) {
        return
      }

      const progress = clamp((frameTimeMs - explosionStartMs) / explosionDurationMs, 0, 1)
      explosion.scaling.setAll(0.8 + progress * 5.4)
      explosionMaterial.alpha = (1 - progress) * 0.88
      if (progress >= 1) {
        explosion.setEnabled(false)
        explosionMaterial.alpha = 0
      }
    },
    handleDroneHit: ({ targetId, impactPosition }) => {
      if (targetId !== TRAINING_DRONE_TARGET_ID || droneDestroyed || !droneVisible) {
        return { handled: false, destroyed: false }
      }

      droneHitPoints = Math.max(0, droneHitPoints - 1)
      if (droneHitPoints > 0) {
        return { handled: true, destroyed: false }
      }

      droneDestroyed = true
      drone = null
      explosionStartMs = performance.now()
      explosion.position.copyFrom(impactPosition)
      explosion.scaling.setAll(0.8)
      explosionMaterial.alpha = 0.88
      explosion.setEnabled(true)
      return { handled: true, destroyed: true }
    },
    registerInput: (input) => {
      latestBoosting = input.boosting
      latestThrustInput = input.thrustInput
      latestSpeed = input.speed
      latestShipPosition.copyFrom(input.shipPosition)
      if (input.shipForward.lengthSquared() > 0.00001) {
        latestShipForward.copyFrom(input.shipForward)
        latestShipForward.normalize()
      }

      if (input.currentStepId === LOOK_STEP_ID) {
        if (Math.abs(input.lookInputX) >= 0.16) {
          lookHorizontalComplete = true
        }
        if (Math.abs(input.lookInputY) >= 0.16) {
          lookVerticalComplete = true
        }
      }

      if (input.currentStepId === STRAFE_HORIZONTAL_STEP_ID) {
        if (input.strafeInput < 0) {
          strafeLeftComplete = true
        }
        if (input.strafeInput > 0) {
          strafeRightComplete = true
        }
      }

      if (input.currentStepId === STRAFE_VERTICAL_STEP_ID) {
        if (input.verticalInput > 0) {
          strafeUpComplete = true
        }
        if (input.verticalInput < 0) {
          strafeDownComplete = true
        }
      }

      if (input.currentStepId === FORWARD_REVERSE_STEP_ID) {
        const maneuverDistance = Vector3.Distance(input.shipPosition, maneuverGateCenter)
        const currentlyInsideRing = maneuverDistance <= maneuverGateRadius

        if (!insideManeuverRing && currentlyInsideRing) {
          if (!reversePassComplete && input.thrustInput < 0) {
            reversePassComplete = true
          } else if (reversePassComplete && exitedRingAfterReverse && input.thrustInput > 0) {
            forwardPassComplete = true
          }
        }

        if (insideManeuverRing && !currentlyInsideRing && reversePassComplete) {
          exitedRingAfterReverse = true
        }

        insideManeuverRing = currentlyInsideRing
      } else {
        insideManeuverRing = false
      }
    },
    noteAimTarget: (targetId) => {
      if (targetId === TRAINING_DRONE_TARGET_ID) {
        droneLockComplete = true
      }
    },
    extendTelemetry: (base, input) => ({
      ...base,
      lookInputX: input.lookInputX,
      lookInputY: input.lookInputY,
      strafeInput: input.strafeInput,
      verticalInput: input.verticalInput,
      targetLocked: input.targetLocked,
      trainingLookComplete: lookHorizontalComplete && lookVerticalComplete,
      trainingHorizontalStrafeComplete: strafeLeftComplete && strafeRightComplete,
      trainingVerticalStrafeComplete: strafeUpComplete && strafeDownComplete,
      trainingForwardReverseComplete: reversePassComplete && forwardPassComplete,
      trainingBoostComplete: boostGateCleared,
      trainingDroneLockComplete: droneLockComplete,
      trainingDroneDestroyed: droneDestroyed,
    }),
    resolveProjectileHitPadding: (targetId) => (targetId === TRAINING_DRONE_TARGET_ID ? 1.1 : 0),
  }
}
