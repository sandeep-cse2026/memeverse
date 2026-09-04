import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'
import { useMemes } from '../hooks/useMemes'
import MemeCard from '../components/MemeCard'
import MemeGridSkeleton from '../components/MemeGridSkeleton'
import EmptyState from '../components/EmptyState'

export default function Favorites() {
  const { memes, status } = useMemes()
  const { favorites, clear } = useFavorites()

  const items = useMemo(() => {
    // Preserve favorite order (most-recent first) while only including memes
    // we actually know about — favorites for templates that disappeared from
    // the API are silently dropped.
    const map = new Map(memes.map((m) => [m.id, m]))
    return favorites.map((id) => map.get(id)).filter((m): m is NonNullable<typeof m> => Boolean(m))
  }, [favorites, memes])

  const isInitialLoading = status === 'loading' && memes.length === 0

  return (
    <section className="container-page py-12">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Favorites</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {items.length === 0
              ? 'Tap the heart on any meme to save it here.'
              : `${items.length} ${items.length === 1 ? 'meme' : 'memes'} saved`}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Remove all favorites?')) clear()
            }}
            className="btn-ghost h-9 px-3 text-sm"
          >
            Clear all
          </button>
        )}
      </header>

      {isInitialLoading ? (
        <MemeGridSkeleton count={8} />
      ) : items.length === 0 ? (
        favorites.length === 0 ? (
          <EmptyState
            title="No favorites yet"
            message="Browse the gallery and tap the heart icon on any meme to add it to your favorites."
            action={{ label: 'Browse gallery', onClick: () => (window.location.href = '/gallery') }}
          />
        ) : (
          <EmptyState
            title="Favorites are unavailable"
            message="We saved these memes, but the template list is still loading or has changed. Try refreshing."
            action={{ label: 'Refresh', onClick: () => window.location.reload() }}
          />
        )
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((meme) => (
            <MemeCard key={meme.id} meme={meme} />
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Looking for more?{' '}
          <Link to="/gallery" className="text-indigo-600 hover:underline dark:text-indigo-400">
            Browse the gallery
          </Link>
        </p>
      )}
    </section>
  )
}
