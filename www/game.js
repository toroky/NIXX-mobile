// ════════════════════════════════════
//  STATE
// ════════════════════════════════════
const C = document.getElementById('gc');
const ctx = C.getContext('2d');

let CELL = 10, COLS, ROWS;
let mode = 'pve'; // pve | pvp | coop
let diffLevel = 2; // 1=easy 2=normal 3=hard
let gameLoop = null;
let paused = false;

// game state
let p1, p2, enemies;
let difficulty, ticks, level, startDelay;
let score1 = 0, score2 = 0;
let running = false;
let particles = [];

const COLORS = {
  p1:'#0064ff', p1t:'#0064ff',
  p2:'#ffffff', p2t:'#cccccc',
  e: (ag) => { const g = Math.max(0, 100 - (ag-1)*25); return `rgb(255,${g},0)`; }
};

const MAX_TRAIL = 80;
const SAFE = 2;
const SPEED_MS = [90, 75, 60]; // easy normal hard

// ════════════════════════════════════
//  MENU / SCREEN UTILS
// ════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function selectMode(m) {
  mode = m;
  showScreen('s-game');
  setupCanvas();
  score1 = 0; score2 = 0; level = 1;
  initRound();
}

function setDiff(d, label) {
  diffLevel = d;
  document.getElementById('diff-show').textContent = 'DIFICULDADE: ' + label;
  document.querySelectorAll('.diff-btn').forEach((b,i) => b.classList.toggle('sel', i+1===d));
}

// ════════════════════════════════════
//  CANVAS SETUP
// ════════════════════════════════════
function setupCanvas() {
  const wrap = document.getElementById('canvas-wrap');
  // show/hide P2 dpad
  const p2ctrl = document.getElementById('ctrl-p2');
  p2ctrl.style.display = (mode === 'pvp' || mode === 'coop') ? 'block' : 'none';

  // calculate canvas size
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  COLS = Math.floor(W / CELL);
  ROWS = Math.floor(H / CELL);
  C.width  = COLS * CELL;
  C.height = ROWS * CELL;

  // HUD
  const h2 = document.getElementById('h2');
  h2.style.display = (mode === 'pve') ? 'none' : 'block';
}

// ════════════════════════════════════
//  BIKE FACTORY
// ════════════════════════════════════
function makeBike(x, y, dx, dy, color, trailColor) {
  return { x, y, dx, dy, ndx: dx, ndy: dy, alive: true, trail: [], color, trailColor };
}

function makeEnemy(x, y, aggression) {
  const agColor = COLORS.e(aggression);
  return { x, y, dx: -1, dy: 0, ndx: -1, ndy: 0, alive: true, ag: aggression,
           trail: [], rand: Math.random, color: agColor, trailColor: agColor };
}

// ════════════════════════════════════
//  INIT ROUND
// ════════════════════════════════════
function initRound() {
  stopLoop();
  enemies = [];
  particles = [];
  ticks = 0;
  startDelay = 3;
  running = true;
  paused = false;

  const cx = Math.floor(COLS / 2) * CELL;
  const cy = Math.floor(ROWS / 2) * CELL;

  if (mode === 'pvp') {
    p1 = makeBike(Math.floor(COLS*0.2)*CELL, cy, 1, 0, COLORS.p1, COLORS.p1t);
    p2 = makeBike(Math.floor(COLS*0.8)*CELL, cy, -1, 0, COLORS.p2, COLORS.p2t);
    difficulty = diffLevel * 2;
  } else if (mode === 'coop') {
    p1 = makeBike(Math.floor(COLS*0.2)*CELL, Math.floor(ROWS*0.35)*CELL, 1, 0, COLORS.p1, COLORS.p1t);
    p2 = makeBike(Math.floor(COLS*0.2)*CELL, Math.floor(ROWS*0.65)*CELL, 1, 0, COLORS.p2, COLORS.p2t);
    difficulty = diffLevel;
    spawnEnemies();
  } else {
    p1 = makeBike(Math.floor(COLS*0.25)*CELL, cy, 1, 0, COLORS.p1, COLORS.p1t);
    p2 = null;
    difficulty = diffLevel;
    spawnEnemies();
  }

  updateHUD();
  showCountdown();
}

