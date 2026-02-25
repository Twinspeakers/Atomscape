import {
  CHARGING_RANGE_METERS,
  FRIDGE_UNLOCK_REWARD_GALAXY_BARS,
  STATION_DOCKING_RANGE_METERS,
} from '../../domain/spec/gameSpec.js'
import { PROCESS_CATALOG } from '../../domain/spec/processCatalog.js'
import {
  isFeedCrewCraftGalaxyBarSatisfied,
  isFeedCrewCreateCarbonSatisfied,
  isFeedCrewCreateCelluloseSatisfied,
  isFeedCrewCreateCo2Satisfied,
  isFeedCrewCreateWaterSatisfied,
  isFeedCrewStageIngredientsSatisfied,
  isFeedCrewTargetFeedstockSatisfied,
} from './feedCrewProgress.js'
import type { LabTab, ResourceInventory, TutorialChecklistItem } from '../../state/types'
import type { ResourceId } from '@domain/resources/resourceCatalog'

export type TutorialStepId =
  | 'lookAroundWithMouse'
  | 'strafeLeftAndRight'
  | 'strafeUpAndDown'
  | 'forwardReverseRun'
  | 'boostThroughRing'
  | 'lockOnTrainingDrone'
  | 'destroyTrainingDrone'
  | 'approachStationForCharging'
  | 'openStationTabForCharging'
  | 'engageCharging'
  | 'startCharging'
  | 'approachHighRiskZone'
  | 'salvageCompositeJunk'
  | 'returnToStation'
  | 'targetFeedstock'
  | 'craftGalaxyBar'
  | 'createCellulose'
  | 'createWaterForRations'
  | 'createCo2GasForRations'
  | 'createCarbonForRations'
  | 'stageGalaxyBarIngredients'
  | 'mineRubble'
  | 'sortRubble'
  | 'electrolyzeWater'
  | 'ionizeHydrogen'
  | 'manufacturePart'

export interface TutorialStepDescriptor {
  id: TutorialStepId
  title: string
  description: string
  detail?: string
  hint?: string
  focusTarget?: string
  labTab?: LabTab
}

export interface SideQuestStepTemplate {
  id: string
  title: string
  description: string
  detail: string
}

export interface SideQuestDefinition {
  id: string
  title: string
  summary: string
  steps: SideQuestStepTemplate[]
  rewards: QuestRewardDefinition[]
}

export interface MainQuestDefinition {
  id: string
  title: string
  summary: string
  stepIds: TutorialStepId[]
  rewards: QuestRewardDefinition[]
}

export interface QuestRewardDefinition {
  id: string
  label: string
  description: string
  grants?: {
    items?: Partial<Record<ResourceId, number>>
    unlocks?: string[]
    fridge?: {
      galaxyBars?: number
    }
  }
}

export interface QuestStepProgress {
  id: string
  title: string
  description: string
  detail?: string
  hint?: string
  focusTarget?: string
  labTab?: LabTab
  completed: boolean
  current: boolean
}

export interface QuestProgressView {
  id: string
  title: string
  type: 'Main Quest' | 'Side Quest'
  summary: string
  rewards: QuestRewardDefinition[]
  completed: boolean
  current: boolean
  steps: QuestStepProgress[]
}

export const CONTROL_SHIP_QUEST_ID = 'main-control-the-ship'
export const CHARGE_SHIP_QUEST_ID = 'main-charge-the-ship'
export const FEED_THE_CREW_QUEST_ID = 'main-feed-the-crew'
export const ORBITAL_CLEANUP_QUEST_ID = 'main-orbital-cleanup-protocol'
export const FIRST_CONTRACT_SIDE_QUEST_ID = 'side-first-contract'
export const GALAXY_BAR_AUTOMATION_SIDE_QUEST_ID = 'side-galaxy-bar-manufacturing'

