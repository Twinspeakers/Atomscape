function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export interface ViewportInputController {
  pressedKeys: Set<string>
  steeringInput: { x: number; y: number }
  resetInputs: () => void
  dispose: () => void
}

interface ViewportInputControllerConfig {
  canvas: HTMLCanvasElement
  inputSuppressedRef: { current: boolean }
  onPickAsteroidAtClientPoint: (clientX: number, clientY: number) => void
}

export function createViewportInputController({
  canvas,
  inputSuppressedRef,
  onPickAsteroidAtClientPoint,
}: ViewportInputControllerConfig): ViewportInputController {
  const pressedKeys = new Set<string>()
  const steeringInput = { x: 0, y: 0 }

  const resetInputs = () => {
    pressedKeys.clear()
    steeringInput.x = 0
    steeringInput.y = 0
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (inputSuppressedRef.current) {
      return
    }

    pressedKeys.add(event.code)
  }

  const handleKeyUp = (event: KeyboardEvent) => {
    pressedKeys.delete(event.code)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (inputSuppressedRef.current) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      return
    }

    const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1

    steeringInput.x = clamp(normalizedX, -1, 1)
    steeringInput.y = clamp(normalizedY, -1, 1)
  }

  const handlePointerLeave = () => {
    steeringInput.x = 0
    steeringInput.y = 0
  }

  const handleCanvasClick = (event: MouseEvent) => {
    if (event.button !== 0) {
      return
    }

    if (inputSuppressedRef.current) {
      return
    }

    onPickAsteroidAtClientPoint(event.clientX, event.clientY)
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  canvas.addEventListener('pointermove', handlePointerMove)
  canvas.addEventListener('pointerleave', handlePointerLeave)
  canvas.addEventListener('click', handleCanvasClick)

  const dispose = () => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    canvas.removeEventListener('pointermove', handlePointerMove)
    canvas.removeEventListener('pointerleave', handlePointerLeave)
    canvas.removeEventListener('click', handleCanvasClick)
  }

  return {
    pressedKeys,
    steeringInput,
    resetInputs,
    dispose,
  }
}
