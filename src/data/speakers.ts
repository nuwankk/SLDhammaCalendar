const photos: Record<string, string> = {}

export function lookupSpeakerPhoto(speaker: string) {
  return photos[normalizeSpeaker(speaker)]
}

export function normalizeSpeaker(speaker: string) {
  return speaker.toLowerCase().replace(/[^a-z0-9\u0d80-\u0dff]+/g, ' ').trim()
}
