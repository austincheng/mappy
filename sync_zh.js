#!/usr/bin/env node
/* sync_zh.js — inject Chinese noteZh (and a place-name nameZh) into js/places.js
 * from places_v2_ai_proofread_zh.txt. Matches entries by date (memories) or by
 * kind (home/badminton/tesla/dream). English fields are left untouched; this
 * only ADDS noteZh. A zh place-name label (the Chinese country/region in the
 * line, e.g. 台灣/日本/冰島) is NOT used as nameZh — nameZh stays the existing
 * short city label where present. Dry-run unless --write.
 */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = __dirname;
const ZH = path.join(ROOT, "places_v3_zh.txt");
const WRITE = process.argv.includes("--write");

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
function longDate(mdy){ const m=mdy.match(/(\d+)\/(\d+)\/(\d+)/); if(!m)return null;
  return MONTHS[+m[1]-1].replace(/^./,c=>c.toUpperCase()) + " " + (+m[2]) + ", " + m[3]; }

// parse zh file: key -> zh caption
const zhByKey = new Map();
for (const raw of fs.readFileSync(ZH,"utf8").split("\n")) {
  const t = raw.trim(); if (!t || t.startsWith("#")) continue;
  // lines use a fullwidth colon："
  const m = t.match(/^(.+?)\s*\(([^)]+)\)[：:]\s*(.+)$/);
  if (!m) continue;
  const tag = m[2].trim(), cap = m[3].trim(), label = m[1].trim();
  if (/^dream$/i.test(tag)) zhByKey.set("dream|"+label, cap);   // key each dream by its (Chinese) label
  else if (/^(home|badminton|tesla)$/i.test(tag)) zhByKey.set("kind|"+tag.toLowerCase(), cap);
  else { const d = longDate(tag); if (d) zhByKey.set("date|"+d, cap); }
}

// Map each English dream place -> the label used in places_v3_zh.txt
const DREAM_LABEL = { "Bolivia":"玻利維亞", "Aruba":"阿魯巴", "Tanzania":"坦尚尼亞", "New Zealand":"紐西蘭", "Alaska":"阿拉斯加" };

// load PLACES
const sb={}; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT,"js/places.js"),"utf8")+"\nthis.P=PLACES;", sb);
const all = sb.P.visited;

let src = fs.readFileSync(path.join(ROOT,"js/places.js"),"utf8");
function esc(s){ return s.replace(/\\/g,"\\\\").replace(/"/g,'\\"'); }

let added=0, missed=[];
for (const p of all) {
  let cap;
  if (["home","badminton","tesla"].includes(p.kind)) cap = zhByKey.get("kind|"+p.kind);
  else if (p.kind === "dream") {
    const label = DREAM_LABEL[p.name.split(",")[0].trim()];
    cap = label ? zhByKey.get("dream|"+label) : null;
  }
  else cap = zhByKey.get("date|"+p.date);
  if (cap == null) { missed.push(p.name+" ("+(p.date||p.kind)+")"); continue; }
  if (p.noteZh === cap) continue;
  const noteLit = 'note:"' + esc(p.note) + '"';
  const idx = src.indexOf(noteLit);
  if (idx === -1) { missed.push("NOTE-NOT-FOUND: "+p.name+" ("+(p.date||p.kind)+")"); continue; }
  const insertAt = idx + noteLit.length;
  if (p.noteZh != null) {
    // REPLACE the existing noteZh:"..." that follows this note
    const existing = ', noteZh:"' + esc(p.noteZh) + '"';
    if (src.slice(insertAt, insertAt + existing.length) === existing) {
      src = src.slice(0, insertAt) + ', noteZh:"' + esc(cap) + '"' + src.slice(insertAt + existing.length);
      added++; continue;
    }
    // couldn't find exact existing; skip to avoid corruption
    missed.push("ZH-REPLACE-MISS: " + p.name + " (" + (p.date||p.kind) + ")"); continue;
  }
  src = src.slice(0,insertAt) + ', noteZh:"' + esc(cap) + '"' + src.slice(insertAt);
  added++;
}

// dreams are 5 distinct entries but all kind=dream, so map by English name
function dreamZh(name){
  const map = {
    "Bolivia":"你每天晚上都在用 Duolingo，為我們下一趟南美洲之旅做準備。",
    "Aruba":"我們的蜜月？至少我們在那些業務簡報裡都是這麼說的。",
    "Tanzania":"非洲野生動物之旅也在我們下一波旅行清單的最前面。",
    "New Zealand":"有一天，要一起去探索紐西蘭的草原。",
    "Alaska":"我們夢想著能一起看極光。",
  };
  return map[name.split(",")[0].trim()];
}

console.log((WRITE?"added ":"would add ")+added+" noteZh; "+missed.length+" unmatched");
if (missed.length) console.log(missed.map(x=>"  - "+x).join("\n"));
if (WRITE){ fs.writeFileSync(path.join(ROOT,"js/places.js"), src); console.log("WROTE places.js"); }
else console.log("(dry-run; pass --write)");
