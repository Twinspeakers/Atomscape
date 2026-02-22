import type {
  CommsSpeaker,
  CrewStatus,
  LabTab,
  RadarContact,
  SelectedObject,
  ShipTelemetry,
  SimulationLogEntry,
} from '@state/types'

interface AppendLogOptions {
  logs: SimulationLogEntry[]
  message: string
}

type AppendLog = (options: AppendLogOptions) => SimulationLogEntry[]

export interface BasicStateActionState {
  crewStatus: CrewStatus
  waterAutomationEnabled: boolean
  simulationLog: SimulationLogEntry[]
  labActiveTab: LabTab
  selectedObject: SelectedObject | null
  playerUsername: string
  activeCommsSpeaker: CommsSpeaker | null
  shipTelemetry: ShipTelemetry
  radarContacts: RadarContact[]
}

export interface BasicStateActionBindings {
  setFoodAutomationEnabled: (enabled: boolean) => void
  setWaterAutomationEnabled: (enabled: boolean) => void
  setLabActiveTab: (tab: LabTab) => void
  setSelectedObject: (selection: SelectedObject | null) => void
  setPlayerUsername: (name: string) => void
  setActiveCommsSpeaker: (speaker: CommsSpeaker | null) => void
  appendSimulationLog: (message: string) => void
  setShipTelemetry: (telemetry: ShipTelemetry) => void
  setRadarContacts: (contacts: RadarContact[]) => void
}

interface BuildBasicStateActionBindingsOptions {
  setWithState: (
    updater: (state: BasicStateActionState) => Partial<BasicStateActionState>,
  ) => void
  setPatch: (patch: Partial<BasicStateActionState>) => void
  appendLog: AppendLog
  sanitizePlayerUsername: (value: unknown) => string
}

export function buildBasicStateActionBindings(
  options: BuildBasicStateActionBindingsOptions,
): BasicStateActionBindings {
  return {
    setFoodAutomationEnabled: (enabled) => {
      options.setWithState((state) => ({
        crewStatus: {
          ...state.crewStatus,
          foodAutomationEnabled: enabled,
        },
        simulationLog: options.appendLog({
          logs: state.simulationLog,
          message: enabled
            ? 'Crew food automation enabled: system will auto-craft/feed Galaxy Bars.'
            : 'Crew food automation disabled.',
        }),
      }))
    },
    setWaterAutomationEnabled: (enabled) => {
      options.setWithState((state) => ({
        waterAutomationEnabled: enabled,
        simulationLog: options.appendLog({
          logs: state.simulationLog,
          message: enabled
            ? 'Crew hydration automation enabled: system will auto-allocate water drinks.'
            : 'Crew hydration automation disabled.',
        }),
      }))
    },
    setLabActiveTab: (tab) => {
      options.setPatch({ labActiveTab: tab })
    },
    setSelectedObject: (selection) => {
      options.setPatch({ selectedObject: selection })
    },
    setPlayerUsername: (name) => {
      options.setPatch({ playerUsername: options.sanitizePlayerUsername(name) })
    },
    setActiveCommsSpeaker: (speaker) => {
      options.setPatch({ activeCommsSpeaker: speaker })
    },
    appendSimulationLog: (message) => {
      const normalizedMessage = typeof message === 'string' ? message.trim() : ''
      if (!normalizedMessage) {
        return
      }

      options.setWithState((state) => ({
        simulationLog: options.appendLog({
          logs: state.simulationLog,
          message: normalizedMessage,
        }),
      }))
    },
    setShipTelemetry: (telemetry) => {
      options.setPatch({ shipTelemetry: telemetry })
    },
    setRadarContacts: (contacts) => {
      options.setPatch({ radarContacts: contacts })
    },
  }
}
