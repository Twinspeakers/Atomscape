import {
  Color3,
  FreeCamera,
  HighlightLayer,
  Mesh,
  MeshBuilder,
  PointLight,
  Quaternion,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  DirectionalLight,
} from 'babylonjs'
import { DEFAULT_START_SECTOR_ID, resolveSectorDefinition } from '@domain/spec/sectorSpec'
import type { BuildSpaceSceneOptions, SpaceSceneBuildResult } from './sceneBuilder'

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function buildIntroSpaceScene(
  scene: Scene,
  options?: BuildSpaceSceneOptions,
): SpaceSceneBuildResult {
  const sector = resolveSectorDefinition(options?.sectorId ?? DEFAULT_START_SECTOR_ID)
  const spawnPosition = new Vector3(
    sector.playerSpawnPosition.x,
    sector.playerSpawnPosition.y,
    sector.playerSpawnPosition.z,
  )
  const spawnYawRadians = toRadians(sector.playerSpawnYawDegrees)
  const shipForward = new Vector3(
    Math.sin(spawnYawRadians),
    0,
    Math.cos(spawnYawRadians),
  ).normalize()
  const worldUp = new Vector3(0, 1, 0)
  const shipRight = Vector3.Cross(worldUp, shipForward)
  if (shipRight.lengthSquared() < 0.00001) {
    shipRight.copyFromFloats(1, 0, 0)
  }
  shipRight.normalize()

  const camera = new FreeCamera('camera', Vector3.Zero(), scene)
  camera.minZ = 0.1
  camera.maxZ = 26000

  const ship = new TransformNode('ship-root', scene)
  ship.rotationQuaternion = Quaternion.FromEulerAngles(0, spawnYawRadians, 0)
  ship.scaling = new Vector3(0.65, 0.65, 0.65)
  ship.position.copyFrom(spawnPosition)

  const shipHullMaterial = new StandardMaterial('ship-hull-material', scene)
  shipHullMaterial.diffuseColor = new Color3(0.13, 0.13, 0.15)
  shipHullMaterial.emissiveColor = new Color3(0.03, 0.03, 0.03)
  shipHullMaterial.specularColor = new Color3(0.16, 0.16, 0.18)

  const shipPlatingMaterial = new StandardMaterial('ship-plating-material', scene)
  shipPlatingMaterial.diffuseColor = new Color3(0.2, 0.2, 0.22)
  shipPlatingMaterial.emissiveColor = new Color3(0.04, 0.04, 0.05)
  shipPlatingMaterial.specularColor = new Color3(0.2, 0.2, 0.22)

  const shipTrimMaterial = new StandardMaterial('ship-trim-material', scene)
  shipTrimMaterial.diffuseColor = new Color3(0.08, 0.08, 0.1)
  shipTrimMaterial.emissiveColor = new Color3(0.02, 0.02, 0.02)
  shipTrimMaterial.specularColor = new Color3(0.14, 0.14, 0.16)

  const shipCanopyMaterial = new StandardMaterial('ship-canopy-material', scene)
  shipCanopyMaterial.diffuseColor = new Color3(0.2, 0.22, 0.24)
  shipCanopyMaterial.emissiveColor = new Color3(0.08, 0.1, 0.11)
  shipCanopyMaterial.alpha = 0.82

  const shipThrusterMaterial = new StandardMaterial('ship-thruster-material', scene)
  shipThrusterMaterial.diffuseColor = Color3.FromHexString('#BA3000')
  shipThrusterMaterial.emissiveColor = new Color3(0.86, 0.21, 0.02)
  shipThrusterMaterial.alpha = 0.95

  const attachShipPart = (mesh: Mesh): Mesh => {
    mesh.parent = ship
    mesh.isPickable = false
    return mesh
  }

  const mainFuselage = attachShipPart(
    MeshBuilder.CreateCylinder(
      'ship-main-fuselage',
      { diameter: 1.08, height: 3.5, tessellation: 52, subdivisions: 2 },
      scene,
    ),
  )
  mainFuselage.rotation.x = Math.PI * 0.5
  mainFuselage.material = shipHullMaterial

  const dorsalSpine = attachShipPart(
    MeshBuilder.CreateCylinder(
      'ship-dorsal-spine',
      { diameter: 0.5, height: 2.85, tessellation: 38 },
      scene,
    ),
  )
  dorsalSpine.rotation.x = Math.PI * 0.5
  dorsalSpine.position = new Vector3(0, 0.31, 0.04)
  dorsalSpine.material = shipPlatingMaterial

  const ventralKeel = attachShipPart(
    MeshBuilder.CreateCylinder(
      'ship-ventral-keel',
      { diameter: 0.44, height: 2.95, tessellation: 34 },
      scene,
    ),
  )
  ventralKeel.rotation.x = Math.PI * 0.5
  ventralKeel.position = new Vector3(0, -0.34, -0.04)
  ventralKeel.material = shipTrimMaterial

  const noseCap = attachShipPart(
    MeshBuilder.CreateSphere('ship-nose-cap', { diameter: 0.92, segments: 32 }, scene),
  )
  noseCap.position = new Vector3(0, 0, 1.94)
  noseCap.scaling = new Vector3(0.95, 0.85, 1.08)
  noseCap.material = shipHullMaterial

  const noseSpike = attachShipPart(
    MeshBuilder.CreateCylinder(
      'ship-nose-spike',
      { diameterTop: 0.02, diameterBottom: 0.34, height: 0.94, tessellation: 30 },
      scene,
    ),
  )
  noseSpike.rotation.x = Math.PI * 0.5
  noseSpike.position = new Vector3(0, -0.01, 2.37)
  noseSpike.material = shipTrimMaterial

  const noseBladeLeft = attachShipPart(
    MeshBuilder.CreateBox('ship-nose-blade-left', { width: 0.15, height: 0.06, depth: 0.58 }, scene),
  )
  noseBladeLeft.position = new Vector3(-0.2, -0.12, 2.02)
  noseBladeLeft.rotation.z = -0.18
  noseBladeLeft.material = shipPlatingMaterial

  const noseBladeRight = attachShipPart(
    MeshBuilder.CreateBox('ship-nose-blade-right', { width: 0.15, height: 0.06, depth: 0.58 }, scene),
  )
  noseBladeRight.position = new Vector3(0.2, -0.12, 2.02)
  noseBladeRight.rotation.z = 0.18
  noseBladeRight.material = shipPlatingMaterial

  const rearCap = attachShipPart(
    MeshBuilder.CreateSphere('ship-rear-cap', { diameter: 0.84, segments: 30 }, scene),
  )
  rearCap.position = new Vector3(0, -0.02, -1.93)
  rearCap.scaling = new Vector3(0.9, 0.82, 1.02)
  rearCap.material = shipTrimMaterial

  const leftCheek = attachShipPart(
    MeshBuilder.CreateSphere('ship-left-cheek', { diameter: 0.46, segments: 24 }, scene),
  )
  leftCheek.position = new Vector3(-0.28, -0.04, 1.66)
  leftCheek.scaling = new Vector3(0.95, 0.86, 1.15)
  leftCheek.material = shipPlatingMaterial

  const rightCheek = attachShipPart(
    MeshBuilder.CreateSphere('ship-right-cheek', { diameter: 0.46, segments: 24 }, scene),
  )
  rightCheek.position = new Vector3(0.28, -0.04, 1.66)
  rightCheek.scaling = new Vector3(0.95, 0.86, 1.15)
  rightCheek.material = shipPlatingMaterial

  const canopy = attachShipPart(
    MeshBuilder.CreateSphere('ship-canopy', { diameter: 0.72, segments: 28 }, scene),
  )
  canopy.position = new Vector3(0, 0.22, 0.88)
  canopy.scaling = new Vector3(0.96, 0.62, 1.62)
  canopy.material = shipCanopyMaterial

  const leftShoulderArmor = attachShipPart(
    MeshBuilder.CreateBox(
      'ship-left-shoulder-armor',
      { width: 0.44, height: 0.36, depth: 2.44 },
      scene,
    ),
  )
  leftShoulderArmor.position = new Vector3(-0.63, 0.02, -0.04)
  leftShoulderArmor.material = shipPlatingMaterial

  const rightShoulderArmor = attachShipPart(
    MeshBuilder.CreateBox(
      'ship-right-shoulder-armor',
      { width: 0.44, height: 0.36, depth: 2.44 },
      scene,
    ),
  )
  rightShoulderArmor.position = new Vector3(0.63, 0.02, -0.04)
  rightShoulderArmor.material = shipPlatingMaterial

  const leftWingRoot = attachShipPart(
    MeshBuilder.CreateSphere('ship-left-wing-root', { diameter: 0.52, segments: 24 }, scene),
  )
  leftWingRoot.position = new Vector3(-1.18, -0.08, 0.1)
  leftWingRoot.scaling = new Vector3(1.3, 0.66, 1.12)
  leftWingRoot.material = shipTrimMaterial

  const rightWingRoot = attachShipPart(
    MeshBuilder.CreateSphere('ship-right-wing-root', { diameter: 0.52, segments: 24 }, scene),
  )
  rightWingRoot.position = new Vector3(1.18, -0.08, 0.1)
  rightWingRoot.scaling = new Vector3(1.3, 0.66, 1.12)
  rightWingRoot.material = shipTrimMaterial

  const leftWingPlate = attachShipPart(
    MeshBuilder.CreateBox(
      'ship-left-wing-plate',
      { width: 1.28, height: 0.15, depth: 0.9 },
      scene,
    ),
  )
  leftWingPlate.position = new Vector3(-1.54, -0.16, 0.04)
  leftWingPlate.material = shipHullMaterial

  const rightWingPlate = attachShipPart(
    MeshBuilder.CreateBox(
      'ship-right-wing-plate',
      { width: 1.28, height: 0.15, depth: 0.9 },
      scene,
    ),
  )
  rightWingPlate.position = new Vector3(1.54, -0.16, 0.04)
  rightWingPlate.material = shipHullMaterial

  const leftWingTip = attachShipPart(
    MeshBuilder.CreateSphere('ship-left-wing-tip', { diameter: 0.38, segments: 22 }, scene),
  )
  leftWingTip.position = new Vector3(-2.12, -0.15, 0.05)
  leftWingTip.scaling = new Vector3(1.1, 0.74, 0.92)
  leftWingTip.material = shipPlatingMaterial

  const rightWingTip = attachShipPart(
    MeshBuilder.CreateSphere('ship-right-wing-tip', { diameter: 0.38, segments: 22 }, scene),
  )
  rightWingTip.position = new Vector3(2.12, -0.15, 0.05)
  rightWingTip.scaling = new Vector3(1.1, 0.74, 0.92)
  rightWingTip.material = shipPlatingMaterial

  const leftCanard = attachShipPart(
    MeshBuilder.CreateBox('ship-left-canard', { width: 0.62, height: 0.09, depth: 0.52 }, scene),
  )
  leftCanard.position = new Vector3(-0.98, 0.06, 0.96)
  leftCanard.rotation.z = -0.06
  leftCanard.material = shipPlatingMaterial

  const rightCanard = attachShipPart(
    MeshBuilder.CreateBox('ship-right-canard', { width: 0.62, height: 0.09, depth: 0.52 }, scene),
  )
  rightCanard.position = new Vector3(0.98, 0.06, 0.96)
  rightCanard.rotation.z = 0.06
  rightCanard.material = shipPlatingMaterial

  const leftEngine = attachShipPart(
    MeshBuilder.CreateCylinder(
      'ship-left-engine',
      { diameter: 0.44, height: 1.86, tessellation: 36 },
      scene,
    ),
  )
  leftEngine.rotation.x = Math.PI * 0.5
  leftEngine.position = new Vector3(-0.88, -0.19, -1.2)
  leftEngine.material = shipTrimMaterial

  const rightEngine = attachShipPart(
    MeshBuilder.CreateCylinder(
      'ship-right-engine',
      { diameter: 0.44, height: 1.86, tessellation: 36 },
      scene,
    ),
  )
  rightEngine.rotation.x = Math.PI * 0.5
  rightEngine.position = new Vector3(0.88, -0.19, -1.2)
  rightEngine.material = shipTrimMaterial

  const leftEngineNozzle = attachShipPart(
    MeshBuilder.CreateCylinder(
      'ship-left-engine-nozzle',
      { diameterTop: 0.3, diameterBottom: 0.56, height: 0.44, tessellation: 30 },
      scene,
    ),
  )
  leftEngineNozzle.rotation.x = Math.PI * 0.5
  leftEngineNozzle.position = new Vector3(-0.88, -0.19, -2.34)
  leftEngineNozzle.material = shipThrusterMaterial

  const rightEngineNozzle = attachShipPart(
    MeshBuilder.CreateCylinder(
      'ship-right-engine-nozzle',
      { diameterTop: 0.3, diameterBottom: 0.56, height: 0.44, tessellation: 30 },
      scene,
    ),
  )
  rightEngineNozzle.rotation.x = Math.PI * 0.5
  rightEngineNozzle.position = new Vector3(0.88, -0.19, -2.34)
  rightEngineNozzle.material = shipThrusterMaterial

  const leftEngineGlow = attachShipPart(
    MeshBuilder.CreateSphere('ship-left-engine-glow', { diameter: 0.22, segments: 20 }, scene),
  )
  leftEngineGlow.position = new Vector3(-0.88, -0.19, -2.56)
  leftEngineGlow.scaling = new Vector3(0.9, 0.9, 1.15)
  leftEngineGlow.material = shipThrusterMaterial

  const rightEngineGlow = attachShipPart(
    MeshBuilder.CreateSphere('ship-right-engine-glow', { diameter: 0.22, segments: 20 }, scene),
  )
  rightEngineGlow.position = new Vector3(0.88, -0.19, -2.56)
  rightEngineGlow.scaling = new Vector3(0.9, 0.9, 1.15)
  rightEngineGlow.material = shipThrusterMaterial

  const chinArmor = attachShipPart(
    MeshBuilder.CreateBox('ship-chin-armor', { width: 0.58, height: 0.1, depth: 0.58 }, scene),
  )
  chinArmor.position = new Vector3(0, -0.28, 1.44)
  chinArmor.material = shipTrimMaterial

  const dorsalFin = attachShipPart(
    MeshBuilder.CreateBox('ship-dorsal-fin', { width: 0.08, height: 0.44, depth: 0.66 }, scene),
  )
  dorsalFin.position = new Vector3(0, 0.64, -0.44)
  dorsalFin.material = shipPlatingMaterial

  const ventralFin = attachShipPart(
    MeshBuilder.CreateBox('ship-ventral-fin', { width: 0.07, height: 0.32, depth: 0.58 }, scene),
  )
  ventralFin.position = new Vector3(0, -0.6, -0.38)
  ventralFin.material = shipTrimMaterial

  for (let ribIndex = 0; ribIndex < 7; ribIndex += 1) {
    const rib = attachShipPart(
      MeshBuilder.CreateBox(
        `ship-dorsal-rib-${ribIndex}`,
        { width: 0.34, height: 0.05, depth: 0.24 },
        scene,
      ),
    )
    rib.position = new Vector3(0, 0.52, -0.95 + ribIndex * 0.34)
    rib.material = shipTrimMaterial
  }

  for (let plateIndex = 0; plateIndex < 8; plateIndex += 1) {
    const z = -1.15 + plateIndex * 0.34

    const centerPlate = attachShipPart(
      MeshBuilder.CreateCylinder(
        `ship-center-plate-${plateIndex}`,
        { diameterTop: 0.22, diameterBottom: 0.28, height: 0.2, tessellation: 18 },
        scene,
      ),
    )
    centerPlate.rotation.x = Math.PI * 0.5
    centerPlate.position = new Vector3(0, 0.21, z)
    centerPlate.material = shipPlatingMaterial

    const leftPlate = attachShipPart(
      MeshBuilder.CreateCylinder(
        `ship-left-flank-plate-${plateIndex}`,
        { diameterTop: 0.13, diameterBottom: 0.2, height: 0.18, tessellation: 16 },
        scene,
      ),
    )
    leftPlate.rotation.z = Math.PI * 0.5
    leftPlate.position = new Vector3(-0.51, -0.01, z)
    leftPlate.rotation.y = 0.11
    leftPlate.material = shipHullMaterial

    const rightPlate = attachShipPart(
      MeshBuilder.CreateCylinder(
        `ship-right-flank-plate-${plateIndex}`,
        { diameterTop: 0.13, diameterBottom: 0.2, height: 0.18, tessellation: 16 },
        scene,
      ),
    )
    rightPlate.rotation.z = Math.PI * 0.5
    rightPlate.position = new Vector3(0.51, -0.01, z)
    rightPlate.rotation.y = -0.11
    rightPlate.material = shipHullMaterial
  }

  for (let ventIndex = 0; ventIndex < 4; ventIndex += 1) {
    const offsetZ = -1.26 - ventIndex * 0.32
    const leftVent = attachShipPart(
      MeshBuilder.CreateCylinder(
        `ship-left-vent-${ventIndex}`,
        { diameter: 0.1, height: 0.24, tessellation: 18 },
        scene,
      ),
    )
    leftVent.rotation.z = Math.PI * 0.5
    leftVent.position = new Vector3(-1.02, -0.19, offsetZ)
    leftVent.material = shipTrimMaterial

    const rightVent = attachShipPart(
      MeshBuilder.CreateCylinder(
        `ship-right-vent-${ventIndex}`,
        { diameter: 0.1, height: 0.24, tessellation: 18 },
        scene,
      ),
    )
    rightVent.rotation.z = Math.PI * 0.5
    rightVent.position = new Vector3(1.02, -0.19, offsetZ)
    rightVent.material = shipTrimMaterial
  }

  const leftWingBlade = attachShipPart(
    MeshBuilder.CreateBox('ship-left-wing-blade', { width: 1.08, height: 0.06, depth: 0.34 }, scene),
  )
  leftWingBlade.position = new Vector3(-1.77, -0.03, 0.5)
  leftWingBlade.rotation.z = -0.17
  leftWingBlade.rotation.y = 0.1
  leftWingBlade.material = shipPlatingMaterial

  const rightWingBlade = attachShipPart(
    MeshBuilder.CreateBox('ship-right-wing-blade', { width: 1.08, height: 0.06, depth: 0.34 }, scene),
  )
  rightWingBlade.position = new Vector3(1.77, -0.03, 0.5)
  rightWingBlade.rotation.z = 0.17
  rightWingBlade.rotation.y = -0.1
  rightWingBlade.material = shipPlatingMaterial

  const projectileMaterial = new StandardMaterial('projectile-material', scene)
  projectileMaterial.diffuseColor = new Color3(0.99, 0.68, 0.2)
  projectileMaterial.emissiveColor = new Color3(0.9, 0.45, 0.1)

  const highlightLayer = new HighlightLayer('selection-highlight', scene)

  const sunLight = new DirectionalLight(
    'intro-sun-light',
    new Vector3(-0.35, -0.1, -0.93),
    scene,
  )
  sunLight.position = new Vector3(2600, 900, 2200)
  sunLight.intensity = 1.1

  const stationAnchor = spawnPosition
    .add(shipForward.scale(880))
    .add(worldUp.scale(120))
  const stationScale = 9

  const stationMaterial = new StandardMaterial('station-material', scene)
  stationMaterial.diffuseColor = new Color3(0.74, 0.74, 0.74)
  stationMaterial.emissiveColor = new Color3(0.16, 0.16, 0.16)

  const stationChargeRingMaterial = new StandardMaterial('station-charge-ring-material', scene)
  stationChargeRingMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3)
  stationChargeRingMaterial.emissiveColor = new Color3(0.05, 0.05, 0.05)
  stationChargeRingMaterial.alpha = 0.2

  const stationDockRingMaterial = new StandardMaterial('station-dock-ring-material', scene)
  stationDockRingMaterial.diffuseColor = new Color3(0.35, 0.35, 0.35)
  stationDockRingMaterial.emissiveColor = new Color3(0.06, 0.06, 0.06)
  stationDockRingMaterial.alpha = 0.3

  const stationBeaconMaterial = new StandardMaterial('station-beacon-material', scene)
  stationBeaconMaterial.diffuseColor = new Color3(0.42, 0.42, 0.44)
  stationBeaconMaterial.emissiveColor = new Color3(0.11, 0.11, 0.12)
  stationBeaconMaterial.alpha = 0.6

  const stationCore = MeshBuilder.CreateCylinder(
    'solar-station-core',
    { diameter: 7, height: 5, tessellation: 20 },
    scene,
  )
  stationCore.position.copyFrom(stationAnchor)
  stationCore.scaling.setAll(stationScale)
  stationCore.material = stationMaterial
  stationCore.isPickable = false

  const stationRing = MeshBuilder.CreateTorus(
    'solar-station-ring',
    { diameter: 20, thickness: 1.3 },
    scene,
  )
  stationRing.rotation.x = Math.PI * 0.5
  stationRing.position.copyFrom(stationAnchor)
  stationRing.scaling.setAll(stationScale)
  stationRing.material = stationMaterial
  stationRing.isPickable = false

  const stationChargeRing = MeshBuilder.CreateTorus(
    'station-charge-range-ring',
    { diameter: 12, thickness: 1.8, tessellation: 100 },
    scene,
  )
  stationChargeRing.rotation.x = Math.PI * 0.5
  stationChargeRing.position.copyFrom(stationAnchor)
  stationChargeRing.scaling.setAll(stationScale)
  stationChargeRing.material = stationChargeRingMaterial
  stationChargeRing.isPickable = false
  stationChargeRing.setEnabled(false)

  const stationDockRing = MeshBuilder.CreateTorus(
    'station-dock-ring',
    { diameter: 6, thickness: 0.7, tessellation: 56 },
    scene,
  )
  stationDockRing.rotation.x = Math.PI * 0.5
  stationDockRing.position.copyFrom(stationAnchor.add(new Vector3(0, 0.2 * stationScale, 0)))
  stationDockRing.scaling.setAll(stationScale)
  stationDockRing.material = stationDockRingMaterial
  stationDockRing.isPickable = false
  stationDockRing.setEnabled(false)

  const stationBeacon = MeshBuilder.CreateCylinder(
    'station-beacon',
    {
      diameterTop: 0.32,
      diameterBottom: 1.4,
      height: 42,
      tessellation: 16,
    },
    scene,
  )
  stationBeacon.position = stationAnchor.add(new Vector3(0, 21 * stationScale, 0))
  stationBeacon.scaling.setAll(stationScale)
  stationBeacon.material = stationBeaconMaterial
  stationBeacon.isPickable = false

  const stationLight = new PointLight(
    'station-light',
    stationAnchor.add(new Vector3(0, 8 * stationScale, 0)),
    scene,
  )
  stationLight.intensity = 0.64
  stationLight.range = 700

  const portalMaterial = new StandardMaterial('sector-portal-material', scene)
  portalMaterial.diffuseColor = Color3.FromHexString('#78ef00')
  portalMaterial.emissiveColor = Color3.FromHexString('#78ef00')
  portalMaterial.alpha = 0.78

  const portalGate = MeshBuilder.CreateTorus(
    'sector-portal-gate',
    {
      diameter: 8.2,
      thickness: 0.72,
      tessellation: 72,
    },
    scene,
  )
  portalGate.position.copyFrom(stationAnchor.add(new Vector3(36 * stationScale, 4.6 * stationScale, -22 * stationScale)))
  portalGate.scaling.setAll(stationScale)
  portalGate.rotation.z = Math.PI * 0.5
  portalGate.material = portalMaterial
  portalGate.isPickable = false
  portalGate.setEnabled(false)

  const createNavigationBeacon = (name: string, anchor: Vector3, colorHex: string, mastHeight: number): void => {
    const color = Color3.FromHexString(colorHex)
    const beaconMaterial = new StandardMaterial(`${name}-material`, scene)
    beaconMaterial.diffuseColor = color.scale(0.65)
    beaconMaterial.emissiveColor = color.scale(0.22)
    beaconMaterial.alpha = 0.88

    const mast = MeshBuilder.CreateCylinder(
      `${name}-mast`,
      { diameter: 3.2, height: mastHeight, tessellation: 14 },
      scene,
    )
    mast.position.copyFrom(anchor)
    mast.material = beaconMaterial
    mast.isPickable = false

    const cap = MeshBuilder.CreateSphere(`${name}-cap`, { diameter: 8, segments: 18 }, scene)
    cap.position.copyFrom(anchor.add(new Vector3(0, mastHeight * 0.5 + 4.6, 0)))
    cap.material = beaconMaterial
    cap.isPickable = false

    const ring = MeshBuilder.CreateTorus(
      `${name}-ring`,
      { diameter: 15.5, thickness: 0.58, tessellation: 56 },
      scene,
    )
    ring.rotation.x = Math.PI * 0.5
    ring.position.copyFrom(cap.position.add(new Vector3(0, -2.6, 0)))
    ring.material = beaconMaterial
    ring.isPickable = false

    const light = new PointLight(
      `${name}-light`,
      cap.position.add(new Vector3(0, 2.4, 0)),
      scene,
    )
    light.diffuse = color
    light.intensity = 0.36
    light.range = 360
  }

  createNavigationBeacon(
    'training-landmark-port',
    spawnPosition
      .add(shipForward.scale(300))
      .add(shipRight.scale(-250))
      .add(worldUp.scale(28)),
    '#62d0ff',
    44,
  )
  createNavigationBeacon(
    'training-landmark-starboard',
    spawnPosition
      .add(shipForward.scale(350))
      .add(shipRight.scale(255))
      .add(worldUp.scale(34)),
    '#8fb7ff',
    52,
  )
  createNavigationBeacon(
    'training-landmark-high',
    spawnPosition
      .add(shipForward.scale(240))
      .add(worldUp.scale(190)),
    '#b8ff9a',
    60,
  )

  const controlMarkerMaterial = new StandardMaterial('training-control-marker-material', scene)
  controlMarkerMaterial.diffuseColor = Color3.FromHexString('#9ad8ff')
  controlMarkerMaterial.emissiveColor = Color3.FromHexString('#2e6d8a')
  controlMarkerMaterial.alpha = 0.9

  const controlMarkerAnchors = [
    spawnPosition.add(shipRight.scale(-96)).add(worldUp.scale(12)),
    spawnPosition.add(shipRight.scale(96)).add(worldUp.scale(12)),
    spawnPosition.add(shipForward.scale(18)).add(worldUp.scale(82)),
    spawnPosition.add(shipForward.scale(18)).add(worldUp.scale(-46)),
  ]
  controlMarkerAnchors.forEach((anchor, index) => {
    const sphere = MeshBuilder.CreateSphere(
      `training-control-marker-${index}`,
      { diameter: index >= 2 ? 10 : 8.5, segments: 16 },
      scene,
    )
    sphere.position.copyFrom(anchor)
    sphere.material = controlMarkerMaterial
    sphere.isPickable = false

    const ring = MeshBuilder.CreateTorus(
      `training-control-marker-ring-${index}`,
      { diameter: index >= 2 ? 18 : 15, thickness: 0.5, tessellation: 44 },
      scene,
    )
    ring.rotation.x = Math.PI * 0.5
    ring.position.copyFrom(anchor.add(new Vector3(0, -1.2, 0)))
    ring.material = controlMarkerMaterial
    ring.isPickable = false
  })

  const laneMarkerMaterial = new StandardMaterial('training-lane-marker-material', scene)
  laneMarkerMaterial.diffuseColor = Color3.FromHexString('#f4da8f')
  laneMarkerMaterial.emissiveColor = Color3.FromHexString('#8a6a22')
  laneMarkerMaterial.alpha = 0.92
  for (let markerIndex = 0; markerIndex < 7; markerIndex += 1) {
    const laneMarker = MeshBuilder.CreateSphere(
      `training-lane-marker-${markerIndex}`,
      { diameter: markerIndex === 0 ? 4.2 : 3.2, segments: 14 },
      scene,
    )
    const laneDistance = 18 + markerIndex * 14
    laneMarker.position.copyFrom(
      spawnPosition
        .subtract(shipForward.scale(laneDistance))
        .add(worldUp.scale(4 + (markerIndex % 2 === 0 ? 1.6 : 0.4))),
    )
    laneMarker.material = laneMarkerMaterial
    laneMarker.isPickable = false
  }

  const backgroundPropMaterial = new StandardMaterial('training-background-prop-material', scene)
  backgroundPropMaterial.diffuseColor = Color3.FromHexString('#8698ad')
  backgroundPropMaterial.emissiveColor = Color3.FromHexString('#1f2730')
  backgroundPropMaterial.alpha = 0.84
  const createBackgroundPropCluster = (name: string, anchor: Vector3): void => {
    const core = MeshBuilder.CreateBox(
      `${name}-core`,
      { width: 14, height: 4.2, depth: 5.4 },
      scene,
    )
    core.position.copyFrom(anchor)
    core.material = backgroundPropMaterial
    core.isPickable = false

    const leftPanel = MeshBuilder.CreateBox(
      `${name}-left-panel`,
      { width: 12, height: 0.8, depth: 4.4 },
      scene,
    )
    leftPanel.position.copyFrom(anchor.add(new Vector3(-12.8, 0, 0)))
    leftPanel.rotation.z = -0.08
    leftPanel.material = backgroundPropMaterial
    leftPanel.isPickable = false

    const rightPanel = MeshBuilder.CreateBox(
      `${name}-right-panel`,
      { width: 12, height: 0.8, depth: 4.4 },
      scene,
    )
    rightPanel.position.copyFrom(anchor.add(new Vector3(12.8, 0, 0)))
    rightPanel.rotation.z = 0.08
    rightPanel.material = backgroundPropMaterial
    rightPanel.isPickable = false
  }
  createBackgroundPropCluster(
    'training-background-prop-0',
    spawnPosition
      .add(shipForward.scale(520))
      .add(shipRight.scale(-320))
      .add(worldUp.scale(76)),
  )
  createBackgroundPropCluster(
    'training-background-prop-1',
    spawnPosition
      .add(shipForward.scale(610))
      .add(shipRight.scale(300))
      .add(worldUp.scale(92)),
  )
  createBackgroundPropCluster(
    'training-background-prop-2',
    spawnPosition
      .add(shipForward.scale(420))
      .add(shipRight.scale(20))
      .add(worldUp.scale(-112)),
  )

  camera.position.copyFrom(
    ship.position
      .subtract(shipForward.scale(16))
      .add(worldUp.scale(5.2)),
  )
  camera.setTarget(
    ship.position
      .add(shipForward.scale(30))
      .subtract(worldUp.scale(2.45)),
  )

  return {
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
    asteroids: [],
    extractionNodes: [],
    projectiles: [],
    cleanupZones: sector.cleanupZones,
    celestialLabelTargets: [],
    dynamicCollisionBodies: [],
    portalGate,
    portalDestinationSectorId: sector.portalExit,
    worldTargetIds: [],
    spawnAsteroidByTargetId: () => null,
    updateCelestialBodies: () => {},
    updateThrusterFx: () => {},
  }
}
