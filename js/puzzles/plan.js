// 한 판의 짜임: 6단계 + 마지막 시간의 문. 단계마다 장치 1개(2명) 또는 2개(3~4명, 두 쌍이 동시에).
// 3~4명은 단계마다 짝이 바뀐다: (조종사-기술자, 탐험가-기록관) ↔ (조종사-기록관, 탐험가-기술자)
// 2명은 A(조종사·탐험가) / B(기록관·기술자) 둘이서 모든 장치를 푼다.
// 뒤 단계일수록 어려워진다(tier 0·1·2: 선·별·유물·전개도가 늘어남). 마지막 문은 모두가 함께 연다.
import { rng, shuffle, mix } from './rand.js';
import * as wires from './wires.js';
import * as stars from './stars.js';
import * as net from './net.js';
import * as era from './era.js';
import * as door from './door.js';

export const KINDS = { wires, stars, net, era, door };
export const ROLE_NAME = { pilot: '조종사', explorer: '탐험가', reader: '기록관', tech: '기술자' };
export const DEVICE_NAME = { wires: '전선 상자', stars: '별자리 자물쇠', net: '전개도 상자', era: '시대 다이얼', door: '시간의 문' };
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
    // 앞 4단계에 장치 4가지가 다 한 번씩, 뒤 2단계는 바로 앞과 다른 장치로 한 번 더
    const rest = shuffle(R, ['wires', 'stars', 'net']);
    const first = ['era', ...rest];
    const more = shuffle(R, ['wires', 'stars', 'net', 'era']).filter((k) => k !== first[3]);
    stages = [...first, more[0], more[1]].map((k) => [k]);
  } else {
    const P1 = ['wires', 'stars'],
      P2 = ['net', 'era'];
    stages = [P2, P1, P2, P1, P2, P1];
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
