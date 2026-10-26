// 가능성 주머니 (5-2 수학: 평균과 가능성)
// 탐험가(A)는 창밖 유리 주머니 4개(공 4개씩, 번호)와 깃발 색을 본다.
// 기술자(B)는 깃발 색마다 "노란 공을 꺼낼 가능성이 '반반이다'인 주머니" 같은 주문서를 가졌다.
// 공 4개 가운데 그 색이 0개 불가능하다, 1개 ~아닐 것 같다, 2개 반반이다, 3개 ~일 것 같다, 4개 확실하다.
// 견습: 주머니 1개 찾기. 숙련: 차례대로 2개 찾기. 탐험가가 주머니 번호를 누른다.
import { rng, shuffle, pick } from './rand.js';

export const kind = 'bag';
export const roles = { A: 'explorer', B: 'tech' };
export const actor = 'A';

export const BALLS = ['red', 'blue', 'yellow'];
export const BALL_NAME = { red: '빨간', blue: '파란', yellow: '노란' };
export const BALL_HEX = { red: '#e0483a', blue: '#3f7fd0', yellow: '#f2c230' };
export const FLAGS = ['red', 'blue', 'green'];
export const FLAG_NAME = { red: '빨간', blue: '파란', green: '초록' };
export const FLAG_HEX = { red: '#d9473a', blue: '#3f7fd0', green: '#46a659' };
export const WORDS = ['불가능하다', '~아닐 것 같다', '반반이다', '~일 것 같다', '확실하다'];
export const PER = 4; // 주머니마다 공 수

const count = (bag, c) => bag.filter((x) => x === c).length;
// 이 주문에 맞는 주머니 번호들
export const matches = (inst, o) => inst.bags.map((b, i) => (count(b, o.color) === o.n ? i : -1)).filter((i) => i >= 0);

export function make(seed, level) {
  const R = rng(seed);
  const want = level === 'mid' ? 2 : 1;
  for (let t = 0; t < 2000; t++) {
    // 주머니마다 한 색은 개수가 모두 다르게(0~4 가운데 넷) 넣어서 여러 가능성 말이 나오게 한다
    const [c1, c2, c3] = shuffle(R, BALLS);
    const n1 = shuffle(R, [0, 1, 2, 3, 4]).slice(0, 4);
    const bags = n1.map((a) => {
      const b = Math.floor(R() * (PER - a + 1));
      return [...Array(a).fill(c1), ...Array(b).fill(c2), ...Array(PER - a - b).fill(c3)].sort();
    });
    // 맞는 주머니가 꼭 하나뿐인 주문들
    const cands = [];
    for (const color of BALLS)
      for (let n = 0; n <= PER; n++) {
        const m = matches({ bags }, { color, n });
        if (m.length === 1) cands.push({ color, n, at: m[0] });
      }
    // 깃발마다 want 개: 같은 주문은 한 번만, 한 깃발 안에서는 다른 주머니, 가능성 말은 되도록 골고루
    const used = new Set(),
      wordUse = [0, 0, 0, 0, 0];
    const orders = {};
    let ok = true;
    for (const f of FLAGS) {
      const list = [];
      for (let k = 0; k < want; k++) {
        const opts = shuffle(R, cands).filter((o) => !used.has(o.color + o.n) && !list.some((x) => x.at === o.at));
        if (!opts.length) {
          ok = false;
          break;
        }
        opts.sort((a, b) => wordUse[a.n] - wordUse[b.n]);
        const o = opts[0];
        used.add(o.color + o.n);
        wordUse[o.n]++;
        list.push(o);
      }
      orders[f] = list;
    }
    if (!ok) continue;
    // 깃발마다 답이 모두 달라야 한다(깃발 색을 꼭 들어야)
    const ans = FLAGS.map((f) => orders[f].map((o) => o.at).join());
    if (new Set(ans).size !== FLAGS.length) continue;
    const flag = pick(R, FLAGS);
    return { kind, seed, level, bags, orders, flag, answer: orders[flag].map((o) => o.at) };
  }
  throw new Error('주머니를 못 만듦');
}
export const orderText = (o) => `${BALL_NAME[o.color]} 공을 꺼낼 가능성이 「${WORDS[o.n]}」인 주머니`;
export const check = (inst, a) => !!a && Array.isArray(a.seq) && a.seq.join(',') === inst.answer.join(',');
export const solve = (inst) => ({ seq: inst.answer.slice() });
