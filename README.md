# SL Dhamma Calendar

A thin public site for upcoming dhamma sermons around Sri Lanka. It can use a public Google Calendar as the source of truth, then filters by language, region, and distance, and sorts by what is nearest to you.

## Run locally

```bash
cd "/Users/nuwank/Source Code/SLDhammaCalendar"
npm install
npm run dev
```

## Connect a public Google Calendar

1. Create a dedicated Gmail and a calendar named **Dhamma Sermons – Sri Lanka**.
2. Set the calendar timezone to **Asia/Colombo** and make the calendar public.
3. Enable the Google Calendar API and create an API key restricted to this site.
4. Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
VITE_GOOGLE_CALENDAR_API_KEY=your-api-key
```

Until those values are set, the site shows sample sermons.

## Listen to talks on YouTube

The **Listen** tab lists named monks from the calendar. **Listen more** searches public YouTube for that monk and opens a chosen video in a new tab. The site does not scrape Gmail or sign visitors into the calendar account.

1. Enable **YouTube Data API v3** on the same Google Cloud project as the calendar.
2. Allow the API key to call YouTube (`https://www.googleapis.com/youtube`) and this site’s HTTP referrer.
3. The calendar API key is reused. Optional override:

```bash
VITE_YOUTUBE_API_KEY=your-youtube-api-key
```

Until a key is set (or if a search fails), Listen shows sample talks.

## Publish

GitHub Pages is not required. Free static hosts all use the same build:

- Build command: `npm ci && npm run build` (or `npm run build`)
- Publish folder: `dist`

**[Render](https://dashboard.render.com/select-repo?type=static)** is a good fit: New → Static Site → this repo. The repo includes a `render.yaml` blueprint, so Render can pick up the build and `dist` folder automatically.

[Netlify](https://app.netlify.com/start) and Cloudflare Pages work the same way if you prefer them.

Put API keys in the host’s environment variables (`VITE_GOOGLE_CALENDAR_ID`, `VITE_GOOGLE_CALENDAR_API_KEY`, optional `VITE_YOUTUBE_API_KEY`), not in git. Vite inlines those at build time, so trigger a new deploy after you add them.

## Event format

Put the temple name or city in the Google Calendar **location** field so the site can match a known venue and measure distance.

Title can be bilingual with a slash: `Evening deshana / සන්ධ්‍යා දේශනාව`.

In the description, use:

```
Speaker: Resident Sangha
Speaker-SI: ආවාසික සංඝයා
Title-SI: සන්ධ්‍යා ධර්ම දේශනාව
Description-SI: විහාර භූමියේ සතිපතා සන්ධ්‍යා දේශනාව.
Language: Sinhala
Livestream: https://...
```

Supported languages: Sinhala, English, Tamil, Pali, Mixed. Each card shows English and Sinhala side by side.
