# CLAUDE.md — Start here

Handoff notes for any Claude (or human) working on this repo. Read this file first, then `docs/STATUS.md`.

## ⚠️ This repo is PUBLIC
Never commit personal data: no real names, emails, addresses, client or class names, or account details. Use `woutlwhite` as the git author name and `woutlwhite@users.noreply.github.com` as the email.

## What this is
**Zirkel Timer**: an interval timer for circuit training (Zirkeltraining). It is for the owner's personal use on his phone, including when leading group circuit classes.
- Live at **https://woutlwhite.github.io/IntervalTimer/** (GitHub Pages, branch `main`, root folder, no custom domain).
- A deploy is just a push to `main`. Pages republishes within about 1–2 minutes, with no build step and no CI.

## Owner preferences (decided, don't re-ask)
| Topic | Decision |
|---|---|
| UI language | **German** (all labels, toasts, dialogs) |
| Target device | **Phone first** (iPhone Safari, also added to the home screen as a PWA) |
| Audio | **Beeps only**: 3-2-1 countdown and phase changes. No voice. Vibration is a harmless extra (Android only). |
| Round rest | Configurable, separate from the normal break |
| Saving | **Multiple named presets** in localStorage |
| Hosting | GitHub Pages only, no domain, no backend |
| Style | Dark UI, large countdown, one colour per phase |

The owner is new to coding. Explain the steps he has to do himself (e.g. GitHub settings) in plain language with exact click paths.

## Tech stack
Plain HTML + CSS + vanilla JS. **No framework, no build, no dependencies.** Keep it that way unless the owner asks otherwise.

| File | Purpose |
|---|---|
| `index.html` | Three screens (`#setup`, `#timer`, `#done`) plus the save dialog |
| `style.css` | All styles. Colour tokens are in `:root`, phase colour comes from `#timer[data-phase]` |
| `app.js` | All logic (see below) |
| `sw.js` | Service worker, network-first with cache fallback (works offline) |
| `manifest.webmanifest`, `icon*.{svg,png}` | PWA / home-screen icon |

### app.js structure
- **Pure functions at the top** (`fmt`, `buildPhases`, `totalDuration`), exported for Node via `module.exports`, so they can be tested with `node -e "require('./app.js')"`.
- `buildPhases(cfg)` turns the config into a flat list of phases `{type, dur, round, ex, name}`, where `type` ∈ `prep | work | rest | roundrest`.
  - Rest phases with 0 s are skipped.
  - After the last exercise of a round, `roundRest` is used. If it is 0, the normal `rest` is used instead.
  - There is no rest after the final exercise.
- The browser-only IIFE below that contains the steppers, exercise list, presets, the WebAudio beeps, the Wake Lock, and the timer loop.
- The timer loop runs a `setInterval` every 100 ms against `performance.now()` deadlines (`endAt`). This keeps it drift-free, and overshoot carries into the next phase.
- Prev button: if the current phase has been running for more than 3 s, it restarts that phase, otherwise it jumps back one phase.
- Keyboard: Space = pause, ←/→ = prev/next.

### Config shape (also the preset format)
```js
{ rounds: 3, work: 40, rest: 20, roundRest: 60, prep: 10,   // seconds
  exercises: ['Kniebeugen', 'Liegestütz', ...] }
```
localStorage keys:
- `zirkel.current`: the last config
- `zirkel.presets`: `{ name: config }`
- `zirkel.lastPreset`

**If you change this shape, migrate old saved data.** Users have presets stored on their phones.

## Working rules
- **Bump `CACHE` in `sw.js`** (`zirkel-v1` → `zirkel-v2` …) whenever you add or rename cached files. Content edits alone are fine, because the cache is network-first.
- iOS caveats:
  - Audio only works after a user tap. `unlockAudio()` is called on Start and Pause for this reason.
  - The silent switch mutes the beeps.
  - Wake Lock requires iOS 16.4 or later.
- Test before pushing:
  1. Run `node --check app.js`.
  2. Run the `buildPhases` sanity check (snippet in `docs/STATUS.md`).
  3. If possible, run a headless Playwright screenshot at 390×844. Chrome is at `/usr/bin/google-chrome` in Claude's cloud sandbox.
- Keep `docs/STATUS.md` up to date at the end of every work session: what changed, what's open, and any decisions the owner made.
