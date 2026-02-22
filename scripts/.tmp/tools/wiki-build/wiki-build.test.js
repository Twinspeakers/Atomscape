import { describe, expect, it } from 'vitest';
import { formatQty, formatResourceMap } from './formatters.js';
import { buildGeneratedIndexContent } from './generatedIndex.js';
import { buildProcessCatalogPage } from './pages/processCatalogPage.js';
import { buildQuestReferencePage } from './pages/questReferencePage.js';
import { buildRecipeCatalogPage } from './pages/recipeCatalogPage.js';
import { buildResourceCatalogPage } from './pages/resourceCatalogPage.js';
import { buildSystemsPage } from './pages/systemsPage.js';
import { AUTO_GENERATED_HEADER } from './types.js';
describe('wiki-build utilities', () => {
    it('formats quantities consistently', () => {
        expect(formatQty(5)).toBe('5');
        expect(formatQty(1.25)).toBe('1.25');
        expect(formatQty(1.2)).toBe('1.2');
    });
    it('formats resource maps and includes resource identifiers', () => {
        const output = formatResourceMap({
            waterIce: 2,
            carbon: 0.4,
        });
        expect(output).toContain('`waterIce`');
        expect(output).toContain('`carbon`');
        expect(output).not.toBe('- none');
    });
    it('serializes generated index with escaped single quotes', () => {
        const content = buildGeneratedIndexContent([
            {
                slug: 'sample',
                title: "Captain's Notes",
                summary: "It's stable",
                tags: ['reference'],
            },
        ]);
        expect(content).toContain("summary: 'It\\'s stable'");
        expect(content).toContain("title: 'Captain\\'s Notes'");
    });
});
describe('wiki-build pages', () => {
    it('builds generated page payloads with auto-generated headers', () => {
        const pages = [
            buildSystemsPage(),
            buildProcessCatalogPage(),
            buildResourceCatalogPage(),
            buildRecipeCatalogPage(),
            buildQuestReferencePage(),
        ];
        pages.forEach((page) => {
            expect(page.filename.endsWith('.mdx')).toBe(true);
            expect(page.meta.slug.length).toBeGreaterThan(0);
            expect(page.content.startsWith(AUTO_GENERATED_HEADER)).toBe(true);
        });
    });
});
