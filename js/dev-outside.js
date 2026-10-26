/* dev-outside.js — 뒤 큰 창 밖에 뜨는 장치 둘 (탐험가 화면, 보기 'window')
 *   JK.Devices.stars: 별자리판. 탐험가 쪽 반만 별이 보이고, 나머지 반은 시간 안개로 가렸다.
 *   JK.Devices.era: 시간 안개 속에 떠 있는 유물 3~4개(번호만 붙음).
 */
(function () {
  'use strict';
  const JK = window.JK;
  const T = THREE;
  const CENTER = new T.Vector3(0, 2.05, -4.4); // 창 너머 가운데

  function holder() {
    const S = JK.Scene;
    const g = new T.Group();
    g.position.copy(CENTER);
    S.machine.add(g);
    return g;
  }
  function dispose(g) {
    if (!g) return;
    g.traverse((o) => {
      if (o.geometry && !o.userData.keepGeo) o.geometry.dispose();
      if (o.material && o.material.map) o.material.map.dispose();
    });
    g.parent.remove(g);
  }

  /* ================= 별자리판 ================= */
  const SZ = 6;
  function starBoard(inst) {
    const px = 1024;
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    const g = cv.getContext('2d');
    const R = px / 2;
    const grad = g.createRadialGradient(R, R * 0.8, 40, R, R, R);
    grad.addColorStop(0, '#2c3f7a');
    grad.addColorStop(1, '#141c3d');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(R, R, R - 4, 0, Math.PI * 2);
    g.fill();
    // 작은 배경 별
    const rnd = JK.rng(inst.seed);
    g.fillStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < 140; i++) {
      const a = rnd() * Math.PI * 2,
        r = Math.sqrt(rnd()) * (R - 20);
      g.fillRect(R + Math.cos(a) * r, R + Math.sin(a) * r, 2, 2);
    }
    const cell = (px * 0.72) / SZ,
      o = px * 0.14;
    const P = (r, c) => [o + (c + 0.5) * cell, o + (r + 0.5) * cell];
    // 칸 점(모든 자리) — 자리를 말로 설명하기 쉽게
    for (let r = 0; r < SZ; r++)
      for (let c = 0; c < SZ; c++) {
        const [x, y] = P(r, c);
        g.fillStyle = 'rgba(190,210,255,0.35)';
        g.beginPath();
        g.arc(x, y, 7, 0, Math.PI * 2);
        g.fill();
      }
    // 별자리 선
    g.strokeStyle = 'rgba(255,236,170,0.7)';
    g.lineWidth = 6;
    g.beginPath();
    inst.stars.forEach(([r, c], i) => {
      const [x, y] = P(r, c);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    // 별
    for (const [r, c] of inst.stars) {
      const [x, y] = P(r, c);
      const glow = g.createRadialGradient(x, y, 4, x, y, cell * 0.5);
      glow.addColorStop(0, 'rgba(255,240,170,0.9)');
      glow.addColorStop(1, 'rgba(255,240,170,0)');
      g.fillStyle = glow;
      g.fillRect(x - cell / 2, y - cell / 2, cell, cell);
      g.fillStyle = '#ffe58a';
      JK.starPath(g, x, y, cell * 0.3, 0.45);
      g.fill();
    }
    // 시간 안개: B 반쪽을 가린다
    g.save();
    g.beginPath();
    if (inst.mode === 'point') g.rect(0, o + cell * 3, px, px);
    else g.rect(o + cell * 3, 0, px, px);
    g.clip();
    g.fillStyle = 'rgba(205,200,225,0.92)';
    g.beginPath();
    g.arc(R, R, R - 4, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.25})`;
      g.beginPath();
      g.arc(rnd() * px, rnd() * px, 30 + rnd() * 70, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(80,70,110,0.75)';
    g.font = '64px TMTitle, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (inst.mode === 'point') g.fillText('시간 안개', R, o + cell * 4.5);
    else g.fillText('시간 안개', o + cell * 4.6, R);
    g.restore();
    // 대칭축 / 대칭의 중심
    g.strokeStyle = '#ff9a7a';
    g.lineWidth = 6;
    g.setLineDash([22, 16]);
    g.beginPath();
    if (inst.mode === 'point') {
      g.moveTo(o - 20, o + cell * 3);
      g.lineTo(o + cell * 6 + 20, o + cell * 3);
    } else {
      g.moveTo(o + cell * 3, o - 30);
      g.lineTo(o + cell * 3, o + cell * 6 + 30);
    }
    g.stroke();
    g.setLineDash([]);
    if (inst.mode === 'point') {
      g.fillStyle = '#ff9a7a';
      g.beginPath();
      g.arc(o + cell * 3, o + cell * 3, 16, 0, Math.PI * 2);
      g.fill();
    }
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  const Dv = (JK.Devices = JK.Devices || {});
  let sRoot = null;
  Dv.stars = {
    view: 'window',
    build(inst) {
      this.clear();
      const S = JK.Scene;
      sRoot = holder();
      const board = new T.Mesh(new T.CircleGeometry(1.3, 64), new T.MeshBasicMaterial({ map: starBoard(inst), transparent: true }));
      board.rotation.y = 0;
      sRoot.add(board);
      const b = new JK.Builder();
      S.ring(b, 1.32, 0.05, 64, 6, S.P.brass);
      for (let i = 0; i < 8; i++) {
        const u = (i / 8) * Math.PI * 2;
        b.ball(Math.cos(u) * 1.32, Math.sin(u) * 1.32, 0.05, 0.06, 0, S.P.brassDark);
      }
      const rim = new T.Mesh(b.build(), S.MATD);
      sRoot.add(rim);
      this.t0 = 0;
      if (!this.hooked) {
        this.hooked = true;
        S.frameHooks.push((t) => sRoot && (sRoot.position.y = CENTER.y + Math.sin(t * 0.8) * 0.03));
      }
    },
    clear() {
      dispose(sRoot);
      sRoot = null;
    },
  };

  /* ================= 유물 ================= */
  let eRoot = null;
  let eLabels = [];
  Dv.era = {
    view: 'window',
    build(inst) {
      this.clear();
      const S = JK.Scene;
      eRoot = holder();
      const n = inst.relics.length;
      const gap = n > 3 ? 0.78 : 0.95;
      this.items = inst.relics.map((id, i) => {
        const g = new T.Group();
        g.position.set((i - (n - 1) / 2) * gap, -0.22, 0.6);
        const m = JK.Relics.mesh(id);
        m.userData.keepGeo = true;
        m.scale.setScalar(n > 3 ? 0.62 : 0.72);
        g.add(m);
        // 시간 안개 고리
        const fog = new T.Mesh(new T.TorusGeometry(0.34, 0.05, 6, 24), new T.MeshBasicMaterial({ color: '#e9e2ff', transparent: true, opacity: 0.55 }));
        fog.rotation.x = Math.PI / 2;
        fog.position.y = -0.18;
        g.add(fog);
        eRoot.add(g);
        const el = document.createElement('div');
        el.className = 'relic-no';
        el.textContent = String(i + 1);
        document.getElementById('labels').appendChild(el);
        const L = { el, obj: g, dy: 0.95, view: 'window' };
        S.labels.push(L);
        eLabels.push(L);
        return { g, m, fog, ph: i * 1.7 };
      });
      if (!this.hooked) {
        this.hooked = true;
        S.frameHooks.push((t) => {
          if (!eRoot || !this.items) return;
          for (const it of this.items) {
            it.m.rotation.y = 0.4 + Math.sin(t * 0.5 + it.ph) * 0.6;
            it.g.position.y = -0.22 + Math.sin(t * 1.1 + it.ph) * 0.04;
            it.fog.rotation.z = t * 0.6 + it.ph;
          }
        });
      }
    },
    clear() {
      const S = JK.Scene;
      for (const L of eLabels) {
        L.el.remove();
        const k = S.labels.indexOf(L);
        if (k >= 0) S.labels.splice(k, 1);
      }
      eLabels = [];
      dispose(eRoot);
      eRoot = null;
      this.items = null;
    },
  };
})();
