import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { lookupSpeakerPhoto } from './data/speakers'
import { venuesById } from './data/venues'
import { loadSermons } from './lib/calendar'
import {
  addDaysKey,
  addMonthsKey,
  colomboDateKey,
  dateFromKey,
  endOfMonth,
  endOfWeek,
  formatDayHeading,
  formatDayHeadingSi,
  formatMonthTitle,
  formatTime,
  formatWeekTitle,
  formatWhen,
  directionsUrl,
  startOfWeekKey,
} from './lib/format'
import { cityNameSi, districtSi, languageSi } from './lib/labels'
import { inferAttendance, isInPerson, isLivestream } from './lib/attendance'
import { distanceKm, formatDistance, formatDistanceSi } from './lib/geo'
import {
  districts,
  type Coords,
  type District,
  type Language,
  type LocatedSermon,
  type Sermon,
} from './types'

type WhenFilter = 'upcoming' | 'week' | 'month'
type ViewMode = 'calendar' | 'list'
type CalRange = 'week' | 'month'
type LocationStatus = 'idle' | 'pending' | 'granted' | 'denied' | 'unavailable'

const languages: Array<Language | 'all'> = ['all', 'Sinhala', 'English', 'Tamil', 'Pali', 'Mixed']
const districtOptions: Array<District | 'all'> = ['all', ...districts]
const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function App() {
  const [sermons, setSermons] = useState<Sermon[]>([])
  const [source, setSource] = useState<'google' | 'sample'>('sample')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [coords, setCoords] = useState<Coords | null>(null)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')
  const [language, setLanguage] = useState<Language | 'all'>('all')
  const [district, setDistrict] = useState<District | 'all'>('all')
  const [when, setWhen] = useState<WhenFilter>('upcoming')
  const [view, setView] = useState<ViewMode>('calendar')
  const [calRange, setCalRange] = useState<CalRange>('month')
  const [focusDay, setFocusDay] = useState(() => colomboDateKey(new Date().toISOString()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const didPickDay = useRef(false)
  const dayPanelRef = useRef<HTMLDivElement>(null)

  function requestCoords() {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable')
      return
    }
    setLocationStatus((current) => (current === 'granted' ? current : 'pending'))
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocationStatus('granted')
      },
      () => {
        setLocationStatus((current) => (current === 'granted' ? current : 'denied'))
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    )
  }

  useEffect(() => {
    let cancelled = false
    loadSermons()
      .then((result) => {
        if (cancelled) return
        setSermons(result.sermons)
        setSource(result.source)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : 'Could not load sermons.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    requestCoords()
  }, [])

  const located = useMemo<LocatedSermon[]>(() => {
    return sermons.flatMap((sermon) => {
      const attendance = inferAttendance(sermon)
      const venue = sermon.venueId ? venuesById[sermon.venueId] : undefined
      if (sermon.venueId && !venue) return []
      if (!venue && attendance !== 'livestream') return []
      return [
        {
          ...sermon,
          venue,
          attendance,
          distanceKm:
            isInPerson(attendance) && coords && venue ? distanceKm(coords, venue) : undefined,
        },
      ]
    })
  }, [coords, sermons])

  const filtered = useMemo(() => {
    const now = new Date()
    const weekEnd = endOfWeek(now)
    const monthEnd = endOfMonth(now)

    return located
      .filter((sermon) => {
        const start = new Date(sermon.start)
        if (when === 'week' && start > weekEnd) return false
        if (when === 'month' && start > monthEnd) return false
        if (language !== 'all' && sermon.language !== language) return false
        if (district !== 'all' && sermon.venue?.district !== district) return false
        return true
      })
      .sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm || +new Date(a.start) - +new Date(b.start)
        }
        return +new Date(a.start) - +new Date(b.start)
      })
  }, [district, language, located, when])

  useEffect(() => {
    if (didPickDay.current || loading) return
    didPickDay.current = true
    const today = colomboDateKey(new Date().toISOString())
    const next = filtered.find((sermon) => colomboDateKey(sermon.start) >= today)
    const key = next ? colomboDateKey(next.start) : today
    setSelectedDay(key)
    setFocusDay(key)
  }, [filtered, loading])

  const selectedSermons = selectedDay
    ? filtered
        .filter((sermon) => colomboDateKey(sermon.start) === selectedDay)
        .sort((a, b) => +new Date(a.start) - +new Date(b.start))
    : []

  function shiftRange(delta: number) {
    setFocusDay((current) =>
      calRange === 'week' ? addDaysKey(current, delta * 7) : addMonthsKey(current, delta),
    )
    setSelectedDay(null)
  }

  function goToday() {
    const today = colomboDateKey(new Date().toISOString())
    setFocusDay(today)
    setSelectedDay(today)
    requestCoords()
  }

  function setRange(range: CalRange) {
    setCalRange(range)
    if (selectedDay) setFocusDay(selectedDay)
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="kicker">ශ්‍රී ලංකාව · Sri Lanka</p>
        <h1>
          <span lang="si">ධර්ම දේශනා</span>
          <span lang="en">Dhamma sermons</span>
        </h1>
        <p className="lede">
          Upcoming deshanas around the island — nearest first, in person or on the stream.
        </p>
        <div className="ornament" aria-hidden="true" />
      </header>

      {source === 'sample' && (
        <p className="banner">
          Showing sample sermons until a public Google Calendar is connected.
        </p>
      )}
      {loadError && <p className="banner error">{loadError}</p>}

      <section className="filters" aria-label="Filters">
        <FilterSelect
          label="Language"
          value={language}
          options={languages}
          onChange={(value) => setLanguage(value as Language | 'all')}
        />
        <FilterSelect
          label="District"
          value={district}
          options={districtOptions}
          labels={Object.fromEntries(districts.map((item) => [item, `${item} · ${districtSi[item]}`]))}
          onChange={(value) => setDistrict(value as District | 'all')}
        />
        <FilterSelect
          label="When"
          value={when}
          options={['upcoming', 'week', 'month']}
          labels={{ upcoming: 'Upcoming', week: 'This week', month: 'This month' }}
          onChange={(value) => setWhen(value as WhenFilter)}
        />
      </section>

      <div className="toolbar">
        <div className="view-toggle" role="tablist" aria-label="View">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'calendar'}
            className={view === 'calendar' ? 'active' : undefined}
            onClick={() => {
              requestCoords()
              setView('calendar')
            }}
          >
            Calendar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            className={view === 'list' ? 'active' : undefined}
            onClick={() => {
              requestCoords()
              setView('list')
            }}
          >
            List
          </button>
        </div>
        <p className="count">
          {loading ? 'Loading sermons…' : `${filtered.length} sermon${filtered.length === 1 ? '' : 's'}`}
        </p>
        {locationStatus !== 'granted' && (
          <button type="button" className="ghost location-btn" onClick={requestCoords}>
            {locationStatus === 'pending' ? 'Finding you…' : 'Show my distance'}
          </button>
        )}
      </div>

      {view === 'calendar' ? (
        <>
          <MonthCalendar
            focusDay={focusDay}
            range={calRange}
            sermons={filtered}
            selectedDay={selectedDay}
            onRange={setRange}
            onSelectDay={(day) => {
              requestCoords()
              setSelectedDay(day)
              if (day) setFocusDay(day)
              if (day && window.matchMedia('(max-width: 860px)').matches) {
                requestAnimationFrame(() => {
                  dayPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                })
              }
            }}
            onPrev={() => shiftRange(-1)}
            onNext={() => shiftRange(1)}
            onToday={goToday}
          />
          {selectedDay && (calRange === 'month' || selectedSermons.length > 0) && (
            <div className="day-panel" ref={dayPanelRef}>
              <h3 className="day-heading">
                <span className="day-names">
                  <span>{formatDayHeading(selectedDay)}</span>
                  <span lang="si">{formatDayHeadingSi(selectedDay)}</span>
                </span>
                <span className="day-count">
                  {selectedSermons.length === 1
                    ? '1 sermon'
                    : selectedSermons.length === 0
                      ? 'No sermons'
                      : `${selectedSermons.length} sermons`}
                </span>
              </h3>
              {selectedSermons.length > 0 ? (
                <ol className="list day-list">
                  {selectedSermons.map((sermon) => (
                    <SermonCard key={sermon.id} sermon={sermon} onRequestLocation={requestCoords} />
                  ))}
                </ol>
              ) : (
                <p className="empty">No sermons on this day with the current filters.</p>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <ol className="list">
            {filtered.map((sermon) => (
              <SermonCard key={sermon.id} sermon={sermon} onRequestLocation={requestCoords} />
            ))}
          </ol>
          {!loading && filtered.length === 0 && (
            <p className="empty">No sermons match these filters.</p>
          )}
        </>
      )}
    </div>
  )
}

function MonthCalendar({
  focusDay,
  range,
  sermons,
  selectedDay,
  onRange,
  onSelectDay,
  onPrev,
  onNext,
  onToday,
}: {
  focusDay: string
  range: CalRange
  sermons: LocatedSermon[]
  selectedDay: string | null
  onRange: (range: CalRange) => void
  onSelectDay: (day: string | null) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  const todayKey = colomboDateKey(new Date().toISOString())
  const focus = dateFromKey(focusDay)
  const year = focus.getUTCFullYear()
  const month = focus.getUTCMonth()
  const weekStart = startOfWeekKey(focusDay)
  const title = range === 'week' ? formatWeekTitle(weekStart) : formatMonthTitle(year, month)
  const byDay = useMemo(() => {
    const groups = new Map<string, LocatedSermon[]>()
    for (const sermon of sermons) {
      const key = colomboDateKey(sermon.start)
      const list = groups.get(key) ?? []
      list.push(sermon)
      list.sort((a, b) => +new Date(a.start) - +new Date(b.start))
      groups.set(key, list)
    }
    return groups
  }, [sermons])

  const cells = useMemo(
    () => (range === 'week' ? weekCells(weekStart) : monthCells(year, month)),
    [month, range, weekStart, year],
  )
  const chipLimit = range === 'week' ? 6 : 3

  return (
    <section className={`month-cal ${range}-cal`} aria-label={title}>
      <div className="month-nav">
        <div className="month-shift">
          <button
            type="button"
            className="ghost icon-btn"
            onClick={onPrev}
            aria-label={range === 'week' ? 'Previous week' : 'Previous month'}
          >
            ‹
          </button>
          <h2>{title}</h2>
          <button
            type="button"
            className="ghost icon-btn"
            onClick={onNext}
            aria-label={range === 'week' ? 'Next week' : 'Next month'}
          >
            ›
          </button>
        </div>
        <div className="cal-actions">
          <div className="view-toggle range-toggle" role="tablist" aria-label="Calendar range">
            <button
              type="button"
              role="tab"
              aria-selected={range === 'week'}
              className={range === 'week' ? 'active' : undefined}
              onClick={() => onRange('week')}
            >
              Week
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={range === 'month'}
              className={range === 'month' ? 'active' : undefined}
              onClick={() => onRange('month')}
            >
              Month
            </button>
          </div>
          <button type="button" className="ghost today-btn" onClick={onToday}>
            Today
          </button>
        </div>
      </div>
      <div className={range === 'week' ? 'week-scroller' : undefined}>
        <div className="month-weekdays">
          {weekdays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className={range === 'week' ? 'week-grid' : 'month-grid'}>
          {cells.map((cell, index) => {
            if (!cell) return <div key={`pad-${index}`} className="cal-day empty-day" />
            const key = cell.key
            const items = byDay.get(key) ?? []
            const selected = selectedDay === key
            return (
              <button
                key={key}
                type="button"
                className={`cal-day${items.length ? ' has-events' : ''}${key === todayKey ? ' today' : ''}${selected ? ' selected' : ''}`}
                onClick={() => onSelectDay(selected ? null : key)}
              >
                <span className="cal-num">{cell.day}</span>
                <span className="cal-events">
                  {items.slice(0, chipLimit).map((sermon) => (
                    <span key={sermon.id} className={`chip ${sermon.attendance}`}>
                      <span className="chip-time">{formatTime(sermon.start)}</span>
                      <span className="chip-title">{sermon.title}</span>
                    </span>
                  ))}
                  {items.length > chipLimit && (
                    <span className="chip more">+{items.length - chipLimit} more</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function weekCells(startKey: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const key = addDaysKey(startKey, index)
    return { day: dateFromKey(key).getUTCDate(), key }
  })
}

function monthCells(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const first = new Date(`${year}-${String(month + 1).padStart(2, '0')}-01T12:00:00+05:30`)
  const lead = first.getUTCDay()
  const cells: Array<{ day: number; key: string } | null> = []
  for (let i = 0; i < lead; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, key })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function FilterSelect({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  labels?: Record<string, string>
  onChange: (value: string) => void
}) {
  return (
    <label className="select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? (option === 'all' ? 'All' : option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function SermonCard({
  sermon,
  onRequestLocation,
}: {
  sermon: LocatedSermon
  onRequestLocation: () => void
}) {
  const inPerson = isInPerson(sermon.attendance)
  return (
    <li className="card">
      <div className={`card-top${speakerPhotosOf(sermon).length ? ' has-photos' : ''}`}>
        <div className="when">
          <time dateTime={sermon.start}>{formatWhen(sermon.start, sermon.end)}</time>
          <AttendanceMarks sermon={sermon} />
        </div>
        <SpeakerPhotos sermon={sermon} />
        {sermon.distanceKm !== undefined ? (
          <p className="distance-badge">{formatDistance(sermon.distanceKm)}</p>
        ) : inPerson ? (
          <button type="button" className="distance-badge ask-location" onClick={onRequestLocation}>
            Show distance
          </button>
        ) : null}
      </div>
      <SermonSplit sermon={sermon} heading="h3" />
    </li>
  )
}

function speakerPhotosOf(sermon: LocatedSermon) {
  if (sermon.speakerPhotos?.length) return sermon.speakerPhotos
  const fallback = lookupSpeakerPhoto(sermon.speaker)
  return fallback ? [fallback] : []
}

function SpeakerPhotos({ sermon }: { sermon: LocatedSermon }) {
  const [hidden, setHidden] = useState<Record<string, true>>({})
  const photos = speakerPhotosOf(sermon).filter((src) => !hidden[src])
  if (!photos.length) return null
  return (
    <div className="speaker-photos">
      {photos.map((src) => (
        <img
          key={src}
          className="speaker-photo"
          src={src}
          alt=""
          title={sermon.speaker}
          width={48}
          height={48}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHidden((current) => ({ ...current, [src]: true }))}
        />
      ))}
    </div>
  )
}

function AttendanceMarks({ sermon }: { sermon: LocatedSermon }) {
  const maps = isInPerson(sermon.attendance) ? directionsUrl(sermon) : undefined
  const live = isLivestream(sermon.attendance) ? sermon.livestreamUrl : undefined

  return (
    <p className="attendance">
      {isInPerson(sermon.attendance) && (
        <AttendanceTag href={maps} label="Directions · මාර්ගය">
          <PlaceIcon />
          In person · ස්ථානීය
        </AttendanceTag>
      )}
      {isLivestream(sermon.attendance) && (
        <AttendanceTag href={live} label="Livestream · සජීවී විකාශය">
          <LiveIcon />
          Livestream · සජීවී
        </AttendanceTag>
      )}
    </p>
  )
}

function AttendanceTag({
  href,
  label,
  children,
}: {
  href?: string
  label: string
  children: ReactNode
}) {
  if (href) {
    return (
      <a className="attendance-tag" href={href} rel="noreferrer" target="_blank" aria-label={label}>
        {children}
      </a>
    )
  }
  return <span className="attendance-tag">{children}</span>
}

function PlaceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"
      />
    </svg>
  )
}

function LiveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17 10.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5l4 4v-11l-4 4Z"
      />
    </svg>
  )
}

function SermonSplit({
  sermon,
  heading,
}: {
  sermon: LocatedSermon
  heading: 'h2' | 'h3'
}) {
  return (
    <div className="card-split">
      <SermonCopy
        heading={heading}
        lang="en"
        title={sermon.title}
        speaker={sermon.speaker}
        venueName={sermon.venue?.name ?? 'Livestream'}
        city={sermon.venue?.city ?? 'Online'}
        district={sermon.venue?.district ?? ''}
        language={sermon.language}
        distance={sermon.distanceKm !== undefined ? formatDistance(sermon.distanceKm) : undefined}
      />
      <SermonCopy
        heading={heading}
        lang="si"
        title={sermon.titleSi}
        speaker={sermon.speakerSi}
        venueName={sermon.venue?.nameSi ?? sermon.venue?.name ?? 'සජීවී විකාශය'}
        city={sermon.venue ? cityNameSi(sermon.venue.city) : 'අන්තර්ජාලය'}
        district={sermon.venue ? districtSi[sermon.venue.district] : ''}
        language={languageSi[sermon.language]}
        distance={sermon.distanceKm !== undefined ? formatDistanceSi(sermon.distanceKm) : undefined}
      />
    </div>
  )
}

function SermonCopy({
  heading: Heading,
  lang,
  title,
  speaker,
  venueName,
  city,
  district,
  language,
  distance,
}: {
  heading: 'h2' | 'h3'
  lang: 'en' | 'si'
  title: string
  speaker: string
  venueName: string
  city: string
  district: string
  language: string
  distance?: string
}) {
  return (
    <div className={`copy copy-${lang}`} lang={lang}>
      <Heading>{title}</Heading>
      <p className="meta">{speaker}</p>
      <p className="meta">{venueName}</p>
      <p className="meta">
        {[city, district, language, distance].filter(Boolean).join(' · ')}
      </p>
    </div>
  )
}
