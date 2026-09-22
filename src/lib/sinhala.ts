import { normalizeSpeaker } from '../data/speakers'
import { featuredMonks } from '../lib/monks'
import { speakerNameSi } from '../lib/labels'

const speakerSiByName: Record<string, string> = {
  [normalizeSpeaker('Resident Sangha')]: 'ආවාසික සංඝයා',
  [normalizeSpeaker('Guest sermon')]: 'ආගන්තුක දේශනාව',
  [normalizeSpeaker('Ven. Koralayagama Saranathissa Thero')]:
    'පූජ්‍ය කෝරලයාගම සරනතිස්ස ස්වාමින් වහන්සේ',
  [normalizeSpeaker('Ven. Vilachchiye Pannaloka Thero')]: 'විලච්චියේ පඤ්ඤාලෝක හිමි',
  [normalizeSpeaker('Ven. Ududumbara Kashyapa Thero')]:
    'පූජ්‍යපාද උඩුදුම්බර කාශ්‍යප ස්වාමීන් වහන්සේ',
  [normalizeSpeaker('Ven. Agulugamuwe Ariyananda Thero')]:
    'පූජ්‍යපාද අගුල්ගමුවේ අරියනන්ද ස්වාමින් වහන්සේ',
  [normalizeSpeaker('Ven. Mankadawala Sudassana Thero')]:
    'පූජ්‍ය මංකඩවල සුදස්සන ස්වාමින් වහන්සේ',
  [normalizeSpeaker('Ven. Kotiyagala Seevali Thero')]:
    'පූජ්‍යපාද කොටියාගල සීවලී ස්වාමින් වහන්සේ',
  [normalizeSpeaker('Ven. Pelmadulle Vipassi Thero')]:
    'පූජ්‍ය පැල්මඩුල්ලේ විපස්සී ස්වාමීන් වහන්සේ',
}

for (const monk of featuredMonks) {
  speakerSiByName[monk.id] = monk.nameSi
}

const titlePhrases: Array<[RegExp, string]> = [
  [/\bdhamma sermon\b/gi, 'ධර්ම දේශනාව'],
  [/\bevening deshana\b/gi, 'සන්ධ්‍යා දේශනාව'],
  [/\bevening dhamma deshana\b/gi, 'සන්ධ්‍යා ධර්ම දේශනාව'],
  [/\bpoya day sermon\b/gi, 'පෝය දින දේශනාව'],
  [/\bmeditation program\b/gi, 'භාවනා වැඩසටහන'],
  [/\bsunday meditation program\b/gi, 'ඉරිදා භාවනා වැඩසටහන'],
  [/\bvassana deshana\b/gi, 'වස්සාන දේශනාව'],
  [/\bdhamma talk\b/gi, 'ධර්ම දේශනාව'],
  [/\bdhamma discussion\b/gi, 'ධර්ම සාකච්ඡාව'],
]

export const knownSpeakers = [
  'Resident Sangha',
  'Ven. Mankadawala Sudassana Thero',
  'Ven. Koralayagama Saranathissa Thero',
  'Ven. Vilachchiye Pannaloka Thero',
  'Ven. Ududumbara Kashyapa Thero',
  'Ven. Agulugamuwe Ariyananda Thero',
  'Ven. Kotiyagala Seevali Thero',
  ...featuredMonks.map((monk) => monk.name),
].filter((name, index, list) => list.indexOf(name) === index)

export function suggestSpeakerSi(speaker: string) {
  const exact = speakerSiByName[normalizeSpeaker(speaker)]
  if (exact) return exact
  const fallback = speakerNameSi(speaker)
  return fallback !== speaker ? fallback : ''
}

export function suggestTitleSi(title: string) {
  const value = title.trim()
  if (!value) return ''
  if (/[\u0D80-\u0DFF]/.test(value)) return value

  let out = value
  let changed = false
  for (const [pattern, replacement] of titlePhrases) {
    const next = out.replace(pattern, replacement)
    if (next !== out) {
      out = next
      changed = true
    }
  }
  return changed ? out.replace(/\s{2,}/g, ' ').trim() : ''
}
