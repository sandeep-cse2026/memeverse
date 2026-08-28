import { useState } from 'react'
import type { Meme } from '../api/imgflip'

type Props = {
  meme: Meme
}

export default function MemeCard({ meme }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <li className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
        {!loaded && !failed && (
          <div
            aria-hidden
            className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800"
          />
        )}
        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-slate-500 dark:text-slate-400">
            Image unavailable
          </div>
        ) : (
          <img
            src={meme.url}
            alt={meme.name}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>
      <div className="p-3">
        <h2 className="line-clamp-1 text-sm font-medium" title={meme.name}>
          {meme.name}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {meme.width}×{meme.height} · {meme.box_count} boxes
        </p>
      </div>
    </li>
  )
}
