'use strict';

/* ================= Helpers ================= */

function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

/**
 * Turn a config into the ordered list of phases the timer walks through.
 * Breaks with 0 seconds are skipped. Between rounds the round rest is used;
 * if it is 0, the normal break is used instead.
 */
function buildPhases(cfg) {
  const phases = [];
  const exercises = cfg.exercises.map((n, i) => (n || '').trim() || 'Übung ' + (i + 1));
  const nEx = exercises.length;
  if (!nEx) return phases;

  if (cfg.prep > 0) {
    phases.push({ type: 'prep', dur: cfg.prep, round: 1, ex: 0, name: exercises[0] });
  }
  for (let r = 1; r <= cfg.rounds; r++) {
    for (let i = 0; i < nEx; i++) {
      phases.push({ type: 'work', dur: cfg.work, round: r, ex: i, name: exercises[i] });
      const lastEx = i === nEx - 1;
      const lastRound = r === cfg.rounds;
      if (lastEx && lastRound) break;
      if (lastEx) {
        const d = cfg.roundRest > 0 ? cfg.roundRest : cfg.rest;
        if (d > 0) phases.push({ type: cfg.roundRest > 0 ? 'roundrest' : 'rest', dur: d, round: r, ex: i, name: exercises[0] });
      } else if (cfg.rest > 0) {
        phases.push({ type: 'rest', dur: cfg.rest, round: r, ex: i, name: exercises[i + 1] });
      }
    }
  }
  return phases;
}

function totalDuration(phases) {
  return phases.reduce((a, p) => a + p.dur, 0);
}

// Allow unit testing in Node
if (typeof module !== 'undefined') module.exports = { buildPhases, totalDuration, fmt };

/* ================= App (browser only) ================= */
if (typeof document !== 'undefined') (function () {

const $ = (id) => document.getElementById(id);
const STORE_PRESETS = 'zirkel.presets';
const STORE_CURRENT = 'zirkel.current';
const STORE_LASTNAME = 'zirkel.lastPreset';

const DEFAULT = {
  rounds: 3, work: 40, rest: 20, roundRest: 60, prep: 10,
  exercises: ['Kniebeugen', 'Liegestütz', 'Ausfallschritte', 'Plank', 'Burpees', 'Mountain Climbers'],
};

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ }
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }

let cfg = Object.assign(clone(DEFAULT), load(STORE_CURRENT, {}));
if (!Array.isArray(cfg.exercises) || !cfg.exercises.length) cfg.exercises = clone(DEFAULT.exercises);

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1900);
}

/* ---------- Setup screen ---------- */

const steppers = document.querySelectorAll('.stepper');
steppers.forEach((st) => {
  const key = st.dataset.key;
  const step = +st.dataset.step, min = +st.dataset.min, max = +st.dataset.max;
  const out = st.querySelector('output');
  st._render = () => { out.textContent = st.dataset.format === 'time' ? fmt(cfg[key]) : cfg[key]; };

  st.querySelectorAll('button').forEach((b) => {
    const dir = +b.dataset.dir;
    let holdTimer, repeatTimer;
    const bump = () => {
      // snap to step grid, then move
      let v = cfg[key];
      v = dir > 0 ? Math.floor(v / step) * step + step : Math.ceil(v / step) * step - step;
      cfg[key] = Math.min(max, Math.max(min, v));
      st._render();
      onConfigChange();
    };
    const stop = () => { clearTimeout(holdTimer); clearInterval(repeatTimer); };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      bump();
      holdTimer = setTimeout(() => { repeatTimer = setInterval(bump, 90); }, 400);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
  });
});

const exList = $('exerciseList');
const ICON_UP = '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
const ICON_DOWN = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const ICON_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';

function renderExercises(focusIndex) {
  exList.innerHTML = '';
  cfg.exercises.forEach((name, i) => {
    const li = document.createElement('li');
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = name;
    inp.placeholder = 'Übung ' + (i + 1);
    inp.maxLength = 40;
    inp.enterKeyHint = 'done';
    inp.addEventListener('input', () => { cfg.exercises[i] = inp.value; onConfigChange(false); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });

    const mk = (html, label, fn, disabled) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mini'; b.innerHTML = html;
      b.setAttribute('aria-label', label); b.disabled = !!disabled;
      b.addEventListener('click', fn);
      return b;
    };
    const move = (d) => {
      const arr = cfg.exercises;
      [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
      renderExercises(); onConfigChange();
    };
    li.append(
      inp,
      mk(ICON_UP, 'Nach oben', () => move(-1), i === 0),
      mk(ICON_DOWN, 'Nach unten', () => move(1), i === cfg.exercises.length - 1),
      mk(ICON_X, 'Entfernen', () => {
        if (cfg.exercises.length <= 1) { toast('Mindestens eine Übung'); return; }
        cfg.exercises.splice(i, 1); renderExercises(); onConfigChange();
      }),
    );
    exList.appendChild(li);
    if (focusIndex === i) setTimeout(() => inp.focus(), 0);
  });
  $('exCount').textContent = '(' + cfg.exercises.length + ')';
}

