// 한 판의 짜임: 6단계 + 마지막 시간의 문. 단계마다 장치 1개(2명) 또는 2개(3~4명, 두 쌍이 동시에).
// 장치 7개 가운데에서 골라 나오므로 판마다 다르다.
// 3~4명은 단계마다 짝이 바뀐다: (조종사-기술자, 탐험가-기록관) ↔ (조종사-기록관, 탐험가-기술자)
// 2명은 A(조종사·탐험가) / B(기록관·기술자) 둘이서 모든 장치를 푼다.
// 뒤 단계일수록 어려워진다(tier 0·1·2). 마지막 문은 모두가 함께 연다.
import { rng, shuffle, mix } from './rand.js';
import * as wires from './wires.js';
import * as stars from './stars.js';
import * as net from './net.js';
import * as era from './era.js';
import * as round from './round.js';
import * as flash from './flash.js';
import * as maze from './maze.js';
import * as bag from './bag.js';
import * as shadow from './shadow.js';
import * as timeline from './timeline.js';
import * as door from './door.js';

export const KINDS = { wires, stars, net, era, round, flash, maze, bag, shadow, timeline, door };
export const ROLE_NAME = { pilot: '조종사', explorer: '탐험가', reader: '기록관', tech: '기술자' };
export const DEVICE_NAME = {
  wires: '전선 상자',
  stars: '별자리 자물쇠',
  net: '전개도 상자',
  era: '시대 다이얼',
  round: '어림 자물쇠',
  flash: '깜빡이 단추',
  maze: '배관 미로',
  bag: '가능성 주머니',
  shadow: '그림자 맞추기',
  timeline: '연표 줄 세우기',
  door: '시간의 문',
};
// 짝마다 쓸 수 있는 장치 (A-B)
export const BY_PAIR = {
  'pilot-reader': ['wires', 'round', 'timeline'],
  'explorer-tech': ['stars', 'bag', 'shadow'],
  'pilot-tech': ['net', 'maze'],
  'explorer-reader': ['era', 'flash'],
};
export const HISTORY = ['era', 'timeline']; // 역사는 가끔: 한 판에 2명 1번, 3~4명 2번
const SET1 = ['pilot-reader', 'explorer-tech'],
  SET2 = ['pilot-tech', 'explorer-reader'];
export const STAGES = 7; // 6단계 + 마지막 문
export const NORMAL = STAGES - 1;
export const RECHARGE = [1, 3, 5]; // 이 단계를 마치면 시간 에너지 1칸이 다시 찬다
export const tierOf = (s) => (s < 2 ? 0 : s < 4 ? 1 : 2);

// 사람 수별 역할 묶음 (돌리기 swap 로 돌아가며 맡는다)
export function roleSets(n) {
  if (n <= 2) return [['pilot', 'explorer'], ['reader', 'tech']];
  if (n === 3) return [['pilot'], ['explorer'], ['reader', 'tech']];
  return [['pilot'], ['reader'], ['explorer'], ['tech']];
}
// 들어온 차례(slot)대로 줄 선 uid 목록 → { uid: [역할…] }
export function roster(uids, swap) {
  const sets = roleSets(uids.length);
  const out = {};
  uids.forEach((u, i) => (out[u] = sets[(i + (swap || 0)) % sets.length]));
  return out;
}

export function makePlan(seed, level, n) {
  const R = rng(mix(seed, 77));
  let stages;
  if (n <= 2) {
    // 장치 10개 가운데 6개: 역사 장치 하나 + 나머지 8개 중 5개, 순서는 섞어서
    const hist = shuffle(R, HISTORY)[0];
    const others = shuffle(R, Object.values(BY_PAIR).flat().filter((k) => !HISTORY.includes(k))).slice(0, 5);
    stages = shuffle(R, [hist, ...others]).map((k) => [k]);
  } else {
    // 두 짝 묶음을 번갈아, 짝마다 장치를 돌려 가며(같은 장치가 계속 나오지 않게).
    // 탐험가-기록관은 깜빡이부터 → 시대 다이얼은 한 번, 연표도 한 번
    const turn = Object.fromEntries(Object.entries(BY_PAIR).map(([p, ks]) => [p, shuffle(R, ks)]));
    turn['explorer-reader'] = ['flash', 'era'];
    const used = Object.fromEntries(Object.keys(BY_PAIR).map((p) => [p, 0]));
    const next = (p) => turn[p][used[p]++ % turn[p].length];
    const sets = R() < 0.5 ? [SET2, SET1] : [SET1, SET2];
    stages = Array.from({ length: NORMAL }, (_, s) => sets[s % 2].map(next));
  }
  const out = stages.map((kinds, s) =>
    kinds.map((k, j) => {
      const inst = KINDS[k].make(mix(seed, s + 1, j + 1), level, tierOf(s));
      return { kind: k, inst, A: KINDS[k].roles.A, B: KINDS[k].roles.B, actor: KINDS[k].actor };
    })
  );
  out.push([{ kind: 'door', inst: door.make(mix(seed, STAGES, 1), level), all: door.ALL, actor: door.actor }]);
  return out;
}
