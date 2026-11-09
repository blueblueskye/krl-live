# KRL Live

Lightweight live map of KRL Commuter Line Jabodetabek trains. Every train running right now
moves along the track, based on today's official timetable.

- No build step, no npm install. Plain HTML + Leaflet (≈40 KB) + one Vercel function.
- Trains are drawn on a single canvas, so hundreds of them animate smoothly on a phone.
- Tap a train → its stops and times. Tap a station → next departures.
- 1× / 10× / 60× playback, line filters, light/dark mode.

## How it works

```
browser ──► /api/trains (Vercel function, CDN-cached 1 h)
                 └─► Comuline API  (public mirror of KAI Commuter's daily schedule)
                       /v1/station          all stations
                       /v1/schedule/{id}    every departure from one station
```

The function fetches every station's departures, groups rows by `train_id`, and returns each
train's full stop list with times. The browser interpolates each train's position between
stops (30 s dwell, smooth accel/brake) and routes it along the track graph in `network.js`.

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

After deploying, open `https://<your-app>.vercel.app/api/trains` once. You should see JSON with
a long `trains` array. `unmatched` lists any station in `network.js` the API didn't recognise.

Local dev: `npx vercel dev`, then open http://localhost:3000.

## Files

| File | What it is |
|---|---|
| `index.html` | Page + styles |
| `app.js` | Map, animation, panels |
| `network.js` | Station coordinates and line order (shared with the API) |
| `api/trains.js` | Builds today's timetable from Comuline |
| `vercel.json` | Function timeout, cache headers |

## Tweaking

- **Station position off?** Edit its `p: [lat, lng]` in `network.js`. Coordinates are approximate.
- **Station not matched?** Add the API's spelling to its `a: [...]` list (lowercase, letters only).
- **Different data source:** set env var `COMULINE_BASE` in Vercel (default `https://www.api.comuline.com/v1`).
- Dwell time / show-before-departure: constants at the top of `app.js`.

Map © OpenStreetMap contributors © CARTO. Schedule data via Comuline (comuline.com).
