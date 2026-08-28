export default function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/60 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="container-page flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} Mem. Crafted with care.
        </p>
        <ul className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
          <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Privacy</a></li>
          <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Terms</a></li>
          <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Contact</a></li>
        </ul>
      </div>
    </footer>
  )
}
