import { useMemo, useState } from 'react'
import MemeCard from '../components/MemeCard'
import MemeGridSkeleton from '../components/MemeGridSkeleton'
import EmptyState from '../components/EmptyState'
import { useMemes } from '../hooks/useMemes'
import { useFavorites } from '../hooks/useFavorites'

export default function Gallery() {
  const { memes, status, error, fromCache, reload } = useMemes()
  const { ids: favIds, has, clear } = useFavorites()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'name' | 'boxes' | 'size'>('name')
  const [favOnly, setFavOnly] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = favOnly ? memes.filter((m) => has(m.id)) : memes
    const matched = q ? base.filter((m) => m.name.toLowerCase().includes(q)) : base
    const sorted = [...matched]
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sort === 'boxes') {
      sorted.sort((a, b) => b.box_count - a.box_count)
    } else {
      sorted.sort((a, b) => b.width * b.height - a.width * a.height)
    }
    return sorted
  }, [memes, query, sort, favOnly, has])

  const isInitialLoading = status === 'loading' && memes.length === 0
  const emptyForFavorites = favOnly && favIds.length === 0

  return (
    <section className="container-page py-12">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meme Gallery</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {status === 'success'
              ? `${memes.length} templates from Imgflip${fromCache ? ' (cached)' : ''}${
                  favIds.length ? ` · ${favIds.length} favorite${favIds.length === 1 ? '' : 's'}` : ''
                }`
              : 'Loading templates from Imgflip…'}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search memes</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memes…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'name' | 'boxes' | 'size')}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="name">Name (A–Z)</option>
              <option value="boxes">Box count</option>
              <option value="size">Image size</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setFavOnly((v) => !v)}
            aria-pressed={favOnly}
            className={`btn h-9 px-3 text-sm ${
              favOnly
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60'
                : 'btn-ghost'
            }`}
            title="Show only favorites"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={favOnly ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="mr-1.5 h-4 w-4"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Favorites{favIds.length ? ` (${favIds.length})` : ''}
          </button>
          <button
            type="button"
            onClick={reload}
            className="btn-ghost h-9 px-3 text-sm"
            aria-label="Refresh memes"
          >
            Refresh
          </button>
        </div>
      </header>

      {status === 'error' && memes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center dark:border-red-900/50 dark:bg-red-950/30">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
            Couldn't load memes
          </h3>
          <p className="mt-1 max-w-sm text-sm text-red-600/80 dark:text-red-300/80">
            {error ?? 'Unknown error'}
          </p>
          <button type="button" onClick={reload} className="btn-primary mt-5">
            Try again
          </button>
        </div>
      ) : isInitialLoading ? (
        <MemeGridSkeleton />
      ) : emptyForFavorites ? (
        <EmptyState
          title="No favorites yet"
          message="Tap the heart on any meme to save it here for quick access later."
          action={{ label: 'Browse all memes', onClick: () => setFavOnly(false) }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          message={
            query
              ? `No memes match "${query}". Try a different search term.`
              : favOnly
                ? 'No favorites match the current search.'
                : 'No memes available right now.'
          }
          action={
            query
              ? { label: 'Clear search', onClick: () => setQuery('') }
              : favOnly
                ? { label: 'Show all memes', onClick: () => setFavOnly(false) }
                : { label: 'Refresh', onClick: reload }
          }
        />
      ) : (
        <>
          {status === 'error' && (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              Showing cached results — failed to refresh: {error}
            </p>
          )}
          {favOnly && favIds.length > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              <span>Showing {filtered.length} favorite{filtered.length === 1 ? '' : 's'}</span>
              <button
                type="button"
                onClick={clear}
                className="rounded px-2 py-0.5 text-xs font-medium hover:bg-rose-100 dark:hover:bg-rose-950/60"
              >
                Clear all
              </button>
            </div>
          )}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((meme) => (
              <MemeCard key={meme.id} meme={meme} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
