#!/usr/bin/env node
/* restore_pn.js — ADDITIVE restore of the auto-curated pN.jpg photos that were
 * wrongly deleted during the memories ingest. Regenerates p0..pN from the
 * ORIGINAL photos/ source (same sorted-even-spread as curate_photos/trips),
 * writing ONLY pN.jpg files that are currently MISSING. Never deletes anything.
 * Skips 230806_SantaClara (user fixed it manually).
 */
const fs = require("fs"), path = require("path"), vm = require("vm"), cp = require("child_process");
const ROOT = __dirname, PHOTOS = path.join(ROOT, "photos"), OUT = path.join(ROOT, "card_photos");
const IMG = /\.(jpe?g|heic|png)$/i;
const N = 5, MAXW = 1400;
const SKIP = new Set(["230806_SantaClara"]);  // user already fixed

const sb = {}; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT,"js/places.js"),"utf8")+"\nthis.P=PLACES;", sb);
const M = {january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
const city = n => n.split(",")[0].trim().replace(/[^A-Za-z0-9]+/g," ").split(" ").filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1)).join("");
const yy = d => { const m=(d||"").toLowerCase().match(/([a-z]+)\s+(\d+),\s*(\d{4})/); if(!m)return null; return String(parseInt(m[3])%100).padStart(2,"0")+String(M[m[1]]).padStart(2,"0")+String(parseInt(m[2])).padStart(2,"0"); };
const slugFor = p => { const y=yy(p.date); return y? y+"_"+city(p.name): city(p.name); };

// trips: slug -> source folder names in photos/ (same ranges as curate_trips.js)
const TRIPS = {
  "230928_Maui": ["230928_Maui_Day_1","230929_Maui_Day_2","230930_Maui_Day_3","231001_Maui_Day_4"],
  "250618_Reykjavik": ["250618_Golden_Circle","250619_Seljalandsfoss_Gljufrabui_Skogafoss_Solheimasandur","250620_Dyrholaey_Reynisfjara_Svartifoss_Jokulsarlon","250621_Vestrahorn_Seydisfjordur_Studlagil","250622_Dettifoss_Krafla_Hverir_Grjotagja_Hverfjall_Dimmuborgir_Skutustadagigar_Myvatn"],
  "250623_HSavK": ["250623_Husavik_ArcticHenge_Godafoss","250624_Akureyri_Blonduoskirkja_Vatnsdalsholar_Kolugljufur_Hvitserkur","250625_Dynjandi_Ferry_Snaefellsnes","250626_Hraunfossar_Sturlureykir_Krauma_HofrungurAK91_Reykjavik"],
  "250627_VGar": ["250627_Gasadalur_SlaveCliff","250701_VagarBoatTour_Sandoy"],
  "250629_Eysturoy": ["250628_Kalsoy_Bordoy_Eysturoy","250629_Slaettaratindur_Gjogv_Eidi_Fossa_Saksun"],
  "250630_TRshavn": ["250630_Torshavn_WitchesFinger_Kirkjubour"],
  "250703_Banff": ["250703_Banff","250704_Banff_to_Jasper","250705_Jasper_to_Banff","250706_LakeLouise_LakeMoraine_NaturalBridge_EmeraldLake"],
  "240620_LasVegas": ["240619_SFO_Las_Vegas","240620_LasVegas_HooverDam_GrandCanyon"],
  "240621_GrandCanyon": ["240621_Grand_Canyon"],
  "240622_Page": ["240622_AntelopeCanyon_HorseshoeBend_LakePowell_Page"],
  "240624_CoyoteButtes": ["240623_VermillionCliffs_CoyoteButtes","240624_The_Wave"],
};

function listImages(dir){
  const out = [];
  const walk = d => { try { for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(IMG.test(e.name)&&!e.name.startsWith(".")){ try{ if(fs.statSync(p).size>150*1024) out.push(p); }catch{} } } } catch {} };
  walk(dir);
  return out.sort((a,b)=>path.basename(a).localeCompare(path.basename(b)));
}
function spread(arr,n){ if(arr.length<=n) return arr.slice(); const o=[]; for(let i=0;i<n;i++) o.push(arr[Math.round(i*(arr.length-1)/(n-1))]); return o; }

const places = sb.P.visited.filter(p=>!["home","badminton","dream"].includes(p.kind));
let restored = 0, skipped = 0;
for(const p of places){
  const slug = slugFor(p);
  if(SKIP.has(slug)) { skipped++; continue; }
  const dst = path.join(OUT, slug);
  if(!fs.existsSync(dst)) continue;
  // only act if pN are MISSING (don't duplicate if already present)
  const hasPn = fs.readdirSync(dst).some(f=>/^p\d+\.jpg$/i.test(f));
  if(hasPn) continue;

  // source folders
  let bases;
  if(TRIPS[slug]) bases = TRIPS[slug].map(f=>path.join(PHOTOS,f));
  else if(p.folder) bases = [path.join(ROOT, p.folder)];
  else continue;

  let cands = [];
  for(const b of bases) cands = cands.concat(listImages(b));
  if(!cands.length) { continue; }
  const picks = spread(cands, N);
  let j=0, wrote=0;
  for(const src of picks){
    const outp = path.join(dst, "p"+j+".jpg");
    if(fs.existsSync(outp)) { j++; continue; }   // never overwrite
    try { cp.execFileSync("sips",["-s","format","jpeg","-Z",String(MAXW),src,"--out",outp],{stdio:"ignore"}); wrote++; }
    catch{}
    j++;
  }
  if(wrote){ restored++; console.log(slug+": restored "+wrote+" pN photos (alongside existing)"); }
}
console.log(`\nrestored pN in ${restored} folders; skipped ${skipped}.`);
