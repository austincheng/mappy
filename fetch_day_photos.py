#!/usr/bin/env python3
"""
fetch_day_photos.py — pull the DAY-OF photos from Gmail, hands-free.

On the proposal day you just email yourself photos. The SUBJECT decides where
each email's photos go (so you control the finale exactly — no guessing):

  * Subject contains "Day"    -> all photos join the Happiano COLLAGE
                                 (happiano_assets/day_photos/).
  * Subject contains "Final"  -> the photo you send becomes the FINAL SLIDE of
                                 the map finale (final_slideshow/, manifest
                                 updated to end with it). Send exactly the one
                                 you want; if you send several "Final" emails,
                                 the most recent one wins.

No manual file transfer needed — just send the email(s).

----------------------------------------------------------------------------
SETUP (one time)
----------------------------------------------------------------------------
1. Turn on 2-Step Verification for your Google account.
2. Create an *App Password*: myaccount.google.com -> Security -> App passwords.
   (16 characters, e.g. "abcd efgh ijkl mnop" — spaces don't matter.)
3. Put your creds in the environment (NOT in code). Easiest: a gitignored
   .env file next to this script:

       GMAIL_USER=youraddress@gmail.com
       GMAIL_APP_PASSWORD=abcdefghijklmnop

   (This script auto-loads a .env in its own folder.)

----------------------------------------------------------------------------
RUN (on the day — or to test beforehand)
----------------------------------------------------------------------------
    python3 fetch_day_photos.py

Then, from your phone, email photos to yourself (or to GMAIL_USER). Put the
right keyword in the SUBJECT so random mail can't trigger it:

    Subject: ... Day ...     -> photos go into the Happiano collage
    Subject: ... Final ...   -> that photo becomes the final slideshow slide

Leave it running. Each new matching, UNREAD email is processed once (then
marked read). This script also rebuilds the Happiano collage itself, so you do
NOT also need  (running it too is harmless).
"""

import os
import io
import re
import sys
import ssl
import time
import json
import email
import imaplib
import datetime
from email.header import decode_header

# ---------------------------------------------------------------------------
# config
# ---------------------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = HERE                                            # mappy/ (script lives here)
DAY_DIR = os.path.join(PROJECT_ROOT, "happiano_assets", "day_photos")
FINAL_DIR = os.path.join(PROJECT_ROOT, "final_slideshow")
FINAL_MANIFEST = os.path.join(FINAL_DIR, "manifest.json")

# Two kinds of email, matched by a keyword in the SUBJECT:
#   DAY_MARKER   -> photos join the Happiano collage (day_photos/)
#   FINAL_MARKER -> the photo you send becomes the final slideshow's LAST slide
# (random mail can't trigger either, since the keyword must be in the subject.)
DAY_MARKER = os.environ.get("PROPOSAL_DAY_MARKER", "Day")
FINAL_MARKER = os.environ.get("PROPOSAL_FINAL_MARKER", "Final")
POLL_SECONDS = int(os.environ.get("PROPOSAL_POLL_SECONDS", "15"))
IMAP_HOST = "imap.gmail.com"
VALID_EXT = {".jpg", ".jpeg", ".png", ".heic", ".webp", ".gif"}

# The final day-of slide is named YYMMDD.jpg (see set_final_dayof),
# from the sender's email date, and appended as the last slide of the finale.

# If True, rebuild the Happiano collage in-process after saving (so you don't
# also need  running). Safe either way.
BUILD_COLLAGE = True


