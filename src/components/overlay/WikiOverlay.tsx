import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { searchWikiPages } from '../../search/wikiSearch'
import { loadWikiPage } from '../../wiki/wikiRegistry'
import { WikiArticle } from '../wiki/WikiArticle'

interface WikiOverlayProps {
  onClose?: () => void
  embedded?: boolean
}

export function WikiOverlay({ onClose, embedded = false }: WikiOverlayProps) {
  const [query, setQuery] = useState('')
  const pages = useMemo(() => searchWikiPages(query), [query])
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [content, setContent] = useState<ComponentType<Record<string, unknown>> | null>(null)
  const [loading, setLoading] = useState(false)

  const resolvedActiveSlug = useMemo(() => {
    if (activeSlug && pages.some((page) => page.slug === activeSlug)) {
      return activeSlug
    }

    return pages[0]?.slug ?? 'flight-basics'
  }, [activeSlug, pages])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      const pageComponent = await loadWikiPage(resolvedActiveSlug)

      if (active) {
        setContent(() => pageComponent)
        setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [resolvedActiveSlug])

  const shellClass = embedded
    ? 'panel-shell flex h-full min-h-0 flex-col rounded-xl p-3.5'
    : 'panel-shell pointer-events-auto absolute right-0 top-0 h-full w-[clamp(360px,32vw,560px)] rounded-l-xl px-4 py-4'
  const contentClass = embedded
    ? 'ui-content-scroll min-h-0 flex-1 overflow-auto'
    : 'ui-content-scroll h-[calc(100%-140px)] overflow-auto'

  return (
    <aside className={`${shellClass} ui-stack-sm`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="ui-title">Wiki</h2>
        {onClose && (
          <button onClick={onClose} className="ui-action-button-sm rounded bg-slate-900/80 text-slate-200 hover:bg-slate-800/80">
            Close
          </button>
        )}
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search wiki"
        className="ui-input-field"
      />
      <div className="flex gap-2 overflow-auto pb-1">
        {pages.map((page) => {
          const isActive = page.slug === resolvedActiveSlug

          return (
            <button
              key={page.slug}
              onClick={() => setActiveSlug(page.slug)}
              className={`ui-action-button ${
                isActive
                  ? 'bg-slate-200/15 text-slate-100'
                  : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {page.title}
            </button>
          )
        })}
      </div>
      <div className={contentClass}>
        {loading && <p className="ui-note">Loading page...</p>}
        {!loading && <WikiArticle Content={content} />}
      </div>
    </aside>
  )
}
