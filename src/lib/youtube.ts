import { sampleVideosFor } from '../data/sample-videos'
import type { YoutubeVideo } from '../types'

const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || ''
const cache = new Map<string, YoutubeVideo[]>()

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
  const cached = cache.get(monkName)
  if (cached) return { videos: cached, source: apiKey ? 'youtube' : 'sample' }

  if (!apiKey) {
    const videos = sampleVideosFor(monkName)
    cache.set(monkName, videos)
    return { videos, source: 'sample' }
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '12',
      order: 'relevance',
      q: `${monkName} dhamma`,
      key: apiKey,
    })

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
    const payload = (await response.json()) as YoutubeSearchResponse
    if (!response.ok) {
      throw new Error(payload.error?.message ?? 'Could not load YouTube talks.')
    }

    const videos = (payload.items ?? []).flatMap(fromSearchItem)
    cache.set(monkName, videos)
    return { videos, source: 'youtube' }
  } catch {
    return { videos: sampleVideosFor(monkName), source: 'sample' }
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
