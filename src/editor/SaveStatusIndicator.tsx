// Small inline pill that mirrors the current auto-save state. Helps the
// user trust that their work is being captured even when they haven't
// explicitly saved a named draft.

type Status = 'idle' | 'saving' | 'saved'

type Props = {
  status: Status
  lastSavedAt: number | null
  /** Render in a more compact "for the header" variant. */
  compact?: boolean
}

function formatRelative(ts: number | null): string {
  if (!ts) return 'not saved yet'
  const delta = Date.now() - ts
  if (delta < 5_000) return 'saved just now'
  if (delta < 60_000) return `saved ${Math.round(delta / 1000)}s ago`
  if (delta < 3_600_000) return `saved ${Math.round(delta / 60_000)}m ago`
  return `saved at ${new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

export default function SaveStatusIndicator({ status, lastSavedAt, compact = false }: Props) {
  const label = status === 'saving' ? 'Saving…' : status === 'saved' ? formatRelative(lastSavedAt) : 'Auto-save ready'
  const dot =
    status === 'saving'
      ? 'bg-amber-400 animate-pulse'
      : status === 'saved'
        ? 'bg-emerald-500'
        : 'bg-slate-400 dark:bg-slate-500'
  const textClass =
    status === 'saving'
      ? 'text-amber-700 dark:text-amber-300'
      : status === 'saved'
        ? 'text-emerald-700 dark:text-emerald-300'
        : 'text-slate-500 dark:text-slate-400'

  if (compact) {
    return (
      <span
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium ${textClass} dark:bg-slate-800/70`}
        title={label}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
        {status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : 'Auto'}
      </span>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white/80 px-2 py-1 text-[11px] font-medium shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 ${textClass}`}
      title={label}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </div>
  )
}
