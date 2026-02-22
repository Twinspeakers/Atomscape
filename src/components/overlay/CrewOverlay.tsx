import { useId, useMemo, useState } from 'react'
import {
  CREW_SLEEP_CYCLE_HOURS,
  CREW_SLEEP_WINDOW_HOURS,
  CREW_DEHYDRATED_THRESHOLD,
  CREW_MEMBER_MEALS_PER_DAY,
  CREW_MEMBER_GALAXY_BAR_HUNGER_RESTORE,
  CREW_MEMBER_WATER_DRINK_COST_L,
  CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER,
  CREW_MEMBER_WATER_HYDRATION_RESTORE,
  CREW_MEMBER_WATER_LITERS_PER_DAY_BASE,
  CREW_STARVING_THRESHOLD,
  FRIDGE_DEFAULT_WATER_CAPACITY_LITERS,
} from '@domain/spec/gameSpec'
import type { SimulationLogEntry } from '@state/types'
import { formatQty } from '@domain/resources/resourceCatalog'
import { useAppStore } from '@state/store'

interface CrewOverlayProps {
  embedded?: boolean
}

const CREW_STORAGE_LABEL = 'Refrigerated Stores'
const CREW_STORAGE_LABEL_LOWER = 'refrigerated stores'

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function metricBarClass(kind: 'hunger' | 'thirst' | 'debuff'): string {
  if (kind === 'hunger') {
    return 'bg-emerald-300/85'
  }

  if (kind === 'thirst') {
    return 'bg-cyan-300/85'
  }

  return 'bg-amber-300/85'
}

function metricLabelClass(value: number, kind: 'hunger' | 'thirst' | 'debuff'): string {
  if (kind === 'debuff') {
    return value > 0 ? 'text-amber-300' : 'text-slate-200'
  }

  return value <= 25 ? 'text-amber-300' : 'text-slate-200'
}

function crewInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function cycleHourLabel(hour: number): string {
  const normalizedHour =
    ((Math.floor(hour) % CREW_SLEEP_CYCLE_HOURS) + CREW_SLEEP_CYCLE_HOURS) % CREW_SLEEP_CYCLE_HOURS
  return `${normalizedHour.toString().padStart(2, '0')}:00`
}

