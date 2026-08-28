// Pointer-driven drag hook. Returns a ref to attach to the draggable element
// and an `onPointerDown` handler to install. Position is reported as a
// percentage of the parent's content box so it scales with the stage.

import { useCallback, useEffect, useRef } from 'react'

type UseDraggableOptions = {
  /** Called continuously while dragging (0-100 percentages). */
  onMove: (x: number, y: number) => void
  /** Called once when the drag ends. */
  onEnd?: (x: number, y: number) => void
  /** Disable interactions. */
  disabled?: boolean
}

export function useDraggable({ onMove, onEnd, disabled }: UseDraggableOptions) {
  const stateRef = useRef<{
    pointerId: number | null
    parent: HTMLElement | null
    rect: DOMRect | null
  }>({ pointerId: null, parent: null, rect: null })

  const handleMove = useCallback(
    (ev: PointerEvent) => {
      const s = stateRef.current
      if (s.pointerId !== ev.pointerId || !s.parent || !s.rect) return
      const rect = s.rect
      const xPx = ev.clientX - rect.left
      const yPx = ev.clientY - rect.top
      const xPct = Math.max(0, Math.min(100, (xPx / rect.width) * 100))
      const yPct = Math.max(0, Math.min(100, (yPx / rect.height) * 100))
      onMove(xPct, yPct)
    },
    [onMove],
  )

  const handleUp = useCallback(
    (ev: PointerEvent) => {
      const s = stateRef.current
      if (s.pointerId !== ev.pointerId) return
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      const parent = s.parent
      const rect = s.rect
      stateRef.current = { pointerId: null, parent: null, rect: null }
      if (parent && rect) {
        const xPx = ev.clientX - rect.left
        const yPx = ev.clientY - rect.top
        const xPct = Math.max(0, Math.min(100, (xPx / rect.width) * 100))
        const yPct = Math.max(0, Math.min(100, (yPx / rect.height) * 100))
        onEnd?.(xPct, yPct)
      }
    },
    [handleMove, onEnd],
  )

  const onPointerDown = useCallback(
    (ev: React.PointerEvent<HTMLElement>) => {
      if (disabled) return
      // Only left button or touch/pen.
      if (ev.pointerType === 'mouse' && ev.button !== 0) return
      ev.preventDefault()
      ev.stopPropagation()
      const target = ev.currentTarget
      const parent = target.offsetParent as HTMLElement | null
      if (!parent) return
      target.setPointerCapture?.(ev.pointerId)
      stateRef.current = {
        pointerId: ev.pointerId,
        parent,
        rect: parent.getBoundingClientRect(),
      }
      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointercancel', handleUp)
    },
    [disabled, handleMove, handleUp],
  )

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [handleMove, handleUp])

  return { onPointerDown }
}
