import { useEffect, useMemo, useState } from 'react'
import { venuesById } from './data/venues'
import { loadSermons } from './lib/calendar'
import {
  colomboDateKey,
  endOfMonth,
  endOfWeek,
  formatMonthTitle,
  formatTime,
  formatWhen,
  mapsUrl,
} from './lib/format'
import { cityNameSi, districtSi, languageSi } from './lib/labels'
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
      const venue = venuesById[sermon.venueId]
      if (!venue) return []
      return [
        {
          ...sermon,
          venue,
          distanceKm: coords ? distanceKm(coords, venue) : undefined,
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
        if (district !== 'all' && sermon.venue.district !== district) return false
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
  return (
    <li className="card">
      <div className="card-top">
        <div className="when">
          <time dateTime={sermon.start}>{formatWhen(sermon.start, sermon.end)}</time>
        </div>
        {sermon.distanceKm !== undefined ? (
          <p className="distance-badge">{formatDistance(sermon.distanceKm)}</p>
        ) : (
          <button type="button" className="distance-badge ask-location" onClick={onRequestLocation}>
            Show distance
          </button>
        )}
      </div>
      <SermonSplit sermon={sermon} heading="h3" />
      <div className="actions">
        <a href={mapsUrl(sermon.venue.lat, sermon.venue.lng, sermon.venue.name)}>
          Directions · මාර්ගය
        </a>
        {sermon.livestreamUrl && (
          <a href={sermon.livestreamUrl} rel="noreferrer" target="_blank">
            Livestream · සජීවී විකාශය
          </a>
        )}
      </div>
    </li>
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
        venueName={sermon.venue.name}
        city={sermon.venue.city}
        district={sermon.venue.district}
        language={sermon.language}
        distance={sermon.distanceKm !== undefined ? formatDistance(sermon.distanceKm) : undefined}
        description={sermon.description}
      />
      <SermonCopy
        heading={heading}
        lang="si"
        title={sermon.titleSi}
        speaker={sermon.speakerSi}
        venueName={sermon.venue.nameSi ?? sermon.venue.name}
        city={cityNameSi(sermon.venue.city)}
        district={districtSi[sermon.venue.district]}
        language={languageSi[sermon.language]}
        distance={sermon.distanceKm !== undefined ? formatDistanceSi(sermon.distanceKm) : undefined}
        description={sermon.descriptionSi}
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
  description,
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
  description?: string
}) {
  return (
    <div className={`copy copy-${lang}`} lang={lang}>
      <Heading>{title}</Heading>
      <p className="meta">{speaker}</p>
      <p className="meta">{venueName}</p>
      <p className="meta">
        {city} · {district} · {language}
        {distance ? ` · ${distance}` : ''}
      </p>
      {description && <p className="notes">{description}</p>}
    </div>
  )
}
