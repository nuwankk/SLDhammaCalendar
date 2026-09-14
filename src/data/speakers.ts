export function normalizeSpeaker(speaker: string) {
  return speaker.toLowerCase().replace(/[^a-z0-9\u0d80-\u0dff]+/g, ' ').trim()
}

const photos: Record<string, string> = {
  [normalizeSpeaker('Ven. Mankadawala Sudassana Thero')]:
    'https://ictbusa.com/wp-content/uploads/2023/03/leader-sudassana.png',
}

export function lookupSpeakerPhoto(speaker: string) {
  return photos[normalizeSpeaker(speaker)]
}