function spawnEnemies() {
  let count;
  if (mode === 'pve') {
    // Progressivo: Nível 1 começa com 1 inimigo, escala com o nível e dificuldade
    count = Math.min(level, Math.max(1, difficulty), 5);
  } else if (mode === 'coop') {
    count = Math.min(5, difficulty + 1);
  } else {
    count = Math.min(5, difficulty);
  }

  const stepY = Math.floor(ROWS / (count + 1));
  for (let i = 1; i <= count; i++) {
    enemies.push(makeEnemy((COLS - 3) * CELL, stepY * i * CELL, Math.min(5, difficulty)));
  }
}

function updateHUD() {
  const h1 = document.getElementById('h1');
  const hc = document.getElementById('hc');
  const h2 = document.getElementById('h2');
  if (mode === 'pve') {
    h1.textContent = `P1`;
    hc.textContent = `NÍVEL ${level}`;
  } else if (mode === 'pvp') {
    h1.textContent = `P1 · ${score1}`;
    h2.textContent = `${score2} · P2`;
    hc.textContent = `ROUND ${level}`;
  } else {
    h1.textContent = `P1`;
    h2.textContent = `P2`;
    hc.textContent = `NÍVEL ${level}`;
  }
}

// ════════════════════════════════════
//  COUNTDOWN
// ════════════════════════════════════
function showCountdown() {
  const el = document.getElementById('countdown');
  let n = startDelay;
  const show = () => {
    el.textContent = n > 0 ? n : 'GO!';
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 350);
    if (n <= 0) {
      setTimeout(() => startLoop(), 400);
      return;
    }
    n--;
    setTimeout(show, 1000);
  };
  show();
}

// ════════════════════════════════════
//  GAME LOOP
// ════════════════════════════════════
function startLoop() {
  stopLoop();
  if (!running) return;
  gameLoop = setInterval(tick, SPEED_MS[diffLevel - 1]);
}

function stopLoop() {
  if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
}

function stopGame() {
  stopLoop();
  running = false;
  paused = false;
  document.getElementById('pause-overlay').classList.remove('show');
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    stopLoop();
    document.getElementById('pause-overlay').classList.add('show');
  } else {
    document.getElementById('pause-overlay').classList.remove('show');
    startLoop();
  }
}

function tick() {
  ticks++;

  // PVE/COOP: scale difficulty over time
  if (mode !== 'pvp' && ticks % 400 === 0) {
    difficulty = Math.min(10, difficulty + 1);
    // speed up slightly each few ticks via restart loop
    stopLoop();
    const ms = Math.max(40, SPEED_MS[diffLevel-1] - Math.floor(ticks/400)*3);
    gameLoop = setInterval(tick, ms);
  }

  // Apply queued directions
  p1.dx = p1.ndx; p1.dy = p1.ndy;
  if (p2) { p2.dx = p2.ndx; p2.dy = p2.ndy; }

  // Save trail
  if (p1.alive) p1.trail.push({x: p1.x, y: p1.y});
  if (p2 && p2.alive) p2.trail.push({x: p2.x, y: p2.y});
  enemies.forEach(e => { if (e.alive) e.trail.push({x: e.x, y: e.y}); });

  // Trim trails
  const maxT = MAX_TRAIL;
  if (p1.trail.length > maxT) p1.trail.shift();
  if (p2 && p2.trail.length > maxT) p2.trail.shift();
  enemies.forEach(e => {
    while (e.trail.length > maxT) e.trail.shift();
  });

  // Move players
  movePlayer(p1);
  if (p2) movePlayer(p2);

  // Move enemies (AI)
  const target1 = p1.alive ? p1 : null;
  const target2 = p2 && p2.alive ? p2 : null;

  enemies.forEach(e => {
    if (!e.alive) return;
    const tgt = chooseTarget(e, target1, target2);
    moveAI(e, tgt);
  });

  // Collisions
  handleCollisions();

  // Update particles
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy;
    p.life -= 0.05;
    return p.life > 0;
  });

  // Next level for PVE/COOP
  if (mode !== 'pvp' && enemies.every(e => !e.alive)) {
    stopLoop();
    level++;
    difficulty = Math.min(10, difficulty + 1);
    setTimeout(() => {
      respawnForNextLevel();
    }, 800);
  }

  draw();
  checkGameOver();
}

