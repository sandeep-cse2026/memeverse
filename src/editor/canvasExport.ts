// Render the meme to an off-screen canvas and trigger a PNG download.
// Uses the Canvas API directly to avoid an extra dependency.

import type { TextBox } from './types'

export type ExportInput = {
  image: HTMLImageElement
  naturalWidth: number
  naturalHeight: number
  boxes: TextBox[]
  fileBaseName?: string
}

export type ExportResult = {
  dataUrl: string
  filename: string
  width: number
  height: number
  blob: Blob
}

function isOpaqueColor(value: string | undefined): boolean {
  if (!value) return false
  if (value === '#00000000' || value === 'transparent') return false
  // rgba(... 0) and hsla(... 0) are also transparent.
  if (/[,/]\s*0\s*\)/.test(value)) return false
  // 8-digit hex with 00 alpha.
  if (/^#[0-9a-fA-F]{8}$/.test(value) && value.endsWith('00')) return false
  return true
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, letterSpacing: number): string[] {
  if (!text) return ['']
  const paragraphs = text.split(/\n/)
  const lines: string[] = []
  // Letter spacing widens every character; measure with it applied.
  const measure = (s: string) => {
    if (!letterSpacing) return ctx.measureText(s).width
    let total = 0
    for (let i = 0; i < s.length; i++) {
      total += ctx.measureText(s[i]).width
      if (i < s.length - 1) total += letterSpacing
    }
    return total
  }
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const tentative = current ? `${current} ${word}` : word
      if (measure(tentative) <= maxWidth || !current) {
        current = tentative
      } else {
        lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

function measureLineWidth(ctx: CanvasRenderingContext2D, line: string, letterSpacing: number): number {
  if (!letterSpacing) return ctx.measureText(line).width
  let total = 0
  for (let i = 0; i < line.length; i++) {
    total += ctx.measureText(line[i]).width
    if (i < line.length - 1) total += letterSpacing
  }
  return total
}

function drawTextBackground(
  ctx: CanvasRenderingContext2D,
  box: TextBox,
  lines: string[],
  x: number,
  topY: number,
  lineHeight: number,
  sizePx: number,
  maxWidthPx: number,
  letterSpacing: number,
) {
  if (!box.backgroundColor) return
  if (box.backgroundOpacity <= 0) return
  const pad = (box.backgroundPadding / 100) * sizePx
  const radius = Math.max(0, (box.backgroundRadius / 100) * sizePx)
  const lineWidths = lines.map((line) => measureLineWidth(ctx, line, letterSpacing))
  const boxWidth = Math.min(maxWidthPx, Math.max(...lineWidths, 0)) + pad * 2
  const boxHeight = lineHeight * lines.length + pad * 2
  let left: number
  if (box.align === 'left') left = x - pad
  else if (box.align === 'right') left = x + pad - boxWidth
  else left = x - boxWidth / 2
  const top = topY - pad
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, box.backgroundOpacity))
  ctx.fillStyle = box.backgroundColor
  if (radius <= 0) {
    ctx.fillRect(left, top, boxWidth, boxHeight)
  } else {
    const r = Math.min(radius, boxWidth / 2, boxHeight / 2)
    ctx.beginPath()
    ctx.moveTo(left + r, top)
    ctx.lineTo(left + boxWidth - r, top)
    ctx.quadraticCurveTo(left + boxWidth, top, left + boxWidth, top + r)
    ctx.lineTo(left + boxWidth, top + boxHeight - r)
    ctx.quadraticCurveTo(left + boxWidth, top + boxHeight, left + boxWidth - r, top + boxHeight)
    ctx.lineTo(left + r, top + boxHeight)
    ctx.quadraticCurveTo(left, top + boxHeight, left, top + boxHeight - r)
    ctx.lineTo(left, top + r)
    ctx.quadraticCurveTo(left, top, left + r, top)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function drawTextBox(
  ctx: CanvasRenderingContext2D,
  box: TextBox,
  stageW: number,
  stageH: number,
) {
  const display = box.uppercase ? box.text.toUpperCase() : box.text

  // fontSize is in % of the smaller stage dimension.
  const sizePx = (box.fontSize / 100) * Math.min(stageW, stageH)
  const fontStyle = box.italic ? 'italic' : 'normal'
  const fontWeight = box.fontWeight
  ctx.font = `${fontStyle} ${fontWeight} ${sizePx}px ${box.fontFamily}`
  ctx.textAlign = box.align
  ctx.textBaseline = box.verticalAlign === 'top' ? 'top' : box.verticalAlign === 'bottom' ? 'bottom' : 'middle'

  // maxWidth is in % of the stage width.
  const maxWidthPx = (box.maxWidth / 100) * stageW
  const letterSpacing = (box.letterSpacing || 0) * sizePx
  const lines = wrapLines(ctx, display, maxWidthPx, letterSpacing)
  const lineHeight = sizePx * (box.lineHeight || 1.1)
  const totalHeight = lineHeight * lines.length
  const cx = (box.x / 100) * stageW
  let startY: number
  if (box.verticalAlign === 'top') startY = (box.y / 100) * stageH
  else if (box.verticalAlign === 'bottom') startY = (box.y / 100) * stageH - totalHeight
  else startY = (box.y / 100) * stageH - totalHeight / 2

  ctx.save()
  // Rotate around the box center so position stays intuitive.
  ctx.translate(cx, startY + totalHeight / 2)
  ctx.rotate((box.rotation * Math.PI) / 180)
  ctx.translate(-cx, -(startY + totalHeight / 2))

  drawTextBackground(ctx, box, lines, cx, startY, lineHeight, sizePx, maxWidthPx, letterSpacing)

  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  const strokePx = (box.strokeWidth / 100) * Math.min(stageW, stageH) * 0.6
  ctx.lineWidth = Math.max(0, strokePx)

  const fillColor = isOpaqueColor(box.color) ? box.color : null
  const strokeColor = isOpaqueColor(box.strokeColor) ? box.strokeColor : null

  // Shadow setup — applies to both fill and stroke of the next draws.
  if (box.shadowColor && box.shadowBlur > 0) {
    ctx.shadowColor = box.shadowColor
    ctx.shadowOffsetX = (box.shadowOffsetX / 100) * sizePx
    ctx.shadowOffsetY = (box.shadowOffsetY / 100) * sizePx
    ctx.shadowBlur = (box.shadowBlur / 100) * sizePx
  } else {
    ctx.shadowColor = 'transparent'
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.shadowBlur = 0
  }

  // Compute x for a line based on alignment. The line width already includes
  // letter spacing so positioning is correct in both modes.
  const lineX = (line: string): number => {
    const w = measureLineWidth(ctx, line, letterSpacing)
    if (box.align === 'left') return cx
    if (box.align === 'right') return cx - w
    return cx - w / 2
  }

  const drawLine = (line: string, y: number) => {
    if (!line) return
    const x = lineX(line)
    if (letterSpacing) {
      // Draw glyph by glyph so letter spacing is honored precisely.
      let cursor = x
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        const w = ctx.measureText(ch).width
        if (strokeColor && ctx.lineWidth > 0) {
          ctx.strokeStyle = strokeColor
          ctx.strokeText(ch, cursor, y)
        }
        if (fillColor) {
          ctx.fillStyle = fillColor
          ctx.fillText(ch, cursor, y)
        }
        cursor += w + letterSpacing
      }
    } else {
      if (strokeColor && ctx.lineWidth > 0) {
        ctx.strokeStyle = strokeColor
        ctx.strokeText(line, x, y)
      }
      if (fillColor) {
        ctx.fillStyle = fillColor
        ctx.fillText(line, x, y)
      }
    }
  }

  let y = startY
  for (const line of lines) {
    drawLine(line, y)
    y += lineHeight
  }
  ctx.restore()
}

export async function exportMemeToPng({
  image,
  naturalWidth,
  naturalHeight,
  boxes,
  fileBaseName = 'meme',
}: ExportInput): Promise<ExportResult> {
  const w = naturalWidth || image.naturalWidth || image.width
  const h = naturalHeight || image.naturalHeight || image.height
  if (!w || !h) {
    throw new Error('Template image is not ready yet. Please wait for it to load.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not acquire 2D rendering context')

  // Make sure the image is actually drawn with the cross-origin flag we set.
  // If it wasn't cross-origin-enabled and the template is tainted, drawImage
  // will throw a SecurityError — surface that as a clear message.
  try {
    ctx.drawImage(image, 0, 0, w, h)
  } catch {
    throw new Error(
      'Template image could not be drawn to canvas due to CORS restrictions. Try a different template or reload the page.',
    )
  }

  // Render in z-order so the topmost box paints last.
  const ordered = [...boxes].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
  for (const box of ordered) {
    drawTextBox(ctx, box, w, h)
  }

  const dataUrl = canvas.toDataURL('image/png')
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b)
      else reject(new Error('Could not generate PNG blob'))
    }, 'image/png')
  })
  const safeBase = fileBaseName.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'meme'
  const filename = `${safeBase}_${Date.now()}.png`
  return { dataUrl, filename, width: w, height: h, blob }
}

