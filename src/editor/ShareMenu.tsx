// Dropdown that exposes "share" options for the current meme:
//   - Native share (mobile + supported desktops) — file + link
//   - Copy image to clipboard (PNG)
//   - Copy link to this meme
//   - Fallback: download again

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildEditorShareUrl,
  copyImageBlobToClipboard,
  copyTextToClipboard,
  detectShareSupport,
  exportMemeToPng,
  nativeShare,
  triggerDownload,
  type ExportResult,
} from './canvasExport'
import type { Meme } from '../api/imgflip'
import type { TextBox } from './types'

type Props = {
  template: Meme | null
  boxes: TextBox[]
  /** Returns the live stage <img> so we can draw the same bytes as the preview. */
  getStageImage: () => HTMLImageElement | null
  disabled?: boolean
  onError: (message: string) => void
  onNotice: (message: string) => void
}

type MenuState = {
  open: boolean
  working: 'native' | 'image' | 'link' | 'download' | null
}

export default function ShareMenu({ template, boxes, getStageImage, disabled, onError, onNotice }: Props) {
  const [state, setState] = useState<MenuState>({ open: false, working: null })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const support = useMemo(() => detectShareSupport(), [])
  const shareUrl = useMemo(() => buildEditorShareUrl(template?.id), [template?.id])

  // Close on outside click / escape.
  useEffect(() => {
    if (!state.open) return
    const onDocClick = (ev: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(ev.target as Node)) {
        setState((s) => ({ ...s, open: false }))
      }
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setState((s) => ({ ...s, open: false }))
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [state.open])

  const build = useCallback(async (): Promise<ExportResult | null> => {
    if (!template) {
      onError('Pick a template first — start blank memes have no image to share.')
      return null
    }
    const img = getStageImage()
    if (!img) {
      onError('No template image is loaded yet.')
      return null
    }
    if (!img.complete || img.naturalWidth === 0) {
      onError('Template image is still loading — try again in a moment.')
      return null
    }
    try {
      return await exportMemeToPng({
        image: img,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        boxes,
        fileBaseName: template.name,
      })
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not generate image')
      return null
    }
  }, [template, getStageImage, boxes, onError])

  const handleNative = useCallback(async () => {
    setState((s) => ({ ...s, working: 'native' }))
    const built = await build()
    if (!built) {
      setState((s) => ({ ...s, working: null }))
      return
    }
    const result = await nativeShare(built.blob, built.filename, `${template?.name ?? 'Meme'} — made with Mem`, shareUrl)
    setState((s) => ({ ...s, working: null }))
    if (result === 'shared') {
      onNotice('Shared!')
      setState((s) => ({ ...s, open: false }))
    } else if (result === 'cancelled') {
      // No-op.
    } else if (result === 'unsupported') {
      onError("This browser doesn't support sharing. Try copying the image or link instead.")
    } else {
      onError('Sharing failed. Try copying the image or link instead.')
    }
  }, [build, template?.name, shareUrl, onNotice, onError])

  const handleCopyImage = useCallback(async () => {
    setState((s) => ({ ...s, working: 'image' }))
    const built = await build()
    if (!built) {
      setState((s) => ({ ...s, working: null }))
      return
    }
    const ok = await copyImageBlobToClipboard(built.blob)
    setState((s) => ({ ...s, working: null }))
    if (ok) {
      onNotice('Image copied to clipboard.')
      setState((s) => ({ ...s, open: false }))
    } else {
      onError("This browser can't copy images to the clipboard. Try sharing or downloading instead.")
    }
  }, [build, onNotice, onError])

  const handleCopyLink = useCallback(async () => {
    setState((s) => ({ ...s, working: 'link' }))
    const ok = await copyTextToClipboard(shareUrl)
    setState((s) => ({ ...s, working: null }))
    if (ok) {
      onNotice('Link copied to clipboard.')
      setState((s) => ({ ...s, open: false }))
    } else {
      onError('Could not copy the link to your clipboard.')
    }
  }, [shareUrl, onNotice, onError])

  const handleDownload = useCallback(async () => {
    setState((s) => ({ ...s, working: 'download' }))
    const built = await build()
    setState((s) => ({ ...s, working: null }))
    if (built) {
      triggerDownload(built.dataUrl, built.filename)
      onNotice('Download started.')
      setState((s) => ({ ...s, open: false }))
    }
  }, [build, onNotice])

  const hasOptions = support.native || support.clipboardImage

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setState((s) => ({ ...s, open: !s.open }))}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={state.open}
        className="btn-ghost h-9 px-3 text-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="mr-1.5 h-4 w-4"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>

      {state.open && (
        <div
          role="menu"
          aria-label="Share options"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Share this meme
          </div>
          {support.native && (
            <MenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              }
              label="Share…"
              hint="Open the system share sheet"
              onClick={handleNative}
              busy={state.working === 'native'}
            />
          )}
          {support.clipboardImage && (
            <MenuItem
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              }
              label="Copy image"
              hint="Save the PNG to your clipboard"
              onClick={handleCopyImage}
              busy={state.working === 'image'}
            />
          )}
          <MenuItem
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71" />
              </svg>
            }
            label="Copy link"
            hint="Send someone to this exact template"
            onClick={handleCopyLink}
            busy={state.working === 'link'}
          />
          <MenuItem
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            }
            label="Download PNG"
            hint="Save a copy to your device"
            onClick={handleDownload}
            busy={state.working === 'download'}
          />
          {!hasOptions && (
            <p className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
              Your browser only supports downloading. Use the button above to save the image.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

type MenuItemProps = {
  icon: React.ReactNode
  label: string
  hint?: string
  onClick: () => void
  busy: boolean
}

function MenuItem({ icon, label, hint, onClick, busy }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800/60"
    >
      <span className="mt-0.5 text-slate-500 dark:text-slate-400">{icon}</span>
      <span className="flex-1">
        <span className="block font-medium text-slate-800 dark:text-slate-100">
          {busy ? 'Working…' : label}
        </span>
        {hint && <span className="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>}
      </span>
    </button>
  )
}