function movePlayer(p) {
  if (!p.alive) return;
  p.x += p.dx * CELL;
  p.y += p.dy * CELL;
  if (p.x < 0 || p.y < 0 || p.x >= COLS * CELL || p.y >= ROWS * CELL) p.alive = false;
}

function chooseTarget(enemy, t1, t2) {
  if (!t1 && !t2) return null;
  if (!t1) return t2;
  if (!t2) return t1;
  const d1 = dist(enemy, t1), d2 = dist(enemy, t2);
  return d1 <= d2 ? t1 : t2;
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// ════════════════════════════════════
//  AI
// ════════════════════════════════════
function moveAI(e, target) {
  const heads = [];
  if (p1 && p1.alive) heads.push({x:p1.x, y:p1.y});
  if (p2 && p2.alive) heads.push({x:p2.x, y:p2.y});
  enemies.forEach(en => { if (en.alive && en !== e) heads.push({x:en.x, y:en.y}); });

  const allObs = new Set();
  if (p1) p1.trail.forEach(t => allObs.add(`${t.x},${t.y}`));
  if (p2) p2.trail.forEach(t => allObs.add(`${t.x},${t.y}`));
  enemies.forEach(en => en.trail.forEach(t => allObs.add(`${t.x},${t.y}`)));
  heads.forEach(h => allObs.add(`${h.x},${h.y}`));

  const dirs = [{dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0}];
  const valid = dirs.filter(d => {
    if (d.dx === -e.dx && d.dy === -e.dy) return false; // no 180
    const nx = e.x + d.dx * CELL;
    const ny = e.y + d.dy * CELL;
    if (nx < 0 || ny < 0 || nx >= COLS*CELL || ny >= ROWS*CELL) return false;
    if (allObs.has(`${nx},${ny}`)) return false;
    return true;
  });

  if (!valid.length) {
    e.x += e.dx * CELL; e.y += e.dy * CELL;
    if (e.x < 0 || e.y < 0 || e.x >= COLS*CELL || e.y >= ROWS*CELL) e.alive = false;
    return;
  }

  const aggressive = Math.random() * 100 < (e.ag * 15);

  let chosen;
  if (aggressive && target) {
    const sorted = valid.sort((a, b) => {
      const d1 = dist({x: e.x + a.dx * CELL, y: e.y + a.dy * CELL}, target);
      const d2 = dist({x: e.x + b.dx * CELL, y: e.y + b.dy * CELL}, target);
      return d1 - d2;
    });
    chosen = sorted[0];
  } else {
    const cur = valid.find(d => d.dx === e.dx && d.dy === e.dy);
    if (cur && Math.random() < 0.92) chosen = cur;
    else chosen = valid[Math.floor(Math.random() * valid.length)];
  }

  e.dx = chosen.dx; e.dy = chosen.dy;
  e.x += e.dx * CELL; e.y += e.dy * CELL;
  if (e.x < 0 || e.y < 0 || e.x >= COLS*CELL || e.y >= ROWS*CELL) e.alive = false;
}

// ════════════════════════════════════
//  COLLISIONS
// ════════════════════════════════════
function spawnExplosion(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x + CELL / 2, y: y + CELL / 2,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 1,
      color: color
    });
  }
}

function hitTrail(p, trail) {
  if (!p || !p.alive) return false;
  return trail.some(t => t.x === p.x && t.y === p.y);
}

