export type Language = 'Sinhala' | 'English' | 'Tamil' | 'Pali' | 'Mixed'

export type Attendance = 'physical' | 'livestream' | 'both'

export type District =
  | 'Ampara'
  | 'Anuradhapura'
  | 'Badulla'
  | 'Batticaloa'
  | 'Colombo'
  | 'Galle'
  | 'Gampaha'
  | 'Hambantota'
  | 'Jaffna'
  | 'Kalutara'
  | 'Kandy'
  | 'Kegalle'
  | 'Kilinochchi'
  | 'Kurunegala'
  | 'Mannar'
  | 'Matale'
  | 'Matara'
  | 'Monaragala'
  | 'Mullaitivu'
  | 'Nuwara Eliya'
  | 'Polonnaruwa'
  | 'Puttalam'
  | 'Ratnapura'
  | 'Trincomalee'
  | 'Vavuniya'

export const districts: District[] = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Monaragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya',
]

export type Coords = {
  lat: number
  lng: number
}

export type Venue = {
  id: string
  name: string
  nameSi?: string
  aliases?: string[]
  city: string
  district: District
  lat: number
  lng: number
}

export type City = {
  id: string
  name: string
  nameSi: string
  lat: number
  lng: number
}

export type Sermon = {
  id: string
  title: string
  titleSi: string
  speaker: string
  speakerSi: string
  venueId?: string
  start: string
  end?: string
  language: Language
  attendance?: Attendance
  description?: string
  descriptionSi?: string
  livestreamUrl?: string
  location?: string
  speakerPhotos?: string[]
  source: 'google' | 'sample'
}

export type LocatedSermon = Sermon & {
  venue?: Venue
  attendance: Attendance
  distanceKm?: number
}

export type Monk = {
  id: string
  name: string
  nameSi: string
  photos: string[]
}

export type YoutubeVideo = {
  id: string
  title: string
  channelTitle: string
  publishedAt: string
  thumbnailUrl: string
  url: string
}
