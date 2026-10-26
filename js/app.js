// app.js — 화면 흐름: 처음 → 방 만들기/들어가기 → 모이는 곳 → 게임 3단계 → 끝
// 서버에는 누를 때만 쓴다(방 만들기, 들어가기, 출발, 답 넣기, 한 판 더). 퍼즐은 씨앗으로 각자 만든다.
// 2명: 장치 하나씩. 3~4명: 두 쌍이 장치 두 개를 동시에(단계마다 짝이 바뀜). puzzles/plan.js 참고.
import { B } from './net.js';
import { makePlan, roster, ROLE_NAME, DEVICE_NAME, STAGES, KINDS } from './puzzles/plan.js';
import { HEX, COUNTS } from './puzzles/wires.js';
import { SIZE as STAR_SIZE, key as starKey } from './puzzles/stars.js';
import { ICON_NAME } from './puzzles/net.js';
import { ERAS, SYMBOLS, SYMBOL_NAME, relic } from './puzzles/era.js';

const $ = (id) => document.getElementById(id);
const S = JK.Scene;
const ENERGY = 5;
const MAX = 4;

const st = { uid: null, code: null, room: null, unsub: null, plan: null, planKey: '', shownStage: -1, focus: 0, seenActs: -1, busy: false, sending: false, sel: -1, ui: {} };
window.TM = st; // 시험 도구(tools/playN.mjs)가 본다

/* ---------- 작은 도구 ---------- */
function screen(name) {
  document.body.dataset.screen = name;
}
function netErr(e) {
  console.error(e);
  const m = $('netErr');
  m.textContent = '서버와 연결이 잠깐 끊겼어요. 잠시 뒤 다시 해 봐요.';
  m.classList.add('on');
  setTimeout(() => m.classList.remove('on'), 4000);
}
let toastT = 0;
const HOLD = new URLSearchParams(location.search).has('hold'); // 시험 캡처용: 알림을 오래 띄운다
function toast(html, kind, ms) {
  if (HOLD) ms = 60000;
  const t = $('toast');
  t.innerHTML = html;
  t.className = 'toast on ' + (kind || '');
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.className = 'toast'), ms || 1600);
}
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const roleNames = (roles) => roles.map((r) => ROLE_NAME[r]).join('·');

/* ---------- 방 ---------- */
const lineup = (room) => Object.entries(room.players || {}).sort((a, b) => a[1].slot - b[1].slot).map(([u]) => u);

