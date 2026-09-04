// Side panel that lists the user's saved meme drafts, with restore,
// rename, delete, and clear-all actions. The panel reads from the
// shared useDrafts hook so it stays in sync with the editor in real time.

import { useMemo, useState } from 'react'
import type { Draft } from '../hooks/useDrafts'

type Props = {
  drafts: Draft[]
  /** The currently-active named draft id (if the open session was loaded from one). */
  activeDraftId: string | null
  /** Whether the in-memory session matches a named draft (i.e. the user could overwrite it). */
  canUpdateActive: boolean
  onRestore: (draft: Draft) => void
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
  onUpdateActive: () => void
  onSaveNew: (name: string) => void
  onClearAll: () => void
}

function formatTime(ts: number): string {
  if (!ts) return ''
  const now = Date.now()
  const delta = now - ts
  if (delta < 60_000) return 'just now'
  if (delta < 3_600_000) {
    const m = Math.round(delta / 60_000)
    return `${m}m ago`
  }
  if (delta < 86_400_000) {
    const h = Math.round(delta / 3_600_000)
    return `${h}h ago`
  }
  const d = Math.round(delta / 86_400_000)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function previewMeme(draft: Draft): { url: string | null; name: string } {
  if (draft.templateUrl) {
    return { url: draft.templateUrl, name: draft.templateName ?? draft.name }
  }
  return { url: null, name: draft.templateName ?? 'Blank canvas' }
}

export default function DraftsPanel({
  drafts,
  activeDraftId,
  canUpdateActive,
  onRestore,
  onRename,
  onRemove,
  onUpdateActive,
  onSaveNew,
  onClearAll,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newName, setNewName] = useState('')

  const ordered = useMemo(
    () => [...drafts].sort((a, b) => b.updatedAt - a.updatedAt),
    [drafts],
  )

  const handleRenameSubmit = (id: string) => {
    if (renameValue.trim()) {
      onRename(id, renameValue)
    }
    setRenamingId(null)
    setRenameValue('')
  }

  return (
    <section
      aria-label="Drafts"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Drafts</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {drafts.length === 0
              ? 'Auto-saved as you type'
              : `${drafts.length} saved · auto-saves keep working`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setShowSaveDialog(true)
              setNewName('')
            }}
            className="btn-ghost h-7 px-2 text-xs"
            aria-label="Save current as new draft"
            title="Save a named copy"
          >
            + Save
          </button>
        </div>
      </header>

      {showSaveDialog && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const name = newName.trim()
            if (!name) return
            onSaveNew(name)
            setShowSaveDialog(false)
            setNewName('')
          }}
          className="mb-3 rounded-md border border-indigo-200 bg-indigo-50/50 p-2 dark:border-indigo-900/50 dark:bg-indigo-950/30"
        >
          <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-300" htmlFor="draft-name">
            Draft name
          </label>
          <div className="flex gap-1.5">
            <input
              id="draft-name"
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Drake hotline takes"
              className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button type="submit" className="btn-primary h-7 px-2 text-xs" disabled={!newName.trim()}>
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSaveDialog(false)
                setNewName('')
              }}
              className="btn-ghost h-7 px-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {canUpdateActive && activeDraftId && (
        <button
          type="button"
          onClick={onUpdateActive}
          className="mb-3 w-full rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-left text-xs text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
        >
          <span className="font-medium">Overwrite this draft</span>
          <span className="block text-[11px] opacity-80">Save the current edits back to the open draft.</span>
        </button>
      )}

      {drafts.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 p-3 text-center text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No saved drafts yet. Use “+ Save” to keep a named copy, or just keep typing — your work is being auto-saved.
        </p>
      ) : (
        <>
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {ordered.map((draft) => {
              const preview = previewMeme(draft)
              const isActive = activeDraftId === draft.id
              const isRenaming = renamingId === draft.id
              return (
                <li
                  key={draft.id}
                  className={`group flex items-center gap-2 rounded-md border px-2 py-1.5 transition ${
                    isActive
                      ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-800 dark:bg-indigo-950/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="h-9 w-12 flex-shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                    {preview.url ? (
                      <img
                        src={preview.url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-400">
                        ⌧
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameSubmit(draft.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleRenameSubmit(draft.id)
                          } else if (e.key === 'Escape') {
                            setRenamingId(null)
                            setRenameValue('')
                          }
                        }}
                        className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRestore(draft)}
                        className="block w-full truncate text-left text-xs font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-300"
                        title={`Restore “${draft.name}”`}
                      >
                        {draft.name}
                      </button>
                    )}
                    <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {preview.name} · {draft.boxes.length} box{draft.boxes.length === 1 ? '' : 'es'} · {formatTime(draft.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(draft.id)
                        setRenameValue(draft.name)
                      }}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      aria-label={`Rename “${draft.name}”`}
                      title="Rename"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete draft “${draft.name}”?`)) onRemove(draft.id)
                      }}
                      className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                      aria-label={`Delete “${draft.name}”`}
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {drafts.length > 1 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete all saved drafts? This cannot be undone.')) onClearAll()
              }}
              className="mt-3 w-full rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
            >
              Clear all drafts
            </button>
          )}
        </>
      )}
    </section>
  )
}
