import { describe, expect, it } from 'vitest'
import { PROCESS_CATALOG, type ProcessRunOptions } from '@domain/spec/processCatalog'
import { buildProcessActionBindings } from './processActionBindings'

describe('processActionBindings', () => {
  it('maps each process action to the expected catalog entry', () => {
    const seen: ProcessRunOptions[] = []
    const actions = buildProcessActionBindings({
      runProcess: (options) => {
        seen.push(options)
      },
    })

    actions.runRockSorter()
    actions.runIceMelter()
    actions.runElectrolyzer()
    actions.runIonizer()
    actions.runCo2Sublimator()
    actions.runCarbonRefiner()
    actions.runBlastFurnace()
    actions.runCoBurner()
    actions.runGlassForge()
    actions.runSteelMill()
    actions.runGreenhouse()
    actions.runWoodWorkshop()
    actions.runGalaxyBarAssembler()
    actions.runBoxOfSandPress()
    actions.runSteelIngotCaster()
    actions.runEnergyCellAssembler()

    expect(seen).toEqual([
      PROCESS_CATALOG.rockSorter,
      PROCESS_CATALOG.iceMelter,
      PROCESS_CATALOG.electrolyzer,
      PROCESS_CATALOG.ionizer,
      PROCESS_CATALOG.co2Sublimator,
      PROCESS_CATALOG.carbonRefiner,
      PROCESS_CATALOG.blastFurnace,
      PROCESS_CATALOG.coBurner,
      PROCESS_CATALOG.glassForge,
      PROCESS_CATALOG.steelMill,
      PROCESS_CATALOG.greenhouse,
      PROCESS_CATALOG.woodWorkshop,
      PROCESS_CATALOG.galaxyBarAssembler,
      PROCESS_CATALOG.boxOfSandPress,
      PROCESS_CATALOG.steelIngotCaster,
      PROCESS_CATALOG.energyCellAssembler,
    ])
  })
})