const gameMenuPath = 'Game Menu'
const laboratoryPath = `${gameMenuPath} > Laboratory`
const stationPath = `${gameMenuPath} > Station`
const sortingPath = `${laboratoryPath} > Mining + Sorting`
const hydrogenPath = `${laboratoryPath} > Hydrogen`
const manufacturingPath = `${laboratoryPath} > Manufacture`
const marketPath = `${gameMenuPath} > Store`

export const tutorialStepDescriptors: TutorialStepDescriptor[] = [
  {
    id: 'lookAroundWithMouse',
    title: 'Look Calibration Sweep',
    description: 'Sweep your view left/right and up/down to calibrate camera control.',
    hint: 'Move Mouse horizontally and vertically until this step clears.',
    focusTarget: 'space-viewport',
  },
  {
    id: 'strafeLeftAndRight',
    title: 'Horizontal Strafe Check',
    description: 'Use lateral thrusters to move left and right in control.',
    hint: 'Press A, then D. Use the side marker props as reference.',
    focusTarget: 'space-viewport',
  },
  {
    id: 'strafeUpAndDown',
    title: 'Vertical Strafe Check',
    description: 'Use vertical thrusters to move up and down in control.',
    hint: 'Press R, then F. Use the upper/lower marker props as reference.',
    focusTarget: 'space-viewport',
  },
  {
    id: 'forwardReverseRun',
    title: 'Reverse + Return Ring Run',
    description: 'Reverse through the training ring, then return forward through the same ring.',
    hint: 'When this step starts, a ring deploys behind you. Press S through it, then W back through.',
    focusTarget: 'space-viewport',
  },
  {
    id: 'boostThroughRing',
    title: 'Boost Lane Burst',
    description: 'Engage boost and hold a short, stable forward burst through the boost lane.',
    hint: 'Hold Shift + W until the step clears.',
    focusTarget: 'space-viewport',
  },
  {
    id: 'lockOnTrainingDrone',
    title: 'Acquire Target Lock',
    description: 'Aim at the training drone until crosshair lock engages.',
    hint: 'Center the drone and hold aim until lock appears.',
    focusTarget: 'space-viewport',
  },
  {
    id: 'destroyTrainingDrone',
    title: 'Controlled Firing Test',
    description: 'Destroy the training drone with controlled shots.',
    hint: 'Press Space to fire. Training shots are free.',
    focusTarget: 'space-viewport',
  },
  {
    id: 'approachStationForCharging',
    title: 'Approach Charging Range',
    description: `Move within ${CHARGING_RANGE_METERS} m of the station so charging can activate.`,
    detail: [
      'Fly toward the station beacon.',
      `Reduce distance until you are at or below ${CHARGING_RANGE_METERS} m.`,
    ].join('\n'),
    hint: 'Use the station marker and close distance until the station is in range.',
    focusTarget: 'space-return-station',
  },
  {
    id: 'openStationTabForCharging',
    title: 'Open Station Controls',
    description: `Open ${stationPath} to access charging controls.`,
    detail: [
      'Open the Game Menu.',
      'Open Station.',
    ].join('\n'),
    hint: 'Press P to open Station.',
    focusTarget: 'lab-start-charging',
    labTab: 'station',
  },
  {
    id: 'engageCharging',
    title: 'Dock And Engage Charging',
    description: 'Dock to station, then click Start Charging while in range.',
    detail: [
      `Stay within ${CHARGING_RANGE_METERS} m.`,
      `Dock inside ${STATION_DOCKING_RANGE_METERS} m.`,
      'Click Start Charging in Station controls.',
    ].join('\n'),
    hint: `Dock first, then ${stationPath} > Start Charging`,
    focusTarget: 'lab-start-charging',
    labTab: 'station',
  },
  {
    id: 'startCharging',
    title: 'Confirm Charge Flow',
    description: 'Confirm Charge/s is positive while docked and charging remains active.',
    detail: [
      'Keep docking clamps engaged.',
      'Keep charging turned on.',
      'Check Station telemetry.',
      'Confirm Charge/s is above 0.',
    ].join('\n'),
    hint: 'If Charge/s is 0, verify you are still docked and charging is active.',
    focusTarget: 'lab-start-charging',
    labTab: 'station',
  },
  {
    id: 'approachHighRiskZone',
    title: 'Approach The High-Risk Salvage Pocket',
    description: 'Fly into the High-Risk Salvage Pocket and stabilize your approach.',
    detail: [
      'Open the Object panel and expand Nearest Contacts.',
      'Fly toward the contact labeled High-Risk Salvage Pocket.',
      'Enter the High-Risk Salvage Pocket zone.',
      'Stabilize your speed and orientation inside the zone.',
      'Keep position inside the zone until the step completes.',
    ].join('\n'),
    hint: 'Follow zone labels in the Object panel Nearest Contacts list until you enter High-Risk Salvage Pocket.',
    focusTarget: 'space-zone-high-risk',
  },
  {
    id: 'salvageCompositeJunk',
    title: 'Salvage Composite Junk Clusters',
    description: 'Extract at least 2 Composite Junk Clusters in the high-risk zone.',
    detail: [
      'Stay inside the High-Risk Salvage Pocket.',
      'Target contacts labeled Composite Junk Cluster.',
      'Verify target class in the Object panel before firing.',
      'Complete 2 successful extractions on Composite Junk targets.',
    ].join('\n'),
    hint: 'Prioritize contacts labeled Composite Junk Cluster and clear at least two.',
    focusTarget: 'space-class-composite-junk',
  },
  {
    id: 'returnToStation',
    title: 'Return And Dock',
    description: `Return to station and dock within the ${STATION_DOCKING_RANGE_METERS} m docking corridor.`,
    detail: [
      'Leave the salvage zone and fly to the station beacon.',
      `Enter the docking corridor within ${STATION_DOCKING_RANGE_METERS} m.`,
      `Open ${stationPath}.`,
      'Click Dock To Station.',
      'Confirm your station distance is pinned at 0 m.',
    ].join('\n'),
    hint: `Use station beacon + charge ring, then dock inside ${STATION_DOCKING_RANGE_METERS} m.`,
    focusTarget: 'space-return-station',
    labTab: 'station',
  },
  {
    id: 'targetFeedstock',
    title: 'Shoot The Right Targets',
    description: 'Collect enough feedstock-equivalent stock for one full Galaxy Bar production cycle.',
    detail: [
      'Exact total required for the full chain:',
      '- Water equivalent: 11',
      '- CO2 equivalent: 12',
      '- Carbon equivalent: 0.4',
      `Fast path: mine rubble, then run ${PROCESS_CATALOG.rockSorter.name} in ${sortingPath} to generate feedstocks in bulk.`,
      'Target Volatile Ice Chunks to collect water ice and CO2 ice.',
      'Target Carbon-rich Asteroids first to collect carbon rock quickly.',
      'Target Composite Junk Clusters as secondary carbon source.',
      'Water equivalent counts as: Water Ice + Water + (5 x Cellulose) + (11 x Galaxy Bars).',
      'CO2 equivalent counts as: CO2 Ice + CO2 Gas + (6 x Cellulose) + (12 x Galaxy Bars).',
      'Carbon equivalent counts as: Carbon Rock + Carbon + (0.4 x Galaxy Bars).',
      'Processing early is valid and still counts.',
    ].join('\n'),
    hint: `Fast path: ${sortingPath} > ${PROCESS_CATALOG.rockSorter.name}. This reduces grind dramatically.`,
    focusTarget: 'space-viewport',
  },
  {
    id: 'createWaterForRations',
    title: 'Create Water',
    description: 'Convert mined water ice into liquid water.',
    detail: [
      `Open ${hydrogenPath}.`,
      `Run ${PROCESS_CATALOG.iceMelter.name} to convert water ice -> water.`,
      'Repeat until Water reaches at least 11.',
    ].join('\n'),
    hint: `${hydrogenPath} > ${PROCESS_CATALOG.iceMelter.name}`,
    focusTarget: 'lab-run-ice-melter',
    labTab: 'hydrogen',
  },
  {
    id: 'createCo2GasForRations',
    title: 'Create CO2 Gas',
    description: 'Convert mined CO2 ice into CO2 gas for greenhouse processing.',
    detail: [
      `Open ${laboratoryPath} > Refining.`,
      `Run ${PROCESS_CATALOG.co2Sublimator.name} to convert CO2 ice -> CO2 gas.`,
      'Repeat until CO2 Gas reaches at least 12.',
    ].join('\n'),
    hint: `${laboratoryPath} > Refining > ${PROCESS_CATALOG.co2Sublimator.name}`,
    focusTarget: 'lab-run-co2-sublimator',
    labTab: 'refining',
  },
  {
    id: 'createCellulose',
    title: 'Create Cellulose',
    description: 'Run Greenhouse to synthesize cellulose for ration assembly.',
    detail: [
      `Open ${manufacturingPath}.`,
      'Ensure Water and CO2 Gas are available in inventory.',
      `Run ${PROCESS_CATALOG.greenhouse.name}.`,
      'Repeat until Cellulose reaches at least 2.',
      'If inputs are missing, return to Hydrogen and Refining to produce more.',
    ].join('\n'),
    hint: `${manufacturingPath} > ${PROCESS_CATALOG.greenhouse.name}`,
    focusTarget: 'lab-run-greenhouse',
    labTab: 'manufacturing',
  },
  {
    id: 'createCarbonForRations',
    title: 'Create Carbon',
    description: 'Refine carbon rock into usable carbon.',
    detail: [
      `Open ${laboratoryPath} > Refining.`,
      `Run ${PROCESS_CATALOG.carbonRefiner.name} to convert carbon rock -> carbon.`,
      'Repeat until Carbon reaches at least 0.4.',
    ].join('\n'),
    hint: `${laboratoryPath} > Refining > ${PROCESS_CATALOG.carbonRefiner.name}`,
    focusTarget: 'lab-run-carbon-refiner',
    labTab: 'refining',
  },
  {
    id: 'stageGalaxyBarIngredients',
    title: 'Stage Galaxy Bar Ingredients',
    description: 'Confirm all required ingredients are ready in inventory.',
    detail: [
      `Open ${manufacturingPath}.`,
      'Confirm Cellulose is at least 2.',
      'Confirm Water is at least 1.',
      'Confirm Carbon is at least 0.4.',
      'Confirm Energy reserve is at least 6.',
      'Start assembly only when all minimums are met.',
    ].join('\n'),
    hint: `${manufacturingPath} ingredient row should meet all minimums before assembly.`,
    focusTarget: 'lab-tab-manufacturing',
    labTab: 'manufacturing',
  },
  {
    id: 'craftGalaxyBar',
    title: 'Create The Galaxy Bar',
    description: 'Run Galaxy Bar Assembler to produce one crew ration.',
    detail: [
      `Open ${manufacturingPath}.`,
      `Run ${PROCESS_CATALOG.galaxyBarAssembler.name}.`,
      'Confirm one Galaxy Bar is added to inventory.',
    ].join('\n'),
    hint: `${manufacturingPath} > ${PROCESS_CATALOG.galaxyBarAssembler.name}`,
    focusTarget: 'lab-run-galaxy-bar-assembler',
    labTab: 'manufacturing',
  },
  {
    id: 'mineRubble',
    title: 'Mine Asteroid Rubble',
    description: 'Use the mining laser to break asteroids and collect rubble chunks.',
    detail: [
      'Aim at white asteroid targets.',
      'Fire your mining laser to break targets.',
      'Collect rubble from successful target breaks.',
      'Keep enough battery charge available while mining.',
    ].join('\n'),
    focusTarget: 'space-viewport',
  },
  {
    id: 'sortRubble',
    title: 'Run The Rock Sorter',
    description: 'Convert rubble into silica sand, iron ore, water ice, and other fractions.',
    detail: [
      `Open ${sortingPath}.`,
      `Run ${PROCESS_CATALOG.rockSorter.name} when rubble is available.`,
      'Confirm output includes silica sand, iron ore, and water ice.',
      'Repeat as needed to build processing feedstock.',
    ].join('\n'),
    hint: `${sortingPath} > ${PROCESS_CATALOG.rockSorter.name}`,
    focusTarget: 'lab-run-rock-sorter',
    labTab: 'sorting',
  },
  {
    id: 'electrolyzeWater',
    title: 'Make Hydrogen And Oxygen',
    description: 'Melt water ice and electrolyze water to produce neutral hydrogen and oxygen.',
    detail: [
      `Open ${hydrogenPath}.`,
      `Run ${PROCESS_CATALOG.iceMelter.name} to convert water ice into liquid water.`,
      `Run ${PROCESS_CATALOG.electrolyzer.name} to split water into hydrogen and oxygen.`,
      'Repeat until both outputs are present in inventory.',
    ].join('\n'),
    hint: `${hydrogenPath} > ${PROCESS_CATALOG.iceMelter.name}, then ${PROCESS_CATALOG.electrolyzer.name}`,
    focusTarget: 'lab-run-ice-melter',
    labTab: 'hydrogen',
  },
  {
    id: 'ionizeHydrogen',
    title: 'Stabilize Plasma',
    description: 'Ionize hydrogen and enable magnetic containment to control recombination.',
    detail: [
      `Open ${hydrogenPath}.`,
      `Run ${PROCESS_CATALOG.ionizer.name} to convert neutral hydrogen into ionized hydrogen.`,
      'Enable Magnetic Containment.',
      'Monitor energy so containment remains online.',
    ].join('\n'),
    hint: `${hydrogenPath} > ${PROCESS_CATALOG.ionizer.name}, then enable containment`,
    focusTarget: 'lab-run-ionizer',
    labTab: 'hydrogen',
  },
  {
    id: 'manufacturePart',
    title: 'Craft Your First Product',
    description: 'Build your first market-ready item in Manufacturing.',
    detail: [
      `Open ${manufacturingPath}.`,
      `Run ${PROCESS_CATALOG.boxOfSandPress.name} or another starter product node.`,
      'Confirm at least one manufactured product is added to inventory.',
    ].join('\n'),
    hint: `${manufacturingPath} > ${PROCESS_CATALOG.boxOfSandPress.name}`,
    focusTarget: 'lab-run-box-of-sand-press',
    labTab: 'manufacturing',
  },
]

