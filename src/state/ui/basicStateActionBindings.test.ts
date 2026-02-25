import { describe, expect, it } from 'vitest'
import { DEFAULT_SHIP_TELEMETRY } from '@state/runtime/storeBootstrap'
import { GALAXY_BAR_AUTOMATION_SIDE_QUEST_ID } from '@features/quests/questDefinitions'
import type {
  CrewStatus,
  RadarContact,
  SimulationLogEntry,
} from '@state/types'
import { buildBasicStateActionBindings, type BasicStateActionState } from './basicStateActionBindings'

function appendLog({ logs, message }: { logs: SimulationLogEntry[]; message: string }): SimulationLogEntry[] {
  return [
    {
      id: logs.length + 1,
      message,
      timestamp: logs.length + 1,
    },
    ...logs,
  ]
}

function createState(): BasicStateActionState {
  const crewStatus: CrewStatus = {
    hunger: 80,
    debuff: 5,
    starving: false,
    foodAutomationEnabled: false,
  }

  return {
    crewStatus,
    waterAutomationEnabled: false,
    galaxyBarAutomationEnabled: false,
    claimedQuestRewardIds: [],
    simulationLog: [],
    labActiveTab: 'sorting',
    selectedObject: null,
    playerUsername: 'Captain Orbit',
    activeCommsSpeaker: null,
    shipTelemetry: DEFAULT_SHIP_TELEMETRY,
    radarContacts: [],
  }
}

describe('basicStateActionBindings', () => {
  it('updates food/water automation and appends logs', () => {
    let state = createState()

    const bindings = buildBasicStateActionBindings({
      setWithState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      setPatch: (patch) => {
        state = { ...state, ...patch }
      },
      appendLog,
      sanitizePlayerUsername: (value) => String(value).trim() || 'fallback',
    })

    bindings.setFoodAutomationEnabled(true)
    bindings.setWaterAutomationEnabled(true)
    bindings.setGalaxyBarAutomationEnabled(true)

    expect(state.crewStatus.foodAutomationEnabled).toBe(true)
    expect(state.waterAutomationEnabled).toBe(true)
    expect(state.galaxyBarAutomationEnabled).toBe(false)
    expect(state.simulationLog[0]?.message).toContain('Galaxy Bar automation remains locked')
    expect(state.simulationLog[1]?.message).toContain('Crew hydration automation enabled')
    expect(state.simulationLog[2]?.message).toContain('Crew food automation enabled')
  })

  it('enables galaxy bar automation after unlock reward is claimed', () => {
    let state = createState()
    state.claimedQuestRewardIds = [GALAXY_BAR_AUTOMATION_SIDE_QUEST_ID]

    const bindings = buildBasicStateActionBindings({
      setWithState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      setPatch: (patch) => {
        state = { ...state, ...patch }
      },
      appendLog,
      sanitizePlayerUsername: (value) => String(value).trim() || 'fallback',
    })

    bindings.setGalaxyBarAutomationEnabled(true)

    expect(state.galaxyBarAutomationEnabled).toBe(true)
    expect(state.simulationLog[0]?.message).toContain('Galaxy Bar automation enabled')
  })

  it('applies direct patch setters and username sanitization', () => {
    let state = createState()
    const contacts: RadarContact[] = [
      {
        id: 'a',
        x: 10,
        z: 20,
        distance: 10,
        symbol: 'A',
        integrity: 100,
      },
    ]

    const bindings = buildBasicStateActionBindings({
      setWithState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      setPatch: (patch) => {
        state = { ...state, ...patch }
      },
      appendLog,
      sanitizePlayerUsername: () => 'Captain Nova',
    })

    bindings.setLabActiveTab('station')
    bindings.setPlayerUsername('   ignored   ')
    bindings.setShipTelemetry({
      speed: 12,
      health: 91,
      attacks: 0,
      cooldown: 0,
    })
    bindings.setRadarContacts(contacts)

    expect(state.labActiveTab).toBe('station')
    expect(state.playerUsername).toBe('Captain Nova')
    expect(state.shipTelemetry.speed).toBe(12)
    expect(state.radarContacts).toEqual(contacts)
  })

  it('ignores blank simulation log messages', () => {
    let state = createState()

    const bindings = buildBasicStateActionBindings({
      setWithState: (updater) => {
        state = { ...state, ...updater(state) }
      },
      setPatch: (patch) => {
        state = { ...state, ...patch }
      },
      appendLog,
      sanitizePlayerUsername: (value) => String(value),
    })

    bindings.appendSimulationLog('   ')
    expect(state.simulationLog).toHaveLength(0)

    bindings.appendSimulationLog('  hello  ')
    expect(state.simulationLog).toHaveLength(1)
    expect(state.simulationLog[0]?.message).toBe('hello')
  })
})
