#!/usr/bin/env python3
"""curate_faces.py — Tier 1 photo curation.
For each memory place: gather candidate photos (its folder + surrounding-date
trip folders + phone subfolders), score quality (sharpness/exposure/size) with
PIL, run macOS Vision face-count on the top candidates, then rank preferring
2-face > 1-face > 0-face, best quality first, and write ~N best to card_photos/.
Originals in photos/ are never modified. home/badminton/dream are left as-is.
"""
import os, sys, json, subprocess, tempfile, re
from PIL import Image, ImageFilter
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(ROOT, "photos")
OUT = os.path.join(ROOT, "card_photos")
FACECOUNT = os.path.join(ROOT, "facecount")
N_PICK = 5
PREFILTER_KEEP = 40
MAXW = 1400
IMG_RE = re.compile(r"\.(jpe?g|heic|png)$", re.I)

MONTHS = {m: i+1 for i, m in enumerate(
    ["january","february","march","april","may","june","july","august",
     "september","october","november","december"])}

def city_of(name):
    c = name.split(",")[0].strip()
    return "".join(w.capitalize() for w in re.split(r"[^A-Za-z0-9]+", c) if w)
def yymmdd(date):
    m = re.search(r"([a-z]+)\s+(\d+),\s*(\d{4})", (date or "").lower())
    if not m or m.group(1) not in MONTHS: return None
    return f"{int(m.group(3))%100:02d}{MONTHS[m.group(1)]:02d}{int(m.group(2)):02d}"
def slug_for(p):
    if p.get("kind") == "home": return "home"
    if p.get("kind") == "badminton": return "badminton"
    if p.get("kind") == "dream": return "dream_" + city_of(p["name"]).lower()
    y = yymmdd(p.get("date"))
    return (y + "_" + city_of(p["name"])) if y else city_of(p["name"])

def load_places():
    js = ('const vm=require("vm"),fs=require("fs");const sb={};vm.createContext(sb);'
          'vm.runInContext(fs.readFileSync("js/places.js","utf8")+"\\nthis.P=PLACES;",sb);'
          'process.stdout.write(JSON.stringify(sb.P.visited.map(p=>({name:p.name,date:p.date,kind:p.kind,folder:p.folder}))));')
    return json.loads(subprocess.check_output(["node","-e",js], cwd=ROOT))

def walk_images(base):
    res = []
    if not os.path.isdir(base): return res
    for root, _, files in os.walk(base):
        for f in files:
            if f.startswith(".") or not IMG_RE.search(f): continue
            p = os.path.join(root, f)
            try:
                if os.path.getsize(p) > 150*1024: res.append(p)
            except OSError: pass
    return res

