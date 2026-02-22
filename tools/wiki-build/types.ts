import type { WikiPageMeta } from '../../src/wiki/wikiTypes.js'

export const AUTO_GENERATED_HEADER = '{/* AUTO-GENERATED. Run `npm run wiki:sync`. */}'

export interface GeneratedPage {
  meta: WikiPageMeta
  filename: string
  content: string
}
