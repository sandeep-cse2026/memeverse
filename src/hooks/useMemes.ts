import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMemes, getCachedMemes, type Meme } from '../api/imgflip'

export type MemesStatus = 'idle' | 'loading' | 'success' | 'error'

export type UseMemesResult = {
  memes: Meme[]
  status: MemesStatus
  error: string | null
  fromCache: boolean
  reload: () => void
}

export function useMemes(): UseMemesResult {
  const [memes, setMemes] = useState<Meme[]>([])
  const [status, setStatus] = useState<MemesStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState<boolean>(false)
  const controllerRef = useRef<AbortController | null>(null)

  const load = useCallback((forceRefresh = false) => {
    // Hydrate from cache first so the UI isn't empty while we revalidate.
    if (!forceRefresh) {
      const cached = getCachedMemes()
      if (cached) {
        setMemes(cached.memes)
        setFromCache(true)
        setStatus('success')
      }
    }

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    if (!forceRefresh && memes.length === 0) {
      setStatus('loading')
    }

    fetchMemes({ signal: controller.signal, useCache: false })
      .then((data) => {
        if (controller.signal.aborted) return
        setMemes(data)
        setFromCache(false)
        setError(null)
        setStatus('success')
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        // If we already showed cached data, keep it visible but mark error.
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setStatus((prev) => (prev === 'success' ? prev : 'error'))
      })
  }, [memes.length])

  useEffect(() => {
    load()
    return () => controllerRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reload = useCallback(() => {
    load(true)
  }, [load])

  return { memes, status, error, fromCache, reload }
}
