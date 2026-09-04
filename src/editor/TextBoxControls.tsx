// Right-rail controls for the currently selected text box.

import type { TextBox } from './types'
import {
  ALIGNMENT_PRESETS,
  FONT_FAMILIES,
  FONT_WEIGHTS,
  TEXT_BOX_PRESETS,
  type AlignmentPreset,
} from './types'

type Props = {
  boxes: TextBox[]
  selectedId: string | null
  onSelect: (id: string) => void
  onChange: (id: string, patch: Partial<TextBox>) => void
  onAdd: () => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onBringForward: (id: string) => void
  onSendBackward: (id: string) => void
}

const ROLES: { value: TextBox['role']; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'custom', label: 'Custom' },
]

const HORIZONTAL_ALIGNS: { value: TextBox['align']; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

const VERTICAL_ALIGNS: { value: TextBox['verticalAlign']; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'middle', label: 'Middle' },
  { value: 'bottom', label: 'Bottom' },
]

const ALIGNMENT_GRID: AlignmentPreset[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

const SHADOW_PRESETS: { label: string; patch: Partial<TextBox> }[] = [
  { label: 'None', patch: { shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 } },
  { label: 'Soft', patch: { shadowColor: 'rgba(0,0,0,0.55)', shadowBlur: 30, shadowOffsetX: 0, shadowOffsetY: 12 } },
  { label: 'Hard', patch: { shadowColor: 'rgba(0,0,0,0.9)', shadowBlur: 0, shadowOffsetX: 12, shadowOffsetY: 12 } },
  { label: 'Neon', patch: { shadowColor: 'rgba(244,114,182,0.95)', shadowBlur: 50, shadowOffsetX: 0, shadowOffsetY: 0 } },
]

export default function TextBoxControls({
  boxes,
  selectedId,
  onSelect,
  onChange,
  onAdd,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
}: Props) {
  const selected = boxes.find((b) => b.id === selectedId) ?? null
  const bgActive = Boolean(selected?.backgroundColor)

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
              {box.locked ? '🔒 ' : ''}
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

          <Section title="Quick styles" hint="One-click looks">
            <div className="grid grid-cols-2 gap-1.5">
              {TEXT_BOX_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange(selected.id, preset.patch)}
                  title={preset.description}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left text-[11px] font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Position" hint="Snap to 9 grid anchors">
            <div>
              <div className="grid grid-cols-3 gap-1">
                {ALIGNMENT_GRID.map((preset) => {
                  const patch = ALIGNMENT_PRESETS[preset]
                  const active =
                    selected.x === patch.x && selected.y === patch.y && selected.align === patch.align
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onChange(selected.id, patch)}
                      aria-label={`Align ${preset.replace('-', ' / ')}`}
                      title={`Snap to ${preset.replace('-', ' / ')}`}
                      className={`h-7 rounded border transition ${
                        active
                          ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-950/40'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950'
                      }`}
                    >
                      <span
                        className={`mx-auto block h-2 w-2 rounded-sm ${
                          active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <RangeField
                  id="tb-x"
                  label="X"
                  min={0}
                  max={100}
                  step={0.5}
                  value={selected.x}
                  suffix="%"
                  onChange={(v) => onChange(selected.id, { x: v })}
                />
                <RangeField
                  id="tb-y"
                  label="Y"
                  min={0}
                  max={100}
                  step={0.5}
                  value={selected.y}
                  suffix="%"
                  onChange={(v) => onChange(selected.id, { y: v })}
                />
              </div>
            </div>
          </Section>

          <Section title="Alignment" hint="Horizontal and vertical">
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                id="tb-align"
                label="Horizontal"
                value={selected.align}
                onChange={(v) => onChange(selected.id, { align: v as TextBox['align'] })}
                options={HORIZONTAL_ALIGNS.map((a) => ({ value: a.value, label: a.label }))}
              />
              <SelectField
                id="tb-valign"
                label="Vertical"
                value={selected.verticalAlign}
                onChange={(v) => onChange(selected.id, { verticalAlign: v as TextBox['verticalAlign'] })}
                options={VERTICAL_ALIGNS.map((a) => ({ value: a.value, label: a.label }))}
              />
            </div>
          </Section>

          <Section title="Typography">
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
            <div className="mt-2 grid grid-cols-2 gap-2">
              <SelectField
                id="tb-weight"
                label="Weight"
                value={String(selected.fontWeight)}
                onChange={(v) => onChange(selected.id, { fontWeight: Number(v) })}
                options={FONT_WEIGHTS.map((w) => ({ value: String(w), label: String(w) }))}
              />
              <div className="flex items-end">
                <label className="flex h-[34px] w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={selected.italic}
                    onChange={(e) => onChange(selected.id, { italic: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Italic
                </label>
              </div>
            </div>
            <div className="mt-2">
              <RangeField
                id="tb-size"
                label="Size"
                min={2}
                max={20}
                step={0.5}
                value={selected.fontSize}
                suffix="%"
                onChange={(v) => onChange(selected.id, { fontSize: v })}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <RangeField
                id="tb-spacing"
                label="Letter spacing"
                min={-0.1}
                max={0.4}
                step={0.01}
                value={selected.letterSpacing}
                suffix="em"
                onChange={(v) => onChange(selected.id, { letterSpacing: v })}
              />
              <RangeField
                id="tb-leading"
                label="Line height"
                min={0.8}
                max={2.2}
                step={0.05}
                value={selected.lineHeight}
                onChange={(v) => onChange(selected.id, { lineHeight: v })}
              />
            </div>
            <div className="mt-2">
              <RangeField
                id="tb-rotation"
                label="Rotation"
                min={-45}
                max={45}
                step={1}
                value={selected.rotation}
                suffix="°"
                onChange={(v) => onChange(selected.id, { rotation: v })}
              />
            </div>
          </Section>

          <Section title="Colors">
            <div className="grid grid-cols-2 gap-2">
              <ColorField
                label="Fill"
                value={selected.color}
                onChange={(v) => onChange(selected.id, { color: v })}
              />
              <ColorField
                label="Outline"
                value={selected.strokeColor}
                onChange={(v) => onChange(selected.id, { strokeColor: v })}
              />
            </div>
            <div className="mt-2">
              <RangeField
                id="tb-stroke"
                label="Outline width"
                min={0}
                max={10}
                step={1}
                value={selected.strokeWidth}
                onChange={(v) => onChange(selected.id, { strokeWidth: v })}
              />
            </div>
          </Section>

          <Section title="Drop shadow" hint="Soften, sharpen, or glow">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SHADOW_PRESETS.map((p) => {
                const active =
                  selected.shadowColor === p.patch.shadowColor &&
                  (Number(p.patch.shadowBlur) || 0) === selected.shadowBlur
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => onChange(selected.id, p.patch)}
                    className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <ColorField
              label="Shadow color"
              value={selected.shadowColor || '#000000'}
              allowTransparent
              onChange={(v) => onChange(selected.id, { shadowColor: v })}
            />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <RangeField
                id="tb-shadow-x"
                label="X"
                min={-40}
                max={40}
                step={1}
                value={selected.shadowOffsetX}
                suffix="%"
                onChange={(v) => onChange(selected.id, { shadowOffsetX: v })}
              />
              <RangeField
                id="tb-shadow-y"
                label="Y"
                min={-40}
                max={40}
                step={1}
                value={selected.shadowOffsetY}
                suffix="%"
                onChange={(v) => onChange(selected.id, { shadowOffsetY: v })}
              />
              <RangeField
                id="tb-shadow-blur"
                label="Blur"
                min={0}
                max={80}
                step={1}
                value={selected.shadowBlur}
                suffix="%"
                onChange={(v) => onChange(selected.id, { shadowBlur: v })}
              />
            </div>
          </Section>

          <Section title="Highlight box" hint="Background behind text">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="tb-bg-toggle">
                Background
              </label>
              <label className="inline-flex cursor-pointer items-center" htmlFor="tb-bg-toggle">
                <span className="sr-only">Toggle background</span>
                <input
                  id="tb-bg-toggle"
                  type="checkbox"
                  checked={bgActive}
                  onChange={(e) => {
                    onChange(selected.id, {
                      backgroundColor: e.target.checked
                        ? selected.backgroundColor || '#fde047'
                        : '',
                    })
                  }}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="relative h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-indigo-500 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-300 dark:bg-slate-700"
                >
                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </span>
              </label>
            </div>
            {bgActive && (
              <>
                <ColorField
                  label="Box color"
                  value={selected.backgroundColor || '#fde047'}
                  onChange={(v) => onChange(selected.id, { backgroundColor: v })}
                />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <RangeField
                    id="tb-bg-opacity"
                    label="Opacity"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selected.backgroundOpacity}
                    onChange={(v) => onChange(selected.id, { backgroundOpacity: v })}
                  />
                  <RangeField
                    id="tb-bg-padding"
                    label="Padding"
                    min={0}
                    max={150}
                    step={1}
                    value={selected.backgroundPadding}
                    suffix="%"
                    onChange={(v) => onChange(selected.id, { backgroundPadding: v })}
                  />
                  <RangeField
                    id="tb-bg-radius"
                    label="Radius"
                    min={0}
                    max={80}
                    step={1}
                    value={selected.backgroundRadius}
                    suffix="%"
                    onChange={(v) => onChange(selected.id, { backgroundRadius: v })}
                  />
                </div>
              </>
            )}
          </Section>

          <Section title="Box width">
            <RangeField
              id="tb-width"
              label="Max width"
              min={20}
              max={100}
              step={1}
              value={selected.maxWidth}
              suffix="%"
              onChange={(v) => onChange(selected.id, { maxWidth: v })}
            />
          </Section>

          <Section title="Behavior">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={selected.uppercase}
                  onChange={(e) => onChange(selected.id, { uppercase: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                ALL CAPS
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={selected.locked}
                  onChange={(e) => onChange(selected.id, { locked: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Lock position
              </label>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <SelectField
                id="tb-role"
                label="Role"
                value={selected.role}
                onChange={(v) => onChange(selected.id, { role: v as TextBox['role'] })}
                options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Layer
                </label>
                <div className="flex h-[34px] gap-1">
                  <button
                    type="button"
                    onClick={() => onSendBackward(selected.id)}
                    title="Send backward"
                    className="btn-ghost h-full flex-1 px-2 text-xs"
                    aria-label="Send backward"
                  >
                    ⤓ Back
                  </button>
                  <button
                    type="button"
                    onClick={() => onBringForward(selected.id)}
                    title="Bring forward"
                    className="btn-ghost h-full flex-1 px-2 text-xs"
                    aria-label="Bring forward"
                  >
                    ⤒ Front
                  </button>
                </div>
              </div>
            </div>
          </Section>

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

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </h3>
        {hint && <span className="text-[10px] text-slate-400 dark:text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function RangeField({
  id,
  label,
  min,
  max,
  step,
  value,
  suffix = '',
  onChange,
}: {
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
        <label htmlFor={id}>{label}</label>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {value.toFixed(step < 1 ? 2 : 0)}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
  allowTransparent = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  allowTransparent?: boolean
}) {
  // Color inputs require a 6-char hex. Fall back to black for rgba values.
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950">
        <input
          type="color"
          value={safeHex}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label={`${label} color`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={allowTransparent ? 'none / rgba(...)' : '#000000'}
          className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
        />
        {allowTransparent && (
          <button
            type="button"
            title="Clear (transparent)"
            onClick={() => onChange('')}
            className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
          >
            none
          </button>
        )}
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