async function makeRoom() {
  for (let tries = 0; tries < 8; tries++) {
    const code = String(1000 + Math.floor(Math.random() * 9000));
    const made = await B.tx(code, (cur) => {
      // 비어 있거나 오래된 방(3시간)만 새로 쓴다
      if (cur && Date.now() - (cur.at || 0) < 3 * 3600e3) return null;
      return { code, status: 'lobby', at: Date.now(), host: st.uid, players: { [st.uid]: { slot: 0, at: Date.now() } }, swap: 0, level: 'easy' };
    });
    if (made) return enter(code);
  }
  netErr(new Error('방 번호를 못 만듦'));
}
async function joinRoom(code) {
  let why = '';
  await B.tx(code, (cur) => {
    if (!cur) return (why = '그런 방이 없어요. 번호를 다시 봐요.'), null;
    if (cur.players && cur.players[st.uid]) return null; // 다시 들어옴
    const list = lineup(cur);
    if (list.length >= MAX) return (why = '방이 꽉 찼어요. (4명까지)'), null;
    if (cur.status !== 'lobby') return (why = '벌써 출발한 방이에요.'), null;
    const used = new Set(Object.values(cur.players).map((p) => p.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    return { ...cur, at: Date.now(), players: { ...cur.players, [st.uid]: { slot, at: Date.now() } } };
  });
  if (why) return ($('joinErr').textContent = why);
  enter(code);
}
function enter(code) {
  st.code = code;
  localStorage.setItem('tm-room:' + st.uid, code);
  if (st.unsub) st.unsub();
  st.planKey = '';
  st.unsub = B.onRoom(code, onRoom, netErr);
}
function leave() {
  const code = st.code;
  if (st.unsub) st.unsub();
  st.unsub = null;
  st.code = null;
  st.room = null;
  localStorage.removeItem('tm-room:' + st.uid);
  if (code)
    B.tx(code, (cur) => {
      if (!cur || !cur.players || !cur.players[st.uid]) return null;
      const players = { ...cur.players };
      delete players[st.uid];
      return { ...cur, at: Date.now(), players };
    }).catch(netErr);
  goHome();
}
function goHome() {
  clearDevices();
  screen('home');
  S.setView('home');
}

/* ---------- 방이 바뀔 때마다 ---------- */
function onRoom(room) {
  const prev = st.room;
  st.room = room;
  if (!room || !room.players || !room.players[st.uid]) {
    localStorage.removeItem('tm-room:' + st.uid);
    if (st.unsub) st.unsub();
    st.unsub = null;
    return goHome();
  }
  if (room.status === 'lobby') return showLobby(room);
  const pk = room.seed + ':' + room.level + ':' + room.n;
  if (st.planKey !== pk) {
    st.planKey = pk;
    st.plan = makePlan(room.seed, room.level, room.n);
    st.shownStage = -1;
    st.seenActs = -1;
    st.ui = {};
  }
  st.roles = (room.roster && room.roster[st.uid]) || [];
  if (room.status === 'play' || (prev && prev.status === 'play')) showPlay(room);
  if (room.status === 'win' || room.status === 'lose') setTimeout(() => st.room && st.room.status === room.status && showEnd(st.room), 2000);
}

function showLobby(room) {
  clearDevices();
  screen('lobby');
  S.setView('lobby');
  $('lobbyCode').textContent = room.code;
  const list = lineup(room);
  const ros = roster(list, room.swap);
  const map = {};
  list.forEach((u, i) => {
    const r = ros[u];
    map[r[0]] = (u === st.uid ? '나' : `친구${i + 1}`) + (r.length > 1 ? ` · ${ROLE_NAME[r[1]]}도` : '');
  });
  S.setTeam(map);
  $('lobbyTip').textContent = list.length < 2 ? '친구에게 방 번호를 알려 줘요 (2~4명)' : `${list.length}명이 모였어요! 역할을 정하고 출발해요`;
  $('btnStart').disabled = list.length < 2;
  document.querySelectorAll('#levelPick button').forEach((b) => b.classList.toggle('on', b.dataset.l === room.level));
}

/* ---------- 게임 ---------- */
// 이번 단계에서 내가 맡은 장치들: [{ k, d, side }]
function myDevices(room) {
  const stage = st.plan[Math.min(room.stage, STAGES - 1)];
  const out = [];
  stage.forEach((d, k) => {
    if (st.roles.includes(d.A)) out.push({ k, d, side: 'A' });
    else if (st.roles.includes(d.B)) out.push({ k, d, side: 'B' });
  });
  return out;
}
const solvedKey = (s, k) => s + '-' + k;
const isSolved = (room, s, k) => !!(room.solved && room.solved[solvedKey(s, k)]);
// 짝: 이 장치의 다른 쪽을 맡은 사람의 역할 이름
function mateOf(d, side) {
  return ROLE_NAME[side === 'A' ? d.B : d.A];
}

function showPlay(room) {
  if (document.body.dataset.screen !== 'play') screen('play');
  // 시간 에너지
  $('energy').querySelectorAll('b').forEach((p, i) => p.classList.toggle('off', i >= room.energy));
  // 새로 넣은 답들
  const acts = room.acts || [];
  if (st.seenActs < 0) st.seenActs = acts.length; // 다시 들어온 경우: 지난 것은 다시 보여 주지 않는다
  for (const a of acts.slice(st.seenActs)) playAct(a, room);
  st.seenActs = acts.length;
  if (!st.busy) syncStage(room);
  else refreshStatus(room);
}

function syncStage(room) {
  const s = Math.min(room.stage, STAGES - 1);
  const mine = myDevices(room);
  if (st.shownStage !== s) {
    st.shownStage = s;
    st.focus = 0;
    st.ui = {};
    // 아직 안 고친 장치부터
    const open = mine.findIndex((m) => !isSolved(room, s, m.k));
    if (open > 0) st.focus = open;
    renderFocus(room);
  }
  refreshStatus(room);
}

function refreshStatus(room) {
  const s = Math.min(room.stage, STAGES - 1);
  const mine = myDevices(room);
  const cur = mine[st.focus] || mine[0];
  $('devNo').textContent = `단계${s + 1}/${STAGES}`;
  $('devName').textContent = cur ? DEVICE_NAME[cur.d.kind] : '';
  // 내가 두 장치를 맡으면(3명일 때 기록관·기술자) 위에 고르는 칸
  const tabs = $('slotTabs');
  tabs.innerHTML = '';
  if (mine.length > 1)
    mine.forEach((m, i) => {
      const b = el('button', i === st.focus ? 'on' : '', `${ROLE_NAME[m.side === 'A' ? m.d.A : m.d.B]}: ${DEVICE_NAME[m.d.kind]}${isSolved(room, s, m.k) ? ' ✓' : ''}`);
      b.onclick = () => {
        st.focus = i;
        renderFocus(st.room);
        refreshStatus(st.room);
      };
      tabs.appendChild(b);
    });
  // 다른 쌍의 장치 상태
  const all = st.plan[s];
  const others = all.map((d, k) => ({ d, k })).filter(({ k }) => !mine.some((m) => m.k === k));
  $('others').innerHTML = others.map(({ d, k }) => `<span class="${isSolved(room, s, k) ? 'done' : ''}">${DEVICE_NAME[d.kind]} ${isSolved(room, s, k) ? '고침' : '고치는 중'}</span>`).join('');
  const waiting = cur && isSolved(room, s, cur.k) && !st.busy;
  $('waiting').classList.toggle('on', !!waiting);
  if (waiting) $('waitingText').textContent = mine.some((m) => !isSolved(room, s, m.k)) ? '이 장치는 고쳤어요! 위에서 다른 장치를 골라요' : '우리 장치는 고쳤어요! 다른 짝이 고칠 때까지 응원해 줘요';
}

function clearDevices() {
  for (const k of Object.keys(JK.Devices || {})) JK.Devices[k].clear();
  S.pickables = [];
}

// 지금 고른 장치의 화면 그리기
function renderFocus(room) {
  const s = Math.min(room.stage, STAGES - 1);
  const mine = myDevices(room);
  const m = mine[st.focus] || mine[0];
  clearDevices();
  $('confirm').classList.remove('on');
  st.sel = -1;
  if (!m) return;
  const { d, side } = m;
  document.body.dataset.side = side;
  document.body.dataset.kind = d.kind;
  $('meChip').querySelector('em').textContent = ROLE_NAME[side === 'A' ? d.A : d.B];
  $('meChip').className = 'me ' + (side === 'A' ? d.A : d.B);
  $('mate').textContent = `짝: ${mateOf(d, side)}`;
  if (side === 'A') {
    const dev = JK.Devices[d.kind];
    dev.build(d.inst, HEX);
    S.setView(dev.view);
    renderA(m);
  } else {
    S.setView(d.kind === 'wires' || d.kind === 'era' ? 'reader' : 'tech');
    renderB(m);
  }
  void s;
}

/* ---------- A 쪽(보는 사람) ---------- */
const TASK = {
  wires: ['선이 <em>몇 개</em>인지, <em>무슨 색</em>인지 기록관에게 말해 줘요', '기록관이 알려 주는 선을 눌러 뽑아요'],
  stars: ['별자리 반쪽이 어디에 있는지 <em>기술자</em>에게 설명해요', '점선은 대칭축이에요. 기술자가 나머지 반쪽 별을 켜요'],
  starsPoint: ['별자리 반쪽이 어디에 있는지 <em>기술자</em>에게 설명해요', '빨간 점이 대칭의 중심이에요. 기술자가 나머지 반쪽 별을 켜요'],
  net: ['상자를 <em>끌어서 돌려 보고</em>, 그림을 기술자에게 설명해요', '기술자가 이 상자를 펼친 전개도를 찾아요'],
  era: ['창밖 유물의 <em>생김새</em>를 기록관에게 설명해요', '기록관이 알려 주는 기호를 1번 유물부터 차례로 눌러요'],
};
function renderA(m) {
  const t = TASK[m.d.kind === 'stars' && m.d.inst.mode === 'point' ? 'starsPoint' : m.d.kind];
  $('taskK').innerHTML = t[0];
  $('taskP').innerHTML = t[1];
  const bar = $('eraBar');
  bar.innerHTML = '';
  if (m.d.kind === 'era') {
    const n = m.d.inst.relics.length;
    st.ui.seq = st.ui.seq || [];
    const slots = el('div', 'era-slots');
    for (let i = 0; i < n; i++) {
      const sym = st.ui.seq[i];
      slots.appendChild(el('span', 'era-slot', `<small>${i + 1}</small>${sym ? `<img src="${JK.iconURL(sym, 64)}" alt="${SYMBOL_NAME[sym]}">` : ''}`));
    }
    bar.appendChild(slots);
    const keys = el('div', 'era-keys');
    for (const sym of SYMBOLS) {
      const b = el('button', '', `<img src="${JK.iconURL(sym, 64)}" alt=""><span>${SYMBOL_NAME[sym]}</span>`);
      b.onclick = () => {
        if (st.ui.seq.length < n) st.ui.seq.push(sym);
        renderA(m);
      };
      keys.appendChild(b);
    }
    bar.appendChild(keys);
    const ctl = el('div', 'era-ctl');
    const clr = el('button', 'ghost', '지우기');
    clr.onclick = () => {
      st.ui.seq = [];
      renderA(m);
    };
    const go = el('button', 'go', '맞추기');
    go.disabled = st.ui.seq.length < n;
    go.id = 'eraGo';
    go.onclick = () => act(m, { seq: st.ui.seq.slice() });
    ctl.append(clr, go);
    bar.appendChild(ctl);
  }
}

/* ---------- B 쪽(설명서·판을 가진 사람) ---------- */
function renderB(m) {
  const book = $('book');
  book.innerHTML = '';
  book.className = 'book ' + m.d.kind;
  ({ wires: bookWires, stars: bookStars, net: bookNet, era: bookEra })[m.d.kind](book, m);
}
function head(book, title, text) {
  book.appendChild(el('div', 'm-head', `<h2>${title}</h2><p>${text}</p>`));
}

function bookWires(book, m) {
  head(book, '전선 상자 설명서', '① 조종사에게 <b>선이 몇 개</b>인지 물어봐요. ② 그 칸을 <b>위에서부터 차례로</b> 읽고, <b>처음 맞는 줄</b>에서 멈춰요.');
  const tabs = el('div', 'm-tabs');
  const ol = el('ol', 'm-rules');
  const draw = () => {
    tabs.innerHTML = '';
    for (const N of COUNTS) {
      const b = el('button', st.ui.tab === N ? 'on' : '', `선 ${N}개`);
      b.onclick = () => {
        st.ui.tab = N;
        draw();
      };
      tabs.appendChild(b);
    }
    ol.innerHTML = '';
    if (!st.ui.tab) return ol.appendChild(el('li', 'm-empty', '조종사에게 선이 몇 개인지 물어보고, 위에서 그 칸을 눌러요'));
    const sec = m.d.inst.manual.sections[st.ui.tab];
    const rows = sec.rules.map((r) => [r.cond.text, r.act.text]).concat([['위의 어느 것도 아니면', sec.dflt.text]]);
    rows.forEach(([c, a], k) => {
      const li = el('li', k === rows.length - 1 ? 'last' : '', `<span class="n">${k + 1}</span><span class="c">${c}</span><span class="ar">→</span><span class="a">${a}</span>`);
      // 손가락으로 짚듯이 줄을 눌러 표시해 둘 수 있다
      li.onclick = () => {
        ol.querySelectorAll('li').forEach((x) => x.classList.remove('mark'));
        li.classList.add('mark');
      };
      ol.appendChild(li);
    });
  };
  draw();
  book.append(tabs, ol);
}

function bookStars(book, m) {
  const I = m.d.inst;
  const point = I.mode === 'point';
  head(
    book,
    '별자리 판',
    point
      ? '탐험가가 본 별자리 <b>위쪽 반</b>을 듣고, <b>가운데 점</b>을 중심으로 돌려서 맞는 자리에 별을 켜요. (점대칭)'
      : '탐험가가 본 별자리 <b>왼쪽 반</b>을 듣고, <b>점선</b>을 접는 선으로 접어서 겹치는 자리에 별을 켜요. (선대칭)'
  );
  st.ui.on = st.ui.on || new Set();
  const wrap = el('div', 'star-wrap ' + I.mode);
  const grid = el('div', 'star-grid');
  const rows = point ? [3, 4, 5] : [0, 1, 2, 3, 4, 5];
  const cols = point ? [0, 1, 2, 3, 4, 5] : [3, 4, 5];
  grid.style.gridTemplateColumns = `repeat(${cols.length}, 1fr)`;
  for (const r of rows)
    for (const c of cols) {
      const k = starKey(r, c);
      const b = el('button', 'lamp' + (st.ui.on.has(k) ? ' on' : ''));
      b.dataset.k = k;
      b.setAttribute('aria-label', `${r + 1}째 줄 ${c + 1}째 칸`);
      b.onclick = () => {
        st.ui.on.has(k) ? st.ui.on.delete(k) : st.ui.on.add(k);
        b.classList.toggle('on');
      };
      grid.appendChild(b);
    }
  wrap.appendChild(el('div', 'axis', point ? '<i></i><span>가운데 점</span>' : '<span>대칭축</span>'));
  wrap.appendChild(grid);
  book.appendChild(wrap);
  const ctl = el('div', 'row');
  const clr = el('button', 'ghost', '다 끄기');
  clr.onclick = () => {
    st.ui.on.clear();
    grid.querySelectorAll('.lamp').forEach((x) => x.classList.remove('on'));
  };
  const go = el('button', 'go', '별자리 맞추기');
  go.id = 'starGo';
  go.onclick = () => act(m, { cells: [...st.ui.on] });
  ctl.append(clr, go);
  book.appendChild(ctl);
  void STAR_SIZE;
}

function netCanvas(c) {
  const cs = 44;
  const w = Math.max(...c.cells.map((p) => p[0])) + 1,
    h = Math.max(...c.cells.map((p) => p[1])) + 1;
  const cv = document.createElement('canvas');
  cv.width = 5 * cs + 8;
  cv.height = 4 * cs + 8;
  const g = cv.getContext('2d');
  const ox = 4 + ((5 - w) * cs) / 2,
    oy = 4 + ((4 - h) * cs) / 2;
  c.cells.forEach(([x, y], i) => {
    g.fillStyle = '#fbf6ea';
    g.fillRect(ox + x * cs, oy + y * cs, cs, cs);
    g.strokeStyle = '#8a6a48';
    g.lineWidth = 2;
    g.strokeRect(ox + x * cs + 1, oy + y * cs + 1, cs - 2, cs - 2);
    JK.drawIcon(g, c.icons[i], ox + x * cs + cs / 2, oy + y * cs + cs / 2, cs * 0.92);
  });
  return cv;
}
function bookNet(book, m) {
  const I = m.d.inst;
  head(book, '전개도 설계도', '조종사의 상자를 펼친 전개도는 <b>하나뿐</b>이에요. "해 맞은편에 무슨 그림이 있어?"처럼 <b>마주 보는 면</b>을 물어보며 찾아요.');
  const names = ['가', '나', '다', '라'];
  st.ui.wrong = st.ui.wrong || new Set();
  const row = el('div', 'nets');
  I.cands.forEach((c, i) => {
    const card = el('button', 'netcard' + (st.ui.wrong.has(i) ? ' wrong' : '') + (st.sel === i ? ' sel' : ''));
    card.appendChild(el('b', '', names[i]));
    card.appendChild(netCanvas(c));
    card.onclick = () => {
      if (st.ui.wrong.has(i)) return;
      st.sel = i;
      row.querySelectorAll('.netcard').forEach((x, j) => x.classList.toggle('sel', j === i));
      go.disabled = false;
      go.textContent = `${names[i]} 전개도로 할래요`;
    };
    row.appendChild(card);
  });
  book.appendChild(row);
  book.appendChild(el('p', 'legend', '그림: ' + Object.values(ICON_NAME).join(', ')));
  const ctl = el('div', 'row');
  const go = el('button', 'go', '전개도를 골라요');
  go.id = 'netGo';
  go.disabled = st.sel < 0;
  go.onclick = () => st.sel >= 0 && act(m, { pick: st.sel });
  ctl.appendChild(go);
  book.appendChild(ctl);
}

function bookEra(book, m) {
  const I = m.d.inst;
  head(book, '시대 안내서', '탐험가가 말하는 유물을 찾아서, 그 시대의 <b>기호</b>를 알려 줘요. 1번 유물부터 차례로!');
  const tabs = el('div', 'm-tabs era-tabs');
  const page = el('div', 'era-page');
  const draw = () => {
    tabs.innerHTML = '';
    ERAS.forEach((e, i) => {
      const b = el('button', (st.ui.era || 0) === i ? 'on' : '', e.name);
      b.onclick = () => {
        st.ui.era = i;
        draw();
      };
      tabs.appendChild(b);
    });
    const e = ERAS[st.ui.era || 0];
    const sym = I.symbolOf[e.id];
    page.innerHTML = '';
    page.appendChild(el('div', 'era-sym', `<span>${e.name} 시대의 기호</span><img src="${JK.iconURL(sym, 96)}" alt=""><b>${SYMBOL_NAME[sym]}</b>`));
    const cards = el('div', 'relics');
    for (const r of RELICS_BY[e.id]) cards.appendChild(el('div', 'relic', `<img src="${JK.Relics.thumb(r.id)}" alt=""><b>${r.name}</b><p>${r.desc}</p>`));
    page.appendChild(cards);
  };
  draw();
  book.append(tabs, page);
}
const RELICS_BY = Object.fromEntries(ERAS.map((e) => [e.id, []]));
for (const id of ['dolmen', 'dagger', 'misong', 'cheomseong', 'crown', 'censer', 'celadon', 'tripitaka', 'jikji', 'sundial', 'raingauge', 'turtleship']) RELICS_BY[relic(id).era].push(relic(id));

/* ---------- 답 넣기 ---------- */
async function act(m, payload) {
  if (st.busy || st.sending) return;
  const s = Math.min(st.room.stage, STAGES - 1);
  const ok = KINDS[m.d.kind].check(m.d.inst, payload);
  st.sending = true;
  try {
    await B.tx(st.code, (cur) => {
      if (!cur || cur.status !== 'play' || cur.stage !== s || isSolved(cur, s, m.k)) return null;
      const next = { ...cur, at: Date.now(), acts: [...(cur.acts || []), { s, k: m.k, ok, at: Date.now(), by: st.uid, a: payload }] };
      if (ok) {
        next.solved = { ...(cur.solved || {}), [solvedKey(s, m.k)]: true };
        const all = st.plan[s].every((_, k) => next.solved[solvedKey(s, k)]);
        if (all) {
          if (s >= STAGES - 1) Object.assign(next, { status: 'win', endedAt: Date.now() });
          else next.stage = s + 1;
        }
      } else {
        next.energy = cur.energy - 1;
        if (next.energy <= 0) Object.assign(next, { status: 'lose', endedAt: Date.now() });
      }
      return next;
    });
  } catch (e) {
    netErr(e);
  }
  st.sending = false;
}

// 누군가 답을 넣었다: 연출과 알림 (모두의 화면)
function playAct(a, room) {
  const d = st.plan[a.s][a.k];
  const mine = myDevices(room).find((x) => x.k === a.k && a.s === st.shownStage);
  const name = DEVICE_NAME[d.kind];
  st.busy = true;
  if (mine && mine.side === 'A' && d.kind === 'wires' && myDevices(room)[st.focus]?.k === a.k) JK.Devices.wires.pull(a.a.i, a.ok);
  if (a.ok) {
    const stageDone = st.plan[a.s].every((_, k) => isSolved(room, a.s, k));
    const last = stageDone && a.s >= STAGES - 1;
    setTimeout(() => toast(last ? '다 고쳤어요!' : stageDone ? `${name} 고쳤어요!<small>다음 단계로 가요</small>` : `${name} 고쳤어요!`, 'good', 1500), 400);
  } else {
    setTimeout(() => {
      toast(`찌릿! ${name}에서 틀렸어요<small>시간 에너지가 하나 줄었어요</small>`, 'bad', 1700);
      $('energy').classList.remove('hit');
      void $('energy').offsetWidth;
      $('energy').classList.add('hit');
      if (mine) {
        // 틀린 것 표시: 전개도는 ✗, 시대 다이얼은 지움
        if (d.kind === 'net') st.ui.wrong = (st.ui.wrong || new Set()).add(a.a.pick);
        if (d.kind === 'era') st.ui.seq = [];
        if (d.kind === 'net' || d.kind === 'era') {
          st.sel = -1;
          renderFocus(st.room);
        }
      }
    }, 400);
  }
  setTimeout(
    () => {
      st.busy = false;
      if (st.room && st.room.status === 'play') syncStage(st.room);
    },
    a.ok ? 1900 : 1100
  );
}

// 전선 상자: 선을 누르면 한 번 더 묻는다
S.onPick = (i) => {
  if (document.body.dataset.screen !== 'play' || document.body.dataset.kind !== 'wires' || document.body.dataset.side !== 'A' || st.busy || st.sending) return;
  st.sel = i;
  JK.Devices.wires.select(i);
  $('confirmText').textContent = `${i + 1}번 선을 뽑을까요?`;
  $('confirm').classList.add('on');
};
$('btnPull').onclick = () => {
  const m = myDevices(st.room)[st.focus];
  if (st.sel < 0 || !m) return;
  const i = st.sel;
  $('confirm').classList.remove('on');
  st.sel = -1;
  act(m, { i });
};
$('btnCancel').onclick = () => {
  st.sel = -1;
  JK.Devices.wires.select(-1);
  $('confirm').classList.remove('on');
};

/* ---------- 끝 ---------- */
function showEnd(room) {
  clearDevices();
  screen('result');
  S.setView('home');
  const sec = Math.round(((room.endedAt || Date.now()) - room.startedAt) / 1000);
  const time = `${Math.floor(sec / 60)}분 ${sec % 60}초`;
  if (room.status === 'win') {
    $('endTitle').textContent = '탈출 성공!';
    $('endText').textContent = `${STAGES}단계를 다 고쳤어요. 걸린 시간 ${time}, 남은 시간 에너지 ${room.energy}칸`;
  } else {
    $('endTitle').textContent = '시간 에너지가 다 떨어졌어요';
    $('endText').textContent = `${room.stage}단계까지 고쳤어요. 설명을 차근차근 주고받으면 할 수 있어요!`;
  }
}

/* ---------- 단추 ---------- */
$('btnMake').onclick = () => makeRoom().catch(netErr);
$('btnJoin').onclick = () => {
  screen('join');
  typed = '';
  drawCode();
};
let typed = '';
function drawCode() {
  $('joinCode').querySelectorAll('i').forEach((e, k) => (e.textContent = typed[k] || ''));
  $('joinGo').disabled = typed.length < 4;
  $('joinErr').textContent = '';
}
for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '지움', '0', '←']) {
  const b = el('button', '', k);
  b.onclick = () => {
    if (k === '지움') typed = '';
    else if (k === '←') typed = typed.slice(0, -1);
    else if (typed.length < 4) typed += k;
    drawCode();
  };
  $('keys').appendChild(b);
}
$('joinBack').onclick = goHome;
$('joinGo').onclick = () => joinRoom(typed).catch(netErr);
$('btnLeave').onclick = leave;
$('btnSwap').onclick = () => B.tx(st.code, (cur) => (cur && cur.status === 'lobby' ? { ...cur, swap: (cur.swap || 0) + 1 } : null)).catch(netErr);
document.querySelectorAll('#levelPick button').forEach(
  (b) => (b.onclick = () => B.tx(st.code, (cur) => (cur && cur.status === 'lobby' ? { ...cur, level: b.dataset.l } : null)).catch(netErr))
);
$('btnStart').onclick = () =>
  B.tx(st.code, (cur) => {
    if (!cur || cur.status !== 'lobby') return null;
    const list = lineup(cur);
    if (list.length < 2) return null;
    return {
      ...cur,
      status: 'play',
      at: Date.now(),
      seed: (Math.random() * 2 ** 31) >>> 0,
      n: list.length,
      roster: roster(list, cur.swap),
      stage: 0,
      energy: ENERGY,
      solved: {},
      acts: [],
      startedAt: Date.now(),
      endedAt: null,
    };
  }).catch(netErr);
