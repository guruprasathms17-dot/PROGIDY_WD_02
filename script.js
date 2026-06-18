/* ============================================================
   STOPWATCH — Prodigy Infotech Task-02
   Features: Start/Pause/Reset, Lap recording, SVG ring,
             Fastest/Slowest lap highlighting, Particle BG
   ============================================================ */

// ── DOM REFS ──────────────────────────────────────────────
const hhEl       = document.getElementById('hh');
const mmEl       = document.getElementById('mm');
const ssEl       = document.getElementById('ss');
const msEl       = document.getElementById('ms');
const startBtn   = document.getElementById('startBtn');
const lapBtn     = document.getElementById('lapBtn');
const resetBtn   = document.getElementById('resetBtn');
const startLabel = document.getElementById('startLabel');
const iconPlay   = document.getElementById('iconPlay');
const iconPause  = document.getElementById('iconPause');
const statusLabel= document.getElementById('statusLabel');
const lapInfo    = document.getElementById('lapInfo');
const lapsList   = document.getElementById('lapsList');
const lapsContainer = document.getElementById('lapsContainer');
const progressArc= document.getElementById('progressArc');
const secDot     = document.getElementById('secDot');
const sepEls     = document.querySelectorAll('.sep');

// ── SVG ARC DEFS ─────────────────────────────────────────
const CIRC = 2 * Math.PI * 138; // circumference
const CX = 160, CY = 160, R = 138;

// Inject gradient defs into SVG
const svgEl = document.querySelector('.ring-svg');
const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
defs.innerHTML = `
  <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%"   stop-color="#38bdf8"/>
    <stop offset="50%"  stop-color="#818cf8"/>
    <stop offset="100%" stop-color="#f472b6"/>
  </linearGradient>`;
svgEl.prepend(defs);
progressArc.setAttribute('stroke', 'url(#arcGrad)');

// ── STATE ─────────────────────────────────────────────────
let startTime   = 0;
let elapsed     = 0;
let lapStart    = 0;
let rafId       = null;
let isRunning   = false;
let laps        = [];

// ── PARTICLES ─────────────────────────────────────────────
(function spawnParticles() {
  const container = document.getElementById('particles');
  const colors = ['#38bdf8','#818cf8','#f472b6','#34d399'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 1.5;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${8 + Math.random()*14}s;
      animation-delay:${Math.random()*10}s;
    `;
    container.appendChild(p);
  }
})();

// ── FORMAT HELPERS ────────────────────────────────────────
function pad(n, d = 2) { return String(n).padStart(d, '0'); }

function formatTime(ms) {
  const h   = Math.floor(ms / 3_600_000);
  const m   = Math.floor((ms % 3_600_000) / 60_000);
  const s   = Math.floor((ms % 60_000) / 1_000);
  const mil = ms % 1_000;
  return { h, m, s, mil };
}

function formatLabel(ms) {
  const { h, m, s, mil } = formatTime(ms);
  return h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}.${pad(mil, 3)}`
    : `${pad(m)}:${pad(s)}.${pad(mil, 3)}`;
}

// ── RING UPDATE ───────────────────────────────────────────
function updateRing(totalMs) {
  // Full ring = 60 seconds
  const secFraction = (totalMs % 60_000) / 60_000;
  const offset = CIRC * (1 - secFraction);
  progressArc.style.strokeDashoffset = offset;

  // Rotating dot
  const angle = secFraction * 2 * Math.PI - Math.PI / 2;
  const dx = CX + R * Math.cos(angle);
  const dy = CY + R * Math.sin(angle);
  secDot.setAttribute('cx', dx);
  secDot.setAttribute('cy', dy);
}

// ── CLOCK RENDER ─────────────────────────────────────────
function render(ms) {
  const { h, m, s, mil } = formatTime(ms);
  hhEl.textContent = pad(h);
  mmEl.textContent = pad(m);
  ssEl.textContent = pad(s);
  msEl.textContent = pad(mil, 3);
  updateRing(ms);
}

// ── ANIMATION LOOP ────────────────────────────────────────
function tick() {
  elapsed = Date.now() - startTime;
  render(elapsed);
  rafId = requestAnimationFrame(tick);
}

// ── CONTROLS ─────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  if (!isRunning) {
    // START / RESUME
    startTime = Date.now() - elapsed;
    lapStart  = lapStart === 0 ? startTime : Date.now() - getCurrentLapElapsed();
    rafId = requestAnimationFrame(tick);
    isRunning = true;

    iconPlay.classList.add('hidden');
    iconPause.classList.remove('hidden');
    startLabel.textContent = 'PAUSE';
    startBtn.classList.add('paused');
    lapBtn.disabled = false;

    statusLabel.textContent = 'RUNNING';
    statusLabel.className = 'status-label running';
    sepEls.forEach(s => s.classList.remove('paused'));
  } else {
    // PAUSE
    cancelAnimationFrame(rafId);
    isRunning = false;

    iconPause.classList.add('hidden');
    iconPlay.classList.remove('hidden');
    startLabel.textContent = 'RESUME';
    startBtn.classList.remove('paused');

    statusLabel.textContent = 'PAUSED';
    statusLabel.className = 'status-label paused';
    sepEls.forEach(s => s.classList.add('paused'));
  }
});

