import { STATIONS, LINES } from "./network.js";

const DAY = 86400;
const DWELL = 30;          // seconds a train waits at intermediate stations
const PRE_DEPART = 120;    // show trains this long before they leave the origin
const POST_ARRIVE = 60;    // keep them this long after reaching the end

const GROUPS = [
  { id: "bogor", name: "Bogor", color: "#E30A16", re: /bogor|nambo/i },
  { id: "cikarang", name: "Cikarang", color: "#0084D8", re: /cikarang|loop|bekasi/i },
  { id: "rangkas", name: "Rangkasbitung", color: "#16812B", re: /rangkas|serpong|parung|maja/i },
  { id: "tangerang", name: "Tangerang", color: "#623814", re: /tangerang/i },
  { id: "priok", name: "Tanjung Priok", color: "#DD0067", re: /pri[ou]k/i },
  { id: "other", name: "Lainnya", color: "#7a7f8a", re: /.*/ },
];

const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const hhmm = (s) => { s = ((Math.floor(s) % DAY) + DAY) % DAY; return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}`; };
const hhmmss = (s) => `${hhmm(s)}:${pad(Math.floor(s) % 60)}`;
const title = (s) => String(s || "").toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ease = (f) => (f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2);

// ---------- time (Jakarta = UTC+7, no DST) ----------
const realWib = () => ((Date.now() / 1000 + 7 * 3600) % DAY);
const clock = { base: realWib(), t0: performance.now(), speed: 1 };
const simNow = () => (clock.base + ((performance.now() - clock.t0) / 1000) * clock.speed) % DAY;
function setSpeed(s) {
  if (s === "now") { clock.base = realWib(); clock.speed = 1; }
  else { clock.base = simNow(); clock.speed = s; }
  clock.t0 = performance.now();
  document.querySelectorAll(".speed button").forEach((b) => b.classList.toggle("on", String(clock.speed) === b.dataset.s && b.dataset.s !== "now"));
}

// ---------- network graph ----------
const adj = {};
for (const l of LINES) for (let i = 1; i < l.seq.length; i++) {
  const a = l.seq[i - 1], b = l.seq[i];
  (adj[a] ||= new Set()).add(b); (adj[b] ||= new Set()).add(a);
}
const COS = Math.cos((-6.25 * Math.PI) / 180);
const dist = (p, q) => Math.hypot(p[0] - q[0], (p[1] - q[1]) * COS);

const pathCache = new Map();
function trackPath(a, b) {               // geometry following the track between two stations
  const k = a + "|" + b;
  if (pathCache.has(k)) return pathCache.get(k);
  let keys = [a, b];
  if (adj[a] && adj[b]) {                 // BFS for the fewest-hop route
    const prev = { [a]: null }, q = [a];
    while (q.length) {
      const u = q.shift(); if (u === b) break;
      for (const v of adj[u] || []) if (!(v in prev)) { prev[v] = u; q.push(v); }
    }
    if (b in prev) { keys = []; for (let u = b; u; u = prev[u]) keys.unshift(u); }
  }
  const pts = keys.map((x) => STATIONS[x].p), cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  const g = { pts, cum, len: cum[cum.length - 1] || 1e-9 };
  pathCache.set(k, g);
  return g;
}
function along(g, f) {
  const d = Math.max(0, Math.min(1, f)) * g.len;
  let i = 1; while (i < g.cum.length - 1 && g.cum[i] < d) i++;
  const a = g.pts[i - 1], b = g.pts[i] || a, seg = g.cum[i] - g.cum[i - 1] || 1;
  const u = (d - g.cum[i - 1]) / seg;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}

// ---------- trains ----------
let TRAINS = [];
function groupOf(line, route) {
  const s = `${line} ${route}`;
  return GROUPS.find((g) => g.re.test(s));
}
function load(data) {
  TRAINS = data.trains.map(([id, line, color, route, flat]) => {
    const keys = [], t = [];
    for (let i = 0; i < flat.length; i += 2) if (STATIONS[flat[i]]) { keys.push(flat[i]); t.push(flat[i + 1]); }
    const g = groupOf(line, route);
    return { id, line: title(String(line).replace(/commuter\s*line\s*/i, "")), route, group: g.id,
      color: /^#[0-9a-f]{6}$/i.test(color || "") ? color : g.color, keys, t };
  }).filter((x) => x.keys.length > 1);
  buildLegend();
}

// Where is train `tr` at seconds `T`? null if not running.
function locate(tr, T0) {
  const n = tr.t.length;
  for (const T of [T0, T0 + DAY]) {
    if (T < tr.t[0] - PRE_DEPART || T > tr.t[n - 1] + POST_ARRIVE) continue;
    if (T < tr.t[0]) {
      const g = trackPath(tr.keys[0], tr.keys[1]);
      return { p: g.pts[0], h: along(g, 0.05), moving: false, i: -1, T };
    }
    let lo = 0, hi = n - 1;                       // last stop index with t <= T
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (tr.t[m] <= T) lo = m; else hi = m - 1; }
    const i = lo;
    if (i >= n - 1) {
      const g = trackPath(tr.keys[n - 2], tr.keys[n - 1]);
      return { p: g.pts[g.pts.length - 1], h: null, back: along(g, 0.95), moving: false, i: n - 1, T };
    }
    const g = trackPath(tr.keys[i], tr.keys[i + 1]);
    const dep = tr.t[i];
    let arr = i + 1 === n - 1 ? tr.t[i + 1] : tr.t[i + 1] - DWELL;
    if (arr - dep < 20) arr = tr.t[i + 1];
    if (T >= arr) return { p: g.pts[g.pts.length - 1], back: along(g, 0.95), moving: false, i: i + 1, T, atStop: true };
    const f = ease((T - dep) / (arr - dep));
    return { p: along(g, f), h: along(g, Math.min(1, f + 0.02)), back: f >= 0.98 ? along(g, f - 0.02) : null, moving: true, i, T };
  }
  return null;
}

// ---------- map ----------
const dark = matchMedia("(prefers-color-scheme: dark)").matches;
const map = L.map("map", { zoomControl: false, attributionControl: true, minZoom: 9, maxZoom: 17 })
  .setView([-6.235, 106.82], innerWidth < 600 ? 11 : 12);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Jadwal: <a href="https://commuterline.id">KAI Commuter</a>',
}).addTo(map);

for (const l of LINES) {
  const pts = l.seq.map((k) => STATIONS[k].p);
  L.polyline(pts, { color: dark ? "#000" : "#fff", weight: 7, opacity: 0.7, interactive: false }).addTo(map);
  L.polyline(pts, { color: l.color, weight: 4, opacity: 0.85, interactive: false }).addTo(map);
}

const stationMarkers = [];
for (const [k, s] of Object.entries(STATIONS)) {
  const hub = (adj[k]?.size || 0) > 2;
  const m = L.circleMarker(s.p, { radius: hub ? 5 : 3.5, color: dark ? "#d8dbe2" : "#2a2d33", weight: hub ? 2 : 1.5,
    fillColor: dark ? "#16181e" : "#fff", fillOpacity: 1, bubblingMouseEvents: false })
    .bindTooltip(s.n, { permanent: true, direction: "right", offset: [5, 0], className: "st-label" })
    .addTo(map);
  m.hub = hub;
  m.on("click", (e) => { const hit = trainAt(e.containerPoint); hit ? selectTrain(hit) : selectStation(k); });
  stationMarkers.push(m);
}
function onZoom() {
  const z = map.getZoom();
  map.getContainer().classList.toggle("zfar", z < 13);
  for (const m of stationMarkers) m.setRadius((m.hub ? 5 : 3.5) * (z >= 14 ? 1.4 : 1));
}
map.on("zoomend", onZoom); onZoom();

// ---------- canvas overlay for trains ----------
const cv = document.createElement("canvas");
cv.id = "trains";
map.getContainer().appendChild(cv);
const ctx = cv.getContext("2d");
function resize() {
  const r = devicePixelRatio || 1, { x, y } = map.getSize();
  cv.width = x * r; cv.height = y * r; cv.style.width = x + "px"; cv.style.height = y + "px";
  ctx.setTransform(r, 0, 0, r, 0, 0);
}
map.on("resize", resize); resize();

const hidden = new Set();
let drawn = [];            // [{tr, x, y}] for hit-testing
let selected = null, selectedStation = null;

function frame() {
  const T = simNow();
  const { x: W, y: H } = map.getSize();
  ctx.clearRect(0, 0, W, H);
  const z = map.getZoom(), Ln = Math.max(12, Math.min(32, 9 + (z - 10) * 4.5)), Wd = Ln * 0.45;
  drawn = [];
  let running = 0;
  const counts = {};
  for (const tr of TRAINS) {
    const loc = locate(tr, T);
    if (!loc) continue;
    running++; counts[tr.group] = (counts[tr.group] || 0) + 1;
    if (hidden.has(tr.group)) continue;
    const pt = map.latLngToContainerPoint(loc.p);
    if (pt.x < -40 || pt.y < -40 || pt.x > W + 40 || pt.y > H + 40) continue;
    let ang = 0;
    if (loc.h) { const q = map.latLngToContainerPoint(loc.h); ang = Math.atan2(q.y - pt.y, q.x - pt.x); }
    else if (loc.back) { const q = map.latLngToContainerPoint(loc.back); ang = Math.atan2(pt.y - q.y, pt.x - q.x); }
    drawn.push({ tr, x: pt.x, y: pt.y, loc, ang });
  }
  // selected train drawn last (on top)
  drawn.sort((a, b) => (a.tr === selected) - (b.tr === selected));
  for (const d of drawn) {
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang);
    if (d.tr === selected) {
      ctx.beginPath(); ctx.arc(0, 0, Ln * 0.95, 0, 7);
      ctx.fillStyle = d.tr.color + "33"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = d.tr.color; ctx.stroke();
    }
    ctx.beginPath(); ctx.roundRect(-Ln / 2, -Wd / 2, Ln, Wd, Wd / 2);
    ctx.fillStyle = d.tr.color; ctx.globalAlpha = d.loc.moving ? 1 : 0.8; ctx.fill();
    ctx.globalAlpha = 1; ctx.lineWidth = 1.5; ctx.strokeStyle = dark ? "#0f1115" : "#fff"; ctx.stroke();
    if (d.loc.moving) { ctx.beginPath(); ctx.arc(Ln / 2 - Wd / 2, 0, Wd * 0.22, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); }
    ctx.restore();
  }
  updateHud(T, running, counts);
  requestAnimationFrame(frame);
}

function trainAt(p) {
  let best = null, bd = 16;
  for (const d of drawn) { const dd = Math.hypot(d.x - p.x, d.y - p.y); if (dd < bd) { bd = dd; best = d.tr; } }
  return best;
}
map.on("click", (e) => { const hit = trainAt(e.containerPoint); hit ? selectTrain(hit) : closeCard(); });

// ---------- HUD ----------
let hudTick = 0;
function updateHud(T, running, counts) {
  const now = performance.now();
  if (now - hudTick < 250) return;
  hudTick = now;
  $("#clock").innerHTML = `${hhmmss(T)}<small>WIB</small>`;
  const live = clock.speed === 1 && Math.abs(((T - realWib() + DAY * 1.5) % DAY) - DAY / 2) < 5;
  $("#live").classList.toggle("sim", !live);
  if (TRAINS.length) $("#count").textContent = `${running} kereta berjalan · ${TRAINS.length} perjalanan hari ini`;
  for (const g of GROUPS) { const el = document.getElementById("n-" + g.id); if (el) el.textContent = counts[g.id] || 0; }
  if (selected) renderTrain(T); else if (selectedStation) renderStation(T);
}
function buildLegend() {
  const present = new Set(TRAINS.map((t) => t.group));
  $("#legend").innerHTML = GROUPS.filter((g) => present.has(g.id)).map((g) =>
    `<label><input type="checkbox" checked data-g="${g.id}"><span class="sw" style="background:${g.color}"></span><span>${g.name}</span><span class="n" id="n-${g.id}">0</span></label>`).join("");
  $("#legend").onchange = (e) => { const g = e.target.dataset.g; e.target.checked ? hidden.delete(g) : hidden.add(g); };
}
document.querySelector(".speed").onclick = (e) => { const s = e.target.dataset.s; if (s) setSpeed(s === "now" ? "now" : +s); };
const fold = (on) => { $("#hud").classList.toggle("min", on); $("#hud .fold").textContent = on ? "+" : "–"; };
$("#hud .fold").onclick = () => fold(!$("#hud").classList.contains("min"));
if (innerWidth < 600) fold(true);

// ---------- info card ----------
const card = $("#card");
function closeCard() { selected = null; selectedStation = null; card.classList.remove("show"); }
function selectTrain(tr) { selected = tr; selectedStation = null; card.classList.add("show"); renderTrain(simNow(), true); }
function selectStation(k) { selected = null; selectedStation = k; card.classList.add("show"); renderStation(simNow()); }
card.addEventListener("click", (e) => {
  if (e.target.closest(".x")) return closeCard();
  const row = e.target.closest("[data-train]");
  if (row) {
    const tr = TRAINS.find((t) => t.id === row.dataset.train);
    if (tr) { selectTrain(tr); const loc = locate(tr, simNow()); if (loc) map.panTo(loc.p); }
  }
});

function renderTrain(T, scroll) {
  const tr = selected, loc = locate(tr, T);
  const Tx = loc ? loc.T : (T < tr.t[0] ? T : T - DAY);
  const nextIdx = tr.t.findIndex((t) => t >= Tx);
  const last = tr.keys[tr.keys.length - 1], first = tr.keys[0];
  let status;
  if (!loc) status = Tx < tr.t[0] ? `Berangkat ${hhmm(tr.t[0])}` : "Sudah tiba";
  else if (nextIdx === -1) status = "Tiba di tujuan";
  else if (Tx < tr.t[0]) status = `Menunggu berangkat · ${Math.max(0, Math.ceil((tr.t[0] - Tx) / 60))} mnt`;
  else if (loc.atStop) status = `Berhenti di ${STATIONS[tr.keys[loc.i]].n}`;
  else { const m = Math.max(0, Math.round((tr.t[nextIdx] - Tx) / 60)); status = `Berikutnya ${STATIONS[tr.keys[nextIdx]].n} · ${m < 1 ? "<1" : m} mnt`; }
  const g = GROUPS.find((x) => x.id === tr.group);
  card.style.setProperty("--c", tr.color);
  card.innerHTML = `<button class="x" aria-label="Tutup">×</button>
    <span class="tag" style="background:${tr.color}">${esc(tr.line || g.name)}</span>
    <h2>${esc(STATIONS[first].n)} → ${esc(STATIONS[last].n)}</h2>
    <div class="sub">KA ${esc(tr.id)} · ${status}</div>
    <ol>${tr.keys.map((k, i) => `<li class="${i < nextIdx || nextIdx === -1 ? "past" : i === nextIdx ? "next" : ""}"><span>${esc(STATIONS[k].n)}</span><time>${hhmm(tr.t[i])}</time></li>`).join("")}</ol>`;
  if (scroll) card.querySelector(".next")?.scrollIntoView({ block: "nearest" });
}

function renderStation(T) {
  const k = selectedStation, rows = [];
  for (const tr of TRAINS) {
    const i = tr.keys.indexOf(k);
    if (i < 0 || i === tr.keys.length - 1) continue;      // skip trains ending here
    for (const d of [0, DAY]) { const t = tr.t[i] - d; if (t >= T - 30 && t < T + 3 * 3600) rows.push({ tr, t }); }
  }
  rows.sort((a, b) => a.t - b.t);
  card.innerHTML = `<button class="x" aria-label="Tutup">×</button>
    <h2>${esc(STATIONS[k].n)}</h2><div class="sub">Keberangkatan berikutnya</div>
    ${rows.length ? `<table>${rows.slice(0, 10).map(({ tr, t }) => {
      const m = Math.round((t - T) / 60);
      return `<tr data-train="${esc(tr.id)}"><td>${hhmm(t)}</td><td><span class="bar" style="background:${tr.color}"></span>${esc(STATIONS[tr.keys[tr.keys.length - 1]].n)}</td><td>${m <= 0 ? "now" : m + " mnt"}</td></tr>`;
    }).join("")}</table>` : `<div class="sub">Tidak ada keberangkatan dalam 3 jam ke depan.</div>`}`;
}

// ---------- boot ----------
function toast(msg, retry) {
  const t = $("#toast");
  t.innerHTML = esc(msg) + (retry ? ' <button>Coba lagi</button>' : "");
  t.classList.add("show");
  if (retry) t.querySelector("button").onclick = () => { t.classList.remove("show"); fetchData(); };
}
async function fetchData() {
  try {
    const r = await fetch("/timetable.json", { cache: "no-cache" });
    if (r.status === 404) throw new Error("jadwal belum dibuat, coba lagi beberapa menit lagi");
    const j = await r.json();
    if (!r.ok || !j.trains) throw new Error(r.status);
    load(j);
    $("#toast").classList.remove("show");
  } catch (e) {
    $("#count").textContent = "Jadwal tidak tersedia";
    toast(`Gagal memuat jadwal: ${e.message}`, true);
  }
}
fetchData();
setInterval(fetchData, 3 * 3600 * 1000);
requestAnimationFrame(frame);
