// how.js — 장치마다 "설명서 한 장": 한 줄 요약 + 그림(내 화면 ↔ 짝의 설명서, 주고받는 말) + 할 일 3줄
// 그림은 SVG로 그린다(글꼴은 게임 글꼴). 장치가 그 판에서 처음 나올 때 뜬다(옵션에서 끌 수 있음).
const C = { red: '#e0483a', blue: '#3f7fd0', yellow: '#f2c230', green: '#46a659', white: '#f4f1e8', teal: '#2f6f6c', ink: '#2a1d16', brass: '#d9a441', paper: '#fbf3df', slate: '#2f3b3a' };
const ROLE_COL = { pilot: '#d9573f', explorer: '#4f8f48', reader: '#3f7fa8', tech: '#c98f25' };
const ROLE_NAME = { pilot: '조종사', explorer: '탐험가', reader: '기록관', tech: '기술자' };

const t = (x, y, s, size, col, anchor) => `<text x="${x}" y="${y}" font-size="${size || 14}" fill="${col || C.ink}" text-anchor="${anchor || 'middle'}" font-family="TMTitle, serif">${s}</text>`;
const r = (x, y, w, h, fill, rx, stroke) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx ?? 6}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="2"` : ''}/>`;
const c = (x, y, rr, fill, stroke) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="2"` : ''}/>`;
const star = (x, y, s, fill) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      rr = i % 2 ? s * 0.45 : s;
    d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1);
  }
  return `<path d="${d}Z" fill="${fill}"/>`;
};
// 작은 그림 묶음 (가로 230 × 세로 120 칸 안, 왼쪽 위가 0,0)
const P = {
  wiresA: () => r(30, 10, 170, 100, C.brass, 10) + [C.red, C.blue, C.yellow, C.green].map((col, i) => `<path d="M50 ${30 + i * 20} Q115 ${42 + i * 20} 180 ${30 + i * 20}" stroke="${col}" stroke-width="6" fill="none"/>`).join('') + t(115, 125, '선이 몇 개, 무슨 색?', 13),
  wiresB: () => r(20, 6, 190, 108, C.paper, 8, '#c9a55a') + t(115, 28, '선 4개', 15, C.teal) + [0, 1, 2].map((i) => r(34, 38 + i * 24, 162, 18, '#fff', 4) + t(115, 52 + i * 24, ['빨간 선이 2개 이상 → 2번째', '맨 위가 파랑 → 맨 위', '모두 아니면 → 맨 아래'][i], 11)).join(''),
  starsA: () => c(115, 60, 56, '#1d2a55') + `<rect x="115" y="4" width="60" height="112" fill="#cfc8e0"/>` + `<line x1="115" y1="4" x2="115" y2="116" stroke="#ff8a6a" stroke-width="3" stroke-dasharray="6 4"/>` + star(85, 40, 9, '#ffe58a') + star(95, 80, 9, '#ffe58a') + star(72, 64, 8, '#ffe58a') + t(145, 64, '안개', 12, '#6a6090'),
  starsB: () => r(40, 4, 150, 112, '#1d2a55', 12) + `<line x1="115" y1="8" x2="115" y2="112" stroke="#ff8a6a" stroke-width="3" stroke-dasharray="6 4"/>` + [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => c(130 + col * 22, 26 + row * 34, 8, row + col === 2 || (row === 0 && col === 1) ? '#ffd34a' : '#3a4a7a'))).join(''),
  netA: () => `<path d="M80 40 L130 20 L180 40 L130 60Z" fill="#f6ecd2" stroke="#c9a55a" stroke-width="2"/><path d="M80 40 L130 60 L130 110 L80 90Z" fill="#efe2c2" stroke="#c9a55a" stroke-width="2"/><path d="M130 60 L180 40 L180 90 L130 110Z" fill="#e6d4ac" stroke="#c9a55a" stroke-width="2"/>` + c(130, 40, 9, '#f7c948') + c(105, 75, 8, '#e87a9a') + `<path d="M150 75 l10 -12 l10 12 z" fill="#46a659"/>` + t(130, 125, '끌어서 돌려 봐요', 12),
  netB: () => [0, 1, 2].map((k) => [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]].map(([x, y]) => r(18 + k * 72 + x * 14, 8 + y * 14, 13, 13, '#fbf6ea', 1, '#8a6a48')).join('') + t(18 + k * 72 + 22, 82, ['가', '나', '다'][k], 14, C.teal)).join('') + t(115, 108, '진짜는 하나!', 13, C.red),
  eraA: () => `<path d="M40 90 l20 -40 l20 40z" fill="#9a8c78"/><rect x="100" y="40" width="30" height="50" rx="4" fill="#7fb5a8"/><path d="M160 90 q20 -60 40 0z" fill="#c9a55a"/>` + [60, 115, 180].map((x, i) => c(x, 22, 11, '#fffaf0', C.brass) + t(x, 27, i + 1, 13)).join('') + t(115, 115, '모양을 설명해요', 12),
  eraB: () => r(20, 6, 190, 108, C.paper, 8, '#c9a55a') + r(30, 16, 60, 88, C.slate, 8) + t(60, 46, '고려', 13, '#f3e6c8') + c(60, 74, 16, '#f6ecd2') + c(60, 74, 9, '#f2a93b') + [0, 1].map((i) => r(100, 18 + i * 44, 100, 38, '#fff', 6) + t(150, 42 + i * 44, ['고려청자', '직지'][i], 13)).join(''),
  roundA: () => r(40, 4, 150, 112, C.brass, 10) + c(115, 16, 9, C.red) + r(55, 30, 120, 44, '#1d2624', 6) + t(115, 61, '2,488', 26, '#ffd38a') + [0, 1, 2, 3].map((i) => r(62 + i * 28, 82, 24, 26, '#fbf3df', 4) + t(74 + i * 28, 101, '?', 15)).join(''),
  roundB: () => r(14, 10, 202, 100, C.paper, 8, '#c9a55a') + [['#e0483a', '올림하여 백의 자리까지'], ['#3f7fd0', '버림하여 십의 자리까지'], ['#f2c230', '반올림하여 천의 자리까지']].map(([col, s], i) => c(32, 32 + i * 28, 8, col) + t(126, 37 + i * 28, s, 12, '#8e2f24')).join(''),
  flashA: () => `<circle cx="115" cy="60" r="44" fill="none" stroke="${C.brass}" stroke-width="5"/>` + [[115, 16, C.red, 1], [159, 60, C.blue, 0.35], [115, 104, C.yellow, 0.35], [71, 60, C.green, 0.35]].map(([x, y, col, o]) => `<path d="M${x} ${y - 14} l10 14 l-10 14 l-10 -14z" fill="${col}" opacity="${o}"/>` + (o === 1 ? c(x, y, 22, col + '55') : '')).join('') + t(115, 66, '반짝!', 12, C.red),
  flashB: () => r(14, 14, 202, 92, C.paper, 8, '#c9a55a') + t(40, 44, '깜빡', 12) + t(40, 84, '누름', 12) + [C.red, C.blue, C.yellow, C.green].map((col, i) => r(66 + i * 36, 28, 30, 22, col, 6) + r(66 + i * 36, 68, 30, 22, [C.blue, C.green, C.red, C.yellow][i], 6)).join(''),
  mazeA: () => r(60, 2, 110, 104, C.slate, 6) + [0, 1, 2, 3].flatMap((y) => [0, 1, 2, 3].map((x) => r(66 + x * 25, 8 + y * 24, 22, 21, (x + y) % 2 ? '#3f8f8a' : '#46998f', 3))).join('') + c(77, 18, 8, '#ffd23a') + c(152, 91, 9, '#9a86ee') + `<circle cx="127" cy="42" r="8" fill="none" stroke="#7dff9a" stroke-width="3"/>` + t(115, 124, '벽이 안 보여요!', 12),
  mazeB: () => r(55, 4, 120, 112, '#fbf6ea', 6, '#c9a55a') + `<path d="M62 11 h108 v104 h-108z M89 11 v52 M116 37 v52 h27 M62 89 h27 M143 37 h27" stroke="#5a3a28" stroke-width="4" fill="none"/>` + `<circle cx="129" cy="48" r="8" fill="none" stroke="#2fa85a" stroke-width="3"/>`,
  bagA: () => `<line x1="115" y1="4" x2="115" y2="60" stroke="#b07f2c" stroke-width="3"/><path d="M116 6 l30 9 l-30 9z" fill="${C.green}"/>` + [0, 1, 2, 3].map((i) => r(22 + i * 50, 56, 40, 56, '#dff3ffaa', 8, '#9ab') + [0, 1, 2, 3].map((k) => c(32 + i * 50 + (k % 2) * 20, 98 - Math.floor(k / 2) * 18, 8, [[C.red, C.red, C.blue, C.yellow], [C.yellow, C.yellow, C.yellow, C.blue], [C.blue, C.blue, C.red, C.red], [C.red, C.yellow, C.yellow, C.yellow]][i][k])).join('')).join(''),
  bagB: () => r(10, 10, 210, 100, C.paper, 8, '#c9a55a') + `<path d="M22 30 l18 7 l-18 7z" fill="${C.green}"/>` + t(128, 42, '노란 공을 꺼낼 가능성이', 12, '#8e2f24') + t(128, 62, '「확실하다」인 주머니', 13, C.teal) + [0, 1, 2, 3].map((k) => c(80 + k * 22, 90, 8, C.yellow)).join(''),
  shadowA: () => r(45, 4, 140, 112, '#e8dcc2', 8, '#a8957a') + [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]].map(([x, y]) => r(80 + x * 24, 20 + y * 24, 24, 24, '#3a3550', 0)).join('') + t(115, 125, '그림자 모양을 말해요', 12),
  shadowB: () => [[[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]], [[0, 0], [1, 0], [0, 1], [0, 2], [1, 2]]].map((cells, k) => r(10 + k * 74, 10, 66, 76, '#fbf6ea', 8, '#d8c49a') + cells.map(([x, y]) => r(20 + k * 74 + x * 15, 22 + y * 15, 14, 14, '#e88a5a', 2)).join('') + t(43 + k * 74, 82, ['가', '나', '다'][k], 13, C.teal)).join('') + t(115, 110, '돌리면 포개어지는 건?', 13, C.red),
  timelineA: () => r(14, 14, 202, 96, '#cf955f', 8) + [0, 1, 2, 3].map((i) => r(24 + i * 48, 24, 42, 66, C.paper, 4, '#c9a55a') + c(45 + i * 48, 38, 9, C.slate) + t(45 + i * 48, 43, i + 1, 12, '#f3d58a') + t(45 + i * 48, 64, ['조선', '고려', '삼국', '고조선'][i], 10) + t(45 + i * 48, 78, '세움', 10)).join(''),
  timelineB: () => `<line x1="40" y1="10" x2="40" y2="112" stroke="#b39a6a" stroke-width="4"/>` + [['고조선', '기원전 2333년', '#8a6a48'], ['삼국', '676년', '#3f7fa8'], ['고려', '918년', '#2f8a6c'], ['조선', '1392년', '#c4463a']].map(([e, y, col], i) => c(40, 20 + i * 28, 6, col) + r(54, 10 + i * 28, 160, 22, '#fff', 6) + t(84, 26 + i * 28, e, 12, col) + t(170, 26 + i * 28, y, 11)).join(''),
};

