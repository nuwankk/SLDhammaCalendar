import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { SearchSelect } from './SearchSelect'
import { VenueSearchSelect, type VenueChoice } from './VenueSearchSelect'
import { venues } from './data/venues'
import { knownSpeakers, suggestSpeakerSi, suggestTitleSi } from './lib/sinhala'
import {
  hasAddSermonEndpoint,
  submitSermon,
  translateWithAppsScript,
} from './lib/submit-sermon'
import type { Language } from './types'

const languages: Language[] = ['Sinhala', 'English', 'Tamil', 'Pali', 'Mixed']
const attendanceOptions = [
  { value: 'physical', label: 'In person' },
  { value: 'livestream', label: 'Livestream' },
  { value: 'both', label: 'Both' },
] as const

type Attendance = (typeof attendanceOptions)[number]['value']

function defaultStartLocal() {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setHours(now.getHours() + 1)
  return toLocalInput(now)
}

function defaultEndLocal(start: string) {
  const date = fromLocalInput(start)
  if (!date) return ''
  date.setMinutes(date.getMinutes() + 90)
  return toLocalInput(date)
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function AddSermonForm({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const configured = hasAddSermonEndpoint()
  const [pin, setPin] = useState('')
  const [title, setTitle] = useState('')
  const [titleSi, setTitleSi] = useState('')
  const [speaker, setSpeaker] = useState('')
  const [speakerSi, setSpeakerSi] = useState('')
  const [venueChoice, setVenueChoice] = useState<VenueChoice | null>(
    venues[0] ? { kind: 'known', venueId: venues[0].id, label: venues[0].name } : null,
  )
  const [start, setStart] = useState(defaultStartLocal)
  const [end, setEnd] = useState(() => defaultEndLocal(defaultStartLocal()))
  const [language, setLanguage] = useState<Language>('Sinhala')
  const [attendance, setAttendance] = useState<Attendance>('physical')
  const [livestreamUrl, setLivestreamUrl] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionSi, setDescriptionSi] = useState('')
  const titleSiTouchedRef = useRef(false)
  const speakerSiTouchedRef = useRef(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const titleTimer = useRef<number | null>(null)
  const speakerTimer = useRef<number | null>(null)

  const location = useMemo(() => {
    if (attendance === 'livestream') return venueChoice?.label.trim() || 'Online'
    return venueChoice?.label.trim() || ''
  }, [attendance, venueChoice])

  const venueLabel = attendance === 'livestream' ? location || 'Online' : venueChoice?.label || ''

  function queueTranslate(
    kind: 'title' | 'speaker',
    value: string,
    apply: (text: string) => void,
  ) {
    if (!configured || !pin.trim() || !value.trim()) return
    const timerRef = kind === 'title' ? titleTimer : speakerTimer
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      translateWithAppsScript(pin.trim(), value)
        .then((text) => {
          if (text) apply(text)
        })
        .catch(() => undefined)
    }, 700)
  }

  function onTitleChange(value: string) {
    setTitle(value)
    if (titleSiTouchedRef.current) return
    const mapped = suggestTitleSi(value)
    if (mapped) {
      setTitleSi(mapped)
      return
    }
    queueTranslate('title', value, (text) => {
      if (!titleSiTouchedRef.current) setTitleSi(text)
    })
  }

  function onSpeakerChange(value: string) {
    setSpeaker(value)
    if (speakerSiTouchedRef.current) return
    const mapped = suggestSpeakerSi(value)
    if (mapped) {
      setSpeakerSi(mapped)
      return
    }
    queueTranslate('speaker', value, (text) => {
      if (!speakerSiTouchedRef.current) setSpeakerSi(text)
    })
  }

  useEffect(() => {
    const titleId = titleTimer.current
    const speakerId = speakerTimer.current
    return () => {
      if (titleId) window.clearTimeout(titleId)
      if (speakerId) window.clearTimeout(speakerId)
    }
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!configured) {
      setStatus('error')
      setMessage('Add-sermon Apps Script URL is not configured yet.')
      return
    }
    if (!pin.trim()) {
      setStatus('error')
      setMessage('Enter the shared PIN.')
      return
    }
    if (!title.trim() || !start) {
      setStatus('error')
      setMessage('Title and start time are required.')
      return
    }
    if (attendance !== 'livestream' && !location) {
      setStatus('error')
      setMessage('Choose a venue from the list, Maps, or type one and pick “Use as typed”.')
      return
    }
    if ((attendance === 'livestream' || attendance === 'both') && !livestreamUrl.trim()) {
      setStatus('error')
      setMessage('Livestream URL is required for livestream events.')
      return
    }

    setStatus('saving')
    setMessage('Saving to Google Calendar…')
    const result = await submitSermon({
      pin: pin.trim(),
      title: title.trim(),
      titleSi: titleSi.trim(),
      speaker: speaker.trim() || 'Guest sermon',
      speakerSi: speakerSi.trim(),
      location,
      start,
      end: end || defaultEndLocal(start),
      language,
      attendance,
      livestreamUrl: livestreamUrl.trim(),
      description: description.trim(),
      descriptionSi: descriptionSi.trim(),
      speakerPhoto: '',
    })

    if (!result.ok) {
      setStatus('error')
      setMessage(result.error || 'Could not create the event.')
      return
    }

    setStatus('ok')
    setMessage('Sermon added. Refreshing the calendar…')
    onCreated()
    window.setTimeout(onClose, 900)
  }

  return (
    <div className="add-overlay" role="dialog" aria-modal="true" aria-label="Add sermon">
      <form className="add-panel" onSubmit={onSubmit}>
        <div className="add-head">
          <h2>Add sermon · දේශනාවක් එකතු කරන්න</h2>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {!configured && (
          <p className="banner error">
            Set <code>VITE_ADD_SERMON_URL</code> to your Apps Script Web App URL, then rebuild.
          </p>
        )}

        <div className="add-grid">
          <label className="select">
            <span>Shared PIN</span>
            <input
              type="password"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </label>

          <SearchSelect
            label="Language"
            value={language}
            options={languages.map((item) => ({ value: item, label: item }))}
            onChange={(value) => setLanguage(value as Language)}
          />

          <label className="select">
            <span>Title (English)</span>
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Evening deshana"
              required
            />
          </label>

          <label className="select">
            <span>Title (Sinhala)</span>
            <input
              lang="si"
              value={titleSi}
              onChange={(e) => {
                titleSiTouchedRef.current = true
                setTitleSi(e.target.value)
              }}
              placeholder="සන්ධ්‍යා දේශනාව"
            />
          </label>

          <label className="select">
            <span>Speaker (English)</span>
            <input
              list="known-speakers"
              value={speaker}
              onChange={(e) => onSpeakerChange(e.target.value)}
              placeholder="Ven. Mankadawala Sudassana Thero"
            />
            <datalist id="known-speakers">
              {[...knownSpeakers].sort((a, b) => a.localeCompare(b)).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          <label className="select">
            <span>Speaker (Sinhala)</span>
            <input
              lang="si"
              value={speakerSi}
              onChange={(e) => {
                speakerSiTouchedRef.current = true
                setSpeakerSi(e.target.value)
              }}
              placeholder="පූජ්‍ය …"
            />
          </label>

          <SearchSelect
            label="Attendance"
            value={attendance}
            options={attendanceOptions.map((item) => ({ value: item.value, label: item.label }))}
            onChange={(value) => setAttendance(value as Attendance)}
          />

          <div className="add-span">
            <VenueSearchSelect
              valueLabel={venueLabel}
              onChoose={(choice) => setVenueChoice(choice)}
            />
            {attendance === 'livestream' && (
              <p className="field-hint">Optional for livestream — leave blank/Online or pick a place.</p>
            )}
            {venueChoice?.kind === 'custom' && attendance !== 'livestream' && (
              <p className="field-hint">Typed location will show on the site without distance.</p>
            )}
            {venueChoice?.kind === 'place' && (
              <p className="field-hint">
                Google Maps place — shown as entered; distance only if it matches a known venue.
              </p>
            )}
          </div>

          <label className="select">
            <span>Starts</span>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => {
                setStart(e.target.value)
                if (!end) setEnd(defaultEndLocal(e.target.value))
              }}
              required
            />
          </label>

          <label className="select">
            <span>Ends</span>
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>

          {(attendance === 'livestream' || attendance === 'both') && (
            <label className="select add-span">
              <span>Livestream URL</span>
              <input
                type="url"
                value={livestreamUrl}
                onChange={(e) => setLivestreamUrl(e.target.value)}
                placeholder="https://www.youtube.com/..."
                required
              />
            </label>
          )}

          <label className="select add-span">
            <span>Notes (English)</span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional short note"
            />
          </label>

          <label className="select add-span">
            <span>Notes (Sinhala)</span>
            <textarea
              lang="si"
              rows={2}
              value={descriptionSi}
              onChange={(e) => setDescriptionSi(e.target.value)}
              placeholder="විකල්ප සටහන"
            />
          </label>
        </div>

        {message && (
          <p className={`banner${status === 'error' ? ' error' : ''}${status === 'ok' ? ' ok' : ''}`}>
            {message}
          </p>
        )}

        <div className="add-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-action" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Add to calendar'}
          </button>
        </div>
      </form>
    </div>
  )
}