$('btnAgain').onclick = () =>
  B.tx(st.code, (cur) => (cur && (cur.status === 'win' || cur.status === 'lose') ? { ...cur, status: 'lobby', at: Date.now(), swap: (cur.swap || 0) + 1, acts: [] } : null)).catch(netErr);
$('btnHome').onclick = leave;

/* ---------- 시계 ---------- */
setInterval(() => {
  const r = st.room;
  if (!r || r.status !== 'play') return;
  const s = Math.max(0, Math.round((Date.now() - r.startedAt) / 1000));
  $('clock').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}, 500);

/* ---------- 시험 도구용 ---------- */
st.mine = () => myDevices(st.room).map((m) => ({ k: m.k, kind: m.d.kind, side: m.side, actor: m.d.actor, solved: isSolved(st.room, st.room.stage, m.k) }));
st.solution = (k) => KINDS[st.plan[st.room.stage][k].kind].solve(st.plan[st.room.stage][k].inst);
st.focusOn = (k) => {
  const i = myDevices(st.room).findIndex((m) => m.k === k);
  if (i >= 0 && i !== st.focus) {
    st.focus = i;
    renderFocus(st.room);
    refreshStatus(st.room);
  }
};

/* ---------- 시작 ---------- */
await document.fonts.load('40px TMTitle').catch(() => {});
S.init($('cv'), 'home');
screen('home');
try {
  st.uid = await B.signIn();
  const again = localStorage.getItem('tm-room:' + st.uid);
  if (again) {
    // 새로 고침·와이파이 끊김 뒤: 내 자리가 남아 있으면 그대로 돌아간다
    const room = await B.getRoom(again);
    if (room && room.players && room.players[st.uid]) enter(again);
    else localStorage.removeItem('tm-room:' + st.uid);
  }
} catch (e) {
  netErr(e);
}