// 장치마다: 요약, A쪽·B쪽 그림과 말, 역할별 할 일
export const HOW = {
  wires: { sum: '설명서의 규칙대로, 뽑아야 할 전선 하나를 찾아요', a: ['wiresA', '선이 4개! 빨강이 둘이야'], b: ['wiresB', '그럼 2번째 선을 뽑아!'], A: ['선이 몇 개인지, 무슨 색인지 말해요', '기록관 말을 듣고 그 선을 눌러요', '"뽑기"를 누르면 끝!'], B: ['선이 몇 개인지 물어보고 그 칸을 열어요', '위에서부터 읽다가 처음 맞는 줄에서 멈춰요', '뽑을 선을 알려 줘요'] },
  stars: { sum: '별자리 반쪽을 듣고, 대칭인 나머지 반쪽 별을 켜요', a: ['starsA', '점선 바로 옆, 위에서 둘째 줄!'], b: ['starsB', '접으면 여기겠구나!'], A: ['보이는 별이 어디 있는지 말해요', '점선(또는 빨간 점)이 기준이에요', '기술자가 별을 켤 때까지 도와줘요'], B: ['탐험가가 말하는 별 자리를 들어요', '점선으로 접은(돌린) 자리에 별을 켜요', '"별자리 맞추기"를 눌러요'] },
  net: { sum: '상자를 펼친 전개도 가운데 진짜 하나를 골라요', a: ['netA', '해 맞은편에는 달이 있어!'], b: ['netB', '그럼 가는 아니고… 나다!'], A: ['상자를 끌어서 돌려 봐요', '"해 맞은편에 뭐가 있어?" 질문에 답해요', '마주 보는 그림을 알려 줘요'], B: ['마주 보는 면을 물어봐요', '짝이 안 맞는 전개도는 가짜예요', '진짜 전개도를 골라요'] },
  era: { sum: '창밖 유물이 어느 시대 것인지 찾아 기호를 눌러요', a: ['eraA', '1번은 큰 돌 위에 넓은 돌!'], b: ['eraB', '고인돌, 고조선이야. 기호는 해!'], A: ['유물의 생김새를 설명해요', '기록관이 알려 준 기호를 1번부터 눌러요', '"맞추기"를 눌러요'], B: ['설명을 듣고 안내서에서 유물을 찾아요', '그 시대의 기호를 알려 줘요', '1번 유물부터 차례로!'] },
  round: { sum: '계기판의 수를 규칙대로 어림해서 숫자 바퀴를 맞춰요', a: ['roundA', '2,488이고 빨간 불이야!'], b: ['roundB', '올림하여 백의 자리까지 → 2,500!'], A: ['계기판의 수와 불빛 색을 말해요', '기록관이 알려 준 수로 바퀴를 돌려요', '"맞추기"를 눌러요'], B: ['수와 불빛 색을 물어봐요', '그 색 줄의 방법으로 어림해요', '어림한 수를 알려 줘요'] },
  flash: { sum: '깜빡인 색을 바꿈표로 바꿔서 차례대로 눌러요', a: ['flashA', '빨강, 파랑, 노랑 차례로 깜빡여!'], b: ['flashB', '그럼 파랑, 초록, 빨강을 눌러!'], A: ['하얀 불 다음부터 깜빡이는 색을 말해요', '기록관이 알려 준 색을 차례로 눌러요', '"맞추기"를 눌러요'], B: ['깜빡인 색을 차례로 들어요', '바꿈표로 누를 색을 찾아요', '숙련은 시간 에너지 칸 수도 봐요'] },
  maze: { sum: '벽이 안 보이는 미로에서, 지도를 보고 길을 불러 줘요', a: ['mazeA', '공은 1줄 1칸, 고리는 2줄 3칸!'], b: ['mazeB', '오른쪽 1칸, 아래로 2칸!'], A: ['초록 고리·공·출구 자리를 말해요', '불러 주는 길을 화살표로 넣어요', '"출발"! 벽에 부딪히면 처음부터'], B: ['고리 자리가 같은 지도를 찾아요', '공에서 출구까지 길을 찾아요', '방향과 칸 수를 불러 줘요'] },
  bag: { sum: '"가능성" 말에 맞는 주머니를 찾아요', a: ['bagA', '초록 깃발! 2번은 노란 공이 3개'], b: ['bagB', '노란 공이 4개인 주머니를 찾아!'], A: ['깃발 색을 말해요', '주머니마다 무슨 색 공이 몇 개인지 말해요', '기술자가 알려 준 주머니를 눌러요'], B: ['깃발 색을 물어서 그 줄을 봐요', '"확실하다"는 4개, "반반이다"는 2개!', '맞는 주머니 번호를 알려 줘요'] },
  shadow: { sum: '그림자와 꼭 포개어지는(합동인) 조각을 골라요', a: ['shadowA', '세로로 3칸, 맨 아래에서 오른쪽으로 2칸!'], b: ['shadowB', '돌려 보면… 가 조각이다!'], A: ['그림자 모양을 칸 수로 말해요', '"맨 위에 몇 칸?" 같은 질문에 답해요', '기술자가 고를 때까지 도와줘요'], B: ['그림자 모양을 들어요', '조각을 머릿속으로 돌려(뒤집어) 봐요', '꼭 포개어지는 조각을 골라요'] },
  timeline: { sum: '사건 카드를 오래된 차례대로 세워요', a: ['timelineA', '1번 카드는 이성계가 조선을 세움!'], b: ['timelineB', '그건 1392년, 꽤 나중이야'], A: ['카드에 적힌 사건을 읽어 줘요', '기록관이 알려 준 차례로 번호를 눌러요', '가장 오래된 것부터!'], B: ['사건을 연표에서 찾아요', '위에 있을수록 오래된 일이에요', '카드 번호의 차례를 알려 줘요'] },
};
// 시간의 문: 네 역할이 단서를 하나씩
export const DOOR_HOW = {
  sum: '모두의 단서를 이어야 열리는 마지막 문!',
  chain: [
    ['explorer', '그림 4개의 차례'],
    ['reader', '불빛 색대로 차례 바꾸기'],
    ['tech', '그림을 번호로'],
    ['pilot', '번호 누르고 문 열기'],
  ],
  steps: {
    explorer: ['돌판 그림 4개를 1번부터 말해요', '숙련: 문 테두리가 금색인지 은색인지도!', '다 같이 말해야 열려요'],
    pilot: ['문 위 불빛 색을 말해요', '기술자가 불러 주는 번호 4개를 눌러요', '"문 열기"!'],
    reader: ['그림 차례와 불빛 색을 물어봐요', '규칙 카드대로 차례를 바꿔요', '바꾼 차례를 기술자에게!'],
    tech: ['기록관이 알려 준 그림 차례를 들어요', '번호표에서 번호를 찾아요', '조종사에게 번호를 불러 줘요'],
  },
};

