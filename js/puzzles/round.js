// 어림 자물쇠 (5-2 수학: 수의 범위와 어림하기)
// 조종사(A)는 계기판의 네 자리 수와 불빛 색을 본다. 기록관(B)은 불빛 색마다 어림하는 방법이 적힌 규칙표를 가졌다.
// 견습: 불빛 3색, 색마다 "올림/버림/반올림하여 ○의 자리까지". 숙련: 불빛 4색 × 수의 범위 두 칸("4000 미만"/"4000 이상").
// 조종사가 숫자 바퀴 4개를 돌려 답을 맞춘다. 다른 색·다른 칸 규칙으로 하면 반드시 다른 답이 나오게 고른다.
import { rng, shuffle, pick } from './rand.js';

export const kind = 'round';
export const roles = { A: 'pilot', B: 'reader' };
export const actor = 'A';

export const LAMPS = ['red', 'blue', 'yellow', 'green'];
export const LAMP_NAME = { red: '빨간', blue: '파란', yellow: '노란', green: '초록' };
export const LAMP_HEX = { red: '#ff4a3a', blue: '#3f8fff', yellow: '#ffd23a', green: '#3fd26a' };
export const METHODS = { up: '올림', down: '버림', half: '반올림' };
export const PLACES = { 10: '십', 100: '백', 1000: '천' };

export function roundBy(n, method, place) {
  if (method === 'up') return Math.ceil(n / place) * place;
  if (method === 'down') return Math.floor(n / place) * place;
  return Math.floor(n / place + 0.5) * place;
}
export const ruleText = (r) => `${METHODS[r.method]}하여 ${PLACES[r.place]}의 자리까지`;

export function make(seed, level, tier) {
  const R = rng(seed);
  const mid = level === 'mid';
  const lamps = mid ? LAMPS.slice() : LAMPS.slice(0, 3);
  const places = tier >= 1 ? [10, 100, 1000] : [10, 100];
  const combos = [];
  for (const method of Object.keys(METHODS)) for (const place of places) combos.push({ method, place });
  const cols = mid ? 2 : 1;
  for (let t = 0; t < 500; t++) {
    // 규칙표: table[칸][색] = { method, place } (한 칸 안에서 색마다 다른 규칙)
    const table = [];
    for (let c = 0; c < cols; c++) {
      const cs = shuffle(R, combos).slice(0, lamps.length);
      table.push(Object.fromEntries(lamps.map((l, i) => [l, cs[i]])));
    }
    const split = mid ? pick(R, [3000, 4000, 5000, 6000, 7000]) : null;
    const n = 1000 + Math.floor(R() * 8900);
    const lamp = pick(R, lamps);
    const col = mid && n >= split ? 1 : 0;
    const answer = roundBy(n, table[col][lamp].method, table[col][lamp].place);
    if (answer === n || answer > 9999) continue;
    // 다른 색이나 다른 칸 규칙으로 하면 답이 달라야 한다(잘못 들으면 틀리게)
    let clash = false;
    for (let c = 0; c < cols; c++)
      for (const l of lamps) {
        if (c === col && l === lamp) continue;
        if (roundBy(n, table[c][l].method, table[c][l].place) === answer) clash = true;
      }
    if (clash) continue;
    return { kind, seed, level, tier, lamps, table, split, n, lamp, col, answer };
  }
  throw new Error('어림 자물쇠를 못 만듦');
}
export const check = (inst, a) => !!a && a.v === inst.answer;
export const solve = (inst) => ({ v: inst.answer });
