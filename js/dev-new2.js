/* dev-new2.js — 나머지 장치 3개의 3D
 *   JK.Devices.bag      (탐험가, 'window'): 창밖 유리 주머니 4개(공 4개씩, 번호) + 가운데 깃발(색이 단서)
 *   JK.Devices.shadow   (탐험가, 'window'): 창밖 돌벽에 비친 그림자 조각(모눈 위)
 *   JK.Devices.timeline (조종사, 'device'): 조종판 위 나무 받침에 사건 카드 4~5장(번호)
 */
(function () {
  'use strict';
  const JK = window.JK;
  const T = THREE;
  const TAU = Math.PI * 2;
  const CENTER = new T.Vector3(0, 2.05, -4.4); // 창 너머 가운데
  const BALL_HEX = { red: '#e0483a', blue: '#3f7fd0', yellow: '#f2c230' };
  const FLAG_HEX = { red: '#d9473a', blue: '#3f7fd0', green: '#46a659' };
  const Dv = (JK.Devices = JK.Devices || {});

  function canvasTex(w, h, draw) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new T.CanvasTexture(cv);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function dispose(g) {
    if (!g) return;
    g.traverse((o) => {
      if (o.geometry && !o.userData.keepGeo) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => m.map && m.map.dispose());
    });
    if (g.parent) g.parent.remove(g);
  }
  // 창밖 장치의 번호표(시대 다이얼 유물 번호와 같은 모양)
  function numberLabels(S, objs, dy) {
    return objs.map((obj, i) => {
      const el = document.createElement('div');
      el.className = 'relic-no';
      el.textContent = String(i + 1);
      document.getElementById('labels').appendChild(el);
      const L = { el, obj, dy, view: 'window' };
      S.labels.push(L);
      return L;
    });
  }
  function dropLabels(S, labels) {
    for (const L of labels || []) {
      L.el.remove();
      const k = S.labels.indexOf(L);
      if (k >= 0) S.labels.splice(k, 1);
    }
  }

  /* ================= 가능성 주머니 ================= */
  let bRoot = null;
  const JAR_Y = -0.12; // 아래 안내 칸에 가리지 않는 높이
  Dv.bag = {
    view: 'window',
    build(inst) {
      this.clear();
      const S = JK.Scene;
      bRoot = new T.Group();
      bRoot.position.copy(CENTER).add(new T.Vector3(0, 0, 0.5));
      S.machine.add(bRoot);
      const glass = new T.MeshLambertMaterial({ color: '#dff3ff', transparent: true, opacity: 0.32, depthWrite: false, side: T.DoubleSide });
      const ballGeo = new T.SphereGeometry(0.085, 14, 10);
      this.jars = inst.bags.map((balls, i) => {
        const g = new T.Group();
        g.position.set((i - 1.5) * 0.62, JAR_Y, 0);
        const b = new JK.Builder();
        b.cyl(0, -0.27, 0, 0.2, 0.2, 0.04, 20, S.P.brassDark, { top: S.P.brass });
        b.cyl(0, 0.2, 0, 0.13, 0.15, 0.08, 20, S.P.brass, { top: S.P.brassDark });
        b.cyl(0, 0.27, 0, 0.17, 0.17, 0.03, 20, S.P.copper);
        g.add(new T.Mesh(b.build(), S.MATD));
        const jar = new T.Mesh(new T.CylinderGeometry(0.19, 0.19, 0.46, 24, 1, true), glass);
        jar.position.y = -0.02;
        jar.renderOrder = 2;
        g.add(jar);
        // 공 4개: 아래 둘, 위 둘
        balls.forEach((c, k) => {
          const m = new T.Mesh(ballGeo, new T.MeshLambertMaterial({ color: BALL_HEX[c] }));
          m.userData.keepGeo = true;
          m.position.set(k % 2 ? 0.075 : -0.075, -0.17 + Math.floor(k / 2) * 0.17, (k % 2 ? -0.02 : 0.02) * (k < 2 ? 1 : -1));
          g.add(m);
        });
        bRoot.add(g);
        return { g, ph: i * 1.3 };
      });
      // 가운데 깃발
      const fb = new JK.Builder();
      fb.cyl(0, 0.0, -0.3, 0.025, 0.02, 1.05, 10, S.P.brassDark);
      fb.ball(0, 1.07, -0.3, 0.045, 1, S.P.brass);
      bRoot.add(new T.Mesh(fb.build(), S.MATD));
      const fg = new T.BufferGeometry();
      this.flagGeo = fg;
      this.flagMesh = new T.Mesh(fg, new T.MeshLambertMaterial({ color: FLAG_HEX[inst.flag], side: T.DoubleSide }));
      this.flagMesh.position.set(0.02, 1.0, -0.3);
      bRoot.add(this.flagMesh);
      this.waveFlag(0);
      this.labels = numberLabels(S, this.jars.map((j) => j.g), 0.5);
      if (!this.hooked) {
        this.hooked = true;
        S.frameHooks.push((t) => {
          if (!bRoot) return;
          for (const j of this.jars) j.g.position.y = JAR_Y + Math.sin(t * 1.1 + j.ph) * 0.02;
          this.waveFlag(t);
        });
      }
    },
    // 펄럭이는 세모 깃발
    waveFlag(t) {
      const W = 0.5,
        H = 0.3,
        n = 8;
      const pos = [];
      for (let i = 0; i < n; i++) {
        const u0 = i / n,
          u1 = (i + 1) / n;
        const z = (u) => Math.sin(t * 4 - u * 5) * 0.04 * u;
        const h0 = H * (1 - u0),
          h1 = H * (1 - u1);
        const a = [u0 * W, -h0 / 2, z(u0)],
          b = [u1 * W, -h1 / 2, z(u1)],
          c = [u1 * W, h1 / 2, z(u1)],
          d = [u0 * W, h0 / 2, z(u0)];
        pos.push(...a, ...b, ...c, ...a, ...c, ...d);
      }
      this.flagGeo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      this.flagGeo.computeVertexNormals();
    },
    clear() {
      const S = JK.Scene;
      dropLabels(S, this.labels);
      this.labels = null;
      dispose(bRoot);
      bRoot = null;
    },
  };

  /* ================= 그림자 맞추기 ================= */
  let sRoot = null;
  function wallTex(cells) {
    return canvasTex(512, 512, (g, w) => {
      g.fillStyle = '#e8dcc2';
      g.fillRect(0, 0, w, w);
      // 돌 무늬
      const R = JK.rng(cells.length * 17 + 3);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(150,120,80,${0.04 + R() * 0.06})`;
        g.beginPath();
        g.arc(R() * w, R() * w, 10 + R() * 30, 0, TAU);
        g.fill();
      }
      // 등불 빛
      const gr = g.createRadialGradient(w / 2, 40, 10, w / 2, 200, 420);
      gr.addColorStop(0, 'rgba(255,230,150,0.5)');
      gr.addColorStop(1, 'rgba(255,230,150,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
      // 모눈
      const n = 4,
        cs = 96,
        o = (w - n * cs) / 2;
      g.strokeStyle = 'rgba(120,95,60,0.35)';
      g.lineWidth = 3;
      for (let i = 0; i <= n; i++) {
        g.beginPath();
        g.moveTo(o + i * cs, o);
        g.lineTo(o + i * cs, o + n * cs);
        g.moveTo(o, o + i * cs);
        g.lineTo(o + n * cs, o + i * cs);
        g.stroke();
      }
      // 그림자 (살짝 흐리게)
      const wd = Math.max(...cells.map((c) => c[0])) + 1,
        ht = Math.max(...cells.map((c) => c[1])) + 1;
      const ox = o + ((n - wd) * cs) / 2,
        oy = o + ((n - ht) * cs) / 2;
      g.save();
      g.filter = 'blur(2px)';
      g.fillStyle = 'rgba(40,34,60,0.82)';
      for (const [x, y] of cells) g.fillRect(ox + x * cs, oy + y * cs, cs + 1, cs + 1);
      g.restore();
    });
  }
  Dv.shadow = {
    view: 'window',
    build(inst) {
      this.clear();
      const S = JK.Scene;
      sRoot = new T.Group();
      sRoot.position.copy(CENTER).add(new T.Vector3(0, 0.18, 0));
      S.machine.add(sRoot);
      const b = new JK.Builder();
      b.box(0, 0, -0.08, 1.78, 1.78, 0.12, JK.col('#a8957a'), { front: JK.col('#c9b796') });
      b.box(0, 1.0, 0, 0.12, 0.2, 0.1, S.P.brassDark);
      b.ball(0, 0.92, 0.1, 0.07, 1, JK.col('#ffe6a0'));
      sRoot.add(new T.Mesh(b.build(), S.MATD));
      const wall = new T.Mesh(new T.PlaneGeometry(1.6, 1.6), new T.MeshBasicMaterial({ map: wallTex(inst.piece) }));
      wall.position.z = -0.015;
      sRoot.add(wall);
      if (!this.hooked) {
        this.hooked = true;
        S.frameHooks.push((t) => sRoot && (sRoot.position.y = CENTER.y + 0.18 + Math.sin(t * 0.8) * 0.02));
      }
    },
    clear() {
      dispose(sRoot);
      sRoot = null;
    },
  };

  /* ================= 연표 카드 ================= */
  let tRoot = null;
  function wrap(g, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (g.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function cardTex(no, name) {
    return canvasTex(256, 352, (g, w, h) => {
      g.fillStyle = '#fbf3df';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c9a55a';
      g.lineWidth = 10;
      g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#2f3b3a';
      g.beginPath();
      g.arc(w / 2, 58, 36, 0, TAU);
      g.fill();
      g.fillStyle = '#f3d58a';
      g.font = '50px TMTitle, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(no), w / 2, 61);
      g.fillStyle = '#2a1d16';
      g.font = '42px TMTitle, serif';
      const lines = wrap(g, name, w - 28);
      const y0 = 112 + (230 - lines.length * 52) / 2;
      lines.forEach((l, i) => g.fillText(l, w / 2, y0 + i * 52 + 24));
    });
  }
  Dv.timeline = {
    view: 'device',
    build(inst) {
      this.clear();
      const S = JK.Scene;
      const P = S.P;
      tRoot = new T.Group();
      tRoot.position.set(0, 0.02, 0);
      S.slot.add(tRoot);
      const n = inst.cards.length;
      const cw = n > 4 ? 0.2 : 0.23,
        ch = cw * 1.375,
        gap = 0.02;
      const W = n * cw + (n - 1) * gap + 0.1;
      const b = new JK.Builder();
      b.box(0, -0.02, -0.06, W, ch + 0.16, 0.06, P.panelDark, { front: P.panel });
      b.box(0, -ch / 2 - 0.12, -0.04, W + 0.04, 0.05, 0.12, P.brassDark, { top: P.brass });
      b.box(0, -ch / 2 - 0.22, -0.12, W * 0.5, 0.14, 0.14, P.panelDark);
      tRoot.add(new T.Mesh(b.build(), S.MATD));
      this.cards = inst.cards.map((id, i) => {
        const name = JK.TL_NAME ? JK.TL_NAME[id] : id;
        const m = new T.Mesh(new T.PlaneGeometry(cw, ch), new T.MeshBasicMaterial({ map: cardTex(i + 1, name) }));
        m.position.set(-W / 2 + 0.05 + cw / 2 + i * (cw + gap), -0.02, -0.025);
        m.rotation.z = (((i * 37) % 7) - 3) * 0.012;
        tRoot.add(m);
        return m;
      });
    },
    clear() {
      dispose(tRoot);
      tRoot = null;
    },
  };
})();