function sleepWindowLabel(shiftStartHour: number): string {
  const shiftEndHour = (shiftStartHour + CREW_SLEEP_WINDOW_HOURS) % CREW_SLEEP_CYCLE_HOURS
  return `${cycleHourLabel(shiftStartHour)} - ${cycleHourLabel(shiftEndHour)}`
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

function isCrewActivityEntry(message: string): boolean {
  const matchers = [
    /crew/i,
    /galaxy bar/i,
    /fridge/i,
    /breakfast|lunch|dinner/i,
    /water/i,
    /starving|dehydrated/i,
  ]
  return matchers.some((matcher) => matcher.test(message))
}

function activityTone(entry: SimulationLogEntry): 'critical' | 'warning' | 'info' {
  const criticalMatchers = [/critical/i, /starving/i, /dehydrated/i, /emergency/i]
  if (criticalMatchers.some((matcher) => matcher.test(entry.message))) {
    return 'critical'
  }

  const warningMatchers = [/warning/i, /blocked/i, /stopped/i, /low/i]
  if (warningMatchers.some((matcher) => matcher.test(entry.message))) {
    return 'warning'
  }

  return 'info'
}

function activityToneClass(tone: 'critical' | 'warning' | 'info'): string {
  if (tone === 'critical') {
    return 'ui-note rounded-md px-2 py-1 text-amber-200'
  }

  if (tone === 'warning') {
    return 'ui-note rounded-md px-2 py-1 text-amber-300'
  }

  return 'ui-note rounded-md px-2 py-1 text-slate-100'
}

function themeStorageText(message: string): string {
  return message
    .replace(/\bFridge\b/g, CREW_STORAGE_LABEL)
    .replace(/\bfridge\b/g, CREW_STORAGE_LABEL_LOWER)
}

export function CrewOverlay({ embedded = false }: CrewOverlayProps) {
  const crewMembers = useAppStore((state) => state.crewMembers)
  const crewMetrics = useAppStore((state) => state.crewAggregateMetrics)
  const crewStatus = useAppStore((state) => state.crewStatus)
  const waterAutomationEnabled = useAppStore((state) => state.waterAutomationEnabled)
  const fridge = useAppStore((state) => state.fridge)
  const inventory = useAppStore((state) => state.inventory)
  const crewFeedsDelivered = useAppStore((state) => state.crewFeedsDelivered)
  const setFoodAutomationEnabled = useAppStore((state) => state.setFoodAutomationEnabled)
  const setWaterAutomationEnabled = useAppStore((state) => state.setWaterAutomationEnabled)
  const feedCrewGalaxyBar = useAppStore((state) => state.feedCrewGalaxyBar)
  const loadFridgeWater = useAppStore((state) => state.loadFridgeWater)
  const loadFridgeGalaxyBars = useAppStore((state) => state.loadFridgeGalaxyBars)
  const simulationLog = useAppStore((state) => state.simulationLog)
  const [waterTransferInput, setWaterTransferInput] = useState('1')
  const [barTransferInput, setBarTransferInput] = useState('1')
  const [activeCrewId, setActiveCrewId] = useState<string | null>(null)
  const [showReference, setShowReference] = useState(false)
  const [showActivity, setShowActivity] = useState(true)

  const shellClass = embedded
    ? 'panel-shell flex h-full min-h-0 flex-col rounded-xl p-3.5'
    : 'panel-shell pointer-events-auto absolute right-0 top-0 h-full w-[clamp(380px,34vw,620px)] rounded-l-xl px-4 py-4'
  const contentClass = embedded
    ? 'ui-content-scroll min-h-0 flex-1 overflow-auto'
    : 'ui-content-scroll h-[calc(100%-186px)] overflow-auto'

  const availableCargoGalaxyBars = inventory.galaxyBar ?? 0
  const availableFridgeGalaxyBars = fridge.unlocked ? fridge.galaxyBars : 0
  const availableGalaxyBars = availableCargoGalaxyBars + availableFridgeGalaxyBars
  const fridgeBarCapacity = Math.max(1, Number.isFinite(fridge.capacity) ? fridge.capacity : 0)
  const fridgeBarCount = Math.max(0, Math.min(fridgeBarCapacity, Number.isFinite(availableFridgeGalaxyBars) ? availableFridgeGalaxyBars : 0))
  const availableWaterLiters = inventory.water ?? 0
  const fridgeWaterCapacityLiters = Math.max(1, fridge.waterCapacityLiters ?? FRIDGE_DEFAULT_WATER_CAPACITY_LITERS)
  const fridgeWaterLiters = Math.max(0, Math.min(fridgeWaterCapacityLiters, fridge.waterLiters ?? 0))
  const fridgeWaterRemainingLiters = Math.max(0, fridgeWaterCapacityLiters - fridgeWaterLiters)
  const totalWaterLiters = availableWaterLiters + (fridge.unlocked ? fridgeWaterLiters : 0)

  const requestedWaterTransferLiters = useMemo(() => {
    const parsed = Number(waterTransferInput)
    if (!Number.isFinite(parsed)) {
      return 0
    }

    return Math.max(0, parsed)
  }, [waterTransferInput])

  const requestedBarTransferCount = useMemo(() => {
    const parsed = Number(barTransferInput)
    if (!Number.isFinite(parsed)) {
      return 0
    }

    return Math.max(0, Math.floor(parsed))
  }, [barTransferInput])

  const lowestHungerCrewMember = crewMembers.reduce<(typeof crewMembers)[number] | null>(
    (lowest, member) => {
      if (!lowest) {
        return member
      }

      return member.hunger < lowest.hunger ? member : lowest
    },
    null,
  )

  const statusTone: 'stable' | 'warning' | 'critical' =
    crewMetrics.starvingCount > 0 || crewMetrics.dehydratedCount > 0
      ? 'critical'
      : crewMetrics.averageHunger <= 40 || crewMetrics.averageThirst <= 40 || crewMetrics.averageDebuff >= 20
        ? 'warning'
        : 'stable'

  const statusLabel =
    statusTone === 'critical'
      ? 'Critical'
      : statusTone === 'warning'
        ? 'Watch'
        : 'Stable'

  const statusClass =
    statusTone === 'critical'
      ? 'bg-amber-500/20 text-amber-200'
      : statusTone === 'warning'
        ? 'bg-slate-700/45 text-slate-100'
        : 'bg-slate-900/55 text-slate-200'

  const manualFeedBlockedMessage =
    availableGalaxyBars >= 1
      ? null
      : `Blocked: need at least 1 Galaxy Bar in cargo or ${CREW_STORAGE_LABEL_LOWER}.`

  const manualFeedTargetMessage =
    availableGalaxyBars >= 1 && lowestHungerCrewMember
      ? `Manual feed targets ${lowestHungerCrewMember.name} first (lowest hunger).`
      : null

  const fridgeFillPercent = clampPercent((fridgeBarCount / fridgeBarCapacity) * 100)
  const fridgeFillWidth =
    fridgeFillPercent > 0 ? `max(${fridgeFillPercent}%, 2px)` : '0%'
  const fridgeWaterFillPercent = fridgeWaterCapacityLiters > 0
    ? clampPercent((fridgeWaterLiters / fridgeWaterCapacityLiters) * 100)
    : 0

  const starvingOrDehydratedCount = crewMetrics.starvingCount + crewMetrics.dehydratedCount
  const crewCount = Math.max(1, crewMembers.length)
  const barsPerDay = Math.max(1, crewCount * CREW_MEMBER_MEALS_PER_DAY)
  const waterLitersPerDay = Math.max(
    0.0001,
    crewCount * CREW_MEMBER_WATER_LITERS_PER_DAY_BASE * CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER,
  )
  const barReserveDays = availableGalaxyBars / barsPerDay
  const waterReserveDays = totalWaterLiters / waterLitersPerDay
  const barReserveLabel = durationLabelFromDays(barReserveDays)
  const waterReserveLabel = durationLabelFromDays(waterReserveDays)
  const crewDailyWaterEvents = Math.max(
    1,
    Math.round(
      (CREW_MEMBER_WATER_LITERS_PER_DAY_BASE * CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER)
      / CREW_MEMBER_WATER_DRINK_COST_L,
    ),
  )
  const canTransferWaterToFridge =
    fridge.unlocked &&
    requestedWaterTransferLiters > 0 &&
    availableWaterLiters > 0 &&
    fridgeWaterRemainingLiters > 0
  const canTransferBarsToFridge =
    fridge.unlocked &&
    requestedBarTransferCount > 0 &&
    availableCargoGalaxyBars > 0 &&
    fridgeBarCount < fridgeBarCapacity

  const activeCrewMember = crewMembers.find((member) => member.id === activeCrewId) ?? crewMembers[0] ?? null
  const sectionIdPrefix = useId().replace(/:/g, '')
  const summarySectionId = `${sectionIdPrefix}-summary`
  const rosterSectionId = `${sectionIdPrefix}-roster`
  const suppliesSectionId = `${sectionIdPrefix}-supplies`
  const activitySectionId = `${sectionIdPrefix}-activity`

  const crewActivityFeed = useMemo(() => {
    return simulationLog
      .filter((entry) => isCrewActivityEntry(entry.message))
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 12)
  }, [simulationLog])

  const jumpToSection = (sectionId: string): void => {
    if (typeof document === 'undefined') {
      return
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const reserveClass = (days: number): string => {
    if (days <= 0.25) {
      return 'text-amber-300'
    }

    if (days <= 1) {
      return 'text-slate-100'
    }

    return 'text-slate-200'
  }

  return (
    <aside className={`${shellClass} ui-stack-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="ui-stack-xs">
          <h2 className="ui-title">Crew</h2>
          <p className="ui-subtitle">Life-support status, supplies, and automation controls.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`ui-status-tag ${statusClass}`}>{statusLabel}</span>
          <span className="ui-status-tag bg-slate-900/60 text-slate-200">
            Awake {crewMetrics.awakeCount}/{crewMembers.length}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => jumpToSection(summarySectionId)} className="ui-action-button-sm">
          Summary
        </button>
        <button onClick={() => jumpToSection(rosterSectionId)} className="ui-action-button-sm">
          Roster
        </button>
        <button onClick={() => jumpToSection(suppliesSectionId)} className="ui-action-button-sm">
          Supplies
        </button>
        <button onClick={() => jumpToSection(activitySectionId)} className="ui-action-button-sm">
          Activity
        </button>
      </div>

      <div className={contentClass}>
        <div className="ui-stack-md">
          <section id={summarySectionId} className="ui-surface-card ui-stack-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="ui-label">Summary</p>
              <p className="ui-note">
                Critical thresholds: {CREW_STARVING_THRESHOLD}% hunger, {CREW_DEHYDRATED_THRESHOLD}% thirst.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">Crew State</p>
                <p className={`ui-title ${statusTone === 'critical' ? 'text-amber-300' : 'text-slate-100'}`}>
                  {statusLabel}
                </p>
              </div>
              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">Crew Awake</p>
                <p className="ui-title">
                  {crewMetrics.awakeCount}/{crewMembers.length}
                </p>
              </div>
              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">Avg Hunger</p>
                <p className={`ui-title ${metricLabelClass(crewMetrics.averageHunger, 'hunger')}`}>
                  {crewMetrics.averageHunger.toFixed(1)}%
                </p>
                <div className="h-1.5 overflow-hidden rounded bg-slate-900/80">
                  <div
                    className={`h-full transition-all ${metricBarClass('hunger')}`}
                    style={{ width: `${clampPercent(crewMetrics.averageHunger)}%` }}
                  />
                </div>
              </div>
              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">Avg Thirst</p>
                <p className={`ui-title ${metricLabelClass(crewMetrics.averageThirst, 'thirst')}`}>
                  {crewMetrics.averageThirst.toFixed(1)}%
                </p>
                <div className="h-1.5 overflow-hidden rounded bg-slate-900/80">
                  <div
                    className={`h-full transition-all ${metricBarClass('thirst')}`}
                    style={{ width: `${clampPercent(crewMetrics.averageThirst)}%` }}
                  />
                </div>
              </div>
              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">Reserve Window</p>
                <p className={`ui-title ${reserveClass(barReserveDays)}`}>{barReserveLabel}</p>
                <p className={`ui-note ${reserveClass(waterReserveDays)}`}>Water {waterReserveLabel}</p>
                <p className={`ui-note ${starvingOrDehydratedCount > 0 ? 'text-amber-300' : 'text-slate-200'}`}>
                  Alerts {starvingOrDehydratedCount}
                </p>
              </div>
            </div>
          </section>

          {!fridge.unlocked && (
          <section className="ui-surface-card ui-stack-sm">
            <p className="ui-label">Operations</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">Food Automation</p>
                <button
                  onClick={() => setFoodAutomationEnabled(!crewStatus.foodAutomationEnabled)}
                  className="ui-action-button-sm"
                >
                  {crewStatus.foodAutomationEnabled ? 'Disable' : 'Enable'}
                </button>
                <p className="ui-note">
                  Status: {crewStatus.foodAutomationEnabled ? 'On' : 'Off'}
                </p>
              </div>

              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">Water Automation</p>
                <button
                  onClick={() => setWaterAutomationEnabled(!waterAutomationEnabled)}
                  className="ui-action-button-sm"
                >
                  {waterAutomationEnabled ? 'Disable' : 'Enable'}
                </button>
                <p className="ui-note">
                  Status: {waterAutomationEnabled ? 'On' : 'Off'}
                </p>
              </div>

              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">Manual Feed</p>
                <button
                  onClick={availableGalaxyBars >= 1 ? feedCrewGalaxyBar : undefined}
                  disabled={availableGalaxyBars < 1}
                  className={
                    availableGalaxyBars >= 1
                      ? 'ui-action-button-sm'
                      : 'ui-action-button-sm cursor-not-allowed'
                  }
                >
                  Feed 1 Galaxy Bar
                </button>
                {manualFeedBlockedMessage && (
                  <p className="ui-note text-amber-300">{manualFeedBlockedMessage}</p>
                )}
                {manualFeedTargetMessage && <p className="ui-note">{manualFeedTargetMessage}</p>}
              </div>
            </div>

            <div className="ui-stack-xs">
              <button
                onClick={() => setShowReference((current) => !current)}
                className="ui-action-button-sm"
              >
                {showReference ? 'Hide Runtime Reference' : 'Show Runtime Reference'}
              </button>
              {showReference && (
                <div className="ui-surface-card-strong ui-stack-xs">
                  <p className="ui-note">
                    Daily meals: {CREW_MEMBER_MEALS_PER_DAY} per crew member.
                  </p>
                  <p className="ui-note">
                    Manual feed restore: +{CREW_MEMBER_GALAXY_BAR_HUNGER_RESTORE.toFixed(1)} hunger.
                  </p>
                  <p className="ui-note">
                    Water demand: {(CREW_MEMBER_WATER_LITERS_PER_DAY_BASE * CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER).toFixed(2)} L/day per crew member.
                  </p>
                  <p className="ui-note">
                    Hydration event: {CREW_MEMBER_WATER_DRINK_COST_L.toFixed(2)} L gives +{CREW_MEMBER_WATER_HYDRATION_RESTORE.toFixed(0)} thirst.
                  </p>
                  <p className="ui-note">
                    Manual feeds delivered: {crewFeedsDelivered}.
                  </p>
                </div>
              )}
            </div>
          </section>
          )}

          <section id={suppliesSectionId} className="ui-surface-card ui-stack-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="ui-label">Supplies and Reserves</p>
              <span className={`ui-status-tag ${fridge.unlocked ? 'bg-slate-700/40 text-slate-100' : 'bg-slate-900/40 text-slate-300'}`}>
                {CREW_STORAGE_LABEL} {fridge.unlocked ? 'Unlocked' : 'Locked'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">Galaxy Bars Ready</p>
                <p className="ui-title">{formatQty(availableGalaxyBars)}</p>
                <p className="ui-note">Reserve {barReserveLabel}</p>
              </div>
              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">Water Ready</p>
                <p className="ui-title">{formatQty(totalWaterLiters)} L</p>
                <p className="ui-note">Reserve {waterReserveLabel}</p>
              </div>
              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">{CREW_STORAGE_LABEL} Bars</p>
                <p className={`ui-title ${reserveClass(barReserveDays)}`}>
                  {formatQty(fridgeBarCount)} / {formatQty(fridgeBarCapacity)}
                </p>
              </div>
              <div className="ui-surface-card-strong ui-stack-xs">
                <p className="ui-note">{CREW_STORAGE_LABEL} Water</p>
                <p className={`ui-title ${reserveClass(waterReserveDays)}`}>
                  {formatQty(fridgeWaterLiters)} L / {formatQty(fridgeWaterCapacityLiters)} L
                </p>
              </div>
            </div>

            {fridge.unlocked && (
              <div className="ui-surface-card-strong ui-stack-sm">
                <p className="ui-note">Load Supplies Into {CREW_STORAGE_LABEL}</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="ui-stack-xs">
                    <label className="ui-note" htmlFor="fridge-bar-transfer-input">
                      Galaxy Bars To Move
                    </label>
                    <input
                      id="fridge-bar-transfer-input"
                      type="number"
                      min={1}
                      step={1}
                      value={barTransferInput}
                      onChange={(event) => setBarTransferInput(event.target.value)}
                      className="ui-input-field"
                    />
                    <button
                      onClick={canTransferBarsToFridge ? () => loadFridgeGalaxyBars(requestedBarTransferCount) : undefined}
                      disabled={!canTransferBarsToFridge}
                      className={canTransferBarsToFridge ? 'ui-action-button-sm' : 'ui-action-button-sm cursor-not-allowed'}
                    >
                      Add Bars To {CREW_STORAGE_LABEL}
                    </button>
                    {!canTransferBarsToFridge && (
                      <p className="ui-note text-amber-300">
                        Need cargo bars and {CREW_STORAGE_LABEL_LOWER} bar capacity.
                      </p>
                    )}
                  </div>

                  <div className="ui-stack-xs">
                    <label className="ui-note" htmlFor="fridge-water-transfer-input">
                      Water Liters To Move
                    </label>
                    <input
                      id="fridge-water-transfer-input"
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={waterTransferInput}
                      onChange={(event) => setWaterTransferInput(event.target.value)}
                      className="ui-input-field"
                    />
                    <button
                      onClick={canTransferWaterToFridge ? () => loadFridgeWater(requestedWaterTransferLiters) : undefined}
                      disabled={!canTransferWaterToFridge}
                      className={canTransferWaterToFridge ? 'ui-action-button-sm' : 'ui-action-button-sm cursor-not-allowed'}
                    >
                      Add Water To {CREW_STORAGE_LABEL}
                    </button>
                    {!canTransferWaterToFridge && (
                      <p className="ui-note text-amber-300">
                        Need cargo water and {CREW_STORAGE_LABEL_LOWER} water capacity.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="ui-stack-xs">
              <div className="flex items-center justify-between ui-note">
                <span>{CREW_STORAGE_LABEL} Bars Fill</span>
                <span>{fridgeFillPercent.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-slate-900/80">
                <div
                  className="h-full bg-emerald-300/85 transition-all"
                  style={{ width: fridgeFillWidth }}
                />
              </div>
            </div>

            <div className="ui-stack-xs">
              <div className="flex items-center justify-between ui-note">
                <span>{CREW_STORAGE_LABEL} Water Fill</span>
                <span>{fridgeWaterFillPercent.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-slate-900/80">
                <div
                  className="h-full bg-cyan-300/80 transition-all"
                  style={{ width: `${fridgeWaterFillPercent}%` }}
                />
              </div>
            </div>

            <p className="ui-note">
              Auto food consumes {CREW_STORAGE_LABEL_LOWER} bars first, then cargo bars. Auto hydration consumes {CREW_STORAGE_LABEL_LOWER} water first, then cargo water.
            </p>
            {!fridge.unlocked && (
              <p className="ui-note text-amber-300">
                Unlock requirement: complete Feed The Crew quest to unlock the {CREW_STORAGE_LABEL}.
              </p>
            )}

            {fridge.unlocked && (
              <div className="ui-stack-xs">
                <button
                  onClick={() => setShowReference((current) => !current)}
                  className="ui-action-button-sm"
                >
                  {showReference ? 'Hide Runtime Reference' : 'Show Runtime Reference'}
                </button>
                {showReference && (
                  <div className="ui-surface-card-strong ui-stack-xs">
                    <p className="ui-note">
                      Daily meals: {CREW_MEMBER_MEALS_PER_DAY} per crew member.
                    </p>
                    <p className="ui-note">
                      Manual feed restore: +{CREW_MEMBER_GALAXY_BAR_HUNGER_RESTORE.toFixed(1)} hunger.
                    </p>
                    <p className="ui-note">
                      Water demand: {(CREW_MEMBER_WATER_LITERS_PER_DAY_BASE * CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER).toFixed(2)} L/day per crew member.
                    </p>
                    <p className="ui-note">
                      Hydration event: {CREW_MEMBER_WATER_DRINK_COST_L.toFixed(2)} L gives +{CREW_MEMBER_WATER_HYDRATION_RESTORE.toFixed(0)} thirst.
                    </p>
                    <p className="ui-note">
                      Manual feeds delivered: {crewFeedsDelivered}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section id={rosterSectionId} className="ui-surface-card ui-stack-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="ui-label">Crew Roster</p>
              <p className="ui-note">Select a crew member for detail.</p>
            </div>

            {crewMembers.length === 0 && (
              <p className="ui-note">No crew members available in this save.</p>
            )}

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {crewMembers.map((member) => {
                const isActive = activeCrewMember?.id === member.id
                return (
                <article
                  key={member.id}
                  onClick={() => setActiveCrewId(member.id)}
                  className={`ui-surface-card-strong ui-stack-sm cursor-pointer transition-all ${
                    isActive
                      ? 'ring-1 ring-[#78ef00]/60 shadow-[0_0_0_1px_rgba(120,239,0,0.18)]'
                      : 'hover:ring-1 hover:ring-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80 ui-note font-semibold text-slate-100">
                        {crewInitials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="ui-body-copy truncate font-semibold text-slate-100">{member.name}</p>
                        <p className="ui-note">
                          Sleep: {sleepWindowLabel(member.sleepShiftStartHour)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="ui-status-tag bg-slate-900/50 text-slate-200">
                        {member.sleeping ? 'Sleeping' : 'Awake'}
                      </span>
                      {member.starving && (
                        <span className="ui-status-tag bg-amber-500/20 text-amber-200">Starving</span>
                      )}
                      {member.dehydrated && (
                        <span className="ui-status-tag bg-cyan-500/20 text-cyan-200">Dehydrated</span>
                      )}
                    </div>
                  </div>

                  <div className="ui-stack-xs">
                    <div>
                      <div className="mb-1 flex items-center justify-between ui-note">
                        <span>Hunger</span>
                        <span className={metricLabelClass(member.hunger, 'hunger')}>{member.hunger.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-slate-900/80">
                        <div className={`h-full transition-all ${metricBarClass('hunger')}`} style={{ width: `${clampPercent(member.hunger)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between ui-note">
                        <span>Thirst</span>
                        <span className={metricLabelClass(member.thirst, 'thirst')}>{member.thirst.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-slate-900/80">
                        <div className={`h-full transition-all ${metricBarClass('thirst')}`} style={{ width: `${clampPercent(member.thirst)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between ui-note">
                        <span>Debuff</span>
                        <span className={metricLabelClass(member.debuff, 'debuff')}>{member.debuff.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-slate-900/80">
                        <div className={`h-full transition-all ${metricBarClass('debuff')}`} style={{ width: `${clampPercent(member.debuff)}%` }} />
                      </div>
                    </div>
                  </div>
                </article>
                )
              })}
            </div>

            {activeCrewMember && (
              <article className="ui-surface-card-strong ui-stack-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="ui-note">Selected Crew Detail</p>
                  <span className="ui-status-tag bg-slate-900/60 text-slate-200">
                    Day {activeCrewMember.dailyScheduleDayIndex + 1}
                  </span>
                </div>
                <div>
                  <p className="ui-title">{activeCrewMember.name}</p>
                  <p className="ui-note">
                    Sleep window {sleepWindowLabel(activeCrewMember.sleepShiftStartHour)} UTC
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div className="ui-stack-xs">
                    <p className="ui-note">Breakfast</p>
                    <p className={`ui-note ${activeCrewMember.dailyBreakfastServed ? 'text-slate-100' : 'text-slate-300'}`}>
                      {activeCrewMember.dailyBreakfastServed ? 'Done' : 'Pending'}
                    </p>
                  </div>
                  <div className="ui-stack-xs">
                    <p className="ui-note">Lunch</p>
                    <p className={`ui-note ${activeCrewMember.dailyLunchServed ? 'text-slate-100' : 'text-slate-300'}`}>
                      {activeCrewMember.dailyLunchServed ? 'Done' : 'Pending'}
                    </p>
                  </div>
                  <div className="ui-stack-xs">
                    <p className="ui-note">Dinner</p>
                    <p className={`ui-note ${activeCrewMember.dailyDinnerServed ? 'text-slate-100' : 'text-slate-300'}`}>
                      {activeCrewMember.dailyDinnerServed ? 'Done' : 'Pending'}
                    </p>
                  </div>
                  <div className="ui-stack-xs">
                    <p className="ui-note">Water Events</p>
                    <p className="ui-note text-slate-100">
                      {activeCrewMember.dailyWaterServedCount}/{crewDailyWaterEvents}
                    </p>
                  </div>
                </div>
                <p className="ui-note">
                  First Galaxy Bar boost {activeCrewMember.firstGalaxyBarBoostApplied ? 'already applied.' : 'not used yet.'}
                </p>
              </article>
            )}
          </section>

          <section id={activitySectionId} className="ui-surface-card ui-stack-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="ui-label">Crew Activity</p>
              <button
                onClick={() => setShowActivity((current) => !current)}
                className="ui-action-button-sm"
              >
                {showActivity ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {showActivity && (
              <div className="ui-surface-card-strong ui-stack-xs">
                {crewActivityFeed.length === 0 && (
                  <p className="ui-note text-slate-100">No recent crew-related activity.</p>
                )}
                {crewActivityFeed.map((entry) => {
                  const tone = activityTone(entry)
                  const timeLabel = new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  return (
                    <p key={entry.id} className={activityToneClass(tone)}>
                      [{timeLabel}] {themeStorageText(entry.message)}
                    </p>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </aside>
  )
}

