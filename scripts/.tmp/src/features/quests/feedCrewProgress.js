const FEED_CREW_WATER_REQUIRED = 11;
const FEED_CREW_CO2_REQUIRED = 12;
const FEED_CREW_CARBON_REQUIRED = 0.4;
const FEED_CREW_CELLULOSE_REQUIRED = 2;
const FEED_CREW_STAGE_WATER_REQUIRED = 1;
const FEED_CREW_STAGE_CARBON_REQUIRED = 0.4;
const FEED_CREW_STAGE_ENERGY_REQUIRED = 6;
const FEED_CREW_GALAXY_BAR_REQUIRED = 1;
const EPSILON = 1e-6;
function qty(inventory, key) {
    return inventory[key] ?? 0;
}
function hasAtLeast(value, required) {
    return value + EPSILON >= required;
}
export function feedCrewWaterEquivalent(inventory) {
    return qty(inventory, 'waterIce')
        + qty(inventory, 'water')
        + qty(inventory, 'cellulose') * 5
        + qty(inventory, 'galaxyBar') * FEED_CREW_WATER_REQUIRED;
}
export function feedCrewCo2Equivalent(inventory) {
    return qty(inventory, 'co2Ice')
        + qty(inventory, 'co2Gas')
        + qty(inventory, 'cellulose') * 6
        + qty(inventory, 'galaxyBar') * FEED_CREW_CO2_REQUIRED;
}
export function feedCrewCarbonEquivalent(inventory) {
    return qty(inventory, 'carbonRock')
        + qty(inventory, 'carbon')
        + qty(inventory, 'galaxyBar') * FEED_CREW_CARBON_REQUIRED;
}
export function feedCrewCelluloseEquivalent(inventory) {
    return qty(inventory, 'cellulose')
        + qty(inventory, 'galaxyBar') * FEED_CREW_CELLULOSE_REQUIRED;
}
export function isFeedCrewTargetFeedstockSatisfied(inventory) {
    return (hasAtLeast(feedCrewWaterEquivalent(inventory), FEED_CREW_WATER_REQUIRED)
        && hasAtLeast(feedCrewCo2Equivalent(inventory), FEED_CREW_CO2_REQUIRED)
        && hasAtLeast(feedCrewCarbonEquivalent(inventory), FEED_CREW_CARBON_REQUIRED));
}
export function isFeedCrewCreateWaterSatisfied(inventory) {
    return hasAtLeast(feedCrewWaterEquivalent(inventory), FEED_CREW_WATER_REQUIRED);
}
export function isFeedCrewCreateCo2Satisfied(inventory) {
    return hasAtLeast(feedCrewCo2Equivalent(inventory), FEED_CREW_CO2_REQUIRED);
}
export function isFeedCrewCreateCelluloseSatisfied(inventory) {
    return hasAtLeast(feedCrewCelluloseEquivalent(inventory), FEED_CREW_CELLULOSE_REQUIRED);
}
export function isFeedCrewCreateCarbonSatisfied(inventory) {
    return hasAtLeast(qty(inventory, 'carbon'), FEED_CREW_CARBON_REQUIRED);
}
export function isFeedCrewCraftGalaxyBarSatisfied(inventory) {
    return hasAtLeast(qty(inventory, 'galaxyBar'), FEED_CREW_GALAXY_BAR_REQUIRED);
}
export function isFeedCrewStageIngredientsSatisfied(inventory, energy) {
    if (isFeedCrewCraftGalaxyBarSatisfied(inventory)) {
        return true;
    }
    return (hasAtLeast(qty(inventory, 'cellulose'), FEED_CREW_CELLULOSE_REQUIRED)
        && hasAtLeast(qty(inventory, 'water'), FEED_CREW_STAGE_WATER_REQUIRED)
        && hasAtLeast(qty(inventory, 'carbon'), FEED_CREW_STAGE_CARBON_REQUIRED)
        && hasAtLeast(energy, FEED_CREW_STAGE_ENERGY_REQUIRED));
}