function handleCollisions() {
  const allEnemiesTrails = [];
  enemies.forEach(e => allEnemiesTrails.push(...e.trail));

  // P1 vs trails/enemies
  if (p1.alive) {
    let hit = false;
    if (hitTrail(p1, p1.trail.slice(0, -SAFE))) hit = true;
    if (p2 && hitTrail(p1, p2.trail)) hit = true;
    if (enemies.some(e => hitTrail(p1, e.trail))) hit = true;
    if (enemies.some(e => e.alive && e.x === p1.x && e.y === p1.y)) hit = true;
    
    if (hit) {
      p1.alive = false;
      spawnExplosion(p1.x, p1.y, p1.color);
      p1.trail = [];
    }
    if (p2 && p2.alive && p1.x === p2.x && p1.y === p2.y) {
      p1.alive = false; p2.alive = false;
      spawnExplosion(p1.x, p1.y, '#fff');
      p1.trail = []; p2.trail = [];
    }
  }

  // P2 vs trails/enemies
  if (p2 && p2.alive) {
    let hit = false;
    if (hitTrail(p2, p2.trail.slice(0, -SAFE))) hit = true;
    if (hitTrail(p2, p1.trail)) hit = true;
    if (enemies.some(e => hitTrail(p2, e.trail))) hit = true;
    if (enemies.some(e => e.alive && e.x === p2.x && e.y === p2.y)) hit = true;

    if (hit) {
      p2.alive = false;
      spawnExplosion(p2.x, p2.y, p2.color);
      p2.trail = [];
    }
  }

  // Enemies vs trails/players
  enemies.forEach(e => {
    if (!e.alive) return;
    let hit = false;
    if (hitTrail(e, e.trail.slice(0, -SAFE))) hit = true;
    if (hitTrail(e, p1.trail)) hit = true;
    if (p2 && hitTrail(e, p2.trail)) hit = true;
    if (enemies.some(e2 => e2 !== e && hitTrail(e, e2.trail))) hit = true;
    if (p1.alive && e.x === p1.x && e.y === p1.y) hit = true;
    if (p2 && p2.alive && e.x === p2.x && e.y === p2.y) hit = true;

    if (hit) {
      e.alive = false;
      spawnExplosion(e.x, e.y, e.color);
    }
    
    // Enemy vs enemy head-on
    enemies.forEach(e2 => {
      if (e2 === e || !e2.alive) return;
      if (e.x === e2.x && e.y === e2.y) {
        e.alive = false; e2.alive = false;
        spawnExplosion(e.x, e.y, '#ff4500');
      }
    });
  });
}

// ════════════════════════════════════
//  GAME OVER / NEXT LEVEL
// ════════════════════════════════════
function checkGameOver() {
  if (mode === 'pve' && !p1.alive) {
    endGame('GAME OVER', 'TENTE NOVAMENTE', 'pve_lose');
  } else if (mode === 'pvp') {
    if (!p1.alive && (!p2 || !p2.alive)) endGame('EMPATE', 'AMBOS ELIMINADOS', 'tie');
    else if (!p1.alive) { score2++; endGame('P2 VENCEU', 'CICLO DESTRUÍDO', 'p2win'); }
    else if (p2 && !p2.alive) { score1++; endGame('P1 VENCEU', 'CICLO DESTRUÍDO', 'p1win'); }
  } else if (mode === 'coop') {
    if (!p1.alive && (!p2 || !p2.alive)) endGame('DERROTA', 'AMBOS ELIMINADOS', 'lose');
  }
}

function endGame(title, sub, type) {
  stopLoop(); running = false;
  document.getElementById('pause-overlay').classList.remove('show');
  setTimeout(() => {
    const el = document.getElementById('go-title');
    el.textContent = title;
    const colors = {pve_lose:'#ff4500',p2win:'#ffffff',p1win:'#0064ff',tie:'#aaa',lose:'#ff4500',win:'#00ff88'};
    el.style.color = colors[type] || '#fff';
    el.style.textShadow = `0 0 30px ${colors[type] || '#fff'}66`;
    document.getElementById('go-sub').textContent = sub;

    const scEl = document.getElementById('go-sc');
    if (mode === 'pvp') {
      scEl.innerHTML = `<div class="gos gos1">P1<span>${score1}</span></div><div class="gos gos2">P2<span>${score2}</span></div>`;
    } else if (mode === 'pve') {
      scEl.innerHTML = `<div class="gos" style="color:#0064ff">NÍVEL<span style="color:#0064ff">${level}</span></div>`;
    } else {
      scEl.innerHTML = `<div class="gos" style="color:#0064ff">NÍVEL<span style="color:#0064ff">${level}</span></div>`;
    }
    showScreen('s-gameover');
  }, 300);
}

function restartGame() {
  score1 = 0; score2 = 0; level = 1;
  showScreen('s-game');
  setupCanvas();
  initRound();
}

