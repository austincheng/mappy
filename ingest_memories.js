#!/usr/bin/env node
/* ingest_memories.js — copy the user's curated memories/ day-folders into the
 * matching card_photos/<slug>/ by EXACT date (YYMMDD), with trips taking a
 * surrounding date range. Merge (keep existing + original filenames), then
 * DELETE each consumed memories/ folder. photos/ is untouched (true backup).
 * Finally regenerate manifest.json from whatever files actually exist.
 */
const fs = require("fs"), path = require("path"), vm = require("vm"), cp = require("child_process");
const ROOT = __dirname, MEM = path.join(ROOT, "memories"), OUT = path.join(ROOT, "card_photos");
const IMG = /\.(jpe?g|heic|png)$/i;
const MAXW = 1600;

// --- load PLACES, build date(YYMMDD) -> slug for memory stories ---
const sb = {}; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT,"js/places.js"),"utf8")+"\nthis.P=PLACES;", sb);
const M = {january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
const city = n => n.split(",")[0].trim().replace(/[^A-Za-z0-9]+/g," ").split(" ").filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1)).join("");
const yy = d => { const m=(d||"").toLowerCase().match(/([a-z]+)\s+(\d+),\s*(\d{4})/); if(!m)return null; return String(parseInt(m[3])%100).padStart(2,"0")+String(M[m[1]]).padStart(2,"0")+String(parseInt(m[2])).padStart(2,"0"); };
function slugFor(p){ if(p.kind==="dream")return "dream_"+city(p.name).toLowerCase(); const y=yy(p.date); return y? y+"_"+city(p.name): city(p.name); }

const stories = sb.P.visited.filter(p=>!["home","badminton","dream"].includes(p.kind))
  .map(p=>({ date: yy(p.date), slug: slugFor(p) }));
const dateToSlug = {}; stories.forEach(s=>{ if(s.date) dateToSlug[s.date]=s.slug; });

// --- trips: slug -> explicit list of memories/ folder names (surrounding range) ---
const TRIPS = {
  "230928_Maui": ["230928_Maui","230929_Maui","230930_Maui","231001_Maui"],
  "250618_Reykjavik": ["250618_Golden_Circle","250619_Seljalandsfoss_Gljufrabui_Skogafoss_Solheimasandur","250620_Dyrholaey_Reynisfjara_Svartifoss_Jokulsarlon","250621_Vestrahorn_GufuWaterfall_Seydisfjordur_Studlagil","250622_Dettifoss_Krafla_Hverir_Grjotagja_Hverfjall_Dimmuborgir_Skutustadagigar_Myvatn"],
  "250623_HSavK": ["250623_Husavik_ArcticHenge_Godafoss","250624_Akureyri_Blonduoskirkja_Vatnsdalsholar_Kolugljufur_Hvitserkur","250625_Dynjandi_Ferry_Snaefellsnes","250626_Hraunfossar_Sturlureykir_Krauma_HofrungurAK91_Reykjavik"],
  "250627_VGar": ["250627_Gasadalur_SlaveCliff","250701_VagarBoatTour_Sandoy"],
  "250629_Eysturoy": ["250628_Kalsoy_Bordoy_Eysturoy","250629_Slaettaratindur_Gjogv_Eidi_Fossa_Saksun"],
  "250630_TRshavn": ["250630_Torshavn_WitchesFinger_Kirkjubour"],
  "250703_Banff": ["250703_Banff","250704_Banff_to_Jasper","250705_Jasper_to_Banff","250706_LakeLouise_LakeMoraine_NaturalBridge_EmeraldLake"],
  "240620_LasVegas": ["240619_LasVegas","240620_LasVegas_HooverDam_GrandCanyon"],
  "240621_GrandCanyon": ["240621_theGrandCanyon"],
  "240622_Page": ["240622_AntelopeCanyon_HorseshoeBend_LakePowell_Page"],
  "240624_CoyoteButtes": ["240623_VermillionCliffs_CoyoteButtes","240624_TheWave"],
};
// dates owned by a trip must NOT also be consumed by exact-date matching
const tripDates = new Set();
Object.values(TRIPS).forEach(list=>list.forEach(f=>tripDates.add(f.slice(0,6))));

