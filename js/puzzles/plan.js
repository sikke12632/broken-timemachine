// 한 판의 짜임: 3단계, 단계마다 장치 1개(2명) 또는 2개(3~4명, 두 쌍이 동시에).
// 3~4명은 단계마다 짝이 바뀐다: (조종사-기술자, 탐험가-기록관) ↔ (조종사-기록관, 탐험가-기술자)
// 2명은 A(조종사·탐험가) / B(기록관·기술자) 둘이서 모든 장치를 푼다.
import { rng, shuffle, mix } from './rand.js';
import * as wires from './wires.js';
import * as stars from './stars.js';
import * as net from './net.js';
import * as era from './era.js';

export const KINDS = { wires, stars, net, era };
export const ROLE_NAME = { pilot: '조종사', explorer: '탐험가', reader: '기록관', tech: '기술자' };
export const DEVICE_NAME = { wires: '전선 상자', stars: '별자리 자물쇠', net: '전개도 상자', era: '시대 다이얼' };
export const STAGES = 3;

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
    const rest = shuffle(R, ['wires', 'stars', 'net']);
    stages = [['era'], [rest[0]], [rest[1]]];
  } else {
    const P1 = ['wires', 'stars'],
      P2 = ['net', 'era'];
    stages = [P2, P1, R() < 0.5 ? P1 : P2];
  }
  return stages.map((kinds, s) =>
    kinds.map((k, j) => {
      const inst = KINDS[k].make(mix(seed, s + 1, j + 1), level, s);
      return { kind: k, inst, A: KINDS[k].roles.A, B: KINDS[k].roles.B, actor: KINDS[k].actor };
    })
  );
}
