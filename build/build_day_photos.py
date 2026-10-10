#!/usr/bin/env python3
"""
build_day_photos.py
-------------------
Scans the single drop folder (happiano_assets/day_photos/), picks the best
photos, builds a collage, and writes a manifest (day_photos.json) that the
Happiano page polls.

Selection logic (no heavy ML, all local):
  1. Load each image, compute a quality score:
       - sharpness  (variance of a Laplacian-like edge filter)  -> rewards crisp
       - resolution (megapixels, mildly)                        -> rewards bigger
     Very blurry shots are dropped.
  2. Dedupe near-identical burst shots using an average-hash (aHash); within a
     group of look-alikes keep only the highest-scoring one.
  3. Keep the best MAX_PHOTOS.
  4. Build a collage.jpg from the selection.
  5. Write day_photos.json with the ordered list + collage + a content hash.

Run directly for a one-off build, or let watch_day_photos.py call it on change.
"""

import os
import io
import json
import hashlib
import time

import numpy as np
from PIL import Image, ImageOps, ImageFilter

# ---- paths (relative to the mapofus project root) ----
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, ".."))
DAY_DIR = os.path.join(PROJECT_ROOT, "happiano_assets", "day_photos")
COLLAGE_PATH = os.path.join(DAY_DIR, "collage.jpg")
MANIFEST_PATH = os.path.join(PROJECT_ROOT, "happiano_assets", "day_photos.json")

VALID_EXT = {".jpg", ".jpeg", ".png", ".heic", ".webp", ".gif"}
IGNORE_NAMES = {"collage.jpg"}  # don't treat our own output as an input

MAX_PHOTOS = 9           # cap the number shown / collaged
MIN_SHARPNESS = 12.0     # below this, treat as too blurry (tuned conservatively)
DEDUPE_HAMMING = 6       # aHash hamming distance <= this => near-duplicate


def list_inputs():
    if not os.path.isdir(DAY_DIR):
        return []
    files = []
    for name in os.listdir(DAY_DIR):
        if name.startswith("."):
            continue
        if name in IGNORE_NAMES:
            continue
        ext = os.path.splitext(name)[1].lower()
        if ext in VALID_EXT:
            files.append(os.path.join(DAY_DIR, name))
    return sorted(files)


def load_image(path):
    """Load + apply EXIF orientation. Returns a PIL RGB image, or None."""
    try:
        img = Image.open(path)
        img = ImageOps.exif_transpose(img)
        return img.convert("RGB")
    except Exception as e:
        print(f"  ! skip (unreadable): {os.path.basename(path)} ({e})")
        return None


def sharpness_score(img):
    """Variance of an edge-detected, grayscale, downscaled image.
    Higher = crisper. Robust and fast; no OpenCV needed."""
    small = img.convert("L")
    small.thumbnail((512, 512))
    edges = small.filter(ImageFilter.FIND_EDGES)
    arr = np.asarray(edges, dtype=np.float32)
    return float(arr.var())


def ahash(img, hash_size=8):
    """Average hash for near-duplicate detection. Returns an int bitfield."""
    small = img.convert("L").resize((hash_size, hash_size), Image.BILINEAR)
    arr = np.asarray(small, dtype=np.float32)
    avg = arr.mean()
    bits = (arr > avg).flatten()
    val = 0
    for b in bits:
        val = (val << 1) | int(b)
    return val


def hamming(a, b):
    return bin(a ^ b).count("1")


def score_photo(img):
    sharp = sharpness_score(img)
    megapixels = (img.width * img.height) / 1_000_000.0
    # resolution helps a little, but sharpness dominates
    score = sharp + min(megapixels, 12.0) * 2.0
    return score, sharp, megapixels


def rel_to_project(path):
    """Return a web path relative to the project root, using forward slashes."""
    rel = os.path.relpath(path, PROJECT_ROOT)
    return rel.replace(os.sep, "/")


def build():
    inputs = list_inputs()
    print(f"[build] {len(inputs)} candidate photo(s) in {rel_to_project(DAY_DIR)}")

    scored = []
    for path in inputs:
        img = load_image(path)
        if img is None:
            continue
        score, sharp, mp = score_photo(img)
        h = ahash(img)
        scored.append({
            "path": path, "img": img, "score": score,
            "sharp": sharp, "mp": mp, "hash": h,
            "w": img.width, "h": img.height,
        })
        tag = "blurry" if sharp < MIN_SHARPNESS else "ok"
        print(f"  - {os.path.basename(path):40s} sharp={sharp:7.1f} "
              f"mp={mp:4.1f} score={score:7.1f} [{tag}]")

    # drop blurry (but never drop everything — if ALL are blurry, keep them)
    crisp = [s for s in scored if s["sharp"] >= MIN_SHARPNESS]
    pool = crisp if crisp else scored

    # sort best-first
    pool.sort(key=lambda s: s["score"], reverse=True)

    # dedupe near-identical bursts: keep highest-scoring of each look-alike group
    kept = []
    for cand in pool:
        dup = False
        for k in kept:
            if hamming(cand["hash"], k["hash"]) <= DEDUPE_HAMMING:
                dup = True
                break
        if not dup:
            kept.append(cand)

    selection = kept[:MAX_PHOTOS]
    print(f"[build] selected {len(selection)} of {len(scored)} "
          f"(dropped {len(scored) - len(crisp)} blurry, "
          f"{len(pool) - len(kept)} duplicate burst shots)")

    # photos as objects with dimensions, so the page can lay them out in a
    # justified wall (filling the available space) rather than a tiny baked image
    photos = [
        {"src": rel_to_project(s["path"]), "w": s["w"], "h": s["h"]}
        for s in selection
    ]

    # a content hash so the page can tell when something actually changed
    sig = hashlib.sha1()
    for s in selection:
        sig.update(os.path.basename(s["path"]).encode())
        sig.update(str(int(s["score"])).encode())
    content_hash = sig.hexdigest()[:12]

    manifest = {
        "generated_at": int(time.time()),
        "count": len(selection),
        "photos": photos,
        "hash": content_hash,
    }
    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"[build] wrote manifest -> {rel_to_project(MANIFEST_PATH)} "
          f"(hash {content_hash})")

    # free image memory
    for s in scored:
        try:
            s["img"].close()
        except Exception:
            pass

    return manifest


if __name__ == "__main__":
    build()
