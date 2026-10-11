/* =============================================================
 * map.js — PHASE 1: the cute, animated "Mappy"
 * -------------------------------------------------------------
 * A flat, storybook world map rendered on <canvas>:
 *   - Friendly green land with a soft drop-shadow edge (sticker
 *     / paper-cutout look) on a flat cyan ocean, drawn from a
 *     vendored world GeoJSON projected with d3-geo so real
 *     lat/long land correctly.
 *   - Cute scattered decorations (pine trees, hills, clouds, a
 *     compass rose) for charm.
 *   - Teardrop pins she clicks to open memories. Gentle idle
 *     drift so it feels alive.
 *   - FULL manual control: scroll/trackpad to zoom (toward the
 *     cursor), click-drag to pan, double-click to zoom in,
 *     +/- keys. So dense areas can be zoomed into freely.
 *   - When all pins are discovered, the final "here" pin reveals
 *     and clicking it hands off to the next phase (FINAL_PIN).
 *
 * Fully offline — no map tiles. Data-driven from js/places.js.
 * ============================================================= */

(function () {
  "use strict";

  const canvas = document.getElementById("map");
  const ctx = canvas.getContext("2d");

  // ---- Cute flat palette (matches the reference illustration) ----
  const C = {
    ocean: "#49c3ec",
    land: "#5bd05b",
    landShadow: "#2faa46",
    landStroke: "#2b9e40",
    tree: "#2f9e4f",
    treeDark: "#237a3d",
    hill: "#49bf55",
    cloud: "#ffffff",
    pin: "#e8463c",
    pinVisited: "#f0a73e",
    pinDiscovered: "#e8463c",
    here: "#e8463c",
    marker: "#f6b94a"
  };

  // ---- Camera: scale (zoom) + center lon/lat ----
  // Fly animations use a shared progress t (0..1) so zoom AND pan finish
  // together. s0/lon0/lat0 are the start of the current fly.
  const camera = {
    scale: 1, lon: 10, lat: 25,
    tScale: 1, tLon: 10, tLat: 25,
    t: 1, s0: 1, lon0: 10, lat0: 25, flyDur: 0.9
  };
  const MIN_SCALE = 0.9, MAX_SCALE = 80;

  // ---- Heart options (subtle only) ----
  //  sprinkle    : scatter little hearts across the land (cute, subtle)
  //  pinkOutline : soft pink glowing outline around the continents
  //  (the big-heart experiments — mask/landHeart/overlay — are off and
  //   kept only as dormant toggles for reference)
  const HEART = {
    mask: false,
    landHeart: false,
    overlay: false,
    sprinkle: true,
    pinkOutline: true,
    glow: "rgba(232,70,120,0.45)",
    outline: "rgba(255,122,162,0.65)",
    beat: true,
    color: "#ff6f91",
    colorDark: "#e8577e",
    landStroke: "#ff7aa2",
    landGlow: "rgba(255,122,162,0.55)"
  };

  // Build a heart-shaped Path2D centered in the viewport, scaled to fill it.
  // `k` is a live scale multiplier (used for the beat).
  function heartPath(k = 1, marginMul = 1.9) {
    const p = new Path2D();
    // Fit a unit heart (param eqn) into the viewport.
    const margin = marginMul * k;
    const sx = (W / 2) * margin / 16;   // 16 = heart param x-extent
    const sy = (H / 2) * margin / 17;   // 17 = heart param y-extent
    const s = Math.min(sx, sy);
    const cx = W / 2, cy = H / 2;
    for (let t = 0; t <= Math.PI * 2 + 0.02; t += 0.02) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const px = cx + x * s;
      const py = cy - y * s; // canvas y is down
      if (t === 0) p.moveTo(px, py); else p.lineTo(px, py);
    }
    p.closePath();
    return p;
  }

  let world = null, projection = null, path = null;
  let caDetail = null; // detailed California coastline (loaded at boot)
  let photoManifest = null; // slug -> [photo paths] from card_photos/manifest.json
  const CA_BB = { minLon: -125.5, maxLon: -114, minLat: 32, maxLat: 42.5 };
  const CARIB_BB = { minLon: -70.3, maxLon: -68.0, minLat: 11.9, maxLat: 12.9 };
  const FAROE_BB = { minLon: -7.8, maxLon: -6.2, minLat: 61.3, maxLat: 62.5 };
  // High-res coastline overlays drawn when zoomed in over their region.
  const detailLayers = [
    { geo: null, bb: CA_BB,    file: "libs/california_detail.geojson" },
    { geo: null, bb: CARIB_BB, file: "libs/caribbean_detail.geojson" },
    { geo: null, bb: FAROE_BB, file: "libs/faroe_detail.geojson" }
  ];
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let W = 0, H = 0, driftT = 0;
  let userInteracting = false; // pauses idle drift once the user grabs control

  // ---- State ----
  const discovered = new Set();
  const dismissed = new Set();      // visited indices consumed (home/badminton/memories)
  const viewed = new Set();         // dream stars that have been opened (recolor only)
  const totalVisited = PLACES.visited.length;
  let hereRevealed = false;
  let hovered = null;
  let openIndex = null;             // the visited index whose card is currently open

  // Partition pins by kind.
  function kindOf(i) { return PLACES.visited[i].kind || "memory"; }
  function parseDate(s) { const t = Date.parse(s || ""); return isNaN(t) ? 0 : t; }
  const memoryOrder = PLACES.visited.map((p, i) => i)
    .filter(i => kindOf(i) === "memory")
    .sort((a, b) => parseDate(PLACES.visited[a].date) - parseDate(PLACES.visited[b].date));
  const homeBadmintonIdx = PLACES.visited.map((p, i) => i)
    .filter(i => kindOf(i) === "home" || kindOf(i) === "badminton" || kindOf(i) === "tesla");   // consumable
  const dreamIdx = PLACES.visited.map((p, i) => i)
    .filter(i => kindOf(i) === "dream");                                // permanent

  // Tight San Francisco Bay Area box (roughly the 9-county region). Used ONLY
  // for the "max 3 Bay" cap and the click-to-max-zoom — NOT the same as CA_BB
  // (which covers the whole state for coastline detail). LA/San Diego are in
  // CA_BB but NOT in the Bay, so they count as normal (non-Bay) locations.
  const BAY_BB = { minLon: -122.8, maxLon: -121.5, minLat: 36.9, maxLat: 38.3 };
  function inBay(i) {
    const c = PLACES.visited[i].coords;
    return c[0] >= BAY_BB.minLat && c[0] <= BAY_BB.maxLat && c[1] >= BAY_BB.minLon && c[1] <= BAY_BB.maxLon;
  }
  function locKey(i) { const c = PLACES.visited[i].coords; return c[0].toFixed(2) + "," + c[1].toFixed(2); }

  // Consumable pins in strict priority/date order: home, badminton, memories.
  const consumableOrder = [...homeBadmintonIdx, ...memoryOrder];

  // ---- Location groups ----
  // Multiple stories can share one location. We group consumable pins by
  // locKey; each group is a QUEUE of story indices in order. A location shows
  // ONE heart; clicking cycles through its stories; the heart only disappears
  // once every story there is dismissed. "Max 3 Bay" = 3 distinct Bay groups.
  const groupOrder = [];                 // locKeys in first-appearance (chrono) order
  const groupStories = new Map();        // locKey -> [indices in order]
  for (const i of consumableOrder) {
    const k = locKey(i);
    if (!groupStories.has(k)) { groupStories.set(k, []); groupOrder.push(k); }
    groupStories.get(k).push(i);
  }
  // The active (earliest undismissed) story index for a location, or null if done.
  function activeStory(k) {
    for (const i of groupStories.get(k)) if (!dismissed.has(i)) return i;
    return null;
  }

  // Count of undismissed stories remaining at a location (used only to detect
  // in-window stacking).
  function remainingCount(k) {
    let n = 0; for (const i of groupStories.get(k)) if (!dismissed.has(i)) n++; return n;
  }

  // Visible rolling window — STORY-LEVEL, STRICT CHRONOLOGICAL ORDER.
  //  Take the next undismissed stories in order. Caps: <=8 stories total and
  //  <=3 DISTINCT California locations. STOP as soon as the next story would
  //  exceed either cap (no skipping).
  //  Stacking: if two windowed stories share a location, they collapse to ONE
  //  heart (the earlier one is the active face). Because stories are taken in
  //  order, a far-future repeat (e.g. a 2026 story at a 2023 location) is NOT
  //  in the window and never stacks — it simply appears later in the timeline.
  //  SPAN CAP: the window may never span more than MAX_SPAN positions from the
  //  oldest undismissed story to the newest shown. This stops her from only
  //  clicking the newer (often Bay) stories while old ones linger — she must
  //  clear the oldest before the window can creep forward, which forces an
  //  early zoom-out instead of endless local clicking.
  const MAX_STORIES = 8, MAX_CA_LOCS = 3, MAX_SPAN = 12;
  // position of each index within consumableOrder (chronological rank)
  const orderPos = new Map();
  consumableOrder.forEach((i, p) => orderPos.set(i, p));
  function windowStories() {
    const picked = [];
    const caLocs = new Set();
    let firstPos = null;
    for (const i of consumableOrder) {           // already in chronological order
      if (dismissed.has(i)) continue;
      const isCA = inBay(i);
      const k = locKey(i);
      if (picked.length >= MAX_STORIES) break;    // 9th story -> stop
      if (firstPos !== null && orderPos.get(i) - firstPos > MAX_SPAN) break; // too far from oldest -> stop
      if (isCA && !caLocs.has(k) && caLocs.size >= MAX_CA_LOCS) break; // 4th distinct Bay loc -> stop
      if (firstPos === null) firstPos = orderPos.get(i);
      picked.push(i);
      if (isCA) caLocs.add(k);
    }
    return picked;
  }

  // The pins to DRAW: collapse same-location stories within the window to the
  // earliest story at that location (one heart per location).
  function visibleWindow() {
    const picked = windowStories();
    const out = []; const seen = new Set();
    for (const i of picked) {
      const k = locKey(i);
      if (seen.has(k)) continue;   // a story at this spot already drawn (stack)
      seen.add(k); out.push(i);
    }
    return out;
  }

  // Stable decoration layout (seeded random so it doesn't jump each frame).
  let decorations = [];

  // ---- Projection / sizing ----
  function resize() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildProjection();
  }

  function rebuildProjection() {
    projection = d3.geoNaturalEarth1().fitExtent([[0, 0], [W, H]], { type: "Sphere" });
    const baseScale = projection.scale();
    // The hard MASK shrinks the world; landHeart ENLARGES it so continents
    // fill the (smaller) heart body. Overlay/sprinkle leave it full-size.
    const heartFit = HEART.mask ? 0.92 : (HEART.landHeart ? 1.35 : 1);
    projection.scale(baseScale * camera.scale * heartFit);
    const sc = projection([camera.lon, camera.lat]);
    const [tx, ty] = projection.translate();
    projection.translate([tx + (W / 2 - sc[0]), ty + (H / 2 - sc[1])]);
    path = d3.geoPath(projection, ctx);
  }

  // ---- Camera easing + helpers ----
  // Begin a fly: snapshot the start and reset shared progress to 0.
  function startFly() {
    camera.s0 = camera.scale; camera.lon0 = camera.lon; camera.lat0 = camera.lat;
    camera.t = 0;
  }
  function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  function easeCamera() {
    if (camera.t >= 1) return;    // not flying
    // Advance shared progress. Both zoom & pan use the SAME eased value, so
    // they reach the target on the same frame. ease-in-out so the zoom starts
    // slowly (taming the big early geometric jump that read as "too fast").
    camera.t = Math.min(1, camera.t + (1 / 60) / camera.flyDur);
    const e = easeInOut(camera.t);

    camera.scale = Math.exp(Math.log(camera.s0) + (Math.log(camera.tScale) - Math.log(camera.s0)) * e);
    camera.lon = camera.lon0 + (camera.tLon - camera.lon0) * e;
    camera.lat = camera.lat0 + (camera.tLat - camera.lat0) * e;

    clampCamera();
    rebuildProjection();
  }
  function flyTo(lon, lat, scale) {
    camera.tLon = lon; camera.tLat = lat;
    if (scale != null) camera.tScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
  }
  function clampScale(s) { return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s)); }

  // Keep the camera center within sane bounds so the map can't be dragged
  // off into empty space or wrapped around. The looser we are zoomed in,
  // the more we allow panning; zoomed out we keep it near the world center.
  function clampCamera() {
    // Use the larger of current/target scale so a click that starts a zoom-IN
    // opens the pan bounds immediately and can recenter on the target (otherwise
    // the zoomed-out bounds snap the center back and it never recenters).
    const s = Math.max(camera.scale, camera.tScale);
    // Longitude: allow more roaming when zoomed in, little when zoomed out.
    const lonRange = Math.min(170, 60 + (s - 1) * 55);
    const lonMin = 10 - lonRange, lonMax = 10 + lonRange;
    // Latitude: clamp tighter when zoomed out.
    const latRange = Math.min(78, 35 + (s - 1) * 30);
    const latMin = 15 - latRange, latMax = 15 + latRange;

    camera.lon = Math.max(lonMin, Math.min(lonMax, camera.lon));
    camera.lat = Math.max(latMin, Math.min(latMax, camera.lat));
    camera.tLon = Math.max(lonMin, Math.min(lonMax, camera.tLon));
    camera.tLat = Math.max(latMin, Math.min(latMax, camera.tLat));
  }

  // Zoom toward a screen point: keep the geo-coordinate under the cursor fixed.
  function zoomAt(screenX, screenY, factor) {
    const before = projection.invert([screenX, screenY]);
    const newScale = clampScale(camera.tScale * factor);
    // apply immediately to targets, then recenter so `before` stays under cursor
    camera.tScale = newScale;
    camera.scale = newScale;      // snap scale for an immediate, responsive feel
    rebuildProjection();
    const after = projection.invert([screenX, screenY]);
    if (before && after) {
      camera.lon = camera.tLon = camera.lon + (before[0] - after[0]);
      camera.lat = camera.tLat = camera.lat + (before[1] - after[1]);
      clampCamera();
      rebuildProjection();
    }
    camera.t = 1;         // manual zoom cancels any in-progress fly
    userInteracting = true;
  }

  // ---- Decoration layout (seeded) ----
  function seededRand(seed) { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }
  function buildDecorations() {
    // Scatter trees/hills on land-ish latitudes/longitudes. We test against the
    // projection at draw time; here we just pick candidate lon/lat + type.
    const rnd = seededRand(1337);
    // Scattered trees/hills/mountains removed per request — leave empty.
    const spots = [];
    const TYPES = ["tree"];
    decorations = spots.map((s) => ({
      lon: s[0] + (rnd() - 0.5) * 10,
      lat: s[1] + (rnd() - 0.5) * 7,
      type: TYPES[Math.floor(rnd() * TYPES.length)],
      scale: 0.9 + rnd() * 0.6,
      phase: rnd() * Math.PI * 2
    }));
    // clouds + planes drifting in the ocean/sky
    cloudSpots = [[-140, 10], [-30, 30], [60, -30], [160, 20], [-170, -20], [-35, -15], [50, 5]];
    planeSpots = [
      [-50, 45], [70, 10], [150, -10], [-20, 20], [110, 40], [-120, 15], [30, 60]
    ].map((s) => ({ lon: s[0], lat: s[1], phase: rnd() * Math.PI * 2, scale: 1.7 + rnd() * 0.8 }));
    // sailboats + birds in the ocean
    boatSpots = [[-40, 0], [80, -20], [-150, 30], [140, 10]].map((s) => ({
      lon: s[0], lat: s[1], phase: rnd() * Math.PI * 2, scale: 1.1 + rnd() * 0.4
    }));
    birdSpots = [[-80, 55], [20, 35], [120, 60], [-10, -30], [95, -5]].map((s) => ({
      lon: s[0], lat: s[1], phase: rnd() * Math.PI * 2, scale: 1 + rnd() * 0.5
    }));

    // Animated landmarks at real coordinates — concentrated where pins are
    // sparse so the map feels full and worldly. [lon, lat, type, size].
    // Removed where pins already live (Paris, Tokyo, Tanzania, Alaska).
    landmarks = [
      [-0.12, 51.50, "bigben", 1.3],    // London (UK — no pin)
      [-79, 44, "liberty", 1.9],        // inland near Toronto (US/Canada NE)
      [134, -25, "opera", 2.6],         // centered in Australia — bigger
      [24, 20, "pyramids", 2.2],        // Egypt/Libya/Chad/Sudan cross
      [80, 25, "taj", 2.3],             // India/Nepal region — bigger
      [-60, -5, "christ", 2.0],         // northern South America / N. Brazil
      [100, 60, "stbasil", 1.8],        // Russia (Moscow-ish, fills Siberia span)
      [104, 13, "angkor", 1.7],         // Southeast Asia (Angkor Wat, Cambodia)
      [47, 25, "mosque", 1.7],          // Middle East (Arabian peninsula)
      [16, 63, "longship", 1.7],        // Scandinavia (Norway/Sweden/Finland)
      [-71, -45, "peak", 1.9],          // Patagonia (Argentina/Chile)
      [24, -24, "elephant", 1.8]        // Southern Africa (South Africa/Botswana)
    ].map((l) => ({ lon: l[0], lat: l[1], type: l[2], size: l[3] || 1.3, phase: rnd() * Math.PI * 2 }));

    // Little hearts sprinkled across the land (Option: sprinkle).
    const heartSpots = [
      [-95, 40], [-70, -15], [15, 48], [35, 2], [100, 55],
      [115, 35], [25, -25], [130, -28], [-120, 50], [80, 28]
    ];
    heartDecor = heartSpots.map((s) => ({
      lon: s[0] + (rnd() - 0.5) * 10,
      lat: s[1] + (rnd() - 0.5) * 8,
      size: 7 + rnd() * 6,
      phase: rnd() * Math.PI * 2
    }));
  }
  let cloudSpots = [];
  let heartDecor = [];
  let planeSpots = [];
  let boatSpots = [];
  let birdSpots = [];
  let landmarks = [];

  // ---- Drawing primitives ----
  function drawTree(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // trunk
    ctx.fillStyle = "#7a5230";
    ctx.fillRect(-1.5, 4, 3, 5);
    // three stacked triangles
    ctx.fillStyle = C.tree;
    for (let i = 0; i < 3; i++) {
      const yy = 4 - i * 5;
      ctx.beginPath();
      ctx.moveTo(0, yy - 9);
      ctx.lineTo(7 - i * 1.2, yy);
      ctx.lineTo(-7 + i * 1.2, yy);
      ctx.closePath();
      ctx.fillStyle = i === 0 ? C.tree : (i === 1 ? "#36ad57" : "#44c062");
      ctx.fill();
    }
    ctx.restore();
  }
  function drawHill(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = C.hill;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 5, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(35,122,61,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-3, -2.5); ctx.lineTo(0, -4.5); ctx.lineTo(3, -2.5); ctx.stroke();
    ctx.restore();
  }
  function drawCloud(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = C.cloud;
    ctx.globalAlpha = 0.95;
    for (const [cx, cy, r] of [[-8, 0, 7], [0, -2, 9], [9, 0, 7], [0, 3, 8]]) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // A small cute filled heart (used for sprinkles).
  function drawMiniHeart(x, y, size, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    const s = size / 16;
    ctx.scale(s, s);
    ctx.beginPath();
    for (let t = 0; t <= Math.PI * 2 + 0.05; t += 0.08) {
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      if (t === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.lineWidth = 1.2; ctx.strokeStyle = stroke; ctx.stroke(); }
    ctx.restore();
  }

  // Snow-capped mountain
  function drawMountain(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-10, 6); ctx.lineTo(0, -10); ctx.lineTo(10, 6); ctx.closePath();
    ctx.fillStyle = "#8a94a6"; ctx.fill();
    // snow cap
    ctx.beginPath();
    ctx.moveTo(-3.5, -3.5); ctx.lineTo(0, -10); ctx.lineTo(3.5, -3.5);
    ctx.lineTo(1.5, -4.5); ctx.lineTo(0, -3); ctx.lineTo(-1.5, -4.5); ctx.closePath();
    ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.strokeStyle = "rgba(60,70,90,0.4)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(0, -10); ctx.lineTo(10, 6); ctx.stroke();
    ctx.restore();
  }

  // Palm tree
  function drawPalm(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = "#9c6b3f"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(2, 0, 1, -6); ctx.stroke();
    ctx.fillStyle = "#3fb968";
    for (const a of [-1.1, -0.4, 0.4, 1.1]) {
      ctx.save(); ctx.translate(1, -6); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(5, 0, 6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // Hot-air balloon
  function drawBalloon(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(0, -4, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ff8fab"; ctx.fill();
    ctx.strokeStyle = "#e86a8c"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 2); ctx.stroke();
    ctx.strokeStyle = "#b9843f"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-2, 1.5); ctx.lineTo(-1.5, 4); ctx.moveTo(2, 1.5); ctx.lineTo(1.5, 4); ctx.stroke();
    ctx.fillStyle = "#9c6b3f"; ctx.fillRect(-1.8, 4, 3.6, 2.4);
    ctx.restore();
  }

  // Little sun
  function drawSun(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = "#f7c948"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd84d"; ctx.fill();
    ctx.restore();
  }

  // Cactus
  function drawCactus(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "#3aa35a";
    const r = 2.2;
    // main stem
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r, -8, r * 2, 16, r) : ctx.rect(-r, -8, r * 2, 16); ctx.fill();
    // arms
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-6, -2, r * 1.6, 7, 1.5) : ctx.rect(-6, -2, r * 1.6, 7); ctx.fill();
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(4.5, -5, r * 1.6, 7, 1.5) : ctx.rect(4.5, -5, r * 1.6, 7); ctx.fill();
    ctx.fillRect(-6, -2, 2, -3); ctx.fillRect(4.5, -5, 2, -3);
    ctx.restore();
  }

  // Little airplane (travels in the sky/ocean)
  function drawPlane(x, y, s, angle = -0.5) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(s, s);
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#9fb6c9"; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(-4, 3); ctx.lineTo(-8, 2);
    ctx.lineTo(-5, 0); ctx.lineTo(-8, -2); ctx.lineTo(-4, -3); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, 6); ctx.lineTo(1, 1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, -6); ctx.lineTo(1, -1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Little sailboat
  function drawBoat(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // hull
    ctx.fillStyle = "#c25a3c";
    ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(7, 2); ctx.lineTo(4, 6); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();
    // mast + sail
    ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -9); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(1, -8); ctx.lineTo(1, 1); ctx.lineTo(6, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffd1dc";
    ctx.beginPath(); ctx.moveTo(-1, -6); ctx.lineTo(-1, 1); ctx.lineTo(-5, 1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // A little "m"-shaped bird (two wing arcs)
  function drawBird(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-3, -4, 0, 0);
    ctx.quadraticCurveTo(3, -4, 6, 0);
    ctx.stroke();
    ctx.restore();
  }
  function drawCompass(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const pts = 8;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const long = i % 2 === 0;
      const r = long ? 16 : 7;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - 0.18) * (r * 0.4), Math.sin(a - 0.18) * (r * 0.4));
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a + 0.18) * (r * 0.4), Math.sin(a + 0.18) * (r * 0.4));
      ctx.closePath();
      ctx.fillStyle = (i % 4 === 0) ? "#e8463c" : "#f6b94a";
      ctx.fill();
    }
    ctx.restore();
  }

  // ===== Animated landmark illustrations (fill sparse regions) =====
  function drawEiffel(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = "#8a6d4b"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-7, 10); ctx.lineTo(-2, -14); ctx.lineTo(2, -14); ctx.lineTo(7, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(-6.2, 5); ctx.lineTo(6.2, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2.2, -10); ctx.lineTo(2.2, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(0,-18); ctx.stroke();
    ctx.restore();
  }
  function drawTower(x, y, s, color) { // generic red tower (Tokyo Tower)
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = color || "#e8574a"; ctx.lineWidth = 1.4; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(-7, 11); ctx.lineTo(-1.5, -13); ctx.lineTo(1.5, -13); ctx.lineTo(7, 11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5.5, 3); ctx.lineTo(5.5, 3); ctx.moveTo(-3.3,-6); ctx.lineTo(3.3,-6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-13); ctx.lineTo(0,-17); ctx.stroke();
    ctx.restore();
  }
  function drawPyramids(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = "#e9c87a"; ctx.strokeStyle="#caa44f"; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(-12,8); ctx.lineTo(-3,-9); ctx.lineTo(5,8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2,8); ctx.lineTo(9,-3); ctx.lineTo(14,8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawChrist(x, y, s) { // Christ the Redeemer
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle="#79b45a"; ctx.beginPath(); ctx.ellipse(0,8,12,3,0,Math.PI,0); ctx.fill(); // hill
    ctx.fillStyle = "#dcdce0";
    ctx.beginPath(); ctx.arc(0,-9,2,0,Math.PI*2); ctx.fill(); // head
    ctx.fillRect(-1.3,-7,2.6,12); // body
    ctx.fillRect(-9,-5,18,2.2); // arms
    ctx.restore();
  }
  function drawTaj(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = "#f3eef0"; ctx.strokeStyle="#d8c9d0"; ctx.lineWidth=0.8;
    ctx.fillRect(-9,2,18,7); // base
    ctx.beginPath(); ctx.arc(0,2,5.5,Math.PI,0); ctx.fill(); // dome
    ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(1.2,-3.5); ctx.lineTo(-1.2,-3.5); ctx.closePath(); ctx.fill(); // spire
    ctx.fillRect(-11,-2,1.5,11); ctx.fillRect(9.5,-2,1.5,11); // minarets
    ctx.restore();
  }
  function drawLiberty(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = "#5a3522"; ctx.lineWidth = 0.7;   // dark outline for contrast
    ctx.fillStyle = "#c8622e";                           // warm copper (pops on green)
    ctx.beginPath(); ctx.arc(0,-7,2,0,Math.PI*2); ctx.fill(); ctx.stroke(); // head
    ctx.fillRect(-2,-5,4,11); ctx.strokeRect(-2,-5,4,11); // robe
    ctx.save(); ctx.translate(2,-6); ctx.rotate(-0.5); ctx.fillRect(0,-6,1.4,6);
    ctx.fillStyle="#ffd84d"; ctx.beginPath(); ctx.moveTo(0.7,-6); ctx.lineTo(2.5,-10); ctx.lineTo(-1,-10); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle="#8a4a2a"; ctx.fillRect(-4,6,8,3);     // pedestal
    ctx.restore();
  }
  function drawBigBen(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = "#c7a06a"; ctx.strokeStyle="#9c7b4a"; ctx.lineWidth=0.8;
    ctx.fillRect(-3,-10,6,19); ctx.strokeRect(-3,-10,6,19);
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(0,-5,1.8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#8a6a3f"; ctx.beginPath(); ctx.moveTo(-3,-10); ctx.lineTo(0,-15); ctx.lineTo(3,-10); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawOpera(x, y, s) { // Sydney Opera House
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = "#eef2f5"; ctx.strokeStyle="#c3ccd3"; ctx.lineWidth=0.7;
    for (const dx of [-6,-2,2,6]) { ctx.beginPath(); ctx.moveTo(dx-3,6); ctx.quadraticCurveTo(dx,-8,dx+3,6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle="#9fb6c9"; ctx.beginPath(); ctx.moveTo(-10,6); ctx.lineTo(10,6); ctx.stroke();
    ctx.restore();
  }
  function drawAcacia(x, y, s) { // safari acacia (Africa)
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle="#8a5a2b"; ctx.lineWidth=1.6; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(0,10); ctx.lineTo(0,-3); ctx.moveTo(0,-1); ctx.lineTo(-5,-5); ctx.moveTo(0,-1); ctx.lineTo(5,-5); ctx.stroke();
    ctx.fillStyle="#c9a24a"; ctx.beginPath(); ctx.ellipse(0,-7,11,4,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawAurora(x, y, s, t) { // northern lights (Alaska)
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth=2.4; ctx.lineCap="round";
    for (let i=0;i<3;i++){
      ctx.strokeStyle = ["rgba(120,230,170,0.75)","rgba(120,200,240,0.6)","rgba(190,150,240,0.55)"][i];
      ctx.beginPath();
      for (let xx=-12; xx<=12; xx+=2){ const yy = -6 + Math.sin((xx*0.4)+(t||0)*2 + i)*2.2 + i*3; if(xx===-12)ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // St. Basil's Cathedral (Russia) — colorful onion domes
  function drawStBasil(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const domes = [[-6, "#e8574a"], [0, "#4a8fe8"], [6, "#5bbf6a"]];
    for (const [dx, col] of domes) {
      ctx.fillStyle = "#d8c9a0"; ctx.fillRect(dx - 2, -2, 4, 10); // tower
      ctx.fillStyle = col;                                        // onion dome
      ctx.beginPath();
      ctx.moveTo(dx - 3, -2);
      ctx.quadraticCurveTo(dx - 3.5, -8, dx, -11);
      ctx.quadraticCurveTo(dx + 3.5, -8, dx + 3, -2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#b9843f"; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(dx, -11); ctx.lineTo(dx, -13); ctx.stroke();
    }
    ctx.restore();
  }

  // Angkor Wat (SE Asia) — three stacked temple towers
  function drawAngkor(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "#b8a07a"; ctx.strokeStyle = "#8a6f4a"; ctx.lineWidth = 0.7;
    ctx.fillRect(-11, 4, 22, 5);                 // base
    function tower(dx, h) {
      ctx.beginPath();
      ctx.moveTo(dx - 2.5, 4); ctx.lineTo(dx - 1.4, 4 - h); ctx.lineTo(dx, 4 - h - 2.5);
      ctx.lineTo(dx + 1.4, 4 - h); ctx.lineTo(dx + 2.5, 4); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    tower(-7, 9); tower(7, 9); tower(0, 14);
    ctx.restore();
  }

  // Simple mosque (Middle East) — dome + minaret
  function drawMosque(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "#eadfca"; ctx.strokeStyle = "#c6b188"; ctx.lineWidth = 0.7;
    ctx.fillRect(-8, 0, 16, 8);                  // building
    ctx.beginPath(); ctx.arc(0, 0, 5, Math.PI, 0); ctx.fillStyle = "#d8b24a"; ctx.fill(); // gold dome
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -8); ctx.strokeStyle = "#b9843f"; ctx.stroke(); // finial
    ctx.fillStyle = "#eadfca"; ctx.fillRect(9, -6, 2.4, 14); // minaret
    ctx.beginPath(); ctx.arc(10.2, -6, 1.6, Math.PI, 0); ctx.fillStyle = "#d8b24a"; ctx.fill();
    ctx.restore();
  }

  // Great Wall — a crenellated line following waypoints across northern China.
  const GREAT_WALL = [
    [97, 40], [103, 39.5], [108, 40], [112, 40.5], [116, 40.3],
    [119, 40], [122, 40.2], [124, 40.5]
  ];
  function drawGreatWall(z) {
    const pts = GREAT_WALL.map(c => projection(c)).filter(Boolean);
    if (pts.length < 2) return;
    ctx.save();
    // base wall
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = "#8a7a63";
    ctx.lineWidth = Math.max(2, 3 * z);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    // lighter top edge
    ctx.strokeStyle = "#b7a888";
    ctx.lineWidth = Math.max(1, 1.4 * z);
    ctx.stroke();
    // crenellations: little blocks spaced along the path
    ctx.fillStyle = "#6f6150";
    const step = 10 * z;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const segLen = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.floor(segLen / step));
      for (let j = 0; j <= n; j++) {
        const t = j / n;
        const bx = x0 + (x1 - x0) * t, by = y0 + (y1 - y0) * t;
        const w = Math.max(1.4, 1.8 * z);
        ctx.fillRect(bx - w / 2, by - w / 2 - 1.5 * z, w, w);
      }
    }
    ctx.restore();
  }

  // Viking longship (Scandinavia)
  function drawLongship(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // hull
    ctx.fillStyle = "#7a5230"; ctx.strokeStyle = "#5a3a20"; ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-11, 2); ctx.quadraticCurveTo(-13, -3, -10, -4);  // bow curl
    ctx.lineTo(10, -4); ctx.quadraticCurveTo(13, -3, 11, 2);     // stern curl
    ctx.lineTo(7, 6); ctx.lineTo(-7, 6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // shields along the side
    for (let i = -3; i <= 3; i++) { ctx.fillStyle = i % 2 ? "#c23b3b" : "#d8b24a"; ctx.beginPath(); ctx.arc(i * 2.6, -1, 1.1, 0, Math.PI * 2); ctx.fill(); }
    // mast + square sail
    ctx.strokeStyle = "#5a3a20"; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -15); ctx.stroke();
    ctx.fillStyle = "#eceae0"; ctx.fillRect(-6, -14, 12, 8);
    ctx.strokeStyle = "#c23b3b"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -6); ctx.stroke();
    ctx.restore();
  }

  // Snowy mountain peak (Patagonia / Andes)
  function drawPeak(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "#8f98a6"; ctx.strokeStyle = "#6b7482"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(-3, -8); ctx.lineTo(3, 2); ctx.lineTo(8, -4); ctx.lineTo(14, 8); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // snow caps
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(-6, -2); ctx.lineTo(-1, -3.5); ctx.lineTo(0, -1.5); ctx.lineTo(2, -3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(5.5, 0); ctx.lineTo(8, -0.8); ctx.lineTo(10.5, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Elephant (Southern Africa)
  function drawElephant(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "#9a9aa2"; ctx.strokeStyle = "#70707a"; ctx.lineWidth = 0.7;
    // body
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    // legs
    ctx.fillRect(-7, 4, 3, 6); ctx.fillRect(-1, 4, 3, 6); ctx.fillRect(4.5, 4, 3, 6);
    // head
    ctx.beginPath(); ctx.arc(9, -2, 5, 0, Math.PI * 2); ctx.fill();
    // ear
    ctx.beginPath(); ctx.ellipse(8, -3, 3, 4, 0, 0, Math.PI * 2); ctx.fillStyle = "#8a8a93"; ctx.fill();
    // trunk
    ctx.strokeStyle = "#9a9aa2"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(13, -1); ctx.quadraticCurveTo(16, 4, 14, 9); ctx.stroke();
    ctx.restore();
  }

  function drawPin(x, y, color, opts = {}) {
    const s = opts.scale || 1;
    const bob = opts.bob ? Math.sin(performance.now() / 500 + (opts.phase || 0)) * 2 : 0;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(s, s);
    // shadow on the ground
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(0, 2, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    // teardrop pin
    ctx.beginPath();
    ctx.arc(0, -12, 8, Math.PI * 0.15, Math.PI * 0.85, true);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();
    // white dot
    ctx.beginPath(); ctx.arc(0, -12, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill();
    if (opts.hovered) {
      ctx.beginPath(); ctx.arc(0, -12, 11, 0, Math.PI * 2);
      ctx.strokeStyle = color; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }

  // ---- Main draw loop ----
  function draw() {
    driftT += 0.004;
    easeCamera();
    // Gentle idle sway when not flying and fully zoomed out — move the camera
    // directly (the fly tween is inactive while idle).
    if (camera.t >= 1 && !userInteracting && camera.scale <= 1.02) {
      camera.lon = camera.tLon = 10 + Math.sin(driftT * 0.4) * 5;
      camera.lat = camera.tLat = 25 + Math.cos(driftT * 0.3) * 2.5;
      rebuildProjection();
    }

    // ---- Background ----
    ctx.clearRect(0, 0, W, H);
    if (HEART.mask) {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, HEART.blush);
      bg.addColorStop(1, HEART.blush2);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
    }

    const beat = HEART.beat ? (1 + Math.sin(driftT * 2.2) * 0.012) : 1;

    // ---- Optional hard mask (Option A): clip the map into a heart ----
    let hp = null;
    if (HEART.mask) {
      hp = heartPath(beat);
      ctx.save();
      ctx.shadowColor = HEART.glow; ctx.shadowBlur = 40;
      ctx.fillStyle = HEART.glow; ctx.fill(hp);
      ctx.restore();
      ctx.save();
      ctx.clip(hp);
    }

    // Ocean (fills the whole screen unless masked)
    ctx.fillStyle = C.ocean;
    ctx.fillRect(0, 0, W, H);

    // Zoom factor for decorations: grows sub-linearly (sqrt) so icons get a
    // bit bigger as you zoom in — enough to feel anchored to the map — but far
    // slower than the map itself, so they never swallow small islands.
    const z = Math.sqrt(camera.scale);

    // Ocean doodles: a few clouds + compass
    cloudSpots.forEach((c, i) => {
      const p = projection([c[0], c[1]]);
      if (p) drawCloud(p[0], p[1], (1.1 + 0.2 * Math.sin(driftT + i)) * z);
    });
    const comp = projection([-150, -45]);
    if (comp) drawCompass(comp[0], comp[1], 1.1 * z);

    // Little planes drifting across the sky
    planeSpots.forEach((pl) => {
      const driftLon = pl.lon + Math.sin(driftT * 0.3 + pl.phase) * 12;
      const p = projection([driftLon, pl.lat]);
      if (p) drawPlane(p[0], p[1], pl.scale * z, -0.35 + Math.sin(driftT * 0.3 + pl.phase) * 0.1);
    });

    // Sailboats bobbing on the ocean
    boatSpots.forEach((b) => {
      const driftLon = b.lon + Math.sin(driftT * 0.25 + b.phase) * 5;
      const p = projection([driftLon, b.lat]);
      if (p) drawBoat(p[0], p[1] + Math.sin(driftT * 1.5 + b.phase) * 1.2, b.scale * z);
    });

    // Birds gliding in the sky
    birdSpots.forEach((bd) => {
      const driftLon = bd.lon + Math.sin(driftT * 0.4 + bd.phase) * 10;
      const p = projection([driftLon, bd.lat]);
      if (p) drawBird(p[0], p[1] + Math.sin(driftT * 2 + bd.phase) * 2, bd.scale * z);
    });

    // ---- Option C: clip the LAND (and its decorations/pins) into a heart ----
    // Ocean already fills the screen; now everything green lives in a heart.
    let landClip = null;
    if (HEART.landHeart && !HEART.mask) {
      landClip = heartPath(beat, 1.35); // smaller than the land spread, so the heart silhouette shows
      ctx.save();
      ctx.clip(landClip);
    }

    // Land — drop-shadow offset first, then green on top (sticker look)
    if (world) {
      ctx.save();
      ctx.translate(0, 5);
      ctx.beginPath(); path(world); ctx.fillStyle = C.landShadow; ctx.fill();
      ctx.restore();

      ctx.beginPath(); path(world);
      ctx.fillStyle = C.land; ctx.fill();
      // Subtle warm coastline — thin, soft, no glow.
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = "rgba(230,120,150,0.35)";
      ctx.stroke();
    }

    // Detailed California coastline (shows SF Bay + Peninsula) — only drawn
    // High-res coastline overlays (California, Caribbean, …) — drawn when
    // zoomed in and the view overlaps the region, replacing the coarse world
    // blob with accurate shapes (SF Bay; Aruba & the Antilles).
    if (camera.scale > 2.5) {
      for (const layer of detailLayers) {
        if (!layer.geo) continue;
        const bb = layer.bb;
        const tl = projection([bb.minLon, bb.maxLat]);
        const br = projection([bb.maxLon, bb.minLat]);
        if (tl && br && br[0] > 0 && tl[0] < W && br[1] > 0 && tl[1] < H) {
          ctx.save();
          ctx.fillStyle = C.ocean;
          ctx.fillRect(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1]);
          ctx.beginPath(); path(layer.geo);
          ctx.fillStyle = C.land; ctx.fill();
          ctx.lineWidth = 1.1;
          ctx.strokeStyle = "rgba(230,120,150,0.35)";
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Cute decorations on the land (travel + nature symbols)
    decorations.forEach((d) => {
      const p = projection([d.lon, d.lat]);
      if (!p) return;
      const bob = Math.sin(driftT * 1.5 + d.phase) * 0.6 * z;
      const x = p[0], y = p[1] + bob, sc = d.scale * z;
      switch (d.type) {
        case "tree": drawTree(x, y, sc); break;
        case "hill": drawHill(x, y, sc); break;
        case "mountain": drawMountain(x, y, sc); break;
        case "palm": drawPalm(x, y, sc); break;
        case "balloon": drawBalloon(x, y - 2 * z, sc); break;
        case "sun": drawSun(x, y - 2 * z, sc * 0.9); break;
        case "cactus": drawCactus(x, y, sc); break;
        default: drawTree(x, y, sc);
      }
    });

    // Animated landmarks (real coordinates), a bit larger than decorations
    landmarks.forEach((lm) => {
      const p = projection([lm.lon, lm.lat]);
      if (!p) return;
      const lz = z * lm.size;
      const bob = Math.sin(driftT * 1.2 + lm.phase) * 0.5 * z;
      const x = p[0], y = p[1] + bob;
      switch (lm.type) {
        case "pyramids": drawPyramids(x, y, lz); break;
        case "christ": drawChrist(x, y, lz); break;
        case "taj": drawTaj(x, y, lz); break;
        case "liberty": drawLiberty(x, y, lz); break;
        case "bigben": drawBigBen(x, y, lz); break;
        case "opera": drawOpera(x, y, lz); break;
        case "stbasil": drawStBasil(x, y, lz); break;
        case "angkor": drawAngkor(x, y, lz); break;
        case "mosque": drawMosque(x, y, lz); break;
        case "longship": drawLongship(x, y, lz); break;
        case "peak": drawPeak(x, y, lz); break;
        case "elephant": drawElephant(x, y, lz); break;
      }
    });

    // Great Wall — a crenellated line across northern China.
    drawGreatWall(z);

    drawPins(z);

    // close the land-heart clip (no outline — the heart reads from the land itself)
    if (landClip) {
      ctx.restore();
    }

    // Close the mask clip (if any)
    if (HEART.mask && hp) {
      ctx.restore();
      ctx.save();
      ctx.lineWidth = 4; ctx.strokeStyle = HEART.outline;
      ctx.shadowColor = HEART.glow; ctx.shadowBlur = 18;
      ctx.stroke(hp);
      ctx.restore();
    }

    // ---- Overlay heart outline over the full map (Option B) ----
    if (HEART.overlay && !HEART.mask) {
      const op = heartPath(beat, 1.5); // inset so the outline frames the map
      ctx.save();
      ctx.lineWidth = 5;
      ctx.strokeStyle = HEART.outline;
      ctx.shadowColor = HEART.glow;
      ctx.shadowBlur = 22;
      ctx.stroke(op);
      ctx.restore();
    }

    requestAnimationFrame(draw);
  }

  // ---- Pins + hit testing ----
  const hit = { visited: [], future: [], here: null };
  // A heart used AS a map marker (the pins are hearts now).
  function drawHeartMarker(x, y, size, fill, dark, opts = {}) {
    const bob = Math.sin(performance.now() / 500 + (opts.phase || 0)) * (size * 0.1);
    const pop = opts.hovered ? 1.18 : 1;
    // The heart shape's mass sits a bit below its origin; nudge up so the
    // heart's visual CENTER lands exactly on the island coordinate.
    const cy = y + bob - size * 0.18;
    drawMiniHeart(x, cy, size * pop, fill, dark);
    if (opts.hovered) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, cy, size * 0.95, 0, Math.PI * 2);
      ctx.strokeStyle = fill; ctx.globalAlpha = 0.45; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  // ----- Alternate markers for home / badminton / dream pins -----
  function markerBob(size, phase) { return Math.sin(performance.now() / 500 + (phase || 0)) * (size * 0.1); }

  function drawStarMarker(x, y, size, opts = {}) {
    const cy = y + markerBob(size, opts.phase);
    const pop = opts.hovered ? 1.18 : 1;
    const R = size * 0.9 * pop, r = R * 0.45;
    ctx.save(); ctx.translate(x, cy);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rad = i % 2 === 0 ? R : r;
      const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    // Unviewed: bright gold. Viewed: a soft faded lilac so she can tell
    // which "someday" dreams she's already peeked at.
    ctx.fillStyle = opts.viewed ? "#c9b8e8" : "#ffd45e";
    ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = opts.viewed ? "#a892cf" : "#e8b23a"; ctx.stroke();
    ctx.restore();
  }

  function drawHomeMarker(x, y, size, opts = {}) {
    const cy = y + markerBob(size, opts.phase);
    const s = (size / 10) * (opts.hovered ? 1.18 : 1);
    ctx.save(); ctx.translate(x, cy); ctx.scale(s, s);
    // body
    ctx.fillStyle = "#ff8fa3"; ctx.strokeStyle = "#d85f78"; ctx.lineWidth = 1;
    ctx.fillRect(-6, -2, 12, 9); ctx.strokeRect(-6, -2, 12, 9);
    // roof
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(0, -10); ctx.lineTo(8, -2); ctx.closePath();
    ctx.fillStyle = "#e8577e"; ctx.fill(); ctx.stroke();
    // door
    ctx.fillStyle = "#fff"; ctx.fillRect(-1.6, 1, 3.2, 6);
    ctx.restore();
  }

  function drawShuttleMarker(x, y, size, opts = {}) {
    const cy = y + markerBob(size, opts.phase);
    const s = (size / 10) * (opts.hovered ? 1.18 : 1);
    ctx.save(); ctx.translate(x, cy); ctx.scale(s, s); ctx.rotate(0.35);
    // cork (ball) at bottom
    ctx.fillStyle = "#e8574a"; ctx.beginPath(); ctx.arc(0, 7, 3, 0, Math.PI * 2); ctx.fill();
    // feather skirt (trapezoid of lines)
    ctx.strokeStyle = "#ffffff"; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-3, 5); ctx.lineTo(-7, -8); ctx.lineTo(7, -8); ctx.lineTo(3, 5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#c9d2da";
    for (const dx of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(dx * 0.3, 5); ctx.lineTo(dx, -8); ctx.stroke(); }
    ctx.restore();
  }

  function drawTeslaMarker(x, y, size, opts = {}) {
    const cy = y + markerBob(size, opts.phase);
    const s = (size / 10) * (opts.hovered ? 1.18 : 1);
    ctx.save(); ctx.translate(x, cy); ctx.scale(s, s);
    const BLUE = "#1b2e8c", BLUE_DK = "#101d66", INK = "#111318";
    const GLASS = "#dfe6ee", WHEEL = "#17191d";
    ctx.lineJoin = "round"; ctx.lineCap = "round";

    // ---- Model 3 sedan silhouette (low, long fastback, facing left) ----
    ctx.beginPath();
    ctx.moveTo(-11.4, 2.6);                       // front bumper bottom
    ctx.quadraticCurveTo(-12.0, 1.0, -11.0, 0.4);
    ctx.quadraticCurveTo(-10.2, -0.1, -8.6, -0.5);    // low hood
    ctx.quadraticCurveTo(-6.4, -0.9, -4.6, -1.2);
    ctx.quadraticCurveTo(-2.6, -5.1, 1.4, -5.3);      // raked windshield -> low roof
    ctx.quadraticCurveTo(5.4, -5.3, 8.6, -3.6);       // long flat roof
    ctx.quadraticCurveTo(11.2, -2.5, 11.9, -0.3);     // sloped fastback trunk
    ctx.lineTo(11.8, 2.6);                        // tail bottom
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -5, 0, 3);
    g.addColorStop(0, "#2a3fb0"); g.addColorStop(1, BLUE_DK);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = INK; ctx.stroke();

    // ---- greenhouse: windshield + long side glass, split by B-pillar ----
    ctx.fillStyle = GLASS; ctx.strokeStyle = INK; ctx.lineWidth = 1.0;
    // front side glass
    ctx.beginPath();
    ctx.moveTo(-4.0, -1.3);
    ctx.quadraticCurveTo(-2.3, -4.6, 1.1, -4.75);
    ctx.lineTo(1.5, -1.5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // rear side glass (longer, tapering to the fastback)
    ctx.beginPath();
    ctx.moveTo(2.2, -4.7);
    ctx.quadraticCurveTo(5.6, -4.7, 8.2, -3.3);
    ctx.quadraticCurveTo(6.0, -1.6, 2.5, -1.5); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // ---- details: slim headlight, charge-port hint, beltline, door seam ----
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
    // slim swept headlight
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(-7.3, -0.1); ctx.quadraticCurveTo(-5.6, -0.7, -4.7, 0.2);
    ctx.quadraticCurveTo(-5.9, 0.5, -7.3, -0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    // lower bumper intake line
    ctx.beginPath(); ctx.moveTo(-11.0, 1.9); ctx.quadraticCurveTo(-7.5, 2.5, -4.0, 2.1); ctx.stroke();
    // beltline crease along the doors
    ctx.beginPath(); ctx.moveTo(-3.8, -0.9); ctx.quadraticCurveTo(3.5, -0.3, 10.4, -0.6); ctx.stroke();
    // door seam
    ctx.beginPath(); ctx.moveTo(1.7, -1.4); ctx.lineTo(2.0, 2.2); ctx.stroke();

    // ---- glossy black wheels with spoke hint ----
    for (const wx of [-6.4, 6.6]) {
      ctx.beginPath(); ctx.arc(wx, 2.7, 2.8, 0, Math.PI*2); ctx.fillStyle = WHEEL; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = "#2c3038"; ctx.beginPath(); ctx.arc(wx, 2.7, 1.3, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#3a3f48"; ctx.lineWidth = 0.5;
      for (let k = 0; k < 5; k++) { const a = k*Math.PI*2/5; ctx.beginPath(); ctx.moveTo(wx, 2.7); ctx.lineTo(wx+Math.cos(a)*1.2, 2.7+Math.sin(a)*1.2); ctx.stroke(); }
    }
    ctx.restore();
  }

  // Dispatch a marker by pin kind. Memory/here = heart.
  function drawMarker(kind, x, y, size, opts = {}) {
    const HEART_FILL = "#ff5c7a", HEART_DARK = "#e03a5c";
    switch (kind) {
      case "dream": drawStarMarker(x, y, size, opts); break;
      case "home": drawHomeMarker(x, y, size, opts); break;
      case "badminton": drawShuttleMarker(x, y, size, opts); break;
      case "tesla": drawTeslaMarker(x, y, size, opts); break;
      default: drawHeartMarker(x, y, size, HEART_FILL, HEART_DARK, opts);
    }
  }

  function drawPins(z = 1) {
    hit.visited.length = 0; hit.future.length = 0; hit.here = null;

    const HEART_FILL = "#ff5c7a";   // one consistent rose for every heart
    const HEART_DARK = "#e03a5c";

    // Heart size factor: SHRINKS as you zoom in (opposite of the decorations),
    // so that when the map spreads the California pins apart they get smaller
    // on screen and stop overlapping. Floored so they never vanish.
    // Icon size flows gently from ~22px (world view) to ~24px (zoomed in),
    // staying roughly constant on screen so it's comfortable at any zoom.
    const zoomT = Math.max(0, Math.min(1, (camera.scale - 1) / 8));
    const hz = 1.8 + 0.18 * zoomT;

    // Candidates = the capped rolling window (home/badminton/memories, which
    // already enforces <=8 global and <=3 Bay counting all three) + permanent
    // dream stars. Dreams don't count toward the caps.
    const candidates = [];
    visibleWindow().forEach((i) => { candidates.push({ index: i, kind: kindOf(i) }); });
    dreamIdx.forEach((i) => { candidates.push({ index: i, kind: "dream" }); });

    // DISPLAY merge: collapse pins that overlap on screen to the FIRST (oldest)
    // in chronological order. The threshold SHRINKS as you zoom in — so zoomed
    // out the Bay collapses to one oldest heart, and by the time you're zoomed
    // in the threshold is ~0 and all distinct pins (all 3 Bay) always render.
    const zoomFrac = Math.min(1, (camera.scale - 1) / (MAX_SCALE - 1));
    const mergePx = 40 * (1 - zoomFrac);   // 40px at world view -> 0px at max zoom
    const placed = [];
    for (const cand of candidates) {
      const pl = PLACES.visited[cand.index];
      const p = projection([pl.coords[1], pl.coords[0]]);
      if (!p) continue;
      let collide = false;
      for (const q of placed) { if (Math.hypot(p[0] - q[0], p[1] - q[1]) < mergePx) { collide = true; break; } }
      if (collide) continue;
      placed.push(p);
      const sz = 10 * hz;
      drawMarker(cand.kind, p[0], p[1], sz, {
        phase: cand.index,
        hovered: hovered && hovered.kind === "visited" && hovered.index === cand.index,
        viewed: cand.kind === "dream" && viewed.has(cand.index)
      });
      hit.visited.push({ x: p[0], y: p[1] - sz * 0.18, r: Math.max(12, 14 * hz), index: cand.index });
    }

    // final "here" — heart, a little larger
    if (hereRevealed) {
      const h = PLACES.here;
      const p = projection([h.coords[1], h.coords[0]]);
      if (p) {
        const sz = 15 * hz;
        drawMarker("memory", p[0], p[1], sz, { hovered: hovered && hovered.kind === "here" });
        hit.here = { x: p[0], y: p[1] - sz * 0.18, r: Math.max(14, 17 * hz) };
      }
    }
  }

  // ---- Memory card ----
  function showMemory(place) {
    const card = document.getElementById("memory-card");
    // English-only display for now. nameZh is retained in the data for a
    // future full-Chinese translation layer, but never shown inline here.
    document.getElementById("memory-place").textContent = place.name;
    document.getElementById("memory-date").textContent = place.date || "";
    document.getElementById("memory-note").textContent = place.note || "";

    // Resolve this place's curated photos from the manifest (by slug), falling
    // back to a single `place.photo` if present.
    const slug = placeSlug(place);
    let photos = (photoManifest && photoManifest[slug]) || (place.photo ? [place.photo] : []);
    startSlideshow(photos);

    card.classList.remove("hidden");
    requestAnimationFrame(() => card.classList.add("show"));
  }

  // ----- Auto-advancing cross-fade slideshow inside the card -----
  const slideA = () => document.getElementById("memory-photo-a");
  const slideB = () => document.getElementById("memory-photo-b");
  const bgA = () => document.getElementById("memory-bg-a");
  const bgB = () => document.getElementById("memory-bg-b");
  let slideList = [], slideIdx = 0, slideTimer = null, slideFront = "a";
  let SLIDE_HOLD = 1400;   // ms each photo is shown (adaptive; fade is 0.5s via CSS)

  function placeSlug(p) {
    const MONTHS = { january:1,february:2,march:3,april:4,may:5,june:6,july:7,
      august:8,september:9,october:10,november:11,december:12 };
    const cityOf = (name) => (name || "").split(",")[0].trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // strip accents (Húsavík -> Husavik)
      .replace(/[^A-Za-z0-9]+/g, " ").split(" ").filter(Boolean)
      .map(w => w[0].toUpperCase() + w.slice(1)).join("");
    const yymmdd = (date) => {
      const m = (date || "").toLowerCase().match(/([a-z]+)\s+(\d+),\s*(\d{4})/);
      if (!m) return null;
      const mo = MONTHS[m[1]]; if (!mo) return null;
      return String(parseInt(m[3],10)%100).padStart(2,"0")
        + String(mo).padStart(2,"0") + String(parseInt(m[2],10)).padStart(2,"0");
    };
    if (p.kind === "home") return "home";
    if (p.kind === "badminton") return "badminton";
    if (p.kind === "tesla") return "tesla";
    if (p.kind === "dream") return "dream_" + cityOf(p.name).toLowerCase();
    const ymd = yymmdd(p.date);
    return ymd ? ymd + "_" + cityOf(p.name) : cityOf(p.name);
  }

  const vidEl = () => document.getElementById("memory-video");
  const isVideo = (src) => /\.(mp4|mov|m4v|webm)$/i.test(src || "");

  function setLayer(which, src) {
    const img = which === "a" ? slideA() : slideB();
    const bg = which === "a" ? bgA() : bgB();
    img.src = src; bg.src = src;
    img.classList.add("active"); bg.classList.add("active");
  }
  function clearLayer(which) {
    const img = which === "a" ? slideA() : slideB();
    const bg = which === "a" ? bgA() : bgB();
    img.classList.remove("active"); bg.classList.remove("active");
  }

  // Adaptive hold: lots of photos -> quicker; few photos -> linger a bit.
  function holdFor(count) {
    if (count <= 3) return 2200;
    if (count <= 6) return 1600;
    if (count <= 12) return 1200;
    if (count <= 24) return 950;
    return 750;                        // big trip folders breeze through
  }

  function showPhoto(idx) {
    const v = vidEl();
    v.pause(); v.classList.remove("active"); v.style.display = "none";
    [slideA(), slideB(), bgA(), bgB()].forEach(el => el.style.display = "");
    const back = slideFront === "a" ? "b" : "a";
    setLayer(back, slideList[idx]);
    clearLayer(slideFront);
    slideFront = back;
  }
  function showVideo(idx) {
    // hide the photo layers, show+play the video; advance when it ends.
    [slideA(), slideB()].forEach(el => el.classList.remove("active"));
    const v = vidEl();
    bgA().classList.remove("active"); bgB().classList.remove("active");
    v.style.display = ""; v.classList.add("active");
    v.src = slideList[idx];
    v.currentTime = 0;
    const onEnd = () => { v.removeEventListener("ended", onEnd); if (slideList.length > 1) advanceSlide(); };
    v.addEventListener("ended", onEnd);
    const p = v.play(); if (p && p.catch) p.catch(() => {});
  }

  function startSlideshow(photos) {
    stopSlideshow();
    slideList = photos || []; slideIdx = 0; slideFront = "a";
    [slideA(), slideB(), bgA(), bgB()].forEach(el => el.classList.remove("active"));
    const v = vidEl(); v.pause(); v.classList.remove("active"); v.style.display = "none";
    const empty = !slideList.length;
    [slideA(), slideB(), bgA(), bgB()].forEach(el => el.style.display = empty ? "none" : "");
    if (empty) return;
    SLIDE_HOLD = holdFor(slideList.length);
    presentSlide(0);
  }
  function presentSlide(idx) {
    if (slideTimer) { clearTimeout(slideTimer); slideTimer = null; }
    if (isVideo(slideList[idx])) {
      showVideo(idx);                  // advances on 'ended'
    } else {
      showPhoto(idx);
      if (slideList.length > 1) slideTimer = setTimeout(advanceSlide, SLIDE_HOLD);
    }
  }
  function advanceSlide() {
    if (slideList.length < 2) return;
    slideIdx = (slideIdx + 1) % slideList.length;
    presentSlide(slideIdx);
  }
  function stopSlideshow() {
    if (slideTimer) { clearTimeout(slideTimer); slideTimer = null; }
    const v = vidEl(); if (v) { v.pause(); v.removeAttribute("src"); v.load && v.load(); }
  }

  function hideMemory() {
    const card = document.getElementById("memory-card");
    card.classList.remove("show");
    stopSlideshow();
    setTimeout(() => card.classList.add("hidden"), 350);
  }

  // ---- Interaction ----
  // Zoom to the given target scale AND center the given lon/lat.
  function centerOn(lon, lat, scale) {
    userInteracting = true;
    camera.tScale = scale;
    camera.tLon = lon;
    camera.tLat = lat;
    clampCamera();
    // Longer dives for bigger zoom changes so they stay gentle.
    const zoomSpan = Math.abs(Math.log((scale || camera.scale) / camera.scale));
    camera.flyDur = Math.min(2.6, 1.2 + zoomSpan * 0.28);
    startFly();
  }

  function discover(index) {
    // Opening a new pin dismisses whatever was already open (moving on = dismiss).
    if (openIndex != null && openIndex !== index) dismissOpen();
    const pl = PLACES.visited[index];
    openIndex = index;              // remember which pin's card is open
    // Zoom level: per-pin override (pl.zoom) wins; else Bay pins fly all the
    // way in; else a moderate default.
    const scale = pl.zoom != null ? pl.zoom : (inBay(index) ? MAX_SCALE : 7);
    centerOn(pl.coords[1], pl.coords[0], scale);
    showMemory(pl);
  }

  // Called when the memory card is dismissed (✕). Dreams are permanent: they
  // stay on the map but get marked "viewed" (recolored). Everything else is
  // consumed. Reveal "here" once all memories are done.
  function dismissOpen() {
    if (openIndex != null) {
      if (kindOf(openIndex) === "dream") viewed.add(openIndex);
      else dismissed.add(openIndex);
      openIndex = null;
    }
    const allMemoriesDone = memoryOrder.every(i => dismissed.has(i));
    if (allMemoriesDone && !hereRevealed) {
      setTimeout(revealHere, 400);
    }
  }

  function revealHere() {
    hideMemory(); hereRevealed = true;
    centerOn(PLACES.here.coords[1], PLACES.here.coords[0], 4);
  }

  function hitTest(mx, my) {
    if (hit.here && Math.hypot(mx - hit.here.x, my - hit.here.y) <= hit.here.r) return { kind: "here" };
    for (const b of hit.visited) if (Math.hypot(mx - b.x, my - b.y) <= b.r) return { kind: "visited", index: b.index };
    return null;
  }

  // ---- Pan (drag) + zoom (wheel) ----
  let dragging = false, dragMoved = false, lastX = 0, lastY = 0;

  canvas.addEventListener("mousedown", (e) => {
    dragging = true; dragMoved = false; lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener("mousemove", (e) => {
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
      // Convert pixel drag into lon/lat shift using the projection at two points.
      const a = projection.invert([W / 2, H / 2]);
      const b = projection.invert([W / 2 - dx, H / 2 - dy]);
      if (a && b) {
        camera.lon = camera.tLon = camera.lon + (b[0] - a[0]);
        camera.lat = camera.tLat = camera.lat + (b[1] - a[1]);
        camera.t = 1;   // manual pan cancels any in-progress fly
        clampCamera();
        rebuildProjection();
      }
      lastX = e.clientX; lastY = e.clientY;
      userInteracting = true;
    } else {
      hovered = hitTest(e.clientX, e.clientY);
      canvas.style.cursor = hovered ? "pointer" : "grab";
    }
  });
  window.addEventListener("mouseup", () => { dragging = false; });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  canvas.addEventListener("dblclick", (e) => {
    zoomAt(e.clientX, e.clientY, 1.6);
  });

  canvas.addEventListener("click", (e) => {
    if (dragMoved) return; // was a pan, not a click
    const h = hitTest(e.clientX, e.clientY);
    if (!h) {
      // Clicked empty map: only act if a pin is currently open. Dismiss it
      // (and zoom out unless it was a Bay pin — closeAndZoomOut handles that).
      if (openIndex != null) closeAndZoomOut();
      return;
    }
    if (h.kind === "visited") discover(h.index);
    else if (h.kind === "here") Sequencer.go(Sequencer.PHASES.FINAL_PIN, { here: PLACES.here });
  });

  // Are any un-dismissed CLICKABLE pins (hearts / home / tesla / badminton)
  // still visible in the CURRENT viewport? Dream STARS are intentionally
  // excluded — they're permanent, so they should never hold the zoom. Used to
  // decide whether dismissing should zoom out.
  function anyPinOnScreen() {
    const inView = (coords) => {
      const p = projection([coords[1], coords[0]]);
      return p && p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H;
    };
    for (const i of visibleWindow()) if (inView(PLACES.visited[i].coords)) return true;
    return false;   // stars (dreamIdx) deliberately NOT counted
  }

  // Dismiss the open pin (window advances) and ease back out to the full map
  // ONLY if nothing is left to click in the current view. A dream star ALWAYS
  // zooms out (stars don't hold the view).
  function closeAndZoomOut() {
    const wasDream = openIndex != null && kindOf(openIndex) === "dream";
    hideMemory();
    dismissOpen();                 // removes the just-open pin from the window first
    if (!hereRevealed && (wasDream || !anyPinOnScreen())) {
      // No clickable pins left on screen (or it was a star) — ease back out.
      userInteracting = false;
      camera.tScale = 1;
      camera.tLon = camera.lon;
      camera.tLat = camera.lat;
      camera.flyDur = 0.9;
      startFly();
    }
    // Otherwise clickable pins remain visible here — stay zoomed in.
  }

  document.getElementById("memory-close").addEventListener("click", closeAndZoomOut);

  // Keyboard: +/- zoom (centered), h = reveal here, r = reset, 0 = reset view
  window.addEventListener("keydown", (e) => {
    if (e.key === "=" || e.key === "+") zoomAt(W / 2, H / 2, 1.3);
    if (e.key === "-" || e.key === "_") zoomAt(W / 2, H / 2, 1 / 1.3);
    if (e.key === "0") { userInteracting = false; camera.tScale = 1; camera.tLon = camera.lon; camera.tLat = camera.lat; camera.flyDur = 0.9; startFly(); }
    if (e.key === "h" && !hereRevealed) { PLACES.visited.forEach((_, i) => dismissed.add(i)); revealHere(); }
    if (e.key === "r") location.reload();
  });

  window.addEventListener("resize", resize);

  // ---- Boot ----
  fetch("libs/world-110m.geojson")
    .then(r => r.json())
    .then(geo => {
      world = geo;
      buildDecorations();
      resize();
      Sequencer.go(Sequencer.PHASES.MAP);
      requestAnimationFrame(draw);
    })
    .catch(err => {
      console.error("Failed to load world map:", err);
      alert("Could not load the world map file (libs/world-110m.geojson).");
    });

  // Detailed California coastline (optional enhancement; non-blocking).
  // Load each high-res coastline overlay (non-blocking).
  detailLayers.forEach((layer) => {
    fetch(layer.file)
      .then(r => r.json())
      .then(geo => { layer.geo = geo; })
      .catch(err => console.warn("Detail layer not loaded:", layer.file, err));
  });

  // Curated photos for the memory cards (slug -> [paths]).
  fetch("card_photos/manifest.json")
    .then(r => r.json())
    .then(m => { photoManifest = m; })
    .catch(err => console.warn("Photo manifest not loaded:", err));
})();
