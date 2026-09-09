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

export function colomboDateKey(iso: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

export function formatMonthTitle(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat('en-LK', {
    timeZone,
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${year}-${String(monthIndex + 1).padStart(2, '0')}-15T12:00:00+05:30`))
}

function joinWhen(date: string, startTime: string, endTime?: string) {
  const startLabel = `${date} · ${startTime}`
  if (!endTime) return startLabel
  return `${startLabel} – ${endTime}`
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
