export type PlaceSuggestion = {
  id: string
  label: string
  secondary?: string
}

const apiKey =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || ''

type PlacesAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string
      text?: { text?: string }
      structuredFormat?: {
        mainText?: { text?: string }
        secondaryText?: { text?: string }
      }
    }
  }>
  error?: { message?: string }
}

export function hasPlacesKey() {
  return Boolean(apiKey)
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const input = query.trim()
  if (!apiKey || input.length < 2) return []

  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ['lk'],
      languageCode: 'en',
    }),
  })

  const payload = (await response.json()) as PlacesAutocompleteResponse
  if (!response.ok) return []

  return (payload.suggestions ?? []).flatMap((item, index) => {
    const prediction = item.placePrediction
    if (!prediction) return []
    const main =
      prediction.structuredFormat?.mainText?.text ||
      prediction.text?.text ||
      ''
    if (!main) return []
    const secondary = prediction.structuredFormat?.secondaryText?.text
    return [
      {
        id: prediction.placeId || `place-${index}`,
        label: secondary ? `${main}, ${secondary}` : main,
        secondary,
      },
    ]
  })
}
