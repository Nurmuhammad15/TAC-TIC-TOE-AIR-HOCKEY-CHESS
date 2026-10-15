const GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟︎' };
const START = ['rnbqkbnr', 'pppppppp', '', '', '', '', 'PPPPPPPP', 'RNBQKBNR'];
const PROMO_PIECES = ['Q', 'R', 'B', 'N'];
const KNIGHT = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];

const otherColor = c => (c === 'w' ? 'b' : 'w');
const onBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

// ---------- chess rules ----------
function newState() {
    const board = START.map(row => {
        const cells = Array(8).fill(null);
        [...row].forEach((ch, c) => {
            const white = ch === ch.toUpperCase();
            cells[c] = { t: ch.toUpperCase(), c: white ? 'w' : 'b' };
        });
        return cells;
    });
    return { board, turn: 'w', castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: null, half: 0 };
}

function isAttacked(board, r, c, by) {
    const pr = by === 'w' ? r + 1 : r - 1;
    for (const dc of [-1, 1]) {
        if (onBoard(pr, c + dc)) {
            const p = board[pr][c + dc];
            if (p && p.c === by && p.t === 'P') return true;
        }
    }
    for (const [dr, dc] of KNIGHT) {
        if (onBoard(r + dr, c + dc)) {
            const p = board[r + dr][c + dc];
            if (p && p.c === by && p.t === 'N') return true;
        }
    }
    for (const [dr, dc] of KING) {
        if (onBoard(r + dr, c + dc)) {
            const p = board[r + dr][c + dc];
            if (p && p.c === by && p.t === 'K') return true;
        }
    }
    const ray = (dirs, types) => {
        for (const [dr, dc] of dirs) {
            let rr = r + dr, cc = c + dc;
            while (onBoard(rr, cc)) {
                const p = board[rr][cc];
                if (p) {
                    if (p.c === by && types.includes(p.t)) return true;
                    break;
                }
                rr += dr; cc += dc;
            }
        }
        return false;
    };
    return ray(ROOK_DIRS, ['R', 'Q']) || ray(BISHOP_DIRS, ['B', 'Q']);
}

function findKing(board, color) {
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.t === 'K' && p.c === color) return [r, c];
        }
}

function pseudoMoves(st) {
    const { board, turn, castle, ep } = st;
    const moves = [];
    const add = (fr, fc, tr, tc, extra) => moves.push({ fr, fc, tr, tc, ...extra });

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p || p.c !== turn) continue;

            if (p.t === 'P') {
                const dir = turn === 'w' ? -1 : 1;
                const startRow = turn === 'w' ? 6 : 1;
                const promoRow = turn === 'w' ? 0 : 7;
                const push = (tr, tc, extra) => {
                    if (tr === promoRow) PROMO_PIECES.forEach(promo => add(r, c, tr, tc, { promo, ...extra }));
                    else add(r, c, tr, tc, extra);
                };
                if (onBoard(r + dir, c) && !board[r + dir][c]) {
                    push(r + dir, c);
                    if (r === startRow && !board[r + 2 * dir][c]) add(r, c, r + 2 * dir, c, { double: true });
                }
                for (const dc of [-1, 1]) {
                    const tr = r + dir, tc = c + dc;
                    if (!onBoard(tr, tc)) continue;
                    const t = board[tr][tc];
                    if (t && t.c !== turn) push(tr, tc);
                    else if (!t && ep && ep.r === tr && ep.c === tc) add(r, c, tr, tc, { enPassant: true });
                }
            } else if (p.t === 'N' || p.t === 'K') {
                for (const [dr, dc] of (p.t === 'N' ? KNIGHT : KING)) {
                    const tr = r + dr, tc = c + dc;
                    if (onBoard(tr, tc) && (!board[tr][tc] || board[tr][tc].c !== turn)) add(r, c, tr, tc);
                }
            } else {
                const dirs = p.t === 'R' ? ROOK_DIRS : p.t === 'B' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
                for (const [dr, dc] of dirs) {
                    let tr = r + dr, tc = c + dc;
                    while (onBoard(tr, tc)) {
                        const t = board[tr][tc];
                        if (!t) add(r, c, tr, tc);
                        else {
                            if (t.c !== turn) add(r, c, tr, tc);
                            break;
                        }
                        tr += dr; tc += dc;
                    }
                }
            }
        }
    }

    // castling
    const home = turn === 'w' ? 7 : 0;
    const king = board[home][4];
    if (king && king.t === 'K' && king.c === turn && !isAttacked(board, home, 4, otherColor(turn))) {
        const rookAt = c => board[home][c] && board[home][c].t === 'R' && board[home][c].c === turn;
        if (castle[turn + 'K'] && rookAt(7) && !board[home][5] && !board[home][6] &&
            !isAttacked(board, home, 5, otherColor(turn)) && !isAttacked(board, home, 6, otherColor(turn))) {
            add(home, 4, home, 6, { castle: 'K' });
        }
        if (castle[turn + 'Q'] && rookAt(0) && !board[home][1] && !board[home][2] && !board[home][3] &&
            !isAttacked(board, home, 3, otherColor(turn)) && !isAttacked(board, home, 2, otherColor(turn))) {
            add(home, 4, home, 2, { castle: 'Q' });
        }
    }
    return moves;
}

