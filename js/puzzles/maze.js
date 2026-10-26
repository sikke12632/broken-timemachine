// 배관 미로 (좌표·방향)
// 조종사(A)의 판에는 공(시작)·출구·초록 고리 2개만 보이고 벽은 안 보인다.
// 기술자(B)는 벽이 그려진 지도 2~3장을 가졌다. 초록 고리 자리가 같은 지도가 진짜다.
// 기술자가 길을 불러 주면 조종사가 화살표로 길을 넣고 "출발". 벽에 부딪히거나 출구에서 안 멈추면 틀림.
// 견습: 지도 2장, 숙련: 3장. 판 크기: 1~4단계 5×5, 5·6단계 6×6.
import { rng, shuffle, pick } from './rand.js';

export const kind = 'maze';
export const roles = { A: 'pilot', B: 'tech' };
export const actor = 'A';

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const DIR_NAME = { up: '위', down: '아래', left: '왼쪽', right: '오른쪽' };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
export const MAX_MOVES = 24;

// 칸마다 열린 쪽: open[y][x] = Set('up', ...). 막다른 길이 있는 "완전 미로"(길이 하나뿐)
function carve(R, N) {
  const open = Array.from({ length: N }, () => Array.from({ length: N }, () => new Set()));
  const seen = new Set(['0,0']);
  const stack = [[0, 0]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nexts = shuffle(R, Object.keys(DIRS)).filter((d) => {
      const nx = x + DIRS[d][0],
        ny = y + DIRS[d][1];
      return nx >= 0 && ny >= 0 && nx < N && ny < N && !seen.has(nx + ',' + ny);
    });
    if (!nexts.length) {
      stack.pop();
      continue;
    }
    const d = nexts[0];
    const nx = x + DIRS[d][0],
      ny = y + DIRS[d][1];
    open[y][x].add(d);
    open[ny][nx].add(OPP[d]);
    seen.add(nx + ',' + ny);
    stack.push([nx, ny]);
  }
  // 고리 길 몇 개(길이 하나뿐이면 너무 길고 지루하다)
  for (let k = 0; k < Math.floor(N / 2); k++) {
    const x = Math.floor(R() * (N - 1)),
      y = Math.floor(R() * N);
    open[y][x].add('right');
    open[y][x + 1].add('left');
  }
  return open.map((row) => row.map((s) => [...s].sort()));
}

// 시작에서 각 칸까지 가장 짧은 길
export function bfs(map, N, sx, sy) {
  const dist = new Map([[sx + ',' + sy, []]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const d of map[y][x]) {
      const nx = x + DIRS[d][0],
        ny = y + DIRS[d][1];
      const k = nx + ',' + ny;
      if (dist.has(k)) continue;
      dist.set(k, [...dist.get(x + ',' + y), d]);
      q.push([nx, ny]);
    }
  }
  return dist;
}

export function make(seed, level, tier) {
  const R = rng(seed);
  const N = (tier || 0) >= 2 ? 6 : 5;
  const k = level === 'mid' ? 3 : 2;
  const all = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) all.push([x, y]);
  // 지도마다 초록 고리 2개 — 지도끼리 고리 자리가 하나도 겹치지 않게
  const used = new Set();
  const maps = [];
  while (maps.length < k) {
    const marks = shuffle(R, all.filter(([x, y]) => !used.has(x + ',' + y))).slice(0, 2);
    marks.forEach(([x, y]) => used.add(x + ',' + y));
    maps.push({ open: carve(R, N), marks });
  }
  const answer = Math.floor(R() * k);
  const map = maps[answer].open;
  // 시작과 출구: 고리가 아닌 칸, 길이 충분히 멀게
  for (let t = 0; t < 400; t++) {
    const [sx, sy] = pick(R, all),
      [ex, ey] = pick(R, all);
    if (used.has(sx + ',' + sy) || used.has(ex + ',' + ey)) continue;
    const path = bfs(map, N, sx, sy).get(ex + ',' + ey);
    if (!path || path.length < N + 1 || path.length > MAX_MOVES - 4) continue;
    const inst = { kind, seed, level, tier, N, maps, answer, start: [sx, sy], exit: [ex, ey], best: path };
    // 다른 지도를 보고 찾은 길로는 못 가야 한다(고리로 지도를 고르는 게 꼭 필요하게)
    const lucky = maps.some((m, i) => {
      if (i === answer) return false;
      const p = bfs(m.open, N, sx, sy).get(ex + ',' + ey);
      return p && walk(inst, p).ok;
    });
    if (!lucky) return inst;
  }
  throw new Error('미로를 못 만듦');
}

// 길을 따라가 본다: { ok, cells(지나간 칸들), hit(부딪힌 곳) }
export function walk(inst, path) {
  const map = inst.maps[inst.answer].open;
  let [x, y] = inst.start;
  const cells = [[x, y]];
  for (const d of path) {
    if (!map[y][x].includes(d)) return { ok: false, cells, hit: d };
    x += DIRS[d][0];
    y += DIRS[d][1];
    cells.push([x, y]);
  }
  return { ok: x === inst.exit[0] && y === inst.exit[1], cells, hit: null };
}
export const check = (inst, a) => !!a && Array.isArray(a.path) && a.path.length <= MAX_MOVES && walk(inst, a.path).ok;
export const solve = (inst) => ({ path: inst.best.slice() });
