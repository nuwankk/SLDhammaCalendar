import { venues } from '../data/venues'
import { sampleSermons } from '../data/sample-events'
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
    .filter((sermon) => new Date(sermon.start).getTime() >= now - 60 * 60 * 1000)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

function fromGoogleEvent(event: CalendarEvent): Sermon | null {
  const start = event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T06:00:00+05:30` : '')
  if (!start || !event.summary) return null

  const description = event.description ?? ''
  const venue = matchVenue(event.location ?? event.summary)
  if (!venue) return null

  return {
    id: event.id ?? `${venue.id}-${start}`,
    title: event.summary,
    speaker: readField(description, 'Speaker') ?? 'Guest sermon',
    venueId: venue.id,
    start,
    end: event.end?.dateTime,
    language: parseLanguage(description, event.summary),
    description: stripFields(description),
    livestreamUrl: readField(description, 'Livestream'),
    source: 'google',
  }
}

function matchVenue(location: string) {
  const haystack = normalize(location)
  const byName = venues.find((venue) => {
    return (
      haystack.includes(normalize(venue.name)) ||
      (venue.nameSi !== undefined && haystack.includes(normalize(venue.nameSi)))
    )
  })
  return byName ?? venues.find((venue) => haystack.includes(normalize(venue.city)))
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

function readField(description: string, label: string) {
  const match = description.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'))
  return match?.[1]?.trim().split('\n')[0]
}

function stripFields(description: string) {
  return description
    .replace(/^(Language|Speaker|Livestream)\s*:.*$/gim, '')
    .trim()
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u0d80-\u0dff]+/g, ' ').trim()
}
