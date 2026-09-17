import { useEffect, useRef, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { useFavorites } from '../hooks/useFavorites'
import { useMemeHistory } from '../hooks/useMemeHistory'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive
      ? 'text-indigo-600 dark:text-indigo-400'
      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
  }`

export default function Header() {
  const { favorites } = useFavorites()
  const { history } = useMemeHistory()
  const favCount = favorites.length
  const historyCount = history.length
  const prevFavCountRef = useRef(favCount)
  const prevHistoryCountRef = useRef(historyCount)
  const [popKey, setPopKey] = useState(0)

  useEffect(() => {
    if (favCount !== prevFavCountRef.current || historyCount !== prevHistoryCountRef.current) {
      setPopKey((k) => k + 1)
      prevFavCountRef.current = favCount
      prevHistoryCountRef.current = historyCount
    }
  }, [favCount, historyCount])

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="inline-block h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
          <span>Mem</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/gallery" className={linkClass}>Gallery</NavLink>
          <NavLink to="/favorites" className={linkClass}>
            <span className="inline-flex items-center gap-1.5">
              Favorites
              {favCount > 0 && (
                <span
                  key={popKey}
                  aria-label={`${favCount} saved`}
                  className="mem-pop inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold tabular-nums text-white shadow-sm ring-2 ring-white dark:ring-slate-950"
                >
                  {favCount > 99 ? '99+' : favCount}
                </span>
              )}
            </span>
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            <span className="inline-flex items-center gap-1.5">
              History
              {historyCount > 0 && (
                <span
                  key={popKey}
                  aria-label={`${historyCount} saved`}
                  className="mem-pop inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-semibold tabular-nums text-white shadow-sm ring-2 ring-white dark:ring-slate-950"
                >
                  {historyCount > 99 ? '99+' : historyCount}
                </span>
              )}
            </span>
          </NavLink>
          <NavLink to="/editor" className={linkClass}>Editor</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/editor" className="btn-primary hidden sm:inline-flex">New</Link>
        </div>
      </div>
    </header>
  )
}
