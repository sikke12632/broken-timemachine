/* dev-door.js — 마지막 단계 「시간의 문」 3D
 *   JK.Devices.door  (조종사, 보기 'device'): 조종판 가운데 둥근 문. 위에 불빛 하나(색이 단서).
 *                    맞히면 손잡이가 돌고 문이 열린다. 틀리면 덜컹.
 *   JK.Devices.gate  (탐험가, 보기 'window'): 창밖 시간 안개 속 큰 문. 아래 돌판 4개에 그림과 번호.
 *                    숙련이면 문 테두리가 금색 또는 은색(단서).
 */
(function () {
  'use strict';
  const JK = window.JK;
  const T = THREE;
  const col = JK.col;
  const TAU = Math.PI * 2;
  const LAMP_HEX = { red: '#ff4a3a', blue: '#3f8fff', yellow: '#ffd23a', green: '#3fd26a' };
  const METAL = { gold: ['#e8b84c', '#b98a2e'], silver: ['#d4d9df', '#9aa3ad'] };
  const Dv = (JK.Devices = JK.Devices || {});

  function dispose(g) {
    if (!g) return;
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => m.map && m.map.dispose());
    });
    if (g.parent) g.parent.remove(g);
  }
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
  // 부드러운 빛 번짐 (가운데가 밝은 동그라미)
  function glowTex(hex) {
    return canvasTex(128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2);
      gr.addColorStop(0, hex);
      gr.addColorStop(0.35, hex + '88');
      gr.addColorStop(1, hex + '00');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });
  }

  /* ================= 조종사: 조종판의 둥근 문 ================= */
  let dRoot = null;
  const R0 = 0.25;
  Dv.door = {
    view: 'device',
    build(inst) {
      this.clear();
      const S = JK.Scene;
      const P = S.P;
      dRoot = new T.Group();
      dRoot.position.set(0, -0.07, 0);
      dRoot.scale.setScalar(0.62);
      S.slot.add(dRoot);
      // 벽에 박힌 문틀 (뒤판)
      const b = new JK.Builder();
      b.push().rx(Math.PI / 2);
      b.cyl(0, -0.08, 0, R0 + 0.07, R0 + 0.07, 0.06, 40, P.brassDark, { top: P.panelDark });
      b.pop();
      S.ring(b, R0 + 0.045, 0.022, 48, 6, P.brass);
      for (let i = 0; i < 12; i++) {
        const u = (i / 12) * TAU;
        b.ball(Math.cos(u) * (R0 + 0.045), Math.sin(u) * (R0 + 0.045), 0.02, 0.014, 0, P.brassDark);
      }
      // 위 불빛 집 (둥근 놋쇠 받침)
      b.box(0, R0 + 0.05, -0.04, 0.05, 0.08, 0.03, P.brassDark);
      b.push().t(0, R0 + 0.11, -0.05).rx(Math.PI / 2);
      b.cyl(0, 0, 0, 0.075, 0.07, 0.04, 20, P.brassDark, { top: P.brass });
      b.pop();
      dRoot.add(new T.Mesh(b.build(), S.MATD));
      // 문짝: 왼쪽 경첩을 축으로 열린다
      this.hinge = new T.Group();
      this.hinge.position.set(-R0, 0, 0);
      dRoot.add(this.hinge);
      const leaf = new T.Group();
      leaf.position.set(R0, 0, 0);
      this.hinge.add(leaf);
      const lb = new JK.Builder();
      lb.push().rx(Math.PI / 2);
      lb.cyl(0, -0.03, 0, R0, R0 - 0.01, 0.05, 40, P.tealDark, { top: P.teal });
      lb.pop();
      lb.push().t(0, 0, 0.022);
      S.ring(lb, R0 - 0.02, 0.016, 40, 6, P.brass);
      S.ring(lb, R0 * 0.62, 0.008, 36, 4, P.brassDark);
      lb.pop();
      for (let i = 0; i < 8; i++) {
        const u = (i / 8) * TAU + 0.2;
        lb.ball(Math.cos(u) * (R0 - 0.05), Math.sin(u) * (R0 - 0.05), 0.025, 0.016, 0, P.brass);
      }
      // 경첩
      lb.box(-R0 + 0.01, 0.11, 0.02, 0.05, 0.05, 0.03, P.brassDark);
      lb.box(-R0 + 0.01, -0.11, 0.02, 0.05, 0.05, 0.03, P.brassDark);
      leaf.add(new T.Mesh(lb.build(), S.MATD));
      // 돌리는 손잡이(바퀴)
      this.wheel = new T.Group();
      this.wheel.position.set(0, 0, 0.04);
      leaf.add(this.wheel);
      const wb = new JK.Builder();
      S.ring(wb, 0.1, 0.012, 32, 6, P.brass);
      wb.ball(0, 0, 0.01, 0.03, 1, P.brassDark);
      for (let i = 0; i < 4; i++) {
        wb.push().rz((i / 4) * TAU);
        wb.box(0.05, 0, 0, 0.1, 0.014, 0.014, P.brassDark);
        wb.ball(0.115, 0, 0, 0.016, 0, P.red);
        wb.pop();
      }
      this.wheel.add(new T.Mesh(wb.build(), S.MATD));
      // 불빛 (단서): 색 공 + 번짐
      const hex = LAMP_HEX[inst.lamp];
      this.lamp = new T.Mesh(new T.SphereGeometry(0.052, 16, 12), new T.MeshBasicMaterial({ color: hex }));
      this.lamp.position.set(0, R0 + 0.11, 0.0);
      this.glow = new T.Mesh(new T.PlaneGeometry(0.36, 0.36), new T.MeshBasicMaterial({ map: glowTex(hex), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      this.glow.position.set(0, R0 + 0.11, 0.06);
      dRoot.add(this.lamp, this.glow);
      this.hex = col(hex);
      this.st = { open: 0, target: 0, shake: 0, spin: 0 };
      if (!this.hooked) {
        this.hooked = true;
        S.frameHooks.push((t) => this.frame(t));
      }
    },
    frame(t) {
      if (!dRoot) return;
      const s = this.st;
      s.open += (s.target - s.open) * 0.06;
      if (s.target && s.open > 0.02) s.spin += 0.12;
      this.wheel.rotation.z = s.spin + Math.sin(t * 0.7) * 0.04;
      this.hinge.rotation.y = -s.open * 1.6;
      dRoot.position.x = s.shake > 0 ? (Math.random() - 0.5) * s.shake * 0.02 : 0;
      s.shake = Math.max(0, s.shake - 0.04);
      const k = 0.75 + Math.sin(t * 3) * 0.25;
      this.glow.scale.setScalar(0.85 + k * 0.3);
      this.lamp.material.color.copy(this.hex).multiplyScalar(0.8 + k * 0.3);
    },
    // 답을 넣었다: 맞으면 열리고, 틀리면 덜컹
    react(ok) {
      if (!dRoot) return;
      if (ok) this.st.target = 1;
      else this.st.shake = 1;
    },
    clear() {
      dispose(dRoot);
      dRoot = null;
    },
  };

  /* ================= 탐험가: 창밖의 큰 문과 돌판 그림 ================= */
  const CENTER = new T.Vector3(0, 2.05, -4.4);
  let gRoot = null;
  function portalTex() {
    return canvasTex(512, 512, (g, w) => {
      const c = w / 2;
      const gr = g.createRadialGradient(c, c, 10, c, c, c);
      gr.addColorStop(0, '#fff6d8');
      gr.addColorStop(0.25, '#b8a4ff');
      gr.addColorStop(0.7, '#4a3f9a');
      gr.addColorStop(1, '#2a2460');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(c, c, c - 2, 0, TAU);
      g.fill();
      // 소용돌이 줄
      g.strokeStyle = 'rgba(255,240,200,0.35)';
      g.lineWidth = 10;
      for (let a = 0; a < 5; a++) {
        g.beginPath();
        for (let k = 0; k < 60; k++) {
          const r = 20 + k * 3.8,
            u = (a / 5) * TAU + k * 0.09;
          const x = c + Math.cos(u) * r,
            y = c + Math.sin(u) * r;
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
    });
  }
  function plaqueTex(icon, no) {
    return canvasTex(256, 256, (g, w) => {
      g.fillStyle = '#d9cbb0';
      g.fillRect(0, 0, w, w);
      // 돌 무늬
      const R = JK.rng(no * 31 + 7);
      for (let i = 0; i < 30; i++) {
        g.fillStyle = `rgba(120,100,70,${0.05 + R() * 0.08})`;
        g.beginPath();
        g.arc(R() * w, R() * w, 6 + R() * 18, 0, TAU);
        g.fill();
      }
      g.strokeStyle = '#8f7a58';
      g.lineWidth = 10;
      g.strokeRect(12, 12, w - 24, w - 24);
      JK.drawIcon(g, icon, w / 2, w / 2 + 14, 170);
      // 번호
      g.fillStyle = '#2f3b3a';
      g.beginPath();
      g.arc(46, 46, 30, 0, TAU);
      g.fill();
      g.fillStyle = '#f3d58a';
      g.font = '44px TMTitle, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(no), 46, 49);
    });
  }
  Dv.gate = {
    view: 'window',
    build(inst) {
      this.clear();
      const S = JK.Scene;
      gRoot = new T.Group();
      gRoot.position.copy(CENTER);
      S.machine.add(gRoot);
      const [m1, m2] = METAL[inst.metal].map(col);
      // 큰 고리
      const b = new JK.Builder();
      S.ring(b, 0.82, 0.09, 72, 8, m1);
      S.ring(b, 0.7, 0.03, 64, 6, m2);
      for (let i = 0; i < 12; i++) {
        const u = (i / 12) * TAU;
        b.ball(Math.cos(u) * 0.82, Math.sin(u) * 0.82, 0.07, 0.05, 0, m2);
      }
      // 꼭대기 쐐기돌, 아래 받침
      b.box(0, 0.95, 0, 0.22, 0.18, 0.16, m2, { front: m1 });
      b.box(0, -0.9, 0, 0.5, 0.12, 0.2, m2, { top: m1 });
      gRoot.add(new T.Mesh(b.build(), S.MATD));
      // 소용돌이 문 안쪽
      this.portal = new T.Mesh(new T.CircleGeometry(0.7, 48), new T.MeshBasicMaterial({ map: portalTex() }));
      this.portal.position.z = -0.02;
      gRoot.add(this.portal);
      gRoot.scale.setScalar(0.78);
      gRoot.position.y = CENTER.y + 0.42;
      // 돌판 4개 (그림 차례가 단서)
      this.plaques = new T.Group();
      this.plaques.position.copy(CENTER).add(new T.Vector3(0, -0.72, 0.5));
      S.machine.add(this.plaques);
      inst.pics.forEach((icon, i) => {
        const g = new T.Group();
        g.position.set((i - 1.5) * 0.56, 0, 0);
        // 창밖 나무·집에 가리지 않게 늘 맨 앞에 그린다
        const pb = new JK.Builder();
        pb.box(0, 0, -0.035, 0.5, 0.5, 0.06, col('#a8957a'), { front: col('#c9b796') });
        const stone = new T.Mesh(pb.build(), new T.MeshLambertMaterial({ vertexColors: true, depthTest: false }));
        stone.renderOrder = 10;
        g.add(stone);
        const face = new T.Mesh(new T.PlaneGeometry(0.44, 0.44), new T.MeshBasicMaterial({ map: plaqueTex(icon, i + 1), depthTest: false }));
        face.position.z = 0.0;
        face.renderOrder = 11;
        g.add(face);
        g.userData.ph = i * 1.3;
        this.plaques.add(g);
      });
      if (!this.hooked) {
        this.hooked = true;
        S.frameHooks.push((t) => {
          if (!gRoot) return;
          this.portal.rotation.z = -t * 0.5;
          gRoot.position.y = CENTER.y + 0.42 + Math.sin(t * 0.8) * 0.03;
          for (const g of this.plaques.children) g.position.y = Math.sin(t * 1.1 + g.userData.ph) * 0.025;
        });
      }
    },
    clear() {
      dispose(gRoot);
      dispose(this.plaques);
      gRoot = null;
      this.plaques = null;
    },
  };
})();
