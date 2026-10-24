# Day-of photos — hands-free via Gmail

On the proposal day you don't transfer any files. You just **email the photos
to yourself** from your phone, and `fetch_day_photos.py` pulls them in and puts
them where they belong:

- **All** emailed photos  → `happiano_assets/day_photos/` → the Happiano page
  builds its **collage** from them automatically.
- **One** photo (the largest/best) → `final_slideshow/` as the **last slide**
  of the map finale, and `final_slideshow/manifest.json` is updated to end with
  it.

## One-time setup

1. Enable **2-Step Verification** on your Google account.
2. Create a Google **App Password**:
   myaccount.google.com → Security → App passwords → generate one.
   (16 chars like `abcd efgh ijkl mnop`; spaces don't matter.)
3. Create `.env` (already gitignored) next to the script:

   ```
   GMAIL_USER=youraddress@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

   Optional overrides:
   ```
   PROPOSAL_MARKER=PROPOSAL-PHOTOS     # secret word that must be in the subject
   PROPOSAL_POLL_SECONDS=15            # how often to check Gmail
   ```

## On the day

1. Start the fetcher (from the `mappy` folder):
   ```
   python3 fetch_day_photos.py
   ```
   Leave it running. (It also rebuilds the Happiano collage itself, so you do
   NOT also need `` — though running that too is harmless.)

2. From your phone, pick the nice shots and **email them to yourself** (to
   `GMAIL_USER`), with the secret marker anywhere in the **Subject**:

   ```
   Subject:  anything PROPOSAL-PHOTOS anything
   ```

   Attach the photos (most mail apps attach as images — that's what we read).

3. Within ~15s the photos appear: the Happiano collage refreshes, and the map
   finale's last slide becomes your best day-of shot. Each matching email is
   processed once (then marked read), so you can send more than one email and
   each batch is added.

## Notes / tips

- Send a **test email** beforehand (same subject marker) to confirm your creds
  and that the photos land — then delete the test photos from
  `happiano_assets/day_photos/` and re-run, OR just mark it read and clear the
  folder before the real day.
- "Best" for the single final-slideshow photo = largest file (a decent proxy).
  If you want a *specific* one as the finale, email that one **alone** last, or
  rename the chosen file in `final_slideshow/` to `999999_dayof.jpg`.
- The collage handles real photos well (no bad cropping); it only over-merged
  look-alikes in a synthetic test with solid-color images.
- Nothing is committed with secrets: `.env` and `.env` are gitignored.
