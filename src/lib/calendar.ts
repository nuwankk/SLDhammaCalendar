import { venues } from '../data/venues'
import { sampleSermons } from '../data/sample-events'
import { speakerNameSi } from './labels'
import { inferAttendance, isRemoteLocation, parseAttendanceField } from './attendance'
import type { Language, Sermon } from '../types'

const calendarId = import.meta.env.VITE_GOOGLE_CALENDAR_ID ?? ''
const apiKey = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY ?? ''

type CalendarEvent = {
  id?: string
  summary?: string
  description?: string
  location?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  attachments?: Array<{ fileUrl?: string; mimeType?: string }>
}

export async function loadSermons(): Promise<{ sermons: Sermon[]; source: 'google' | 'sample' }> {
  if (!calendarId || !apiKey) {
    return { sermons: upcoming(sampleSermons), source: 'sample' }
  }

  const params = new URLSearchParams({
    key: apiKey,
    timeMin: new Date().toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '120',
  })
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Could not load the public Google Calendar.')
  }
  const payload = (await response.json()) as { items?: CalendarEvent[] }
  const sermons = (payload.items ?? [])
    .map(fromGoogleEvent)
    .filter((sermon): sermon is Sermon => sermon !== null)

  return { sermons: upcoming(sermons), source: 'google' }
}