def to_jpeg_tmp(src, box=1000):
    fd, tmp = tempfile.mkstemp(suffix=".jpg"); os.close(fd)
    try:
        subprocess.run(["sips","-s","format","jpeg","-Z",str(box),src,"--out",tmp],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return tmp
    except Exception:
        try: os.remove(tmp)
        except OSError: pass
        return None

def quality(jpg):
    try:
        im = Image.open(jpg).convert("L")
    except Exception:
        return (0.0, 1.0, 0.0)
    arr = np.asarray(im, dtype=np.float32)
    lap = ImageFilter.Kernel((3,3),[0,1,0,1,-4,1,0,1,0],1,0)
    sharp = float(np.asarray(im.filter(lap), dtype=np.float32).var())
    mean = arr.mean()/255.0
    expo = abs(mean-0.5)*2
    mp = (im.size[0]*im.size[1])/1e6
    return (sharp, expo, mp)

def q_score(sharp, expo, mp):
    return sharp*(1.0-0.6*expo) + mp*20.0

def face_count(jpg):
    try:
        out = subprocess.check_output([FACECOUNT, jpg], stderr=subprocess.DEVNULL)
        return int(out.strip() or b"0")
    except Exception:
        return 0

TRIPS = {
  "250618_Reykjavik": ["250618_Golden_Circle","250619_Seljalandsfoss_Gljufrabui_Skogafoss_Solheimasandur",
     "250620_Dyrholaey_Reynisfjara_Svartifoss_Jokulsarlon","250621_Vestrahorn_Seydisfjordur_Studlagil",
     "250622_Dettifoss_Krafla_Hverir_Grjotagja_Hverfjall_Dimmuborgir_Skutustadagigar_Myvatn"],
  "250623_HSavK": ["250623_Husavik_ArcticHenge_Godafoss","250624_Akureyri_Blonduoskirkja_Vatnsdalsholar_Kolugljufur_Hvitserkur",
     "250625_Dynjandi_Ferry_Snaefellsnes","250626_Hraunfossar_Sturlureykir_Krauma_HofrungurAK91_Reykjavik"],
  "250627_VGar": ["250627_Gasadalur_SlaveCliff","250701_VagarBoatTour_Sandoy"],
  "250629_Eysturoy": ["250628_Kalsoy_Bordoy_Eysturoy","250629_Slaettaratindur_Gjogv_Eidi_Fossa_Saksun"],
  "250630_TRshavn": ["250630_Torshavn_WitchesFinger_Kirkjubour"],
  "250703_Banff": ["250703_Banff","250704_Banff_to_Jasper","250705_Jasper_to_Banff",
     "250706_LakeLouise_LakeMoraine_NaturalBridge_EmeraldLake"],
  "260107_Tokyo": ["260107_TPE_Asakusa_Senso-ji","260108_AzabudaiHills_TokyoTower_Ginza","260109_Shibuya_MeijiShrine_YoyogiPark"],
  "260110_Karuizawa": ["260110_Karuizawa","260111_Karuizawa_Shinjuku"],
  "260113_Tokyo": ["260112_Daiba","260113_Disneyland"],
  "240620_LasVegas": ["240619_SFO_Las_Vegas","240620_LasVegas_HooverDam_GrandCanyon"],
  "240621_GrandCanyon": ["240621_Grand_Canyon"],
  "240622_Page": ["240622_AntelopeCanyon_HorseshoeBend_LakePowell_Page"],
  "240624_CoyoteButtes": ["240623_VermillionCliffs_CoyoteButtes","240624_The_Wave"],
}

def main():
    only = set(sys.argv[1:])
    places = load_places()
    manifest_path = os.path.join(OUT, "manifest.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}

    for p in places:
        if p.get("kind") in ("home","badminton","dream"): continue
        slug = slug_for(p)
        if only and slug not in only: continue
        folders = TRIPS.get(slug)
        if folders:
            bases = [os.path.join(PHOTOS, f) for f in folders]
        elif p.get("folder"):
            bases = [os.path.join(ROOT, p["folder"])]
        else:
            continue
        cands = []
        for b in bases: cands += walk_images(b)
        if not cands:
            print(f"(no candidates) {slug}"); continue
        cands.sort()
        # cap: evenly sample at most QS_SCAN candidates for the (slow) quality pass
        QS_SCAN = 160
        if len(cands) > QS_SCAN:
            step = len(cands) / QS_SCAN
            cands = [cands[int(i*step)] for i in range(QS_SCAN)]

        scored = []
        for src in cands:
            tj = to_jpeg_tmp(src, 700)
            if not tj: continue
            s, e, mp = quality(tj)
            scored.append((q_score(s,e,mp), src))
            try: os.remove(tj)
            except OSError: pass
        scored.sort(key=lambda x: -x[0])
        keep = scored[:PREFILTER_KEEP]

        enriched = []
        for qs, src in keep:
            tj = to_jpeg_tmp(src, 1200)
            fc = face_count(tj) if tj else 0
            if tj:
                try: os.remove(tj)
                except OSError: pass
            tier = {2:3, 1:2}.get(fc, (1 if fc>=3 else 0))
            enriched.append((tier, qs, src, fc))
        enriched.sort(key=lambda x: (-x[0], -x[1]))

        picks = enriched[:N_PICK]
        picks_sorted = sorted(picks, key=lambda x: x[2])

        dst_dir = os.path.join(OUT, slug)
        if os.path.isdir(dst_dir):
            for f in os.listdir(dst_dir):
                if re.match(r"p\d+\.jpg$", f):
                    try: os.remove(os.path.join(dst_dir, f))
                    except OSError: pass
        os.makedirs(dst_dir, exist_ok=True)
        web = []
        for j,(tier,qs,src,fc) in enumerate(picks_sorted):
            out = os.path.join(dst_dir, f"p{j}.jpg")
            try:
                subprocess.run(["sips","-s","format","jpeg","-Z",str(MAXW),src,"--out",out],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                web.append(f"card_photos/{slug}/p{j}.jpg")
            except Exception: pass
        manifest[slug] = web
        faces = ",".join(str(x[3]) for x in picks_sorted)
        print(f"{slug}: {len(web)} picks (faces={faces}) from {len(cands)} candidates")

    json.dump(manifest, open(manifest_path,"w"), indent=2)
    print("manifest updated.")

if __name__ == "__main__":
    main()
