import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  fetchMemes,
  getCachedMemes,
  renderMemeToCanvas,
  canvasToBlob,
  downloadBlob,
  shareMeme,
  type Meme,
  type Caption,
  type ShareResult,
} from '../api/imgflip'
import { useFavorites } from '../hooks/useFavorites'
import FavoriteButton from '../components/FavoriteButton'

const SHARE_MESSAGES: Record<ShareResult, string> = {
  shared: 'Shared!',
  copied: 'Copied to clipboard!',
  downloaded: 'Downloaded as a fallback.',
  unsupported: 'Sharing is not supported here — downloaded instead.',
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'meme'
}

export default function Editor() {
  const [searchParams, setSearchParams] = useSearchParams()
  const templateParam = searchParams.get('template') ?? ''

  const [memes, setMemes] = useState<Meme[]>(() => getCachedMemes()?.memes ?? [])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingTemplates, setLoadingTemplates] = useState(memes.length === 0)

  const [selectedId, setSelectedId] = useState<string>(templateParam)
  const [captions, setCaptions] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { has, toggle } = useFavorites()

  // Load templates on mount.
  useEffect(() => {
    if (memes.length > 0) {
      setLoadingTemplates(false)
      return
    }
    const controller = new AbortController()
    setLoadingTemplates(true)
    fetchMemes({ signal: controller.signal, useCache: true })
      .then((data) => {
        setMemes(data)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setLoadError(err instanceof Error ? err.message : 'Could not load templates')
      })
      .finally(() => setLoadingTemplates(false))
    return () => controller.abort()
  }, [memes.length])

  // Pick the initial template if none was supplied.
  useEffect(() => {
    if (selectedId) return
    if (templateParam) {
      setSelectedId(templateParam)
      return
    }
    if (memes.length > 0) setSelectedId(memes[0].id)
  }, [memes, selectedId, templateParam])

  const selectedMeme = useMemo(
    () => memes.find((m) => m.id === selectedId) ?? null,
    [memes, selectedId],
  )

  // Reset captions and preview when the template changes.
  useEffect(() => {
    if (!selectedMeme) {
      setCaptions([])
      setPreviewUrl(null)
      setStatus('idle')
      return
    }
    setCaptions(Array.from({ length: Math.max(1, selectedMeme.box_count) }, () => ''))
    setPreviewUrl(null)
    setStatus('idle')
    setError(null)
  }, [selectedMeme])

  // Sync the URL ?template= so deep-links survive refresh / sharing.
  useEffect(() => {
    if (selectedId && searchParams.get('template') !== selectedId) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('template', selectedId)
        return next
      }, { replace: true })
    }
  }, [selectedId, searchParams, setSearchParams])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2500)
  }

  const onCaptionChange = (i: number, value: string) => {
    setCaptions((prev) => {
      const next = prev.slice()
      next[i] = value
      return next
    })
  }

  const onGenerate = async () => {
    if (!selectedMeme) return
    setStatus('generating')
    setError(null)
    try {
      const canvas = await renderMemeToCanvas(
        selectedMeme,
        captions.map<Caption>((text) => ({ text })),
      )
      canvasRef.current = canvas
      const url = canvas.toDataURL('image/png')
      setPreviewUrl(url)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not render meme')
      setStatus('error')
    }
  }

  const onDownload = async () => {
    try {
      let canvas = canvasRef.current
      if (!canvas || status !== 'ready') {
        if (!selectedMeme) return
        canvas = await renderMemeToCanvas(
          selectedMeme,
          captions.map<Caption>((text) => ({ text })),
        )
        canvasRef.current = canvas
        setPreviewUrl(canvas.toDataURL('image/png'))
        setStatus('ready')
      }
      const blob = await canvasToBlob(canvas)
      const filename = `${slugify(selectedMeme?.name ?? 'meme')}.png`
      downloadBlob(blob, filename)
      showToast('Downloaded!')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Download failed')
    }
  }

  const onShare = async () => {
    try {
      let canvas = canvasRef.current
      if (!canvas || status !== 'ready') {
        if (!selectedMeme) return
        canvas = await renderMemeToCanvas(
          selectedMeme,
          captions.map<Caption>((text) => ({ text })),
        )
        canvasRef.current = canvas
        setPreviewUrl(canvas.toDataURL('image/png'))
        setStatus('ready')
      }
      const blob = await canvasToBlob(canvas)
      const filename = `${slugify(selectedMeme?.name ?? 'meme')}.png`
      const result = await shareMeme(blob, filename, selectedMeme?.name ?? 'Meme')
      showToast(SHARE_MESSAGES[result])
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Share failed')
    }
  }

  const isFav = selectedMeme ? has(selectedMeme.id) : false
  const hasAnyCaption = captions.some((c) => c.trim().length > 0)
  const disabled = !selectedMeme || loadingTemplates

  return (
    <section className="container-page py-12">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meme Editor</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Pick a template, add captions, then generate, download, or share.
          </p>
        </div>
        {selectedMeme && (
          <FavoriteButton
            active={isFav}
            onToggle={() => toggle(selectedMeme.id)}
            label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          />
        )}
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Couldn't load templates: {loadError}. Try refreshing the gallery first.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Template
            </span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={disabled}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {loadingTemplates && <option value="">Loading…</option>}
              {!loadingTemplates && memes.length === 0 && <option value="">No templates</option>}
              {memes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          {selectedMeme && (
            <dl className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <dt>Boxes</dt>
                <dd>{selectedMeme.box_count}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Size</dt>
                <dd>
                  {selectedMeme.width}×{selectedMeme.height}
                </dd>
              </div>
            </dl>
          )}
        </aside>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={selectedMeme ? `Preview of ${selectedMeme.name}` : 'Meme preview'}
                  className="h-full w-full object-contain"
                />
              ) : selectedMeme ? (
                <img
                  src={selectedMeme.url}
                  alt={selectedMeme.name}
                  className="h-full w-full object-contain opacity-90"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  {loadingTemplates ? 'Loading templates…' : 'Select a template to begin.'}
                </div>
              )}
              {status === 'generating' && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-slate-900/60">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Generating…
                  </span>
                </div>
              )}
            </div>
          </div>

          {selectedMeme && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Captions ({captions.length})
              </h2>
              <div className="space-y-2">
                {captions.map((value, i) => (
                  <label key={i} className="block">
                    <span className="sr-only">Caption {i + 1}</span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => onCaptionChange(i, e.target.value)}
                      maxLength={120}
                      placeholder={`Caption ${i + 1}`}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                ))}
              </div>

              {status === 'error' && (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error ?? 'Something went wrong.'}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={!hasAnyCaption || status === 'generating'}
                  className="btn-primary"
                >
                  {status === 'generating' ? 'Generating…' : 'Generate'}
                </button>
                <button
                  type="button"
                  onClick={onDownload}
                  disabled={!hasAnyCaption || status === 'generating'}
                  className="btn-ghost"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  disabled={!hasAnyCaption || status === 'generating'}
                  className="btn-ghost"
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCaptions((prev) => prev.map(() => ''))
                    setPreviewUrl(null)
                    setStatus('idle')
                  }}
                  className="btn-ghost"
                  disabled={!captions.some((c) => c.length > 0)}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
        >
          {toast}
        </div>
      )}
    </section>
  )
}
