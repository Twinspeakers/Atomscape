import { atomVectors, resourceDefinitions } from '../../../src/generated/registry/resources.js';
import { formatQty } from '../formatters.js';
import { AUTO_GENERATED_HEADER } from '../types.js';
export function buildResourceCatalogPage() {
    const rows = resourceDefinitions
        .map((resource) => {
        const vector = atomVectors[resource.id];
        const atomSummary = `H:${formatQty(vector.H)} C:${formatQty(vector.C)} O:${formatQty(vector.O)} Si:${formatQty(vector.Si)} Fe:${formatQty(vector.Fe)}`;
        const safeDescription = resource.description.replace(/\|/g, '\\|');
        return `| \`${resource.id}\` | ${resource.label} | ${resource.unit} | ${atomSummary} | ${safeDescription} |`;
    })
        .join('\n');
    const content = [
        AUTO_GENERATED_HEADER,
        '# Resource Catalog Reference',
        '',
        'This page is generated from the resource catalog and atom vectors.',
        '',
        '| Resource ID | Label | Unit | Atom Vector (per unit) | Description |',
        '| --- | --- | --- | --- | --- |',
        rows,
        '',
    ].join('\n');
    return {
        meta: {
            slug: 'reference-resource-catalog',
            title: 'Resource Catalog Reference',
            summary: 'Generated resource list with units, descriptions, and atom vectors.',
            tags: ['reference', 'resources', 'atoms'],
        },
        filename: 'reference-resource-catalog.mdx',
        content,
    };
}
