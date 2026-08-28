// Live meme preview. Shows the template image and absolutely-positioned,
// draggable text boxes scaled as a percentage of the stage so the layout
// survives resizes.

import { useEffect, useRef, useState } from 'react'
import type { TextBox } from './types'
import { useDraggable } from './useDraggable'

type Props = {
  template: { url: string; name: string; width: number; height: number } | null
  boxes: TextBox[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
}

export default function EditorStage({ template, boxes, selectedId, onSelect, onMove }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  useEffect(() => {
    setImageLoaded(false)
    setImageError(null)
  }, [template?.url])

  return (
    <div
      ref={stageRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null)
      }}
      className="relative mx-auto w-full max-w-2xl select-none overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {!template ? (
        <EmptyStage />
      ) : (
        <>
          <div
            className="relative w-full"
            style={{
              aspectRatio: `${template.width} / ${template.height}`,
              containerType: 'inline-size',
            }}
          >
            <img
              key={template.url}
              src={template.url}
              alt={template.name}
              crossOrigin="anonymous"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError("Couldn't load template image.")}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              draggable={false}
            />
            {!imageLoaded && !imageError && (
              <div
                aria-hidden
                className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800"
              />
            )}
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-red-600 dark:text-red-400">
                {imageError}
              </div>
            )}
            {boxes.map((box) => (
              <DraggableText
                key={box.id}
                box={box}
                selected={selectedId === box.id}
                onSelect={() => onSelect(box.id)}
                onMove={(x, y) => onMove(box.id, x, y)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function EmptyStage() {
  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-10 w-10 text-slate-400"
        aria-hidden
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <p>Pick a template from the gallery, or start blank.</p>
    </div>
  )
}

type DraggableTextProps = {
  box: TextBox
  selected: boolean
  onSelect: () => void
  onMove: (x: number, y: number) => void
}

function DraggableText({ box, selected, onSelect, onMove }: DraggableTextProps) {
  const text = box.uppercase ? box.text.toUpperCase() : box.text
  const { onPointerDown } = useDraggable({ onMove })
  const align = box.align

  return (
    <div
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-move px-2 py-1 transition ${
        align === 'left' ? 'translate-x-0' : align === 'right' ? '-translate-x-full' : '-translate-x-1/2'
      } ${selected ? 'outline outline-2 outline-indigo-500 outline-offset-2' : 'outline-none'}`}
      style={{
        left: `${box.x}%`,
        top: `${box.y}%`,
        maxWidth: `${box.maxWidth}%`,
        textAlign: align,
      }}
    >
      <span
        className="block whitespace-pre-wrap break-words leading-tight"
        style={{
          fontFamily: box.fontFamily,
          fontSize: `${box.fontSize}cqi`,
          fontWeight: box.fontWeight,
          color: box.color,
          WebkitTextStroke: `${box.strokeWidth * 0.4}px ${box.strokeColor}`,
          paintOrder: 'stroke fill',
          lineHeight: 1.05,
        }}
      >
        {text || (
          <span className="italic opacity-50" style={{ color: box.color, WebkitTextStroke: '0px transparent' }}>
            {box.role === 'top' ? 'Top text' : box.role === 'bottom' ? 'Bottom text' : 'Click to edit'}
          </span>
        )}
      </span>
    </div>
  )
}
