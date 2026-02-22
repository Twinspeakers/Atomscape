import { useMemo } from 'react'
import { PROCESS_CATALOG, type ProcessId } from '@domain/spec/processCatalog'
import { formatQty, resourceById, type ResourceId } from '@domain/resources/resourceCatalog'
import { useAppStore } from '@state/store'
import type { LabTab } from '@state/types'

interface LaboratoryOverlayProps {
  onClose?: () => void
  embedded?: boolean
}

function tabButtonClass(isActive: boolean): string {
  return [
    'ui-action-button transition-colors',
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
    <div className="ui-surface-card-strong px-2.5 py-2">
      <p className="ui-note">{definition.label}</p>
      <p className="ui-body-copy font-semibold text-slate-100">{formatQty(value)} {definition.unit}</p>
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
  const canRun = blockedReason === null

  return (
    <div className="ui-surface-card ui-stack-xs">
      <button
        data-tutorial-focus={action.tutorialFocus}
        onClick={canRun ? action.onRun : undefined}
        disabled={!canRun}
        className={canRun ? nodeButtonClass() : blockedButtonClass()}
      >
        {action.label ?? process.name}
      </button>
      <p className="ui-note">Requires: {requirements}</p>
      {!canRun && <p className="ui-note text-amber-300">Blocked: {blockedReason}</p>}
    </div>
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
  const maxEnergy = useAppStore((state) => state.maxEnergy)

  const setContainmentOn = useAppStore((state) => state.setContainmentOn)
  const setContainmentPower = useAppStore((state) => state.setContainmentPower)
  const setLabActiveTab = useAppStore((state) => state.setLabActiveTab)

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

  const energyPercent = useMemo(() => {
    if (maxEnergy <= 0) {
      return 0
    }

    return Math.max(0, Math.min(100, (energy / maxEnergy) * 100))
  }, [energy, maxEnergy])

  const labProcessTabs: LabTab[] = ['sorting', 'hydrogen', 'refining', 'manufacturing', 'atoms']
  const resolvedActiveTab = labProcessTabs.includes(activeTab) ? activeTab : 'sorting'
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
    : 'panel-shell pointer-events-auto absolute right-0 top-0 h-full w-[clamp(380px,34vw,620px)] rounded-l-xl px-4 py-4'
  const contentClass = embedded
    ? 'ui-content-scroll min-h-0 flex-1 overflow-auto'
    : 'ui-content-scroll h-[calc(100%-186px)] overflow-auto'

  return (
    <aside className={`${shellClass} ui-stack-sm`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="ui-title">Laboratory</h2>
        {onClose && (
          <button onClick={onClose} className="ui-action-button-sm rounded bg-slate-900/80 text-slate-200 hover:bg-slate-800/80">
            Close
          </button>
        )}
      </div>

      <div className="ui-surface-card mb-3">
        <div className="mb-1 flex items-center justify-between ui-body-copy">
          <span>Battery</span>
          <span>{formatQty(energy)} / {formatQty(maxEnergy)} energy</span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-slate-900/80">
          <div className="h-full bg-slate-300/80 transition-all" style={{ width: `${energyPercent}%` }} />
        </div>
        <p className="ui-note mt-2">
          Lab processes consume battery energy. Use Station (P) for charging and docking operations.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {([
          ['sorting', 'Mining + Sorting'],
          ['hydrogen', 'Hydrogen'],
          ['refining', 'Refining'],
          ['manufacturing', 'Manufacture'],
          ['atoms', 'Atom Counter'],
        ] as [LabTab, string][]).map(([tabId, label]) => (
          <button
            key={tabId}
            data-tutorial-focus={`lab-tab-${tabId}`}
            onClick={() => setLabActiveTab(tabId)}
            className={tabButtonClass(resolvedActiveTab === tabId)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={contentClass}>
        {resolvedActiveTab === 'sorting' && (
          <div className="ui-stack-md">
            <p className="ui-body-copy">
              Mine targets in space to gather rubble, then separate it into processable asteroid fractions.
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {sortingActions.map((action) => (
                <ProcessActionButton
                  key={action.processId}
                  action={action}
                  inventory={inventory}
                  energy={energy}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <ResourcePill inventory={inventory} resourceId="rubble" />
              <ResourcePill inventory={inventory} resourceId="slagWaste" />
              <ResourcePill inventory={inventory} resourceId="silicaSand" />
              <ResourcePill inventory={inventory} resourceId="ironOre" />
              <ResourcePill inventory={inventory} resourceId="waterIce" />
              <ResourcePill inventory={inventory} resourceId="co2Ice" />
              <ResourcePill inventory={inventory} resourceId="carbonRock" />
            </div>
          </div>
        )}

        {resolvedActiveTab === 'hydrogen' && (
          <div className="ui-stack-md">
            <div className="grid grid-cols-1 gap-2.5">
              {hydrogenActions.map((action) => (
                <ProcessActionButton
                  key={action.processId}
                  action={action}
                  inventory={inventory}
                  energy={energy}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <ResourcePill inventory={inventory} resourceId="waterIce" />
              <ResourcePill inventory={inventory} resourceId="water" />
              <ResourcePill inventory={inventory} resourceId="hydrogenNeutral" />
              <ResourcePill inventory={inventory} resourceId="hydrogenIonized" />
              <ResourcePill inventory={inventory} resourceId="oxygenGas" />
            </div>
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
          </div>
        )}

        {resolvedActiveTab === 'refining' && (
          <div className="ui-stack-md">
            <div className="grid grid-cols-1 gap-2.5">
              {refiningActions.map((action) => (
                <ProcessActionButton
                  key={action.processId}
                  action={action}
                  inventory={inventory}
                  energy={energy}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <ResourcePill inventory={inventory} resourceId="co2Ice" />
              <ResourcePill inventory={inventory} resourceId="co2Gas" />
              <ResourcePill inventory={inventory} resourceId="carbonRock" />
              <ResourcePill inventory={inventory} resourceId="carbon" />
              <ResourcePill inventory={inventory} resourceId="ironOre" />
              <ResourcePill inventory={inventory} resourceId="ironMetal" />
              <ResourcePill inventory={inventory} resourceId="coGas" />
              <ResourcePill inventory={inventory} resourceId="oxygenGas" />
            </div>
          </div>
        )}

        {resolvedActiveTab === 'manufacturing' && (
          <div className="ui-stack-md">
            <div className="ui-surface-card">
              <p className="ui-label mb-2">Starter Manufacturing</p>
              <div className="mb-2 grid grid-cols-1 gap-2.5">
                {starterManufacturingActions.map((action) => (
                  <ProcessActionButton
                    key={action.processId}
                    action={action}
                    inventory={inventory}
                    energy={energy}
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-1 ui-body-copy">
                <p>Box of Sand: 6 silica sand + 3 energy to produce 1 box</p>
                <p>Steel Ingot: 2 steel + 4 energy to produce 1 ingot</p>
                <p>Energy Cell: 6 ionized H + 1 carbon + 1 iron metal + 9 energy to produce 1 cell</p>
                <p>Galaxy Bar: 2 cellulose + 1 water + 0.4 carbon + 6 energy to produce 1 ration</p>
              </div>
            </div>

            <div className="ui-surface-card">
              <p className="ui-label mb-2">Extended Manufacturing Chain</p>
              <div className="grid grid-cols-1 gap-2.5">
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

            <div className="grid grid-cols-2 gap-2.5">
              <ResourcePill inventory={inventory} resourceId="boxOfSand" />
              <ResourcePill inventory={inventory} resourceId="steelIngot" />
              <ResourcePill inventory={inventory} resourceId="energyCell" />
              <ResourcePill inventory={inventory} resourceId="galaxyBar" />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <ResourcePill inventory={inventory} resourceId="silicaSand" />
              <ResourcePill inventory={inventory} resourceId="glass" />
              <ResourcePill inventory={inventory} resourceId="ironMetal" />
              <ResourcePill inventory={inventory} resourceId="steel" />
              <ResourcePill inventory={inventory} resourceId="cellulose" />
              <ResourcePill inventory={inventory} resourceId="wood" />
              <ResourcePill inventory={inventory} resourceId="co2Gas" />
              <ResourcePill inventory={inventory} resourceId="water" />
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
      </div>
    </aside>
  )
}


