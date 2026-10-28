// app.js — 화면 흐름: 처음 → 방 만들기/들어가기 → 모이는 곳 → 게임 6단계 + 시간의 문 → 탈출(떠오름) → 끝
// 서버에는 누를 때만 쓴다(방 만들기, 들어가기, 출발, 답 넣기, 한 판 더). 퍼즐은 씨앗으로 각자 만든다.
// 2명: 장치 하나씩. 3~4명: 두 쌍이 장치 두 개를 동시에(단계마다 짝이 바뀜). 마지막 문은 모두 함께. puzzles/plan.js 참고.
import { B } from './net.js';
import { makePlan, roster, ROLE_NAME, DEVICE_NAME, STAGES, NORMAL, RECHARGE, KINDS } from './puzzles/plan.js';
import { HEX, COUNTS } from './puzzles/wires.js';
import { SIZE as STAR_SIZE, key as starKey } from './puzzles/stars.js';
import { ICON_NAME } from './puzzles/net.js';
import { ERAS, SYMBOLS, SYMBOL_NAME, relic } from './puzzles/era.js';
import { ALL as DOOR_ROLES, PICS, PIC_NAME, LAMP_NAME, LAMP_HEX, METAL_NAME, MOVES } from './puzzles/door.js';
import { ruleText as roundRule } from './puzzles/round.js';
import { COLORS as FCOLORS, CNAME as FNAME, HEX as FHEX, ROWS as FROWS } from './puzzles/flash.js';
import { DIRS, MAX_MOVES } from './puzzles/maze.js';
import { FLAGS, FLAG_NAME, FLAG_HEX, WORDS, orderText } from './puzzles/bag.js';
import { EVENTS } from './puzzles/timeline.js';
import { howSVG, howSteps, howSum } from './how.js';

const $ = (id) => document.getElementById(id);
JK.TL_NAME = Object.fromEntries(EVENTS.map((e) => [e.id, e.name])); // 연표 카드 3D(dev-new2.js)가 쓴다
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
      // 게임 중에 나가면 그 역할의 단서가 사라져 남은 친구들이 풀 수 없다 → 게임을 멈추고 모두 모이는 곳으로
      if (cur.status === 'play') return { ...cur, at: Date.now(), players, status: 'lobby', acts: [] };
      return { ...cur, at: Date.now(), players };
    }).catch(netErr);
  goHome();
}
// 화면 위에 잠깐 뜨는 알림 (모이는 곳에서도 보이게 게임 화면 밖에 있다)
let noticeT = 0;
function notice(text) {
  const n = $('notice');
  n.textContent = text;
  n.classList.add('on');
  clearTimeout(noticeT);
  noticeT = setTimeout(() => n.classList.remove('on'), HOLD ? 60000 : 5000);
}
function goHome() {
  clearDevices();
  S.land();
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
  if (room.status === 'lobby') {
    if (prev && prev.status === 'play') notice('친구가 나가서 게임이 멈췄어요. 모이는 곳으로 돌아왔어요');
    return showLobby(room);
  }
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
  if ((room.status === 'win' || room.status === 'lose') && st.endFor !== pk) {
    st.endFor = pk;
    const still = () => st.room && st.room.status === room.status && st.endFor === pk;
    if (room.status === 'lose') setTimeout(() => still() && showEnd(st.room), 2000);
    else
      setTimeout(() => {
        if (!still()) return;
        // 탈출: 타임머신이 빛나며 떠오른 뒤 끝 카드
        clearDevices();
        screen('fly');
        S.launch();
        setTimeout(() => still() && showEnd(st.room), HOLD ? 3000 : 5200);
      }, 1900);
  }
}

