const items = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  title: `Moment ${i + 1}`,
  hue: (i * 47) % 360,
}))

export default function Gallery() {
  return (
    <section className="container-page py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Gallery</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">A small grid of placeholder moments.</p>
        </div>
      </header>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <li key={it.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div
              aria-hidden
              className="aspect-[4/3] w-full"
              style={{
                background: `linear-gradient(135deg, hsl(${it.hue} 70% 60%), hsl(${(it.hue + 60) % 360} 70% 50%))`,
              }}
            />
            <div className="p-4">
              <h2 className="text-sm font-medium">{it.title}</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tap to open in editor</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
