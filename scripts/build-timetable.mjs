// Builds timetable.json: every KRL Jabodetabek train's stops and times, plus station coordinates.
//
// Source: Commute by Shiori Labs — public API https://api.commute.shiorilabs.id
// Timetable data © Shiori Labs, ODbL 1.0 (station geometry © OpenStreetMap contributors, ODbL).
// So timetable.json is also released under ODbL 1.0, with that attribution.
//
// Run daily by .github/workflows/timetable.yml; also works locally: node scripts/build-timetable.mjs

import fs from "node:fs";
import { STATIONS, matchStation } from "../network.js";

const BASE = (process.env.COMMUTE_API || "https://api.commute.shiorilabs.id").replace(/\/$/, "");
const OUT = new URL("../timetable.json", import.meta.url);
const DAY = 86400;
const LINES = new Set(["B", "C", "R", "T", "TP"]); // A = airport rail link, not drawn
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const secs = (hms) => {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(hms || "");
  return m ? +m[1] * 3600 + +m[2] * 60 + +(m[3] || 0) : null;
};

async function get(path, tries = 4) {
  for (let i = 1; ; i++) {
    let res, err;
    try {
      res = await fetch(`${BASE}${path}`, {
        headers: { accept: "application/json", "user-agent": "krl-live (github.com/blueblueskye/krl-live)" },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return (await res.json()).data;
      err = `HTTP ${res.status}`;
    } catch (e) {
      err = `${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ""}`;
    }
    if (i >= tries) throw new Error(`${path}: ${err}`);
    const ra = parseInt(res?.headers.get("retry-after"), 10);
    await sleep(Number.isFinite(ra) ? ra * 1000 : 2000 * i);
  }
}

// 1. Stations (with real coordinates)
const all = await get("/stations/KCI");
const codeToKey = {}, coords = {};
for (const s of all) {
  if (s.regionCode && s.regionCode !== "CGK") continue;
  const k = matchStation(s.code, s.name) || matchStation(s.code, s.officialName);
  if (!k || Object.values(codeToKey).includes(k)) continue;
  codeToKey[s.code] = k;
  if (typeof s.latitude === "number" && typeof s.longitude === "number") coords[k] = [+s.latitude.toFixed(5), +s.longitude.toFixed(5)];
}
const nameToKey = {};
for (const s of all) if (codeToKey[s.code]) nameToKey[s.name.toLowerCase()] = codeToKey[s.code];
const codes = Object.keys(codeToKey);
const unmatched = Object.keys(STATIONS).filter((k) => !Object.values(codeToKey).includes(k));
console.log(`${codes.length} stations matched, ${Object.keys(coords).length} with coordinates` +
  (unmatched.length ? `; not found: ${unmatched.join(", ")}` : ""));

// 2. Every station's timetable, stitched into trips
const trips = new Map(); // `${trip}|${dayMask}` -> {...}
let ok = 0;
const failed = [];
for (const code of codes) {
  const key = codeToKey[code];
  try {
    const rows = await get(`/stations/KCI/${encodeURIComponent(code)}/timetable`);
    for (const r of rows || []) {
      if (!LINES.has(r.lineCode) || !r.tripNumber) continue;
      const t = secs(r.estimatedDeparture);
      if (t == null) continue;
      const mask = r.dayMask ?? 7;
      const id = `${r.tripNumber}|${mask}`;
      let tr = trips.get(id);
      if (!tr) {
        tr = { trip: r.tripNumber, line: r.lineCode, mask, boundFor: r.boundFor || "",
          dest: nameToKey[String(r.boundFor || "").toLowerCase()] || null, arr: secs(r.estimatedArrival), stops: new Map() };
        trips.set(id, tr);
      }
      tr.stops.set(key, t);
    }
    ok++;
    console.log(`ok   ${code.padEnd(5)} ${(rows || []).length} departures`);
  } catch (e) {
    failed.push(code);
    console.warn(`FAIL ${e.message}`);
  }
  await sleep(250); // ~4 req/s, well under the API's limit
}

if (ok < codes.length * 0.8) {
  console.error(`Only ${ok}/${codes.length} stations fetched; keeping the previous timetable.json.`);
  process.exit(1);
}

// 3. Order stops, handle midnight, add the terminus
const out = [];
for (const t of trips.values()) {
  let stops = [...t.stops].sort((a, b) => a[1] - b[1]);
  if (stops.length > 1) { // trips over midnight: rotate at the largest time gap
    let gapAt = 0, gap = -1;
    for (let i = 0; i < stops.length; i++) {
      const a = stops[i][1], b = i + 1 < stops.length ? stops[i + 1][1] : stops[0][1] + DAY;
      if (b - a > gap) { gap = b - a; gapAt = (i + 1) % stops.length; }
    }
    stops = stops.slice(gapAt).concat(stops.slice(0, gapAt).map(([k, s]) => [k, s + DAY]));
  }
  const last = stops[stops.length - 1];
  if (t.dest && last && last[0] !== t.dest && t.arr != null) {
    let a = t.arr;
    while (a < last[1]) a += DAY;
    if (a - last[1] < 3 * 3600) stops.push([t.dest, a]);
  }
  if (stops.length < 2) continue;
  out.push([t.trip, t.line, t.mask, t.boundFor, stops.flat()]);
}
out.sort((a, b) => a[4][1] - b[4][1]);

fs.writeFileSync(OUT, JSON.stringify({
  generated: new Date().toISOString(),
  source: "Commute by Shiori Labs (api.commute.shiorilabs.id)",
  license: "ODbL 1.0 — © Shiori Labs; station geometry © OpenStreetMap contributors",
  format: "trains: [trip, lineCode, dayMask (4=Mon-Fri, 2=Sat, 1=Sun), boundFor, [station, secondsAfterMidnight, ...]]",
  stationsOk: ok, failedStations: failed, unmatched, coords, trains: out,
}));
console.log(`Wrote ${out.length} trips (${ok}/${codes.length} stations ok).`);
