#!/usr/bin/env node
/* curate_trips.js — for multi-day trip pins, pull photos spread across a RANGE
 * of surrounding-date folders (not just the pin's single day). Updates
 * card_photos/<slug>/ and merges into card_photos/manifest.json.
 */
const fs = require("fs"), cp = require("child_process"), path = require("path");
const ROOT = __dirname, PHOTOS = path.join(ROOT, "photos"), OUT = path.join(ROOT, "card_photos");
const N = 6, MAXW = 1400;

// slug -> array of folder names to gather from (surrounding dates of the trip)
const TRIPS = {
  "250618_Reykjavik": [
    "250618_Golden_Circle","250619_Seljalandsfoss_Gljufrabui_Skogafoss_Solheimasandur",
    "250620_Dyrholaey_Reynisfjara_Svartifoss_Jokulsarlon","250621_Vestrahorn_Seydisfjordur_Studlagil",
    "250622_Dettifoss_Krafla_Hverir_Grjotagja_Hverfjall_Dimmuborgir_Skutustadagigar_Myvatn"],
  "250623_HSavK": [
    "250623_Husavik_ArcticHenge_Godafoss","250624_Akureyri_Blonduoskirkja_Vatnsdalsholar_Kolugljufur_Hvitserkur",
    "250625_Dynjandi_Ferry_Snaefellsnes","250626_Hraunfossar_Sturlureykir_Krauma_HofrungurAK91_Reykjavik"],
  "250627_VGar": ["250627_Gasadalur_SlaveCliff","250701_VagarBoatTour_Sandoy"],
  "250629_Eysturoy": ["250628_Kalsoy_Bordoy_Eysturoy","250629_Slaettaratindur_Gjogv_Eidi_Fossa_Saksun"],
  "250630_TRshavn": ["250630_Torshavn_WitchesFinger_Kirkjubour"],
  "250703_Banff": [
    "250703_Banff","250704_Banff_to_Jasper","250705_Jasper_to_Banff",
    "250706_LakeLouise_LakeMoraine_NaturalBridge_EmeraldLake"],
  "260107_Tokyo": [
    "260107_TPE_Asakusa_Senso-ji","260108_AzabudaiHills_TokyoTower_Ginza","260109_Shibuya_MeijiShrine_YoyogiPark"],
  "260110_Karuizawa": ["260110_Karuizawa","260111_Karuizawa_Shinjuku"],
  "260113_Tokyo": ["260112_Daiba","260113_Disneyland"],
  "240620_LasVegas": ["240619_SFO_Las_Vegas","240620_LasVegas_HooverDam_GrandCanyon"],
};

const IMG = /\.(jpe?g|heic|png)$/i;
function imgsIn(folder) {
  const abs = path.join(PHOTOS, folder);
  try {
    return fs.readdirSync(abs).filter(f => IMG.test(f) && !f.startsWith("."))
      .map(f => ({ f, size: fs.statSync(path.join(abs, f)).size }))
      .filter(x => x.size > 150 * 1024).sort((a, b) => a.f.localeCompare(b.f))
      .map(x => ({ folder, f: x.f }));
  } catch { return []; }
}
function spread(arr, n) {
  if (arr.length <= n) return arr.slice();
  const out = []; for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * (arr.length - 1) / (n - 1))]); return out;
}

const manifest = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));
for (const [slug, folders] of Object.entries(TRIPS)) {
  let cands = [];
  for (const fol of folders) cands = cands.concat(imgsIn(fol));
  if (!cands.length) { console.log("(none) " + slug); continue; }
  const picks = spread(cands, N);
  const dstDir = path.join(OUT, slug);
  fs.rmSync(dstDir, { recursive: true, force: true }); fs.mkdirSync(dstDir, { recursive: true });
  const web = [];
  picks.forEach((c, j) => {
    const dst = path.join(dstDir, "p" + j + ".jpg");
    try { cp.execFileSync("sips", ["-s", "format", "jpeg", "-Z", String(MAXW), path.join(PHOTOS, c.folder, c.f), "--out", dst], { stdio: "ignore" }); web.push("card_photos/" + slug + "/p" + j + ".jpg"); } catch {}
  });
  manifest[slug] = web;
  console.log(slug + ": " + web.length + " photos from " + folders.length + " folders");
}
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("manifest updated.");
