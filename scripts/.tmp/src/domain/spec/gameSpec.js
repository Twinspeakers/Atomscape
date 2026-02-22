export const CHARGING_RANGE_METERS = 50;
export const STATION_DOCKING_RANGE_METERS = 50;
export const MINING_LASER_ENERGY_COST = 6;
export const MINING_ASTEROID_RUBBLE_YIELD = 6;
export const MINING_CREW_DEBUFF_ENERGY_FACTOR = 0.5;
export const ENERGY_CELL_CRAFT_ENERGY_COST = 132;
export const ENERGY_CELL_DISCHARGE_ENERGY = 120;
export const SIMULATION_LOG_LIMIT = 120;
export const EXTRACTION_EVENT_LIMIT = 160;
export const CONTAINMENT_DRAIN_BASE = 1;
export const CONTAINMENT_DRAIN_POWER_FACTOR = 5;
export const CREW_MEMBER_COUNT = 4;
export const CREW_SLEEP_CYCLE_HOURS = 24;
export const CREW_SLEEP_WINDOW_HOURS = 8;
export const CREW_SLEEP_SHIFT_START_HOURS = [0, 6, 12, 18];
export const CREW_DEFAULT_ROSTER = [
    { id: 'crew-ava', name: 'Ava Kade', sleepShiftStartHour: 0 },
    { id: 'crew-jules', name: 'Jules Orin', sleepShiftStartHour: 6 },
    { id: 'crew-niko', name: 'Niko Vale', sleepShiftStartHour: 12 },
    { id: 'crew-rin', name: 'Rin Sol', sleepShiftStartHour: 18 },
];
export const CREW_MEMBER_HUNGER_DECAY_PER_DAY = 100;
export const CREW_MEMBER_HUNGER_DECAY_PER_SECOND = CREW_MEMBER_HUNGER_DECAY_PER_DAY / (24 * 60 * 60);
export const CREW_MEMBER_GALAXY_BAR_HUNGER_RESTORE = CREW_MEMBER_HUNGER_DECAY_PER_DAY / 3;
export const CREW_MEMBER_MEALS_PER_DAY = 3;
export const CREW_MEMBER_THIRST_DECAY_PER_DAY = 100;
export const CREW_MEMBER_THIRST_DECAY_PER_SECOND = CREW_MEMBER_THIRST_DECAY_PER_DAY / (24 * 60 * 60);
export const CREW_MEMBER_WATER_HYDRATION_RESTORE = 25;
export const CREW_MEMBER_WATER_DRINK_COST_L = 0.25;
export const CREW_MEMBER_WATER_LITERS_PER_DAY_BASE = 2;
export const CREW_MEMBER_WATER_ENVIRONMENT_MULTIPLIER = 1;
export const CREW_AUTO_EAT_THRESHOLD = 65;
export const CREW_AUTO_DRINK_THRESHOLD = 70;
export const CREW_DEHYDRATED_THRESHOLD = 12;
export const CREW_MEMBER_DEBUFF_GAIN_STARVING_PER_SECOND = 0.6;
export const CREW_MEMBER_DEBUFF_GAIN_DEHYDRATED_PER_SECOND = 0.8;
export const CREW_MEMBER_DEBUFF_RECOVERY_PER_SECOND = 0.5;
export const FRIDGE_DEFAULT_CAPACITY_BARS = 40;
export const FRIDGE_DEFAULT_WATER_CAPACITY_LITERS = 120;
export const FRIDGE_UNLOCK_REWARD_GALAXY_BARS = 5;
// Legacy aggregate-crew constants. CRW4 switches runtime simulation to per-member constants above.
export const CREW_HUNGER_DECAY_PER_SECOND = 100 / (24 * 60 * 60);
export const CREW_STARVING_THRESHOLD = 12;
export const CREW_FEED_THRESHOLD = 46;
export const CREW_GALAXY_BAR_HUNGER_RESTORE = 58;
export const CREW_DEBUFF_MAX = 55;
export const CREW_DEBUFF_GAIN_PER_SECOND = 1.8;
export const CREW_DEBUFF_RECOVERY_PER_SECOND = 2.4;
export const RECOMBINATION_BASE_RATE = 0.22;
export const RECOMBINATION_MAX_CONTAINMENT_EFFECT = 0.85;
export const MARKET_DEMAND_RECOVERY_PER_SECOND = 0.018;
export const MARKET_RANDOM_SWAY = 0.03;
export const MARKET_PRICE_FLOOR_MULTIPLIER = 0.45;
export const MARKET_PRICE_CEIL_MULTIPLIER = 1.9;
export const MARKET_PRODUCTS = [
    { productId: 'boxOfSand', label: 'Box of Sand', basePrice: 45 },
    { productId: 'steelIngot', label: 'Steel Ingot', basePrice: 165 },
    { productId: 'energyCell', label: 'Energy Cell', basePrice: 420 },
];
export const SIMULATION_TICK_ORDER = [
    'stationCharging',
    'containmentDrain',
    'plasmaRecombination',
    'dockingOverride',
    'crewSurvival',
];
