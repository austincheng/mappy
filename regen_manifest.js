#!/usr/bin/env node
/* regen_manifest.js — the ONE canonical way to rebuild card_photos/manifest.json.
 * - Includes images AND videos (mp4/mov/m4v/webm).
 * - Orders each folder's media CHRONOLOGICALLY by a timestamp/sequence parsed
 *   from the filename, with sensible fallbacks. Random copy order is fixed here.
 * - Never touches the photo files themselves (read-only); purely additive-safe.
 */
const fs = require("fs"), path = require("path");
const OUT = path.join(__dirname, "card_photos");
const MEDIA = /\.(jpe?g|png|mp4|mov|m4v|webm)$/i;

/* Extract a sortable key from a filename. Handles the common phone patterns:
 *   PXL_20241223_194838734... -> 20241223194838
 *   20230806_225820...        -> 20230806225820
 *   IMG_20230806_...          -> 20230806...
 *   IMG_0212 / DSC_1234       -> no date: fall back to numeric sequence
 * Returns [hasDate(0/1), bigintish string, originalLower] for stable compare.
 */
function sortKey(name) {
  const n = name.toLowerCase();
  // 8-digit date, optional time digits after a separator
  let m = n.match(/(20\d{6})[_\-t]?(\d{6,9})?/);
  if (m) {
    const date = m[1];
    const time = (m[2] || "000000").padEnd(6, "0").slice(0, 6);
    return { hasDate: 1, key: date + time, name: n };
  }
  // epoch-ish 13-digit (ms) or 10-digit (s)
  m = n.match(/\b(1[0-9]{12})\b/) || n.match(/\b(1[0-9]{9})\b/);
  if (m) return { hasDate: 1, key: m[1].padEnd(14, "0"), name: n };
  // trailing numeric sequence (IMG_0212 -> 0212)
  m = n.match(/(\d{3,})\D*$/);
  if (m) return { hasDate: 0, key: m[1].padStart(14, "0"), name: n };
  return { hasDate: 0, key: "00000000000000", name: n };
}
function cmp(a, b) {
  const ka = sortKey(a), kb = sortKey(b);
  if (ka.hasDate !== kb.hasDate) return kb.hasDate - ka.hasDate;   // dated first
  if (ka.key !== kb.key) return ka.key < kb.key ? -1 : 1;
  return ka.name.localeCompare(kb.name);
}

const manifest = {};
for (const slug of fs.readdirSync(OUT).sort()) {
  const dir = path.join(OUT, slug);
  let st; try { st = fs.statSync(dir); } catch { continue; }
  if (!st.isDirectory()) continue;
  const files = fs.readdirSync(dir).filter(f => MEDIA.test(f) && !f.startsWith("."));
  if (!files.length) continue;
  files.sort(cmp);
  manifest[slug] = files.map(f => "card_photos/" + slug + "/" + f);
}
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
const vids = Object.values(manifest).flat().filter(p => /\.(mp4|mov|m4v|webm)$/i.test(p)).length;
console.log("manifest: " + Object.keys(manifest).length + " slugs, " +
  Object.values(manifest).flat().length + " media (" + vids + " videos)");
