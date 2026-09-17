import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useMemeHistory } from '../hooks/useMemeHistory'
import { useMemes } from '../hooks/useMemes'
import EmptyState from '../components/EmptyState'
import MemeGridSkeleton from '../components/MemeGridSkeleton'
import type { HistoryEntry } from '../hooks/useMemeHistory'

type FilteredEntry = HistoryEntry & { template: NonNullable<HistoryEntry['template']> }

export default function History() {
  const { history, remove, clear } = useMemeHistory()
  const { memes } = useMemes()
  const location = useLocation()
  const navigate = useNavigate()

  const items = useMemo<FilteredEntry[]>(() => {
    // Intersect history against known memes so stale entries (templates
    // that disappeared from the API) are silently dropped from the UI.
    // We keep them in localStorage in case the API recovers.
    const map = new Map(memes.map((m) => [m.id, m]))
    return history.filter((h): h is FilteredEntry => map.has(h.template.id))
  }, [history, memes])

  const handleLoad = (entry: FilteredEntry) => {
    navigate('/editor', {
      state: {
        templateId: entry.template.id,
        templateUrl: entry.template.url,
        templateName: entry.template.name,
        historyId: entry.id,
        historyBoxes: entry.boxes,
      },
    })
  }

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Delete "${title}" from history?`)) {
      remove(id)
    }
  }

  const handleClearAll = () => {
    if (items.length === 0) return
    if (window.confirm(`Clear all ${items.length} saved meme${items.length === 1 ? '' : 's'} from history?`)) {
      clear()
    }
  }

  const isInitialLoading = memes.length === 0

  return (
    <section className="container-page py-12">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">History</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {items.length === 0
              ? 'Your saved memes appear here.'
              : `${items.length} ${items.length === 1 ? 'meme' : 'memes'} saved`}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="btn-ghost h-9 px-3 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Clear all
          </button>
        )}
      </header>

      {isInitialLoading ? (
        <MemeGridSkeleton count={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No history yet"
          message="Create and save memes in the editor — they'll show up here for quick access."
          action={{ label: 'Start creating', onClick: () => navigate('/editor') }}
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list" aria-label="Saved memes">
            {items.map((entry) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                onLoad={handleLoad}
                onDelete={handleDelete}
              />
            ))}
          </ul>

          <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Looking for templates?{' '}
            <Link to="/gallery" className="text-indigo-600 hover:underline dark:text-indigo-400">
              Browse the gallery
            </Link>
          </p>
        </>
      )}
    </section>
  )
}

type HistoryCardProps = {
  entry: FilteredEntry
  onLoad: (entry: FilteredEntry) => void
  onDelete: (id: string, title: string) => void
}

function HistoryCard({ entry, onLoad, onDelete }: HistoryCardProps) {
  const displayTitle = entry.title ?? entry.template.name
  const created = new Date(entry.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <li className="group mem-rise overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => onLoad(entry)}
        aria-label={`Edit "${displayTitle}"`}
        className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
          <img
            src={entry.template.url}
            alt={entry.template.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              Open in editor →
            </span>
            <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] text-slate-700">
              {created}
            </span>
          </div>
        </div>
        <div className="p-3 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2 min-h-[2.5rem]">
            <h2 className="line-clamp-2 text-sm font-medium text-slate-800 dark:text-slate-100" title={displayTitle}>
              {displayTitle}
            </h2>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(entry.id, displayTitle)
              }}
              className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              aria-label={`Delete "${displayTitle}"`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>{entry.template.name}</span>
            <span aria-hidden>·</span>
            <span>{entry.template.width}×{entry.template.height}</span>
            <span aria-hidden>·</span>
            <span>{entry.boxes.length} text box{entry.boxes.length === 1 ? '' : 'es'}</span>
          </p>
        </div>
      </button>
    </li>
  )
}