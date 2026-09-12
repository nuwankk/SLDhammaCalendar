import { sampleVideosFor } from '../data/sample-videos'
import type { YoutubeVideo } from '../types'

const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || ''
const maxResults = 10
const cacheTtlMs = 24 * 60 * 60 * 1000
const storageKey = 'sldhamma.youtube.videos'

type CachedSearch = {
  fetchedAt: number
  videos: YoutubeVideo[]
  source: 'youtube' | 'sample'
}

const memoryCache = new Map<string, CachedSearch>()
const inflight = new Map<string, Promise<{ videos: YoutubeVideo[]; source: 'youtube' | 'sample' }>>

type YoutubeSearchItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    channelTitle?: string
    publishedAt?: string
    thumbnails?: {
      medium?: { url?: string }
      high?: { url?: string }
      default?: { url?: string }
    }
  }
}

type YoutubeSearchResponse = {
  items?: YoutubeSearchItem[]
  error?: { message?: string }
}

export function hasYoutubeKey() {
  return Boolean(apiKey)
}

export async function searchMonkVideos(
  monkName: string,
): Promise<{ videos: YoutubeVideo[]; source: 'youtube' | 'sample' }> {
  const cached = readFreshCache(monkName)
  if (cached) return { videos: cached.videos, source: cached.source }

  const pending = inflight.get(monkName)
  if (pending) return pending

  const request = fetchMonkVideos(monkName).finally(() => inflight.delete(monkName))
  inflight.set(monkName, request)
  return request
}

async function fetchMonkVideos(monkName: string): Promise<{ videos: YoutubeVideo[]; source: 'youtube' | 'sample' }> {
  if (!apiKey) {
    return writeCache(monkName, newestFirst(sampleVideosFor(monkName)), 'sample')
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: String(maxResults),
      order: 'date',
      q: `${monkName} dhamma`,
      key: apiKey,
    })

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
    const payload = (await response.json()) as YoutubeSearchResponse
    if (!response.ok) {
      throw new Error(payload.error?.message ?? 'Could not load YouTube talks.')
    }

    const videos = newestFirst((payload.items ?? []).flatMap(fromSearchItem))
    return writeCache(monkName, videos, 'youtube')
  } catch {
    return { videos: newestFirst(sampleVideosFor(monkName)), source: 'sample' }
  }
}

function newestFirst(videos: YoutubeVideo[]) {
  return [...videos]
    .sort((a, b) => +new Date(b.publishedAt || 0) - +new Date(a.publishedAt || 0))
    .slice(0, maxResults)
}

function readFreshCache(monkName: string) {
  const memory = memoryCache.get(monkName)
  if (isFresh(memory)) return memory
  const stored = readStored()[monkName]
  if (!isFresh(stored)) return undefined
  memoryCache.set(monkName, stored)
  return stored
}

function isFresh(entry: CachedSearch | undefined) {
  if (!entry) return false
  if (Date.now() - entry.fetchedAt >= cacheTtlMs) return false
  if (apiKey && entry.source === 'sample') return false
  return true
}

function writeCache(monkName: string, videos: YoutubeVideo[], source: CachedSearch['source']) {
  const entry: CachedSearch = { fetchedAt: Date.now(), videos, source }
  memoryCache.set(monkName, entry)
  const stored = readStored()
  stored[monkName] = entry
  writeStored(stored)
  return { videos, source }
}

function readStored(): Record<string, CachedSearch> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CachedSearch>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStored(stored: Record<string, CachedSearch>) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(storageKey, JSON.stringify(stored))
  } catch {
    // Ignore quota / private-mode failures; memory cache still applies.
  }
}

function fromSearchItem(item: YoutubeSearchItem): YoutubeVideo[] {
  const id = item.id?.videoId
  const snippet = item.snippet
  if (!id || !snippet?.title) return []
  const thumbnail =
    snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url
  return [
    {
      id,
      title: decodeEntities(snippet.title),
      channelTitle: decodeEntities(snippet.channelTitle ?? ''),
      publishedAt: snippet.publishedAt ?? '',
      thumbnailUrl: thumbnail ?? `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${id}`,
    },
  ]
}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}