export const mainQuestDefinitions: MainQuestDefinition[] = [
  {
    id: CONTROL_SHIP_QUEST_ID,
    title: 'Control The Ship',
    summary: 'Complete baseline flight checks before entering live orbital operations.',
    stepIds: [
      'lookAroundWithMouse',
      'strafeLeftAndRight',
      'strafeUpAndDown',
      'forwardReverseRun',
      'boostThroughRing',
      'lockOnTrainingDrone',
      'destroyTrainingDrone',
    ],
    rewards: [
      {
        id: 'reward-flight-clearance',
        label: 'Flight School Clearance',
        description: 'Unlocks Earth Corridor transfer authorization.',
        grants: {
          unlocks: ['Earth Corridor Transit'],
        },
      },
    ],
  },
  {
    id: CHARGE_SHIP_QUEST_ID,
    title: 'Charge The Ship',
    summary: 'Establish your first stable station charging loop.',
    stepIds: [
      'approachStationForCharging',
      'openStationTabForCharging',
      'engageCharging',
      'startCharging',
    ],
    rewards: [
      {
        id: 'reward-station-protocol',
        label: 'Docking Shortcut Package',
        description: 'Unlocks E Dock + E Charge shortcuts; Adds 5 Energy Cells to Cargo.',
        grants: {
          items: {
            energyCell: 5,
          },
          unlocks: ['Station E Dock + Charge'],
        },
      },
    ],
  },
  {
    id: FEED_THE_CREW_QUEST_ID,
    title: 'Feed The Crew',
    summary: 'Build your first food ration chain and keep the crew supplied.',
    stepIds: [
      'targetFeedstock',
      'createWaterForRations',
      'createCo2GasForRations',
      'createCellulose',
      'createCarbonForRations',
      'stageGalaxyBarIngredients',
      'craftGalaxyBar',
    ],
    rewards: [
      {
        id: 'reward-crew-ration-protocol',
        label: 'Fridge Unlock Package',
        description: `Unlocks Fridge; Adds ${FRIDGE_UNLOCK_REWARD_GALAXY_BARS} Galaxy Bars to Fridge.`,
        grants: {
          unlocks: ['Fridge'],
          fridge: {
            galaxyBars: FRIDGE_UNLOCK_REWARD_GALAXY_BARS,
          },
        },
      },
    ],
  },
  {
    id: ORBITAL_CLEANUP_QUEST_ID,
    title: 'Orbital Cleanup Protocol',
    summary: 'Run the full loop from in-space salvage to station processing and first manufactured product.',
    stepIds: [
      'approachHighRiskZone',
      'salvageCompositeJunk',
      'mineRubble',
      'returnToStation',
      'sortRubble',
      'electrolyzeWater',
      'ionizeHydrogen',
      'manufacturePart',
    ],
    rewards: [
      {
        id: 'reward-production-license',
        label: 'Manufacturing Starter Kit',
        description: 'Adds 1 Box of Sand to Cargo; Adds 1 Steel Ingot to Cargo.',
        grants: {
          items: {
            boxOfSand: 1,
            steelIngot: 1,
          },
        },
      },
    ],
  },
]

