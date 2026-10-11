# Mappy

A stylized, animated map of the special places we've been — the first phase
of the proposal experience.

## Phases (overall plan)

1. **Map** *(built — this scaffold)* — a glowing night-world map with
   twinkling points she clicks to open memories. When all points are
   discovered, the final **"here"** point reveals at the current location.
2. **Final point + 夕 counter + heart** *(stub)* — the hand-off: shows the
   day count of the relationship and a heart to click.
3. **Song** *(stub)* — piano intro melts into the instrumental backing of
   the song; live singing over it.
4. **Music video** *(stub)* — memories montage on rails, synced to the song.
5. **Mosaic** *(stub)* — zoom-out photo mosaic resolves into the question.

Only Phase 1 is implemented. Later phases are registered as stubs in
`js/sequencer.js` so they slot in without reworking the flow.

## The map (Phase 1)

- **Stylized, not Google Maps.** The world is drawn on `<canvas>` from a
  vendored world GeoJSON, projected with d3-geo (Natural Earth projection),
  so real lat/long still land in the right spot — it's just *illustrated*
  (glowing continents on a deep-night ocean), not photographic tiles.
- **Animated / alive:** points gently twinkle, a soft center glow adds
  depth, and the whole map slowly drifts while zoomed out so it's never
  static.
- **Click a point** → the camera eases/zooms toward it and the memory
  blooms. No route lines, no travel path.
- **Fully offline** — there are no map tiles and no network calls. The one
  local fetch is `libs/world-110m.geojson` (served from disk).

## Run it

No build step. Open `index.html` in a browser.

> Because `map.js` does a `fetch()` for the GeoJSON, some browsers block
> `file://` fetches. If the map doesn't appear when double-clicking the
> file, run a tiny local server from this folder instead:
>
> ```
> python3 -m http.server 8000
> ```
> then open http://localhost:8000 . (We'll pick the final run method before
> the big day.)

## Edit the places

Everything is data-driven — edit **`js/places.js`** only:

- `visited[]` — places you've been (gold points). Each: `name`, optional
  `nameZh`, `coords` `[lat, lng]`, optional `date`, `note`, `photo`.
  (Order no longer matters — there's no route line.)
- `future[]` — dream places (faint points). Optional; `[]` to skip.
- `here` — the current location; the final point revealed at the end. Set
  the real `coords` of where the proposal happens.

Put photos in `photos/` and reference them like `photos/first-date.jpg`.
Missing photos hide gracefully.

## Keyboard (rehearsal / safety)

- `h` — discover everything + reveal the "here" point (skip ahead)
- `r` — reload / reset

## Vendored libraries (all offline)

- `libs/d3-array.min.js`, `libs/d3-geo.min.js` — projection + path rendering
- `libs/world-110m.geojson` — the world landmass outline