lapBtn.addEventListener('click', () => {
  if (!isRunning) return;

  const now = Date.now();
  const lapElapsed = now - lapStart;
  lapStart = now;

  laps.unshift({ split: lapElapsed, total: elapsed, num: laps.length + 1 });
  lapInfo.textContent = `${laps.length} lap${laps.length > 1 ? 's' : ''} recorded`;

  renderLaps();
  lapsContainer.classList.add('show');
});

resetBtn.addEventListener('click', () => {
  cancelAnimationFrame(rafId);
  isRunning = false;
  elapsed   = 0;
  lapStart  = 0;
  laps      = [];

  render(0);
  updateRing(0);

  iconPause.classList.add('hidden');
  iconPlay.classList.remove('hidden');
  startLabel.textContent = 'START';
  startBtn.classList.remove('paused');
  lapBtn.disabled = true;

  statusLabel.textContent = 'READY';
  statusLabel.className = 'status-label';
  sepEls.forEach(s => s.classList.remove('paused'));

  lapInfo.textContent = '— laps recorded —';
  lapsList.innerHTML = '';
  lapsContainer.classList.remove('show');
});

// ── LAP RENDER ────────────────────────────────────────────
function getCurrentLapElapsed() {
  if (laps.length === 0) return elapsed;
  return elapsed - laps[0].total + laps[0].split;
}

function renderLaps() {
  if (laps.length < 2) {
    lapsList.innerHTML = '';
    laps.forEach((l, i) => appendLapRow(l, i, false, false));
    return;
  }

  const splits = laps.map(l => l.split);
  const fastest = Math.min(...splits);
  const slowest = Math.max(...splits);

  lapsList.innerHTML = '';
  const firstSplit = laps[0] ? laps[0].split : null;

  laps.forEach((lap, i) => {
    const isFastest = lap.split === fastest;
    const isSlowest = lap.split === slowest;
    appendLapRow(lap, i, isFastest, isSlowest, firstSplit);
  });
}

function appendLapRow(lap, i, isFastest, isSlowest, referenceSplit) {
  const li = document.createElement('li');
  li.className = 'lap-row' +
    (isFastest ? ' fastest' : '') +
    (isSlowest ? ' slowest' : '') +
    (i === 0    ? ' current' : '');

  const diff = referenceSplit != null && i > 0
    ? lap.split - referenceSplit
    : null;

  const diffStr = diff != null
    ? (diff > 0 ? '+' : '') + formatLabel(Math.abs(diff))
    : '—';

  li.innerHTML = `
    <span class="lap-num">${pad(lap.num)}</span>
    <span class="lap-split">${formatLabel(lap.split)}</span>
    <span class="lap-total">${formatLabel(lap.total)}</span>
    <span class="lap-diff">${diff != null ? (diff > 0 ? '<span style="color:var(--red)">'+diffStr+'</span>' : '<span style="color:var(--green)">'+diffStr+'</span>') : diffStr}</span>
  `;
  lapsList.appendChild(li);
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); startBtn.click(); }
  if (e.code === 'KeyL')  { if (!lapBtn.disabled) lapBtn.click(); }
  if (e.code === 'KeyR')  { resetBtn.click(); }
});

// ── INIT ─────────────────────────────────────────────────
render(0);
updateRing(0);
