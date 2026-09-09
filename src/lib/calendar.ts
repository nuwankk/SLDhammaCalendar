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

  const description = event.description ?? ''
  const livestreamUrl = readField(description, 'Livestream')
  const attendanceHint = parseAttendanceField(readField(description, 'Attendance'))
  const remote = attendanceHint === 'livestream' || isRemoteLocation(event.location ?? '')
  const venue = remote ? undefined : matchVenue(event.location ?? event.summary)
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

function matchVenue(location: string) {
  const haystack = normalize(location)
  const byName = venues.find((venue) => {
    return (
      haystack.includes(normalize(venue.name)) ||
      (venue.nameSi !== undefined && haystack.includes(normalize(venue.nameSi)))
    )
  })
  if (byName) return byName

  const byToken = venues.find((venue) => {
    const tokens = [venue.name, venue.nameSi]
      .filter((value): value is string => Boolean(value))
      .flatMap((value) => normalize(value).split(' '))
      .filter((token) => token.length >= 8)
    return tokens.some((token) => haystack.includes(token))
  })
  return byToken ?? venues.find((venue) => haystack.includes(normalize(venue.city)))
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

function stripFields(description: string, script: 'en' | 'si') {
  const stripped = description
    .replace(/^(Language|Speaker|Speaker-SI|Title-SI|Description-SI|Livestream|Attendance)\s*:.*$/gim, '')
    .trim()
  if (!stripped) return undefined
  if (script === 'si') return /[\u0D80-\u0DFF]/.test(stripped) ? stripped : undefined
  return /[\u0D80-\u0DFF]/.test(stripped) && !/[A-Za-z]/.test(stripped) ? undefined : stripped
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u0d80-\u0dff]+/g, ' ').trim()
}
