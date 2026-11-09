// GET /api/trains
// Builds today's full KRL timetable (every train's stops + times) from the
// Comuline public API, which mirrors KAI Commuter's daily schedule.
// The CDN caches the result, so Comuline is hit at most about once an hour.

import { STATIONS, matchStation } from "../network.js";

const BASE = (process.env.COMULINE_BASE || "https://www.api.comuline.com/v1").replace(/\/$/, "");
const DAY = 86400;

// ISO timestamp -> seconds after midnight in Jakarta time (UTC+7, no DST).
const wibSecs = (iso) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (((Math.floor(t / 1000) + 7 * 3600) % DAY) + DAY) % DAY;
};

async function getJSON(url, tries = 2) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { accept: "application/json", "user-agent": "krl-live (vercel)" } });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (i + 1 >= tries) throw e;
    }
  }
}

// Run async jobs with limited parallelism.
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]).catch((e) => ({ error: String(e) })); }
  }));
  return out;
}

export async function buildTimetable() {
  const st = await getJSON(`${BASE}/station`);
  const apiStations = (st.data || []).filter((s) => !s.type || s.type === "KRL");

  // API id -> our key
  const idToKey = {};
  for (const s of apiStations) {
    const k = matchStation(s.id, s.name);
    if (k && !Object.values(idToKey).includes(k)) idToKey[s.id] = k;
  }
  const missing = Object.keys(STATIONS).filter((k) => !Object.values(idToKey).includes(k));

  const ids = Object.keys(idToKey);
  const results = await pool(ids, 8, (id) => getJSON(`${BASE}/schedule/${encodeURIComponent(id)}`));

  const trains = new Map(); // train_id -> { line, color, route, dest, arr, stops: Map(key -> secs) }
  let failed = 0;
  results.forEach((res, i) => {
    if (!res || res.error) { failed++; return; }
    const key = idToKey[ids[i]];
    for (const row of res.data || []) {
      const secs = wibSecs(row.departs_at);
      if (secs == null || !row.train_id) continue;
      let t = trains.get(row.train_id);
      if (!t) {
        t = {
          line: row.line || "",
          color: row.metadata?.origin?.color || null,
          route: row.route || "",
          dest: idToKey[row.station_destination_id] || null,
          arr: wibSecs(row.arrives_at),
          stops: new Map(),
        };
        trains.set(row.train_id, t);
      }
      t.stops.set(key, secs);
    }
  });

  const out = [];
  for (const [id, t] of trains) {
    let stops = [...t.stops].sort((a, b) => a[1] - b[1]);
    // Trains running past midnight: times after a big backward jump belong to the next day.
    // Sorting by raw seconds puts 00:xx first, so rotate at the largest gap.
    if (stops.length > 1) {
      let gapAt = 0, gap = -1;
      for (let i = 0; i < stops.length; i++) {
        const a = stops[i][1], b = i + 1 < stops.length ? stops[i + 1][1] : stops[0][1] + DAY;
        if (b - a > gap) { gap = b - a; gapAt = (i + 1) % stops.length; }
      }
      stops = stops.slice(gapAt).concat(stops.slice(0, gapAt).map(([k, s]) => [k, s + DAY]));
    }
    // Final destination usually has no departure row; add its arrival time.
    const last = stops[stops.length - 1];
    if (t.dest && last && last[0] !== t.dest && t.arr != null) {
      let a = t.arr;
      while (a < last[1]) a += DAY;
      if (a - last[1] < 3 * 3600) stops.push([t.dest, a]);
    }
    if (stops.length < 2) continue;
    out.push([id, t.line, t.color, t.route, stops.flat()]);
  }
  out.sort((a, b) => a[4][1] - b[4][1]);

  return {
    generated: new Date().toISOString(),
    source: BASE,
    stations: ids.length,
    failedStations: failed,
    unmatched: missing,
    trains: out, // [id, line, color, route, [key, secs, key, secs, ...]]
  };
}

export default async function handler(req, res) {
  try {
    const data = await buildTimetable();
    if (!data.trains.length) throw new Error("Schedule source returned no trains");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=43200");
    res.status(200).json(data);
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: String(e?.message || e) });
  }
}
