// Meme drafts & auto-saves.
//
// A draft is a named, persisted snapshot of an in-progress editor session:
// the current template (if any) plus all of its text boxes. Drafts are
// stored in localStorage so they survive reloads, are de-duplicated, and
// broadcast changes across components via a custom window event so the
// editor, draft picker, and header badge stay in sync.
//
// The hook also owns a tiny "session" — the draft the user is currently
// editing — so that:
//   - the latest in-flight edits are auto-saved on a debounce
//   - a manual "Save as…" can snapshot the current state to a named slot
//   - the user can browse / restore / delete prior named drafts
//
// The "session" is intentionally stored separately from named drafts so a
// refresh always lands the user back where they left off, even if they
// never explicitly saved a named draft.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Meme } from '../api/imgflip'
import type { TextBox } from '../editor/types'

const DRAFTS_KEY = 'mem:drafts:v1'
const SESSION_KEY = 'mem:drafts:session:v1'
const EVENT_NAME = 'mem:drafts:changed'
const SESSION_EVENT = 'mem:drafts:session:changed'
const AUTOSAVE_DEBOUNCE_MS = 600
const MAX_NAMED_DRAFTS = 50

export type Draft = {
  id: string
  /** Display name, user-editable. */
  name: string
  /** Template the draft was created with (or null for blank). */
  templateId: string | null
  templateName: string | null
  templateUrl: string | null
  boxes: TextBox[]
  /** ms-since-epoch. */
  createdAt: number
  updatedAt: number
}

export type DraftSession = {
  templateId: string | null
  boxes: TextBox[]
  updatedAt: number
}

export type DraftsListener = (drafts: Draft[]) => void
export type SessionListener = (session: DraftSession | null) => void

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function readDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((d): d is Draft =>
        typeof d === 'object' && d !== null &&
        typeof (d as Draft).id === 'string' &&
        typeof (d as Draft).name === 'string' &&
        Array.isArray((d as Draft).boxes),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_NAMED_DRAFTS)
  } catch {
    return []
  }
}

function writeDrafts(drafts: Draft[]) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, MAX_NAMED_DRAFTS)))
  } catch {
    // ignore quota / privacy errors
  }
}

function readSession(): DraftSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DraftSession
    if (!parsed || !Array.isArray(parsed.boxes)) return null
    return parsed
  } catch {
    return null
  }
}

function writeSession(session: DraftSession | null) {
  try {
    if (session === null) {
      localStorage.removeItem(SESSION_KEY)
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }
  } catch {
    // ignore
  }
}

function emitDrafts(drafts: Draft[]) {
  try {
    window.dispatchEvent(new CustomEvent<Draft[]>(EVENT_NAME, { detail: drafts }))
  } catch {
    // older browsers — best effort
  }
}

function emitSession(session: DraftSession | null) {
  try {
    window.dispatchEvent(new CustomEvent<DraftSession | null>(SESSION_EVENT, { detail: session }))
  } catch {
    // best effort
  }
}

function subscribeDrafts(listener: DraftsListener) {
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<Draft[]>).detail
    if (Array.isArray(detail)) listener(detail)
  }
  window.addEventListener(EVENT_NAME, handler)
  const storageHandler = (e: StorageEvent) => {
    if (e.key === DRAFTS_KEY) listener(readDrafts())
  }
  window.addEventListener('storage', storageHandler)
  return () => {
    window.removeEventListener(EVENT_NAME, handler)
    window.removeEventListener('storage', storageHandler)
  }
}

function subscribeSession(listener: SessionListener) {
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<DraftSession | null>).detail
    if (detail === null || (detail && Array.isArray(detail.boxes))) listener(detail)
  }
  window.addEventListener(SESSION_EVENT, handler)
  const storageHandler = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) listener(readSession())
  }
  window.addEventListener('storage', storageHandler)
  return () => {
    window.removeEventListener(SESSION_EVENT, handler)
    window.removeEventListener('storage', storageHandler)
  }
}

export type SaveStatus = 'idle' | 'saving' | 'saved'

export type UseDraftsResult = {
  drafts: Draft[]
  /** Draft currently being edited in this hook instance, if any. */
  session: DraftSession | null
  /** The active auto-save state for the current session. */
  status: SaveStatus
  /** Last time the session was persisted. */
  lastSavedAt: number | null
  /** Persist the current state as the active auto-saved session (debounced). */
  autosave: (state: { template: Pick<Meme, 'id' | 'name' | 'url'> | null; boxes: TextBox[] }) => void
  /** Save the current state to a new named draft and return its id. */
  saveNamed: (name: string, state: { template: Pick<Meme, 'id' | 'name' | 'url'> | null; boxes: TextBox[] }) => Draft
  /** Replace a named draft's content (keeps the same id/name). */
  updateNamed: (id: string, state: { template: Pick<Meme, 'id' | 'name' | 'url'> | null; boxes: TextBox[] }) => void
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  clearAll: () => void
  /** Discard the in-flight session (e.g. on "Start blank"). */
  clearSession: () => void
}

