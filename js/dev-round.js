/* dev-round.js — 어림 자물쇠 (조종사 화면, 보기 'device')
 * 놋쇠 계기판: 위에 불빛 하나(색이 단서), 가운데 화면에 네 자리 수, 아래 숫자 바퀴 4개.
 * 숫자 바퀴는 화면 아래 ▲▼ 단추로 돌리고(setDigits), 맞히면 초록 빛, 틀리면 덜컹.
 */
(function () {
  'use strict';
  const JK = window.JK;
  const T = THREE;
  const TAU = Math.PI * 2;
  const LAMP_HEX = { red: '#ff4a3a', blue: '#3f8fff', yellow: '#ffd23a', green: '#3fd26a' };
  const W = 0.8,
    H = 0.5;

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
  // 계기판 화면: 어두운 유리에 주황 숫자
  function screenTex(n) {
    return canvasTex(512, 192, (g, w, h) => {
      g.fillStyle = '#1d2624';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,190,90,0.08)';
      for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
      const s = n.toLocaleString('ko-KR');
      g.font = '128px TMTitle, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = '#ffb347';
      g.shadowBlur = 24;
      g.fillStyle = '#ffd38a';
      g.fillText(s, w / 2, h / 2 + 6);
    });
  }
  // 숫자 바퀴 한 줄 (4칸, 사이에 쉼표 자리)
  function drumTex(digits) {
    return canvasTex(512, 128, (g, w, h) => {
      g.fillStyle = '#3a2a20';
      g.fillRect(0, 0, w, h);
      const cw = w / 4.6;
      digits.forEach((d, i) => {
        const x = 0.2 * cw + i * cw + (i >= 1 ? 0.4 * cw : 0);
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#cfc2a4');
        gr.addColorStop(0.5, '#fbf3df');
        gr.addColorStop(1, '#cfc2a4');
        g.fillStyle = gr;
        g.fillRect(x + 4, 6, cw - 8, h - 12);
        g.fillStyle = '#2a1d16';
        g.font = '92px TMTitle, serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(d), x + cw / 2, h / 2 + 6);
      });
      g.fillStyle = '#f3d58a';
      g.font = '80px TMTitle, serif';
      g.fillText(',', 1.2 * cw + 0.2 * cw, h / 2 + 10);
    });
  }

  let root = null;
  const Dv = (JK.Devices = JK.Devices || {});
  Dv.round = {
    view: 'device',
    build(inst) {
      this.clear();
      const S = JK.Scene;
      const P = S.P;
      root = new T.Group();
      root.position.set(0, 0.03, 0);
      root.scale.setScalar(0.72);
      S.slot.add(root);
      const b = new JK.Builder();
      b.ao(-H / 2 - 0.1, 0.25, 0.75);
      b.box(0, -0.03, -0.06, W + 0.08, H + 0.08, 0.1, P.brassDark, { front: P.brass });
      b.box(0, -H / 2 - 0.12, -0.12, W * 0.6, 0.14, 0.18, P.panelDark);
      b.ao(0, 0, 1);
      // 화면 테
      b.box(0, 0.06, -0.005, 0.66, 0.26, 0.02, P.brassDark);
      // 바퀴 틀
      b.box(0, -0.17, -0.005, 0.6, 0.15, 0.02, P.panelDark);
      // 위 불빛 받침
      b.push().t(0, H / 2 + 0.05, -0.05).rx(Math.PI / 2);
      b.cyl(0, 0, 0, 0.065, 0.06, 0.04, 20, P.brassDark, { top: P.brass });
      b.pop();
      for (const [x, y] of [[-W / 2, H / 2 - 0.03], [W / 2, H / 2 - 0.03], [-W / 2, -H / 2 - 0.03], [W / 2, -H / 2 - 0.03]]) b.ball(x, y, 0.0, 0.022, 0, P.brassDark);
      const box = new T.Mesh(b.build(), S.MATD);
      box.castShadow = box.receiveShadow = true;
      root.add(box);
      this.screen = new T.Mesh(new T.PlaneGeometry(0.62, 0.22), new T.MeshBasicMaterial({ map: screenTex(inst.n) }));
      this.screen.position.set(0, 0.06, 0.007);
      root.add(this.screen);
      this.drum = new T.Mesh(new T.PlaneGeometry(0.56, 0.12), new T.MeshBasicMaterial({ map: drumTex([0, 0, 0, 0]) }));
      this.drum.position.set(0, -0.17, 0.007);
      root.add(this.drum);
      const hex = LAMP_HEX[inst.lamp];
      this.hex = new T.Color(hex);
      this.lamp = new T.Mesh(new T.SphereGeometry(0.045, 16, 12), new T.MeshBasicMaterial({ color: hex }));
      this.lamp.position.set(0, H / 2 + 0.05, 0.0);
      this.glow = new T.Mesh(new T.PlaneGeometry(0.3, 0.3), new T.MeshBasicMaterial({ map: glowTex(hex), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      this.glow.position.set(0, H / 2 + 0.05, 0.05);
      root.add(this.lamp, this.glow);
      this.st = { shake: 0, good: 0 };
      this.digits = '';
      if (!this.hooked) {
        this.hooked = true;
        S.frameHooks.push((t) => {
          if (!root) return;
          const k = 0.75 + Math.sin(t * 3) * 0.25;
          this.glow.scale.setScalar(0.85 + k * 0.3);
          this.lamp.material.color.copy(this.hex).multiplyScalar(0.8 + k * 0.3);
          root.position.x = this.st.shake > 0 ? (Math.random() - 0.5) * this.st.shake * 0.03 : 0;
          this.st.shake = Math.max(0, this.st.shake - 0.04);
          this.screen.material.color.setScalar(1 + this.st.good * 0.6);
          this.st.good = Math.max(0, this.st.good - 0.01);
        });
      }
    },
    // 숫자 바퀴 그림 바꾸기
    setDigits(d) {
      if (!root || d.join('') === this.digits) return;
      this.digits = d.join('');
      this.drum.material.map.dispose();
      this.drum.material.map = drumTex(d);
      this.drum.material.needsUpdate = true;
    },
    react(ok) {
      if (!root) return;
      if (ok) this.st.good = 1;
      else this.st.shake = 1;
    },
    clear() {
      if (!root) return;
      root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach((m) => m.map && m.map.dispose());
      });
      root.parent.remove(root);
      root = null;
      this.digits = '';
    },
  };
  void TAU;
})();