export const firstContractSideQuest: SideQuestDefinition = {
  id: FIRST_CONTRACT_SIDE_QUEST_ID,
  title: 'First Contract Delivery',
  summary: 'Deliver your first market item and start earning credits.',
  rewards: [
    {
      id: 'reward-first-contract',
      label: 'Contract Bonus Materials',
      description: 'Adds 1 Iron Metal to Cargo.',
      grants: {
        items: {
          ironMetal: 1,
        },
      },
    },
  ],
  steps: [
    {
      id: 'side-craft-first-contract-item',
      title: 'Craft a Box of Sand',
      description: 'Produce one Box of Sand in Manufacturing.',
      detail: [
        `Open ${manufacturingPath}.`,
        `Run ${PROCESS_CATALOG.boxOfSandPress.name}.`,
        'Ensure silica sand and energy requirements are satisfied before running.',
        'Confirm one Box of Sand is added to inventory.',
      ].join('\n'),
    },
    {
      id: 'side-sell-first-contract-item',
      title: 'Sell Any Product',
      description: 'Sell one manufactured product in the Store.',
      detail: [
        `Open ${marketPath}.`,
        'Sell one unit of any available product.',
        'Confirm credits increase after the sale.',
      ].join('\n'),
    },
  ],
}

export const galaxyBarAutomationSideQuest: SideQuestDefinition = {
  id: GALAXY_BAR_AUTOMATION_SIDE_QUEST_ID,
  title: "Ration Thrashin'",
  summary: 'Make 0/100 Galaxy Bars',
  rewards: [
    {
      id: 'reward-galaxy-bar-automation',
      label: 'Simplified Feeding',
      description: 'Unlocks Galaxy Bar automation controls.',
      grants: {
        unlocks: ['Galaxy Bar Automation'],
      },
    },
  ],
  steps: [],
}

