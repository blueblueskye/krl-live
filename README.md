# KRL Live

Lightweight live map of KRL Commuter Line Jabodetabek trains. Every train running right now
moves along the track, based on today's official timetable.

- No build step, no npm install. Plain HTML + Leaflet (≈40 KB) + one static `timetable.json`.
- Trains are drawn on a single canvas, so hundreds of them animate smoothly on a phone.
- Tap a train → its stops and times. Tap a station → next departures.
- 1× / 10× / 60× playback, line filters, light/dark mode.

## How it works

```
GitHub Action (daily 02:17 WIB) ──► kci.id/api/krl  (KAI Commuter's public API, no key)
        │                              /stations
        │                              /schedules?stationid=…   every departure from one station
        └─► commits timetable.json ──► Vercel redeploys ──► browser loads one static file
```

`scripts/build-timetable.mjs` fetches each station's departures (slowly; KCI throttles bursts),
groups rows by train number, and writes every train's stop list with times. The browser then
interpolates each train's position between stops (30 s dwell, smooth accel/brake) and routes it
along the track graph in `network.js`. No server code runs when people open the app.

**Positions are timetable-based, not GPS.** KAI Commuter doesn't publish live train
positions, so a delayed train will still be drawn on schedule.

## Deploy to Vercel

Option A (no terminal):
1. Create a GitHub repo and upload these files (keep the `api/` folder).
2. vercel.com → Add New → Project → import the repo → Deploy. No settings to change.

Option B (CLI):
```bash
npx vercel        # preview
npx vercel --prod # production
```

The timetable is built by the **Update timetable** workflow (GitHub → Actions tab). It runs daily,
on every change to `network.js`/`scripts/`, and from the "Run workflow" button.

Local: `node scripts/build-timetable.mjs`, then serve the folder with any static server.

## Files

| File | What it is |
|---|---|
| `index.html` | Page + styles |
| `app.js` | Map, animation, panels |
| `network.js` | Station coordinates and line order (shared with the API) |
| `scripts/build-timetable.mjs` | Builds `timetable.json` from KCI |
| `.github/workflows/timetable.yml` | Runs the builder daily and commits the result |
| `vercel.json` | Cache headers |

## Tweaking

- **Station position off?** Edit its `p: [lat, lng]` in `network.js`. Coordinates are approximate.
- **Station not matched?** Add the API's spelling to its `a: [...]` list (lowercase, letters only).
- **Different API base:** set `KCI_BASE_URL` for the workflow (default `https://kci.id/api/krl`).
- Dwell time / show-before-departure: constants at the top of `app.js`.

Map © OpenStreetMap contributors. Schedule data: KAI Commuter (kci.id).