export function useDrafts(): UseDraftsResult {
  const [drafts, setDrafts] = useState<Draft[]>(() => readDrafts())
  const [session, setSession] = useState<DraftSession | null>(() => readSession())
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  // Keep a ref to the debounce timer so we can flush on unmount / explicit save.
  const debounceRef = useRef<number | null>(null)
  // Pending autosave payload (so the latest values always win).
  const pendingRef = useRef<{ template: Pick<Meme, 'id' | 'name' | 'url'> | null; boxes: TextBox[] } | null>(null)
  // Session-id used for the in-flight "current draft" — gives us a stable
  // identity for the `currentDraftId` companion query, but kept out of
  // state to avoid render thrash.
  const hydratedRef = useRef(false)

  useEffect(() => {
    const offDrafts = subscribeDrafts((next) => setDrafts(next))
    const offSession = subscribeSession((next) => setSession(next))
    hydratedRef.current = true
    return () => {
      offDrafts()
      offSession()
    }
  }, [])

  const commitDrafts = useCallback((next: Draft[]) => {
    setDrafts(next)
    writeDrafts(next)
    emitDrafts(next)
  }, [])

  const commitSession = useCallback((next: DraftSession | null) => {
    setSession(next)
    writeSession(next)
    emitSession(next)
  }, [])

  const performAutosave = useCallback(
    (template: Pick<Meme, 'id' | 'name' | 'url'> | null, boxes: TextBox[]) => {
      const now = Date.now()
      commitSession({
        templateId: template?.id ?? null,
        boxes,
        updatedAt: now,
      })
      setLastSavedAt(now)
      setStatus('saved')
    },
    [commitSession],
  )

  const flushAutosave = useCallback(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (pendingRef.current) {
      performAutosave(pendingRef.current.template, pendingRef.current.boxes)
      pendingRef.current = null
    }
  }, [performAutosave])

  const autosave = useCallback(
    (state: { template: Pick<Meme, 'id' | 'name' | 'url'> | null; boxes: TextBox[] }) => {
      pendingRef.current = state
      setStatus('saving')
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current)
      }
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null
        if (pendingRef.current) {
          performAutosave(pendingRef.current.template, pendingRef.current.boxes)
          pendingRef.current = null
        }
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [performAutosave],
  )

  const saveNamed = useCallback(
    (name: string, state: { template: Pick<Meme, 'id' | 'name' | 'url'> | null; boxes: TextBox[] }): Draft => {
      const now = Date.now()
      const trimmed = name.trim() || 'Untitled draft'
      const draft: Draft = {
        id: generateId(),
        name: trimmed,
        templateId: state.template?.id ?? null,
        templateName: state.template?.name ?? null,
        templateUrl: state.template?.url ?? null,
        boxes: state.boxes,
        createdAt: now,
        updatedAt: now,
      }
      // Skip if a draft with the same name already exists — update it instead
      // so we don't accumulate duplicates from rapid re-saves.
      const existingIdx = drafts.findIndex(
        (d) => d.name.toLowerCase() === trimmed.toLowerCase(),
      )
      if (existingIdx >= 0) {
        const existing = drafts[existingIdx]
        const updated: Draft = {
          ...existing,
          templateId: draft.templateId,
          templateName: draft.templateName,
          templateUrl: draft.templateUrl,
          boxes: draft.boxes,
          updatedAt: now,
        }
        const next = [...drafts]
        next[existingIdx] = updated
        commitDrafts(next)
        return updated
      }
      commitDrafts([draft, ...drafts])
      return draft
    },
    [drafts, commitDrafts],
  )

  const updateNamed = useCallback(
    (id: string, state: { template: Pick<Meme, 'id' | 'name' | 'url'> | null; boxes: TextBox[] }) => {
      const now = Date.now()
      const next = drafts.map((d) =>
        d.id === id
          ? {
              ...d,
              templateId: state.template?.id ?? null,
              templateName: state.template?.name ?? null,
              templateUrl: state.template?.url ?? null,
              boxes: state.boxes,
              updatedAt: now,
            }
          : d,
      )
      commitDrafts(next)
    },
    [drafts, commitDrafts],
  )

  const rename = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const next = drafts.map((d) => (d.id === id ? { ...d, name: trimmed, updatedAt: Date.now() } : d))
      commitDrafts(next)
    },
    [drafts, commitDrafts],
  )

  const remove = useCallback(
    (id: string) => {
      commitDrafts(drafts.filter((d) => d.id !== id))
    },
    [drafts, commitDrafts],
  )

  const clearAll = useCallback(() => {
    commitDrafts([])
  }, [commitDrafts])

  const clearSession = useCallback(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    pendingRef.current = null
    commitSession(null)
    setLastSavedAt(null)
    setStatus('idle')
  }, [commitSession])

  // Flush any pending autosave when the hook unmounts so navigating away
  // doesn't silently drop the most recent keystroke.
  useEffect(() => {
    return () => {
      flushAutosave()
    }
  }, [flushAutosave])

  return useMemo(
    () => ({
      drafts,
      session,
      status,
      lastSavedAt,
      autosave,
      saveNamed,
      updateNamed,
      rename,
      remove,
      clearAll,
      clearSession,
    }),
    [
      drafts,
      session,
      status,
      lastSavedAt,
      autosave,
      saveNamed,
      updateNamed,
      rename,
      remove,
      clearAll,
      clearSession,
    ],
  )
}
