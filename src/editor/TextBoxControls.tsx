// Right-rail controls for the currently selected text box.

import type { TextBox } from './types'
import { FONT_FAMILIES } from './types'

type Props = {
  boxes: TextBox[]
  selectedId: string | null
  onSelect: (id: string) => void
  onChange: (id: string, patch: Partial<TextBox>) => void
  onAdd: () => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

const ROLES: { value: TextBox['role']; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'custom', label: 'Custom' },
]

export default function TextBoxControls({
  boxes,
  selectedId,
  onSelect,
  onChange,
  onAdd,
  onDelete,
  onDuplicate,
}: Props) {
  const selected = boxes.find((b) => b.id === selectedId) ?? null

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Text boxes</h2>
        <button type="button" onClick={onAdd} className="btn-ghost h-8 px-2 text-xs">
          + Add
        </button>
      </header>
      <ul className="mb-4 flex flex-wrap gap-2">
        {boxes.length === 0 && (
          <li className="text-xs text-slate-500 dark:text-slate-400">No text boxes yet.</li>
        )}
        {boxes.map((box) => (
          <li key={box.id}>
            <button
              type="button"
              onClick={() => onSelect(box.id)}
              className={`rounded-md border px-2 py-1 text-xs capitalize transition ${
                selectedId === box.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {box.role}
              {box.text ? `: ${truncate(box.text, 18)}` : ' (empty)'}
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
        <div className="space-y-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="tb-text">
              Text
            </label>
            <textarea
              id="tb-text"
              value={selected.text}
              onChange={(e) => onChange(selected.id, { text: e.target.value })}
              rows={3}
              placeholder="Type your caption…"
              className="w-full resize-y rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Role</label>
              <select
                value={selected.role}
                onChange={(e) => onChange(selected.id, { role: e.target.value as TextBox['role'] })}
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Align</label>
              <select
                value={selected.align}
                onChange={(e) => onChange(selected.id, { align: e.target.value as TextBox['align'] })}
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="tb-font">
              Font
            </label>
            <select
              id="tb-font"
              value={selected.fontFamily}
              onChange={(e) => onChange(selected.id, { fontFamily: e.target.value })}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {prettyFontName(f)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <label htmlFor="tb-size">Size</label>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">{selected.fontSize.toFixed(1)}%</span>
            </div>
            <input
              id="tb-size"
              type="range"
              min={2}
              max={20}
              step={0.5}
              value={selected.fontSize}
              onChange={(e) => onChange(selected.id, { fontSize: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <label htmlFor="tb-width">Max width</label>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">{selected.maxWidth.toFixed(0)}%</span>
            </div>
            <input
              id="tb-width"
              type="range"
              min={20}
              max={100}
              step={1}
              value={selected.maxWidth}
              onChange={(e) => onChange(selected.id, { maxWidth: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Color"
              value={selected.color}
              onChange={(v) => onChange(selected.id, { color: v })}
            />
            <ColorField
              label="Stroke"
              value={selected.strokeColor}
              onChange={(v) => onChange(selected.id, { strokeColor: v })}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <label htmlFor="tb-stroke">Stroke width</label>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">{selected.strokeWidth}</span>
            </div>
            <input
              id="tb-stroke"
              type="range"
              min={0}
              max={10}
              step={1}
              value={selected.strokeWidth}
              onChange={(e) => onChange(selected.id, { strokeWidth: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={selected.uppercase}
                onChange={(e) => onChange(selected.id, { uppercase: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              ALL CAPS
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => onDuplicate(selected.id)}
              className="btn-ghost h-8 flex-1 text-xs"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => onDelete(selected.id)}
              className="btn-ghost h-8 flex-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <p className="border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Click a text box on the canvas or in the list above to edit it.
        </p>
      )}
    </aside>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label={`${label} color`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-xs uppercase text-slate-700 outline-none dark:text-slate-200"
        />
      </div>
    </div>
  )
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}

function prettyFontName(family: string): string {
  const first = family.split(',')[0]?.replace(/['"]/g, '').trim() ?? family
  return first
}
