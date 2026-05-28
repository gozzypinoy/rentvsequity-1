# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Despite the repo name (`rentvsequity-1`) and the stub `README.md`, this project is **SynthKey** — a
playable polyphonic synth keyboard delivered as an installable PWA, tuned for iPhone/iPad (Safari /
add-to-home-screen) but usable in any modern browser. It is a client-only static web app; there is no
backend.

## Commands

```bash
npm run dev          # Vite dev server with --host (LAN access for testing on a phone/tablet)
npm run build        # Type-check (tsc --noEmit) then production build to dist/
npm run preview      # Serve the built dist/ with --host
node scripts/gen-icons.mjs   # Regenerate PWA/app icons into public/ and public/icons/
```

There is **no test runner and no linter** configured. `npm run build` is the only correctness gate —
it runs `tsc --noEmit` (strict mode, `noUnusedLocals`/`noUnusedParameters`) before bundling, so a
build failure is usually a type error. Run it after changes to catch regressions.

The icon script (`gen-icons.mjs`) is standalone (not wired into npm scripts) and writes raw PNGs with
a hand-rolled encoder — run it only when the icon art or sizes change.

## Architecture

Vanilla TypeScript, no UI framework. `src/main.ts` is the composition root: it grabs the static DOM
nodes from `index.html`, constructs the single shared instances, and wires every input source into the
audio engine. Everything flows through two layers:

- **`SynthEngine` (`src/synth/engine.ts`)** — the one audio object. Wraps a Tone.js signal chain
  (`PolySynth → Filter → Volume → Destination`). Exposes `noteOn(midi)` / `noteOff(midi)` plus
  parameter setters (osc type, filter, ADSR envelope, volume, sustain). It **refcounts active notes**
  (`active: Map<midi, count>`) so overlapping input sources don't cut each other off, and holds a
  `heldByPedal` set so the sustain toggle keeps notes ringing after release.
- **`OctaveController` (`src/ui/octave.ts`)** — the shared view-state for the visible key range
  (`baseMidi` + number of `octaves`). It's a tiny pub/sub: `subscribe()` re-renders the on-screen
  keyboard and updates the octave label; `shift()` transposes. This is the single source of truth for
  "which notes are currently mapped."

**MIDI note numbers are the universal currency.** Every input source and the engine speak in integer
MIDI numbers; `src/synth/notes.ts` converts (`midiToName` for Tone.js, `midiToFreq`, `isBlack`).

### Three input sources, one engine

All three call the same `onNoteOn`/`onNoteOff` callbacks (and `keyboard.highlight()` for visual
feedback), which delegate to the engine:

1. **Touch/pointer** — `Keyboard` (`src/ui/keyboard.ts`) renders keys as DOM `div`s (white keys in a
   CSS grid, black keys absolutely positioned by percentage offset over the white row). It tracks
   `pointerId → midi` so multi-touch chords and finger-glissando (slide between keys) work.
2. **QWERTY** (`src/input/qwerty.ts`) — Ableton-style `a w s e d…` layout offset from `baseMidi`;
   `z`/`x` shift octave, space toggles sustain. Releases all held notes on window blur.
3. **Web MIDI** (`src/input/midi.ts`) — optional; binds to hardware MIDI inputs if `requestMIDIAccess`
   exists, parses raw note-on/off status bytes. Silently no-ops where unsupported.

### UI mounting

`src/ui/controls.ts` (`mountControls`) builds the synth parameter panel (oscillator segmented control
+ ADSR/filter/volume sliders) imperatively against the engine. `src/ui/sustain.ts` (`mountToolbar`)
builds octave shift / sustain / panic controls and returns `{ setSustain, isSustainOn }` handles that
`main.ts` shares with the QWERTY binding so keyboard-space and the on-screen button stay in sync.

## iOS / PWA constraints (don't break these)

These are deliberate and load-bearing — verify them when touching audio init, the splash flow,
`index.html`, or `src/styles.css`:

- **Audio must be unlocked by a user gesture.** The "Tap to start" splash button calls
  `engine.unlock()` (`Tone.start()` + context resume) before revealing the keyboard. Web Audio will
  not produce sound on iOS without this. `visibilitychange` re-resumes the context when returning to
  the app.
- **Zoom/scroll are suppressed** for a native feel: `gesturestart`/`dblclick` are `preventDefault`ed
  in `main.ts`, and the body uses `touch-action: none`, `overscroll-behavior: none`, and `user-scalable=no`.
- **Safe-area insets** (`env(safe-area-inset-*)`) and `100dvh`/`100svh` handle the notch and dynamic
  toolbars. The `<meta>` tags in `index.html` (`apple-mobile-web-app-*`, `viewport-fit=cover`) drive
  standalone display.
- **PWA** is configured in `vite.config.ts` via `vite-plugin-pwa` (`registerType: autoUpdate`,
  manifest + workbox precache). `src/pwa/register.ts` registers the service worker. Icons referenced
  by the manifest live in `public/` and `public/icons/`.

CSS is a single hand-written `src/styles.css` driven by `:root` custom properties (`--bg`, `--accent`,
`--white-key`, etc.); active keys are toggled via the `data-active` attribute, matching selectors in
the stylesheet.
