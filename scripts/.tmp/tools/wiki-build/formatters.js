import { resourceById } from '../../src/generated/registry/resources.js';
export function formatQty(value) {
    if (Number.isInteger(value)) {
        return String(value);
    }
    return value.toFixed(3).replace(/\.?0+$/, '');
}
export function formatResourceMap(map) {
    if (!map) {
        return '- none';
    }
    const rows = Object.entries(map)
        .filter(([, amount]) => Number.isFinite(amount) && amount !== 0)
        .sort(([a], [b]) => resourceById[a].label.localeCompare(resourceById[b].label))
        .map(([resourceId, amount]) => {
        const resource = resourceById[resourceId];
        return `- ${formatQty(amount)} ${resource.label} (\`${resourceId}\`, ${resource.unit})`;
    });
    return rows.length > 0 ? rows.join('\n') : '- none';
}