def load_dotenv():
    """Minimal .env loader (KEY=VALUE lines) from this folder; no dependency."""
    path = os.path.join(HERE, ".env")
    if not os.path.isfile(path):
        return
    for line in io.open(path, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def log(*a):
    print("[fetch]", *a, flush=True)


def email_date_yymmdd(msg):
    """The email's sent date as YYMMDD (local date). Falls back to today if the
    Date header is missing or unparseable."""
    from email.utils import parsedate_to_datetime
    try:
        dt = parsedate_to_datetime(msg.get("Date"))
        if dt is not None:
            # normalize to local date
            if dt.tzinfo is not None:
                dt = dt.astimezone()
            return dt.strftime("%y%m%d")
    except Exception:
        pass
    return datetime.datetime.now().strftime("%y%m%d")


def decode_subject(raw):
    if not raw:
        return ""
    parts = decode_header(raw)
    out = ""
    for text, enc in parts:
        if isinstance(text, bytes):
            out += text.decode(enc or "utf-8", errors="replace")
        else:
            out += text
    return out


def connect():
    user = os.environ.get("GMAIL_USER")
    pw = os.environ.get("GMAIL_APP_PASSWORD")
    if not user or not pw:
        log("ERROR: set GMAIL_USER and GMAIL_APP_PASSWORD (env or .env).")
        sys.exit(1)
    pw = pw.replace(" ", "")  # app passwords are shown with spaces
    ctx = ssl.create_default_context()
    M = imaplib.IMAP4_SSL(IMAP_HOST, ssl_context=ctx)
    M.login(user, pw)
    return M


def unique_path(folder, name):
    base, ext = os.path.splitext(name)
    cand = os.path.join(folder, name)
    i = 1
    while os.path.exists(cand):
        cand = os.path.join(folder, f"{base}_{i}{ext}")
        i += 1
    return cand


def save_attachments(msg, dest_dir):
    """Save image attachments to dest_dir. Returns list of saved file paths."""
    saved = []
    for part in msg.walk():
        if part.get_content_maintype() == "multipart":
            continue
        disp = (part.get("Content-Disposition") or "").lower()
        filename = part.get_filename()
        ctype = part.get_content_type() or ""
        is_image = ctype.startswith("image/") or (
            filename and os.path.splitext(filename)[1].lower() in VALID_EXT
        )
        if not is_image:
            continue
        if filename:
            filename = decode_subject(filename)
            ext = os.path.splitext(filename)[1].lower()
        else:
            ext = "." + (ctype.split("/")[-1] if "/" in ctype else "jpg")
        if ext not in VALID_EXT:
            ext = ".jpg"
        # name by receive time so files sort nicely and never collide across emails
        stamp = datetime.datetime.now().strftime("%y%m%d_%H%M%S")
        name = f"email_{stamp}{ext}"
        payload = part.get_payload(decode=True)
        if not payload:
            continue
        os.makedirs(dest_dir, exist_ok=True)
        dst = unique_path(dest_dir, name)
        with open(dst, "wb") as f:
            f.write(payload)
        saved.append(dst)
        log("saved attachment ->", os.path.relpath(dst, PROJECT_ROOT))
    return saved


DAYOF_MARKER = os.path.join(FINAL_DIR, ".dayof")  # records the current day-of filename


def set_final_dayof(src_path, date_str):
    """Copy the chosen photo into final_slideshow as the LAST slide, named like
    the other slides (YYMMDD.jpg from the email's date), and update the manifest
    so it ends with it. A tiny .dayof sidecar records which file is the day-of
    slide so re-sending 'Final' cleanly replaces it (no duplicates), even though
    the filename is a plain date."""
    os.makedirs(FINAL_DIR, exist_ok=True)
    name = f"{date_str}.jpg"
    dst = os.path.join(FINAL_DIR, name)
    rel = "final_slideshow/" + name

    # figure out the PREVIOUS day-of file to replace (from the sidecar, plus the
    # old 999999 placeholder if it's still around)
    prev = set()
    if os.path.isfile(DAYOF_MARKER):
        try:
            prev.add(open(DAYOF_MARKER).read().strip())
        except Exception:
            pass
    for f in os.listdir(FINAL_DIR):
        if "999999" in f:
            prev.add(f)
    # remove the previous day-of image file(s), unless it's the same name we're writing
    for f in prev:
        if f and f != name:
            try: os.remove(os.path.join(FINAL_DIR, f))
            except OSError: pass

    with open(src_path, "rb") as r, open(dst, "wb") as w:
        w.write(r.read())
    with open(DAYOF_MARKER, "w") as f:
        f.write(name)

    manifest = []
    if os.path.isfile(FINAL_MANIFEST):
        try:
            manifest = json.load(open(FINAL_MANIFEST))
        except Exception:
            manifest = []
    # drop the previous day-of entries (by basename) + any old placeholder, then
    # append ours as the final slide
    prev_basenames = {p for p in prev} | {name}
    manifest = [m for m in manifest
                if os.path.basename(m) not in prev_basenames
                and "999999" not in os.path.basename(m)]
    manifest.append(rel)
    with open(FINAL_MANIFEST, "w") as f:
        json.dump(manifest, f, indent=2)
    log("final slideshow day-of set ->", rel, f"({len(manifest)} slides)")


def rebuild_collage():
    if not BUILD_COLLAGE:
        return
    try:
        sys.path.insert(0, os.path.join(HERE, "happiano_assets"))
        import build_day_photos
        # reload in case it was imported earlier this run
        import importlib
        importlib.reload(build_day_photos)
        build_day_photos.build()
        log("rebuilt Happiano collage")
    except Exception as e:
        log("collage rebuild skipped/failed:", e)


def _search_unseen(M, marker):
    typ, data = M.search(None, "UNSEEN", "SUBJECT", f'"{marker}"')
    return data[0].split() if typ == "OK" and data and data[0] else []


def process_once(M):
    M.select("INBOX")
    final_ids = _search_unseen(M, FINAL_MARKER)
    day_ids = _search_unseen(M, DAY_MARKER)

    # If a subject somehow contains BOTH markers, treat it as FINAL only
    # (the more specific intent) and don't also run it through the collage.
    final_set = set(final_ids)
    day_ids = [i for i in day_ids if i not in final_set]

    n_day = 0
    collage_dirty = False

    # ---- FINAL emails: the photo you send becomes the finale's last slide.
    # Process in order; the LAST final email (newest id) wins.
    tmp_dir = os.path.join(FINAL_DIR, "_incoming")
    for num in final_ids:
        typ, md = M.fetch(num, "(RFC822)")
        if typ != "OK":
            continue
        msg = email.message_from_bytes(md[0][1])
        log("FINAL email:", decode_subject(msg.get("Subject"))[:70])
        saved = save_attachments(msg, tmp_dir)
        if saved:
            # exactly what you sent: the first attachment of this email.
            # Name the finale slide by the email's SENT date (YYMMDD).
            set_final_dayof(saved[0], email_date_yymmdd(msg))
            for p in saved:      # clean the temp copies
                try: os.remove(p)
                except OSError: pass
        M.store(num, "+FLAGS", "\\Seen")
    try:
        if os.path.isdir(tmp_dir) and not os.listdir(tmp_dir):
            os.rmdir(tmp_dir)
    except OSError:
        pass

    # ---- DAY emails: all photos join the Happiano collage folder.
    for num in day_ids:
        typ, md = M.fetch(num, "(RFC822)")
        if typ != "OK":
            continue
        msg = email.message_from_bytes(md[0][1])
        log("DAY email:", decode_subject(msg.get("Subject"))[:70])
        saved = save_attachments(msg, DAY_DIR)
        if saved:
            n_day += len(saved)
            collage_dirty = True
        M.store(num, "+FLAGS", "\\Seen")

    if collage_dirty:
        rebuild_collage()

    return n_day, len(final_ids)


def main():
    load_dotenv()
    log(f"watching Gmail every {POLL_SECONDS}s")
    log(f"  subject contains {DAY_MARKER!r}   -> Happiano collage "
        f"({os.path.relpath(DAY_DIR, PROJECT_ROOT)})")
    log(f"  subject contains {FINAL_MARKER!r} -> final slideshow last slide "
        f"({os.path.relpath(FINAL_DIR, PROJECT_ROOT)})")
    while True:
        try:
            M = connect()
            try:
                n_day, n_final = process_once(M)
                if n_day or n_final:
                    log(f"done: {n_day} collage photo(s), {n_final} final email(s) this cycle")
            finally:
                try:
                    M.logout()
                except Exception:
                    pass
        except KeyboardInterrupt:
            log("stopped.")
            break
        except Exception as e:
            log("error (will retry):", e)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
