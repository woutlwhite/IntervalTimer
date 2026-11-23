# Status

_Last updated: 2026-11-23_

## Current state: v1 done and deployed ✅
The owner has used it and was happy with it ("nice"). The repo was made public so GitHub Pages works.

### Features in v1
- Setup screen:
  - Steppers for Runden (1–99), Belastung, Pause, Rundenpause and Vorbereitung. Tap to change, hold to repeat.
  - Live total workout time.
- Exercise list: add, rename, move up/down, delete (minimum 1).
- Presets:
  - Save the current setup under a name (asks before overwriting) and delete it.
  - A dropdown loads presets.
  - A sample preset, "Beispiel: Ganzkörper", is created on first launch.
- Timer screen:
  - Round x/y and exercise x/y.
  - Phase label, exercise name, big countdown, progress bar.
  - "Danach / Als Nächstes" preview and the total time remaining.
  - Prev / Pause / Next buttons and a "Beenden" button with a confirmation.
- Beeps:
  - 3-2-1 ticks
  - a high tone when work starts
  - a two-tone signal when a break starts
  - a fanfare when the workout is finished
- Screen Wake Lock while the timer runs. Vibration on Android.
- Done screen with a summary.
- PWA: manifest and icons, a service worker that works offline, can be added to the home screen.

## Open / ideas (nothing requested yet. Ask the owner before building)
- Per-exercise durations (e.g. a longer plank). Would need a config shape change and a migration.
- Export/import or share presets (e.g. as a link). Presets currently live only in one browser.
- Sound on/off toggle or volume.
- Landscape / large-screen layout for showing the timer to a group.
- Not verified on a real iPhone by Claude: beeps with the silent switch off, Wake Lock, and home-screen mode.

## Known limitations
- If the phone locks or the tab goes into the background, iOS pauses JS. The timer catches up on its deadline when it comes back, but beeps that fell due in between are missed.
- Presets are stored per device and per browser. Clearing Safari data deletes them.

## Housekeeping
- The first commit (`14c66bd`) shows the owner's full name as git author because it was made before the repo became public. The owner was asked whether to rewrite it to `woutlwhite` with a force-push, and hasn't answered yet. Don't force-push without his OK.

## Quick test snippet
```bash
node --check app.js && node -e "
const {buildPhases,totalDuration,fmt}=require('./app.js');
const p=buildPhases({rounds:2,work:40,rest:20,roundRest:60,prep:10,exercises:['A','B','C']});
console.log(p.map(x=>x.type[0]+x.dur).join(' '), fmt(totalDuration(p)));"
# expected: p10 w40 r20 w40 r20 w40 r60 w40 r20 w40 r20 w40 6:30
```

## Changelog
- **2026-11-23**: Added `CLAUDE.md` and `docs/STATUS.md` as handoff docs.
- **2026-11-10**: v1. Initial build and deploy to GitHub Pages.