export const sideQuestDefinitions: SideQuestDefinition[] = [
  firstContractSideQuest,
  galaxyBarAutomationSideQuest,
]

interface BuildQuestProgressInput {
  tutorialChecklist: TutorialChecklistItem[]
  tutorialCurrentStepIndex: number
  tutorialComplete: boolean
  activeMainQuestId?: string | null
  inventory: ResourceInventory
  credits: number
  energy: number
  galaxyBarsCrafted: number
}

function hasAtLeast(value: number | undefined, required: number): boolean {
  const epsilon = 1e-6
  return (value ?? 0) + epsilon >= required
}

function normalizeCraftedGalaxyBars(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.floor(value))
}

function makeGalaxyBarCounterLabel(value: number): string {
  const crafted = Math.min(100, normalizeCraftedGalaxyBars(value))
  return `${crafted}/100`
}

function resolveQuestStepCompletion(
  stepId: string,
  fallbackCompleted: boolean,
  inventory: ResourceInventory,
  credits: number,
  energy: number,
): boolean {
  switch (stepId) {
    case 'targetFeedstock':
      return isFeedCrewTargetFeedstockSatisfied(inventory)
    case 'createWaterForRations':
      return isFeedCrewCreateWaterSatisfied(inventory)
    case 'createCo2GasForRations':
      return isFeedCrewCreateCo2Satisfied(inventory)
    case 'createCellulose':
      return isFeedCrewCreateCelluloseSatisfied(inventory)
    case 'createCarbonForRations':
      return isFeedCrewCreateCarbonSatisfied(inventory)
    case 'stageGalaxyBarIngredients':
      return isFeedCrewStageIngredientsSatisfied(inventory, energy)
    case 'craftGalaxyBar':
      return isFeedCrewCraftGalaxyBarSatisfied(inventory)
    case 'mineRubble':
      return hasAtLeast(inventory.rubble, 6)
    case 'sortRubble':
      return (
        hasAtLeast(inventory.silicaSand, 0.0001)
        && hasAtLeast(inventory.ironOre, 0.0001)
        && hasAtLeast(inventory.waterIce, 0.0001)
      )
    case 'electrolyzeWater':
      return (
        hasAtLeast(inventory.hydrogenNeutral, 2)
        && hasAtLeast(inventory.oxygenGas, 1)
      )
    case 'ionizeHydrogen':
      return hasAtLeast(inventory.hydrogenIonized, 1)
    case 'manufacturePart':
      return (
        hasAtLeast(inventory.boxOfSand, 0.0001)
        || hasAtLeast(inventory.steelIngot, 0.0001)
        || hasAtLeast(inventory.energyCell, 0.0001)
        || hasAtLeast(inventory.glass, 0.0001)
        || hasAtLeast(inventory.steel, 0.0001)
        || hasAtLeast(inventory.wood, 0.0001)
      )
    case 'side-craft-first-contract-item':
      return hasAtLeast(inventory.boxOfSand, 0.0001) || credits > 0
    case 'side-sell-first-contract-item':
      return credits > 0
    default:
      return fallbackCompleted
  }
}

