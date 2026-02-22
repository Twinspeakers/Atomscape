import { EXTRACTION_EVENT_LIMIT } from '@domain/spec/gameSpec'
import {
  attemptMiningLaserFire,
  buildSimulationSummary,
  resolveExtractionHit,
} from '@features/simulation/engine'
import type {
  ExtractionEvent,
  ExtractionTargetPayload,
  ResourceInventory,
  SimulationLogEntry,
  SimulationSummary,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

function pushExtractionEvent(
  events: ExtractionEvent[],
  event: ExtractionEvent,
): ExtractionEvent[] {
  return [event, ...events].slice(0, EXTRACTION_EVENT_LIMIT)
}

export interface FireMiningLaserTransitionState {
  energy: number
  maxEnergy: number
  crewDebuff: number
  stationDistance: number
  charging: boolean
  containmentOn: boolean
  containmentPower: number
  simulationLog: SimulationLogEntry[]
  extractionEvents: ExtractionEvent[]
}

interface FireMiningLaserTransitionOptions {
  now?: number
}

export type FireMiningLaserTransitionResult =
  | {
      kind: 'success'
      fired: true
      energy: number
      extractionEvents: ExtractionEvent[]
      simulationSummary: SimulationSummary
      nextLowPowerLogTime: number
    }
  | {
      kind: 'blocked-logged'
      fired: false
      simulationLog: SimulationLogEntry[]
      extractionEvents: ExtractionEvent[]
      nextLowPowerLogTime: number
    }
  | {
      kind: 'blocked-silent'
      fired: false
      nextLowPowerLogTime: number
    }

export function applyTryFireMiningLaserTransition(
  state: FireMiningLaserTransitionState,
  lastLowPowerLogTime: number,
  appendLog: AppendLog,
  options?: FireMiningLaserTransitionOptions,
): FireMiningLaserTransitionResult {
  const now = options?.now ?? Date.now()
  const fireResult = attemptMiningLaserFire({
    energy: state.energy,
    maxEnergy: state.maxEnergy,
    crewDebuff: state.crewDebuff,
    now,
  })

  if (fireResult.succeeded) {
    return {
      kind: 'success',
      fired: true,
      energy: fireResult.energy,
      extractionEvents: pushExtractionEvent(state.extractionEvents, fireResult.event),
      simulationSummary: buildSimulationSummary({
        stationDistance: state.stationDistance,
        charging: state.charging,
        containmentOn: state.containmentOn,
        containmentPower: state.containmentPower,
      }),
      nextLowPowerLogTime: lastLowPowerLogTime,
    }
  }

  if (now - lastLowPowerLogTime > 2500) {
    return {
      kind: 'blocked-logged',
      fired: false,
      simulationLog: fireResult.logMessage
        ? appendLog({
            logs: state.simulationLog,
            message: fireResult.logMessage,
          })
        : state.simulationLog,
      extractionEvents: pushExtractionEvent(state.extractionEvents, fireResult.event),
      nextLowPowerLogTime: now,
    }
  }

  return {
    kind: 'blocked-silent',
    fired: false,
    nextLowPowerLogTime: lastLowPowerLogTime,
  }
}

export interface ExtractionHitTransitionState {
  inventory: ResourceInventory
  simulationLog: SimulationLogEntry[]
  extractionEvents: ExtractionEvent[]
}

export interface ExtractionHitTransitionResult {
  inventory: ResourceInventory
  simulationLog: SimulationLogEntry[]
  extractionEvents: ExtractionEvent[]
  persistInventory: boolean
}

interface ExtractionHitTransitionOptions {
  now?: number
}

export function applyRecordExtractionHitTransition(
  state: ExtractionHitTransitionState,
  target: ExtractionTargetPayload,
  appendLog: AppendLog,
  options?: ExtractionHitTransitionOptions,
): ExtractionHitTransitionResult {
  const extraction = resolveExtractionHit({
    inventory: state.inventory,
    target,
    now: options?.now,
  })

  return {
    inventory: extraction.inventory,
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: extraction.logMessage,
    }),
    extractionEvents: pushExtractionEvent(state.extractionEvents, extraction.event),
    persistInventory: extraction.inventoryChanged,
  }
}
