import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="container-page py-24 text-center">
      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Sorry, we couldn't find what you were looking for.</p>
      <Link to="/" className="btn-primary mt-6">Go home</Link>
    </section>
  )
}
