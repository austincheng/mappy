/* =============================================================
 * sequencer.js — drives the proposal through its phases.
 * -------------------------------------------------------------
 * The whole experience is a chain of phases. Phase 1 (the map)
 * is interactive; everything after the heart-click runs on rails
 * so nothing needs to be touched by hand while singing live.
 *
 * Only PHASE_MAP is implemented right now. The later phases are
 * registered as stubs so the structure is in place and we can
 * build them one at a time without reworking the flow.
 * ============================================================= */

const Sequencer = (() => {
  const PHASES = {
    MAP: "map",            // interactive: discover all places
    FINAL_PIN: "finalPin", // "here" pin + 夕 counter + heart
    SONG: "song",          // piano -> instrumental backing; live singing
    MUSIC_VIDEO: "video",  // memories montage on rails, synced to song
    MOSAIC: "mosaic"       // zoom-out photo mosaic -> the question
  };

  let current = null;
  const handlers = {};

  function on(phase, fn) { handlers[phase] = fn; }

  function go(phase, payload) {
    current = phase;
    console.log(`[sequencer] -> ${phase}`);
    const fn = handlers[phase];
    if (typeof fn === "function") {
      fn(payload);
    } else {
      console.warn(`[sequencer] phase "${phase}" not implemented yet (stub).`);
    }
  }

  function currentPhase() { return current; }

  return { PHASES, on, go, currentPhase };
})();

/* ---- Register stubs for the not-yet-built phases ----
 * These just log for now. We flesh them out later. The map phase
 * (PHASE_MAP) is registered in map.js where it has its context. */
Sequencer.on(Sequencer.PHASES.FINAL_PIN, () => {
  console.log("[stub] FINAL_PIN: reveal 'here' pin, show 夕 counter + heart. (to build)");
});
Sequencer.on(Sequencer.PHASES.SONG, () => {
  console.log("[stub] SONG: piano intro -> instrumental backing; cue live singing. (to build)");
});
Sequencer.on(Sequencer.PHASES.MUSIC_VIDEO, () => {
  console.log("[stub] MUSIC_VIDEO: memories montage on rails, synced to song. (to build)");
});
Sequencer.on(Sequencer.PHASES.MOSAIC, () => {
  console.log("[stub] MOSAIC: zoom-out photo mosaic -> the question. (to build)");
});
