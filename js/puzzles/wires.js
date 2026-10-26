// 전선 상자: 씨앗 하나로 설명서(규칙표)와 전선 배치를 만든다. 브라우저와 node(검사기) 모두에서 돈다.
// 규칙은 위에서부터 차례로 읽고 처음 맞는 줄을 따른다. 마지막 줄("모두 아니면")이 있어서 답은 늘 하나다.
// 그래도 "맨 위에 있는 노란 선" 같은 답이 그 색이 없는 판에 걸리지 않는지, 줄마다 실제로 걸리는 판이
// 있는지 makeSection 이 모든 배치를 다 따져 보고 고른다(tools/check-wires.mjs 가 다시 확인).

import { rng, pick } from './rand.js';
export { rng };

export const COLORS = ['red', 'blue', 'yellow', 'green', 'white'];
export const CNAME = { red: '빨간', blue: '파란', yellow: '노란', green: '초록', white: '하얀' };
export const HEX = { red: '#d9473a', blue: '#3f7fd0', yellow: '#f2c230', green: '#46a659', white: '#f4f1e8' };
const ORD = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째', '여섯 번째'];
export const COUNTS = [3, 4, 5, 6];
export const LEVELS = {
  easy: { name: '견습', rules: 3, rounds: [[3, 4], [4, 5], [5, 6]] },
  mid: { name: '숙련', rules: 4, rounds: [[3, 4], [4, 5], [5, 6]] },
};

const count = (L, c) => L.reduce((n, x) => n + (x === c), 0);

/* ---------- 조건 (has: 조건이 맞으면 반드시 있는 색) ---------- */
function makeCond(R, N) {
  const c = pick(R, COLORS);
  let c2 = pick(R, COLORS);
  while (c2 === c) c2 = pick(R, COLORS);
  const n = CNAME[c];
  const kinds = [
    () => ({ id: 'none:' + c, text: `${n} 선이 하나도 없으면`, test: (L) => count(L, c) === 0 }),
    () => ({ id: 'ge2:' + c, text: `${n} 선이 2개 이상이면`, test: (L) => count(L, c) >= 2, has: c }),
    () => ({ id: 'eq1:' + c, text: `${n} 선이 딱 1개이면`, test: (L) => count(L, c) === 1, has: c }),
    () => ({ id: 'first:' + c, text: `맨 위 선이 ${n} 선이면`, test: (L) => L[0] === c, has: c }),
    () => ({ id: 'last:' + c, text: `맨 아래 선이 ${n} 선이면`, test: (L) => L[L.length - 1] === c, has: c }),
    () => ({ id: 'more:' + c + c2, text: `${n} 선이 ${CNAME[c2]} 선보다 많으면`, test: (L) => count(L, c) > count(L, c2), has: c }),
    () => ({ id: 'ends', text: '맨 위 선과 맨 아래 선의 색이 같으면', test: (L) => L[0] === L[L.length - 1] }),
    () => ({ id: 'odd', text: '기계 번호 끝자리가 홀수이면', test: (L, odd) => odd }),
    () => ({ id: 'even', text: '기계 번호 끝자리가 짝수이면', test: (L, odd) => !odd }),
  ];
  // 기계 번호 조건은 가끔만
  const w = [3, 3, 3, 2, 2, 2, 1, 1, 1];
  let r = R() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < kinds.length; i++) if ((r -= w[i]) < 0) return kinds[i]();
  return kinds[0]();
}

/* ---------- 할 일(뽑을 선) ---------- */
function makeAct(R, N, has) {
  const opts = [{ id: 'top', text: '맨 위 선을 뽑아요', at: () => 0 }, { id: 'bottom', text: '맨 아래 선을 뽑아요', at: (L) => L.length - 1 }];
  for (let i = 1; i < N - 1; i++) opts.push({ id: 'pos' + i, text: `${ORD[i]} 선을 뽑아요`, at: () => i });
  if (has) {
    const n = CNAME[has];
    opts.push({ id: 'firstOf:' + has, text: `맨 위에 있는 ${n} 선을 뽑아요`, at: (L) => L.indexOf(has) });
    opts.push({ id: 'lastOf:' + has, text: `맨 아래에 있는 ${n} 선을 뽑아요`, at: (L) => L.lastIndexOf(has) });
  }
  return pick(R, opts);
}

// N개 선의 모든 배치(색 순서) × 기계 번호 홀짝
export function allLayouts(N) {
  const out = [];
  const L = new Array(N);
  const rec = (k) => {
    if (k === N) {
      out.push(L.slice());
      return;
    }
    for (const c of COLORS) {
      L[k] = c;
      rec(k + 1);
    }
  };
  rec(0);
  return out;
}