$('addExercise').addEventListener('click', () => {
  cfg.exercises.push('');
  renderExercises(cfg.exercises.length - 1);
  onConfigChange();
});

function onConfigChange() {
  save(STORE_CURRENT, cfg);
  $('totalTime').textContent = fmt(totalDuration(buildPhases(cfg)));
  markPresetDirty();
}

function renderAll() {
  steppers.forEach((s) => s._render());
  renderExercises();
  $('totalTime').textContent = fmt(totalDuration(buildPhases(cfg)));
}

/* ---------- Presets ---------- */

const presetSelect = $('presetSelect');
let presets = load(STORE_PRESETS, null);
if (!presets) {
  presets = { 'Beispiel: Ganzkörper': clone(DEFAULT) };
  save(STORE_PRESETS, presets);
}

function sameCfg(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function renderPresets() {
  const cur = load(STORE_LASTNAME, '');
  presetSelect.innerHTML = '';
  const ph = document.createElement('option');
  ph.value = ''; ph.textContent = 'Gespeicherte Workouts …';
  presetSelect.appendChild(ph);
  Object.keys(presets).sort((a, b) => a.localeCompare(b, 'de')).forEach((name) => {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    presetSelect.appendChild(o);
  });
  presetSelect.value = presets[cur] && sameCfg(presets[cur], cfg) ? cur : '';
}

function markPresetDirty() {
  const v = presetSelect.value;
  if (v && presets[v] && !sameCfg(presets[v], cfg)) presetSelect.value = '';
}

presetSelect.addEventListener('change', () => {
  const name = presetSelect.value;
  if (!name || !presets[name]) return;
  cfg = clone(presets[name]);
  save(STORE_CURRENT, cfg);
  save(STORE_LASTNAME, name);
  renderAll();
  presetSelect.value = name;
});

const dlg = $('saveDialog');
$('savePreset').addEventListener('click', () => {
  $('presetName').value = presetSelect.value || load(STORE_LASTNAME, '') || '';
  dlg.showModal();
  setTimeout(() => $('presetName').select(), 50);
});
dlg.addEventListener('close', () => {
  if (dlg.returnValue !== 'ok') return;
  const name = $('presetName').value.trim();
  if (!name) { toast('Bitte einen Namen eingeben'); return; }
  if (presets[name] && !confirm('„' + name + '“ überschreiben?')) return;
  presets[name] = clone(cfg);
  save(STORE_PRESETS, presets);
  save(STORE_LASTNAME, name);
  renderPresets();
  toast('Gespeichert');
});

$('deletePreset').addEventListener('click', () => {
  const name = presetSelect.value;
  if (!name) { toast('Erst ein Workout auswählen'); return; }
  if (!confirm('„' + name + '“ löschen?')) return;
  delete presets[name];
  save(STORE_PRESETS, presets);
  renderPresets();
  toast('Gelöscht');
});

/* ---------- Audio (beeps) ---------- */

let actx = null;
function unlockAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    // play a silent blip so iOS fully unlocks
    const o = actx.createOscillator(), g = actx.createGain();
    g.gain.value = 0; o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + 0.01);
  } catch (e) { /* no audio */ }
}
function beep(freq, dur, when = 0, vol = 0.5) {
  if (!actx) return;
  const t = actx.currentTime + when;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.setValueAtTime(vol, t + dur - 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
const sound = {
  tick: () => beep(880, 0.12),                      // 3-2-1
  go: () => beep(1320, 0.45, 0, 0.6),              // work starts
  rest: () => { beep(660, 0.2); beep(520, 0.3, 0.22); }, // break starts
  done: () => { beep(880, 0.15); beep(1100, 0.15, 0.18); beep(1320, 0.5, 0.36, 0.6); },
};

/* ---------- Wake lock ---------- */

let wakeLock = null;
async function requestWake() {
  try { if ('wakeLock' in navigator && !wakeLock) {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } } catch (e) { /* not allowed */ }
}
function releaseWake() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && run && !run.paused) requestWake();
});

/* ---------- Timer ---------- */

const PHASE_LABEL = { prep: 'Gleich geht’s los', work: 'Los!', rest: 'Pause', roundrest: 'Rundenpause' };
const timerEl = $('timer');
let run = null;   // { phases, idx, endAt, remaining, paused, lastWhole, interval }

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}

function startWorkout() {
  const phases = buildPhases(cfg);
  if (!phases.length) { toast('Bitte Übungen hinzufügen'); return; }
  unlockAudio();
  requestWake();
  run = { phases, idx: 0, paused: false, nEx: cfg.exercises.length, rounds: cfg.rounds };
  enterPhase(0, true);
  show('timer');
  run.interval = setInterval(tick, 100);
}

function enterPhase(idx, silent) {
  run.idx = idx;
  const p = run.phases[idx];
  run.remaining = p.dur;
  run.endAt = performance.now() + p.dur * 1000;
  run.lastWhole = Math.ceil(p.dur);
  if (!silent) {
    if (p.type === 'work') sound.go();
    else if (p.type === 'rest' || p.type === 'roundrest') sound.rest();
  }
  if (navigator.vibrate) try { navigator.vibrate(p.type === 'work' ? 300 : [120, 80, 120]); } catch (e) {}
  renderTimer();
}

