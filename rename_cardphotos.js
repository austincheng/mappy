#!/usr/bin/env node
/* rename_cardphotos.js — migrate card_photos/ folder names + manifest keys from
 * the old "city-state-month-day-year" slug to the new scheme:
 *   memory/here (dated) -> YYMMDD_City   (e.g. 230806_SantaClara)
 *   home        -> home
 *   badminton   -> badminton
 *   dream       -> dream_<place>         (e.g. dream_alaska)
 * Keeps map.js placeSlug in sync (edited separately).
 */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = __dirname, OUT = path.join(ROOT, "card_photos");

// load PLACES
const sb = {}; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/places.js"), "utf8") + "\nthis.P=PLACES;", sb);
const P = sb.P;
const all = [].concat(P.visited || [], P.here ? [P.here] : [], P.future || []);

const MONTHS = { january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,
  september:9,october:10,november:11,december:12 };

function oldSlug(p, i) {
  return (p.name + "_" + (p.date || p.kind || i)).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function cityOf(name) {
  // part before first comma, keep letters/digits, CamelCase-ish (strip spaces)
  const city = (name || "").split(",")[0].trim();
  return city.replace(/[^A-Za-z0-9]+/g, " ").split(" ").filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1)).join("");
}
function yymmdd(date) {
  // "August 6, 2023" -> 230806
  const m = (date || "").toLowerCase().match(/([a-z]+)\s+(\d+),\s*(\d{4})/);
  if (!m) return null;
  const mo = MONTHS[m[1]]; if (!mo) return null;
  const d = parseInt(m[2], 10), y = parseInt(m[3], 10) % 100;
  return String(y).padStart(2,"0") + String(mo).padStart(2,"0") + String(d).padStart(2,"0");
}
function newSlug(p) {
  if (p.kind === "home") return "home";
  if (p.kind === "badminton") return "badminton";
  if (p.kind === "dream") return "dream_" + cityOf(p.name).toLowerCase();
  // memory / here (dated)
  const ymd = yymmdd(p.date);
  if (ymd) return ymd + "_" + cityOf(p.name);
  return cityOf(p.name) || "place";
}

// build old->new map (dedupe collisions by appending -2 etc.)
const used = new Set();
const map = {};
all.forEach((p, idx) => {
  const i = P.visited.indexOf(p);
  const o = oldSlug(p, i >= 0 ? i : idx);
  let n = newSlug(p);
  let base = n, k = 2;
  while (used.has(n) && n !== o) { n = base + "-" + k++; }
  used.add(n);
  map[o] = n;
});

// delete junk '0' folder (not in manifest)
const junk = path.join(OUT, "0");
if (fs.existsSync(junk)) { fs.rmSync(junk, { recursive: true, force: true }); console.log("deleted junk folder: 0"); }

// rename folders
let renamed = 0, missing = [];
for (const [o, n] of Object.entries(map)) {
  const src = path.join(OUT, o), dst = path.join(OUT, n);
  if (o === n) continue;
  if (!fs.existsSync(src)) { missing.push(o); continue; }
  if (fs.existsSync(dst)) { console.log("SKIP (dst exists): " + o + " -> " + n); continue; }
  fs.renameSync(src, dst); renamed++;
}
console.log("renamed " + renamed + " folders; " + missing.length + " old slugs had no folder");

// rewrite manifest keys + paths
const mfPath = path.join(OUT, "manifest.json");
const mf = JSON.parse(fs.readFileSync(mfPath, "utf8"));
const nmf = {};
for (const [o, arr] of Object.entries(mf)) {
  const n = map[o] || o;
  nmf[n] = (arr || []).map(pth => pth.replace("card_photos/" + o + "/", "card_photos/" + n + "/"));
}
fs.writeFileSync(mfPath, JSON.stringify(nmf, null, 2));
console.log("manifest keys rewritten: " + Object.keys(nmf).length);

// dump the mapping for reference
fs.writeFileSync(path.join(ROOT, "slug_rename_map.txt"),
  Object.entries(map).map(([o,n]) => o + "  ->  " + n).join("\n"));
console.log("wrote slug_rename_map.txt");
