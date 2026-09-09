import type { Coords } from '../types'

const EARTH_RADIUS_KM = 6371

function toRad(value: number) {
  return (value * Math.PI) / 180
}

export function distanceKm(from: Coords, to: Coords) {
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(km: number) {
  const value = km < 10 ? km.toFixed(1) : String(Math.round(km))
  return `${value} km`
}

export function formatDistanceSi(km: number) {
  const value = km < 10 ? km.toFixed(1) : String(Math.round(km))
  return `කි.මී. ${value}`
}
