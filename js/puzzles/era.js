// 시대 다이얼 (5-2 사회: 고조선~조선의 문화유산) — 역사는 판마다 한 번 쓰는 열쇠
// 탐험가(A)는 창밖 시간 안개 속에 떠 있는 유물 3~4개를 본다(이름표 없음). 기록관(B)은 시대 안내서를 가졌다.
// 안내서에는 시대마다 유물 그림·이름·짧은 설명과 그 시대의 "기호"가 있다. 기호는 판마다 바뀐다.
// 탐험가가 모양을 설명 → 기록관이 찾아 기호를 알려 줌 → 탐험가가 1번 유물부터 차례로 기호 단추를 누른다.
// 화면 글은 교과서·한국민족문화대백과사전 내용과 맞춘 것만 쓴다(mockup/CREDITS 아님, game/CREDITS.md 참고).
import { rng, shuffle } from './rand.js';

export const kind = 'era';
export const roles = { A: 'explorer', B: 'reader' };
export const actor = 'A';

export const ERAS = [
  { id: 'gojoseon', name: '고조선' },
  { id: 'samguk', name: '삼국' },
  { id: 'goryeo', name: '고려' },
  { id: 'joseon', name: '조선' },
];
export const SYMBOLS = ['sun', 'moon', 'star', 'cloud'];
export const SYMBOL_NAME = { sun: '해', moon: '달', star: '별', cloud: '구름' };

export const RELICS = [
  { id: 'dolmen', era: 'gojoseon', name: '고인돌', desc: '큰 돌을 세우고 그 위에 넓적한 돌을 얹은 무덤이에요. 힘 있는 사람이 묻혔어요.' },
  { id: 'dagger', era: 'gojoseon', name: '비파형 동검', desc: '악기 비파처럼 아랫부분이 볼록한 청동 칼이에요.' },
  { id: 'misong', era: 'gojoseon', name: '미송리식 토기', desc: '목이 있고 양쪽에 손잡이가 달린 그릇이에요. 몸에 줄무늬가 있어요.' },
  { id: 'cheomseong', era: 'samguk', name: '첨성대', desc: '신라 선덕 여왕 때 돌을 쌓아 만든 탑이에요. 하늘을 살피던 곳으로 알려져 있어요.' },
  { id: 'crown', era: 'samguk', name: '신라 금관', desc: '나뭇가지 모양 장식이 솟은 신라의 금관이에요. 초록 옥이 달려 있어요.' },
  { id: 'censer', era: 'samguk', name: '백제 금동 대향로', desc: '뚜껑에 산이 겹겹이 있고 꼭대기에 봉황이 앉은 백제의 향로예요.' },
  { id: 'celadon', era: 'goryeo', name: '고려청자', desc: '푸른빛이 도는 고려의 도자기예요. 학과 구름 무늬를 새겨 넣었어요.' },
  { id: 'tripitaka', era: 'goryeo', name: '팔만대장경판', desc: '부처의 힘으로 몽골의 침입을 물리치려고 글자를 새긴 나무판이에요.' },
  { id: 'jikji', era: 'goryeo', name: '직지', desc: '금속 활자로 찍은 책 가운데 지금 남아 있는 가장 오래된 책이에요.' },
  { id: 'sundial', era: 'joseon', name: '앙부일구', desc: '세종 때 만든 해시계예요. 솥처럼 오목한 그릇에 비친 그림자로 시각을 알았어요.' },
  { id: 'raingauge', era: 'joseon', name: '측우기', desc: '세종 때 만든, 비가 내린 양을 재는 통이에요. 돌 받침 위에 놓았어요.' },
  { id: 'turtleship', era: 'joseon', name: '거북선', desc: '임진왜란 때 이순신이 이끈 수군의 배예요. 등을 덮개로 덮고 뾰족한 쇠를 꽂았어요.' },
];
export const relic = (id) => RELICS.find((r) => r.id === id);

export function make(seed, level) {
  const R = rng(seed);
  const sym = shuffle(R, SYMBOLS);
  const symbolOf = Object.fromEntries(ERAS.map((e, i) => [e.id, sym[i]]));
  const n = level === 'mid' ? 4 : 3;
  // 시대가 최대한 겹치지 않게 고른다
  let relics;
  for (let t = 0; t < 50; t++) {
    relics = shuffle(R, RELICS).slice(0, n);
    if (new Set(relics.map((r) => r.era)).size >= Math.min(n, 3)) break;
  }
  const ids = relics.map((r) => r.id);
  return { kind, seed, level, symbolOf, relics: ids, answer: ids.map((id) => symbolOf[relic(id).era]) };
}
export const check = (inst, a) => !!a && Array.isArray(a.seq) && a.seq.join(',') === inst.answer.join(',');
export const solve = (inst) => ({ seq: inst.answer.slice() });
