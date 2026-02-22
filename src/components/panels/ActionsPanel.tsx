import {
  CREW_MEMBER_MEALS_PER_DAY,
  CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER,
  CREW_MEMBER_WATER_LITERS_PER_DAY_BASE,
} from '@domain/spec/gameSpec'
import type { SimulationLogEntry } from '@state/types'
import { useAppStore } from '@state/store'

interface ImportantAction {
  id: number
  message: string
  tone: 'info' | 'warning'
  timestamp: number
}

interface ActionFeedItem {
  id: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: number
}

function durationLabelFromDays(days: number): string {
  if (!Number.isFinite(days) || days <= 0) {
    return '0m'
  }

  const totalMinutes = Math.max(0, Math.floor(days * 24 * 60))
  const durationDays = Math.floor(totalMinutes / (24 * 60))
  const durationHours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const durationMinutes = totalMinutes % 60
  return `${durationDays}d ${durationHours}h ${durationMinutes}m`
}

function classifyImportantAction(entry: SimulationLogEntry): ImportantAction | null {
  const message = entry.message
  const importantMatchers = [
    /is having (breakfast|lunch|dinner)/i,
    /drinks 0\.25 L water/i,
    /charging/i,
    /containment/i,
    /dehydration/i,
    /starving/i,
    /emergency reset/i,
    /fridge loaded/i,
    /hull impact detected/i,
    /collision/i,
  ]
  const isImportant = importantMatchers.some((matcher) => matcher.test(message))
  if (!isImportant) {
    return null
  }

  if (/hull impact detected/i.test(message)) {
    const tone: 'info' | 'warning' = /flight boundary/i.test(message) ? 'info' : 'warning'
    return {
      id: entry.id,
      message,
      tone,
      timestamp: entry.timestamp,
    }
  }

  const warningMatchers = [
    /warning/i,
    /blocked/i,
    /stopped/i,
    /starving/i,
    /dehydration/i,
    /emergency/i,
    /failed/i,
    /impact/i,
    /collision/i,
  ]
  const tone: 'info' | 'warning' =
    warningMatchers.some((matcher) => matcher.test(message))
      ? 'warning'
      : 'info'

  return {
    id: entry.id,
    message,
    tone,
    timestamp: entry.timestamp,
  }
}

export function ActionsPanel() {
  const energy = useAppStore((state) => state.energy)
  const maxEnergy = useAppStore((state) => state.maxEnergy)
  const charging = useAppStore((state) => state.charging)
  const crewMembers = useAppStore((state) => state.crewMembers)
  const crewMetrics = useAppStore((state) => state.crewAggregateMetrics)
  const inventory = useAppStore((state) => state.inventory)
  const fridge = useAppStore((state) => state.fridge)
  const simulationSummary = useAppStore((state) => state.simulationSummary)
  const simulationLog = useAppStore((state) => state.simulationLog)

  const importantActions = simulationLog
    .map(classifyImportantAction)
    .filter((entry): entry is ImportantAction => Boolean(entry))
    .slice(0, 6)
  const fallbackTimestamp = importantActions[0]?.timestamp ?? simulationLog[0]?.timestamp ?? 0

  const totalGalaxyBars = (inventory.galaxyBar ?? 0) + (fridge.unlocked ? fridge.galaxyBars : 0)
  const totalWaterLiters = (inventory.water ?? 0) + (fridge.unlocked ? (fridge.waterLiters ?? 0) : 0)
  const crewCount = Math.max(1, crewMembers.length)
  const barsPerDay = Math.max(1, crewCount * CREW_MEMBER_MEALS_PER_DAY)
  const waterLitersPerDay = Math.max(
    0.0001,
    crewCount * CREW_MEMBER_WATER_LITERS_PER_DAY_BASE * CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER,
  )
  const barsDuration = durationLabelFromDays(totalGalaxyBars / barsPerDay)
  const waterDuration = durationLabelFromDays(totalWaterLiters / waterLitersPerDay)
  const barsDaysRemaining = totalGalaxyBars / barsPerDay
  const waterDaysRemaining = totalWaterLiters / waterLitersPerDay
  const warningFeed: ActionFeedItem[] = []
  if (crewMetrics.starvingCount > 0 || crewMetrics.dehydratedCount > 0) {
    warningFeed.push({
      id: 'warning-crew-health',
      message: `Crew health alert: ${crewMetrics.starvingCount} starving / ${crewMetrics.dehydratedCount} dehydrated.`,
      severity: 'critical',
      timestamp: fallbackTimestamp,
    })
  }
  if (barsDaysRemaining <= 1) {
    warningFeed.push({
      id: 'warning-bars-low',
      message: `You have ${totalGalaxyBars.toFixed(1)} Galaxy Bars left (${barsDuration} until empty).`,
      severity: barsDaysRemaining <= 0.25 ? 'critical' : 'warning',
      timestamp: fallbackTimestamp,
    })
  }
  if (waterDaysRemaining <= 1) {
    warningFeed.push({
      id: 'warning-water-low',
      message: `Water reserve low: ${totalWaterLiters.toFixed(2)} L (${waterDuration} until empty).`,
      severity: waterDaysRemaining <= 0.25 ? 'critical' : 'warning',
      timestamp: fallbackTimestamp,
    })
  }
  if (!charging && !simulationSummary.inRange && energy < maxEnergy * 0.25) {
    warningFeed.push({
      id: 'warning-energy-low',
      message: 'Energy is low while outside charging range. Return to station or dock soon.',
      severity: 'warning',
      timestamp: fallbackTimestamp,
    })
  }

  const actionFeed: ActionFeedItem[] = importantActions.map((entry) => ({
    id: `action-${entry.id}`,
    message: `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.message}`,
    severity: entry.tone === 'warning' ? 'warning' : 'info',
    timestamp: entry.timestamp,
  }))

  const severityRank: Record<ActionFeedItem['severity'], number> = {
    critical: 3,
    warning: 2,
    info: 1,
  }
  const feedItems = [...warningFeed, ...actionFeed]
    .sort((a, b) => {
      if (severityRank[a.severity] !== severityRank[b.severity]) {
        return severityRank[b.severity] - severityRank[a.severity]
      }

      return b.timestamp - a.timestamp
    })
    .slice(0, 10)

  const rowClass = (severity: ActionFeedItem['severity']): string => {
    if (severity === 'critical') {
      return 'ui-note rounded-md bg-amber-500/18 px-2 py-1 text-amber-100'
    }

    if (severity === 'warning') {
      return 'ui-note rounded-md bg-amber-400/12 px-2 py-1 text-amber-200'
    }

    return 'ui-note rounded-md bg-slate-900/35 px-2 py-1 text-slate-100'
  }

  return (
    <div className="ui-stack-sm">
      <div className="ui-surface-card-strong ui-stack-xs">
        {feedItems.length === 0 && (
          <p className="ui-note text-slate-100">No high-priority updates right now.</p>
        )}
        {feedItems.map((item) => (
          <p key={item.id} className={rowClass(item.severity)}>
            {item.message}
          </p>
        ))}
      </div>
    </div>
  )
}

