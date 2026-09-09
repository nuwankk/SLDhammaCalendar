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

function joinWhen(date: string, startTime: string, endTime?: string) {
  const startLabel = `${date} · ${startTime}`
  if (!endTime) return startLabel
  return `${startLabel} – ${endTime}`
}

export function googleCalendarUrl(input: {
  title: string
  start: string
  end?: string
  location: string
  details?: string
}) {
  const start = toGCalStamp(input.start)
  const end = toGCalStamp(input.end ?? addHour(input.start))
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${start}/${end}`,
    location: input.location,
    details: input.details ?? '',
    ctz: timeZone,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function addHour(iso: string) {
  return new Date(new Date(iso).getTime() + 60 * 60 * 1000).toISOString()
}

function toGCalStamp(iso: string) {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

export function mapsUrl(lat: number, lng: number, label: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng} (${label})`)}`
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
