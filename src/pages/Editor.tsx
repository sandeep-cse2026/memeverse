import { useCallback, useEffect, useRef, useState } from 'react'
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
import { useDrafts, type Draft } from '../hooks/useDrafts'
import DraftsPanel from '../editor/DraftsPanel'
import SaveStatusIndicator from '../editor/SaveStatusIndicator'
import type { Meme } from '../api/imgflip'

function getTemplateIdFromQuery(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('template')
}

function safeBoxes(boxes: TextBox[] | undefined | null): TextBox[] {
  return Array.isArray(boxes) ? boxes : []
}

export default function Editor() {
  const { memes, status, error, fromCache, reload } = useMemes()
  const { isFavorite, toggle: toggleFavorite } = useFavorites()
  const { recents, bump: bumpRecent } = useRecentTemplates()
  const drafts = useDrafts()
  const location = useLocation()
  const initialTemplateId =
    (location.state as { templateId?: string } | null)?.templateId ??
    getTemplateIdFromQuery()
  const sessionDraft = drafts.session

  // The id of the named draft that the user has currently opened in the
  // editor. When the user restores a draft, this gets set to that draft's
  // id; when they pick a fresh template, we clear it.
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  // True when the in-memory edits have diverged from the saved named
  // draft, so we can disable / hide the "Overwrite" affordance.
  const [activeDirty, setActiveDirty] = useState(false)
  // A small toast banner for "draft loaded" / "draft saved" feedback.
  const [draftToast, setDraftToast] = useState<string | null>(null)

  // `hydrated` is true once we've tried to load the user back into their
  // last session. It is intentionally a ref so we only run the bootstrap
  // once even if the dependencies change later.
  const hydratedRef = useRef(false)

  const [template, setTemplate] = useState<Meme | null>(null)
  const [boxes, setBoxes] = useState<TextBox[]>(() => defaultBoxesFor(null))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const draftToastTimerRef = useRef<number | null>(null)
  const toastKeyRef = useRef(0)
  const [toastKey, setToastKey] = useState(0)

  const flashNotice = useCallback((message: string) => {
    setNotice(message)
    toastKeyRef.current += 1
    setToastKey(toastKeyRef.current)
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2400)
  }, [])

  const flashDraftToast = useCallback((message: string) => {
    setDraftToast(message)
    if (draftToastTimerRef.current) window.clearTimeout(draftToastTimerRef.current)
    draftToastTimerRef.current = window.setTimeout(() => setDraftToast(null), 2200)
  }, [])

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
      if (draftToastTimerRef.current) window.clearTimeout(draftToastTimerRef.current)
    }
  }, [])

  // Resolve the initial template / draft exactly once, when we have enough
  // information. Priority: URL `?template=` -> nav-state templateId -> most
  // recent auto-saved session -> nothing.
  useEffect(() => {
    if (hydratedRef.current) return
    if (memes.length === 0 && !sessionDraft && !initialTemplateId) return
    hydratedRef.current = true

    if (initialTemplateId) {
      const found = memes.find((m) => m.id === initialTemplateId)
      if (found) {
        setTemplate(found)
        setBoxes(defaultBoxesFor(found))
        bumpRecent(found.id)
        return
      }
    }
    if (sessionDraft) {
      // Re-hydrate the most recent auto-saved session, if we can.
      const initialBoxes = safeBoxes(sessionDraft.boxes)
      const tplId = sessionDraft.templateId
      if (tplId) {
        const found = memes.find((m) => m.id === tplId)
        if (found) {
          setTemplate(found)
          setBoxes(initialBoxes.length > 0 ? initialBoxes : defaultBoxesFor(found))
          bumpRecent(found.id)
          return
        }
      }
      setTemplate(null)
      setBoxes(initialBoxes.length > 0 ? initialBoxes : defaultBoxesFor(null))
    }
  }, [memes, initialTemplateId, sessionDraft, bumpRecent])

  // Auto-save the current state (debounced) so refreshes / navigations
  // never lose more than ~600ms of work.
  useEffect(() => {
    drafts.autosave({ template, boxes })
  }, [template, boxes, drafts])

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
      setActiveDraftId(null)
      setActiveDirty(false)
    },
    [bumpRecent],
  )

  const restoreDraft = useCallback(
    (draft: Draft) => {
      const target = memes.find((m) => m.id === draft.templateId)
      if (draft.templateId && !target) {
        flashDraftToast('That draft’s template is no longer in the catalog.')
        return
      }
      setTemplate(target ?? null)
      setBoxes(draft.boxes.length > 0 ? draft.boxes : defaultBoxesFor(target ?? null))
      setSelectedId(null)
      setActiveDraftId(draft.id)
      setActiveDirty(false)
      if (target) bumpRecent(target.id)
      // Force the autosave to mirror the restored state.
      drafts.autosave({ template: target ?? null, boxes: draft.boxes })
      flashDraftToast(`Loaded “${draft.name}”.`)
    },
    [memes, bumpRecent, drafts, flashDraftToast],
  )

  const handleSaveNewDraft = useCallback(
    (name: string) => {
      const draft = drafts.saveNamed(name, { template, boxes })
      setActiveDraftId(draft.id)
      setActiveDirty(false)
      flashDraftToast(`Saved “${draft.name}”.`)
    },
    [drafts, template, boxes, flashDraftToast],
  )

  const handleUpdateActiveDraft = useCallback(() => {
    if (!activeDraftId) return
    drafts.updateNamed(activeDraftId, { template, boxes })
    setActiveDirty(false)
    flashDraftToast('Draft updated.')
  }, [activeDraftId, drafts, template, boxes, flashDraftToast])

  const updateBox = useCallback((id: string, patch: Partial<TextBox>) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
    setActiveDirty(true)
  }, [])

  const moveBox = useCallback((id: string, x: number, y: number) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, x, y } : b)))
    setActiveDirty(true)
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
    setActiveDirty(true)
  }, [])

  const deleteBox = useCallback((id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id))
    setSelectedId((prevId) => (prevId === id ? null : prevId))
    setActiveDirty(true)
  }, [])

  const duplicateBox = useCallback((id: string) => {
    setBoxes((prev) => {
      const source = prev.find((b) => b.id === id)
      if (!source) return prev
      const dup = createTextBox({
        ...source,
        x: Math.min(95, source.x + 5),
        y: Math.min(95, source.y + 5),
      })
      return [...prev, dup]
    })
    setActiveDirty(true)
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
    setActiveDirty(true)
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
          <SaveStatusIndicator status={drafts.status} lastSavedAt={drafts.lastSavedAt} />
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

      {draftToast && (
        <div
          role="status"
          className="mem-toast-in mb-4 flex items-start gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200"
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </svg>
          <span>{draftToast}</span>
        </div>
      )}

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
          <DraftsPanel
            drafts={drafts.drafts}
            activeDraftId={activeDraftId}
            canUpdateActive={activeDirty}
            onRestore={restoreDraft}
            onRename={drafts.rename}
            onRemove={drafts.remove}
            onUpdateActive={handleUpdateActiveDraft}
            onSaveNew={handleSaveNewDraft}
            onClearAll={drafts.clearAll}
          />
          <TextBoxControls
            boxes={boxes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={updateBox}
            onAdd={addBox}
            onDelete={deleteBox}
            onDuplicate={duplicateBox}
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