function respawnForNextLevel() {
  if (p1) p1.trail = [];
  if (p2) p2.trail = [];
  enemies = [];

  const cy = Math.floor(ROWS / 2) * CELL;
  if (mode === 'coop') {
    p1.x = Math.floor(COLS*0.2)*CELL; p1.y = Math.floor(ROWS*0.35)*CELL;
    p1.dx = 1; p1.dy = 0; p1.ndx = 1; p1.ndy = 0; p1.alive = true;
    if (p2) {
      p2.x = Math.floor(COLS*0.2)*CELL; p2.y = Math.floor(ROWS*0.65)*CELL;
      p2.dx = 1; p2.dy = 0; p2.ndx = 1; p2.ndy = 0; p2.alive = true;
    }
  } else {
    p1.x = Math.floor(COLS*0.25)*CELL; p1.y = cy;
    p1.dx = 1; p1.dy = 0; p1.ndx = 1; p1.ndy = 0; p1.alive = true;
  }

  spawnEnemies();
  updateHUD();
  startDelay = 2;
  showCountdown();
}

// ════════════════════════════════════
//  DRAW
// ════════════════════════════════════
function draw() {
  // Deep space background with radial glow
  const grad = ctx.createRadialGradient(C.width/2, C.height/2, 0, C.width/2, C.height/2, C.width/1.2);
  grad.addColorStop(0, '#0d0d1a');
  grad.addColorStop(1, '#050508');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, C.width, C.height);

  // Subtle scanlines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  for (let i = 0; i < C.height; i += 4) {
    ctx.fillRect(0, i, C.width, 1);
  }

  // Draw Trails
  if (p1) drawTrail(p1.trail, p1.trailColor);
  if (p2) drawTrail(p2.trail, p2.trailColor);
  enemies.forEach(e => drawTrail(e.trail, e.trailColor));

  // Draw Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.shadowBlur = 5;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Draw Bikes
  if (p1 && p1.alive) drawBike(p1, p1.color);
  if (p2 && p2.alive) drawBike(p2, p2.color);
  enemies.forEach(e => { if (e.alive) drawBike(e, e.color); });
}

function drawTrail(trail, color) {
  if (trail.length < 2) return;
  
  ctx.save();
  // Outer glow
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = CELL - 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw the main beam
  ctx.beginPath();
  ctx.moveTo(trail[0].x + CELL/2, trail[0].y + CELL/2);
  for (let i = 1; i < trail.length; i++) {
    ctx.lineTo(trail[i].x + CELL/2, trail[i].y + CELL/2);
  }
  
  // Fade trail based on age
  const n = trail.length;
  ctx.globalAlpha = 0.6;
  ctx.stroke();

  // Inner bright core
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  
  ctx.restore();
}

function drawBike(b, color) {
  const { x, y, dx, dy } = b;
  ctx.save();
  ctx.translate(x + CELL/2, y + CELL/2);
  
  // Rotate based on direction
  if (dx === 1) ctx.rotate(0);
  else if (dx === -1) ctx.rotate(Math.PI);
  else if (dy === 1) ctx.rotate(Math.PI/2);
  else if (dy === -1) ctx.rotate(-Math.PI/2);

  // Outer glow
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  
  // Bike body (more aerodynamic shape)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-CELL/2, -CELL/2 + 1, CELL, CELL - 2, 3);
  ctx.fill();
  
  // Cockpit/Core
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, -CELL/4, CELL/3, CELL/2);
  
  // Front light
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(CELL/3, -CELL/2 + 2, 2, CELL - 4);

  ctx.restore();
}

// ════════════════════════════════════
//  CONTROLS
// ════════════════════════════════════
function setDir(p, dir) {
  if (!p || !p.alive) return;
  const map = {U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
  const [ndx,ndy] = map[dir];
  if (ndx === -p.dx && ndy === -p.dy) return; // no 180
  p.ndx = ndx; p.ndy = ndy;
}
function d1(dir) { setDir(p1, dir); }
function d2(dir) { setDir(p2, dir); }

// keyboard
document.addEventListener('keydown', e => {
  const k = e.key;
  if (k==='ArrowUp'){e.preventDefault();d1('U')}
  if (k==='ArrowDown'){e.preventDefault();d1('D')}
  if (k==='ArrowLeft'){e.preventDefault();d1('L')}
  if (k==='ArrowRight'){e.preventDefault();d1('R')}
  if (k==='w'||k==='W') d2('U');
  if (k==='s'||k==='S') d2('D');
  if (k==='a'||k==='A') d2('L');
  if (k==='d'||k==='D') d2('R');
  if (k==='p'||k==='P'||k==='Escape') togglePause();
});

// Handle resize/orientation change
window.addEventListener('resize', () => {
  if (running && !paused) togglePause();
  setupCanvas();
  if (running) draw(); // Redraw if game is active
});