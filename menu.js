const cells = ['O','X','', '','O','X', '','X','O'];
const board = document.getElementById('board');
cells.forEach(v => {
    const c = document.createElement('div');
    c.className = 'cell';
    if (v) c.innerHTML = `<span class="mark ${v}"></span>`;
    board.appendChild(c);
});
const l = document.createElement('div');
l.className = 'win-line';
board.appendChild(l);

// chess preview: starting position
const glyph = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟︎' };
const rows = ['rnbqkbnr', 'pppppppp', '', '', '', '', 'PPPPPPPP', 'RNBQKBNR'];
const preview = document.getElementById('chessPreview');
rows.forEach((row, r) => {
    for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        sq.className = 'sq ' + ((r + c) % 2 ? 'dark' : 'light');
        const ch = row[c];
        if (ch) {
            const white = ch === ch.toUpperCase();
            sq.innerHTML = `<span class="piece ${white ? 'w' : 'b'}">${glyph[ch.toUpperCase()]}</span>`;
        }
        preview.appendChild(sq);
    }
});

// ---------- game carousel ----------
const slides = [...document.querySelectorAll('.slide')];
const prev = document.getElementById('prev');
const next = document.getElementById('next');
const play = document.querySelector('.btn-play');
let current = 0;

function render() {
    slides.forEach((s, i) => {
        s.classList.toggle('active', i === current);
        s.classList.toggle('next', i > current);
        s.classList.toggle('prev', i < current);
        s.classList.toggle('far', Math.abs(i - current) > 1);
        s.style.setProperty('--o', i - current);
    });
    prev.hidden = current === 0;
    next.hidden = current === slides.length - 1;
    play.href = slides[current].dataset.href;
}

function go(i) {
    if (i < 0 || i >= slides.length) return;
    current = i;
    render();
}

prev.addEventListener('click', () => go(current - 1));
next.addEventListener('click', () => go(current + 1));
slides.forEach((s, i) => s.addEventListener('click', () => { if (i !== current) go(i); }));
render();

play.addEventListener('click', () => {
    try { sessionStorage.setItem('fromMenu', '1'); } catch (e) {}
});
