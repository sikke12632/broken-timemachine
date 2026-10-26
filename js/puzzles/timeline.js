// 연표 줄 세우기 (5-2 사회: 고조선~조선) — 역사는 가끔 쓰는 열쇠
// 조종사(A)는 사건 카드 4~5장(이름만, 번호)을 본다. 기록관(B)은 사건과 해가 적힌 연표를 가졌다.
// 조종사가 오래된 사건부터 차례로 카드 번호를 누른다. 견습 4장, 숙련 5장.
// 사건과 해는 교과서와 한국민족문화대백과사전 기준(근거는 game/CREDITS.md).
import { rng, shuffle } from './rand.js';

export const kind = 'timeline';
export const roles = { A: 'pilot', B: 'reader' };
export const actor = 'A';

// y: 줄 세우기에 쓰는 해(기원전은 음수, 기간은 시작 해)
export const EVENTS = [
  { id: 'gojoseon', y: -2333, era: '고조선', name: '단군왕검이 고조선을 세움', when: '기원전 2333년 (전해지는 해)' },
  { id: 'gwanggaeto', y: 391, era: '삼국', name: '광개토 대왕이 고구려의 땅을 넓힘', when: '391~413년 (왕이었던 때)' },
  { id: 'unify', y: 676, era: '삼국', name: '신라가 삼국을 통일함', when: '676년' },
  { id: 'goryeo', y: 918, era: '고려', name: '왕건이 고려를 세움', when: '918년' },
  { id: 'tripitaka', y: 1236, era: '고려', name: '팔만대장경을 새김', when: '1236~1251년' },
  { id: 'joseon', y: 1392, era: '조선', name: '이성계가 조선을 세움', when: '1392년' },
  { id: 'hangeul', y: 1443, era: '조선', name: '세종 대왕이 훈민정음을 만듦', when: '1443년 (1446년에 널리 알림)' },
  { id: 'imjin', y: 1592, era: '조선', name: '임진왜란이 일어남', when: '1592년' },
  { id: 'hwaseong', y: 1794, era: '조선', name: '정조가 수원 화성을 쌓음', when: '1794~1796년' },
];
export const event = (id) => EVENTS.find((e) => e.id === id);

export function make(seed, level) {
  const R = rng(seed);
  const n = level === 'mid' ? 5 : 4;
  const cards = shuffle(R, EVENTS).slice(0, n).map((e) => e.id); // 화면의 카드 차례(1번~)
  const answer = cards
    .map((id, i) => [event(id).y, i])
    .sort((a, b) => a[0] - b[0])
    .map((p) => p[1]);
  return { kind, seed, level, cards, answer };
}
export const check = (inst, a) => !!a && Array.isArray(a.seq) && a.seq.join(',') === inst.answer.join(',');
export const solve = (inst) => ({ seq: inst.answer.slice() });
