#!/usr/bin/env node
/* curate_photos.js — rough heuristic photo curation for the Map of Us card.
 *
 * For each place in js/places.js that has a `folder`, pick ~N photos spread
 * evenly across that folder, convert/resize them (via macOS `sips`) into
 * card_photos/<slug>/, and write the chosen web paths back into a JSON file
 * (card_photos/manifest.json) keyed by a per-place slug.
 *
 * Home / badminton pull from several Home or Badminton folders.
 * Dreams are skipped (stock photos added manually later).
 *
 * This is intentionally a QUICK heuristic — the user vets/handpicks after.
 */
const fs = require("fs");
const cp = require("child_process");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const PHOTOS = path.join(ROOT, "photos");
const OUT = path.join(ROOT, "card_photos");
const N = 5;              // photos per story
const MAXW = 1400;        // resize width

// ---- load PLACES ----
const sb = {};
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/places.js"), "utf8") + "\nthis.P = PLACES;", sb);
const PLACES = sb.P;

const IMG_RE = /\.(jpe?g|heic|png)$/i;
const isImg = f => IMG_RE.test(f) && !f.startsWith(".");

function slugFor(p, i) {
  const MONTHS = { january:1,february:2,march:3,april:4,may:5,june:6,july:7,
    august:8,september:9,october:10,november:11,december:12 };
  const cityOf = (name) => (name || "").split(",")[0].trim()
    .replace(/[^A-Za-z0-9]+/g, " ").split(" ").filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1)).join("");
  const yymmdd = (date) => {
    const m = (date || "").toLowerCase().match(/([a-z]+)\s+(\d+),\s*(\d{4})/);
    if (!m) return null; const mo = MONTHS[m[1]]; if (!mo) return null;
    return String(parseInt(m[3],10)%100).padStart(2,"0")
      + String(mo).padStart(2,"0") + String(parseInt(m[2],10)).padStart(2,"0");
  };
  if (p.kind === "home") return "home";
  if (p.kind === "badminton") return "badminton";
  if (p.kind === "dream") return "dream_" + cityOf(p.name).toLowerCase();
  const ymd = yymmdd(p.date);
  return ymd ? ymd + "_" + cityOf(p.name) : cityOf(p.name);
}

// pick N items spread evenly across a sorted list
function spread(arr, n) {
  if (arr.length <= n) return arr.slice();
  const out = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * (arr.length - 1) / (n - 1))]);
  return out;
}

function listImages(folderAbs) {
  try {
    return fs.readdirSync(folderAbs).filter(isImg)
      .map(f => ({ f, size: fs.statSync(path.join(folderAbs, f)).size }))
      .filter(x => x.size > 150 * 1024)        // skip tiny/screenshot-ish files
      .sort((a, b) => a.f.localeCompare(b.f))  // chronological-ish by name
      .map(x => x.f);
  } catch { return []; }
}

function convert(srcAbs, dstAbs) {
  // sips: resize to max width and force JPEG (also converts HEIC)
  cp.execFileSync("sips", ["-s", "format", "jpeg", "-Z", String(MAXW), srcAbs, "--out", dstAbs],
    { stdio: "ignore" });
}

const manifest = {};
let totalCopied = 0;

for (let i = 0; i < PLACES.visited.length; i++) {
  const p = PLACES.visited[i];
  const slug = slugFor(p, i);
  let folders = [];

  if (p.kind === "home") {
    folders = fs.readdirSync(PHOTOS).filter(d => /_Home/i.test(d) || /_Home$/i.test(d)).slice(0, 6);
  } else if (p.kind === "badminton") {
    folders = fs.readdirSync(PHOTOS).filter(d => /Badminton|Bintang|Synergy|Tournament/i.test(d)).slice(0, 6);
  } else if (p.kind === "dream") {
    continue; // stock photos added manually
  } else if (p.folder) {
    folders = [path.basename(p.folder)];
  } else {
    continue;
  }

  // gather candidate images across the folder(s)
  let candidates = [];
  for (const fol of folders) {
    const abs = path.join(PHOTOS, fol);
    for (const img of listImages(abs)) candidates.push({ fol, img });
  }
  if (!candidates.length) { console.log("  (no photos) " + slug); continue; }

  const picks = spread(candidates, N);
  const dstDir = path.join(OUT, slug);
  fs.mkdirSync(dstDir, { recursive: true });

  const webPaths = [];
  picks.forEach((c, j) => {
    const dst = path.join(dstDir, "p" + j + ".jpg");
    try {
      convert(path.join(PHOTOS, c.fol, c.img), dst);
      webPaths.push("card_photos/" + slug + "/p" + j + ".jpg");
      totalCopied++;
    } catch (e) { /* skip bad file */ }
  });
  if (webPaths.length) manifest[slug] = webPaths;
  console.log(`${slug}: ${webPaths.length} photos`);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nDone. ${Object.keys(manifest).length} places, ${totalCopied} photos. manifest.json written.`);
