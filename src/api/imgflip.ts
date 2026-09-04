// Imgflip API client + localStorage cache, plus client-side helpers for
// generating, downloading, and sharing captioned memes.

export type Meme = {
  id: string
  name: string
  url: string
  width: number
  height: number
  box_count: number
}

export type ImgflipResponse = {
  success: boolean
  error_message?: string
  data: {
    memes: Meme[]
  }
}

const ENDPOINT = 'https://api.imgflip.com/get_memes'
const CACHE_KEY = 'mem:imgflip:memes:v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24h

type CachedPayload = {
  fetchedAt: number
  memes: Meme[]
}

function readCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPayload
    if (!parsed || !Array.isArray(parsed.memes)) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(memes: Meme[]): void {
  try {
    const payload: CachedPayload = { fetchedAt: Date.now(), memes }
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / privacy errors
  }
}

export function getCachedMemes(): CachedPayload | null {
  const cached = readCache()
  if (!cached) return null
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null
  return cached
}

export function clearCachedMemes(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}

export async function fetchMemes(opts: { signal?: AbortSignal; useCache?: boolean } = {}): Promise<Meme[]> {
  const { signal, useCache = true } = opts

  if (useCache) {
    const cached = getCachedMemes()
    if (cached) return cached.memes
  }

  const res = await fetch(ENDPOINT, { signal })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as ImgflipResponse
  if (!json.success || !json.data?.memes) {
    throw new Error(json.error_message || 'Imgflip API returned an unsuccessful response')
  }
  writeCache(json.data.memes)
  return json.data.memes
}

// ---------------------------------------------------------------------------
// Generate / download / share
// ---------------------------------------------------------------------------

export type Caption = {
  text: string
}

export type RenderOptions = {
  /**
   * Max width of the rendered PNG, in pixels. Height scales to preserve the
   * template's aspect ratio. Default 1200.
   */
  maxWidth?: number
  /**
   * Stroke width for the caption outline, in pixels. Default 4.
   */
  strokeWidth?: number
}

/**
 * Loads an image and returns a promise that resolves with the HTMLImageElement.
 * Uses `crossOrigin = 'anonymous'` so the canvas is not CORS-tainted; on failure
 * we re-load without CORS so the user at least sees the image (the canvas will
 * be tainted and `toBlob` will throw — callers should handle that case).
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      // Retry without CORS so the user still sees a preview; export will
      // likely fail in this case and the editor surfaces that.
      const fallback = new Image()
      fallback.onload = () => resolve(fallback)
      fallback.onerror = () => reject(new Error(`Failed to load image: ${src}`))
      fallback.src = src
    }
    img.src = src
  })
}

/**
 * Word-wraps `text` so each line fits within `maxWidth` when measured with the
 * supplied 2D context. Returns an array of lines (without the original
 * newlines collapsed — callers are expected to split on `\n` first if they
 * want hard breaks).
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split(/\n/)
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = words[0]
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate
      } else {
        lines.push(current)
        current = words[i]
      }
    }
    lines.push(current)
  }
  return lines
}

/**
 * Picks a font size that fits `lines` into the available height, with `text`
 * never going smaller than 16px.
 */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  startSize: number,
): number {
  let size = startSize
  const min = 16
  while (size > min) {
    ctx.font = `bold ${size}px Impact, "Anton", "Arial Black", sans-serif`
    const lines = wrapText(ctx, text, maxWidth)
    const lineHeight = size * 1.05
    if (lines.length * lineHeight <= maxHeight) return size
    size -= 2
  }
  return min
}

/**
 * Renders a meme to a canvas and returns the canvas. Captions are placed
 * top-to-bottom in the order provided.
 */
export async function renderMemeToCanvas(
  meme: Meme,
  captions: Caption[],
  opts: RenderOptions = {},
): Promise<HTMLCanvasElement> {
  const maxWidth = opts.maxWidth ?? 1200
  const strokeWidth = opts.strokeWidth ?? 4

  const img = await loadImage(meme.url)
  const ratio = img.naturalHeight / img.naturalWidth
  const width = Math.min(maxWidth, img.naturalWidth)
  const height = Math.round(width * ratio)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context is not available')

  ctx.drawImage(img, 0, 0, width, height)

  // One caption slot per meme box, but extra boxes are ignored.
  const slots = Math.min(captions.length, Math.max(meme.box_count, captions.length))
  if (slots > 0) {
    const padding = width * 0.04
    const slotHeight = height / slots
    const maxLineWidth = width - padding * 2

    captions.slice(0, slots).forEach((cap, i) => {
      const text = (cap.text || '').trim()
      if (!text) return
      const startSize = Math.floor(slotHeight * 0.55)
      const fontSize = fitFontSize(ctx, text, maxLineWidth, slotHeight * 0.85, startSize)
      ctx.font = `bold ${fontSize}px Impact, "Anton", "Arial Black", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const lines = wrapText(ctx, text, maxLineWidth)
      const lineHeight = fontSize * 1.05
      const totalHeight = lines.length * lineHeight
      const slotCenterY = slotHeight * i + slotHeight / 2
      const startY = slotCenterY - totalHeight / 2 + lineHeight / 2

      // Draw each line with an outline so it pops on any background.
      lines.forEach((line, li) => {
        const y = startY + li * lineHeight
        ctx.lineWidth = strokeWidth * (fontSize / 48)
        ctx.strokeStyle = '#000'
        ctx.strokeText(line, width / 2, y)
        ctx.fillStyle = '#fff'
        ctx.fillText(line, width / 2, y)
      })
    })
  }

  return canvas
}

/** Converts a canvas to a Blob (PNG). */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Canvas export failed (image may be CORS-tainted)'))
      else resolve(blob)
    }, 'image/png')
  })
}

/** Triggers a browser download for the given blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Defer revoke so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type ShareResult = 'shared' | 'copied' | 'downloaded' | 'unsupported'

/**
 * Tries the Web Share API with a file attachment, then falls back to copying
 * a data: URL to the clipboard, then to triggering a download. Returns which
 * path it took so the UI can show a useful toast.
 */
export async function shareMeme(blob: Blob, filename: string, title = 'My meme'): Promise<ShareResult> {
  const file = new File([blob], filename, { type: 'image/png' })

  // 1) Web Share API with file support (mobile, modern desktop).
  if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text: title })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'shared' // user dismissed — don't fall through to a copy
      }
      // fall through to copy
    }
  }

  // 2) Clipboard write (works for small images in modern browsers).
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      return 'copied'
    } catch {
      // fall through
    }
  }

  // 3) Last resort: download.
  downloadBlob(blob, filename)
  return 'downloaded'
}
