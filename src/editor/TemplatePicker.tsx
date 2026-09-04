// Reusable template picker that talks to the Imgflip API via the existing
// useMemes hook. Used inside the editor page.

import { useMemo, useState } from 'react'
import MemeGridSkeleton from '../components/MemeGridSkeleton'
import type { Meme } from '../api/imgflip'

type Props = {
  memes: Meme[]
  status: 'idle' | 'loading' | 'success' | 'error'
  error: string | null
  reload: () => void
  selected: Meme | null
  onSelect: (meme: Meme | null) => void
  recents: string[]
}

export default function TemplatePicker({ memes, status, error, reload, selected, onSelect, recents }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return memes.slice(0, 24)
    return memes.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 60)
  }, [memes, query])

  const recentMemes = useMemo(() => {
    if (!recents.length) return []
    const map = new Map(memes.map((m) => [m.id, m]))
    return recents.map((id) => map.get(id)).filter((m): m is Meme => Boolean(m))
  }, [memes, recents])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Templates</h2>
        <button type="button" onClick={reload} className="btn-ghost h-7 px-2 text-xs" aria-label="Refresh templates">
          Refresh
        </button>
      </header>

      {recentMemes.length > 0 && !query && (
        <section aria-label="Recent templates" className="mb-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Recent
          </h3>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {recentMemes.map((meme) => {
              const isActive = selected?.id === meme.id
              return (
                <li key={`recent-${meme.id}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(meme)}
                    title={`Recent: ${meme.name}`}
                    className={`group block w-full overflow-hidden rounded-lg border transition ${
                      isActive
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
                      <img
                        src={meme.url}
                        alt={meme.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search templates…"
        className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      <div className="mb-3">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${
            selected === null
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          Start blank (no template)
        </button>
      </div>

      {status === 'error' && memes.length === 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <p>Couldn't load templates.</p>
          <p className="mt-0.5 opacity-80">{error ?? 'Unknown error'}</p>
          <button type="button" onClick={reload} className="btn-primary mt-2 h-7 px-2 text-xs">
            Try again
          </button>
        </div>
      ) : status === 'loading' && memes.length === 0 ? (
        <MemeGridSkeleton count={6} compact />
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No templates match "{query}".
        </p>
      ) : (
        <ul className="grid max-h-[480px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {filtered.map((meme) => {
            const isActive = selected?.id === meme.id
            return (
              <li key={meme.id}>
                <button
                  type="button"
                  onClick={() => onSelect(meme)}
                  className={`group block w-full overflow-hidden rounded-lg border transition ${
                    isActive
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
                    <img
                      src={meme.url}
                      alt={meme.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="truncate px-1.5 py-1 text-[11px] text-slate-600 dark:text-slate-300" title={meme.name}>
                    {meme.name}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
