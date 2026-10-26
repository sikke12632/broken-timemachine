// 그림자 맞추기 (5-2 수학: 합동)
// 탐험가(A)는 창밖 벽에 비친 그림자(모눈 위 조각 모양)를 본다.
// 기술자(B)는 조각 카드 4장을 가졌다. 돌리거나(숙련은 뒤집기까지) 놓아서, 그림자와 꼭 포개어지는(합동) 카드는 하나뿐.
// 가짜 카드는 칸 하나를 옮긴 모양이라 어떻게 돌리고 뒤집어도 포개어지지 않는다.
// 기술자가 카드를 고른다. 칸 수: 1·2단계 5칸, 3·4단계 6칸, 5·6단계 7칸.
import { rng, shuffle, pick } from './rand.js';

export const kind = 'shadow';
export const roles = { A: 'explorer', B: 'tech' };
export const actor = 'B';
export const BOX = 4; // 조각은 4×4 칸 안에

const norm = (cells) => {
  const mx = Math.min(...cells.map((c) => c[0])),
    my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};
const key = (cells) => norm(cells).map(String).join('|');
const rot = (cells) => cells.map(([x, y]) => [-y, x]); // 90도
const flip = (cells) => cells.map(([x, y]) => [-x, y]); // 좌우 뒤집기
// 돌리기(·뒤집기)로 나올 수 있는 모든 모양
export function variants(cells, withFlip) {
  const out = [];
  let c = cells;
  for (let i = 0; i < 4; i++) {
    out.push(norm(c));
    if (withFlip) out.push(norm(flip(c)));
    c = rot(c);
  }
  return out;
}
// 합동인가(돌리기·뒤집기 모두 허용 — 가짜는 이것으로도 안 맞아야 한다)
export const congruent = (a, b) => variants(a, true).some((v) => key(v) === key(b));
const fits = (cells) => {
  const n = norm(cells);
  return Math.max(...n.map((c) => c[0])) < BOX && Math.max(...n.map((c) => c[1])) < BOX;
};
const connected = (cells) => {
  const s = new Set(cells.map(String));
  const seen = new Set([String(cells[0])]);
  const q = [cells[0]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = x + dx + ',' + (y + dy);
      if (s.has(k) && !seen.has(k)) seen.add(k), q.push([x + dx, y + dy]);
    }
  }
  return seen.size === cells.length;
};

function randomPiece(R, k) {
  for (;;) {
    const cells = [[0, 0]];
    const has = new Set(['0,0']);
    while (cells.length < k) {
      const [x, y] = pick(R, cells);
      const [dx, dy] = pick(R, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const kk = x + dx + ',' + (y + dy);
      if (has.has(kk)) continue;
      has.add(kk);
      cells.push([x + dx, y + dy]);
    }
    // 돌리면 똑같아지는(대칭) 모양은 피한다 — 돌린 카드가 그냥 같아 보이면 재미가 없다
    if (fits(cells) && new Set(variants(cells, true).map(key)).size >= 4) return norm(cells);
  }
}
// 칸 하나를 다른 곳으로 옮긴 가짜
function fake(R, cells) {
  for (let t = 0; t < 200; t++) {
    const c = cells.slice();
    c.splice(Math.floor(R() * c.length), 1);
    const [x, y] = pick(R, c);
    const [dx, dy] = pick(R, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
    const n = [x + dx, y + dy];
    if (c.some((p) => p[0] === n[0] && p[1] === n[1])) continue;
    c.push(n);
    if (connected(c) && fits(c)) return norm(c);
  }
  return null;
}

export function make(seed, level, tier) {
  const R = rng(seed);
  const k = 5 + Math.min(tier || 0, 2);
  const mid = level === 'mid';
  for (;;) {
    const piece = randomPiece(R, k);
    const answer = Math.floor(R() * 4);
    const cards = [];
    let ok = true;
    for (let i = 0; i < 4 && ok; i++) {
      let c;
      if (i === answer) {
        // 진짜: 그림자와 다르게 돌려 놓는다(숙련은 뒤집기도)
        const vs = variants(piece, mid).filter((v) => key(v) !== key(piece));
        c = pick(R, vs);
      } else {
        c = fake(R, piece);
        if (!c || congruent(c, piece) || cards.some((d) => congruent(d, c))) ok = false;
        else c = pick(R, variants(c, mid));
      }
      cards.push(c);
    }
    if (!ok) continue;
    return { kind, seed, level, tier, mid, piece, cards, answer };
  }
}
export const check = (inst, a) => !!a && a.pick === inst.answer;
export const solve = (inst) => ({ pick: inst.answer });