function applyMove(st, m) {
    const board = st.board.map(row => row.slice());
    const castle = { ...st.castle };
    const piece = board[m.fr][m.fc];
    const captured = board[m.tr][m.tc];

    board[m.fr][m.fc] = null;
    board[m.tr][m.tc] = m.promo ? { t: m.promo, c: piece.c } : piece;
    if (m.enPassant) board[m.fr][m.tc] = null;
    if (m.castle === 'K') { board[m.tr][5] = board[m.tr][7]; board[m.tr][7] = null; }
    if (m.castle === 'Q') { board[m.tr][3] = board[m.tr][0]; board[m.tr][0] = null; }

    if (piece.t === 'K') { castle[piece.c + 'K'] = false; castle[piece.c + 'Q'] = false; }
    const corner = (r, c) => {
        if (r === 7 && c === 0) castle.wQ = false;
        if (r === 7 && c === 7) castle.wK = false;
        if (r === 0 && c === 0) castle.bQ = false;
        if (r === 0 && c === 7) castle.bK = false;
    };
    corner(m.fr, m.fc);
    corner(m.tr, m.tc);

    return {
        board,
        turn: otherColor(st.turn),
        castle,
        ep: m.double ? { r: (m.fr + m.tr) / 2, c: m.fc } : null,
        half: piece.t === 'P' || captured || m.enPassant ? 0 : st.half + 1
    };
}

function legalMoves(st) {
    return pseudoMoves(st).filter(m => {
        const next = applyMove(st, m);
        const [kr, kc] = findKing(next.board, st.turn);
        return !isAttacked(next.board, kr, kc, next.turn);
    });
}

function inCheck(st) {
    const [kr, kc] = findKing(st.board, st.turn);
    return isAttacked(st.board, kr, kc, otherColor(st.turn));
}

function insufficientMaterial(board) {
    const pieces = [];
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.t !== 'K') pieces.push({ ...p, sq: (r + c) % 2 });
        }
    if (pieces.length === 0) return true;
    if (pieces.length === 1) return pieces[0].t === 'B' || pieces[0].t === 'N';
    return pieces.every(p => p.t === 'B') && pieces.every(p => p.sq === pieces[0].sq);
}

function positionKey(st) {
    const b = st.board.map(row => row.map(p => (p ? p.c + p.t : '--')).join('')).join('/');
    const rights = Object.keys(st.castle).filter(k => st.castle[k]).join('');
    return `${b} ${st.turn} ${rights} ${st.ep ? st.ep.c : '-'}`;
}

