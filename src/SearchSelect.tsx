import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

export type SearchOption = {
  value: string
  label: string
  keywords?: string
}

function sortOptions(options: SearchOption[]) {
  return [...options].sort((a, b) => {
    if (a.value === 'all' && b.value !== 'all') return -1
    if (b.value === 'all' && a.value !== 'all') return 1
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  })
}

function matches(option: SearchOption, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return `${option.label} ${option.keywords ?? ''} ${option.value}`.toLowerCase().includes(q)
}

export function SearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Type to search…',
  allowClear = false,
  disabled = false,
}: {
  label: string
  value: string
  options: SearchOption[]
  onChange: (value: string) => void
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
}) {
  const listId = useId()
  const rootRef = useRef<HTMLLabelElement>(null)
  const sorted = useMemo(() => sortOptions(options), [options])
  const selected = sorted.find((option) => option.value === value)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(selected?.label ?? '')
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!open) setQuery(selected?.label ?? '')
  }, [open, selected?.label, value])

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = useMemo(() => sorted.filter((option) => matches(option, query)), [query, sorted])

  function choose(option: SearchOption) {
    onChange(option.value)
    setQuery(option.label)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery(selected?.label ?? '')
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => Math.max(current - 1, 0))
    }
    if (event.key === 'Enter' && open && filtered[active]) {
      event.preventDefault()
      choose(filtered[active])
    }
  }

  return (
    <label className="select search-select" ref={rootRef}>
      <span>{label}</span>
      <div className={`search-select-control${open ? ' open' : ''}${disabled ? ' disabled' : ''}`}>
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={open ? query : (selected?.label ?? query)}
          placeholder={placeholder}
          onFocus={() => {
            if (disabled) return
            setOpen(true)
            setQuery(selected?.label ?? '')
            setActive(0)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActive(0)
            if (allowClear && !event.target.value.trim()) onChange('')
          }}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul id={listId} className="search-select-list" role="listbox">
            {filtered.length === 0 ? (
              <li className="search-select-empty">No matches</li>
            ) : (
              filtered.map((option, index) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    className={`search-select-option${index === active ? ' active' : ''}${option.value === value ? ' selected' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option)}
                  >
                    {option.label}
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
