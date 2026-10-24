#!/usr/bin/env python3
"""regen_final_slideshow_manifest.py — SAFE, READ-ONLY.

final_slideshow/ is a STATIC folder the user curates by hand. This script does
NOTHING except regenerate final_slideshow/manifest.json from whatever images are
currently in the folder, in chronological (filename) order. It never adds,
deletes, resizes, or rewrites any image. Run it after you add/remove photos in
final_slideshow/ so the montage picks up your changes.
"""
import os, re, json

# This script lives INSIDE final_slideshow/, so its own folder is the slideshow
# folder. Manifest paths are written web-root-relative ("final_slideshow/<f>")
# because that's how the page (js/map.js) loads them.
OUT = os.path.dirname(os.path.abspath(__file__))

files = [f for f in os.listdir(OUT)
         if re.search(r"\.(jpe?g|png)$", f, re.I) and not f.startswith(".")]
files.sort(key=lambda s: [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)])
json.dump(["final_slideshow/" + f for f in files],
          open(os.path.join(OUT, "manifest.json"), "w"), indent=2)
print(f"manifest: {len(files)} images  (first: {files[0] if files else '-'}, last: {files[-1] if files else '-'})")