function showLobby(room) {
  clearDevices();
  S.land();
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
// at: 어느 단계 것인지(없으면 방의 지금 단계). 화면 단추는 화면에 보이는 단계(st.shownStage)로 찾는다.
function myDevices(room, at) {
  const stage = st.plan[Math.min(at ?? room.stage, STAGES - 1)];
  // 시간의 문: 장치는 하나, 내가 맡은 역할마다 단서 화면이 하나씩 (side = 역할)
  if (stage[0].kind === 'door') return DOOR_ROLES.filter((r) => st.roles.includes(r)).map((r) => ({ k: 0, d: stage[0], side: r }));
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
// 이 화면에서 내가 맡은 역할
const roleOf = (m) => (m.d.kind === 'door' ? m.side : m.side === 'A' ? m.d.A : m.d.B);
const stageLabel = (s) => (s >= NORMAL ? '마지막 문' : `단계${s + 1}/${NORMAL}`);

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
  $('devNo').textContent = stageLabel(s);
  $('devName').textContent = cur ? DEVICE_NAME[cur.d.kind] : '';
  document.body.classList.toggle('final', s >= NORMAL);
  // 내가 두 장치(또는 문 단서 둘)를 맡으면 위에 고르는 칸
  const tabs = $('slotTabs');
  tabs.innerHTML = '';
  if (mine.length > 1)
    mine.forEach((m, i) => {
      const label = m.d.kind === 'door' ? `${ROLE_NAME[m.side]} 단서` : `${ROLE_NAME[roleOf(m)]}: ${DEVICE_NAME[m.d.kind]}${isSolved(room, s, m.k) ? ' ✓' : ''}`;
      const b = el('button', i === st.focus ? 'on' : '', label);
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
  const role = roleOf(m);
  document.body.dataset.kind = d.kind;
  document.body.dataset.role = role;
  $('meChip').querySelector('em').textContent = ROLE_NAME[role];
  $('meChip').className = 'me ' + role;
  if (d.kind === 'door') {
    // 시간의 문: 조종사·탐험가는 3D(아래 칸), 기록관·기술자는 카드
    const a = role === 'pilot' || role === 'explorer';
    document.body.dataset.side = a ? 'A' : 'B';
    $('mate').textContent = st.room.n > 2 ? '모두 함께 열어요' : '둘이 단서를 두 개씩 가졌어요';
    if (role === 'pilot') JK.Devices.door.build(d.inst);
    if (role === 'explorer') JK.Devices.gate.build(d.inst);
    S.setView({ pilot: 'device', explorer: 'window', reader: 'reader', tech: 'tech' }[role]);
    if (a) renderA(m);
    else renderB(m);
    return maybeHow(m, role);
  }
  document.body.dataset.side = side;
  $('mate').textContent = `짝: ${mateOf(d, side)}`;
  if (side === 'A') {
    const dev = JK.Devices[d.kind];
    dev.build(d.inst, HEX);
    S.setView(dev.view);
    renderA(m);
  } else {
    S.setView(role === 'reader' ? 'reader' : 'tech');
    renderB(m);
  }
  maybeHow(m, role);
  void s;
}

/* ---------- 장치 설명서 (그림 한 장, 그 판에서 처음 나올 때) ---------- */
const OPT = {
  get how() {
    try {
      return localStorage.getItem('tm-opt-how') !== 'off';
    } catch (e) {
      return true;
    }
  },
  set how(v) {
    try {
      localStorage.setItem('tm-opt-how', v ? 'on' : 'off');
    } catch (e) {
      /* 저장이 막힌 기기: 이번만 */
    }
    drawOpts();
  },
};
function maybeHow(m, role) {
  const key = st.planKey + ':' + m.d.kind;
  st.howSeen = st.howSeen || new Set();
  if (!OPT.how || st.howSeen.has(key)) return hideHow();
  st.howSeen.add(key);
  showHow(m, role);
}
function showHow(m, role) {
  const k = m.d.kind;
  $('howName').textContent = DEVICE_NAME[k];
  $('howSum').textContent = howSum(k);
  $('howPic').innerHTML = howSVG(k, m.d, role);
  $('howSteps').innerHTML = howSteps(k, m.d, role)
    .map((s) => `<li>${s}</li>`)
    .join('');
  $('how').classList.add('on');
}
function hideHow() {
  $('how').classList.remove('on');
}
$('howOk').onclick = hideHow;
$('howOff').onclick = () => {
  OPT.how = false;
  hideHow();
  toast('설명서를 껐어요<small>⚙ 옵션에서 다시 켤 수 있어요</small>', 'good', 1800);
};
// 위 ? 단추: 지금 장치의 설명서를 언제든 다시 보기
$('btnHow').onclick = () => {
  const m = st.room && myDevices(st.room, st.shownStage)[st.focus];
  if (m) showHow(m, roleOf(m));
};
// ⚙ 옵션
function drawOpts() {
  const on = OPT.how;
  const b = $('optHow');
  b.textContent = on ? '켜짐' : '꺼짐';
  b.classList.toggle('on', on);
}
$('btnOpt').onclick = () => {
  drawOpts();
  $('opts').classList.add('on');
};
$('optHow').onclick = () => (OPT.how = !OPT.how);
$('optClose').onclick = () => $('opts').classList.remove('on');

/* ---------- A 쪽(보는 사람) ---------- */
const TASK = {
  wires: ['선이 <em>몇 개</em>인지, <em>무슨 색</em>인지 기록관에게 말해 줘요', '기록관이 알려 주는 선을 눌러 뽑아요'],
  stars: ['별자리 반쪽이 어디에 있는지 <em>기술자</em>에게 설명해요', '점선은 대칭축이에요. 기술자가 나머지 반쪽 별을 켜요'],
  starsPoint: ['별자리 반쪽이 어디에 있는지 <em>기술자</em>에게 설명해요', '빨간 점이 대칭의 중심이에요. 기술자가 나머지 반쪽 별을 켜요'],
  net: ['상자를 <em>끌어서 돌려 보고</em>, 그림을 기술자에게 설명해요', '기술자가 이 상자를 펼친 전개도를 찾아요'],
  era: ['창밖 유물의 <em>생김새</em>를 기록관에게 설명해요', '기록관이 알려 주는 기호를 1번 유물부터 차례로 눌러요'],
  round: ['계기판의 <em>수</em>와 <em>불빛 색</em>을 기록관에게 알려 줘요', '기록관이 알려 주는 어림한 수로 숫자 바퀴를 맞춰요'],
  flash: ['수정이 깜빡이는 <em>색의 차례</em>를 기록관에게 말해 줘요', '하얀 불이 반짝이면 처음부터예요. 기록관이 알려 주는 색을 차례로 눌러요'],
  maze: ['<em>초록 고리</em>, <em>공</em>, <em>출구</em>가 몇째 줄 몇째 칸인지 기술자에게 알려 줘요', '기술자가 불러 주는 길을 화살표로 넣고 출발해요. 벽은 기술자만 보여요'],
  bag: ['<em>깃발 색</em>과 주머니마다 <em>무슨 색 공이 몇 개</em>인지 기술자에게 알려 줘요', '기술자가 알려 주는 주머니 번호를 눌러요'],
  bagMid: ['<em>깃발 색</em>과 주머니마다 <em>무슨 색 공이 몇 개</em>인지 기술자에게 알려 줘요', '기술자가 알려 주는 주머니 두 개를 차례대로 눌러요'],
  shadow: ['벽에 비친 <em>그림자 모양</em>을 기술자에게 설명해요', '"맨 위에 3칸, 그 아래 왼쪽에 1칸"처럼 칸으로 말해 봐요. 기술자가 같은 조각을 골라요'],
  timeline: ['카드에 적힌 <em>사건</em>을 기록관에게 읽어 줘요', '기록관이 알려 주는 차례대로, 가장 오래된 사건부터 카드 번호를 눌러요'],
  doorPilot: ['문 위 <em>불빛이 무슨 색</em>인지 기록관에게 알려 줘요', '기술자가 불러 주는 번호 4개를 차례로 누르고 문을 열어요'],
  doorExplorer: ['돌판 그림 4개를 <em>1번부터 차례로</em> 기록관에게 말해 줘요', '모두가 단서를 하나씩 가졌어요. 다 같이 말해야 열려요'],
  doorExplorerMid: ['돌판 그림 4개를 <em>1번부터 차례로</em> 기록관에게 말해 줘요', '문 테두리가 <em>금색인지 은색인지</em> 기술자에게도 알려 줘요'],
};
function taskOf(m) {
  const k = m.d.kind;
  if (k === 'stars' && m.d.inst.mode === 'point') return TASK.starsPoint;
  if (k === 'door') return m.side === 'pilot' ? TASK.doorPilot : m.d.inst.level === 'mid' ? TASK.doorExplorerMid : TASK.doorExplorer;
  if (k === 'bag' && m.d.inst.level === 'mid') return TASK.bagMid;
  return TASK[k];
}
function renderA(m) {
  const t = taskOf(m);
  $('taskK').innerHTML = t[0];
  $('taskP').innerHTML = t[1];
  const bar = $('eraBar');
  bar.innerHTML = '';
  if (m.d.kind === 'door' && m.side === 'pilot') return doorKeys(bar, m);
  if (m.d.kind === 'round') return roundBar(bar, m);
  if (m.d.kind === 'flash') return flashBar(bar, m);
  if (m.d.kind === 'maze') return mazeBar(bar, m);
  if (m.d.kind === 'bag') return numBar(bar, m, 4, m.d.inst.answer.length, 'bagGo', '주머니');
  if (m.d.kind === 'timeline') return numBar(bar, m, m.d.inst.cards.length, m.d.inst.cards.length, 'tlGo', '카드');
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

// 시간의 문 번호 단추 (조종사)
function doorKeys(bar, m) {
  st.ui.code = st.ui.code || [];
  const slots = el('div', 'era-slots door-slots');
  for (let i = 0; i < 4; i++) slots.appendChild(el('span', 'era-slot', `<small>${i + 1}</small>${st.ui.code[i] != null ? `<b>${st.ui.code[i]}</b>` : ''}`));
  bar.appendChild(slots);
  const keys = el('div', 'door-keys');
  for (let n = 1; n <= 9; n++) {
    const b = el('button', '', String(n));
    b.dataset.n = n;
    b.onclick = () => {
      if (st.ui.code.length < 4) st.ui.code.push(n);
      renderA(m);
    };
    keys.appendChild(b);
  }
  bar.appendChild(keys);
  const ctl = el('div', 'era-ctl');
  const clr = el('button', 'ghost', '지우기');
  clr.onclick = () => {
    st.ui.code = [];
    renderA(m);
  };
  const go = el('button', 'go', '문 열기');
  go.id = 'doorGo';
  go.disabled = st.ui.code.length < 4;
  go.onclick = () => act(m, { code: st.ui.code.slice() });
  ctl.append(clr, go);
  bar.appendChild(ctl);
}

// 어림 자물쇠: 숫자 바퀴 4개 (조종사)
function roundBar(bar, m) {
  st.ui.dig = st.ui.dig || [0, 0, 0, 0];
  const wheels = el('div', 'wheels');
  st.ui.dig.forEach((v, i) => {
    const w = el('div', 'wheel');
    const up = el('button', 'up', '▲');
    const dn = el('button', 'dn', '▼');
    up.dataset.i = dn.dataset.i = i;
    up.onclick = () => turnDigit(m, i, 1);
    dn.onclick = () => turnDigit(m, i, -1);
    w.append(up, el('b', '', String(v)), dn);
    wheels.appendChild(w);
    if (i === 0) wheels.appendChild(el('span', 'comma', ','));
  });
  bar.appendChild(wheels);
  const ctl = el('div', 'era-ctl');
  const clr = el('button', 'ghost', '0으로');
  clr.onclick = () => {
    st.ui.dig = [0, 0, 0, 0];
    renderA(m);
  };
  const go = el('button', 'go', '맞추기');
  go.id = 'roundGo';
  go.onclick = () => act(m, { v: +st.ui.dig.join('') });
  ctl.append(clr, go);
  bar.appendChild(ctl);
  JK.Devices.round.setDigits(st.ui.dig);
}
function turnDigit(m, i, k) {
  st.ui.dig[i] = (st.ui.dig[i] + k + 10) % 10;
  renderA(m);
}

// 깜빡이 단추: 색 단추 4개 (탐험가)
function flashBar(bar, m) {
  const n = m.d.inst.seq.length;
  st.ui.seq = st.ui.seq || [];
  const slots = el('div', 'era-slots');
  for (let i = 0; i < n; i++) {
    const c = st.ui.seq[i];
    slots.appendChild(el('span', 'era-slot' + (c ? ' filled' : ''), `<small>${i + 1}</small>${c ? `<i class="dot" style="--c:${FHEX[c]}"></i>` : ''}`));
  }
  bar.appendChild(slots);
  const keys = el('div', 'flash-keys');
  for (const c of FCOLORS) {
    const b = el('button', '', `<i class="dot" style="--c:${FHEX[c]}"></i><span>${FNAME[c]}</span>`);
    b.dataset.c = c;
    b.onclick = () => {
      if (st.ui.seq.length < n) st.ui.seq.push(c);
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
  go.id = 'flashGo';
  go.disabled = st.ui.seq.length < n;
  // 누를 때 보이던 시간 에너지로 확인한다(숙련은 에너지에 따라 바꿈표 줄이 다름)
  go.onclick = () => act(m, { seq: st.ui.seq.slice(), e: st.room.energy });
  ctl.append(clr, go);
  bar.appendChild(ctl);
}

// 배관 미로: 화살표로 길 넣기 (조종사)
const ARROW = { up: '↑', down: '↓', left: '←', right: '→' };
function mazeBar(bar, m) {
  st.ui.path = st.ui.path || [];
  const list = el('div', 'path-list');
  if (!st.ui.path.length) list.appendChild(el('span', 'empty', '화살표를 눌러 길을 넣어요'));
  st.ui.path.forEach((d) => list.appendChild(el('span', 'step', ARROW[d])));
  bar.appendChild(list);
  const pad = el('div', 'arrows');
  for (const d of ['up', 'left', 'down', 'right']) {
    const b = el('button', d, ARROW[d]);
    b.dataset.d = d;
    b.onclick = () => {
      if (st.ui.path.length < MAX_MOVES) st.ui.path.push(d);
      renderA(m);
    };
    pad.appendChild(b);
  }
  bar.appendChild(pad);
  const ctl = el('div', 'maze-ctl');
  const back = el('button', 'ghost', '하나 지우기');
  back.onclick = () => {
    st.ui.path.pop();
    renderA(m);
  };
  const clr = el('button', 'ghost', '다 지우기');
  clr.onclick = () => {
    st.ui.path = [];
    renderA(m);
  };
  const go = el('button', 'go', '출발');
  go.id = 'mazeGo';
  go.disabled = !st.ui.path.length;
  go.onclick = () => act(m, { path: st.ui.path.slice() });
  ctl.append(back, clr, go);
  bar.appendChild(ctl);
  JK.Devices.maze.setPath(st.ui.path);
}

// 번호를 차례로 누르기 (가능성 주머니·연표): 번호 n개 가운데 need 개
function numBar(bar, m, n, need, goId, word) {
  st.ui.seq = st.ui.seq || [];
  const slots = el('div', 'era-slots door-slots');
  for (let i = 0; i < need; i++) slots.appendChild(el('span', 'era-slot', `<small>${need > 1 ? i + 1 + '째' : ''}</small>${st.ui.seq[i] != null ? `<b>${st.ui.seq[i] + 1}</b>` : ''}`));
  bar.appendChild(slots);
  const keys = el('div', 'num-keys');
  for (let i = 0; i < n; i++) {
    const used = st.ui.seq.includes(i);
    const b = el('button', used ? 'used' : '', `<small>${word}</small>${i + 1}`);
    b.dataset.n = i;
    b.onclick = () => {
      if (used || st.ui.seq.length >= need) return;
      st.ui.seq.push(i);
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
  go.id = goId;
  go.disabled = st.ui.seq.length < need;
  go.onclick = () => act(m, { seq: st.ui.seq.slice() });
  ctl.append(clr, go);
  bar.appendChild(ctl);
}

/* ---------- B 쪽(설명서·판을 가진 사람) ---------- */
function renderB(m) {
  const book = $('book');
  book.innerHTML = '';
  book.className = 'book ' + m.d.kind;
  if (m.d.kind === 'door') return (m.side === 'reader' ? bookDoorRule : bookDoorTable)(book, m);
  ({ wires: bookWires, stars: bookStars, net: bookNet, era: bookEra, round: bookRound, flash: bookFlash, maze: bookMaze, bag: bookBag, shadow: bookShadow, timeline: bookTimeline })[m.d.kind](book, m);
}

// 가능성 주머니 — 기술자: 깃발 색마다 찾을 주머니
function bookBag(book, m) {
  const I = m.d.inst;
  const mid = I.answer.length > 1;
  head(book, '주머니 주문서', `① 탐험가에게 <b>깃발 색</b>을 물어봐요. ② 그 줄의 주머니를 찾도록 주머니마다 <b>무슨 색 공이 몇 개</b>인지 물어봐요.${mid ? ' 두 개를 <b>차례대로</b>!' : ''}`);
  const ol = el('ol', 'm-rules bag-rules');
  for (const f of FLAGS) {
    const o = I.orders[f];
    const li = el('li', '', `<span class="flagdot" style="--c:${FLAG_HEX[f]}"></span><span class="c">깃발이 <b>${FLAG_NAME[f]}색</b>이면</span><span class="ar">→</span><span class="a">${o.map((x, i) => (mid ? `${i + 1}째: ` : '') + orderText(x).replace(/「(.+?)」/, '<span class="nw">「$1」</span>')).join('<br>')}</span>`);
    li.onclick = () => {
      ol.querySelectorAll('li').forEach((x) => x.classList.remove('mark'));
      li.classList.add('mark');
    };
    ol.appendChild(li);
  }
  book.appendChild(ol);
  // 가능성 말 ↔ 공 4개 가운데 몇 개
  const scale = el('div', 'bag-scale');
  WORDS.forEach((w, n) => {
    const balls = Array.from({ length: 4 }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('');
    scale.appendChild(el('div', 'step', `<span class="balls">${balls}</span><b>${w}</b>`));
  });
  book.appendChild(scale);
  book.appendChild(el('p', 'legend', '공 4개 가운데 찾는 색 공이 몇 개인지에 따라 가능성을 말로 나타내요 (색칠한 공이 찾는 색)'));
}

// 그림자 맞추기 — 기술자: 조각 카드 4장 가운데 그림자와 합동인 것
function shadowCanvas(cells) {
  const cs = 34,
    n = 4;
  const cv = document.createElement('canvas');
  cv.width = cv.height = n * cs + 8;
  const g = cv.getContext('2d');
  g.fillStyle = '#fbf6ea';
  g.fillRect(0, 0, cv.width, cv.height);
  const w = Math.max(...cells.map((c) => c[0])) + 1,
    h = Math.max(...cells.map((c) => c[1])) + 1;
  const ox = 4 + ((n - w) * cs) / 2,
    oy = 4 + ((n - h) * cs) / 2;
  g.strokeStyle = '#e6d4ac';
  for (let i = 0; i <= n; i++) {
    g.beginPath();
    g.moveTo(4 + i * cs, 4);
    g.lineTo(4 + i * cs, 4 + n * cs);
    g.moveTo(4, 4 + i * cs);
    g.lineTo(4 + n * cs, 4 + i * cs);
    g.stroke();
  }
  for (const [x, y] of cells) {
    g.fillStyle = '#e88a5a';
    g.fillRect(ox + x * cs + 1, oy + y * cs + 1, cs - 2, cs - 2);
    g.strokeStyle = '#a4552e';
    g.lineWidth = 2;
    g.strokeRect(ox + x * cs + 2, oy + y * cs + 2, cs - 4, cs - 4);
  }
  return cv;
}
function bookShadow(book, m) {
  const I = m.d.inst;
  head(book, '조각 카드', `탐험가가 설명하는 그림자와 <b>꼭 포개어지는</b>(합동인) 조각은 하나뿐이에요. 조각은 <b>돌려</b> 놓았어요${I.mid ? '. <b>뒤집어 놓은</b> 것도 있어요' : ''}.`);
  const names = ['가', '나', '다', '라'];
  st.ui.wrong = st.ui.wrong || new Set();
  const row = el('div', 'nets');
  I.cards.forEach((c, i) => {
    const card = el('button', 'netcard' + (st.ui.wrong.has(i) ? ' wrong' : '') + (st.sel === i ? ' sel' : ''));
    card.appendChild(el('b', '', names[i]));
    card.appendChild(shadowCanvas(c));
    card.onclick = () => {
      if (st.ui.wrong.has(i)) return;
      st.sel = i;
      row.querySelectorAll('.netcard').forEach((x, j) => x.classList.toggle('sel', j === i));
      go.disabled = false;
      go.textContent = `${names[i]} 조각으로 할래요`;
    };
    row.appendChild(card);
  });
  book.appendChild(row);
  book.appendChild(el('p', 'legend', '"맨 윗줄에 몇 칸이야?", "튀어나온 칸은 어느 쪽이야?"처럼 물어봐요'));
  const ctl = el('div', 'row');
  const go = el('button', 'go', '조각을 골라요');
  go.id = 'shadowGo';
  go.disabled = st.sel < 0;
  go.onclick = () => st.sel >= 0 && act(m, { pick: st.sel });
  ctl.appendChild(go);
  book.appendChild(ctl);
}

// 연표 줄 세우기 — 기록관: 사건과 해가 적힌 연표
function bookTimeline(book) {
  head(book, '우리 역사 연표', '조종사가 읽어 주는 사건을 연표에서 찾아서, <b>가장 오래된 것부터</b> 카드 번호의 차례를 알려 줘요. 위에 있을수록 오래된 일이에요.');
  const ol = el('ol', 'tl-list');
  for (const e of EVENTS) {
    const li = el('li', 'era-' + e.era, `<span class="era">${e.era}</span><b>${e.name}</b><span class="when">${e.when}</span>`);
    li.onclick = () => li.classList.toggle('mark');
    ol.appendChild(li);
  }
  book.appendChild(ol);
}

// 어림 자물쇠 — 기록관: 불빛 색(숙련은 × 수의 범위)마다 어림하는 방법
function bookRound(book, m) {
  const I = m.d.inst;
  const mid = I.table.length > 1;
  head(
    book,
    '어림 규칙표',
    '① 조종사에게 <b>계기판의 수</b>와 <b>불빛 색</b>을 물어봐요. ② 그 색 줄의 방법대로 어림한 수를 알려 줘요.' + (mid ? ` 수가 <b>${I.split} 미만</b>인지 <b>${I.split} 이상</b>인지에 따라 칸이 달라요.` : '')
  );
  const cols = mid ? [`${I.split} 미만`, `${I.split} 이상`] : ['어림하는 방법'];
  let html = '<tr><th></th>' + cols.map((c) => `<th>${c}</th>`).join('') + '</tr>';
  for (const l of I.lamps) html += `<tr><th class="lamprow"><span class="lampdot" style="--c:${LAMP_HEX[l]}"></span>${LAMP_NAME[l]} 불</th>` + I.table.map((t) => `<td>${roundRule(t[l])}</td>`).join('') + '</tr>';
  const tb = el('table', 'round-table');
  tb.innerHTML = html;
  tb.querySelectorAll('td').forEach((td) => (td.onclick = () => td.classList.toggle('mark')));
  book.appendChild(tb);
  book.appendChild(
    el('div', 'round-help', '<b>올림</b> 구하려는 자리 아래 수를 모두 올려요 &nbsp; <b>버림</b> 아래 수를 모두 버려요 &nbsp; <b>반올림</b> 바로 아래 자리가 5 이상이면 올리고, 4 이하이면 버려요')
  );
}

// 깜빡이 단추 — 기록관: 깜빡인 색 → 누를 색
function bookFlash(book, m) {
  const I = m.d.inst;
  head(
    book,
    '깜빡이 바꿈표',
    '탐험가가 말하는 <b>깜빡인 색</b>을 이 표로 바꿔서 <b>누를 색</b>을 차례로 알려 줘요.' + (I.mid ? ' <b>시간 에너지가 몇 칸 남았는지</b>에 따라 줄이 달라요. 틀려서 칸이 줄면 줄도 바뀌어요!' : '')
  );
  const chip = (c) => `<span class="chip" style="--c:${FHEX[c]}">${FNAME[c]}</span>`;
  let html = '<tr><th>깜빡인 색</th>' + FCOLORS.map((c) => `<th>${chip(c)}</th>`).join('') + '</tr>';
  I.maps.forEach((mp, r) => (html += `<tr><th>${I.mid ? FROWS[r].text : '누를 색'}</th>` + FCOLORS.map((c) => `<td>${chip(mp[c])}</td>`).join('') + '</tr>'));
  const tb = el('table', 'flash-table');
  tb.innerHTML = html;
  book.appendChild(tb);
}

// 배관 미로 — 기술자: 벽이 그려진 지도들 (칸을 눌러 길을 짚어 볼 수 있다)
function mazeCanvas(I, mp, dots) {
  const N = I.N,
    cs = N > 5 ? 30 : 36,
    pad = 22;
  const cv = document.createElement('canvas');
  cv.width = cv.height = pad + N * cs + 6;
  const g = cv.getContext('2d');
  g.fillStyle = '#fbf6ea';
  g.fillRect(pad, pad, N * cs, N * cs);
  g.fillStyle = '#6b5440';
  g.font = '15px TMBody, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < N; i++) {
    g.fillText(String(i + 1), pad + i * cs + cs / 2, pad / 2 + 1); // 칸
    g.fillText(String(i + 1), pad / 2, pad + i * cs + cs / 2); // 줄
  }
  g.strokeStyle = '#e6d4ac';
  g.lineWidth = 1;
  for (let i = 0; i <= N; i++) {
    g.beginPath();
    g.moveTo(pad + i * cs, pad);
    g.lineTo(pad + i * cs, pad + N * cs);
    g.moveTo(pad, pad + i * cs);
    g.lineTo(pad + N * cs, pad + i * cs);
    g.stroke();
  }
  for (const [x, y] of dots) {
    g.fillStyle = 'rgba(47,111,108,.45)';
    g.beginPath();
    g.arc(pad + x * cs + cs / 2, pad + y * cs + cs / 2, cs * 0.22, 0, Math.PI * 2);
    g.fill();
  }
  for (const [x, y] of mp.marks) {
    g.strokeStyle = '#2fa85a';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(pad + x * cs + cs / 2, pad + y * cs + cs / 2, cs * 0.3, 0, Math.PI * 2);
    g.stroke();
  }
  // 벽: 열리지 않은 쪽에 굵은 줄
  g.strokeStyle = '#5a3a28';
  g.lineWidth = 4;
  g.lineCap = 'round';
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const o = mp.open[y][x];
      const X = pad + x * cs,
        Y = pad + y * cs;
      g.beginPath();
      if (!o.includes('up')) g.moveTo(X, Y), g.lineTo(X + cs, Y);
      if (!o.includes('left')) g.moveTo(X, Y), g.lineTo(X, Y + cs);
      if (x === N - 1 && !o.includes('right')) g.moveTo(X + cs, Y), g.lineTo(X + cs, Y + cs);
      if (y === N - 1 && !o.includes('down')) g.moveTo(X, Y + cs), g.lineTo(X + cs, Y + cs);
      g.stroke();
    }
  cv.cell = (px, py) => [Math.floor((px - pad) / cs), Math.floor((py - pad) / cs)];
  return cv;
}
function bookMaze(book, m) {
  const I = m.d.inst;
  head(
    book,
    '배관 지도',
    '① 조종사에게 <b>초록 고리 두 개</b>가 몇째 줄 몇째 칸인지 물어서 같은 지도를 찾아요. ② <b>공</b>과 <b>출구</b> 자리를 묻고, 벽을 피해 가는 길을 불러 줘요. (칸을 누르면 점을 찍어 길을 짚어 볼 수 있어요)'
  );
  st.ui.dots = st.ui.dots || I.maps.map(() => []);
  const row = el('div', 'maze-maps');
  const names = ['가', '나', '다'];
  I.maps.forEach((mp, i) => {
    const card = el('div', 'mazecard');
    card.appendChild(el('b', '', names[i]));
    const draw = () => {
      const cv = mazeCanvas(I, mp, st.ui.dots[i]);
      cv.onclick = (e) => {
        const r = cv.getBoundingClientRect();
        const [x, y] = cv.cell(((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height);
        if (x < 0 || y < 0 || x >= I.N || y >= I.N) return;
        const k = st.ui.dots[i].findIndex((p) => p[0] === x && p[1] === y);
        k >= 0 ? st.ui.dots[i].splice(k, 1) : st.ui.dots[i].push([x, y]);
        draw();
      };
      card.querySelector('canvas')?.remove();
      card.appendChild(cv);
    };
    draw();
    row.appendChild(card);
  });
  book.appendChild(row);
  book.appendChild(el('p', 'legend', '줄은 위에서부터, 칸은 왼쪽부터 세어요. 굵은 줄이 벽이에요.'));
}

// 시간의 문 — 기록관: 불빛 색마다 그림 차례 바꾸는 규칙 + 받아 적는 칸
const CIRC = ['①', '②', '③', '④'];
function bookDoorRule(book, m) {
  const I = m.d.inst;
  head(book, '시간의 문 규칙 카드', '① 탐험가에게 <b>돌판 그림 차례</b>를, 조종사에게 <b>불빛 색</b>을 물어봐요. ② 그 색 줄대로 차례를 바꿔서 <b>기술자</b>에게 알려 줘요.');
  const ol = el('ol', 'm-rules door-rules');
  I.lamps.forEach((l) => {
    const mv = MOVES[I.rule[l]];
    const li = el('li', '', `<span class="lampdot" style="--c:${LAMP_HEX[l]}"></span><span class="c">불빛이 <b>${LAMP_NAME[l]}색</b>이면</span><span class="ar">→</span><span class="a">${mv.text}<small>${CIRC.join('')} → ${mv.how.map((i) => CIRC[i]).join('')}</small></span>`);
    li.onclick = () => {
      ol.querySelectorAll('li').forEach((x) => x.classList.remove('mark'));
      li.classList.add('mark');
    };
    ol.appendChild(li);
  });
  book.appendChild(ol);
  // 받아 적기: 탐험가가 말한 그림을 눌러 차례대로 적어 둔다(바꾸기는 직접)
  st.ui.memo = st.ui.memo || [];
  const memo = el('div', 'door-memo');
  const draw = () => {
    memo.innerHTML = '<span class="lab">받아 적기</span>';
    const slots = el('div', 'era-slots');
    for (let i = 0; i < 4; i++) {
      const p = st.ui.memo[i];
      slots.appendChild(el('span', 'era-slot', `<small>${i + 1}</small>${p ? `<img src="${JK.iconURL(p, 64)}" alt="${PIC_NAME[p]}">` : ''}`));
    }
    memo.appendChild(slots);
    const keys = el('div', 'memo-keys');
    for (const p of PICS) {
      const b = el('button', '', `<img src="${JK.iconURL(p, 48)}" alt=""><span>${PIC_NAME[p]}</span>`);
      b.onclick = () => {
        if (st.ui.memo.length < 4) st.ui.memo.push(p);
        draw();
      };
      keys.appendChild(b);
    }
    const clr = el('button', 'ghost', '지우기');
    clr.onclick = () => {
      st.ui.memo = [];
      draw();
    };
    memo.append(keys, clr);
  };
  draw();
  book.appendChild(memo);
}

// 시간의 문 — 기술자: 그림마다 부품 번호 (숙련은 금색 줄·은색 줄)
function bookDoorTable(book, m) {
  const I = m.d.inst;
  const mid = I.level === 'mid';
  head(
    book,
    '부품 번호표',
    mid
      ? '탐험가에게 문 테두리가 <b>금색인지 은색인지</b> 묻고, 그 줄에서 기록관이 알려 주는 그림 차례대로 <b>번호</b>를 찾아 조종사에게 불러 줘요.'
      : '기록관이 알려 주는 그림 차례대로 <b>번호</b>를 찾아 조종사에게 불러 줘요.'
  );
  const tb = el('table', 'door-table');
  let html = '<tr><th></th>' + PICS.map((p) => `<th><img src="${JK.iconURL(p, 64)}" alt=""><span>${PIC_NAME[p]}</span></th>`).join('') + '</tr>';
  for (const metal of Object.keys(I.table)) html += `<tr><th class="metal ${metal}">${mid ? METAL_NAME[metal] + ' 줄' : '번호'}</th>` + PICS.map((p) => `<td>${I.table[metal][p]}</td>`).join('') + '</tr>';
  tb.innerHTML = html;
  tb.querySelectorAll('td').forEach((td) => (td.onclick = () => td.classList.toggle('mark')));
  book.appendChild(tb);
  book.appendChild(el('p', 'legend', '번호 칸을 누르면 표시해 둘 수 있어요'));
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
// 다른 짝이 고친 알림(st.busy)이 떠 있어도 내 답은 막지 않는다. 화면에 보이는 단계로 보내고,
// 그새 단계가 넘어갔으면 서버 쪽 확인(cur.stage !== s)에서 버려진다.
async function act(m, payload) {
  if (st.sending) return;
  const s = st.shownStage;
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
          // 두 단계마다 시간 에너지 1칸 충전 (5칸까지)
          if (RECHARGE.includes(s)) next.energy = Math.min(ENERGY, cur.energy + 1);
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
  if (d.kind === 'door' && a.s === st.shownStage && document.body.dataset.role === 'pilot') JK.Devices.door.react(a.ok);
  // 지금 이 장치를 보고 있는 조종사 화면이면 3D 반응 (미로: 공이 길을 따라 굴러감)
  const watching = mine && mine.side === 'A' && myDevices(room)[st.focus]?.k === a.k;
  let hold = 0;
  if (watching && d.kind === 'maze') hold = JK.Devices.maze.run(a.a.path, a.ok);
  if (watching && d.kind === 'round') JK.Devices.round.react(a.ok);
  if (a.ok) {
    const stageDone = st.plan[a.s].every((_, k) => isSolved(room, a.s, k));
    const last = stageDone && a.s >= STAGES - 1;
    const next = stageDone && a.s === NORMAL - 1 ? '이제 마지막 시간의 문이에요!' : RECHARGE.includes(a.s) && stageDone ? '시간 에너지 1칸이 다시 찼어요' : '다음 단계로 가요';
    setTimeout(() => toast(last ? '시간의 문이 열렸어요!' : stageDone ? `${name} 고쳤어요!<small>${next}</small>` : `${name} 고쳤어요!`, 'good', 1500), 400 + hold);
  } else {
    setTimeout(() => {
      toast(`찌릿! ${name}에서 틀렸어요<small>시간 에너지가 하나 줄었어요</small>`, 'bad', 1700);
      $('energy').classList.remove('hit');
      void $('energy').offsetWidth;
      $('energy').classList.add('hit');
      if (mine) {
        // 틀린 것 표시: 전개도는 ✗, 시대 다이얼은 지움
        if (d.kind === 'net' || d.kind === 'shadow') st.ui.wrong = (st.ui.wrong || new Set()).add(a.a.pick);
        if (d.kind === 'era') st.ui.seq = [];
        if (d.kind === 'flash' || d.kind === 'bag' || d.kind === 'timeline') {
          st.ui.seq = [];
          const fm = myDevices(st.room, st.shownStage)[st.focus];
          if (fm && fm.side === 'A' && fm.d.kind === d.kind) renderA(fm);
        }
        if (d.kind === 'shadow' && document.body.dataset.side === 'B') {
          st.sel = -1;
          renderFocus(st.room);
        }
        if (d.kind === 'door') {
          // 문은 다시 짓지 않는다(덜컹 움직임이 이어지게): 번호 칸만 비운다
          st.ui.code = [];
          const pm = myDevices(st.room, st.shownStage)[st.focus];
          if (pm && pm.side === 'pilot') renderA(pm);
        }
        if (d.kind === 'net' || d.kind === 'era') {
          st.sel = -1;
          renderFocus(st.room);
        }
      }
    }, 400 + hold);
  }
  setTimeout(
    () => {
      st.busy = false;
      if (st.room && st.room.status === 'play') syncStage(st.room);
    },
    Math.max(a.ok ? 1900 : 1100, hold)
  );
}

// 전선 상자: 선을 누르면 한 번 더 묻는다
S.onPick = (i) => {
  if (document.body.dataset.screen !== 'play' || document.body.dataset.kind !== 'wires' || document.body.dataset.side !== 'A' || st.sending) return;
  st.sel = i;
  JK.Devices.wires.select(i);
  $('confirmText').textContent = `${i + 1}번 선을 뽑을까요?`;
  $('confirm').classList.add('on');
};
$('btnPull').onclick = () => {
  const m = myDevices(st.room, st.shownStage)[st.focus];
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
  const sec = Math.round(((room.endedAt || Date.now()) - room.startedAt) / 1000);
  const time = `${Math.floor(sec / 60)}분 ${sec % 60}초`;
  if (room.status === 'win') {
    if (document.body.dataset.view !== 'fly') S.launch(); // 새로 고침으로 바로 끝 화면에 온 경우
    $('endTitle').textContent = '탈출 성공!';
    $('endText').textContent = `${NORMAL}단계와 시간의 문까지 다 고쳤어요. 걸린 시간 ${time}, 남은 시간 에너지 ${room.energy}칸`;
  } else {
    S.setView('home');
    $('endTitle').textContent = '시간 에너지가 다 떨어졌어요';
    $('endText').textContent = (room.stage >= NORMAL ? `${NORMAL}단계를 다 고치고 시간의 문 앞까지 갔어요.` : `${room.stage}단계까지 고쳤어요.`) + ' 설명을 차근차근 주고받으면 할 수 있어요!';
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
// 게임 중 나가기: 한 번 더 묻는다
$('btnQuit').onclick = () => {
  $('quitText').textContent = st.room && st.room.n > 1 ? '나가면 게임이 멈추고, 친구들은 모이는 곳으로 돌아가요.' : '';
  $('quitAsk').classList.add('on');
};
$('quitNo').onclick = () => $('quitAsk').classList.remove('on');
$('quitYes').onclick = () => {
  $('quitAsk').classList.remove('on');
  leave();
};
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
st.STAGES = STAGES;
st.mine = () => myDevices(st.room).map((m) => ({ k: m.k, kind: m.d.kind, side: m.side, actor: m.d.actor, solved: isSolved(st.room, st.room.stage, m.k) }));
st.solution = (k) => KINDS[st.plan[st.room.stage][k].kind].solve(st.plan[st.room.stage][k].inst, st.room.energy);
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
