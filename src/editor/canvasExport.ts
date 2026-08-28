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

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return ['']
  const paragraphs = text.split(/\n/)
  const lines: string[] = []
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const tentative = current ? `${current} ${word}` : word
      if (ctx.measureText(tentative).width <= maxWidth || !current) {
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

function drawTextBox(
  ctx: CanvasRenderingContext2D,
  box: TextBox,
  stageW: number,
  stageH: number,
) {
  const display = box.uppercase ? box.text.toUpperCase() : box.text
  if (!display) return

  // fontSize is in % of the smaller stage dimension.
  const sizePx = (box.fontSize / 100) * Math.min(stageW, stageH)
  const fontWeight = box.fontWeight
  ctx.font = `${fontWeight} ${sizePx}px ${box.fontFamily}`
  ctx.textAlign = box.align
  ctx.textBaseline = 'middle'

  // maxWidth is in % of the stage width.
  const maxWidthPx = (box.maxWidth / 100) * stageW
  const lines = wrapLines(ctx, display, maxWidthPx)
  const lineHeight = sizePx * 1.08
  const totalHeight = lineHeight * lines.length
  const startY = (box.y / 100) * stageH
  const startX = (box.x / 100) * stageW

  // Stroke first (paint-order style by drawing stroke then fill).
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.strokeStyle = box.strokeColor
  ctx.fillStyle = box.color
  // Scale stroke with font size so it looks consistent across export resolutions.
  const strokePx = (box.strokeWidth / 100) * Math.min(stageW, stageH) * 0.6
  ctx.lineWidth = Math.max(1, strokePx)

  const xForAlign = (line: string) => {
    if (box.align === 'left') return startX
    if (box.align === 'right') return startX
    return startX
  }

  let y = startY - totalHeight / 2 + lineHeight / 2
  for (const line of lines) {
    if (line === '' && lines.length > 1) {
      y += lineHeight
      continue
    }
    ctx.strokeText(line, startX, y)
    ctx.fillText(line, startX, y)
    y += lineHeight
  }
}

export async function exportMemeToPng({
  image,
  naturalWidth,
  naturalHeight,
  boxes,
  fileBaseName = 'meme',
}: ExportInput): Promise<{ dataUrl: string; filename: string }> {
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
  } catch (err) {
    throw new Error(
      'Template image could not be drawn to canvas due to CORS restrictions. Try a different template or reload the page.',
    )
  }

  for (const box of boxes) {
    drawTextBox(ctx, box, w, h)
  }

  const dataUrl = canvas.toDataURL('image/png')
  const safeBase = fileBaseName.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'meme'
  const filename = `${safeBase}_${Date.now()}.png`
  return { dataUrl, filename }
}

export function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
