import { useEffect, useRef } from 'react'
import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  StandardMaterial,
  Vector3,
} from 'babylonjs'

interface ShipInteriorViewportProps {
  inputSuppressed?: boolean
}

export function ShipInteriorViewport({ inputSuppressed = false }: ShipInteriorViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraRef = useRef<ArcRotateCamera | null>(null)
  const inputSuppressedRef = useRef(inputSuppressed)

  useEffect(() => {
    inputSuppressedRef.current = inputSuppressed
    const camera = cameraRef.current
    const canvas = canvasRef.current
    if (!camera || !canvas) {
      return
    }

    if (inputSuppressed) {
      camera.detachControl()
    } else {
      camera.attachControl(canvas, true)
    }
  }, [inputSuppressed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    })
    const scene = new Scene(engine)
    scene.clearColor = new Color4(0.01, 0.01, 0.01, 1)

    const camera = new ArcRotateCamera(
      'interior-camera',
      Math.PI * 0.5,
      Math.PI / 2.2,
      8.4,
      new Vector3(0, 1.5, 0),
      scene,
    )
    camera.lowerRadiusLimit = 6.4
    camera.upperRadiusLimit = 11
    camera.lowerBetaLimit = Math.PI / 3.2
    camera.upperBetaLimit = Math.PI / 1.9
    camera.wheelDeltaPercentage = 0.01
    camera.panningSensibility = 0
    cameraRef.current = camera

    if (inputSuppressedRef.current) {
      camera.detachControl()
    } else {
      camera.attachControl(canvas, true)
    }

    const ambientLight = new HemisphericLight('interior-ambient', new Vector3(0, 1, 0), scene)
    ambientLight.intensity = 0.72
    ambientLight.groundColor = new Color3(0.04, 0.04, 0.05)

    const ceilingLight = new PointLight('interior-ceiling', new Vector3(0, 3.3, -0.2), scene)
    ceilingLight.intensity = 1.1
    ceilingLight.diffuse = new Color3(0.9, 0.92, 0.95)

    const consoleLight = new PointLight('interior-console', new Vector3(0, 1.35, 1.4), scene)
    consoleLight.intensity = 0.85
    consoleLight.diffuse = new Color3(0.47, 0.94, 0)

    const shellMaterial = new StandardMaterial('interior-shell-material', scene)
    shellMaterial.diffuseColor = new Color3(0.18, 0.19, 0.21)
    shellMaterial.emissiveColor = new Color3(0.05, 0.05, 0.06)

    const floorMaterial = new StandardMaterial('interior-floor-material', scene)
    floorMaterial.diffuseColor = new Color3(0.11, 0.11, 0.12)
    floorMaterial.emissiveColor = new Color3(0.03, 0.03, 0.03)

    const trimMaterial = new StandardMaterial('interior-trim-material', scene)
    trimMaterial.diffuseColor = new Color3(0.31, 0.32, 0.34)
    trimMaterial.emissiveColor = new Color3(0.08, 0.08, 0.09)

    const glowMaterial = new StandardMaterial('interior-glow-material', scene)
    glowMaterial.diffuseColor = new Color3(0.47, 0.94, 0)
    glowMaterial.emissiveColor = new Color3(0.47, 0.94, 0)

    const interiorShell = MeshBuilder.CreateBox(
      'interior-shell',
      {
        width: 11,
        height: 4.2,
        depth: 14.5,
        sideOrientation: Mesh.BACKSIDE,
      },
      scene,
    )
    interiorShell.position = new Vector3(0, 1.75, 0)
    interiorShell.material = shellMaterial

    const floor = MeshBuilder.CreateGround('interior-floor', { width: 10.6, height: 13.8 }, scene)
    floor.position.y = -0.33
    floor.material = floorMaterial

    const frontConsole = MeshBuilder.CreateBox(
      'interior-console-front',
      {
        width: 3.4,
        height: 1.05,
        depth: 1.4,
      },
      scene,
    )
    frontConsole.position = new Vector3(0, 0.52, 2.7)
    frontConsole.material = trimMaterial

    const centerConsole = MeshBuilder.CreateBox(
      'interior-console-center',
      {
        width: 1.3,
        height: 0.9,
        depth: 2.3,
      },
      scene,
    )
    centerConsole.position = new Vector3(0, 0.32, 1.2)
    centerConsole.material = trimMaterial

    const leftSeat = MeshBuilder.CreateBox('interior-seat-left', { width: 1.1, height: 1.2, depth: 1.1 }, scene)
    leftSeat.position = new Vector3(-1.45, 0.28, 0.55)
    leftSeat.material = trimMaterial

    const rightSeat = MeshBuilder.CreateBox('interior-seat-right', { width: 1.1, height: 1.2, depth: 1.1 }, scene)
    rightSeat.position = new Vector3(1.45, 0.28, 0.55)
    rightSeat.material = trimMaterial

    const navDisplay = MeshBuilder.CreatePlane('interior-nav-display', { width: 2.25, height: 1.05 }, scene)
    navDisplay.position = new Vector3(0, 1.1, 2.05)
    navDisplay.material = glowMaterial

    const hologram = MeshBuilder.CreateSphere(
      'interior-hologram',
      {
        diameter: 0.42,
        segments: 16,
      },
      scene,
    )
    hologram.position = new Vector3(0, 1.08, 0.5)
    hologram.material = glowMaterial

    const sideRailLeft = MeshBuilder.CreateBox('interior-rail-left', { width: 0.2, height: 0.2, depth: 3.6 }, scene)
    sideRailLeft.position = new Vector3(-2.35, 0.1, 0.1)
    sideRailLeft.material = trimMaterial

    const sideRailRight = MeshBuilder.CreateBox('interior-rail-right', { width: 0.2, height: 0.2, depth: 3.6 }, scene)
    sideRailRight.position = new Vector3(2.35, 0.1, 0.1)
    sideRailRight.material = trimMaterial

    const viewportFrame = MeshBuilder.CreateBox('interior-window-frame', { width: 4.4, height: 1.65, depth: 0.22 }, scene)
    viewportFrame.position = new Vector3(0, 2.1, 5.05)
    viewportFrame.material = trimMaterial

    const viewportGlow = MeshBuilder.CreatePlane('interior-window-glow', { width: 3.8, height: 1.18 }, scene)
    viewportGlow.position = new Vector3(0, 2.06, 4.92)
    viewportGlow.material = glowMaterial

    scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001
      hologram.rotation.y += 0.011
      hologram.scaling.y = 0.84 + Math.sin(t * 2.2) * 0.06
      consoleLight.intensity = 0.72 + (Math.sin(t * 3.2) * 0.5 + 0.5) * 0.28
    })

    engine.runRenderLoop(() => {
      scene.render()
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
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      camera.detachControl()
      cameraRef.current = null
      scene.dispose()
      engine.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="h-full w-full" />
}
