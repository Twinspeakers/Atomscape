import { PROCESS_CATALOG, type ProcessId } from '@domain/spec/processCatalog'
import { formatQty, resourceById, type ResourceId } from '@domain/resources/resourceCatalog'
import { GALAXY_BAR_AUTOMATION_SIDE_QUEST_ID } from '@features/quests/questDefinitions'
import { useAppStore } from '@state/store'
import { ResourceIcon } from '../resources/ResourceIcon'

interface LaboratoryOverlayProps {
  onClose?: () => void
  embedded?: boolean
}

type LaboratoryViewTab = 'sorting' | 'hydrogen' | 'refining' | 'manufacturing' | 'atoms'

interface LaboratoryTabMeta {
  label: string
  iconResourceId: ResourceId
  description: string
}

const LAB_TAB_META: Record<LaboratoryViewTab, LaboratoryTabMeta> = {
  sorting: {
    label: 'Mining + Sorting',
    iconResourceId: 'rubble',
    description: 'Break down rubble into core feedstocks before downstream chemistry.',
  },
  hydrogen: {
    label: 'Hydrogen',
    iconResourceId: 'hydrogenIonized',
    description: 'Run water splitting and plasma containment operations.',
  },
  refining: {
    label: 'Refining',
    iconResourceId: 'ironMetal',
    description: 'Convert raw asteroid fractions into stable industrial inputs.',
  },
  manufacturing: {
    label: 'Manufacture',
    iconResourceId: 'galaxyBar',
    description: 'Craft finished products and manage Galaxy Bar production automation.',
  },
  atoms: {
    label: 'Atom Counter',
    iconResourceId: 'carbon',
    description: 'Track conservation of H/C/O/Si/Fe across your entire inventory.',
  },
}

const LAB_TABS = Object.keys(LAB_TAB_META) as LaboratoryViewTab[]

const LAB_OUTPUT_RESOURCE_IDS: Record<LaboratoryViewTab, ResourceId[]> = {
  sorting: ['rubble', 'silicaSand', 'ironOre', 'waterIce', 'co2Ice', 'carbonRock', 'slagWaste'],
  hydrogen: ['waterIce', 'water', 'hydrogenNeutral', 'hydrogenIonized', 'oxygenGas'],
  refining: ['co2Ice', 'co2Gas', 'carbonRock', 'carbon', 'ironOre', 'ironMetal', 'coGas', 'oxygenGas'],
  manufacturing: ['boxOfSand', 'steelIngot', 'energyCell', 'galaxyBar', 'glass', 'steel', 'cellulose', 'wood'],
  atoms: ['hydrogenNeutral', 'hydrogenIonized', 'oxygenGas', 'carbon', 'silicaSand', 'ironMetal'],
}

function tabButtonClass(isActive: boolean): string {
  return [
    'ui-action-button flex items-center gap-1.5 transition-colors',
    isActive
      ? 'bg-slate-200/15 text-slate-100'
      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800/80',
  ].join(' ')
}

function nodeButtonClass(): string {
  return 'ui-action-button bg-slate-900/70 text-slate-100 hover:bg-slate-800/80'
}

function blockedButtonClass(): string {
  return 'ui-action-button cursor-not-allowed bg-slate-950/70 text-slate-500'
}

function ResourcePill({ inventory, resourceId }: { inventory: Partial<Record<ResourceId, number>>; resourceId: ResourceId }) {
  const definition = resourceById[resourceId]
  const value = inventory[resourceId] ?? 0

  return (
    <div className="ui-surface-card-strong grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 px-2.5 py-2">
      <ResourceIcon resourceId={resourceId} size={28} className="shrink-0" />
      <div className="min-w-0">
        <p className="ui-note truncate">{definition.label}</p>
        <p className="ui-body-copy font-semibold text-slate-100">{formatQty(value)} {definition.unit}</p>
      </div>
    </div>
  )
}

interface ProcessActionConfig {
  processId: ProcessId
  label?: string
  tutorialFocus?: string
  onRun: () => void
}

function processEnergyCost(processId: ProcessId): number {
  const process = PROCESS_CATALOG[processId]
  return 'energyCost' in process ? process.energyCost ?? 0 : 0
}

