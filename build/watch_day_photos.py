#!/usr/bin/env python3
"""
watch_day_photos.py
-------------------
Watches the single drop folder (happiano_assets/day_photos/) and re-runs
build_day_photos.build() whenever photos are added, changed, or removed.

No external dependencies — it just polls the folder's state (names + sizes +
mtimes) a few times a second. Leave it running on the day; drop photos into
the folder and the Happiano page auto-refreshes.

Usage (from the mapofus folder):
    python3 build/watch_day_photos.py
"""

import os
import time

import build_day_photos as builder

POLL_SECONDS = 1.5
# wait until a file stops growing before building (avoids half-copied photos)
SETTLE_SECONDS = 1.0


def folder_state():
    """A snapshot of the drop folder: {name: (size, mtime)}."""
    state = {}
    d = builder.DAY_DIR
    if not os.path.isdir(d):
        return state
    for name in os.listdir(d):
        if name.startswith(".") or name in builder.IGNORE_NAMES:
            continue
        ext = os.path.splitext(name)[1].lower()
        if ext not in builder.VALID_EXT:
            continue
        try:
            st = os.stat(os.path.join(d, name))
            state[name] = (st.st_size, int(st.st_mtime))
        except OSError:
            pass
    return state


def main():
    os.makedirs(builder.DAY_DIR, exist_ok=True)
    print("=" * 60)
    print("Watching for photos in:")
    print("   " + builder.rel_to_project(builder.DAY_DIR))
    print("Drop photos in that folder — the page updates automatically.")
    print("Press Ctrl+C to stop.")
    print("=" * 60)

    # initial build so the manifest exists even before any change
    try:
        builder.build()
    except Exception as e:
        print(f"[watch] initial build error: {e}")

    last = folder_state()
    while True:
        try:
            time.sleep(POLL_SECONDS)
            cur = folder_state()
            if cur != last:
                print("\n[watch] change detected — letting files settle…")
                # settle: wait until the folder stops changing
                while True:
                    time.sleep(SETTLE_SECONDS)
                    again = folder_state()
                    if again == cur:
                        break
                    cur = again
                print("[watch] rebuilding…")
                try:
                    builder.build()
                except Exception as e:
                    print(f"[watch] build error: {e}")
                last = cur
        except KeyboardInterrupt:
            print("\n[watch] stopped.")
            break
        except Exception as e:
            print(f"[watch] loop error: {e}")
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
