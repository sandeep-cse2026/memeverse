import { NavLink, Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive
      ? 'text-indigo-600 dark:text-indigo-400'
      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
  }`

export default function Header() {
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
          <NavLink to="/favorites" className={linkClass}>Favorites</NavLink>
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
