export type AddSermonPayload = {
  pin: string
  title: string
  titleSi: string
  speaker: string
  speakerSi: string
  location: string
  start: string
  end: string
  language: string
  attendance: 'physical' | 'livestream' | 'both'
  livestreamUrl: string
  description: string
  descriptionSi: string
  speakerPhoto: string
}

export type AddSermonResult = {
  ok: boolean
  error?: string
  eventId?: string
}

const endpoint = import.meta.env.VITE_ADD_SERMON_URL ?? ''

export function hasAddSermonEndpoint() {
  return Boolean(endpoint)
}

export async function submitSermon(payload: AddSermonPayload): Promise<AddSermonResult> {
  if (!endpoint) {
    return { ok: false, error: 'Add-sermon endpoint is not configured.' }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    // text/plain avoids a CORS preflight against Apps Script Web Apps
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  })

  const text = await response.text()
  try {
    return JSON.parse(text) as AddSermonResult
  } catch {
    return {
      ok: false,
      error: response.ok ? 'Unexpected response from Apps Script.' : `Request failed (${response.status}).`,
    }
  }
}

export async function translateWithAppsScript(pin: string, text: string): Promise<string> {
  if (!endpoint || !pin || !text.trim()) return ''
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'translate', pin, text }),
    redirect: 'follow',
  })
  const raw = await response.text()
  try {
    const payload = JSON.parse(raw) as { ok?: boolean; text?: string }
    return payload.ok && payload.text ? payload.text : ''
  } catch {
    return ''
  }
}
