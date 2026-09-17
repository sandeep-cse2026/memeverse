// Persisted "meme history" list — full saved memes with template + text boxes.
// Backed by localStorage so history survives reloads; uses a custom event
// so multiple components stay in sync without prop drilling.

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TextBox } from '../editor/types'
import type { Meme } from '../api/imgflip'

const STORAGE_KEY = 'mem:history:v1'
const EVENT_NAME = 'mem:history:changed'
const MAX_HISTORY = 50

export type HistoryEntry = {
  id: string
  createdAt: number
  template: Meme
  boxes: TextBox[]
  /** Optional user-provided title; defaults to template name */
  title?: string
}

type HistoryListener = (entries: HistoryEntry[]) => void

function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v): v is HistoryEntry => {
        return (
          typeof v === 'object' &&
          v !== null &&
          typeof v.id === 'string' &&
          typeof v.createdAt === 'number' &&
          typeof v.template === 'object' &&
          v.template !== null &&
          typeof v.template.id === 'string' &&
          typeof v.template.name === 'string' &&
          typeof v.template.url === 'string' &&
          typeof v.template.width === 'number' &&
          typeof v.template.height === 'number' &&
          typeof v.template.box_count === 'number' &&
          Array.isArray(v.boxes)
        )
      })
      .slice(0, MAX_HISTORY)
      .sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

function writeHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
  } catch {
    // ignore quota / privacy errors
  }
}

function emit(entries: HistoryEntry[]) {
  try {
    window.dispatchEvent(new CustomEvent<HistoryEntry[]>(EVENT_NAME, { detail: entries }))
  } catch {
    // older browsers — best effort
  }
}

function subscribe(listener: HistoryListener) {
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<HistoryEntry[]>).detail
    if (Array.isArray(detail)) listener(detail)
  }
  window.addEventListener(EVENT_NAME, handler)
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener(readHistory())
  }
  window.addEventListener('storage', storageHandler)
  return () => {
    window.removeEventListener(EVENT_NAME, handler)
    window.removeEventListener('storage', storageHandler)
  }
}

export type UseMemeHistoryResult = {
  history: HistoryEntry[]
  save: (template: Meme, boxes: TextBox[], title?: string) => string
  load: (id: string) => HistoryEntry | null
  remove: (id: string) => void
  clear: () => void
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function useMemeHistory(): UseMemeHistoryResult {
  const [history, setHistory] = useState<HistoryEntry[]>(() => readHistory())

  useEffect(() => {
    return subscribe((entries) => setHistory(entries))
  }, [])

  const commit = useCallback((next: HistoryEntry[]) => {
    const sorted = [...next].sort((a, b) => b.createdAt - a.createdAt)
    setHistory(sorted)
    writeHistory(sorted)
    emit(sorted)
  }, [])

  const save = useCallback(
    (template: Meme, boxes: TextBox[], title?: string): string => {
      const id = generateId()
      const entry: HistoryEntry = {
        id,
        createdAt: Date.now(),
        template,
        boxes,
        title,
      }
      commit([entry, ...history])
      return id
    },
    [history, commit],
  )

  const load = useCallback(
    (id: string): HistoryEntry | null => {
      return history.find((h) => h.id === id) ?? null
    },
    [history],
  )

  const remove = useCallback(
    (id: string) => {
      commit(history.filter((h) => h.id !== id))
    },
    [history, commit],
  )

  const clear = useCallback(() => commit([]), [commit])

  return useMemo(() => ({ history, save, load, remove, clear }), [history, save, load, remove, clear])
}