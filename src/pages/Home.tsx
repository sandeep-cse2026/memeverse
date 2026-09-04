import { Link } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'
import { useRecentTemplates } from '../hooks/useRecentTemplates'

export default function Home() {
  const { favorites } = useFavorites()
  const { recents } = useRecentTemplates()
  const hasHistory = favorites.length > 0 || recents.length > 0

  return (
    <section>
      <div className="container-page py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            v0.1 — now in beta
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            A calmer place for your <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">memories</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            Mem is a modern gallery and editor for the moments that matter. Curate, annotate, and revisit — across devices, in light or dark.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/editor" className="btn-primary">Start creating</Link>
            <Link to="/gallery" className="btn-ghost">Browse gallery</Link>
            {hasHistory && (
              <Link to="/favorites" className="btn-ghost">
                {favorites.length > 0
                  ? `Your ${favorites.length} favorite${favorites.length === 1 ? '' : 's'}`
                  : 'Jump back in'}
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: 'Fast', desc: 'Built on Vite — instant dev and a tiny production bundle.' },
            { title: 'Themable', desc: 'Light and dark, with system preference detection.' },
            { title: 'Responsive', desc: 'Looks great on phones, tablets, and large screens.' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white/60 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
