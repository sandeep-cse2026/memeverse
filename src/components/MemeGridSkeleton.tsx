type Props = {
  count?: number
  /** Compact mode: smaller tiles for the editor sidebar. */
  compact?: boolean
}

export default function MemeGridSkeleton({ count = 12, compact = false }: Props) {
  if (compact) {
    return (
      <ul aria-hidden className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <li
            key={i}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="aspect-[4/3] w-full animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800" />
            <div className="h-2 w-2/3 animate-pulse bg-slate-200 p-1 dark:bg-slate-800" />
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ul
      aria-hidden
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </li>
      ))}
    </ul>
  )
}
