import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMemes } from '../hooks/useMemes'
import { createTextBox, defaultBoxesFor, type TextBox } from '../editor/types'
import EditorStage from '../editor/EditorStage'
import TextBoxControls from '../editor/TextBoxControls'
import TemplatePicker from '../editor/TemplatePicker'
import { exportMemeToPng, triggerDownload } from '../editor/canvasExport'
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

export default function Editor() {
  const { memes, status, error, fromCache, reload } = useMemes()
  const location = useLocation()
  const initialTemplateId =
    (location.state as { templateId?: string } | null)?.templateId ?? null
  const draft = useMemo(() => loadDraft(), [])

  const [template, setTemplate] = useState<Meme | null>(null)
  const [boxes, setBoxes] = useState<TextBox[]>(() => draft?.boxes ?? defaultBoxesFor(null))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const templateResolvedRef = useRef(false)

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
      }
    } else if (template === null) {
      // No template requested and no template chosen — start blank by default.
      setBoxes((prev) => (prev.length > 0 ? prev : defaultBoxesFor(null)))
    }
    templateResolvedRef.current = true
  }, [memes, initialTemplateId, draft?.templateId, template])

  // Persist a small draft so the user doesn't lose work on a refresh.
  useEffect(() => {
    saveDraft({ templateId: template?.id ?? null, boxes })
  }, [template, boxes])

  const selectTemplate = useCallback(
    (meme: Meme | null) => {
      setTemplate(meme)
      if (meme) {
        setBoxes(defaultBoxesFor(meme))
      } else {
        setBoxes(defaultBoxesFor(null))
      }
      setSelectedId(null)
    },
    [],
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
      const dup = createTextBox({
        ...source,
        x: Math.min(95, source.x + 5),
        y: Math.min(95, source.y + 5),
      })
      return [...prev, dup]
    })
  }, [])

  const handleExport = useCallback(async () => {
    setExportError(null)
    setIsExporting(true)
    try {
      // We need a loaded, CORS-enabled image to draw to canvas. Pull it from
      // the current <img> in the stage so we get the same bytes as the preview.
      const stageImg = document.querySelector<HTMLImageElement>(
        'img[alt][crossorigin]',
      )
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
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Could not export PNG')
    } finally {
      setIsExporting(false)
    }
  }, [boxes, template?.name])

  const handleReset = useCallback(() => {
    setBoxes(defaultBoxesFor(template))
    setSelectedId(null)
  }, [template])

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
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {exportError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <EditorStage
            template={template}
            boxes={boxes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={moveBox}
          />
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
          />
          <TemplatePicker
            memes={memes}
            status={status}
            error={error}
            reload={reload}
            selected={template}
            onSelect={selectTemplate}
          />
        </div>
      </div>
    </section>
  )
}
