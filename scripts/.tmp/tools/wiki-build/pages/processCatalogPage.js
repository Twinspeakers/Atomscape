import { PROCESS_CATALOG } from '../../../src/generated/registry/processes.js';
import { formatQty, formatResourceMap } from '../formatters.js';
import { AUTO_GENERATED_HEADER } from '../types.js';
export function buildProcessCatalogPage() {
    const processRows = Object.entries(PROCESS_CATALOG)
        .map(([processId, process]) => ({ processId, process }))
        .sort((a, b) => a.process.name.localeCompare(b.process.name));
    const processSections = processRows
        .map(({ processId, process }) => [
        `### ${process.name} (\`${processId}\`)`,
        '',
        `- Energy cost: **${formatQty(process.energyCost ?? 0)}**`,
        `- Energy gain: **${formatQty(process.energyGain ?? 0)}**`,
        '- Consumes:',
        formatResourceMap(process.consume),
        '- Produces:',
        formatResourceMap(process.produce),
        `- Silent success: **${process.silentSuccess ? 'yes' : 'no'}**`,
        process.successMessage ? `- Success log: ${process.successMessage}` : '- Success log: (none)',
        process.failMessage ? `- Failure log: ${process.failMessage}` : '- Failure log: (default)',
        '',
    ].join('\n'))
        .join('\n');
    const content = [
        AUTO_GENERATED_HEADER,
        '# Process Catalog Reference',
        '',
        'This page is generated from `PROCESS_CATALOG` and updates with gameplay process changes.',
        '',
        processSections,
    ].join('\n');
    return {
        meta: {
            slug: 'reference-process-catalog',
            title: 'Process Catalog Reference',
            summary: 'Generated list of every process node with energy, consumes, and produces.',
            tags: ['reference', 'laboratory', 'processes'],
        },
        filename: 'reference-process-catalog.mdx',
        content,
    };
}
