import { useEffect, useMemo, useState } from 'react'
import { cities } from './data/cities'
import { venuesById } from './data/venues'
import { loadSermons } from './lib/calendar'
import {
  endOfMonth,
  endOfWeek,
  formatWhen,
  formatWhenSi,
  googleCalendarUrl,
  mapsUrl,
} from './lib/format'
import { cityNameSi, languageSi, regionSi } from './lib/labels'
import { distanceKm, formatDistance, pickRadius } from './lib/geo'
import type { Coords, Language, LocatedSermon, Region, Sermon } from './types'

type OriginStatus = 'pending' | 'granted' | 'denied'
type WhenFilter = 'upcoming' | 'week' | 'month'
type SortMode = 'nearest' | 'soonest'
type Radius = number | 'all'

const languages: Array<Language | 'all'> = ['all', 'Sinhala', 'English', 'Tamil', 'Pali', 'Mixed']
const regions: Array<Region | 'all'> = [
  'all',
  'Western',
  'Central',
  'Southern',
  'Northern',
  'Eastern',
  'North Western',
  'North Central',
  'Uva',
  'Sabaragamuwa',
]
const radiusOptions: Radius[] = [10, 25, 50, 100, 'all']

export default function App() {
  const [sermons, setSermons] = useState<Sermon[]>([])
  const [source, setSource] = useState<'google' | 'sample'>('sample')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [coords, setCoords] = useState<Coords | null>(null)
  const [originStatus, setOriginStatus] = useState<OriginStatus>('pending')
  const [cityId, setCityId] = useState('')

  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState<Language | 'all'>('all')
  const [region, setRegion] = useState<Region | 'all'>('all')
  const [when, setWhen] = useState<WhenFilter>('upcoming')
  const [radiusOverride, setRadiusOverride] = useState<Radius | null>(null)
  const [sortOverride, setSortOverride] = useState<SortMode | null>(null)

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
    if (!navigator.geolocation) {
      setOriginStatus('denied')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        setOriginStatus('granted')
        setSortOverride(null)
      },
      () => setOriginStatus('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }, [])

  const origin = useMemo(() => {
    if (cityId) {
      const city = cities.find((item) => item.id === cityId)
      return city ? { lat: city.lat, lng: city.lng } : coords
    }
    return coords
  }, [cityId, coords])

  const located = useMemo<LocatedSermon[]>(() => {
    return sermons.flatMap((sermon) => {
      const venue = venuesById[sermon.venueId]
      if (!venue) return []
      return [
        {
          ...sermon,
          venue,
          distanceKm: origin ? distanceKm(origin, venue) : undefined,
        },
      ]
    })
  }, [origin, sermons])

  const autoRadius = useMemo(() => {
    if (!origin) return 'all' as const
    const distances = located
      .map((sermon) => sermon.distanceKm)
      .filter((value): value is number => value !== undefined)
    return distances.length ? pickRadius(distances) : 'all'
  }, [located, origin])

  const radius = radiusOverride ?? autoRadius
  const sort = sortOverride ?? (origin ? 'nearest' : 'soonest')

  const filtered = useMemo(() => {
    const now = new Date()
    const weekEnd = endOfWeek(now)
    const monthEnd = endOfMonth(now)
    const needle = query.trim().toLowerCase()

    return located
      .filter((sermon) => {
        const start = new Date(sermon.start)
        if (when === 'week' && start > weekEnd) return false
        if (when === 'month' && start > monthEnd) return false
        if (language !== 'all' && sermon.language !== language) return false
        if (region !== 'all' && sermon.venue.region !== region) return false
        if (radius !== 'all' && (sermon.distanceKm === undefined || sermon.distanceKm > radius)) {
          return false
        }
        if (!needle) return true
        const haystack = [
          sermon.title,
          sermon.titleSi,
          sermon.speaker,
          sermon.speakerSi,
          sermon.venue.name,
          sermon.venue.nameSi,
          sermon.venue.city,
          cityNameSi(sermon.venue.city),
          sermon.venue.region,
          regionSi[sermon.venue.region],
          sermon.language,
          languageSi[sermon.language],
          sermon.description,
          sermon.descriptionSi,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(needle)
      })
      .sort((a, b) => {
        if (sort === 'nearest' && a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm || +new Date(a.start) - +new Date(b.start)
        }
        return +new Date(a.start) - +new Date(b.start)
      })
  }, [language, located, query, radius, region, sort, when])

  const nearest = filtered.find((sermon) => sermon.distanceKm !== undefined)
  const selectedCity = cities.find((city) => city.id === cityId)
  const originLabel = selectedCity
    ? selectedCity.name
    : originStatus === 'granted'
      ? 'your location'
      : null

  function selectCity(nextCityId: string) {
    setCityId(nextCityId)
    setRadiusOverride(null)
    if (nextCityId) setSortOverride(null)
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="kicker">ශ්‍රී ලංකාව · Sri Lanka</p>
        <h1>Dhamma sermons</h1>
        <p className="lede">
          Upcoming deshanas around the country. Allow location to see what is nearest, or pick a
          city.
        </p>
      </header>

      {source === 'sample' && (
        <p className="banner">
          Showing sample sermons until a public Google Calendar is connected.
        </p>
      )}
      {loadError && <p className="banner error">{loadError}</p>}

      <section className="panel" aria-label="Location">
        <div className="panel-row">
          <button
            type="button"
            className="primary"
            onClick={() => {
              setCityId('')
              setOriginStatus('pending')
              navigator.geolocation?.getCurrentPosition(
                (position) => {
                  setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
                  setOriginStatus('granted')
                  setRadiusOverride(null)
                  setSortOverride(null)
                },
                () => setOriginStatus('denied'),
              )
            }}
          >
            Use my location
          </button>
          <label className="select">
            <span>Or choose a city</span>
            <select value={cityId} onChange={(event) => selectCity(event.target.value)}>
              <option value="">Nearest city…</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} · {city.nameSi}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="status">
          {originStatus === 'pending' && 'Looking up your location…'}
          {originStatus === 'granted' && !cityId && 'Using your current location.'}
          {originStatus === 'denied' && !cityId && 'Location is off. Pick a city to find nearby sermons.'}
          {selectedCity && `Measuring from ${selectedCity.name}.`}
        </p>
      </section>

      <section className="filters" aria-label="Filters">
        <label className="search">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Temple, city, speaker…"
          />
        </label>
        <FilterSelect
          label="Language"
          value={language}
          options={languages}
          onChange={(value) => setLanguage(value as Language | 'all')}
        />
        <FilterSelect
          label="Region"
          value={region}
          options={regions}
          onChange={(value) => setRegion(value as Region | 'all')}
        />
        <FilterSelect
          label="When"
          value={when}
          options={['upcoming', 'week', 'month']}
          labels={{ upcoming: 'Upcoming', week: 'This week', month: 'This month' }}
          onChange={(value) => setWhen(value as WhenFilter)}
        />
        <FilterSelect
          label="Within"
          value={String(radius)}
          options={radiusOptions.map(String)}
          labels={{ all: 'Anywhere', '10': '10 km', '25': '25 km', '50': '50 km', '100': '100 km' }}
          onChange={(value) => setRadiusOverride(value === 'all' ? 'all' : Number(value))}
        />
        <FilterSelect
          label="Sort"
          value={sort}
          options={['nearest', 'soonest']}
          labels={{ nearest: 'Nearest', soonest: 'Soonest' }}
          onChange={(value) => setSortOverride(value as SortMode)}
        />
      </section>

      {nearest && originLabel && (
        <article className="nearest">
          <p className="kicker">
            Nearest to {originLabel}
            <span lang="si">
              {' '}
              · {selectedCity ? `${selectedCity.nameSi}ට ආසන්නතම` : 'ඔබට ආසන්නතම'}
            </span>
          </p>
          <SermonSplit sermon={nearest} heading="h2" />
          <div className="when">
            <span lang="en">{formatWhen(nearest.start, nearest.end)}</span>
            <span lang="si">{formatWhenSi(nearest.start, nearest.end)}</span>
            {nearest.distanceKm !== undefined && (
              <span className="distance">{formatDistance(nearest.distanceKm)}</span>
            )}
          </div>
        </article>
      )}

      <p className="count">
        {loading ? 'Loading sermons…' : `${filtered.length} sermon${filtered.length === 1 ? '' : 's'}`}
      </p>

      <ol className="list">
        {filtered.map((sermon) => (
          <SermonCard key={sermon.id} sermon={sermon} />
        ))}
      </ol>

      {!loading && filtered.length === 0 && (
        <p className="empty">No sermons match these filters. Widen the distance or clear a filter.</p>
      )}
    </div>
  )
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

function SermonCard({ sermon }: { sermon: LocatedSermon }) {
  const location = `${sermon.venue.name}, ${sermon.venue.city}`
  return (
    <li className="card">
      <div className="card-top">
        <div className="when">
          <time lang="en" dateTime={sermon.start}>
            {formatWhen(sermon.start, sermon.end)}
          </time>
          <time lang="si" dateTime={sermon.start}>
            {formatWhenSi(sermon.start, sermon.end)}
          </time>
        </div>
        {sermon.distanceKm !== undefined && (
          <span className="distance">{formatDistance(sermon.distanceKm)}</span>
        )}
      </div>
      <SermonSplit sermon={sermon} heading="h3" />
      <div className="actions">
        <a href={mapsUrl(sermon.venue.lat, sermon.venue.lng, sermon.venue.name)}>
          Directions · මාර්ගය
        </a>
        <a
          href={googleCalendarUrl({
            title: `${sermon.title} / ${sermon.titleSi} — ${sermon.venue.name}`,
            start: sermon.start,
            end: sermon.end,
            location,
            details: [sermon.description, sermon.descriptionSi].filter(Boolean).join('\n'),
          })}
        >
          Add to calendar · දින දර්ශනයට එක් කරන්න
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
        region={sermon.venue.region}
        language={sermon.language}
        description={sermon.description}
      />
      <SermonCopy
        heading={heading}
        lang="si"
        title={sermon.titleSi}
        speaker={sermon.speakerSi}
        venueName={sermon.venue.nameSi ?? sermon.venue.name}
        city={cityNameSi(sermon.venue.city)}
        region={regionSi[sermon.venue.region]}
        language={languageSi[sermon.language]}
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
  region,
  language,
  description,
}: {
  heading: 'h2' | 'h3'
  lang: 'en' | 'si'
  title: string
  speaker: string
  venueName: string
  city: string
  region: string
  language: string
  description?: string
}) {
  return (
    <div className={`copy copy-${lang}`} lang={lang}>
      <Heading>{title}</Heading>
      <p className="meta">{speaker}</p>
      <p className="meta">{venueName}</p>
      <p className="meta">
        {city} · {region} · {language}
      </p>
      {description && <p className="notes">{description}</p>}
    </div>
  )
}
