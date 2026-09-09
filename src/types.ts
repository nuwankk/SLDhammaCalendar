export type Language = 'Sinhala' | 'English' | 'Tamil' | 'Pali' | 'Mixed'

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
  venueId: string
  start: string
  end?: string
  language: Language
  description?: string
  descriptionSi?: string
  livestreamUrl?: string
  source: 'google' | 'sample'
}

export type LocatedSermon = Sermon & {
  venue: Venue
  distanceKm?: number
}