export function buildQuestProgressModel({
  tutorialChecklist,
  tutorialCurrentStepIndex,
  tutorialComplete,
  activeMainQuestId,
  inventory,
  credits,
  energy,
  galaxyBarsCrafted,
}: BuildQuestProgressInput): QuestProgressView[] {
  const stepsById = tutorialChecklist.reduce<Record<string, TutorialChecklistItem>>((map, step) => {
    map[step.id] = step
    return map
  }, {})
  const currentStepId = tutorialComplete
    ? null
    : tutorialChecklist[tutorialCurrentStepIndex]?.id ?? null
  const requestedActiveMainQuestId = typeof activeMainQuestId === 'string'
    && mainQuestDefinitions.some((quest) => quest.id === activeMainQuestId)
    ? activeMainQuestId
    : null

  const mainQuestDraft = mainQuestDefinitions.map((quest) => {
    const steps: QuestStepProgress[] = []
    quest.stepIds.forEach((stepId) => {
      const step = stepsById[stepId]
      if (!step) {
        return
      }

      steps.push({
        id: step.id,
        title: step.title,
        description: step.description,
        detail: step.detail,
        hint: step.hint,
        focusTarget: step.focusTarget,
        labTab: step.labTab,
        completed: resolveQuestStepCompletion(
          step.id,
          step.completed,
          inventory,
          credits,
          energy,
        ),
        current: false,
      })
    })

    return {
      quest,
      steps,
      completed: steps.length > 0 && steps.every((step) => step.completed),
    }
  })

  const fallbackActiveMainQuestId = mainQuestDraft.find((entry) => !entry.completed)?.quest.id
    ?? mainQuestDraft.at(-1)?.quest.id
    ?? null
  const requestedActiveMainQuest = requestedActiveMainQuestId
    ? mainQuestDraft.find((entry) => entry.quest.id === requestedActiveMainQuestId) ?? null
    : null
  const resolvedActiveMainQuestId =
    requestedActiveMainQuest && !requestedActiveMainQuest.completed
      ? requestedActiveMainQuest.quest.id
      : fallbackActiveMainQuestId

  const mainQuests: QuestProgressView[] = mainQuestDraft.map((entry) => {
    const isActiveMainQuest = entry.quest.id === resolvedActiveMainQuestId
    const firstIncompleteIndex = entry.steps.findIndex((step) => !step.completed)
    const currentStepIndexByGlobalProgress =
      !tutorialComplete && isActiveMainQuest && currentStepId
        ? entry.steps.findIndex((step) => step.id === currentStepId && !step.completed)
        : -1
    const currentStepIndex =
      !tutorialComplete && isActiveMainQuest
        ? currentStepIndexByGlobalProgress >= 0
          ? currentStepIndexByGlobalProgress
          : firstIncompleteIndex
        : -1
    const steps = entry.steps.map((step, stepIndex) => ({
      ...step,
      current: stepIndex === currentStepIndex,
    }))

    return {
      id: entry.quest.id,
      title: entry.quest.title,
      type: 'Main Quest',
      summary: entry.quest.summary,
      rewards: entry.quest.rewards,
      completed: entry.completed,
      current: isActiveMainQuest,
      steps,
    }
  })

  const sideQuests = sideQuestDefinitions.map((sideQuestDefinition) => {
    const sideQuestSteps: QuestStepProgress[] = sideQuestDefinition.steps.map((step) => {
      const completed = resolveQuestStepCompletion(
        step.id,
        false,
        inventory,
        credits,
        energy,
      )

      if (sideQuestDefinition.id === FIRST_CONTRACT_SIDE_QUEST_ID) {
        if (step.id === 'side-craft-first-contract-item') {
          return {
            ...step,
            completed,
            current: !completed,
          }
        }

        const current =
          !completed &&
          ((inventory.boxOfSand ?? 0) > 0 ||
            (inventory.steelIngot ?? 0) > 0 ||
            (inventory.energyCell ?? 0) > 0)

        return {
          ...step,
          completed,
          current,
        }
      }

      return {
        ...step,
        completed,
        current: !completed,
      }
    })

    const isGalaxyBarAutomationQuest =
      sideQuestDefinition.id === GALAXY_BAR_AUTOMATION_SIDE_QUEST_ID
    const galaxyBarAutomationCompleted = hasAtLeast(galaxyBarsCrafted, 100)
    const galaxyBarAutomationStarted = hasAtLeast(galaxyBarsCrafted, 1)

    return {
      id: sideQuestDefinition.id,
      title: sideQuestDefinition.title,
      type: 'Side Quest' as const,
      summary: isGalaxyBarAutomationQuest
        ? `Make ${makeGalaxyBarCounterLabel(galaxyBarsCrafted)} Galaxy Bars`
        : sideQuestDefinition.summary,
      rewards: sideQuestDefinition.rewards,
      completed: isGalaxyBarAutomationQuest
        ? galaxyBarAutomationCompleted
        : sideQuestSteps.every((step) => step.completed),
      current: isGalaxyBarAutomationQuest
        ? galaxyBarAutomationStarted && !galaxyBarAutomationCompleted
        : sideQuestSteps.some((step) => step.current),
      steps: sideQuestSteps,
    }
  })

  return [...mainQuests, ...sideQuests]
}