function imagesIn(dir){ try { return fs.readdirSync(dir).filter(f=>IMG.test(f)&&!f.startsWith(".")); } catch { return []; } }
function copyInto(slug, memFolders){
  const dst = path.join(OUT, slug); fs.mkdirSync(dst, {recursive:true});
  // this slug is now sourced from the user's curated memories/ -> drop old auto-curated pN.jpg
  for(const f of fs.readdirSync(dst)){ if(/^p\d+\.jpg$/i.test(f)){ try{ fs.rmSync(path.join(dst,f)); }catch{} } }
  let n=0;
  for(const mf of memFolders){
    const src = path.join(MEM, mf);
    for(const f of imagesIn(src)){
      // keep original name; prefix with source date folder to avoid collisions across trip days
      const base = memFolders.length>1 ? (mf.slice(0,6)+"_"+f) : f;
      let outName = base, k=1;
      while(fs.existsSync(path.join(dst,outName))) outName = base.replace(/(\.[^.]+)$/, "_"+(k++)+"$1");
      const outPath = path.join(dst, outName.replace(/\.(heic|png)$/i, ".jpg"));
      try { cp.execFileSync("sips",["-s","format","jpeg","-Z",String(MAXW),path.join(src,f),"--out",outPath],{stdio:"ignore"}); n++; }
      catch(e){ /* skip unreadable */ }
    }
  }
  return n;
}
function del(memFolders){ for(const mf of memFolders){ fs.rmSync(path.join(MEM,mf),{recursive:true,force:true}); } }

const dryRun = process.argv.includes("--dry");
let report = [];

// 1) trips
const consumed = new Set();
for(const [slug, folders] of Object.entries(TRIPS)){
  const present = folders.filter(f=>fs.existsSync(path.join(MEM,f)));
  if(!present.length){ report.push(`TRIP ${slug}: no memories folders (left as-is)`); continue; }
  if(dryRun){ report.push(`TRIP ${slug}: would copy ${present.length} folders -> delete`); present.forEach(f=>consumed.add(f)); continue; }
  const n = copyInto(slug, present);
  del(present); present.forEach(f=>consumed.add(f));
  report.push(`TRIP ${slug}: +${n} photos from ${present.length} folders (deleted)`);
}

// 2) exact-date single stories
const memDirs = fs.readdirSync(MEM).filter(d=>{ try { return fs.statSync(path.join(MEM,d)).isDirectory(); } catch { return false; } });
for(const d of memDirs){
  if(consumed.has(d)) continue;
  const date = d.slice(0,6);
  if(tripDates.has(date)) continue;          // belongs to a trip range
  const slug = dateToSlug[date];
  if(!slug) continue;                         // no map story on this date -> leave untouched
  if(dryRun){ report.push(`DATE ${d} -> ${slug} (would copy+delete)`); continue; }
  const n = copyInto(slug, [d]);
  del([d]);
  report.push(`DATE ${d} -> ${slug}: +${n} photos (deleted)`);
}

// 3) regenerate manifest from actual files
if(!dryRun){
  const manifest = {};
  for(const slug of fs.readdirSync(OUT)){
    const dir = path.join(OUT, slug);
    if(!fs.statSync(dir).isDirectory()) continue;
    const files = imagesIn(dir).sort((a,b)=>a.localeCompare(b, undefined, {numeric:true, sensitivity:"base"}));
    if(files.length) manifest[slug] = files.map(f=>"card_photos/"+slug+"/"+f);
  }
  fs.writeFileSync(path.join(OUT,"manifest.json"), JSON.stringify(manifest,null,2));
  report.push("manifest regenerated: "+Object.keys(manifest).length+" slugs");
}

console.log(report.join("\n"));