export function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function buildEditorShareUrl(memeId: string | null | undefined): string {
  if (typeof window === 'undefined') return '/editor'
  const base = `${window.location.origin}/editor`
  if (!memeId) return base
  return `${base}?template=${encodeURIComponent(memeId)}`
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    ta.style.pointerEvents = 'none'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export async function copyImageBlobToClipboard(blob: Blob): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    return false
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })])
    return true
  } catch {
    return false
  }
}

export type ShareMethod = 'native' | 'clipboard-image' | 'clipboard-link' | 'unsupported'

export function detectShareSupport(): { native: boolean; clipboardImage: boolean } {
  const native =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function'
  const clipboardImage =
    typeof ClipboardItem !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.clipboard?.write
  return { native, clipboardImage }
}

export async function nativeShare(
  blob: Blob,
  filename: string,
  text: string,
  url: string,
): Promise<'shared' | 'cancelled' | 'unsupported' | 'failed'> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported'
  }
  const file = new File([blob], filename, { type: blob.type || 'image/png' })
  const payload: ShareData = { text, url }
  try {
    if (navigator.canShare?.({ files: [file] })) {
      payload.files = [file]
    }
    await navigator.share(payload)
    return 'shared'
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
    // Some browsers throw if files aren't shareable — retry without files.
    try {
      await navigator.share({ text, url })
      return 'shared'
    } catch (err2) {
      if (err2 instanceof DOMException && err2.name === 'AbortError') return 'cancelled'
      return 'failed'
    }
  }
}
