export type Language = 'Sinhala' | 'English' | 'Tamil' | 'Pali' | 'Mixed'

export type Region =
  | 'Western'
  | 'Central'
  | 'Southern'
  | 'Northern'
  | 'Eastern'
  | 'North Western'
  | 'North Central'
  | 'Uva'
  | 'Sabaragamuwa'

export type Coords = {
  lat: number
  lng: number
}

export type Venue = {
  id: string
  name: string
  nameSi?: string
  city: string
  region: Region
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
  speaker: string
  venueId: string
  start: string
  end?: string
  language: Language
  description?: string
  livestreamUrl?: string
  source: 'google' | 'sample'
}

export type LocatedSermon = Sermon & {
  venue: Venue
  distanceKm?: number
}
