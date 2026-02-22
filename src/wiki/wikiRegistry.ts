import type { ComponentType } from 'react'
import { generatedWikiPages } from './generated/wikiGeneratedIndex'
import type { WikiPageMeta } from './wikiTypes'

const manualWikiPages: WikiPageMeta[] = [
  {
    slug: 'flight-basics',
    title: 'Flight Basics',
    summary: 'Controls, camera behavior, and combat flow for the mining loop.',
    tags: ['controls', 'combat', 'ship'],
  },
  {
    slug: 'asteroid-mining',
    title: 'Asteroid Mining',
    summary: 'How asteroid targets are selected, destroyed, and converted into rubble feedstock.',
    tags: ['asteroids', 'inventory', 'elements'],
  },
  {
    slug: 'lab-notes',
    title: 'Laboratory Notes',
    summary: 'A quick guide for station systems, chemistry chains, manufacturing, and crew support controls.',
    tags: ['laboratory', 'research', 'periodic table'],
  },
]

export const wikiPages: WikiPageMeta[] = [...manualWikiPages, ...generatedWikiPages]

type WikiModule = {
  default: ComponentType<Record<string, unknown>>
}

const modules = import.meta.glob('./pages/*.mdx')

export async function loadWikiPage(slug: string): Promise<ComponentType<Record<string, unknown>> | null> {
  const moduleKey = `./pages/${slug}.mdx`
  const importer = modules[moduleKey] as (() => Promise<WikiModule>) | undefined
  if (!importer) {
    return null
  }

  const module = await importer()
  return module.default
}
