// Builds timetable.json: every KRL Jabodetabek train's stops and times for the day.
// Source: KAI Commuter's public API (https://kci.id/api/krl), no key needed.
// KCI throttles bursts, so requests go out slowly and honour Retry-After.
// Run by .github/workflows/timetable.yml once a day; also works locally: node scripts/build-timetable.mjs

import fs from "node:fs";
import { STATIONS, matchStation, norm } from "../network.js";

const BASE = (process.env.KCI_BASE_URL || "https://kci.id/api/krl").replace(/\/$/, "");
const OUT = new URL("../timetable.json", import.meta.url);
const DAY = 86400;
const SKIP = /dinas|merak|yogya|prameks|walahar|jatiluhur|bandara/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const secs = (hms) => {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(hms || "");
  return m ? +m[1] * 3600 + +m[2] * 60 + +(m[3] || 0) : null;
};

async function get(path, tries = 6) {
  let wait = 3000;
  for (let i = 1; ; i++) {
    let res, err;
    try {
      res = await fetch(`${BASE}/${path}`, {
        headers: { accept: "application/json", "user-agent": "krl-live timetable builder" },
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) return await res.json();
      err = `HTTP ${res.status}`;
    } catch (e) {
      err = `${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ""}`;
    }
    if (i >= tries) throw new Error(`${path}: ${err}`);
    const ra = parseInt(res?.headers.get("retry-after"), 10);
    const delay = Math.max(wait, Number.isFinite(ra) ? ra * 1000 : 0);
    console.warn(`  ${path}: ${err}, retry ${i}/${tries - 1} in ${(delay / 1000).toFixed(0)}s`);
    await sleep(delay);
    wait = Math.min(wait * 2, 60000);
  }
}

const st = await get("stations");
const rows = (st.data || []).filter((r) => r.fg_enable === 1);
const idToKey = {}, nameToKey = {};
for (const r of rows) {
  const k = matchStation(r.sta_id, r.sta_name);
  if (k && !Object.values(idToKey).includes(k)) idToKey[r.sta_id] = k;
}
for (const [k, s] of Object.entries(STATIONS)) {
  nameToKey[norm(s.n)] = k;
  for (const a of s.a || []) nameToKey[a] = k;
}
const ids = Object.keys(idToKey);
const unmatched = Object.keys(STATIONS).filter((k) => !Object.values(idToKey).includes(k));
console.log(`${ids.length} stations matched${unmatched.length ? `, not found in KCI list: ${unmatched.join(", ")}` : ""}`);

const trains = new Map();
let ok = 0;
const failed = [];
for (const id of ids) {
  const key = idToKey[id];
  try {
    const q = new URLSearchParams({ stationid: id, timefrom: "00:00", timeto: "23:59" });
    const res = await get(`schedules?${q}`);
    for (const r of res.data || []) {
      const t = secs(r.time_est);
      if (t == null || !r.train_id) continue;
      if (SKIP.test(r.ka_name || "")) continue;      // non-passenger runs, lines outside the map
      let tr = trains.get(r.train_id);
      if (!tr) {
        const destName = norm(String(r.dest || "").replace(/\s+via\s+.*$/i, ""));
        tr = { line: r.ka_name || "", color: r.color || null, route: r.route_name || "",
          dest: nameToKey[destName] || null, arr: secs(r.dest_time), stops: new Map() };
        trains.set(r.train_id, tr);
      }
      tr.stops.set(key, t);
    }
    ok++;
    console.log(`ok   ${id.padEnd(5)} ${(res.data || []).length} departures`);
  } catch (e) {
    failed.push(id);
    console.warn(`FAIL ${e.message}`);
  }
  await sleep(1200); // be gentle
}

if (ok < ids.length * 0.8) {
  console.error(`Only ${ok}/${ids.length} stations fetched; keeping the previous timetable.json.`);
  process.exit(1);
}

const out = [];
for (const [id, t] of trains) {
  let stops = [...t.stops].sort((a, b) => a[1] - b[1]);
  // Trains crossing midnight: rotate at the biggest time gap, push the tail past 24:00.
  if (stops.length > 1) {
    let gapAt = 0, gap = -1;
    for (let i = 0; i < stops.length; i++) {
      const a = stops[i][1], b = i + 1 < stops.length ? stops[i + 1][1] : stops[0][1] + DAY;
      if (b - a > gap) { gap = b - a; gapAt = (i + 1) % stops.length; }
    }
    stops = stops.slice(gapAt).concat(stops.slice(0, gapAt).map(([k, s]) => [k, s + DAY]));
  }
  // The terminus has no departure row; add it from dest_time.
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

fs.writeFileSync(OUT, JSON.stringify({
  generated: new Date().toISOString(), source: BASE,
  stations: ok, failedStations: failed, unmatched, trains: out,
}));
console.log(`Wrote ${out.length} trains (${ok}/${ids.length} stations ok).`);
