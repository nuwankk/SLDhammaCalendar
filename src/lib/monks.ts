import { lookupSpeakerPhoto, normalizeSpeaker } from '../data/speakers'
import type { Monk, Sermon } from '../types'

const sudassanaPhoto =
  lookupSpeakerPhoto('Ven. Mankadawala Sudassana Thero') ??
  'https://ictbusa.com/wp-content/uploads/2023/03/leader-sudassana.png'

/** Monks always shown in Listen, even if they have no upcoming calendar sermon. */
export const featuredMonks: Monk[] = [
  {
    id: normalizeSpeaker('Ven. Mankadawala Sudassana Thero'),
    name: 'Ven. Mankadawala Sudassana Thero',
    nameSi: 'පූජ්‍ය මංකඩවල සුදස්සන ස්වාමින් වහන්සේ',
    photos: [sudassanaPhoto],
  },
]

function isGenericSpeaker(speaker: string) {
  const name = normalizeSpeaker(speaker)
  if (!name) return true
  if (name === 'guest sermon') return true
  return name === 'resident sangha' || name.startsWith('resident sangha ')
}

export function listMonks(sermons: Sermon[]): Monk[] {
  const byId = new Map<string, Monk>()

  for (const featured of featuredMonks) {
    byId.set(featured.id, {
      ...featured,
      photos: [...featured.photos],
    })
  }

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
      nameSi:
        existing?.nameSi && existing.nameSi !== existing.name
          ? existing.nameSi
          : sermon.speakerSi || sermon.speaker,
      photos,
    })
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}
