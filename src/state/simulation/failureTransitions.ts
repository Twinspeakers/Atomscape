import type { ResourceId } from '@domain/resources/resourceCatalog'
import { buildSimulationSummary } from '@features/simulation/engine'
import {
  deriveCrewAggregateMetrics,
  deriveCrewStatusFromMembers,
} from '@state/runtime/snapshotSanitizers'
import { clamp, roundQty } from '@state/utils/numberUtils'
import type {
  CrewAggregateMetrics,
  CrewMemberState,
  CrewStatus,
  FailureMaterialCost,
  FailureReason,
  FailureReportEntry,
  ResourceInventory,
  SimulationLogEntry,
  SimulationSummary,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

interface RepairCostDefinition {
  resourceId: ResourceId
  amount: number
  label: string
}

const REPAIR_COSTS: RepairCostDefinition[] = [
  { resourceId: 'steel', amount: 0.4, label: 'steel' },
  { resourceId: 'silicaSand', amount: 0.8, label: 'silica sand' },
  { resourceId: 'carbon', amount: 0.2, label: 'carbon' },
]

export interface FailureTransitionState {
  inventory: ResourceInventory
  credits: number
  energy: number
  maxEnergy: number
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  shipRespawnSignal: number
  failureCount: number
  starvationFailureLock: boolean
  stationDistance: number
  containmentPower: number
  simulationLog: SimulationLogEntry[]
}

export interface FailureTransitionResult {
  inventory: ResourceInventory
  credits: number
  energy: number
  charging: false
  containmentOn: false
  crewStatus: CrewStatus
  crewMembers: CrewMemberState[]
  crewAggregateMetrics: CrewAggregateMetrics
  shipRespawnSignal: number
  failureCount: number
  failureReport: FailureReportEntry
  starvationFailureLock: boolean
  simulationSummary: SimulationSummary
  simulationLog: SimulationLogEntry[]
  persistInventory: boolean
}

interface ApplyFailureTransitionOptions {
  now?: number
  random?: () => number
}

export function applyFailureTransition(
  state: FailureTransitionState,
  reason: FailureReason,
  appendLog: AppendLog,
  options?: ApplyFailureTransitionOptions,
): FailureTransitionResult {
  const inventory = { ...state.inventory }
  const now = options?.now ?? Date.now()
  const random = options?.random ?? Math.random

  let shortage = 0
  const consumedParts: string[] = []
  const materialBreakdown: FailureMaterialCost[] = []
  let persistInventory = false

  REPAIR_COSTS.forEach((cost) => {
    const available = inventory[cost.resourceId] ?? 0
    const used = Math.min(available, cost.amount)
    const missing = cost.amount - used

    if (used > 0) {
      inventory[cost.resourceId] = roundQty(available - used)
      consumedParts.push(`${used.toFixed(2)} ${cost.label}`)
      persistInventory = true
    }

    shortage += missing
    materialBreakdown.push({
      resourceId: cost.resourceId,
      label: cost.label,
      required: roundQty(cost.amount),
      used: roundQty(used),
      shortage: roundQty(missing),
    })
  })

  const creditPenalty = roundQty(18 + shortage * 22)
  const energyPenalty = 35
  const credits = roundQty(Math.max(0, state.credits - creditPenalty))
  const energy = clamp(state.energy - energyPenalty, 0, state.maxEnergy)
  const reasonLabel =
    reason === 'combat' ? 'combat hull breach' : 'crew critical condition'
  const hadMaterialShortage = shortage > 0
  const materialsSummary =
    consumedParts.length > 0
      ? ` Materials used: ${consumedParts.join(', ')}.`
      : ' No repair materials available; emergency service billed in credits.'
  const nextRepairCount = state.failureCount + 1
  const failureReport: FailureReportEntry = {
    id: now + Math.floor(random() * 1000),
    timestamp: now,
    reason,
    reasonLabel,
    creditsPenalty: creditPenalty,
    energyPenalty,
    materials: materialBreakdown,
    hadMaterialShortage,
    resetToStart: true,
    repairCount: nextRepairCount,
  }

  const emergencyCrewStatus: CrewStatus =
    reason === 'starvation'
      ? {
          ...state.crewStatus,
          hunger: Math.max(state.crewStatus.hunger, 42),
          debuff: Math.max(0, state.crewStatus.debuff - 12),
          starving: false,
        }
      : state.crewStatus
  const nextCrewMembers =
    reason === 'starvation'
      ? state.crewMembers.map((member) => ({
          ...member,
          hunger: Math.max(member.hunger, 42),
          debuff: Math.max(0, member.debuff - 12),
          starving: false,
          dehydrated: false,
        }))
      : state.crewMembers
  const nextCrewStatus = deriveCrewStatusFromMembers(
    nextCrewMembers,
    emergencyCrewStatus.foodAutomationEnabled,
  )
  const nextCrewAggregateMetrics = deriveCrewAggregateMetrics(nextCrewMembers)

  return {
    inventory,
    credits,
    energy,
    charging: false,
    containmentOn: false,
    crewStatus: nextCrewStatus,
    crewMembers: nextCrewMembers,
    crewAggregateMetrics: nextCrewAggregateMetrics,
    shipRespawnSignal: state.shipRespawnSignal + 1,
    failureCount: nextRepairCount,
    failureReport,
    starvationFailureLock:
      reason === 'starvation' ? true : state.starvationFailureLock,
    simulationSummary: buildSimulationSummary({
      stationDistance: state.stationDistance,
      charging: false,
      containmentOn: false,
      containmentPower: state.containmentPower,
    }),
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: `Emergency reset: ${reasonLabel}. Returned to start point for repairs. -${creditPenalty.toFixed(1)} cr, -${energyPenalty.toFixed(1)} energy.${materialsSummary} Full breakdown saved in Failure Reports.`,
    }),
    persistInventory,
  }
}
