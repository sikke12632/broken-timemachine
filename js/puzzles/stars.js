// 별자리 자물쇠 (5-2 수학: 합동과 대칭)
// 탐험가(A)는 창밖 별자리의 반쪽만 본다. 기술자(B)는 나머지 반쪽 별판만 가졌다.
// 견습: 선대칭(세로 대칭축, 왼쪽 반 → 오른쪽 반). 숙련: 점대칭(가운데 점, 위쪽 반 → 아래쪽 반).
// 기술자가 별을 켜고 "확인"을 누른다. 답은 대칭으로 하나로 정해진다.
import { rng, shuffle } from './rand.js';

export const kind = 'stars';
export const roles = { A: 'explorer', B: 'tech' };
export const actor = 'B';
export const SIZE = 6;

const key = (r, c) => r + ',' + c;
export function mirror(mode, r, c) {
  return mode === 'point' ? [SIZE - 1 - r, SIZE - 1 - c] : [r, SIZE - 1 - c];
}
// A가 보는 반쪽인가
export const inA = (mode, r, c) => (mode === 'point' ? r < SIZE / 2 : c < SIZE / 2);

export function make(seed, level, stage) {
  const R = rng(seed);
  const mode = level === 'mid' ? 'point' : 'line';
  const k = 4 + Math.min(stage, 2); // 별 4~6개
  const cells = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (inA(mode, r, c)) cells.push([r, c]);
  let stars;
  for (let t = 0; t < 200; t++) {
    stars = shuffle(R, cells).slice(0, k);
    const rows = new Set(stars.map((s) => s[0])),
      cols = new Set(stars.map((s) => s[1]));
    // 한 줄에 몰리지 않게, 대칭축(가운데)에 붙은 별도 하나쯤은 섞이게
    if (rows.size >= 3 && cols.size >= 2) break;
  }
  // 별자리 선: 가까운 별끼리 차례로 잇는다(꾸밈)
  const order = [stars[0]];
  const left = stars.slice(1);
  while (left.length) {
    const p = order[order.length - 1];
    let bi = 0;
    left.forEach((q, i) => {
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(left[bi][0] - p[0], left[bi][1] - p[1])) bi = i;
    });
    order.push(left.splice(bi, 1)[0]);
  }
  const target = stars.map(([r, c]) => key(...mirror(mode, r, c))).sort();
  return { kind, seed, level, stage, mode, stars: order, target };
}
export const check = (inst, a) => !!a && Array.isArray(a.cells) && a.cells.slice().sort().join('|') === inst.target.join('|');
export const solve = (inst) => ({ cells: inst.target.slice() });
export { key };
