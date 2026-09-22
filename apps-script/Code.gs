/**
 * SL Dhamma Calendar — Add Sermon endpoint
 *
 * Setup:
 * 1. Open https://script.google.com → New project
 * 2. Paste this file as Code.gs
 * 3. Project Settings → Script properties:
 *      PIN          = shared editor PIN
 *      CALENDAR_ID  = the same calendar id as VITE_GOOGLE_CALENDAR_ID
 * 4. Deploy → New deployment → Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 5. Copy the Web App URL into the site as VITE_ADD_SERMON_URL
 */

function doPost(e) {
  try {
    const body = parseBody(e)
    const pin = PropertiesService.getScriptProperties().getProperty('PIN') || ''
    if (!pin || body.pin !== pin) {
      return json({ ok: false, error: 'Wrong PIN.' }, 401)
    }

    if (body.action === 'translate') {
      return json({ ok: true, text: translateToSi(body.text || '') })
    }

    const event = createSermonEvent(body)
    return json({ ok: true, eventId: event.getId() })
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

function doGet() {
  return json({ ok: true, service: 'sldhamma-add-sermon' })
}

function createSermonEvent(body) {
  const calendarId = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID')
  if (!calendarId) throw new Error('CALENDAR_ID is not set in Script properties.')

  const title = String(body.title || '').trim()
  if (!title) throw new Error('Title is required.')

  const speaker = String(body.speaker || '').trim() || 'Guest sermon'
  const start = parseColomboDate(body.start)
  if (!start) throw new Error('Start date/time is required.')
  const end = parseColomboDate(body.end) || new Date(start.getTime() + 90 * 60 * 1000)

  let titleSi = String(body.titleSi || '').trim()
  let speakerSi = String(body.speakerSi || '').trim()
  if (!titleSi) titleSi = translateToSi(title)
  if (!speakerSi) speakerSi = translateToSi(speaker)

  const language = String(body.language || 'Sinhala').trim() || 'Sinhala'
  const attendance = String(body.attendance || 'physical').trim() || 'physical'
  const livestream = String(body.livestreamUrl || '').trim()
  const descriptionEn = String(body.description || '').trim()
  const descriptionSi = String(body.descriptionSi || '').trim()
  const location = String(body.location || '').trim()
  const speakerPhoto = String(body.speakerPhoto || '').trim()

  const lines = [
    'Speaker: ' + speaker,
    'Speaker-SI: ' + speakerSi,
    'Title-SI: ' + titleSi,
    language ? 'Language: ' + language : '',
    attendance ? 'Attendance: ' + attendance : '',
    livestream ? 'Livestream: ' + livestream : '',
    speakerPhoto ? 'Speaker-Photo: ' + speakerPhoto : '',
    descriptionSi ? 'Description-SI: ' + descriptionSi : '',
    descriptionEn,
  ].filter(Boolean)

  const calendar = CalendarApp.getCalendarById(calendarId)
  if (!calendar) throw new Error('Could not open CALENDAR_ID. Share the calendar with this Google account.')

  const summary = titleSi && titleSi !== title ? title + ' / ' + titleSi : title
  return calendar.createEvent(summary, start, end, {
    description: lines.join('\n'),
    location: location || undefined,
  })
}

function translateToSi(text) {
  const value = String(text || '').trim()
  if (!value) return ''
  try {
    return LanguageApp.translate(value, 'en', 'si')
  } catch (error) {
    return value
  }
}

function parseColomboDate(value) {
  if (!value) return null
  const text = String(value).trim()
  // Accept "YYYY-MM-DDTHH:mm" or full ISO; treat bare local as Asia/Colombo.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
    return new Date(text + ':00+05:30')
  }
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing request body.')
  }
  return JSON.parse(e.postData.contents)
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
