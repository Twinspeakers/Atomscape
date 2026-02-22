export function buildGeneratedIndexContent(pages) {
    const escapeSingleQuotes = (value) => value.replace(/'/g, "\\'");
    const serialized = pages
        .map((page) => {
        const tags = page.tags.map((tag) => `'${escapeSingleQuotes(tag)}'`).join(', ');
        return [
            '  {',
            `    slug: '${escapeSingleQuotes(page.slug)}',`,
            `    title: '${escapeSingleQuotes(page.title)}',`,
            `    summary: '${escapeSingleQuotes(page.summary)}',`,
            `    tags: [${tags}],`,
            '  },',
        ].join('\n');
    })
        .join('\n');
    return [
        '// AUTO-GENERATED. Run `npm run wiki:sync`.',
        "import type { WikiPageMeta } from '../wikiTypes'",
        '',
        'export const generatedWikiPages: WikiPageMeta[] = [',
        serialized,
        ']',
        '',
    ].join('\n');
}
