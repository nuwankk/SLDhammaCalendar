const timeZone = 'Asia/Colombo'

const dateFormatter = new Intl.DateTimeFormat('en-LK', {
  timeZone,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-LK', {
  timeZone,
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso))
}

export function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso))
}

export function formatWhen(start: string, end?: string) {
  return joinWhen(formatDate(start), formatTime(start), end ? formatTime(end) : undefined)
}

const defaultDurationMs = 90 * 60 * 1000

export function sermonWindow(start: string, end?: string) {
  const from = new Date(start).getTime()
  const to = end ? new Date(end).getTime() : from + defaultDurationMs
  return { from, to }
}

export function isHappeningNow(start: string, end?: string, now = Date.now()) {
  const { from, to } = sermonWindow(start, end)
  return now >= from && now < to
}

export function colomboDateKey(iso: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

export function formatDayHeading(dateKey: string) {
  return new Intl.DateTimeFormat('en-LK', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${dateKey}T12:00:00+05:30`))
}

const weekdaysSi = ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා']
const monthsSi = [
  'ජනවාරි',
  'පෙබරවාරි',
  'මාර්තු',
  'අප්‍රේල්',
  'මැයි',
  'ජූනි',
  'ජූලි',
  'අගෝස්තු',
  'සැප්තැම්බර්',
  'ඔක්තෝබර්',
  'නොවැම්බර්',
  'දෙසැම්බර්',
]

export function formatDayHeadingSi(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00+05:30`)
  const intl = new Intl.DateTimeFormat('si-LK', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  if (/[\u0D80-\u0DFF]/.test(intl)) return intl
  return `${weekdaysSi[date.getUTCDay()]}, ${monthsSi[date.getUTCMonth()]} ${date.getUTCDate()}`
}

export function formatMonthTitle(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat('en-LK', {
    timeZone,
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${year}-${String(monthIndex + 1).padStart(2, '0')}-15T12:00:00+05:30`))
}

export function dateFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00+05:30`)
}

export function addDaysKey(dateKey: string, days: number) {
  const date = dateFromKey(dateKey)
  date.setUTCDate(date.getUTCDate() + days)
  return colomboDateKey(date.toISOString())
}

export function addMonthsKey(dateKey: string, months: number) {
  const date = dateFromKey(dateKey)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, last))
  return colomboDateKey(date.toISOString())
}

export function startOfWeekKey(dateKey: string) {
  return addDaysKey(dateKey, -dateFromKey(dateKey).getUTCDay())
}

export function formatWeekTitle(startKey: string) {
  const start = dateFromKey(startKey)
  const end = dateFromKey(addDaysKey(startKey, 6))
  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()
  if (sameMonth) {
    const monthYear = new Intl.DateTimeFormat('en-LK', {
      timeZone,
      month: 'long',
      year: 'numeric',
    }).format(start)
    return `${start.getUTCDate()}–${end.getUTCDate()} ${monthYear}`
  }
  const startLabel = new Intl.DateTimeFormat('en-LK', {
    timeZone,
    day: 'numeric',
    month: 'short',
  }).format(start)
  const endLabel = new Intl.DateTimeFormat('en-LK', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(end)
  return `${startLabel} – ${endLabel}`
}

function joinWhen(date: string, startTime: string, endTime?: string) {
  const startLabel = `${date} · ${startTime}`
  if (!endTime) return startLabel
  return `${startLabel} – ${endTime}`
}

export function mapsUrl(query: string) {
  const trimmed = query.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`
}

export function directionsUrl(sermon: { location?: string; venue?: { lat: number; lng: number; name: string } }) {
  if (sermon.location) return mapsUrl(sermon.location)
  if (sermon.venue) return mapsUrl(`${sermon.venue.name}, ${sermon.venue.lat},${sermon.venue.lng}`)
  return undefined
}

export function endOfWeek(from: Date) {
  const date = new Date(from)
  const day = date.getDay()
  const offset = (7 - day) % 7
  date.setDate(date.getDate() + offset)
  date.setHours(23, 59, 59, 999)
  return date
}

export function endOfMonth(from: Date) {
  return new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59, 999)
}
