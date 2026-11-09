# KRL Live

Lightweight live map of KRL Commuter Line Jabodetabek trains. Every train running right now
moves along the track, based on today's official timetable.

- No build step, no npm install. Plain HTML + Leaflet (≈40 KB) + one static `timetable.json`.
- Trains are drawn on a single canvas, so hundreds of them animate smoothly on a phone.
- Tap a train → its stops and times. Tap a station → next departures.
- 1× / 10× / 60× playback, line filters, light/dark mode.

## How it works

```
GitHub Action (daily 02:17 WIB) ──► api.commute.shiorilabs.id   (Commute by Shiori Labs, open data)
        │                              /stations/KCI                   stations + coordinates
        │                              /stations/KCI/{code}/timetable  every departure from one station
        └─► commits timetable.json ──► Vercel redeploys ──► browser loads one static file
```

`scripts/build-timetable.mjs` fetches each station's departures, groups them by train number and
day type (weekday / Saturday / Sunday), and writes every train's stop list with times plus real
station coordinates. The browser interpolates each train between stops (30 s dwell, smooth
accel/brake) along the track graph in `network.js`. No server code runs when people open the app.

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
| `scripts/build-timetable.mjs` | Builds `timetable.json` from the Commute API |
| `.github/workflows/timetable.yml` | Runs the builder daily and commits the result |
| `vercel.json` | Cache headers |

## Tweaking

- **Station positions** come from the Commute API; `network.js` only holds fallbacks and the line order.
- **Station not matched?** Add the API's spelling to its `a: [...]` list (lowercase, letters only).
- **Different API base:** set `COMMUTE_API` for the workflow (default `https://api.commute.shiorilabs.id`).
- Dwell time / show-before-departure: constants at the top of `app.js`.

Map © OpenStreetMap contributors. ## Data credits & license

Timetable and station data: [Commute](https://commute.shiorilabs.id) by Shiori Labs, licensed
[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) (station geometry © OpenStreetMap
contributors). `timetable.json` is a derived database and is likewise released under ODbL 1.0.
