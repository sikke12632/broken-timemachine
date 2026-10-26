/* dev-flash.js — 깜빡이 단추 (탐험가 화면, 보기 'window')
 * 창밖 시간 안개 속 놋쇠 고리에 수정 4개(위 빨강, 오른쪽 파랑, 아래 노랑, 왼쪽 초록).
 * 가운데 하얀 불이 반짝(= 처음부터) → 수정이 차례로 깜빡 → 잠깐 쉬고 다시. 계속 되풀이한다.
 */
(function () {
  'use strict';
  const JK = window.JK;
  const T = THREE;
  const TAU = Math.PI * 2;
  const CENTER = new T.Vector3(0, 2.05, -4.4);
  const HEX = { red: '#ff4a3a', blue: '#3f8fff', yellow: '#ffd23a', green: '#3fd26a' };
  const AT = { red: [0, 0.66], blue: [0.8, 0], yellow: [0, -0.66], green: [-0.8, 0] };
  const LIFT = 0.28; // 아래 안내 칸에 가리지 않게 조금 위로
  const ON = 0.6,
    GAP = 0.28,
    REST = 1.6,
    START = 0.7; // 초

  function glowTex(hex) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, hex);
    gr.addColorStop(0.35, hex + '88');
    gr.addColorStop(1, hex + '00');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const t = new T.CanvasTexture(cv);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }

  let root = null;
  const Dv = (JK.Devices = JK.Devices || {});
  Dv.flash = {
    view: 'window',
    build(inst) {
      this.clear();
      const S = JK.Scene;
      root = new T.Group();
      root.position.copy(CENTER);
      S.machine.add(root);
      // 놋쇠 고리와 받침살
      const b = new JK.Builder();
      S.ring(b, 0.8, 0.05, 64, 6, S.P.brass);
      for (const c of Object.keys(AT)) {
        const [x, y] = AT[c];
        b.cylAB([0, 0, -0.02], [x * 0.86, y * 0.86, -0.02], 0.02, 0.02, 8, S.P.brassDark);
        b.cyl(x, y - 0.0, -0.06, 0.16, 0.16, 0.05, 16, S.P.brassDark);
      }
      b.ball(0, 0, 0, 0.12, 1, S.P.brassDark);
      root.add(new T.Mesh(b.build(), S.MATD));
      this.gems = {};
      for (const c of Object.keys(AT)) {
        const [x, y] = AT[c];
        const m = new T.Mesh(new T.OctahedronGeometry(0.17, 0), new T.MeshLambertMaterial({ color: HEX[c], emissive: new T.Color(0x000000), flatShading: true }));
        m.position.set(x, y, 0.06);
        m.scale.set(1, 1.25, 0.7);
        const glow = new T.Mesh(new T.PlaneGeometry(0.9, 0.9), new T.MeshBasicMaterial({ map: glowTex(HEX[c]), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
        glow.position.set(x, y, 0.12);
        root.add(m, glow);
        this.gems[c] = { m, glow, base: new T.Color(HEX[c]) };
      }
      // 가운데 하얀 "처음" 불
      this.core = new T.Mesh(new T.SphereGeometry(0.08, 14, 10), new T.MeshBasicMaterial({ color: '#ffffff' }));
      this.core.position.z = 0.1;
      this.coreGlow = new T.Mesh(new T.PlaneGeometry(0.7, 0.7), new T.MeshBasicMaterial({ map: glowTex('#ffffff'), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      this.coreGlow.position.z = 0.14;
      root.add(this.core, this.coreGlow);
      this.seq = inst.seq.slice();
      this.t0 = -1;
      if (!this.hooked) {
        this.hooked = true;
        S.frameHooks.push((t) => this.frame(t));
      }
    },
    // 지금 몇 번째 깜빡임인지(-1: 처음 불, -2: 쉼)
    frame(t) {
      if (!root) return;
      if (this.t0 < 0) this.t0 = t;
      const cycle = START + this.seq.length * (ON + GAP) + REST;
      const k = (t - this.t0) % cycle;
      let on = null,
        f = 0;
      const startOn = k < START * 0.6;
      if (k >= START && k < START + this.seq.length * (ON + GAP)) {
        const j = Math.floor((k - START) / (ON + GAP));
        const in1 = (k - START) - j * (ON + GAP);
        if (in1 < ON) {
          on = this.seq[j];
          f = Math.sin((in1 / ON) * Math.PI);
        }
      }
      for (const c of Object.keys(this.gems)) {
        const G = this.gems[c];
        const lit = c === on ? f : 0;
        G.m.material.color.copy(G.base).multiplyScalar(0.45 + lit * 0.4);
        G.m.material.emissive.copy(G.base).multiplyScalar(lit * 0.9);
        G.m.scale.set(1 + lit * 0.25, 1.25 + lit * 0.3, 0.7);
        G.m.rotation.y = t * 0.6;
        G.glow.material.opacity = lit;
        G.glow.visible = lit > 0.02;
      }
      const s = startOn ? Math.sin((k / (START * 0.6)) * Math.PI) : 0;
      this.core.material.color.setScalar(0.35 + s * 0.65);
      this.coreGlow.material.opacity = s;
      this.coreGlow.visible = s > 0.02;
      root.position.y = CENTER.y + LIFT + Math.sin(t * 0.8) * 0.02;
    },
    clear() {
      if (!root) return;
      root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach((m) => m.map && m.map.dispose());
      });
      root.parent.remove(root);
      root = null;
    },
  };
  void TAU;
})();
