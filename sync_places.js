#!/usr/bin/env node
/* sync_places.js — update js/places.js `note:` fields from a captions file.
 * Caption line format:  Place, ST (M/D/YYYY): caption      (memories)
 *                       Place (home|badminton|tesla|dream): caption  (specials)
 * Matches by name+date for memories, by kind for specials/dreams.
 * Dry-run by default; pass --write to apply.
 */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = __dirname;
const CAP = path.join(ROOT, process.argv.find(a=>a.endsWith(".txt")) || "places.txt");
const WRITE = process.argv.includes("--write");

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function dateLong(mdy) { // "6/22/2023" -> "June 22, 2023"
  const m = mdy.match(/(\d+)\/(\d+)\/(\d+)/); if (!m) return null;
  return `${MONTHS[+m[1]-1]} ${+m[2]}, ${m[3]}`;
}

// parse captions
const lines = fs.readFileSync(CAP, "utf8").split("\n");
const byKey = new Map();   // "name|LongDate" -> caption ; or "kind|home" etc
for (const ln of lines) {
  const t = ln.trim(); if (!t || t.startsWith("#")) continue;
  let m = t.match(/^(.+?)\s*\(([^)]+)\):\s*(.+)$/);
  if (!m) continue;
  const name = m[1].trim(), tag = m[2].trim(), cap = m[3].trim();
  if (/^(home|badminton|tesla|dream)$/i.test(tag)) {
    byKey.set("kind|" + tag.toLowerCase() + "|" + name, cap);
  } else {
    const d = dateLong(tag);
    if (d) byKey.set(name + "|" + d, cap);
  }
}

// load PLACES to know each entry's identity
const sb = {}; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT,"js/places.js"),"utf8")+"\nthis.P=PLACES;", sb);
const all = [...sb.P.visited];

function esc(s){ return s.replace(/\\/g,"\\\\").replace(/"/g,'\\"'); }

let src = fs.readFileSync(path.join(ROOT,"js/places.js"),"utf8");
let updated = 0, missed = [];
for (const p of all) {
  let cap;
  if (["home","badminton","tesla","dream"].includes(p.kind)) {
    cap = byKey.get("kind|" + p.kind + "|" + p.name);
  } else {
    cap = byKey.get(p.name + "|" + p.date);
  }
  if (cap == null) { missed.push(p.name + " (" + (p.date||p.kind) + ")"); continue; }
  if (cap === p.note) continue;  // unchanged
  // replace this entry's note string. Build a precise match using the current note.
  const oldNote = '"' + esc(p.note) + '"';
  const idx = src.indexOf('note:' + oldNote);
  if (idx === -1) { missed.push("NOTE-NOT-FOUND: " + p.name + " (" + (p.date||p.kind) + ")"); continue; }
  src = src.slice(0, idx) + 'note:"' + esc(cap) + '"' + src.slice(idx + ('note:'+oldNote).length);
  updated++;
}

console.log("would update " + updated + " notes; " + missed.length + " unmatched/unchanged-not-found");
if (missed.length) console.log(missed.map(x=>"  - "+x).join("\n"));
if (WRITE) { fs.writeFileSync(path.join(ROOT,"js/places.js"), src); console.log("WROTE js/places.js"); }
else console.log("(dry-run; pass --write to apply)");