function tick() {
  if (!run || run.paused) return;
  const now = performance.now();
  run.remaining = (run.endAt - now) / 1000;

  const whole = Math.ceil(run.remaining);
  if (whole !== run.lastWhole) {
    run.lastWhole = whole;
    if (whole >= 1 && whole <= 3) sound.tick();
  }

  if (run.remaining <= 0) {
    // carry overshoot into the next phase so timing stays accurate
    const over = -run.remaining;
    if (run.idx + 1 >= run.phases.length) { finish(); return; }
    enterPhase(run.idx + 1);
    run.endAt -= over * 1000;
  }
  renderTimer();
}

function renderTimer() {
  const p = run.phases[run.idx];
  const rem = Math.max(0, run.remaining);
  timerEl.dataset.phase = p.type;
  timerEl.classList.toggle('final', rem <= 3 && rem > 0);
  timerEl.classList.toggle('paused', run.paused);

  $('tRound').textContent = 'Runde ' + p.round + '/' + run.rounds;
  const exNo = p.type === 'work' ? p.ex + 1 : (p.type === 'prep' ? 1 : null);
  $('tExercise').textContent = exNo ? 'Übung ' + exNo + '/' + run.nEx : '';

  $('tPhase').textContent = run.paused ? 'Pausiert' : PHASE_LABEL[p.type];
  if (p.type === 'work') {
    $('tName').textContent = p.name;
  } else if (p.type === 'roundrest') {
    $('tName').textContent = 'Runde ' + p.round + ' geschafft';
  } else if (p.type === 'prep') {
    $('tName').textContent = 'Bereit machen';
  } else {
    $('tName').textContent = 'Durchatmen';
  }
  $('tClock').textContent = fmt(Math.ceil(rem));
  $('tBarFill').style.width = (100 * (1 - rem / p.dur)) + '%';

  // What's next
  const next = run.phases[run.idx + 1];
  let nextHtml = '';
  if (p.type === 'work') {
    if (!next) nextHtml = 'Letzte Übung!';
    else if (next.type === 'work') nextHtml = 'Danach: <b>' + esc(next.name) + '</b>';
    else nextHtml = 'Danach: ' + (next.type === 'roundrest' ? 'Rundenpause' : 'Pause');
  } else if (next) {
    const upcoming = next.type === 'work' ? next : run.phases.slice(run.idx + 1).find((x) => x.type === 'work');
    if (upcoming) nextHtml = 'Als Nächstes: <b>' + esc(upcoming.name) + '</b>';
  }
  $('tNext').innerHTML = nextHtml;

  let left = rem;
  for (let i = run.idx + 1; i < run.phases.length; i++) left += run.phases[i].dur;
  $('tTotalLeft').textContent = fmt(Math.ceil(left));
}

function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function togglePause() {
  if (!run) return;
  unlockAudio();
  if (run.paused) {
    run.paused = false;
    run.endAt = performance.now() + run.remaining * 1000;
    requestWake();
  } else {
    run.paused = true;
    run.remaining = (run.endAt - performance.now()) / 1000;
  }
  renderTimer();
}

function jump(delta) {
  if (!run) return;
  let target = run.idx + delta;
  // going back: if more than 3s into the phase, restart it instead
  if (delta < 0 && run.phases[run.idx].dur - run.remaining > 3) target = run.idx;
  if (target < 0) target = 0;
  if (target >= run.phases.length) { finish(); return; }
  const wasPaused = run.paused;
  enterPhase(target, true);
  if (wasPaused) { run.paused = true; renderTimer(); }
}

function stopWorkout() {
  if (!run) return;
  clearInterval(run.interval);
  run = null;
  releaseWake();
  show('setup');
}

function finish() {
  clearInterval(run.interval);
  const total = totalDuration(run.phases);
  $('doneSummary').textContent = run.rounds + (run.rounds === 1 ? ' Runde' : ' Runden') + ' · ' +
    run.nEx + (run.nEx === 1 ? ' Übung' : ' Übungen') + ' · ' + fmt(total) + ' min';
  sound.done();
  if (navigator.vibrate) try { navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) {}
  run = null;
  releaseWake();
  show('done');
}

$('startBtn').addEventListener('click', startWorkout);
$('pauseBtn').addEventListener('click', togglePause);
$('prevBtn').addEventListener('click', () => jump(-1));
$('nextBtn').addEventListener('click', () => jump(1));
$('stopBtn').addEventListener('click', () => {
  const wasRunning = run && !run.paused;
  if (wasRunning) togglePause();
  if (confirm('Workout beenden?')) stopWorkout();
  else if (wasRunning) togglePause();
});
$('doneBtn').addEventListener('click', () => show('setup'));
document.addEventListener('keydown', (e) => {
  if (!run || e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); togglePause(); }
  if (e.code === 'ArrowRight') jump(1);
  if (e.code === 'ArrowLeft') jump(-1);
});

/* ---------- Init ---------- */
renderAll();
renderPresets();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

})();
