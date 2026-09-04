// Persisted "recently used templates" list, scoped to meme IDs.
// Backed by localStorage so recents survive reloads. Items are ordered
// most-recent-first; a custom window event keeps multiple components in sync.

import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'mem:recents:v1'
const EVENT_NAME = 'mem:recents:changed'
const MAX_RECENTS = 6

type RecentsListener = (ids: string[]) => void

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENTS)
  } catch {
    return []
  }
}

function writeRecents(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_RECENTS)))
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

function subscribe(listener: RecentsListener) {
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<string[]>).detail
    if (Array.isArray(detail)) listener(detail)
  }
  window.addEventListener(EVENT_NAME, handler)
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener(readRecents())
  }
  window.addEventListener('storage', storageHandler)
  return () => {
    window.removeEventListener(EVENT_NAME, handler)
    window.removeEventListener('storage', storageHandler)
  }
}

export type UseRecentsResult = {
  recents: string[]
  bump: (id: string) => void
  clear: () => void
}

export function useRecentTemplates(): UseRecentsResult {
  const [recents, setRecents] = useState<string[]>(() => readRecents())

  useEffect(() => {
    return subscribe((ids) => setRecents(ids))
  }, [])

  const commit = useCallback((next: string[]) => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const id of next) {
      if (!seen.has(id)) {
        seen.add(id)
        out.push(id)
      }
      if (out.length >= MAX_RECENTS) break
    }
    setRecents(out)
    writeRecents(out)
    emit(out)
  }, [])

  const bump = useCallback(
    (id: string) => {
      if (!id) return
      const next = [id, ...recents.filter((r) => r !== id)].slice(0, MAX_RECENTS)
      // Only emit/write if order actually changed.
      if (next.length !== recents.length || next.some((v, i) => v !== recents[i])) {
        commit(next)
      }
    },
    [recents, commit],
  )

  const clear = useCallback(() => commit([]), [commit])

  return useMemo(() => ({ recents, bump, clear }), [recents, bump, clear])
}