const bubble = (x, y, w, s, col, tail) =>
  `<g><rect x="${x}" y="${y}" width="${w}" height="34" rx="17" fill="#fff" stroke="${col}" stroke-width="3"/>` +
  `<path d="M${tail} ${y} l8 -12 l8 12z" fill="#fff" stroke="${col}" stroke-width="3" stroke-linejoin="round"/><rect x="${tail + 1}" y="${y - 1}" width="14" height="5" fill="#fff"/>` +
  t(x + w / 2, y + 23, s, 14) +
  '</g>';
function panel(x, role, me, pic) {
  const col = ROLE_COL[role];
  return (
    `<g transform="translate(${x},0)">` +
    r(0, 0, 250, 166, me ? '#fffaf0' : '#f3e9d2', 16, col) +
    (me ? `<rect x="0" y="0" width="250" height="166" rx="16" fill="none" stroke="${col}" stroke-width="5"/>` : '') +
    r(10, -14, 88, 26, col, 13) +
    t(54, 4, (me ? '나: ' : '') + ROLE_NAME[role], 14, '#fff') +
    `<g transform="translate(10,28)">${P[pic]()}</g></g>`
  );
}
// 장치 그림 (SVG 글): 내 역할 쪽이 강조된다
export function howSVG(kind, d, myRole) {
  if (kind === 'door') {
    const steps = DOOR_HOW.chain;
    let s = '';
    steps.forEach(([role, what], i) => {
      const x = 12 + i * 160;
      const col = ROLE_COL[role];
      const me = role === myRole;
      s += r(x, 30, 140, 120, me ? '#fffaf0' : '#f3e9d2', 16, col) + (me ? `<rect x="${x}" y="30" width="140" height="120" rx="16" fill="none" stroke="${col}" stroke-width="5"/>` : '');
      s += r(x + 20, 16, 100, 26, col, 13) + t(x + 70, 34, (me ? '나: ' : '') + ROLE_NAME[role], 14, '#fff');
      s += c(x + 70, 78, 18, col + '33') + t(x + 70, 85, i + 1, 20, col) + t(x + 70, 126, what, 14);
      if (i < 3) s += `<path d="M${x + 142} 90 l14 0 m-6 -7 l7 7 l-7 7" stroke="${C.teal}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    });
    return `<svg viewBox="0 0 652 170" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  }
  const H = HOW[kind];
  const meA = myRole === d.A;
  const s =
    panel(20, d.A, meA, H.a[0]) +
    panel(382, d.B, !meA, H.b[0]) +
    `<path d="M290 70 h80 m-12 -10 l12 10 l-12 10 M362 100 h-80 m12 -10 l-12 10 l12 10" stroke="${C.teal}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    t(326, 132, '말로!', 16, C.teal) +
    bubble(10, 196, 290, H.a[1], ROLE_COL[d.A], 60) +
    bubble(352, 196, 290, H.b[1], ROLE_COL[d.B], 590);
  return `<svg viewBox="0 -18 652 252" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}
// 내 역할이 할 일 3줄
export function howSteps(kind, d, myRole) {
  if (kind === 'door') return DOOR_HOW.steps[myRole];
  return myRole === d.A ? HOW[kind].A : HOW[kind].B;
}
export const howSum = (kind) => (kind === 'door' ? DOOR_HOW.sum : HOW[kind].sum);
