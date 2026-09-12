import { lookupSpeakerPhoto, normalizeSpeaker } from '../data/speakers'
import type { Monk, Sermon } from '../types'

function isGenericSpeaker(speaker: string) {
  const name = normalizeSpeaker(speaker)
  if (!name) return true
  if (name === 'guest sermon') return true
  return name === 'resident sangha' || name.startsWith('resident sangha ')
}

export function listMonks(sermons: Sermon[]): Monk[] {
  const byId = new Map<string, Monk>()
  for (const sermon of sermons) {
    if (isGenericSpeaker(sermon.speaker)) continue
    const id = normalizeSpeaker(sermon.speaker)
    const existing = byId.get(id)
    const fallback = lookupSpeakerPhoto(sermon.speaker)
    const photos = [...(existing?.photos ?? [])]
    for (const src of sermon.speakerPhotos ?? []) {
      if (!photos.includes(src)) photos.push(src)
    }
    if (fallback && !photos.includes(fallback)) photos.push(fallback)
    byId.set(id, {
      id,
      name: existing?.name || sermon.speaker,
      nameSi: existing?.nameSi && existing.nameSi !== existing.name ? existing.nameSi : sermon.speakerSi || sermon.speaker,
      photos,
    })
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}