function processPrimaryOutputResource(processId: ProcessId): ResourceId {
  const process = PROCESS_CATALOG[processId]
  const outputRows = Object.entries(process.produce ?? {}) as Array<[ResourceId, number]>
  const positiveRows = outputRows.filter(([, amount]) => amount > 0)
  if (positiveRows.length === 0) {
    return 'rubble'
  }

  const [resourceId] = positiveRows.sort(([, left], [, right]) => right - left)[0]
  return resourceId
}

function processRequirementText(processId: ProcessId): string {
  const process = PROCESS_CATALOG[processId]
  const requirements: string[] = []

  const consumeRows = Object.entries(process.consume ?? {}) as Array<[ResourceId, number]>
  consumeRows.forEach(([resourceId, amount]) => {
    if (amount > 0) {
      requirements.push(`${formatQty(amount)} ${resourceById[resourceId].label}`)
    }
  })

  const energyCost = processEnergyCost(processId)
  if (energyCost > 0) {
    requirements.push(`${formatQty(energyCost)} energy`)
  }

  return requirements.length > 0 ? requirements.join(' + ') : 'No prerequisites'
}

function processOutputText(processId: ProcessId): string {
  const process = PROCESS_CATALOG[processId]
  const outputRows = Object.entries(process.produce ?? {}) as Array<[ResourceId, number]>
  if (outputRows.length === 0) {
    return 'No output'
  }

  return outputRows
    .filter(([, amount]) => amount > 0)
    .map(([resourceId, amount]) => `${formatQty(amount)} ${resourceById[resourceId].label}`)
    .join(' + ')
}

function processBlockedReason(
  processId: ProcessId,
  inventory: Partial<Record<ResourceId, number>>,
  energy: number,
): string | null {
  const process = PROCESS_CATALOG[processId]
  const energyCost = processEnergyCost(processId)

  if (energyCost > 0 && energy < energyCost) {
    return `Need ${formatQty(energyCost)} energy (have ${formatQty(energy)}).`
  }

  const consumeRows = Object.entries(process.consume ?? {}) as Array<[ResourceId, number]>
  const missingRows = consumeRows.filter(([resourceId, amount]) => (inventory[resourceId] ?? 0) < amount)

  if (missingRows.length === 0) {
    return null
  }

  return missingRows
    .map(([resourceId, amount]) => {
      const available = inventory[resourceId] ?? 0
      return `${resourceById[resourceId].label}: ${formatQty(available)} / ${formatQty(amount)}`
    })
    .join(' | ')
}

function ProcessActionButton({
  action,
  inventory,
  energy,
}: {
  action: ProcessActionConfig
  inventory: Partial<Record<ResourceId, number>>
  energy: number
}) {
  const process = PROCESS_CATALOG[action.processId]
  const blockedReason = processBlockedReason(action.processId, inventory, energy)
  const requirements = processRequirementText(action.processId)
  const outputs = processOutputText(action.processId)
  const outputResourceId = processPrimaryOutputResource(action.processId)
  const canRun = blockedReason === null

  return (
    <article className="ui-surface-card-strong px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ResourceIcon resourceId={outputResourceId} size={28} className="shrink-0" />
            <p className="ui-body-copy font-semibold text-slate-100">{action.label ?? process.name}</p>
          </div>
          <p className="ui-note mt-1">Output: {outputs}</p>
          <p className="ui-note mt-1">Input: {requirements}</p>
          {!canRun && <p className="ui-note mt-1 text-amber-300">Blocked: {blockedReason}</p>}
        </div>
        <button
          data-tutorial-focus={action.tutorialFocus}
          onClick={canRun ? action.onRun : undefined}
          disabled={!canRun}
          className={canRun ? 'ui-action-button-sm shrink-0 px-2 py-1' : 'ui-action-button-sm shrink-0 cursor-not-allowed px-2 py-1 text-slate-500'}
        >
          Run
        </button>
      </div>
    </article>
  )
}

