const W = 320, H = 600;            // logical field size
const INSET = 12;                  // wall line distance from the edge
const PADDLE_R = 30, PUCK_R = 16, GOAL_W = 130, WIN_SCORE = 7;
const MAX_PUCK_SPEED = 20, PADDLE_SPEED = 9, MAX_POINTER_SPEED = 28;

const canvas = document.getElementById('rink');
const ctx = canvas.getContext('2d');
const pauseMenu = document.getElementById('pauseMenu');

// top player: WASD, bottom player: arrows
const paddles = {
    top:    { x: W / 2, y: 130,     px: W / 2, py: 130,     color: '#22e022',
              keys: { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS' } },
    bottom: { x: W / 2, y: H - 130, px: W / 2, py: H - 130, color: '#ff1e1e',
              keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' } }
};
const puck = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
const scores = { top: 0, bottom: 0 };
let paused = false, menuOpen = false, resetTimer;

// ---------- sizing ----------
function resize() {
    const h = Math.max(300, window.innerHeight - 20);
    const w = Math.min(window.innerWidth - 20, h * W / H);
    const ch = w * H / W;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = w + 'px';
    canvas.style.height = ch + 'px';
    canvas.width = w * dpr;
    canvas.height = ch * dpr;
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
}
window.addEventListener('resize', resize);

// ---------- input (keyboard + mouse / touch) ----------
const keys = new Set();
window.addEventListener('keydown', e => {
    if (e.code.startsWith('Arrow')) e.preventDefault();
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) togglePause();
    keys.add(e.code);
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// pause button is drawn on the canvas, so hit-test clicks
const PAUSE_BTN = { x: W - 48, y: H / 2, r: 24 };
const pointerSide = new Map();

function toField(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
function aim(side, p) {
    paddles[side].target = { x: p.x, y: p.y };
}
canvas.addEventListener('pointerdown', e => {
    const p = toField(e);
    if (Math.hypot(p.x - PAUSE_BTN.x, p.y - PAUSE_BTN.y) <= PAUSE_BTN.r) { togglePause(); return; }
    pointerSide.set(e.pointerId, e.pointerType === 'mouse' || p.y >= H / 2 ? 'bottom' : 'top');
    canvas.setPointerCapture(e.pointerId);
    aim(pointerSide.get(e.pointerId), p);
});
canvas.addEventListener('pointermove', e => {
    const p = toField(e);
    if (e.pointerType === 'mouse') {
        aim('bottom', p);                         // mouse: always the red (bottom) paddle
    } else if (pointerSide.has(e.pointerId)) {
        aim(pointerSide.get(e.pointerId), p);     // touch: each finger keeps its paddle
    }
});
['pointerup', 'pointercancel'].forEach(t =>
    canvas.addEventListener(t, e => pointerSide.delete(e.pointerId)));

function togglePause() {
    menuOpen = !menuOpen;
    pauseMenu.hidden = !menuOpen;
    keys.clear();
}
document.getElementById('resume').addEventListener('click', togglePause);
document.getElementById('restart').addEventListener('click', () => { togglePause(); restart(); });

// ---------- physics ----------
function movePaddle(side) {
    const p = paddles[side], k = p.keys;
    p.px = p.x; p.py = p.y;
    const kx = (keys.has(k.r) ? 1 : 0) - (keys.has(k.l) ? 1 : 0);
    const ky = (keys.has(k.d) ? 1 : 0) - (keys.has(k.u) ? 1 : 0);
    if (kx || ky) {
        p.target = null;                       // keys take over from the mouse
        p.x += kx * PADDLE_SPEED;
        p.y += ky * PADDLE_SPEED;
    } else if (p.target) {
        const dx = p.target.x - p.x, dy = p.target.y - p.y;
        const d = Math.hypot(dx, dy);
        const s = d > MAX_POINTER_SPEED ? MAX_POINTER_SPEED / d : 1;
        p.x += dx * s;
        p.y += dy * s;
    }
    const minY = side === 'top' ? INSET + PADDLE_R : H / 2 + PADDLE_R;
    const maxY = side === 'top' ? H / 2 - PADDLE_R : H - INSET - PADDLE_R;
    p.x = Math.max(INSET + PADDLE_R, Math.min(W - INSET - PADDLE_R, p.x));
    p.y = Math.max(minY, Math.min(maxY, p.y));
}

function hitPaddle(p) {
    const dx = puck.x - p.x, dy = puck.y - p.y;
    const d = Math.hypot(dx, dy) || 0.001;
    if (d >= PADDLE_R + PUCK_R) return;
    const nx = dx / d, ny = dy / d;
    puck.x = p.x + nx * (PADDLE_R + PUCK_R);
    puck.y = p.y + ny * (PADDLE_R + PUCK_R);
    const pvx = p.x - p.px, pvy = p.y - p.py;
    const rvx = puck.vx - pvx, rvy = puck.vy - pvy;
    const dot = rvx * nx + rvy * ny;
    if (dot < 0) {
        puck.vx = pvx + rvx - 1.9 * dot * nx;
        puck.vy = pvy + rvy - 1.9 * dot * ny;
    }
}

function step() {
    if (menuOpen) return;
    movePaddle('top');
    movePaddle('bottom');
    if (paused) return;

    puck.x += puck.vx;
    puck.y += puck.vy;
    puck.vx *= 0.995;
    puck.vy *= 0.995;

    hitPaddle(paddles.top);
    hitPaddle(paddles.bottom);

    const sp = Math.hypot(puck.vx, puck.vy);
    if (sp > MAX_PUCK_SPEED) { puck.vx *= MAX_PUCK_SPEED / sp; puck.vy *= MAX_PUCK_SPEED / sp; }

    const left = INSET + PUCK_R, right = W - INSET - PUCK_R;
    if (puck.x < left) { puck.x = left; puck.vx = Math.abs(puck.vx) * 0.95; }
    if (puck.x > right) { puck.x = right; puck.vx = -Math.abs(puck.vx) * 0.95; }

    const inGoal = Math.abs(puck.x - W / 2) < GOAL_W / 2 - PUCK_R * 0.4;
    if (puck.y < INSET + PUCK_R && !inGoal) { puck.y = INSET + PUCK_R; puck.vy = Math.abs(puck.vy) * 0.95; }
    if (puck.y > H - INSET - PUCK_R && !inGoal) { puck.y = H - INSET - PUCK_R; puck.vy = -Math.abs(puck.vy) * 0.95; }

    if (puck.y < -PUCK_R) goal('bottom');
    else if (puck.y > H + PUCK_R) goal('top');
}

// ---------- game flow ----------
function placeAll() {
    puck.x = W / 2;
    puck.y = H / 2;
    puck.vx = puck.vy = 0;
    paddles.top.target = paddles.bottom.target = null;
    paddles.top.x = paddles.top.px = W / 2;
    paddles.top.y = paddles.top.py = 130;
    paddles.bottom.x = paddles.bottom.px = W / 2;
    paddles.bottom.y = paddles.bottom.py = H - 130;
}

function showBanner(text) {
    const b = document.createElement('div');
    b.className = 'banner';
    b.textContent = text;
    document.body.appendChild(b);
}

function goal(scorer) {
    scores[scorer]++;
    paused = true;
    if (scores[scorer] >= WIN_SCORE) {
        showBanner(scorer === 'top' ? 'Победил зелёный!' : 'Победил красный!');
        resetTimer = setTimeout(restart, 3500);
    } else {
        showBanner('ГОЛ!');
        resetTimer = setTimeout(() => {
            document.querySelectorAll('.banner').forEach(e => e.remove());
            placeAll();
            paused = false;
        }, 1200);
    }
}

function restart() {
    clearTimeout(resetTimer);
    document.querySelectorAll('.banner').forEach(e => e.remove());
    scores.top = scores.bottom = 0;
    placeAll();
    paused = false;
}

// ---------- drawing ----------
function glow(color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
}

function wall(color, x1, y1, x2, y2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    glow(color, 14);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    glow('transparent', 0);
}

function drawPaddle(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, PADDLE_R, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    glow(p.color, 18);
    ctx.fill();
    glow('transparent', 0);
    ctx.beginPath();
    ctx.arc(p.x, p.y, PADDLE_R * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
}

function drawScore(value, y, flip) {
    ctx.save();
    ctx.translate(W - 48, y);
    ctx.rotate(flip ? -Math.PI / 2 : Math.PI / 2);
    ctx.fillStyle = '#6fd6ff';
    glow('#35d6ff', 10);
    ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, 0, 0);
    ctx.restore();
    glow('transparent', 0);
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // center line, center circle, goal arcs
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(INSET, H / 2);
    ctx.lineTo(W - INSET, H / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, INSET, 58, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H - INSET, 58, Math.PI, Math.PI * 2);
    ctx.stroke();

    // neon walls: green / red on top, blue / yellow on the bottom
    const gl = (W - GOAL_W) / 2, gr = (W + GOAL_W) / 2, I = INSET, mid = H / 2;
    wall('#22e022', I, I, I, mid - 4);   wall('#22e022', I + 4, I, gl, I);
    wall('#ff1e1e', W - I, I, W - I, mid - 4); wall('#ff1e1e', gr, I, W - I - 4, I);
    wall('#2a5cff', I, mid + 4, I, H - I); wall('#2a5cff', I + 4, H - I, gl, H - I);
    wall('#ffe81a', W - I, mid + 4, W - I, H - I); wall('#ffe81a', gr, H - I, W - I - 4, H - I);

    drawScore(scores.top, mid - 90, true);
    drawScore(scores.bottom, mid + 90, false);

    // pause button
    ctx.strokeStyle = '#35d6ff';
    ctx.lineWidth = 3;
    glow('#35d6ff', 10);
    ctx.beginPath();
    ctx.arc(PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(PAUSE_BTN.x - 5, PAUSE_BTN.y - 8);
    ctx.lineTo(PAUSE_BTN.x - 5, PAUSE_BTN.y + 8);
    ctx.moveTo(PAUSE_BTN.x + 5, PAUSE_BTN.y - 8);
    ctx.lineTo(PAUSE_BTN.x + 5, PAUSE_BTN.y + 8);
    ctx.stroke();
    glow('transparent', 0);

    drawPaddle(paddles.top);
    drawPaddle(paddles.bottom);

    ctx.beginPath();
    ctx.arc(puck.x, puck.y, PUCK_R, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    glow('#ffd21a', 18);
    ctx.fill();
    glow('transparent', 0);
}

function loop() {
    step();
    draw();
    requestAnimationFrame(loop);
}

resize();
placeAll();
loop();
