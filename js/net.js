// 팀 방 서버. 진짜는 Firebase Firestore(프로젝트 mathgame2-d835d, 꼬맨틀과 같은 곳),
// 주소에 ?mock 을 붙이면 이 브라우저 안에서만 도는 가짜 서버(시험용, 탭끼리 공유)를 쓴다.
//
// Firestore 모양 (규칙은 아직 게시 전 — 담임이 직접 게시)
//   tm_rooms/{방 번호 4자리}
//     status 'lobby'|'play'|'win'|'lose', at(만든·바꾼 때), host(uid)
//     players { uid: { slot 0~3, at } }, swap(역할 돌리기 수)
//     seed, level, round(0~2), energy(0~5), startedAt, endedAt
//     pulls [{ r, i, ok, at }]  조종사가 뽑은 선 (누를 때만 쓴다)

const CONFIG = {
  apiKey: 'AIzaSyCrsEzDt0fzQl-FIP2wB5cfQP2P7-Q2MgY',
  authDomain: 'mathgame2-d835d.firebaseapp.com',
  projectId: 'mathgame2-d835d',
  storageBucket: 'mathgame2-d835d.firebasestorage.app',
  messagingSenderId: '289022898801',
  appId: '1:289022898801:web:332285783342b218cc21d0',
};
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const COL = 'tm_rooms';

async function firebaseBackend() {
  const [{ initializeApp }, A, F] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
  const app = initializeApp(CONFIG);
  const auth = A.getAuth(app);
  // 학교 인터넷이 실시간 연결을 막아도 되도록 긴 폴링을 스스로 고르게 한다
  const db = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  // 시험용(?emu): 이 컴퓨터의 Firebase 에뮬레이터에 붙는다 (tools/playN.mjs emu)
  if (new URLSearchParams(location.search).has('emu')) {
    A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    F.connectFirestoreEmulator(db, '127.0.0.1', 8180);
  }
  const ref = (code) => F.doc(db, COL, code);
  return {
    mock: false,
    async signIn() {
      await auth.authStateReady();
      return auth.currentUser ? auth.currentUser.uid : (await A.signInAnonymously(auth)).user.uid;
    },
    onRoom(code, cb, onErr) {
      return F.onSnapshot(ref(code), (s) => cb(s.exists() ? s.data() : null), onErr);
    },
    async getRoom(code) {
      const s = await F.getDoc(ref(code));
      return s.exists() ? s.data() : null;
    },
    // fn(지금 문서) → 새 문서(바꿀 때) 또는 null(그대로). 둘이 동시에 눌러도 하나씩 차례로.
    tx(code, fn) {
      return F.runTransaction(db, async (t) => {
        const s = await t.get(ref(code));
        const next = fn(s.exists() ? s.data() : null);
        if (next) t.set(ref(code), next);
        return next;
      });
    },
  };
}

// 가짜 서버: localStorage 에 두고, 다른 탭의 바뀜은 storage 이벤트로 받는다
function mockBackend() {
  const K = 'tmmock:';
  const subs = new Set();
  const get = (code) => JSON.parse(localStorage.getItem(K + code) || 'null');
  const fire = () => subs.forEach((f) => f());
  addEventListener('storage', (e) => {
    if (!e.key || e.key.startsWith(K)) fire();
  });
  let uid = sessionStorage.getItem('tmmock-uid');
  if (!uid) {
    uid = 'u' + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('tmmock-uid', uid);
  }
  const lag = () => new Promise((r) => setTimeout(r, 60 + Math.random() * 120)); // 진짜 서버처럼 조금 늦게
  return {
    mock: true,
    async signIn() {
      return uid;
    },
    onRoom(code, cb) {
      let last = '';
      const f = () => {
        const s = localStorage.getItem(K + code) || 'null';
        if (s !== last) {
          last = s;
          cb(JSON.parse(s));
        }
      };
      subs.add(f);
      setTimeout(f);
      return () => subs.delete(f);
    },
    async getRoom(code) {
      await lag();
      return get(code);
    },
    async tx(code, fn) {
      await lag();
      const next = fn(get(code));
      if (next) {
        localStorage.setItem(K + code, JSON.stringify(next));
        fire();
      }
      return next;
    },
  };
}

// 미리 보기 판(window.TM_MOCK)도 가짜 서버를 쓴다
export const B = new URLSearchParams(location.search).has('mock') || window.TM_MOCK ? mockBackend() : await firebaseBackend();
