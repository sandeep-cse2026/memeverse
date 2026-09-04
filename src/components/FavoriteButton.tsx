// Heart button that toggles a meme's favorite state. Stops click propagation
// so it can sit inside a Link without triggering navigation. Fires a small
// particle burst when the heart goes from inactive → active so the action
// feels rewarding.

import { useCallback, useState } from 'react'
import { useFavorites } from '../hooks/useFavorites'

type Props = {
  memeId: string
  /** Show the label next to the heart. */
  withLabel?: boolean
  className?: string
}

const BURST_PARTICLES = 6

export default function FavoriteButton({ memeId, withLabel = false, className = '' }: Props) {
  const { isFavorite, toggle } = useFavorites()
  const [popping, setPopping] = useState(false)
  const [burstId, setBurstId] = useState(0)
  const active = isFavorite(memeId)

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const willActivate = !active
      toggle(memeId)
      if (willActivate) {
        setPopping(true)
        setBurstId((id) => id + 1)
        window.setTimeout(() => setPopping(false), 320)
      }
    },
    [toggle, memeId, active],
  )

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? `Remove from favorites` : `Add to favorites`}
      aria-pressed={active}
      title={active ? 'Remove from favorites' : 'Add to favorites'}
      className={`relative inline-flex items-center justify-center gap-1.5 rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
        active
          ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60'
          : 'border-slate-200 bg-white/90 text-slate-600 hover:bg-white hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-rose-300'
      } ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={`relative z-[1] h-4 w-4 transition-transform duration-200 ${
          popping ? 'scale-125' : 'scale-100'
        }`}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {withLabel && (
        <span className="text-xs font-medium">{active ? 'Favorited' : 'Favorite'}</span>
      )}
      {popping && (
        <span aria-hidden className="pointer-events-none absolute inset-0 z-[2]">
          {Array.from({ length: BURST_PARTICLES }).map((_, i) => {
            const angle = (i / BURST_PARTICLES) * Math.PI * 2
            const distance = 14 + (i % 2) * 4
            const dx = Math.cos(angle) * distance
            const dy = Math.sin(angle) * distance
            return (
              <span
                key={`${burstId}-${i}`}
                className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-rose-500 animate-burst"
                style={{
                  ['--burst-x' as string]: `${dx}px`,
                  ['--burst-y' as string]: `${dy}px`,
                }}
              />
            )
          })}
        </span>
      )}
    </button>
  )
}