// ---------- UI ----------
const boardEl = document.getElementById('chessboard');
const statusEl = document.getElementById('status');
const promoEl = document.getElementById('promo');
const promoChoices = document.getElementById('promoChoices');
const endEl = document.getElementById('end');
const endText = document.getElementById('endText');
const whiteEl = document.getElementById('pWhite');

let st, legal, selected, last, seen, over;
const cells = [];

for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
        const el = document.createElement('div');
        el.className = 'sq ' + ((r + c) % 2 ? 'dark' : 'light');
        el.addEventListener('click', () => onSquare(r, c));
        boardEl.appendChild(el);
        cells.push(el);
    }
}

function newGame() {
    st = newState();
    legal = legalMoves(st);
    selected = null;
    last = null;
    over = false;
    seen = { [positionKey(st)]: 1 };
    endEl.hidden = true;
    promoEl.hidden = true;
    render();
}

function render() {
    const checked = inCheck(st);
    const king = checked ? findKing(st.board, st.turn) : null;
    const targets = selected ? legal.filter(m => m.fr === selected[0] && m.fc === selected[1]) : [];

    cells.forEach((el, i) => {
        const r = Math.floor(i / 8), c = i % 8;
        const p = st.board[r][c];
        el.className = 'sq ' + ((r + c) % 2 ? 'dark' : 'light');
        el.innerHTML = p ? `<span class="piece ${p.c}">${GLYPH[p.t]}</span>` : '';
        if (selected && selected[0] === r && selected[1] === c) el.classList.add('selected');
        if (last && ((last.fr === r && last.fc === c) || (last.tr === r && last.tc === c))) el.classList.add('last');
        if (king && king[0] === r && king[1] === c) el.classList.add('check');
        if (targets.some(m => m.tr === r && m.tc === c)) el.classList.add(p || targets.some(m => m.tr === r && m.tc === c && m.enPassant) ? 'capture' : 'target');
    });

    whiteEl.classList.toggle('active', !over && st.turn === 'w');
    statusEl.textContent = over ? '' : checked ? 'Шах!' : '';
}

function onSquare(r, c) {
    if (over || !promoEl.hidden) return;
    const p = st.board[r][c];
    const options = selected ? legal.filter(m => m.fr === selected[0] && m.fc === selected[1] && m.tr === r && m.tc === c) : [];

    if (options.length) {
        if (options[0].promo) askPromotion(options);
        else play(options[0]);
    } else if (p && p.c === st.turn && !(selected && selected[0] === r && selected[1] === c)) {
        selected = [r, c];
        render();
    } else {
        selected = null;
        render();
    }
}

function askPromotion(options) {
    promoChoices.innerHTML = '';
    options.forEach(m => {
        const b = document.createElement('button');
        b.className = 'promo-btn ' + st.turn;
        b.textContent = GLYPH[m.promo];
        b.addEventListener('click', () => { promoEl.hidden = true; play(m); });
        promoChoices.appendChild(b);
    });
    promoEl.hidden = false;
}

function play(m) {
    st = applyMove(st, m);
    last = m;
    selected = null;
    legal = legalMoves(st);

    const key = positionKey(st);
    seen[key] = (seen[key] || 0) + 1;

    let result = null;
    if (!legal.length) {
        result = inCheck(st)
            ? `Мат! Победили ${st.turn === 'w' ? 'чёрные' : 'белые'}`
            : 'Пат. Ничья';
    } else if (insufficientMaterial(st.board)) result = 'Ничья: мало фигур';
    else if (st.half >= 100) result = 'Ничья: 50 ходов без взятий';
    else if (seen[key] >= 3) result = 'Ничья: тройное повторение';

    if (result) {
        over = true;
        endText.textContent = result;
        render();
        setTimeout(() => { endEl.hidden = false; }, 700);
    } else {
        render();
    }
}

document.getElementById('restart').addEventListener('click', newGame);
newGame();
