import {
  Color3,
  DirectionalLight,
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
} from 'babylonjs'
import {
  type CleanupZoneDefinition,
  DEFAULT_WORLD_SEED,
  type CleanupTargetClassId,
  type CleanupZoneId,
} from '@domain/spec/worldSpec'
import {
  type CelestialRenderMode,
  DEFAULT_START_SECTOR_ID,
  resolveSectorCelestialConfig,
  resolveSectorDefinition,
  type SectorCelestialBodyConfig,
  type SectorVector3,
  type SectorId,
} from '@domain/spec/sectorSpec'
import {
  CHARGING_RANGE_METERS,
  STATION_DOCKING_RANGE_METERS,
} from '@domain/spec/gameSpec'
import {
  cleanupTargetClassCatalog,
  generateCleanupWorld,
  type CleanupTargetInstance,
} from '@domain/world/cleanupCatalog'
import { buildYieldPreview } from './targetRendering'
import type {
  AsteroidEntity,
  CelestialLabelTarget,
  DynamicCollisionBody,
  ExtractionNodeEntity,
  ProjectileEntity,
} from './types'

export interface SpaceSceneBuildResult {
  camera: FreeCamera
  ship: TransformNode
  stationCore: Mesh
  stationChargeRing: Mesh
  stationDockRing: Mesh
  stationBeacon: Mesh
  stationChargeRingMaterial: StandardMaterial
  stationDockRingMaterial: StandardMaterial
  stationBeaconMaterial: StandardMaterial
  highlightLayer: HighlightLayer
  projectileMaterial: StandardMaterial
  asteroids: AsteroidEntity[]
  extractionNodes: ExtractionNodeEntity[]
  projectiles: ProjectileEntity[]
  cleanupZones: CleanupZoneDefinition[]
  celestialLabelTargets: CelestialLabelTarget[]
  dynamicCollisionBodies: DynamicCollisionBody[]
  portalGate: Mesh
  portalDestinationSectorId: SectorId
  worldTargetIds: string[]
  spawnAsteroidByTargetId: (targetId: string) => AsteroidEntity | null
  updateCelestialBodies: (timeMs: number) => void
  updateThrusterFx: (input: {
    forward: Vector3
    velocity: Vector3
    thrustInput: number
    speed: number
    maxSpeed: number
    boosting: boolean
  }) => void
}

export interface BuildSpaceSceneOptions {
  seed?: string
  depletedTargetIds?: string[]
  sectorId?: SectorId
}

interface TargetVisualTheme {
  diffuseHex: string
  emissiveHex: string
}

const targetVisualThemes: Record<CleanupTargetClassId, TargetVisualTheme> = {
  rockBody: {
    diffuseHex: '#cfcfd4',
    emissiveHex: '#2f2f35',
  },
  metalScrap: {
    diffuseHex: '#88a8c2',
    emissiveHex: '#1d3346',
  },
  compositeJunk: {
    diffuseHex: '#c9a36e',
    emissiveHex: '#3f2d19',
  },
  carbonRichAsteroid: {
    diffuseHex: '#5f8c43',
    emissiveHex: '#1c2e14',
  },
  volatileIceChunk: {
    diffuseHex: '#86daf7',
    emissiveHex: '#20566c',
  },
}

