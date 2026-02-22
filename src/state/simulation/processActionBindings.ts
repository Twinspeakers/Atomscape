import { PROCESS_CATALOG, type ProcessRunOptions } from '@domain/spec/processCatalog'

export interface ProcessActionBindings {
  runRockSorter: () => void
  runIceMelter: () => void
  runElectrolyzer: () => void
  runIonizer: () => void
  runCo2Sublimator: () => void
  runCarbonRefiner: () => void
  runBlastFurnace: () => void
  runCoBurner: () => void
  runGlassForge: () => void
  runSteelMill: () => void
  runGreenhouse: () => void
  runWoodWorkshop: () => void
  runGalaxyBarAssembler: () => void
  runBoxOfSandPress: () => void
  runSteelIngotCaster: () => void
  runEnergyCellAssembler: () => void
}

interface BuildProcessActionBindingsOptions {
  runProcess: (options: ProcessRunOptions) => void
}

export function buildProcessActionBindings(
  options: BuildProcessActionBindingsOptions,
): ProcessActionBindings {
  return {
    runRockSorter: () => {
      options.runProcess(PROCESS_CATALOG.rockSorter)
    },
    runIceMelter: () => {
      options.runProcess(PROCESS_CATALOG.iceMelter)
    },
    runElectrolyzer: () => {
      options.runProcess(PROCESS_CATALOG.electrolyzer)
    },
    runIonizer: () => {
      options.runProcess(PROCESS_CATALOG.ionizer)
    },
    runCo2Sublimator: () => {
      options.runProcess(PROCESS_CATALOG.co2Sublimator)
    },
    runCarbonRefiner: () => {
      options.runProcess(PROCESS_CATALOG.carbonRefiner)
    },
    runBlastFurnace: () => {
      options.runProcess(PROCESS_CATALOG.blastFurnace)
    },
    runCoBurner: () => {
      options.runProcess(PROCESS_CATALOG.coBurner)
    },
    runGlassForge: () => {
      options.runProcess(PROCESS_CATALOG.glassForge)
    },
    runSteelMill: () => {
      options.runProcess(PROCESS_CATALOG.steelMill)
    },
    runGreenhouse: () => {
      options.runProcess(PROCESS_CATALOG.greenhouse)
    },
    runWoodWorkshop: () => {
      options.runProcess(PROCESS_CATALOG.woodWorkshop)
    },
    runGalaxyBarAssembler: () => {
      options.runProcess(PROCESS_CATALOG.galaxyBarAssembler)
    },
    runBoxOfSandPress: () => {
      options.runProcess(PROCESS_CATALOG.boxOfSandPress)
    },
    runSteelIngotCaster: () => {
      options.runProcess(PROCESS_CATALOG.steelIngotCaster)
    },
    runEnergyCellAssembler: () => {
      options.runProcess(PROCESS_CATALOG.energyCellAssembler)
    },
  }
}
