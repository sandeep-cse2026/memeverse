// Imgflip API client + localStorage cache.
// Docs: https://imgflip.com/api

export type Meme = {
  id: string
  name: string
  url: string
  width: number
  height: number
  box_count: number
}

export type ImgflipResponse = {
  success: boolean
  error_message?: string
  data: {
    memes: Meme[]
  }
}

const ENDPOINT = 'https://api.imgflip.com/get_memes'
const CACHE_KEY = 'mem:imgflip:memes:v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24h

type CachedPayload = {
  fetchedAt: number
  memes: Meme[]
}

function readCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPayload
    if (!parsed || !Array.isArray(parsed.memes)) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(memes: Meme[]): void {
  try {
    const payload: CachedPayload = { fetchedAt: Date.now(), memes }
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / privacy errors
  }
}

export function getCachedMemes(): CachedPayload | null {
  const cached = readCache()
  if (!cached) return null
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null
  return cached
}

export function clearCachedMemes(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}

export async function fetchMemes(opts: { signal?: AbortSignal; useCache?: boolean } = {}): Promise<Meme[]> {
  const { signal, useCache = true } = opts

  if (useCache) {
    const cached = getCachedMemes()
    if (cached) return cached.memes
  }

  const res = await fetch(ENDPOINT, { signal })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as ImgflipResponse
  if (!json.success || !json.data?.memes) {
    throw new Error(json.error_message || 'Imgflip API returned an unsuccessful response')
  }
  writeCache(json.data.memes)
  return json.data.memes
}
