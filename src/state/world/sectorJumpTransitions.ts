import {
  resolveSectorDefinition,
  type SectorId,
} from '@domain/spec/sectorSpec'
import type {
  CleanupZoneId,
} from '@domain/spec/worldSpec'
import type {
  RadarContact,
  SelectedObject,
  SimulationLogEntry,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface SectorJumpTransitionState {
  activeSectorId: SectorId
  simulationLog: SimulationLogEntry[]
}

export interface SectorJumpDepartureTransitionPatch {
  activeSectorId: SectorId
  worldStateLoaded: false
  activeCleanupZoneId: CleanupZoneId | null
  selectedObject: SelectedObject | null
  radarContacts: RadarContact[]
  simulationLog: SimulationLogEntry[]
}

export interface SectorJumpArrivalTransitionPatch {
  simulationLog: SimulationLogEntry[]
}

export function applySectorJumpDepartureTransition(
  state: SectorJumpTransitionState,
  nextSectorId: SectorId,
  appendLog: AppendLog,
): SectorJumpDepartureTransitionPatch {
  const fromSector = resolveSectorDefinition(state.activeSectorId)
  const toSector = resolveSectorDefinition(nextSectorId)

  return {
    activeSectorId: nextSectorId,
    worldStateLoaded: false,
    activeCleanupZoneId: null,
    selectedObject: null,
    radarContacts: [],
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: `Sector transit: ${fromSector.label} -> ${toSector.label}.`,
    }),
  }
}

export function applySectorJumpArrivalTransition(
  state: SectorJumpTransitionState,
  sectorId: SectorId,
  appendLog: AppendLog,
): SectorJumpArrivalTransitionPatch {
  const sector = resolveSectorDefinition(sectorId)
  return {
    simulationLog: appendLog({
      logs: state.simulationLog,
      message: `Arrived in ${sector.label}.`,
    }),
  }
}
