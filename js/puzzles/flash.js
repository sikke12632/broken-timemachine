// 깜빡이 단추 (규칙 바꾸기 + 기억)
// 탐험가(A)는 창밖 수정 4개(빨강·파랑·노랑·초록)가 차례로 깜빡이는 것을 본다(되풀이).
// 기록관(B)은 "빨강이 깜빡이면 → ○을 눌러요" 바꿈표를 가졌다. 탐험가가 바꾼 색을 차례로 누른다.
// 견습: 바꿈표 한 줄. 숙련: 시간 에너지가 몇 칸 남았는지(5칸 / 4칸 / 3칸 이하)에 따라 줄이 달라진다.
// 뒤 단계일수록 깜빡임이 길어진다(3~6번).
import { rng, shuffle, pick } from './rand.js';

export const kind = 'flash';
export const roles = { A: 'explorer', B: 'reader' };
export const actor = 'A';

export const COLORS = ['red', 'blue', 'yellow', 'green'];
export const CNAME = { red: '빨강', blue: '파랑', yellow: '노랑', green: '초록' };
export const HEX = { red: '#ff4a3a', blue: '#3f8fff', yellow: '#ffd23a', green: '#3fd26a' };
export const ROWS = [
  { id: 'e5', text: '시간 에너지 5칸', test: (e) => e >= 5 },
  { id: 'e4', text: '시간 에너지 4칸', test: (e) => e === 4 },
  { id: 'e3', text: '시간 에너지 3칸 이하', test: (e) => e <= 3 },
];

// 자기 자신으로 가지 않는 바꿈(빨강 → 빨강 없음)
function derange(R) {
  for (;;) {
    const s = shuffle(R, COLORS);
    if (s.every((c, i) => c !== COLORS[i])) return Object.fromEntries(COLORS.map((c, i) => [c, s[i]]));
  }
}

export function make(seed, level, tier) {
  const R = rng(seed);
  const mid = level === 'mid';
  const len = 3 + (tier || 0) + (mid ? 1 : 0);
  const seq = [pick(R, COLORS)];
  while (seq.length < len) {
    const c = pick(R, COLORS);
    if (c !== seq[seq.length - 1]) seq.push(c); // 같은 색이 잇따라 깜빡이면 헷갈리니 피한다
  }
  // 숙련: 줄마다 바꿈이 달라야(색마다 적어도 줄끼리 다른 답)
  let maps;
  for (;;) {
    maps = (mid ? ROWS : ROWS.slice(0, 1)).map(() => derange(R));
    if (maps.length === 1 || COLORS.every((c) => new Set(maps.map((m) => m[c])).size === maps.length)) break;
  }
  return { kind, seed, level, tier, seq, maps, mid };
}
// 지금 시간 에너지로 쓸 줄
export const rowOf = (inst, energy) => (inst.mid ? ROWS.findIndex((r) => r.test(energy)) : 0);
export const answerOf = (inst, energy) => inst.seq.map((c) => inst.maps[rowOf(inst, energy)][c]);
// a.e: 누를 때 화면에 보이던 시간 에너지
export const check = (inst, a) => !!a && Array.isArray(a.seq) && a.seq.join(',') === answerOf(inst, a.e).join(',');
export const solve = (inst, energy) => ({ seq: answerOf(inst, energy ?? 5), e: energy ?? 5 });
