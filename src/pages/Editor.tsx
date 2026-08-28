import { useState } from 'react'

export default function Editor() {
  const [text, setText] = useState('Today I noticed the light falling across the desk in long, slow bands.')
  return (
    <section className="container-page py-12">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">Editor</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">A simple text placeholder — wired up and ready for the rich editor to land.</p>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label htmlFor="entry" className="sr-only">Entry</label>
        <textarea
          id="entry"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{text.length} characters</span>
          <button type="button" onClick={() => setText('')} className="btn-ghost h-8 px-3 text-xs">Clear</button>
        </div>
      </div>
    </section>
  )
}
