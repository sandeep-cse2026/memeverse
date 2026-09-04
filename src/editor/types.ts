// Shared types + helpers for the meme editor.

export type TextBoxRole = 'top' | 'bottom' | 'custom'

export type TextAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'middle' | 'bottom'

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
  italic: boolean
  color: string
  strokeColor: string
  strokeWidth: number
  uppercase: boolean
  align: TextAlign
  verticalAlign: VerticalAlign
  maxWidth: number
  /** Letter spacing in em units (e.g. 0.05 = loose, -0.02 = tight). */
  letterSpacing: number
  /** Line height multiplier (1.0 = tight, 1.5 = loose). */
  lineHeight: number
  /** Rotation in degrees (-180..180). */
  rotation: number
  /** Text shadow color, e.g. "rgba(0,0,0,0.75)" or "" for none. */
  shadowColor: string
  /** Shadow offset X in % of font size. */
  shadowOffsetX: number
  /** Shadow offset Y in % of font size. */
  shadowOffsetY: number
  /** Shadow blur radius in % of font size. */
  shadowBlur: number
  /** Optional background color behind the text ("" = no background). */
  backgroundColor: string
  /** Background opacity 0..1. */
  backgroundOpacity: number
  /** Background padding in % of font size. */
  backgroundPadding: number
  /** Background border radius in % of font size. */
  backgroundRadius: number
  /** Stacking order — higher renders on top. */
  zIndex: number
  /** When true, the box can't be dragged/selected for typing. */
  locked: boolean
}

export const FONT_FAMILIES = [
  'Impact, "Anton", "Oswald", sans-serif',
  '"Anton", Impact, sans-serif',
  '"Arial Black", Arial, sans-serif',
  '"Comic Sans MS", "Comic Sans", cursive',
  '"Times New Roman", Times, serif',
  'Georgia, serif',
  '"Courier New", Courier, monospace',
  '"Trebuchet MS", "Lucida Sans", sans-serif',
  'Verdana, Geneva, sans-serif',
  '"Palatino Linotype", "Book Antiqua", Palatino, serif',
] as const

export const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function createTextBox(partial: Partial<TextBox> & Pick<TextBox, 'role' | 'text' | 'x' | 'y'>): TextBox {
  return {
    id: generateId(),
    fontFamily: FONT_FAMILIES[0],
    fontSize: 9,
    fontWeight: 900,
    italic: false,
    color: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 4,
    uppercase: true,
    align: 'center',
    verticalAlign: 'middle',
    maxWidth: 90,
    letterSpacing: 0,
    lineHeight: 1.1,
    rotation: 0,
    shadowColor: '',
    shadowOffsetX: 10,
    shadowOffsetY: 10,
    shadowBlur: 20,
    backgroundColor: '',
    backgroundOpacity: 0.6,
    backgroundPadding: 30,
    backgroundRadius: 12,
    zIndex: 0,
    locked: false,
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

/**
 * A named style preset that overrides selected fields on a text box.
 * Used by the "Quick styles" section in TextBoxControls.
 */
export type TextBoxPreset = {
  id: string
  label: string
  description: string
  patch: Partial<TextBox>
}

export const TEXT_BOX_PRESETS: TextBoxPreset[] = [
  {
    id: 'classic-impact',
    label: 'Classic Impact',
    description: 'Bold white with black outline',
    patch: {
      fontFamily: FONT_FAMILIES[0],
      fontWeight: 900,
      italic: false,
      color: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 5,
      uppercase: true,
      letterSpacing: 0,
      lineHeight: 1.1,
      rotation: 0,
      shadowColor: '',
      backgroundColor: '',
      backgroundOpacity: 0.6,
    },
  },
  {
    id: 'outline-only',
    label: 'Outline only',
    description: 'Transparent fill, thick outline',
    patch: {
      color: '#00000000',
      strokeColor: '#111827',
      strokeWidth: 4,
      fontWeight: 800,
      letterSpacing: 0.02,
    },
  },
  {
    id: 'highlight',
    label: 'Highlight',
    description: 'Yellow highlighter box behind text',
    patch: {
      color: '#0f172a',
      strokeColor: '#00000000',
      strokeWidth: 0,
      fontWeight: 800,
      uppercase: false,
      backgroundColor: '#fde047',
      backgroundOpacity: 0.85,
      backgroundPadding: 30,
      backgroundRadius: 8,
      letterSpacing: 0.01,
    },
  },
  {
    id: 'subtitle',
    label: 'Subtitle',
    description: 'Small caption with drop shadow',
    patch: {
      fontFamily: FONT_FAMILIES[7],
      fontWeight: 600,
      color: '#ffffff',
      strokeColor: '#00000000',
      strokeWidth: 0,
      uppercase: false,
      fontSize: 5,
      shadowColor: 'rgba(0,0,0,0.85)',
      shadowOffsetX: 8,
      shadowOffsetY: 12,
      shadowBlur: 24,
    },
  },
  {
    id: 'soft-glow',
    label: 'Soft glow',
    description: 'Light text with a colored glow',
    patch: {
      color: '#f8fafc',
      strokeColor: '#00000000',
      strokeWidth: 0,
      fontWeight: 700,
      shadowColor: 'rgba(99,102,241,0.9)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowBlur: 40,
    },
  },
  {
    id: 'tilted',
    label: 'Tilted',
    description: 'Slightly rotated for energy',
    patch: {
      color: '#fef3c7',
      strokeColor: '#7c2d12',
      strokeWidth: 3,
      fontWeight: 900,
      rotation: -6,
      letterSpacing: 0.04,
    },
  },
  {
    id: 'spaced',
    label: 'Wide spaced',
    description: 'Loose tracking for headlines',
    patch: {
      fontWeight: 700,
      letterSpacing: 0.18,
      uppercase: true,
      color: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 3,
    },
  },
]

/**
 * Returns the field patches for snapping a text box to one of 9 named
 * positions on the stage. Caller picks the right one based on the chosen
 * preset name.
 */
export function alignmentPatch(preset: AlignmentPreset): Partial<TextBox> {
  return ALIGNMENT_PRESETS[preset]
}

export type AlignmentPreset =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export const ALIGNMENT_PRESETS: Record<AlignmentPreset, Partial<TextBox>> = {
  'top-left': { x: 10, y: 8, align: 'left', verticalAlign: 'top' },
  'top-center': { x: 50, y: 8, align: 'center', verticalAlign: 'top' },
  'top-right': { x: 90, y: 8, align: 'right', verticalAlign: 'top' },
  'middle-left': { x: 8, y: 50, align: 'left', verticalAlign: 'middle' },
  'middle-center': { x: 50, y: 50, align: 'center', verticalAlign: 'middle' },
  'middle-right': { x: 92, y: 50, align: 'right', verticalAlign: 'middle' },
  'bottom-left': { x: 10, y: 92, align: 'left', verticalAlign: 'bottom' },
  'bottom-center': { x: 50, y: 92, align: 'center', verticalAlign: 'bottom' },
  'bottom-right': { x: 90, y: 92, align: 'right', verticalAlign: 'bottom' },
}
