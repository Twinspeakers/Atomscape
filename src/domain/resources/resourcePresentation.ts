import type { ResourceId } from './resourceCatalog'

export type ResourceCategory =
  | 'Raw Feedstock'
  | 'Refined Material'
  | 'Chemical'
  | 'Manufactured Product'
  | 'Bio Product'
  | 'Waste'

export type ResourceIconKind =
  | 'rubble'
  | 'crystal'
  | 'ore'
  | 'ice'
  | 'liquid'
  | 'gas'
  | 'carbon'
  | 'metal'
  | 'glass'
  | 'alloy'
  | 'bio'
  | 'wood'
  | 'crate'
  | 'battery'
  | 'ration'
  | 'waste'

export interface ResourcePresentation {
  shortCode: string
  category: ResourceCategory
  iconKind: ResourceIconKind
  whereFound: string
  primaryUse: string
}

export const resourcePresentationById: Record<ResourceId, ResourcePresentation> = {
  rubble: {
    shortCode: 'Rb',
    category: 'Raw Feedstock',
    iconKind: 'rubble',
    whereFound: 'Directly mined from asteroid and junk targets in space.',
    primaryUse: 'Primary input for the Rock Sorter.',
  },
  silicaSand: {
    shortCode: 'SiO2',
    category: 'Refined Material',
    iconKind: 'crystal',
    whereFound: 'Produced by Rock Sorter from rubble.',
    primaryUse: 'Used for Glass Forge and Box of Sand Press.',
  },
  ironOre: {
    shortCode: 'Fe2O3',
    category: 'Refined Material',
    iconKind: 'ore',
    whereFound: 'Produced by Rock Sorter from rubble.',
    primaryUse: 'Blast Furnace feedstock for iron production.',
  },
  waterIce: {
    shortCode: 'H2O',
    category: 'Raw Feedstock',
    iconKind: 'ice',
    whereFound: 'Common in volatile ice chunks and Rock Sorter output.',
    primaryUse: 'Melt into liquid water via Ice Melter.',
  },
  co2Ice: {
    shortCode: 'CO2',
    category: 'Raw Feedstock',
    iconKind: 'ice',
    whereFound: 'Volatile-rich asteroid material and Rock Sorter output.',
    primaryUse: 'Sublimate into CO2 gas for greenhouse loops.',
  },
  carbonRock: {
    shortCode: 'C-R',
    category: 'Raw Feedstock',
    iconKind: 'carbon',
    whereFound: 'Composite junk targets and Rock Sorter output.',
    primaryUse: 'Refined into pure carbon.',
  },
  slagWaste: {
    shortCode: 'Slag',
    category: 'Waste',
    iconKind: 'waste',
    whereFound: 'Byproduct of rubble sorting.',
    primaryUse: 'Low-value residue with future recycling potential.',
  },
  water: {
    shortCode: 'H2O',
    category: 'Chemical',
    iconKind: 'liquid',
    whereFound: 'Created by running Water Ice through Ice Melter.',
    primaryUse: 'Input for Electrolyzer, Greenhouse, and Galaxy Bars.',
  },
  hydrogenNeutral: {
    shortCode: 'H',
    category: 'Chemical',
    iconKind: 'gas',
    whereFound: 'Produced by Electrolyzer from water.',
    primaryUse: 'Input for Ionizer and hydrogen chemistry.',
  },
  hydrogenIonized: {
    shortCode: 'H+',
    category: 'Chemical',
    iconKind: 'gas',
    whereFound: 'Produced by Ionizer from neutral hydrogen.',
    primaryUse: 'Required for Energy Cell assembly.',
  },
  oxygenGas: {
    shortCode: 'O2',
    category: 'Chemical',
    iconKind: 'gas',
    whereFound: 'Produced by Electrolyzer and Greenhouse.',
    primaryUse: 'Oxidizer for CO Burner and atmosphere loops.',
  },
  co2Gas: {
    shortCode: 'CO2',
    category: 'Chemical',
    iconKind: 'gas',
    whereFound: 'Produced by CO2 Sublimator and CO Burner.',
    primaryUse: 'Greenhouse feedstock for cellulose production.',
  },
  carbon: {
    shortCode: 'C',
    category: 'Refined Material',
    iconKind: 'carbon',
    whereFound: 'Produced by Carbon Refiner.',
    primaryUse: 'Used in steel, furnace chemistry, and rations.',
  },
  ironMetal: {
    shortCode: 'Fe',
    category: 'Refined Material',
    iconKind: 'metal',
    whereFound: 'Produced by Blast Furnace from iron ore.',
    primaryUse: 'Used for steel and energy cell manufacturing.',
  },
  coGas: {
    shortCode: 'CO',
    category: 'Chemical',
    iconKind: 'gas',
    whereFound: 'Byproduct of Blast Furnace reduction.',
    primaryUse: 'Burned in CO Burner to recover energy and create CO2.',
  },
  glass: {
    shortCode: 'Gls',
    category: 'Manufactured Product',
    iconKind: 'glass',
    whereFound: 'Produced by Glass Forge from silica sand.',
    primaryUse: 'Structural manufacturing and market goods.',
  },
  steel: {
    shortCode: 'Stl',
    category: 'Manufactured Product',
    iconKind: 'alloy',
    whereFound: 'Produced by Steel Mill from iron + carbon.',
    primaryUse: 'Structural manufacturing and steel ingot casting.',
  },
  cellulose: {
    shortCode: 'Cel',
    category: 'Bio Product',
    iconKind: 'bio',
    whereFound: 'Produced by Greenhouse from CO2 gas + water.',
    primaryUse: 'Used for wood conversion and Galaxy Bars.',
  },
  wood: {
    shortCode: 'Wd',
    category: 'Bio Product',
    iconKind: 'wood',
    whereFound: 'Produced by Wood Workshop from cellulose.',
    primaryUse: 'General structural material and later crafting.',
  },
  boxOfSand: {
    shortCode: 'Box',
    category: 'Manufactured Product',
    iconKind: 'crate',
    whereFound: 'Produced by Box of Sand Press.',
    primaryUse: 'Early sellable contract product.',
  },
  steelIngot: {
    shortCode: 'Ing',
    category: 'Manufactured Product',
    iconKind: 'crate',
    whereFound: 'Produced by Steel Ingot Caster.',
    primaryUse: 'Standardized metal product for sale and fabrication.',
  },
  energyCell: {
    shortCode: 'Cell',
    category: 'Manufactured Product',
    iconKind: 'battery',
    whereFound: 'Produced by Energy Cell Assembler.',
    primaryUse: 'High-demand export and energy-tech manufacturing.',
  },
  galaxyBar: {
    shortCode: 'Food',
    category: 'Bio Product',
    iconKind: 'ration',
    whereFound: 'Produced by Galaxy Bar Assembler.',
    primaryUse: 'Crew feeding and hunger recovery.',
  },
}