// 규칙표에서 처음 맞는 줄의 번호
export function fire(sec, L, odd) {
  for (let i = 0; i < sec.rules.length; i++) if (sec.rules[i].cond.test(L, odd)) return i;
  return sec.rules.length; // 모두 아니면
}
export function answer(sec, L, odd) {
  const i = fire(sec, L, odd);
  const act = i < sec.rules.length ? sec.rules[i].act : sec.dflt;
  return act.at(L);
}

// 규칙표 한 칸이 쓸 만한지: 답이 늘 있는 선이고, 줄마다 걸리는 판이 충분하고, "모두 아니면"이 너무 흔하지 않다
export function judge(sec, layouts) {
  const hits = new Array(sec.rules.length + 1).fill(0);
  let bad = 0;
  for (const L of layouts)
    for (const odd of [false, true]) {
      const f = fire(sec, L, odd);
      hits[f]++;
      const a = answer(sec, L, odd);
      if (!(a >= 0 && a < L.length)) bad++;
    }
  const total = layouts.length * 2;
  return { bad, share: hits.map((h) => h / total) };
}

function makeSection(R, N, nRules, layouts) {
  for (let tries = 0; tries < 400; tries++) {
    const rules = [];
    const ids = new Set();
    while (rules.length < nRules) {
      const cond = makeCond(R, N);
      if (ids.has(cond.id) || (cond.id === 'odd' && ids.has('even')) || (cond.id === 'even' && ids.has('odd'))) continue;
      ids.add(cond.id);
      rules.push({ cond, act: makeAct(R, N, cond.has) });
    }
    const dflt = makeAct(R, N, null);
    const sec = { N, rules, dflt };
    // 줄마다 다른 선을 뽑게(같은 할 일이 겹치면 다시)
    if (new Set(rules.map((r) => r.act.id).concat(dflt.id)).size < nRules + 1) continue;
    const j = judge(sec, layouts);
    if (j.bad) continue;
    if (j.share.slice(0, -1).some((s) => s < 0.07)) continue;
    const d = j.share[j.share.length - 1];
    if (d < 0.05 || d > 0.35) continue;
    sec.share = j.share;
    return sec;
  }
  throw new Error('규칙표를 못 만듦 N=' + N);
}

const LAYOUTS = {};
const layoutsOf = (N) => (LAYOUTS[N] = LAYOUTS[N] || allLayouts(N));

// 한 판의 설명서: 선 3·4·5·6개 칸
export function makeManual(seed, level) {
  const lv = LEVELS[level] || LEVELS.easy;
  const R = rng(seed ^ 0x5eed);
  const sections = {};
  for (const N of COUNTS) sections[N] = makeSection(R, N, lv.rules, layoutsOf(N));
  return { seed, level, sections };
}

// 한 판의 장치 하나(round 번째): 전선 색과 기계 번호. 정답 줄이 고르게 나오게 고른다.
export function makeRound(manual, round) {
  const lv = LEVELS[manual.level] || LEVELS.easy;
  const R = rng((manual.seed * 31 + round * 977 + 7) >>> 0);
  const N = pick(R, lv.rounds[Math.min(round, lv.rounds.length - 1)]);
  const sec = manual.sections[N];
  const k = sec.rules.length;
  // 바라는 줄: 규칙 줄은 같은 몫, "모두 아니면"은 반 몫
  let r = R() * (k + 0.5);
  const want = r >= k ? k : Math.floor(r);
  let L, odd;
  for (let t = 0; t < 2000; t++) {
    L = Array.from({ length: N }, () => pick(R, COLORS));
    odd = R() < 0.5;
    if (fire(sec, L, odd) === want) break;
  }
  const digits = [1 + Math.floor(R() * 9), Math.floor(R() * 10), Math.floor(R() * 10)];
  let last = Math.floor(R() * 5) * 2 + (odd ? 1 : 0);
  digits.push(last);
  return { round, N, colors: L, serial: digits.join(''), odd, answer: answer(sec, L, odd), line: fire(sec, L, odd) };
}

/* ---------- 장치 약속 (모든 장치가 같은 모양: make / check / solve) ---------- */
export const kind = 'wires';
export const roles = { A: 'pilot', B: 'reader' }; // A: 보고 누르는 쪽, B: 설명서 쪽
export const actor = 'A'; // 답을 넣는 쪽
export function make(seed, level, stage) {
  const manual = makeManual(seed, level);
  return { kind, seed, level, stage, manual, round: makeRound(manual, stage) };
}
export const check = (inst, a) => a && a.i === inst.round.answer;
export const solve = (inst) => ({ i: inst.round.answer });
