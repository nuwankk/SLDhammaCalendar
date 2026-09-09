import type { Attendance } from '../types'

export function inferAttendance(sermon: {
  attendance?: Attendance
  livestreamUrl?: string
  venueId?: string
}): Attendance {
  if (sermon.attendance) return sermon.attendance
  if (sermon.livestreamUrl && sermon.venueId) return 'both'
  if (sermon.livestreamUrl) return 'livestream'
  return 'physical'
}

export function parseAttendanceField(value: string | undefined): Attendance | undefined {
  if (!value) return undefined
  const text = value.toLowerCase()
  if (/(both|hybrid|physical.*live|in.?person.*live|live.*physical)/.test(text)) return 'both'
  if (/(live|online|virtual|zoom|youtube|remote)/.test(text)) return 'livestream'
  if (/(physical|in.?person|temple|venue|on.?site)/.test(text)) return 'physical'
  return undefined
}

export function isRemoteLocation(location: string) {
  const text = location.trim().toLowerCase()
  if (!text) return false
  return /^(online|livestream|live stream|virtual|remote|zoom|youtube)$/.test(text)
}

export function isInPerson(attendance: Attendance) {
  return attendance === 'physical' || attendance === 'both'
}

export function isLivestream(attendance: Attendance) {
  return attendance === 'livestream' || attendance === 'both'
}
