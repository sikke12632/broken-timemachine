// 전개도 상자 (5-2 수학: 직육면체·정육면체의 전개도)
// 조종사(A)는 그림이 그려진 3D 상자를 돌려 본다. 기술자(B)는 전개도 3~4장을 가졌는데 진짜는 하나다.
// 가짜 전개도는 "마주 보는 면" 짝이 진짜와 다르게 만든다. 그래서 "해 맞은편에 무슨 그림이 있어?"를
// 물어 가며 찾을 수 있다. 전개도는 실제로 접어 보고(굴리기) 정육면체가 되는 모양만 쓴다.
import { rng, pick, shuffle } from './rand.js';

export const kind = 'net';
export const roles = { A: 'pilot', B: 'tech' };
export const actor = 'B';
export const ICONS = ['sun', 'moon', 'star', 'flower', 'fish', 'tree'];
export const ICON_NAME = { sun: '해', moon: '달', star: '별', flower: '꽃', fish: '물고기', tree: '나무' };
// 상자 면(방향): U 위, D 아래, N 뒤, S 앞, E 오른쪽, W 왼쪽
export const FACES = ['U', 'D', 'N', 'S', 'E', 'W'];
export const OPP = { U: 'D', D: 'U', N: 'S', S: 'N', E: 'W', W: 'E' };

// 상자를 한 칸 굴린다: o[방향] = 그 방향을 보는 상자 면
function roll(o, dir) {
  const n = { ...o };
  if (dir === 'E') Object.assign(n, { D: o.E, E: o.U, U: o.W, W: o.D });
  if (dir === 'W') Object.assign(n, { D: o.W, W: o.U, U: o.E, E: o.D });
  if (dir === 'S') Object.assign(n, { D: o.S, S: o.U, U: o.N, N: o.D });
  if (dir === 'N') Object.assign(n, { D: o.N, N: o.U, U: o.S, S: o.D });
  return n;
}
const STEP = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };

// 전개도 접기: 칸마다 닿는 상자 면. 정육면체가 안 되면 null
export function fold(cells) {
  const at = new Map(cells.map(([x, y], i) => [x + ',' + y, i]));
  const face = new Array(cells.length).fill(null);
  const start = { U: 'U', D: 'D', N: 'N', S: 'S', E: 'E', W: 'W' };
  face[0] = start.D;
  const q = [[0, start]];
  while (q.length) {
    const [i, o] = q.shift();
    for (const d of Object.keys(STEP)) {
      const j = at.get(cells[i][0] + STEP[d][0] + ',' + (cells[i][1] + STEP[d][1]));
      if (j === undefined || face[j] !== null) continue;
      const o2 = roll(o, d);
      face[j] = o2.D;
      q.push([j, o2]);
    }
  }
  return new Set(face).size === 6 && face.every(Boolean) ? face : null;
}

// 정육면체의 회전 24가지 (면 이름 바꾸기)
const ROTS = (() => {
  const id = Object.fromEntries(FACES.map((f) => [f, f]));
  const seen = new Map([[JSON.stringify(id), id]]);
  const q = [id];
  while (q.length) {
    const o = q.shift();
    for (const d of ['E', 'S']) {
      const n = roll(o, d);
      const k = JSON.stringify(n);
      if (!seen.has(k)) {
        seen.set(k, n);
        q.push(n);
      }
    }
    // 세로축 회전(위·아래는 그대로)
    const t = { ...o, N: o.E, E: o.S, S: o.W, W: o.N };
    const k = JSON.stringify(t);
    if (!seen.has(k)) {
      seen.set(k, t);
      q.push(t);
    }
  }
  return [...seen.values()];
})();
export const ROT_COUNT = ROTS.length;

// 6칸 무작위 모양 → 정육면체가 되는 것만
function randomNet(R) {
  for (let t = 0; t < 500; t++) {
    const cells = [[0, 0]];
    const has = new Set(['0,0']);
    while (cells.length < 6) {
      const [x, y] = pick(R, cells);
      const [dx, dy] = pick(R, Object.values(STEP));
      const k = x + dx + ',' + (y + dy);
      if (has.has(k)) continue;
      has.add(k);
      cells.push([x + dx, y + dy]);
    }
    const mx = Math.min(...cells.map((c) => c[0])),
      my = Math.min(...cells.map((c) => c[1]));
    const norm = cells.map(([x, y]) => [x - mx, y - my]);
    const w = Math.max(...norm.map((c) => c[0])) + 1,
      h = Math.max(...norm.map((c) => c[1])) + 1;
    if (w > 5 || h > 4) continue;
    if (fold(norm)) return norm;
  }
  throw new Error('전개도를 못 만듦');
}

// 전개도의 "마주 보는 그림" 짝 (정렬한 글자)
export function pairsOf(cells, icons) {
  const f = fold(cells);
  const byFace = {};
  f.forEach((face, i) => (byFace[face] = icons[i]));
  return ['U', 'N', 'E']
    .map((a) => [byFace[a], byFace[OPP[a]]].sort().join('-'))
    .sort()
    .join('|');
}

export function make(seed, level) {
  const R = rng(seed);
  const icons = shuffle(R, ICONS);
  const cube = Object.fromEntries(FACES.map((f, i) => [f, icons[i]])); // 상자 면 → 그림
  const truth = ['U', 'N', 'E'].map((a) => [cube[a], cube[OPP[a]]].sort().join('-')).sort().join('|');
  const n = level === 'mid' ? 4 : 3;
  const answer = Math.floor(R() * n);
  const cands = [];
  const usedPairs = new Set([truth]);
  while (cands.length < n) {
    const cells = randomNet(R);
    const f = fold(cells);
    const rot = pick(R, ROTS); // 상자를 아무렇게나 돌려 놓고 펼친다
    let ic = f.map((face) => cube[rot[face]]);
    if (cands.length !== answer) {
      // 가짜: 마주 보지 않는 두 칸의 그림을 바꿔 짝이 달라지게 (가짜끼리도 서로 다르게)
      let ok = false;
      for (let t = 0; t < 60 && !ok; t++) {
        const i = Math.floor(R() * 6),
          j = Math.floor(R() * 6);
        if (i === j || OPP[f[i]] === f[j]) continue;
        const c = ic.slice();
        [c[i], c[j]] = [c[j], c[i]];
        const p = pairsOf(cells, c);
        if (!usedPairs.has(p)) {
          usedPairs.add(p);
          ic = c;
          ok = true;
        }
      }
      if (!ok) continue;
    }
    // 굴려 찍은 자국은 바깥에서 본 전개도의 거울상이다 → 좌우를 뒤집어야 그림이 바깥으로 접힌다
    const w = Math.max(...cells.map((c) => c[0]));
    cands.push({ cells: cells.map(([x, y]) => [w - x, y]), icons: ic });
  }
  return { kind, seed, level, cube, cands, answer, truth };
}
export const check = (inst, a) => !!a && a.pick === inst.answer;
export const solve = (inst) => ({ pick: inst.answer });
