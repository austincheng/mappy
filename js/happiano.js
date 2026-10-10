/* =============================================================
 * happiano.js — the final-pin "happiano" phase.
 * -------------------------------------------------------------
 * A faithful recreation of the original Happiano screen:
 *   - title bar + pink corner heart showing the 夕 count (1151)
 *   - center text + collage photo
 *   - a full, labeled 3-octave piano across the bottom
 *   - playing keys reveals a grid of memory photos (like the original)
 *
 * The original hamburger / side-nav is intentionally dropped.
 * Audio uses the same AudioSynth engine as the original.
 *
 * Public API:
 *   Happiano.show()  -> build (once) + reveal
 *   Happiano.hide()  -> hide
 * ============================================================= */

const Happiano = (() => {
  const XI_NUMBER = 1151;              // 夕 — the current day-count
  const TITLE = `今天是我們${XI_NUMBER}夕...`;  // top-row title

  const CENTER_OCTAVE = 4;             // middle C
  const WHITE_W = 40;                  // key metrics (match original)
  const WHITE_H = 200;
  const BLACK_W = 30;
  const BLACK_H = 120;

  // notes in keyboard order, C -> B
  const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  // computer-key -> "note,octaveOffset" (from the original noteLookup.js)
  const KEY_TO_NOTE = {
    Q: "C,-1", 2: "C#,-1", E: "D,-1", 4: "D#,-1", T: "E,-1", Y: "F,-1",
    7: "F#,-1", I: "G,-1", 9: "G#,-1", P: "A,-1", "-": "A#,-1", "]": "B,-1",
    A: "C,0", W: "C#,0", D: "D,0", R: "D#,0", G: "E,0", H: "F,0",
    U: "F#,0", K: "G,0", O: "G#,0", ";": "A,0", "[": "A#,0", "'": "B,0",
    Z: "C,1", S: "C#,1", C: "D,1", F: "D#,1", B: "E,1", N: "F,1",
    J: "F#,1", ",": "G,1", L: "G#,1", ".": "A,1", ARROWLEFT: "A#,1", "/": "B,1",
  };

  // invert KEY_TO_NOTE -> noteText -> display key
  const NOTE_TO_KEY = {};
  for (const k in KEY_TO_NOTE) {
    NOTE_TO_KEY[KEY_TO_NOTE[k]] = k === "ARROWLEFT" ? "<-" : k;
  }

  let root = null;
  let built = false;
  let synth = null;
  const keyEls = {};          // noteText -> element
  const pressed = new Set();

  function getSynth() {
    if (!synth) { synth = new AudioSynth(); synth.setVolume(0.5); }
    return synth;
  }

  function playNote(noteText) {
    if (pressed.has(noteText)) return;
    pressed.add(noteText);

    const el = keyEls[noteText];
    if (el) el.classList.add("active");

    const [note, offStr] = noteText.split(",");
    const octave = CENTER_OCTAVE + (parseInt(offStr, 10) || 0);
    try {
      const src = getSynth().generate("piano", note, octave, 2);
      new Audio(src).play().catch(() => {});
    } catch (err) {
      console.warn("[happiano] could not play", noteText, err);
    }
  }

  function releaseNote(noteText) {
    if (!pressed.has(noteText)) return;
    pressed.delete(noteText);
    const el = keyEls[noteText];
    if (el) el.classList.remove("active");
  }

  /* ---- build the full 3-octave labeled keyboard ---- */
  function buildKeyboard(kb) {
    let whiteIndex = 0;
    for (let oct = -1; oct <= 1; oct++) {
      NOTES.forEach((note) => {
        const noteText = note + "," + oct;
        const key = document.createElement("div");
        const isBlack = note[1] === "#";
        key.className = "hap-key " + (isBlack ? "black" : "white");

        if (isBlack) {
          key.style.width = BLACK_W + "px";
          key.style.height = BLACK_H + "px";
          key.style.left = (WHITE_W * (whiteIndex - 1)) + 25 + "px";
        } else {
          key.style.width = WHITE_W + "px";
          key.style.height = WHITE_H + "px";
          key.style.left = WHITE_W * whiteIndex + "px";
          whiteIndex++;
        }

        key.addEventListener("mousedown", (e) => { e.preventDefault(); playNote(noteText); });
        key.addEventListener("mouseup", () => releaseNote(noteText));
        key.addEventListener("mouseleave", () => releaseNote(noteText));
        key.addEventListener("touchstart", (e) => { e.preventDefault(); playNote(noteText); }, { passive: false });
        key.addEventListener("touchend", (e) => { e.preventDefault(); releaseNote(noteText); });

        keyEls[noteText] = key;
        kb.appendChild(key);
      });
    }
    kb.style.width = WHITE_W * whiteIndex + "px";
  }

  /* ---- computer-keyboard play ---- */
  let metaDown = false;
  function onKeyDown(e) {
    const up = (e.key || "").toUpperCase();
    if (up === "META" || up === "CONTROL") { metaDown = true; return; }
    if (metaDown || e.repeat) return;
    if (up in KEY_TO_NOTE) playNote(KEY_TO_NOTE[up]);
  }
  function onKeyUp(e) {
    const up = (e.key || "").toUpperCase();
    if (up === "META" || up === "CONTROL") { metaDown = false; return; }
    if (up in KEY_TO_NOTE) releaseNote(KEY_TO_NOTE[up]);
  }

  /* ---- day-photos: poll the manifest built by watch_day_photos.py ---- */
  const MANIFEST_URL = "happiano_assets/day_photos.json";
  const POLL_MS = 2000;
  let pollTimer = null;
  let lastHash = null;
  let currentPhotos = null;      // [{src, w, h}] from the manifest
  let currentBust = "";          // cache-busting query for photo URLs

  function renderDayPhotos(manifest) {
    const box = root && root.querySelector("#hap-day-photos");
    if (!box) return;

    if (!manifest || !manifest.count) {
      currentPhotos = null;
      box.innerHTML = '<div class="hap-day-empty">waiting for photos of the day…</div>';
      return;
    }

    // normalize to [{src, w, h}] (older manifests had plain strings)
    currentPhotos = (manifest.photos || []).map((p) =>
      typeof p === "string" ? { src: p, w: 4, h: 3 } : p
    );
    currentBust = "?v=" + (manifest.hash || manifest.generated_at || Date.now());
    layoutDayPhotos();
  }

  /* Lay the day photos out as a justified wall (Google-Photos style) that
   * FILLS the available box in both width and height. We try every sensible
   * number of rows, lay the photos out justified for each, and pick the
   * arrangement whose total height best fills the available height without
   * overflowing — so the photos are as large as possible with minimal empty
   * space, adapting to any screen aspect ratio. Photos keep their true aspect
   * ratio (no cropping). */
  function layoutDayPhotos() {
    const box = root && root.querySelector("#hap-day-photos");
    if (!box || !currentPhotos || !currentPhotos.length) return;

    const GAP = 10;
    const availW = box.clientWidth || 760;

    // Measure against FIXED containers so there's no feedback loop (the box is
    // centered, so its own position shifts as its content grows). The center
    // region (.hap-center) is flex:1 with a stable height; subtract the text
    // block's height and some spacing to get the room available for photos.
    const center = root.querySelector(".hap-center");
    const textEl = root.querySelector(".hap-content-text");
    const centerH = center ? center.clientHeight : (window.innerHeight * 0.5);
    const textH = textEl ? textEl.offsetHeight : 60;
    const availH = Math.max(200, centerH - textH - 36);

    const photos = currentPhotos;
    const n = photos.length;
    const ars = photos.map((p) => (p.w || 4) / (p.h || 3));

    // Justified height of a row = fit its aspect-ratios to the available width.
    function rowHeight(rowIdxs) {
      const sumAR = rowIdxs.reduce((a, i) => a + ars[i], 0);
      const gaps = GAP * (rowIdxs.length - 1);
      return (availW - gaps) / sumAR;
    }

    // Split the photos (in order) into R rows, balanced so each row has a
    // similar total aspect-ratio -> similar justified height -> uniform sizes.
    function splitIntoRows(R) {
      const totalAR = ars.reduce((a, b) => a + b, 0);
      const targetPerRow = totalAR / R;
      const rows = [];
      let row = [], rowAR = 0;
      for (let i = 0; i < n; i++) {
        row.push(i); rowAR += ars[i];
        // close the row once it reaches its share, unless we must keep photos
        // for the remaining rows
        const rowsLeft = R - rows.length;
        const photosLeft = n - (i + 1);
        if (rows.length < R - 1 &&
            (rowAR >= targetPerRow || photosLeft <= (R - rows.length - 1))) {
          rows.push(row); row = []; rowAR = 0;
        }
      }
      if (row.length) rows.push(row);
      return rows;
    }

    // Try every row count; pick the one whose total height is CLOSEST to the
    // available height (best fill, least empty space). Slight overflow is fine
    // — we scale the winner down to fit. This avoids the trap of dropping to a
    // tiny 1-row layout just because the ideal 2-row layout is 2% too tall.
    let best = null;
    const maxRows = Math.min(n, 6);
    for (let R = 1; R <= maxRows; R++) {
      const rows = splitIntoRows(R);
      if (rows.length !== R) continue; // couldn't make exactly R rows
      const heights = rows.map(rowHeight);
      const total = heights.reduce((a, b) => a + b, 0) + GAP * (rows.length - 1);
      // distance from a perfect fill; mild penalty for overflow beyond ~12%
      const over = total > availH ? (total - availH) / availH : 0;
      const dist = Math.abs(availH - total) + (over > 0.12 ? total : 0);
      if (!best || dist < best.dist) best = { rows, heights, total, dist };
    }
    if (!best) {
      const rows = splitIntoRows(1);
      best = { rows, heights: rows.map(rowHeight) };
      best.total = best.heights[0];
    }

    // Scale DOWN to fit the available height if the chosen layout overflows.
    // (We never scale up: rows are justified to the full width, so enlarging
    // height would push them past the width.)
    let scale = 1;
    if (best.total > availH) scale = (availH * 0.99) / best.total;

    let html = "";
    best.rows.forEach((rowIdxs, ri) => {
      const h = best.heights[ri] * scale;
      html += '<div class="hap-wall-row">';
      rowIdxs.forEach((i) => {
        const w = ars[i] * h;
        html += `<img class="hap-wall-img" src="${photos[i].src}${currentBust}" ` +
                `style="height:${Math.round(h)}px;width:${Math.round(w)}px" alt="" />`;
      });
      html += "</div>";
    });
    box.innerHTML = html;
  }

  async function pollManifest() {
    try {
      const res = await fetch(MANIFEST_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return; // manifest not built yet — leave the waiting state
      const manifest = await res.json();
      if (manifest.hash !== lastHash) {
        lastHash = manifest.hash;
        renderDayPhotos(manifest);
        console.log("[happiano] day photos updated:", manifest.count, "photo(s)");
      }
    } catch (e) {
      // no manifest / offline — fine, just keep waiting
    }
  }

  function startPolling() {
    if (pollTimer) return;
    pollManifest();                       // immediate first check
    pollTimer = setInterval(pollManifest, POLL_MS);
  }
  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  /* ---- heart click animation — the ORIGINAL happiano animation, verbatim ----
   * Hand-rolled sparkle: particles spawn at the heart center and fly OUTWARD
   * (explicit translate from 0,0 -> dx,dy), with a subtle heart pop. Fully
   * controlled in CSS/JS so the direction is unambiguous. */
  let heartTimeline = null; // (unused now; kept for API stability)
  function setupHeartAnimation(heart) {
    // nothing to pre-build; the sparkle is created per-click in heartBurst()
  }

  function heartBurst() {
    const heart = root && root.querySelector("#hap-heart");
    if (!heart) return;

    // 1) subtle pop on the heart (shrink slightly, spring back)
    heart.classList.remove("hap-pop");
    void heart.offsetWidth;              // reflow so the animation retriggers
    heart.classList.add("hap-pop");

    // 2) sparkle particles flying OUTWARD from the heart center
    const rect = heart.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const COLORS = ["#ff5c8a", "#ffffff", "#ffd0e0", "#ff9ec2"];
    const N = 12;
    for (let i = 0; i < N; i++) {
      const s = document.createElement("div");
      s.className = "hap-sparkle";
      const angle = (Math.PI * 2 * i) / N + (Math.random() - 0.5) * 0.25;
      const dist = 55 + Math.random() * 40;         // how far it flies out
      const size = 7 + Math.random() * 7;
      s.style.left = cx + "px";
      s.style.top = cy + "px";
      s.style.width = size + "px";
      s.style.height = size + "px";
      s.style.background = COLORS[i % COLORS.length];
      s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      s.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }
  }

  /* ---- build the page once ---- */
  function build() {
    if (built) return;
    root = document.getElementById("happiano");
    if (!root) { console.error("[happiano] #happiano not found"); return; }

    root.innerHTML = `
      <div class="hap-top">
        <h1 class="hap-title">${TITLE}</h1>
        <div class="hap-heart" id="hap-heart">
          <p class="hap-heart-text">${XI_NUMBER}</p>
        </div>
      </div>

      <div class="hap-center">
        <div class="hap-content">
          <p class="hap-content-text">
            I hope you can make me the happianoest man in the world...
          </p>
          <div class="hap-day-photos" id="hap-day-photos">
            <div class="hap-day-empty">waiting for photos of the day…</div>
          </div>
        </div>
      </div>

      <div class="hap-keyboard-holder">
        <div class="hap-keyboard" id="hap-keyboard"></div>
      </div>
    `;

    buildKeyboard(root.querySelector("#hap-keyboard"));

    const heart = root.querySelector("#hap-heart");
    if (heart) {
      setupHeartAnimation(heart);
      heart.addEventListener("click", () => heartBurst());
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", () => layoutDayPhotos());
    built = true;
  }

  function show() { build(); if (root) root.classList.remove("hidden"); startPolling(); }
  function hide() { if (root) root.classList.add("hidden"); stopPolling(); }

  if (typeof Sequencer !== "undefined") {
    Sequencer.on(Sequencer.PHASES.FINAL_PIN, () => {
      console.log("[happiano] FINAL_PIN -> show happiano page");
      show();
    });
  }

  return { show, hide, XI_NUMBER };
})();

// open directly for development: index.html#happiano
if (window.location.hash === "#happiano") {
  window.addEventListener("DOMContentLoaded", () => Happiano.show());
}