function upcoming(sermons: Sermon[]) {
  const now = Date.now()
  return sermons
    .map((sermon) => ({ ...sermon, attendance: inferAttendance(sermon) }))
    .filter((sermon) => new Date(sermon.start).getTime() >= now - 60 * 60 * 1000)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

function fromGoogleEvent(event: CalendarEvent): Sermon | null {
  const start = event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T06:00:00+05:30` : '')
  if (!start || !event.summary) return null

  const description = htmlToText(event.description ?? '')
  const livestreamUrl = readField(description, 'Livestream')
  const attendanceHint = parseAttendanceField(readField(description, 'Attendance'))
  const remote = attendanceHint === 'livestream' || isRemoteLocation(event.location ?? '')
  const venue = remote ? undefined : matchVenue(event.location ?? '', `${event.summary ?? ''}\n${description}`)
  const attendance = inferAttendance({
    attendance: attendanceHint,
    livestreamUrl,
    venueId: venue?.id,
  })
  if (!venue && attendance !== 'livestream') return null

  const { title, titleSi } = splitTitle(event.summary)
  const speaker = readField(description, 'Speaker') ?? 'Guest sermon'

  return {
    id: event.id ?? `${venue?.id ?? 'online'}-${start}`,
    title,
    titleSi: readField(description, 'Title-SI') ?? titleSi ?? title,
    speaker,
    speakerSi: readField(description, 'Speaker-SI') ?? speakerNameSi(speaker),
    venueId: venue?.id,
    start,
    end: event.end?.dateTime,
    language: parseLanguage(description, event.summary),
    attendance,
    description: stripFields(description, 'en'),
    descriptionSi: readField(description, 'Description-SI') ?? stripFields(description, 'si'),
    livestreamUrl,
    location: event.location?.trim() || undefined,
    speakerPhoto: readSpeakerPhoto(event, description),
    source: 'google',
  }
}

function splitTitle(summary: string) {
  const parts = summary.split(/\s+\/\s+/)
  if (parts.length >= 2 && /[\u0D80-\u0DFF]/.test(parts[1] ?? '')) {
    return { title: parts[0]?.trim() ?? summary, titleSi: parts.slice(1).join(' / ').trim() }
  }
  return { title: summary, titleSi: undefined }
}

const GENERIC_TOKENS = new Set([
  'temple',
  'center',
  'centre',
  'buddhist',
  'meditation',
  'international',
  'raja',
  'maha',
  'vihara',
  'viharaya',
  'rajamaha',
  'sri',
])

const FIELD_LABELS =
  'Language|Speaker-Photo|Speaker-SI|Speaker|Title-SI|Description-SI|Livestream|Attendance'

const cityTokens = new Set(venues.map((venue) => normalize(venue.city)))

export function htmlToText(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
    .replace(/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function matchVenue(location: string, extra = '') {
  const fromLocation = bestVenue(location)
  if (fromLocation && fromLocation.score >= 50) return fromLocation.venue
  const fromAll = bestVenue(`${location} ${extra}`)
  if (fromAll && fromAll.score >= 50) return fromAll.venue
  return fromLocation?.venue ?? fromAll?.venue
}

function bestVenue(text: string) {
  const haystack = normalize(text)
  if (!haystack) return undefined

  let best: { venue: (typeof venues)[number]; score: number } | undefined
  for (const venue of venues) {
    const score = scoreVenue(venue, haystack)
    if (score > 0 && (!best || score > best.score)) best = { venue, score }
  }
  if (best?.score === 1) {
    const cityHits = venues.filter((venue) => scoreVenue(venue, haystack) === 1)
    if (cityHits.length !== 1) return undefined
  }
  return best
}

function scoreVenue(venue: (typeof venues)[number], haystack: string) {
  const names = [venue.name, venue.nameSi, ...(venue.aliases ?? [])].filter(
    (value): value is string => Boolean(value),
  )
  if (names.some((name) => haystack.includes(normalize(name)))) return 100

  const tokens = names
    .flatMap((name) => normalize(name).split(' '))
    .filter((token) => token.length >= 6 && !GENERIC_TOKENS.has(token) && !cityTokens.has(token))
  const hit = tokens.find((token) => haystack.includes(token))
  if (hit) return 50 + hit.length

  return haystack.includes(normalize(venue.city)) ? 1 : 0
}

function parseLanguage(description: string, title: string): Language {
  const field = readField(description, 'Language') ?? `${description} ${title}`
  const text = field.toLowerCase()
  if (text.includes('tamil') || text.includes('தமிழ்')) return 'Tamil'
  if (text.includes('english')) return 'English'
  if (text.includes('pali') || text.includes('පාලි')) return 'Pali'
  if (text.includes('mixed') || (text.includes('sinhala') && text.includes('english'))) {
    return 'Mixed'
  }
  return 'Sinhala'
}

function readSpeakerPhoto(event: CalendarEvent, description: string) {
  const field = readField(description, 'Speaker-Photo')
  const fromField = field ? imageSrc(field) : undefined
  if (fromField) return fromField
  const image = event.attachments?.find(
    (item) => item.fileUrl && item.mimeType?.startsWith('image/'),
  )
  return image?.fileUrl ? imageSrc(image.fileUrl) : undefined
}

function imageSrc(value: string) {
  const url = value.match(/https?:\/\/[^\s<>"']+/i)?.[0]?.replace(/[),.;]+$/, '')
  if (!url) return undefined
  const driveId =
    url.match(/drive\.google\.com\/file\/d\/([^/]+)/)?.[1] ??
    url.match(/drive\.google\.com\/open\?id=([^&]+)/)?.[1] ??
    (url.includes('drive.google.com') ? url.match(/[?&]id=([^&]+)/)?.[1] : undefined)
  if (driveId) return `https://drive.google.com/thumbnail?id=${driveId}&sz=w200`
  return url
}

function readField(description: string, label: string) {
  const match = description.match(
    new RegExp(`${label}\\s*:\\s*(.+?)(?=\\n(?:${FIELD_LABELS})\\s*:|$)`, 'is'),
  )
  return match?.[1]?.trim().split('\n')[0]?.trim()
}

function stripFields(description: string, script: 'en' | 'si') {
  const stripped = description
    .replace(/^(Language|Speaker|Speaker-SI|Title-SI|Description-SI|Livestream|Attendance|Speaker-Photo)\s*:.*$/gim, '')
    .trim()
  if (!stripped) return undefined
  if (script === 'si') return /[\u0D80-\u0DFF]/.test(stripped) ? stripped : undefined
  return /[\u0D80-\u0DFF]/.test(stripped) && !/[A-Za-z]/.test(stripped) ? undefined : stripped
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u0d80-\u0dff]+/g, ' ').trim()
}
