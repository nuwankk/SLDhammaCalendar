import type { YoutubeVideo } from '../types'
import { normalizeSpeaker } from './speakers'

function video(id: string, title: string, channelTitle: string, publishedAt: string): YoutubeVideo {
  return {
    id,
    title,
    channelTitle,
    publishedAt,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${id}`,
  }
}

const koralayagama = [
  video(
    'vLhAI_92JL0',
    'කර්මය ගැන බොහොම අපූරුවට කියා දෙන විශේෂ ධර්ම දේශනාවක් | Ven. Koralayagama Saranathissa Thero',
    'Niwan Pinisamai',
    '2024-09-15T00:00:00Z',
  ),
  video(
    'GzV-BgKm2Lk',
    'සුගත සදහම් දේශනා | Ven. Koralayagama Saranathissa Thero',
    'Siri Sugatha Senesuna',
    '2022-06-25T00:00:00Z',
  ),
]

const pannaloka = [
  video(
    'KD1mmit8s7c',
    'ධර්ම දේශනාව | Ven. Vilachchiye Pannaloka Thero',
    'Dhamma talks',
    '2025-06-09T00:00:00Z',
  ),
  video(
    'I5NnEiYwWXU',
    'ධර්ම දේශනාව | Ven. Vilachchiye Pannaloka Thero',
    'Dhamma talks',
    '2024-09-21T00:00:00Z',
  ),
]

const kashyapa = [
  video(
    'B-ya8d4xwNw',
    'කවදාවත් දාලා යන්නෑ කියන අය එක පාරටම දාල යන හේතුව | Ududumbara Kashyapa Thero',
    'Dharma Deshana',
    '2024-01-01T00:00:00Z',
  ),
  video(
    '5MP8xJfyIyk',
    'සදහම් සවන — ඔබ නිවන් මගට ගෙනයන ධර්මදේශනය | Ven. Ududumbara Kashyapa Thero',
    'Sadaham Sawana',
    '2024-01-01T00:00:00Z',
  ),
  video(
    'G3CoCfoU7_M',
    'දහම් අවබෝධය පැහැදිලි කර ගැනීම | Most Ven. Ududumbara Kashyapa Thero',
    'Dhamma talks',
    '2026-06-29T00:00:00Z',
  ),
]

const ariyananda = [
  video(
    'BQ7TbRvVVRE',
    'බුදු දහම | Agulgamuwe Ariyananda Thero',
    'Na Uyana Aranya',
    '2024-01-01T00:00:00Z',
  ),
  video(
    'Tm0IxURD_Yw',
    'භාවනා වැඩසටහන Part 01 | අඟුල්ගමුවේ අරියනන්ද ස්වාමින්වහන්සේ',
    'Na Uyana Aranya',
    '2024-01-01T00:00:00Z',
  ),
  video(
    '1deuIxG8kDY',
    'Dhamma talk on Meditation | Most Venerable Ariyananda Maha Thero',
    'Dhamma talks',
    '2026-04-06T00:00:00Z',
  ),
]

const byMonk: Record<string, YoutubeVideo[]> = {
  [normalizeSpeaker('Ven. Koralayagama Saranathissa Thero')]: koralayagama,
  [normalizeSpeaker('Ven. Vilachchiye Pannaloka Thero')]: pannaloka,
  [normalizeSpeaker('Ven. Ududumbara Kashyapa Thero')]: kashyapa,
  [normalizeSpeaker('Ven. Ududumbara Kashyapa Thero and Ven. Pelmadulle Vipassi Thero')]: kashyapa,
  [normalizeSpeaker('Ven. Agulugamuwe Ariyananda Thero')]: ariyananda,
}

const fallback = [...koralayagama, ...kashyapa.slice(0, 1), ...ariyananda.slice(0, 1)]

export function sampleVideosFor(monkName: string) {
  return byMonk[normalizeSpeaker(monkName)] ?? fallback
}