export function LaboratoryOverlay({ onClose, embedded = false }: LaboratoryOverlayProps) {
  const inventory = useAppStore((state) => state.inventory)
  const energy = useAppStore((state) => state.energy)
  const activeTab = useAppStore((state) => state.labActiveTab)
  const containmentOn = useAppStore((state) => state.containmentOn)
  const containmentPower = useAppStore((state) => state.containmentPower)
  const simulationSummary = useAppStore((state) => state.simulationSummary)
  const atomCounter = useAppStore((state) => state.atomCounter)
  const claimedQuestRewardIds = useAppStore((state) => state.claimedQuestRewardIds)
  const galaxyBarAutomationEnabled = useAppStore((state) => state.galaxyBarAutomationEnabled)
  const galaxyBarsCrafted = useAppStore((state) => state.galaxyBarsCrafted)

  const setContainmentOn = useAppStore((state) => state.setContainmentOn)
  const setContainmentPower = useAppStore((state) => state.setContainmentPower)
  const setLabActiveTab = useAppStore((state) => state.setLabActiveTab)
  const setGalaxyBarAutomationEnabled = useAppStore((state) => state.setGalaxyBarAutomationEnabled)

  const runRockSorter = useAppStore((state) => state.runRockSorter)
  const runIceMelter = useAppStore((state) => state.runIceMelter)
  const runElectrolyzer = useAppStore((state) => state.runElectrolyzer)
  const runIonizer = useAppStore((state) => state.runIonizer)
  const runCo2Sublimator = useAppStore((state) => state.runCo2Sublimator)
  const runCarbonRefiner = useAppStore((state) => state.runCarbonRefiner)
  const runBlastFurnace = useAppStore((state) => state.runBlastFurnace)
  const runCoBurner = useAppStore((state) => state.runCoBurner)
  const runGlassForge = useAppStore((state) => state.runGlassForge)
  const runSteelMill = useAppStore((state) => state.runSteelMill)
  const runGreenhouse = useAppStore((state) => state.runGreenhouse)
  const runWoodWorkshop = useAppStore((state) => state.runWoodWorkshop)
  const runGalaxyBarAssembler = useAppStore((state) => state.runGalaxyBarAssembler)
  const runBoxOfSandPress = useAppStore((state) => state.runBoxOfSandPress)
  const runSteelIngotCaster = useAppStore((state) => state.runSteelIngotCaster)
  const runEnergyCellAssembler = useAppStore((state) => state.runEnergyCellAssembler)
  const galaxyBarAutomationUnlocked = claimedQuestRewardIds.includes(
    GALAXY_BAR_AUTOMATION_SIDE_QUEST_ID,
  )
  const galaxyBarAutomationProgress = Math.min(100, Math.max(0, Math.floor(galaxyBarsCrafted)))
  const sortingActions: ProcessActionConfig[] = [
    {
      processId: 'rockSorter',
      tutorialFocus: 'lab-run-rock-sorter',
      onRun: runRockSorter,
    },
  ]
  const hydrogenActions: ProcessActionConfig[] = [
    {
      processId: 'iceMelter',
      tutorialFocus: 'lab-run-ice-melter',
      onRun: runIceMelter,
    },
    {
      processId: 'electrolyzer',
      tutorialFocus: 'lab-run-electrolyzer',
      onRun: runElectrolyzer,
    },
    {
      processId: 'ionizer',
      tutorialFocus: 'lab-run-ionizer',
      onRun: runIonizer,
    },
  ]
  const refiningActions: ProcessActionConfig[] = [
    {
      processId: 'co2Sublimator',
      tutorialFocus: 'lab-run-co2-sublimator',
      onRun: runCo2Sublimator,
    },
    {
      processId: 'carbonRefiner',
      tutorialFocus: 'lab-run-carbon-refiner',
      onRun: runCarbonRefiner,
    },
    { processId: 'blastFurnace', onRun: runBlastFurnace },
    { processId: 'coBurner', onRun: runCoBurner },
  ]
  const starterManufacturingActions: ProcessActionConfig[] = [
    {
      processId: 'boxOfSandPress',
      tutorialFocus: 'lab-run-box-of-sand-press',
      onRun: runBoxOfSandPress,
    },
    { processId: 'steelIngotCaster', onRun: runSteelIngotCaster },
    { processId: 'energyCellAssembler', onRun: runEnergyCellAssembler },
    {
      processId: 'galaxyBarAssembler',
      tutorialFocus: 'lab-run-galaxy-bar-assembler',
      onRun: runGalaxyBarAssembler,
    },
  ]
  const extendedManufacturingActions: ProcessActionConfig[] = [
    {
      processId: 'glassForge',
      tutorialFocus: 'lab-run-glass-forge',
      onRun: runGlassForge,
    },
    { processId: 'steelMill', onRun: runSteelMill },
    {
      processId: 'greenhouse',
      tutorialFocus: 'lab-run-greenhouse',
      onRun: runGreenhouse,
    },
    { processId: 'woodWorkshop', onRun: runWoodWorkshop },
  ]

  const shellClass = embedded
    ? 'panel-shell flex h-full min-h-0 flex-col rounded-xl p-3.5'
    : 'panel-shell pointer-events-auto absolute right-0 top-0 h-full w-[clamp(360px,32vw,560px)] rounded-l-xl px-4 py-4'
  const contentClass = embedded
    ? 'ui-content-scroll min-h-0 flex-1 overflow-auto'
    : 'ui-content-scroll h-[calc(100%-168px)] overflow-auto'
  const resolvedActiveTab: LaboratoryViewTab = LAB_TABS.includes(activeTab as LaboratoryViewTab)
    ? activeTab as LaboratoryViewTab
    : 'sorting'
  const activeTabMeta = LAB_TAB_META[resolvedActiveTab]
  const sidebarResourceIds = LAB_OUTPUT_RESOURCE_IDS[resolvedActiveTab]
  const processGridClass = 'grid grid-cols-1 gap-2.5 md:grid-cols-2'

  return (
    <aside className={`${shellClass} ui-stack-sm`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="ui-title">Laboratory</h2>
        {onClose && (
          <button onClick={onClose} className="ui-action-button-sm rounded bg-slate-900/80 text-slate-200 hover:bg-slate-800/80">
            Close
          </button>
        )}
      </div>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {LAB_TABS.map((tabId) => {
          const tabMeta = LAB_TAB_META[tabId]
          return (
            <button
              key={tabId}
              data-tutorial-focus={`lab-tab-${tabId}`}
              onClick={() => setLabActiveTab(tabId)}
              className={tabButtonClass(resolvedActiveTab === tabId)}
            >
              <ResourceIcon resourceId={tabMeta.iconResourceId} size={24} className="shrink-0" />
              <span>{tabMeta.label}</span>
            </button>
          )
        })}
      </div>

      <div className={contentClass}>
        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.85fr)]">
          <section className="ui-stack-md max-w-[760px]">
            <div className="ui-surface-card">
              <div className="flex items-center gap-2">
                <ResourceIcon resourceId={activeTabMeta.iconResourceId} size={26} className="shrink-0" />
                <p className="ui-label">{activeTabMeta.label}</p>
              </div>
              <p className="ui-note mt-1">{activeTabMeta.description}</p>
            </div>

            {resolvedActiveTab === 'sorting' && (
              <div className={processGridClass}>
                {sortingActions.map((action) => (
                  <ProcessActionButton
                    key={action.processId}
                    action={action}
                    inventory={inventory}
                    energy={energy}
                  />
                ))}
              </div>
            )}

            {resolvedActiveTab === 'hydrogen' && (
              <div className={processGridClass}>
                {hydrogenActions.map((action) => (
                  <ProcessActionButton
                    key={action.processId}
                    action={action}
                    inventory={inventory}
                    energy={energy}
                  />
                ))}
              </div>
            )}

            {resolvedActiveTab === 'refining' && (
              <div className={processGridClass}>
                {refiningActions.map((action) => (
                  <ProcessActionButton
                    key={action.processId}
                    action={action}
                    inventory={inventory}
                    energy={energy}
                  />
                ))}
              </div>
            )}

            {resolvedActiveTab === 'manufacturing' && (
              <div className="ui-stack-md">
                <div>
                  <p className="ui-label mb-2">Starter Nodes</p>
                  <div className={processGridClass}>
                    {starterManufacturingActions.map((action) => (
                      <ProcessActionButton
                        key={action.processId}
                        action={action}
                        inventory={inventory}
                        energy={energy}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="ui-label mb-2">Extended Nodes</p>
                  <div className={processGridClass}>
                    {extendedManufacturingActions.map((action) => (
                      <ProcessActionButton
                        key={action.processId}
                        action={action}
                        inventory={inventory}
                        energy={energy}
                      />
                    ))}
                  </div>
                </div>

                <div className="ui-surface-card">
                  <p className="ui-label mb-1">Quick Recipes</p>
                  <div className="grid grid-cols-1 gap-1 ui-note">
                    <p>Box of Sand: 6 silica sand + 3 energy -&gt; 1 box</p>
                    <p>Steel Ingot: 2 steel + 4 energy -&gt; 1 ingot</p>
                    <p>Energy Cell: 6 ionized H + 1 carbon + 1 iron metal + 9 energy -&gt; 1 cell</p>
                    <p>Galaxy Bar: 2 cellulose + 1 water + 0.4 carbon + 6 energy -&gt; 1 ration</p>
                  </div>
                </div>
              </div>
            )}

            {resolvedActiveTab === 'atoms' && (
              <div className="ui-stack-md">
                <p className="ui-body-copy">
                  Atom counter tracks H/C/O/Si/Fe across all stored compounds and hydrogen states. Balanced processes only move atoms between containers.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="ui-surface-card">
                    <p className="ui-note">Hydrogen</p>
                    <p className="ui-title">{formatQty(atomCounter.H)}</p>
                  </div>
                  <div className="ui-surface-card">
                    <p className="ui-note">Carbon</p>
                    <p className="ui-title">{formatQty(atomCounter.C)}</p>
                  </div>
                  <div className="ui-surface-card">
                    <p className="ui-note">Oxygen</p>
                    <p className="ui-title">{formatQty(atomCounter.O)}</p>
                  </div>
                  <div className="ui-surface-card">
                    <p className="ui-note">Silicon</p>
                    <p className="ui-title">{formatQty(atomCounter.Si)}</p>
                  </div>
                  <div className="ui-surface-card">
                    <p className="ui-note">Iron</p>
                    <p className="ui-title">{formatQty(atomCounter.Fe)}</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="ui-stack-md xl:sticky xl:top-0">
            <div className="ui-surface-card">
              <p className="ui-label">Live Outputs</p>
              <p className="ui-note mt-1">Focused materials for {activeTabMeta.label}.</p>
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {sidebarResourceIds.map((resourceId) => (
                  <ResourcePill key={resourceId} inventory={inventory} resourceId={resourceId} />
                ))}
              </div>
            </div>

            {resolvedActiveTab === 'hydrogen' && (
              <div className="ui-surface-card">
                <div className="mb-2 flex items-center justify-between">
                  <span className="ui-body-copy">Magnetic Containment</span>
                  <button
                    data-tutorial-focus="lab-toggle-containment"
                    onClick={() => setContainmentOn(!containmentOn)}
                    className={nodeButtonClass()}
                  >
                    {containmentOn ? 'Disable' : 'Enable'}
                  </button>
                </div>
                <label className="ui-note mb-1 block">Containment Power: {containmentPower.toFixed(0)}%</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={containmentPower}
                  onChange={(event) => setContainmentPower(Number(event.target.value))}
                  className="w-full"
                />
                <p className="ui-note mt-1">
                  Recombination: {(simulationSummary.recombinationRate * 100).toFixed(2)}%/sec
                </p>
              </div>
            )}

            {resolvedActiveTab === 'manufacturing' && (
              <div className="ui-surface-card">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="ui-label">Galaxy Bar Automation</p>
                  <button
                    onClick={() => setGalaxyBarAutomationEnabled(!galaxyBarAutomationEnabled)}
                    disabled={!galaxyBarAutomationUnlocked}
                    className={
                      galaxyBarAutomationUnlocked
                        ? nodeButtonClass()
                        : blockedButtonClass()
                    }
                  >
                    {galaxyBarAutomationEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
                <p className="ui-note">Progress: {galaxyBarAutomationProgress}/100 Galaxy Bars crafted.</p>
                <p className="ui-note">
                  Status: {galaxyBarAutomationUnlocked
                    ? galaxyBarAutomationEnabled ? 'Enabled' : 'Unlocked'
                    : 'Locked'}
                </p>
                {!galaxyBarAutomationUnlocked && (
                  <p className="ui-note text-amber-300">
                    Unlock requirement: complete side quest "Make 100 Galaxy Bars".
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </aside>
  )
}


