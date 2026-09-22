import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { venues } from './data/venues'
import { hasPlacesKey, searchPlaces, type PlaceSuggestion } from './lib/places'

export type VenueChoice =
  | { kind: 'known'; venueId: string; label: string }
  | { kind: 'place'; label: string }
  | { kind: 'custom'; label: string }

type Row =
  | { key: string; label: string; choice: VenueChoice; group: 'known' | 'maps' | 'custom' }

function sortKnown() {
  return [...venues].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export function VenueSearchSelect({
  label = 'Venue',
  valueLabel,
  disabled = false,
  onChoose,
}: {
  label?: string
  valueLabel: string
  disabled?: boolean
  onChoose: (choice: VenueChoice) => void
}) {
  const listId = useId()
  const rootRef = useRef<HTMLLabelElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(valueLabel)
  const [places, setPlaces] = useState<PlaceSuggestion[]>([])
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [active, setActive] = useState(0)
  const requestId = useRef(0)

  useEffect(() => {
    if (!open) setQuery(valueLabel)
  }, [open, valueLabel])

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!open || disabled) return
    const q = query.trim()
    if (!hasPlacesKey() || q.length < 2) {
      setPlaces([])
      setLoadingPlaces(false)
      return
    }
    const id = ++requestId.current
    setLoadingPlaces(true)
    const timer = window.setTimeout(() => {
      searchPlaces(q)
        .then((results) => {
          if (requestId.current === id) setPlaces(results)
        })
        .catch(() => {
          if (requestId.current === id) setPlaces([])
        })
        .finally(() => {
          if (requestId.current === id) setLoadingPlaces(false)
        })
    }, 280)
    return () => window.clearTimeout(timer)
  }, [disabled, open, query])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const known = sortKnown()
      .filter((venue) => {
        if (!q) return true
        return `${venue.name} ${venue.nameSi ?? ''} ${venue.city} ${venue.aliases?.join(' ') ?? ''}`
          .toLowerCase()
          .includes(q)
      })
      .map(
        (venue): Row => ({
          key: `known-${venue.id}`,
          label: `${venue.name} · ${venue.city}`,
          group: 'known',
          choice: { kind: 'known', venueId: venue.id, label: venue.name },
        }),
      )

    const mapRows = places.map(
      (place): Row => ({
        key: `place-${place.id}`,
        label: place.label,
        group: 'maps',
        choice: { kind: 'place', label: place.label },
      }),
    )

    const custom: Row[] = []
    if (query.trim()) {
      const already =
        known.some((row) => row.choice.kind === 'known' && row.choice.label.toLowerCase() === query.trim().toLowerCase()) ||
        mapRows.some((row) => row.label.toLowerCase() === query.trim().toLowerCase())
      if (!already) {
        custom.push({
          key: `custom-${query.trim()}`,
          label: `Use as typed: ${query.trim()}`,
          group: 'custom',
          choice: { kind: 'custom', label: query.trim() },
        })
      }
    }

    return [...known, ...mapRows, ...custom]
  }, [places, query])

  function choose(row: Row) {
    onChoose(row.choice)
    setQuery(row.choice.label.replace(/^Use as typed:\s*/i, ''))
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery(valueLabel)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => Math.min(current + 1, Math.max(rows.length - 1, 0)))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => Math.max(current - 1, 0))
    }
    if (event.key === 'Enter' && open && rows[active]) {
      event.preventDefault()
      choose(rows[active])
    }
  }

  return (
    <label className="select search-select venue-search" ref={rootRef}>
      <span>{label}</span>
      <div className={`search-select-control${open ? ' open' : ''}${disabled ? ' disabled' : ''}`}>
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={open ? query : valueLabel}
          placeholder="Type temple, city, or address…"
          onFocus={() => {
            if (disabled) return
            setOpen(true)
            setQuery(valueLabel)
            setActive(0)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // Keep typed text selectable via list; if closed with unmatched text, treat as custom on next submit via parent state.
          }}
        />
        {open && (
          <ul id={listId} className="search-select-list" role="listbox">
            {loadingPlaces && <li className="search-select-empty">Searching Google Maps…</li>}
            {!loadingPlaces && rows.length === 0 ? (
              <li className="search-select-empty">No matches — keep typing or pick “Use as typed”</li>
            ) : (
              rows.map((row, index) => (
                <li key={row.key}>
                  <button
                    type="button"
                    role="option"
                    className={`search-select-option${index === active ? ' active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(row)}
                  >
                    <span className="search-select-option-label">{row.label}</span>
                    {row.group === 'maps' && <span className="search-select-tag">Maps</span>}
                    {row.group === 'custom' && <span className="search-select-tag">Typed</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </label>
  )
}
