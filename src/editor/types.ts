// Shared types + helpers for the meme editor.

export type TextBoxRole = 'top' | 'bottom' | 'custom'

export type TextBox = {
  id: string
  role: TextBoxRole
  text: string
  /** Position as a percentage of the stage (0-100). Resilient to template size. */
  x: number
  y: number
  fontFamily: string
  /** Font size in % of the smaller stage dimension so it scales with the template. */
  fontSize: number
  fontWeight: number
  color: string
  strokeColor: string
  strokeWidth: number
  uppercase: boolean
  align: 'left' | 'center' | 'right'
  maxWidth: number
}

export const FONT_FAMILIES = [
  'Impact, "Anton", "Oswald", sans-serif',
  '"Anton", Impact, sans-serif',
  '"Arial Black", Arial, sans-serif',
  '"Comic Sans MS", "Comic Sans", cursive',
  '"Times New Roman", Times, serif',
  'Georgia, serif',
  '"Courier New", Courier, monospace',
] as const

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function createTextBox(partial: Partial<TextBox> & Pick<TextBox, 'role' | 'text' | 'x' | 'y'>): TextBox {
  return {
    id: generateId(),
    fontFamily: FONT_FAMILIES[0],
    fontSize: 9,
    fontWeight: 900,
    color: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 4,
    uppercase: true,
    align: 'center',
    maxWidth: 90,
    ...partial,
  }
}

export function defaultBoxesFor(template: { box_count: number; name: string } | null): TextBox[] {
  if (!template) {
    return [
      createTextBox({ role: 'top', text: 'TOP TEXT', x: 50, y: 8 }),
      createTextBox({ role: 'bottom', text: 'BOTTOM TEXT', x: 50, y: 92 }),
    ]
  }
  // Use the first two as top/bottom, then a few customs.
  const count = Math.max(2, Math.min(template.box_count, 4))
  const out: TextBox[] = []
  out.push(createTextBox({ role: 'top', text: template.name.toUpperCase().slice(0, 40), x: 50, y: 8 }))
  out.push(createTextBox({ role: 'bottom', text: 'BOTTOM TEXT', x: 50, y: 92 }))
  if (count >= 3) {
    out.push(createTextBox({ role: 'custom', text: '', x: 50, y: 50, fontSize: 6, uppercase: false }))
  }
  if (count >= 4) {
    out.push(createTextBox({ role: 'custom', text: '', x: 30, y: 60, fontSize: 5, uppercase: false }))
  }
  return out
}
