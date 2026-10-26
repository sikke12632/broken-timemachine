// 시간의 문 (마지막 단계, 네 역할이 단서를 하나씩 가졌다)
// 탐험가: 창밖 문에 새겨진 그림 4개의 차례를 본다.        (숙련: 문 테두리가 금색인지 은색인지도 본다)
// 조종사: 조종판 문의 불빛 색을 보고, 마지막에 번호를 누른다.
// 기록관: 불빛 색마다 그림 차례를 어떻게 바꾸는지 적힌 규칙 카드를 가졌다.
// 기술자: 그림마다 번호가 적힌 부품 번호표를 가졌다.     (숙련: 금색 줄·은색 줄 두 줄)
// 그림 → (기록관) 차례 바꾸기 → (기술자) 번호 → (조종사) 누르기. 넷 중 하나라도 빠지면 못 연다.
// 2~3명이면 한 사람이 역할 두 개의 단서를 같이 본다.
import { rng, shuffle } from './rand.js';

export const kind = 'door';
export const roles = { A: 'pilot', B: 'reader' }; // 판 짜임 검사용(실제로는 네 역할 모두)
export const ALL = ['pilot', 'explorer', 'reader', 'tech'];
export const actor = 'pilot';

export const PICS = ['sun', 'moon', 'star', 'flower', 'fish', 'tree', 'cloud'];
export const PIC_NAME = { sun: '해', moon: '달', star: '별', flower: '꽃', fish: '물고기', tree: '나무', cloud: '구름' };
export const LAMPS = ['red', 'blue', 'yellow', 'green'];
export const LAMP_NAME = { red: '빨간', blue: '파란', yellow: '노란', green: '초록' };
export const LAMP_HEX = { red: '#ff4a3a', blue: '#3f8fff', yellow: '#ffd23a', green: '#3fd26a' };
export const METAL_NAME = { gold: '금색', silver: '은색' };

// 차례 바꾸기 (그림 4개)
export const MOVES = {
  keep: { text: '차례를 그대로 둬요', how: [0, 1, 2, 3] },
  reverse: { text: '차례를 거꾸로 해요 (넷째 그림부터)', how: [3, 2, 1, 0] },
  rotate: { text: '첫째 그림을 맨 뒤로 보내요', how: [1, 2, 3, 0] },
  swap: { text: '첫째와 둘째, 셋째와 넷째를 서로 바꿔요', how: [1, 0, 3, 2] },
};
export const apply = (move, pics) => MOVES[move].how.map((i) => pics[i]);

export function make(seed, level) {
  const R = rng(seed);
  const mid = level === 'mid';
  const pics = shuffle(R, PICS).slice(0, 4);
  const lamps = mid ? LAMPS.slice() : LAMPS.slice(0, 3);
  const moves = shuffle(R, Object.keys(MOVES)).slice(0, lamps.length);
  const rule = Object.fromEntries(lamps.map((l, i) => [l, moves[i]])); // 불빛 → 차례 바꾸기
  const lamp = lamps[Math.floor(R() * lamps.length)];
  // 부품 번호표: 그림마다 1~9 가운데 서로 다른 번호 (숙련은 금·은 두 줄)
  const row = () => Object.fromEntries(shuffle(R, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, PICS.length).map((n, i) => [PICS[i], n]));
  const table = { gold: row() };
  if (mid) {
    // 은색 줄은 그림마다 금색 줄과 다른 번호 → 테두리 색을 잘못 들으면 반드시 틀린다
    do table.silver = row();
    while (PICS.some((p) => table.silver[p] === table.gold[p]));
  }
  const metal = mid ? (R() < 0.5 ? 'gold' : 'silver') : 'gold';
  const order = apply(rule[lamp], pics);
  const code = order.map((p) => table[metal][p]);
  return { kind, seed, level, pics, lamps, rule, lamp, table, metal, code };
}
export const check = (inst, a) => !!a && Array.isArray(a.code) && a.code.join(',') === inst.code.join(',');
export const solve = (inst) => ({ code: inst.code.slice() });
