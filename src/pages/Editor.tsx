import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMemes } from '../hooks/useMemes'
import { useFavorites } from '../hooks/useFavorites'
import { createTextBox, defaultBoxesFor, type TextBox } from '../editor/types'
import EditorStage from '../editor/EditorStage'
import TextBoxControls from '../editor/TextBoxControls'
import TemplatePicker from '../editor/TemplatePicker'
import ShareMenu from '../editor/ShareMenu'
import { exportMemeToPng, triggerDownload } from '../editor/canvasExport'
import { useRecentTemplates } from '../hooks/useRecentTemplates'
import type { Meme } from '../api/imgflip'

const STORAGE_KEY = 'mem:editor:draft:v1'

type DraftState = {
  templateId: string | null
  boxes: TextBox[]
}

function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DraftState
    if (!parsed || !Array.isArray(parsed.boxes)) return null
    return parsed
  } catch {
    return null
  }
}

function saveDraft(state: DraftState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

function getTemplateIdFromQuery(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('template')
}

export default function Editor() {
  const { memes, status, error, fromCache, reload } = useMemes()
  const { isFavorite, toggle: toggleFavorite } = useFavorites()
  const { recents, bump: bumpRecent } = useRecentTemplates()
  const location = useLocation()
  const initialTemplateId =
    (location.state as { templateId?: string } | null)?.templateId ??
    getTemplateIdFromQuery()
  const draft = useMemo(() => loadDraft(), [])

  const [template, setTemplate] = useState<Meme | null>(null)
  const [boxes, setBoxes] = useState<TextBox[]>(() => draft?.boxes ?? defaultBoxesFor(null))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const templateResolvedRef = useRef(false)
  const noticeTimerRef = useRef<number | null>(null)
  const toastKeyRef = useRef(0)
  const [toastKey, setToastKey] = useState(0)

  const flashNotice = useCallback((message: string) => {
    setNotice(message)
    toastKeyRef.current += 1
    setToastKey(toastKeyRef.current)
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2400)
  }, [])

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    }
  }, [])

  // Pick a template from the loaded memes once they arrive (only the first time
  // we resolve the initial template — user selections win after that).
  useEffect(() => {
    if (templateResolvedRef.current) return
    if (memes.length === 0) return
    const wantedId = initialTemplateId ?? draft?.templateId ?? null
    if (wantedId) {
      const found = memes.find((m) => m.id === wantedId) ?? null
      if (found) {
        setTemplate(found)
        setBoxes((prev) => (prev.length > 0 ? prev : defaultBoxesFor(found)))
        bumpRecent(found.id)
      }
    } else if (template === null) {
      // No template requested and no template chosen — start blank by default.
      setBoxes((prev) => (prev.length > 0 ? prev : defaultBoxesFor(null)))
    }
    templateResolvedRef.current = true
  }, [memes, initialTemplateId, draft?.templateId, template, bumpRecent])

  // Persist a small draft so the user doesn't lose work on a refresh.
  useEffect(() => {
    saveDraft({ templateId: template?.id ?? null, boxes })
  }, [template, boxes])

  const selectTemplate = useCallback(
    (meme: Meme | null) => {
      setTemplate(meme)
      if (meme) {
        setBoxes(defaultBoxesFor(meme))
        bumpRecent(meme.id)
      } else {
        setBoxes(defaultBoxesFor(null))
      }
      setSelectedId(null)
    },
    [bumpRecent],
  )

  const updateBox = useCallback((id: string, patch: Partial<TextBox>) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }, [])

  const moveBox = useCallback((id: string, x: number, y: number) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, x, y } : b)))
  }, [])

  const addBox = useCallback(() => {
    const newBox = createTextBox({
      role: 'custom',
      text: '',
      x: 50,
      y: 50,
      fontSize: 6,
      uppercase: false,
    })
    setBoxes((prev) => [...prev, newBox])
    setSelectedId(newBox.id)
  }, [])

  const deleteBox = useCallback((id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id))
    setSelectedId((prevId) => (prevId === id ? null : prevId))
  }, [])

  const duplicateBox = useCallback((id: string) => {
    setBoxes((prev) => {
      const source = prev.find((b) => b.id === id)
      if (!source) return prev
      const maxZ = prev.reduce((m, b) => Math.max(m, b.zIndex || 0), 0)
      const dup = createTextBox({
        ...source,
        x: Math.min(95, source.x + 5),
        y: Math.min(95, source.y + 5),
        zIndex: maxZ + 1,
      })
      return [...prev, dup]
    })
  }, [])

  const bringForward = useCallback((id: string) => {
    setBoxes((prev) => {
      const maxZ = prev.reduce((m, b) => Math.max(m, b.zIndex || 0), 0)
      return prev.map((b) => (b.id === id ? { ...b, zIndex: maxZ + 1 } : b))
    })
  }, [])

  const sendBackward = useCallback((id: string) => {
    setBoxes((prev) => {
      const minZ = prev.reduce((m, b) => Math.min(m, b.zIndex || 0), 0)
      return prev.map((b) => (b.id === id ? { ...b, zIndex: minZ - 1 } : b))
    })
  }, [])

  const getStageImage = useCallback((): HTMLImageElement | null => {
    const stage = stageRef.current
    if (!stage) return null
    return stage.querySelector<HTMLImageElement>('img[alt][crossorigin]')
  }, [])

  const handleExport = useCallback(async () => {
    setExportError(null)
    setIsExporting(true)
    try {
      const stageImg = getStageImage()
      if (!stageImg) {
        throw new Error('No template image is loaded yet.')
      }
      if (!stageImg.complete || stageImg.naturalWidth === 0) {
        throw new Error('Template image is still loading — try again in a moment.')
      }
      const result = await exportMemeToPng({
        image: stageImg,
        naturalWidth: stageImg.naturalWidth,
        naturalHeight: stageImg.naturalHeight,
        boxes,
        fileBaseName: template?.name ?? 'meme',
      })
      triggerDownload(result.dataUrl, result.filename)
      flashNotice('Saved! Your meme is on its way to your downloads.')
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Could not export PNG')
    } finally {
      setIsExporting(false)
    }
  }, [boxes, template?.name, getStageImage, flashNotice])

  const handleReset = useCallback(() => {
    setBoxes(defaultBoxesFor(template))
    setSelectedId(null)
  }, [template])

  const handleShareError = useCallback((message: string) => {
    setExportError(message)
  }, [])

  const handleShareNotice = useCallback(
    (message: string) => {
      setExportError(null)
      flashNotice(message)
    },
    [flashNotice],
  )

  const currentIsFavorite = template ? isFavorite(template.id) : false

  const toggleCurrentFavorite = useCallback(() => {
    if (!template) {
      flashNotice('Pick a template first, then favorite it.')
      return
    }
    toggleFavorite(template.id)
    flashNotice(currentIsFavorite ? 'Removed from favorites.' : 'Saved to favorites.')
  }, [template, toggleFavorite, currentIsFavorite, flashNotice])

  // Keyboard shortcut: F toggles the favorite for the current template.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      // Don't fire while typing into a field.
      const target = ev.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return
        }
      }
      if (ev.key === 'f' || ev.key === 'F') {
        if (ev.metaKey || ev.ctrlKey || ev.altKey) return
        ev.preventDefault()
        toggleCurrentFavorite()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleCurrentFavorite])

  return (
    <section className="container-page py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meme Editor</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {template
              ? `Editing “${template.name}”${fromCache ? ' · templates cached' : ''}`
              : 'Start blank, or pick a template on the right.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="btn-ghost h-9 px-3 text-sm"
            disabled={boxes.length === 0}
          >
            Reset
          </button>
          {template && (
            <button
              type="button"
              onClick={toggleCurrentFavorite}
              aria-pressed={currentIsFavorite}
              title="Toggle favorite (F)"
              className={`btn-ghost h-9 px-3 text-sm ${
                currentIsFavorite
                  ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30'
                  : ''
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={currentIsFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="mr-1.5 h-4 w-4"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {currentIsFavorite ? 'Favorited' : 'Favorite'}
              <kbd className="ml-1.5 hidden rounded border border-slate-300 bg-slate-100 px-1 font-mono text-[10px] text-slate-500 sm:inline dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                F
              </kbd>
            </button>
          )}
          <ShareMenu
            template={template}
            boxes={boxes}
            getStageImage={getStageImage}
            onError={handleShareError}
            onNotice={handleShareNotice}
          />
          <button
            type="button"
            onClick={handleExport}
            className="btn-primary h-9 px-4 text-sm"
            disabled={isExporting || !template}
          >
            {isExporting ? 'Exporting…' : 'Download PNG'}
          </button>
        </div>
      </header>

      {exportError && (
        <div
          key={`err-${toastKey}`}
          role="alert"
          className="mem-toast-in mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
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
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{exportError}</span>
        </div>
      )}
      {notice && !exportError && (
        <div
          key={`ok-${toastKey}`}
          role="status"
          className="mem-toast-in mb-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
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
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{notice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div ref={stageRef}>
            <EditorStage
              template={template}
              boxes={boxes}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={moveBox}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Tip: drag any text box to reposition it. Use the controls to change font, size, color, and stroke.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <TextBoxControls
            boxes={boxes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={updateBox}
            onAdd={addBox}
            onDelete={deleteBox}
            onDuplicate={duplicateBox}
            onBringForward={bringForward}
            onSendBackward={sendBackward}
          />
          <TemplatePicker
            memes={memes}
            status={status}
            error={error}
            reload={reload}
            selected={template}
            onSelect={selectTemplate}
            recents={recents}
          />
        </div>
      </div>
    </section>
  )
}
