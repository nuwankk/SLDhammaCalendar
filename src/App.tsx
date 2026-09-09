import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { lookupSpeakerPhoto } from './data/speakers'
import { venuesById } from './data/venues'
import { loadSermons } from './lib/calendar'
import {
  colomboDateKey,
  endOfMonth,
  endOfWeek,
  formatMonthTitle,
  formatTime,
  formatWhen,
  directionsUrl,
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
type LocationStatus = 'idle' | 'pending' | 'granted' | 'denied' | 'unavailable'

const languages: Array<Language | 'all'> = ['all', 'Sinhala', 'English', 'Tamil', 'Pali', 'Mixed']
const districtOptions: Array<District | 'all'> = ['all', ...districts]
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

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

  const selectedSermons = selectedDay
    ? filtered.filter((sermon) => colomboDateKey(sermon.start) === selectedDay)
    : []

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const date = new Date(current.year, current.month + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
    setSelectedDay(null)
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
          Upcoming deshanas around the country. Sermons are ordered by distance from your location.
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
            year={cursor.year}
            month={cursor.month}
            sermons={filtered}
            selectedDay={selectedDay}
            onSelectDay={(day) => {
              requestCoords()
              setSelectedDay(day)
            }}
            onPrev={() => shiftMonth(-1)}
            onNext={() => shiftMonth(1)}
          />
          {selectedDay && (
            <ol className="list day-list">
              {selectedSermons.map((sermon) => (
                <SermonCard key={sermon.id} sermon={sermon} onRequestLocation={requestCoords} />
              ))}
            </ol>
          )}
          {selectedDay && selectedSermons.length === 0 && (
            <p className="empty">No sermons on this day with the current filters.</p>
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
  year,
  month,
  sermons,
  selectedDay,
  onSelectDay,
  onPrev,
  onNext,
}: {
  year: number
  month: number
  sermons: LocatedSermon[]
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
  onPrev: () => void
  onNext: () => void
}) {
  const todayKey = colomboDateKey(new Date().toISOString())
  const byDay = useMemo(() => {
    const groups = new Map<string, LocatedSermon[]>()
    for (const sermon of sermons) {
      const key = colomboDateKey(sermon.start)
      const list = groups.get(key) ?? []
      list.push(sermon)
      groups.set(key, list)
    }
    return groups
  }, [sermons])

  const cells = useMemo(() => monthCells(year, month), [year, month])

  return (
    <section className="month-cal" aria-label={formatMonthTitle(year, month)}>
      <div className="month-nav">
        <button type="button" className="ghost" onClick={onPrev} aria-label="Previous month">
          Previous
        </button>
        <h2>{formatMonthTitle(year, month)}</h2>
        <button type="button" className="ghost" onClick={onNext} aria-label="Next month">
          Next
        </button>
      </div>
      <div className="month-weekdays">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="month-grid">
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
                {items.slice(0, 3).map((sermon) => (
                  <span key={sermon.id} className="chip">
                    {sermon.distanceKm !== undefined ? `${formatDistance(sermon.distanceKm)} · ` : ''}
                    {formatTime(sermon.start)} {sermon.title}
                  </span>
                ))}
                {items.length > 3 && <span className="chip more">+{items.length - 3}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
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
      <div className="card-top">
        <div className="when">
          <time dateTime={sermon.start}>{formatWhen(sermon.start, sermon.end)}</time>
          <AttendanceMarks sermon={sermon} />
        </div>
        {sermon.distanceKm !== undefined ? (
          <p className="distance-badge">{formatDistance(sermon.distanceKm)}</p>
        ) : inPerson ? (
          <button type="button" className="distance-badge ask-location" onClick={onRequestLocation}>
            Show distance
          </button>
        ) : null}
      </div>
      <div className="card-body">
        <SpeakerPhoto sermon={sermon} />
        <SermonSplit sermon={sermon} heading="h3" />
      </div>
    </li>
  )
}

function SpeakerPhoto({ sermon }: { sermon: LocatedSermon }) {
  const src = sermon.speakerPhoto ?? lookupSpeakerPhoto(sermon.speaker)
  const [broken, setBroken] = useState(false)
  if (!src || broken) return null
  return (
    <img
      className="speaker-photo"
      src={src}
      alt=""
      title={sermon.speaker}
      width={64}
      height={64}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
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
