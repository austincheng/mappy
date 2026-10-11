DROP YOUR PHOTOS HERE (on the day).

This is the single folder for "photos of the day." Just copy any number of
photos (.jpg / .jpeg / .png / .heic) into THIS folder.

While the watcher is running, every time photos are added/changed it will:
  1. score them (sharpness + resolution), drop blurry ones,
  2. dedupe near-identical burst shots,
  3. pick the best ones,
  4. build a collage (collage.jpg) + write a manifest (day_photos.json),
and the Happiano page will auto-refresh to show them — no reload needed.

To start the watcher (from the Mappy folder):
    python3 build/watch_day_photos.py

(You can also run a one-off build with:  python3 build/build_day_photos.py)
