import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'mem:favorites:v1'

function read(): string[] {
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

function write(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore quota / privacy errors
  }
}

export type UseFavoritesResult = {
  ids: string[]
  has: (id: string) => boolean
  toggle: (id: string) => void
  clear: () => void
}

export function useFavorites(): UseFavoritesResult {
  const [ids, setIds] = useState<string[]>(() => read())

  useEffect(() => {
    write(ids)
  }, [ids])

  const has = useCallback((id: string) => ids.includes(id), [ids])

  const toggle = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const clear = useCallback(() => setIds([]), [])

  return { ids, has, toggle, clear }
}
