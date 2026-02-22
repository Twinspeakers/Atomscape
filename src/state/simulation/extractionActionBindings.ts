import { computeAtomTotals } from '@domain/resources/resourceCatalog'
import { MINING_ASTEROID_RUBBLE_YIELD } from '@domain/spec/gameSpec'
import {
  applyRecordExtractionHitTransition,
  applyTryFireMiningLaserTransition,
} from '@state/simulation/extractionTransitions'
import type {
  CrewStatus,
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

export interface ExtractionActionState {
  inventory: ResourceInventory
  atomCounter: ReturnType<typeof computeAtomTotals>
  energy: number
  maxEnergy: number
  stationDistance: number
  charging: boolean
  containmentOn: boolean
  containmentPower: number
  crewStatus: CrewStatus
  simulationSummary: SimulationSummary
  simulationLog: SimulationLogEntry[]
  extractionEvents: ExtractionEvent[]
}

export interface ExtractionActionBindings {
  mineElement: (symbol: string) => Promise<void>
  tryFireMiningLaser: () => boolean
  recordExtractionHit: (target: ExtractionTargetPayload) => Promise<void>
}

export interface BuildExtractionActionBindingsOptions {
  setState: (
    updater: (state: ExtractionActionState) => Partial<ExtractionActionState>,
  ) => void
  getState: () => ExtractionActionState
  appendLog: AppendLog
  persistInventorySnapshotSafely: (inventory: ResourceInventory) => void
  updateTutorialProgress: () => void
}

export interface ExtractionActionBindingDependencies {
  applyTryFireMiningLaserTransition: typeof applyTryFireMiningLaserTransition
  applyRecordExtractionHitTransition: typeof applyRecordExtractionHitTransition
}

const defaultExtractionActionBindingDependencies: ExtractionActionBindingDependencies = {
  applyTryFireMiningLaserTransition,
  applyRecordExtractionHitTransition,
}

export function buildExtractionActionBindings(
  options: BuildExtractionActionBindingsOptions,
  dependencies: Partial<ExtractionActionBindingDependencies> = {},
): ExtractionActionBindings {
  const runtimeDependencies: ExtractionActionBindingDependencies = {
    ...defaultExtractionActionBindingDependencies,
    ...dependencies,
  }
  let lastLowPowerLogTime = 0

  const bindings: ExtractionActionBindings = {
    mineElement: async (symbol) => {
      await bindings.recordExtractionHit({
        targetId: `debug-target-${Date.now()}`,
        classId: 'rockBody',
        kind: 'asteroid',
        zoneId: 'nearStationBelt',
        riskRating: 0.35,
        signatureElementSymbol: symbol,
        expectedYield: { rubble: MINING_ASTEROID_RUBBLE_YIELD },
      })
    },
    tryFireMiningLaser: () => {
      let fired = false

      options.setState((state) => {
        const transition = runtimeDependencies.applyTryFireMiningLaserTransition(
          {
            energy: state.energy,
            maxEnergy: state.maxEnergy,
            crewDebuff: state.crewStatus.debuff,
            stationDistance: state.stationDistance,
            charging: state.charging,
            containmentOn: state.containmentOn,
            containmentPower: state.containmentPower,
            simulationLog: state.simulationLog,
            extractionEvents: state.extractionEvents,
          },
          lastLowPowerLogTime,
          options.appendLog,
        )

        lastLowPowerLogTime = transition.nextLowPowerLogTime

        if (transition.kind === 'success') {
          fired = true
          return {
            energy: transition.energy,
            extractionEvents: transition.extractionEvents,
            simulationSummary: transition.simulationSummary,
          }
        }

        if (transition.kind === 'blocked-logged') {
          return {
            simulationLog: transition.simulationLog,
            extractionEvents: transition.extractionEvents,
          }
        }

        return {}
      })

      return fired
    },
    recordExtractionHit: async (target) => {
      let persistInventory = false

      options.setState((state) => {
        const transition = runtimeDependencies.applyRecordExtractionHitTransition(
          {
            inventory: state.inventory,
            simulationLog: state.simulationLog,
            extractionEvents: state.extractionEvents,
          },
          target,
          options.appendLog,
        )

        persistInventory = transition.persistInventory

        return {
          inventory: transition.inventory,
          atomCounter: computeAtomTotals(transition.inventory),
          simulationLog: transition.simulationLog,
          extractionEvents: transition.extractionEvents,
        }
      })

      if (persistInventory) {
        options.persistInventorySnapshotSafely(options.getState().inventory)
      }

      options.updateTutorialProgress()
    },
  }

  return bindings
}
