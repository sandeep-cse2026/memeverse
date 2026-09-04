// Persisted "favorites" set, scoped to a list of meme IDs.
// Backed by localStorage so favorites survive reloads; uses a custom event
// so multiple components stay in sync without prop drilling.

import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'mem:favorites:v1'
const EVENT_NAME = 'mem:favorites:changed'

type FavoritesListener = (ids: string[]) => void

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    return []
  }
}

function writeFavorites(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore quota / privacy errors
  }
}

function emit(ids: string[]) {
  try {
    window.dispatchEvent(new CustomEvent<string[]>(EVENT_NAME, { detail: ids }))
  } catch {
    // older browsers — best effort
  }
}

function subscribe(listener: FavoritesListener) {
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<string[]>).detail
    if (Array.isArray(detail)) listener(detail)
  }
  window.addEventListener(EVENT_NAME, handler)
  // Also react to cross-tab changes.
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener(readFavorites())
  }
  window.addEventListener('storage', storageHandler)
  return () => {
    window.removeEventListener(EVENT_NAME, handler)
    window.removeEventListener('storage', storageHandler)
  }
}

export type UseFavoritesResult = {
  favorites: string[]
  favoritesSet: Set<string>
  isFavorite: (id: string) => boolean
  toggle: (id: string) => void
  add: (id: string) => void
  remove: (id: string) => void
  clear: () => void
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites())

  useEffect(() => {
    return subscribe((ids) => setFavorites(ids))
  }, [])

  const favoritesSet = useMemo(() => new Set(favorites), [favorites])

  const isFavorite = useCallback((id: string) => favoritesSet.has(id), [favoritesSet])

  const commit = useCallback((next: string[]) => {
    // De-duplicate and preserve a stable order (newest first).
    const seen = new Set<string>()
    const ordered: string[] = []
    for (let i = next.length - 1; i >= 0; i--) {
      const id = next[i]
      if (!seen.has(id)) {
        seen.add(id)
        ordered.push(id)
      }
    }
    setFavorites(ordered)
    writeFavorites(ordered)
    emit(ordered)
  }, [])

  const toggle = useCallback(
    (id: string) => {
      if (favoritesSet.has(id)) {
        commit(favorites.filter((f) => f !== id))
      } else {
        commit([...favorites, id])
      }
    },
    [favorites, favoritesSet, commit],
  )

  const add = useCallback(
    (id: string) => {
      if (favoritesSet.has(id)) return
      commit([...favorites, id])
    },
    [favorites, favoritesSet, commit],
  )

  const remove = useCallback(
    (id: string) => {
      if (!favoritesSet.has(id)) return
      commit(favorites.filter((f) => f !== id))
    },
    [favorites, favoritesSet, commit],
  )

  const clear = useCallback(() => {
    commit([])
  }, [commit])

  return { favorites, favoritesSet, isFavorite, toggle, add, remove, clear }
}
