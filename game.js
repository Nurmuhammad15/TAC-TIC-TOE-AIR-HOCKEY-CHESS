const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const board = document.getElementById('board');
const statusEl = document.getElementById('status');
let state, turn, over, nextTimer;
const scores = { X: 0, O: 0 };

function start() {
    clearTimeout(nextTimer);
    document.querySelectorAll('.celebrate, .banner').forEach(e => e.remove());
    state = Array(9).fill('');
    turn = 'X';
    over = false;
    board.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const c = document.createElement('div');
        c.className = 'cell';
        c.addEventListener('click', () => move(i, c));
        board.appendChild(c);
    }
    statusEl.textContent = '';
    setTurn();
}

function setTurn(off) {
    document.getElementById('pX').classList.toggle('active', !off && turn === 'X');
    document.getElementById('pO').classList.toggle('active', !off && turn === 'O');
}

function celebrate(sym) {
    const layer = document.createElement('div');
    layer.className = 'celebrate';
    document.body.appendChild(layer);
    for (let i = 0; i < 40; i++) {
        const m = document.createElement('span');
        m.className = 'mark ' + sym + ' rise';
        const size = 30 + Math.random() * 50;
        m.style.width = m.style.height = size + 'px';
        m.style.left = Math.random() * 100 + '%';
        m.style.animationDuration = 2 + Math.random() * 2 + 's';
        m.style.animationDelay = Math.random() * 1 + 's';
        layer.appendChild(m);
    }
    setTimeout(() => layer.remove(), 5000);
}

function showBanner(text) {
    const b = document.createElement('div');
    b.className = 'banner';
    b.textContent = text;
    document.body.appendChild(b);
    nextTimer = setTimeout(start, 3500);
}

function move(i, cell) {
    if (over || state[i]) return;
    state[i] = turn;
    cell.innerHTML = `<span class="mark ${turn}"></span>`;
    const win = LINES.find(l => l.every(k => state[k] === turn));
    if (win) {
        over = true;
        win.forEach(k => board.children[k].classList.add('win'));
        scores[turn]++;
        document.getElementById('s' + turn).textContent = scores[turn];
        showBanner(`Победил ${turn}!`);
        setTurn(true);
        celebrate(turn);
    } else if (state.every(Boolean)) {
        over = true;
        showBanner('Ничья');
        setTurn(true);
    } else {
        turn = turn === 'X' ? 'O' : 'X';
        setTurn();
    }
}

document.getElementById('restart').addEventListener('click', start);
start();
