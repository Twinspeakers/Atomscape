import { useEffect, useRef } from 'react'
import { CLEANUP_ZONES } from '@domain/spec/worldSpec'
import type { RadarContact } from '@state/types'
import { useAppStore } from '@state/store'

function targetRiskFillColor(riskRating?: number): string {
  const risk = typeof riskRating === 'number' ? riskRating : 0
  if (risk >= 0.75) {
    return '#f59e0b'
  }

  if (risk >= 0.55) {
    return '#facc15'
  }

  return '#f8fafc'
}

function RadarCanvas({ contacts }: { contacts: RadarContact[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const size = 192
    canvas.width = size
    canvas.height = size

    context.clearRect(0, 0, size, size)
    context.fillStyle = '#050505'
    context.fillRect(0, 0, size, size)

    context.strokeStyle = 'rgba(226, 232, 240, 0.55)'
    context.lineWidth = 1
    context.beginPath()
    context.arc(size / 2, size / 2, 70, 0, Math.PI * 2)
    context.stroke()

    context.beginPath()
    context.arc(size / 2, size / 2, 46, 0, Math.PI * 2)
    context.stroke()

    context.fillStyle = '#e2e8f0'
    context.beginPath()
    context.arc(size / 2, size / 2, 4, 0, Math.PI * 2)
    context.fill()

    contacts.forEach((contact) => {
      const x = size / 2 + contact.x * 68
      const y = size / 2 + contact.z * 68
      if (contact.contactRole === 'node') {
        const halfSize = 3.7
        context.fillStyle = 'rgba(120, 239, 0, 0.3)'
        context.fillRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2)
        context.strokeStyle = '#78ef00'
        context.lineWidth = 1.2
        context.strokeRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2)
        return
      }

      const riskScale = typeof contact.riskRating === 'number'
        ? Math.max(0, Math.min(1, contact.riskRating))
        : 0.5
      const dotRadius = 2.2 + riskScale * 1.4
      context.fillStyle = targetRiskFillColor(contact.riskRating)
      context.beginPath()
      context.arc(x, y, dotRadius, 0, Math.PI * 2)
      context.fill()
    })
  }, [contacts])

  return <canvas ref={canvasRef} className="h-[192px] w-[192px] rounded-lg bg-slate-950/80" />
}

export function HudPanel() {
  const contacts = useAppStore((state) => state.radarContacts)
  const activeCleanupZoneId = useAppStore((state) => state.activeCleanupZoneId)
  const nodeContacts = contacts.filter((contact) => contact.contactRole === 'node')
  const targetContacts = contacts.filter((contact) => contact.contactRole !== 'node')
  const asteroidCount = targetContacts.filter((contact) => contact.targetKind !== 'spaceJunk').length
  const junkCount = targetContacts.filter((contact) => contact.targetKind === 'spaceJunk').length
  const nearestNode = nodeContacts.reduce<RadarContact | null>((nearest, contact) => {
    if (!nearest || contact.distance < nearest.distance) {
      return contact
    }
    return nearest
  }, null)
  const nearestNodeLabel = nearestNode?.targetClassLabel ?? nearestNode?.targetKindLabel ?? 'Extraction Node'
  const nearestNodeDistance = nearestNode?.distance ?? null
  const nearestNodeInRange = nearestNodeDistance !== null && nearestNodeDistance <= 22
  const activeZoneLabel =
    CLEANUP_ZONES.find((zone) => zone.id === activeCleanupZoneId)?.label ?? 'Transit'

  return (
    <div className="ui-stack-sm flex flex-col">
      <div className="ui-surface-card-strong flex justify-center">
        <RadarCanvas contacts={contacts} />
      </div>
      <div className="ui-surface-card ui-stack-xs">
        <p className="ui-subtitle">{contacts.length} contacts in range</p>
        <p className="ui-note">Targets: {targetContacts.length} | Nodes: {nodeContacts.length}</p>
        <p className="ui-note">Asteroids: {asteroidCount} | Junk: {junkCount}</p>
        {nearestNode ? (
          <p className="ui-note">
            Nearest node: {nearestNodeLabel} ({nearestNodeDistance?.toFixed(1)} m)
            {nearestNodeInRange ? (
              <span className="ml-1 text-[#78ef00]">IN RANGE</span>
            ) : null}
          </p>
        ) : (
          <p className="ui-note">Nearest node: none in radar range</p>
        )}
        <p className="ui-note">Zone: {activeZoneLabel}</p>
      </div>
    </div>
  )
}

