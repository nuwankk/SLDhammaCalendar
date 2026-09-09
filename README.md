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

## Event format

Put the temple name or city in the Google Calendar **location** field so the site can match a known venue and measure distance.

In the description, use:

```
Speaker: Resident Sangha
Language: Sinhala
Livestream: https://...
```

Supported languages: Sinhala, English, Tamil, Pali, Mixed.