export function buildSpaceScene(
  scene: Scene,
  options?: BuildSpaceSceneOptions,
): SpaceSceneBuildResult {
  const sector = resolveSectorDefinition(options?.sectorId ?? DEFAULT_START_SECTOR_ID)
  const celestialConfig = resolveSectorCelestialConfig(sector.id)
  const toVector3 = (value: SectorVector3): Vector3 => new Vector3(value.x, value.y, value.z)
  const sunAnchorPosition = toVector3(celestialConfig.sunAnchorPosition)
  const sunLightDirection = sunAnchorPosition.scale(-1).normalize()
  const sunLight = new DirectionalLight('sun-light', sunLightDirection, scene)
  sunLight.position = sunAnchorPosition.clone()
  sunLight.intensity = celestialConfig.sunLightBaseIntensity

  const camera = new FreeCamera('camera', new Vector3(0, 4, -15), scene)
  camera.minZ = 0.1
  camera.maxZ = 26000

  const ship = new TransformNode('ship-root', scene)
  ship.rotationQuaternion = Quaternion.Identity()
  ship.scaling = new Vector3(0.65, 0.65, 0.65)
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

  const updateThrusterFx = (_input: {
    forward: Vector3
    velocity: Vector3
    thrustInput: number
    speed: number
    maxSpeed: number
    boosting: boolean
  }) => {
    // Thruster particle effects have been intentionally removed.
    void _input
  }

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

  const rockBodyMaterial = new StandardMaterial('rock-body-material', scene)
  rockBodyMaterial.diffuseColor = Color3.FromHexString(targetVisualThemes.rockBody.diffuseHex)
  rockBodyMaterial.emissiveColor = Color3.FromHexString(targetVisualThemes.rockBody.emissiveHex)

  const metalScrapMaterial = new StandardMaterial('metal-scrap-material', scene)
  metalScrapMaterial.diffuseColor = Color3.FromHexString(targetVisualThemes.metalScrap.diffuseHex)
  metalScrapMaterial.emissiveColor = Color3.FromHexString(targetVisualThemes.metalScrap.emissiveHex)

  const compositeJunkMaterial = new StandardMaterial('composite-junk-material', scene)
  compositeJunkMaterial.diffuseColor = Color3.FromHexString(targetVisualThemes.compositeJunk.diffuseHex)
  compositeJunkMaterial.emissiveColor = Color3.FromHexString(targetVisualThemes.compositeJunk.emissiveHex)

  const carbonRichAsteroidMaterial = new StandardMaterial('carbon-rich-asteroid-material', scene)
  carbonRichAsteroidMaterial.diffuseColor = Color3.FromHexString(targetVisualThemes.carbonRichAsteroid.diffuseHex)
  carbonRichAsteroidMaterial.emissiveColor = Color3.FromHexString(targetVisualThemes.carbonRichAsteroid.emissiveHex)

  const volatileIceMaterial = new StandardMaterial('volatile-ice-material', scene)
  volatileIceMaterial.diffuseColor = Color3.FromHexString(targetVisualThemes.volatileIceChunk.diffuseHex)
  volatileIceMaterial.emissiveColor = Color3.FromHexString(targetVisualThemes.volatileIceChunk.emissiveHex)

  const sunMaterial = new StandardMaterial('sun-material', scene)
  sunMaterial.diffuseColor = Color3.FromHexString('#f9c55d')
  sunMaterial.emissiveColor = Color3.FromHexString('#ff9f2e')
  sunMaterial.disableLighting = true

  const earthMaterial = new StandardMaterial('earth-material', scene)
  earthMaterial.diffuseColor = Color3.FromHexString('#2d4f8f')
  earthMaterial.emissiveColor = Color3.FromHexString('#04070b')
  earthMaterial.specularColor = Color3.FromHexString('#5f9bcf')

  const marsMaterial = new StandardMaterial('mars-material', scene)
  marsMaterial.diffuseColor = Color3.FromHexString('#904a2f')
  marsMaterial.emissiveColor = Color3.FromHexString('#3b1b12')
  marsMaterial.specularColor = Color3.FromHexString('#ba6e4a')

  const moonMaterial = new StandardMaterial('moon-material', scene)
  moonMaterial.diffuseColor = Color3.FromHexString('#8a8f98')
  moonMaterial.emissiveColor = Color3.FromHexString('#090c11')
  moonMaterial.specularColor = Color3.FromHexString('#a4abb5')

  const mercuryMaterial = new StandardMaterial('mercury-material', scene)
  mercuryMaterial.diffuseColor = Color3.FromHexString('#98999e')
  mercuryMaterial.emissiveColor = Color3.FromHexString('#0b0b0e')
  mercuryMaterial.specularColor = Color3.FromHexString('#afafb6')

  const venusMaterial = new StandardMaterial('venus-material', scene)
  venusMaterial.diffuseColor = Color3.FromHexString('#cda164')
  venusMaterial.emissiveColor = Color3.FromHexString('#140f09')
  venusMaterial.specularColor = Color3.FromHexString('#e0bb86')

  const jupiterMaterial = new StandardMaterial('jupiter-material', scene)
  jupiterMaterial.diffuseColor = Color3.FromHexString('#bd8a5a')
  jupiterMaterial.emissiveColor = Color3.FromHexString('#160d07')
  jupiterMaterial.specularColor = Color3.FromHexString('#d8b082')

  const saturnMaterial = new StandardMaterial('saturn-material', scene)
  saturnMaterial.diffuseColor = Color3.FromHexString('#c9b17f')
  saturnMaterial.emissiveColor = Color3.FromHexString('#141108')
  saturnMaterial.specularColor = Color3.FromHexString('#e1cca1')

  const uranusMaterial = new StandardMaterial('uranus-material', scene)
  uranusMaterial.diffuseColor = Color3.FromHexString('#7bc8d8')
  uranusMaterial.emissiveColor = Color3.FromHexString('#081116')
  uranusMaterial.specularColor = Color3.FromHexString('#9adceb')

  const neptuneMaterial = new StandardMaterial('neptune-material', scene)
  neptuneMaterial.diffuseColor = Color3.FromHexString('#4d69c8')
  neptuneMaterial.emissiveColor = Color3.FromHexString('#090d19')
  neptuneMaterial.specularColor = Color3.FromHexString('#7088dc')

  const plutoMaterial = new StandardMaterial('pluto-material', scene)
  plutoMaterial.diffuseColor = Color3.FromHexString('#a69a90')
  plutoMaterial.emissiveColor = Color3.FromHexString('#0f0d0c')
  plutoMaterial.specularColor = Color3.FromHexString('#bbb0a7')

  const projectileMaterial = new StandardMaterial('projectile-material', scene)
  projectileMaterial.diffuseColor = new Color3(0.99, 0.68, 0.2)
  projectileMaterial.emissiveColor = new Color3(0.9, 0.45, 0.1)

  const highlightLayer = new HighlightLayer('selection-highlight', scene)

  const classMaterials: Record<CleanupTargetClassId, StandardMaterial> = {
    rockBody: rockBodyMaterial,
    metalScrap: metalScrapMaterial,
    compositeJunk: compositeJunkMaterial,
    carbonRichAsteroid: carbonRichAsteroidMaterial,
    volatileIceChunk: volatileIceMaterial,
  }
  const worldSeed = options?.seed ?? sector.worldSeed ?? DEFAULT_WORLD_SEED
  const cleanupWorld = generateCleanupWorld({
    seed: worldSeed,
    zones: sector.cleanupZones,
  })
  const cleanupTargetById = new Map(cleanupWorld.targets.map((target) => [target.id, target] as const))
  const depletedTargetSet = new Set(options?.depletedTargetIds ?? [])
  let dynamicTargetCounter = 0

  const createAsteroid = (target: CleanupTargetInstance): AsteroidEntity => {
    const classDefinition = cleanupTargetClassCatalog[target.classId]
    const meshId = `cleanup-target-${target.id}-${dynamicTargetCounter++}`
    const mesh = classDefinition.kind === 'spaceJunk'
      ? MeshBuilder.CreateBox(
          meshId,
          {
            width: target.radius * 1.8,
            height: target.radius * 1.2,
            depth: target.radius * 1.5,
          },
          scene,
        )
      : MeshBuilder.CreateSphere(
          meshId,
          {
            diameter: target.radius * 2,
            segments: 12,
          },
          scene,
        )

    mesh.material = classMaterials[target.classId]
    mesh.position = new Vector3(target.position.x, target.position.y, target.position.z)

    return {
      targetId: target.id,
      mesh,
      classId: target.classId,
      kind: classDefinition.kind,
      zoneId: target.zoneId,
      label: classDefinition.label,
      description: classDefinition.description,
      signatureElementSymbol: classDefinition.signatureElementSymbol,
      riskRating: target.riskRating,
      yieldPreview: buildYieldPreview(target.expectedYield),
      expectedYield: target.expectedYield,
      radius: target.radius,
      integrity: target.integrity,
    }
  }

  const asteroids: AsteroidEntity[] = cleanupWorld.targets
    .filter((target) => !depletedTargetSet.has(target.id))
    .map((target) => createAsteroid(target))

  const spawnAsteroidByTargetId = (targetId: string): AsteroidEntity | null => {
    const target = cleanupTargetById.get(targetId)
    if (!target) {
      return null
    }

    return createAsteroid(target)
  }

  interface ExtractionNodeTemplate {
    id: string
    zoneId: CleanupZoneId
    classId: CleanupTargetClassId
    label: string
    description: string
    offset: Vector3
    extractionRange: number
    extractionIntervalSeconds: number
    yieldScale: number
  }

  const extractionNodeTemplates: ExtractionNodeTemplate[] = [
    {
      id: 'carbon-lode-a',
      zoneId: 'denseDebrisLane',
      classId: 'carbonRichAsteroid',
      label: 'Carbon-rich Asteroid Deposit',
      description: 'Stable carbonaceous lode for sustained extraction.',
      offset: new Vector3(-24, 8, 18),
      extractionRange: 18,
      extractionIntervalSeconds: 0.34,
      yieldScale: 1.75,
    },
    {
      id: 'carbon-lode-b',
      zoneId: 'highRiskSalvagePocket',
      classId: 'carbonRichAsteroid',
      label: 'Carbon-rich Asteroid Deposit',
      description: 'High-grade carbon seam with volatile traces.',
      offset: new Vector3(22, -6, -12),
      extractionRange: 20,
      extractionIntervalSeconds: 0.32,
      yieldScale: 1.95,
    },
    {
      id: 'ice-vein-a',
      zoneId: 'highRiskSalvagePocket',
      classId: 'volatileIceChunk',
      label: 'Volatile Ice Vein',
      description: 'Cryogenic seam rich in water and CO2 ice.',
      offset: new Vector3(-14, 11, 24),
      extractionRange: 17,
      extractionIntervalSeconds: 0.4,
      yieldScale: 1.55,
    },
    {
      id: 'ore-cluster-a',
      zoneId: 'nearStationBelt',
      classId: 'metalScrap',
      label: 'Ore Scrap Cluster',
      description: 'Compacted metallic cluster for sustained ore pulls.',
      offset: new Vector3(44, 9, -38),
      extractionRange: 16,
      extractionIntervalSeconds: 0.36,
      yieldScale: 1.6,
    },
  ]

  const zoneCenterById = new Map<CleanupZoneId, Vector3>(
    cleanupWorld.zones.map((zone) => [zone.id, new Vector3(zone.center.x, zone.center.y, zone.center.z)]),
  )

  const extractionNodes: ExtractionNodeEntity[] = extractionNodeTemplates.map((template, index) => {
    const zoneCenter = zoneCenterById.get(template.zoneId) ?? Vector3.Zero()
    const classDefinition = cleanupTargetClassCatalog[template.classId]
    const mesh = MeshBuilder.CreateSphere(
      `extraction-node-${template.id}`,
      {
        diameter: 4.2 + index * 0.2,
        segments: 20,
      },
      scene,
    )
    mesh.position.copyFrom(zoneCenter.add(template.offset))
    mesh.material = classMaterials[template.classId]
    mesh.isPickable = true

    const scaledYield = Object.fromEntries(
      Object.entries(classDefinition.yieldProfile).map(([resourceId, amount]) => [
        resourceId,
        Number((amount * template.yieldScale).toFixed(4)),
      ]),
    )

    return {
      nodeId: template.id,
      mesh,
      classId: template.classId,
      kind: classDefinition.kind,
      zoneId: template.zoneId,
      label: template.label,
      description: template.description,
      signatureElementSymbol: classDefinition.signatureElementSymbol,
      riskRating: Number(((classDefinition.riskRating + 0.18) / 1.18).toFixed(4)),
      yieldPreview: buildYieldPreview(scaledYield),
      expectedYield: scaledYield,
      extractionRange: template.extractionRange,
      extractionIntervalSeconds: template.extractionIntervalSeconds,
    }
  })

  const celestialBackgroundRoot = new TransformNode('celestial-background-root', scene)
  celestialBackgroundRoot.position.setAll(0)
  const celestialGameplayRoot = new TransformNode('celestial-gameplay-root', scene)
  celestialGameplayRoot.position.setAll(0)
  const celestialLayerRoots: Record<CelestialRenderMode, TransformNode> = {
    background: celestialBackgroundRoot,
    gameplay: celestialGameplayRoot,
  }
  const createSunAnchor = (renderMode: CelestialRenderMode): TransformNode => {
    const anchor = new TransformNode(`sun-anchor-${renderMode}`, scene)
    anchor.parent = celestialLayerRoots[renderMode]
    anchor.position.copyFrom(sunAnchorPosition)
    return anchor
  }
  const sunAnchorByLayer: Record<CelestialRenderMode, TransformNode> = {
    background: createSunAnchor('background'),
    gameplay: createSunAnchor('gameplay'),
  }

  const celestialMaterialById: Record<SectorCelestialBodyConfig['material'], StandardMaterial> = {
    sun: sunMaterial,
    mercury: mercuryMaterial,
    venus: venusMaterial,
    earth: earthMaterial,
    moon: moonMaterial,
    mars: marsMaterial,
    jupiter: jupiterMaterial,
    saturn: saturnMaterial,
    uranus: uranusMaterial,
    neptune: neptuneMaterial,
    pluto: plutoMaterial,
  }

  interface CelestialBodyRuntime {
    config: SectorCelestialBodyConfig
    mesh: Mesh
    material: StandardMaterial
    orbitPivot: TransformNode | null
    orbitQuaternion: Quaternion | null
  }

  const cloneStandardMaterial = (base: StandardMaterial, cloneName: string): StandardMaterial => {
    const cloned = base.clone(cloneName)
    if (cloned && cloned instanceof StandardMaterial) {
      return cloned
    }
    return base
  }

  const celestialBodies: CelestialBodyRuntime[] = celestialConfig.bodies.map((body) => {
    const mesh = MeshBuilder.CreateSphere(
      `celestial-${body.id}`,
      {
        diameter: body.diameter,
        segments: body.segments,
      },
      scene,
    )
    const material = cloneStandardMaterial(celestialMaterialById[body.material], `celestial-${body.id}-material`)
    material.alpha = 1
    mesh.material = material
    mesh.isPickable = false
    return {
      config: body,
      mesh,
      material,
      orbitPivot: null,
      orbitQuaternion: null,
    }
  })
  const celestialBodyById = new Map(celestialBodies.map((entry) => [entry.config.id, entry] as const))
  const primaryBody = celestialBodyById.get(celestialConfig.primaryBodyId)?.mesh ?? null

  for (const body of celestialBodies) {
    const layerRoot = celestialLayerRoots[body.config.renderMode]
    const anchorParent = body.config.anchor === 'sun'
      ? sunAnchorByLayer[body.config.renderMode]
      : body.config.anchor === 'primary'
        ? primaryBody ?? layerRoot
        : layerRoot

    if (body.config.orbit) {
      const orbitPivot = new TransformNode(`celestial-${body.config.id}-orbit-pivot`, scene)
      orbitPivot.parent = anchorParent
      orbitPivot.position.setAll(0)
      body.orbitPivot = orbitPivot
      body.orbitQuaternion = Quaternion.Identity()
      body.mesh.parent = orbitPivot
    } else {
      body.mesh.parent = anchorParent
    }

    body.mesh.position.copyFrom(toVector3(body.config.offset))
  }

  const sun = celestialBodyById.get('sun')?.mesh ?? null
  const dynamicCollisionBodies: DynamicCollisionBody[] = []
  let lastCelestialUpdateSeconds: number | null = null

  const updateCelestialBodies = (timeMs: number) => {
    const timeSeconds = timeMs / 1000
    const deltaSeconds = lastCelestialUpdateSeconds === null
      ? 1 / 60
      : Math.max(1 / 240, Math.min(0.25, timeSeconds - lastCelestialUpdateSeconds))
    lastCelestialUpdateSeconds = timeSeconds

    if (sun) {
      const sunPulse = 1
        + Math.sin(timeSeconds * celestialConfig.sunVisualPulseFrequency)
          * celestialConfig.sunVisualPulseAmplitude
      sun.scaling.setAll(sunPulse)
    }
    sunLight.intensity = celestialConfig.sunLightBaseIntensity
      + Math.sin(timeSeconds * celestialConfig.sunLightPulseFrequency)
        * celestialConfig.sunLightPulseAmplitude

    for (const body of celestialBodies) {
      if (body.config.orbit && body.orbitPivot && body.orbitQuaternion) {
        const orbitAngle = (timeSeconds / body.config.orbit.periodSeconds) * Math.PI * 2
        Quaternion.RotationYawPitchRollToRef(
          orbitAngle,
          body.config.orbit.pitch,
          0,
          body.orbitQuaternion,
        )
        body.orbitPivot.rotationQuaternion = body.orbitQuaternion
      }
      body.mesh.rotation.y = timeSeconds * body.config.spinRate
    }

    void deltaSeconds
  }
  updateCelestialBodies(performance.now())

  const celestialLabelTargets: CelestialLabelTarget[] = [
    ...celestialBodies.map((body) => ({
      id: body.config.id,
      label: body.config.label,
      node: body.mesh,
    })),
  ]

  const stationMaterial = new StandardMaterial('station-material', scene)
  stationMaterial.diffuseColor = new Color3(0.74, 0.74, 0.74)
  stationMaterial.emissiveColor = new Color3(0.16, 0.16, 0.16)

  const stationChargeRingMaterial = new StandardMaterial('station-charge-ring-material', scene)
  stationChargeRingMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3)
  stationChargeRingMaterial.emissiveColor = new Color3(0.05, 0.05, 0.05)
  stationChargeRingMaterial.alpha = 0.22

  const stationDockRingMaterial = new StandardMaterial('station-dock-ring-material', scene)
  stationDockRingMaterial.diffuseColor = new Color3(0.35, 0.35, 0.35)
  stationDockRingMaterial.emissiveColor = new Color3(0.06, 0.06, 0.06)
  stationDockRingMaterial.alpha = 0.32

  const stationBeaconMaterial = new StandardMaterial('station-beacon-material', scene)
  stationBeaconMaterial.diffuseColor = new Color3(0.42, 0.42, 0.44)
  stationBeaconMaterial.emissiveColor = new Color3(0.11, 0.11, 0.12)
  stationBeaconMaterial.alpha = 0.6

  const stationCore = MeshBuilder.CreateCylinder(
    'solar-station-core',
    { diameter: 7, height: 5, tessellation: 20 },
    scene,
  )
  stationCore.position = new Vector3(0, 0, 0)
  stationCore.material = stationMaterial
  stationCore.isPickable = false

  const stationRing = MeshBuilder.CreateTorus('solar-station-ring', { diameter: 20, thickness: 1.3 }, scene)
  stationRing.rotation.x = Math.PI * 0.5
  stationRing.material = stationMaterial
  stationRing.isPickable = false

  const stationChargeRing = MeshBuilder.CreateTorus(
    'station-charge-range-ring',
    {
      diameter: CHARGING_RANGE_METERS * 2,
      thickness: 1.8,
      tessellation: 100,
    },
    scene,
  )
  stationChargeRing.rotation.x = Math.PI * 0.5
  stationChargeRing.material = stationChargeRingMaterial
  stationChargeRing.isPickable = false

  const stationDockRing = MeshBuilder.CreateTorus(
    'station-dock-ring',
    {
      diameter: STATION_DOCKING_RANGE_METERS * 2,
      thickness: 0.7,
      tessellation: 56,
    },
    scene,
  )
  stationDockRing.rotation.x = Math.PI * 0.5
  stationDockRing.position.y = 0.2
  stationDockRing.material = stationDockRingMaterial
  stationDockRing.isPickable = false

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
  stationBeacon.position = stationCore.position.add(new Vector3(0, 21, 0))
  stationBeacon.material = stationBeaconMaterial
  stationBeacon.isPickable = false

  const stationLight = new PointLight('station-light', stationCore.position.add(new Vector3(0, 8, 0)), scene)
  stationLight.intensity = 0.62
  stationLight.range = 170

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
  portalGate.position = stationCore.position.add(new Vector3(36, 4.6, -22))
  portalGate.rotation.z = Math.PI * 0.5
  portalGate.material = portalMaterial
  portalGate.isPickable = false

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
    asteroids,
    extractionNodes,
    projectiles: [],
    cleanupZones: cleanupWorld.zones,
    celestialLabelTargets,
    dynamicCollisionBodies,
    portalGate,
    portalDestinationSectorId: sector.portalExit,
    worldTargetIds: cleanupWorld.targets.map((target) => target.id),
    spawnAsteroidByTargetId,
    updateCelestialBodies,
    updateThrusterFx,
  }
}
