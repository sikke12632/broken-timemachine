/* dev-net.js — 전개도 상자 (조종사 화면, 보기 'device')
 * 조종판 가운데에 그림 6개가 그려진 상자가 떠 있다. 손가락으로 끌어 돌려 본다.
 * 면 이름: U 위(+y) D 아래 N 뒤(-z) S 앞(+z) E 오른쪽(+x) W 왼쪽(-x) — puzzles/net.js 와 같다.
 */
(function () {
  'use strict';
  const JK = window.JK;
  const T = THREE;
  const SIZE = 0.36;
  // BoxGeometry 재질 순서: +x, -x, +y, -y, +z, -z
  const ORDER = ['E', 'W', 'U', 'D', 'S', 'N'];

  function faceTex(icon) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = '#f6ecd2';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#c9a55a';
    g.lineWidth = 14;
    g.strokeRect(7, 7, 242, 242);
    JK.drawIcon(g, icon, 128, 128, 200);
    const t = new T.CanvasTexture(cv);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  let root = null,
    box = null;
  const drag = { on: false, x: 0, y: 0 };
  const Dv = (JK.Devices = JK.Devices || {});
  Dv.net = {
    view: 'device',
    build(inst) {
      this.clear();
      const S = JK.Scene;
      root = new T.Group();
      root.position.set(0, -0.02, 0.05);
      S.slot.add(root);
      // 받침 (놋쇠 원판 + 빛 고리)
      const b = new JK.Builder();
      b.cyl(0, -0.36, 0, 0.32, 0.36, 0.06, 24, S.P.brassDark, { top: S.P.brass });
      b.cyl(0, -0.42, 0, 0.2, 0.2, 0.06, 16, S.P.panelDark);
      root.add(new T.Mesh(b.build(), S.MATD));
      const halo = new T.Mesh(new T.TorusGeometry(0.3, 0.012, 6, 40), new T.MeshBasicMaterial({ color: '#ffe6a0' }));
      halo.rotation.x = Math.PI / 2;
      halo.position.y = -0.29;
      root.add(halo);
      const mats = ORDER.map((f) => new T.MeshLambertMaterial({ map: faceTex(inst.cube[f]) }));
      box = new T.Mesh(new T.BoxGeometry(SIZE, SIZE, SIZE), mats);
      box.castShadow = true;
      box.rotation.set(0.45, -0.6, 0);
      root.add(box);
      // 모서리 놋쇠 테
      const eg = new T.LineSegments(new T.EdgesGeometry(box.geometry), new T.LineBasicMaterial({ color: '#b07f2c' }));
      box.add(eg);
      this.spin = new T.Vector2(0, 0);
      if (!this.hooked) {
        this.hooked = true;
        S.frameHooks.push((t) => {
          if (!box) return;
          if (!drag.on && this.spin.lengthSq() > 1e-7) {
            this.turn(this.spin.x, this.spin.y);
            this.spin.multiplyScalar(0.9);
          }
          box.position.y = Math.sin(t * 1.4) * 0.015;
        });
        const cv = S.canvas;
        cv.addEventListener('pointerdown', (e) => {
          if (!box) return;
          drag.on = true;
          drag.x = e.clientX;
          drag.y = e.clientY;
        });
        addEventListener('pointerup', () => (drag.on = false));
        addEventListener('pointermove', (e) => {
          if (!drag.on || !box) return;
          const dx = (e.clientX - drag.x) * 0.01,
            dy = (e.clientY - drag.y) * 0.01;
          this.turn(dx, dy);
          this.spin.set(dx * 0.5, dy * 0.5);
          drag.x = e.clientX;
          drag.y = e.clientY;
        });
      }
    },
    // 화면 기준으로 돌린다(위아래로 끌면 앞으로 넘어감)
    turn(dx, dy) {
      const q = new T.Quaternion();
      q.setFromAxisAngle(new T.Vector3(0, 1, 0), dx);
      box.quaternion.premultiply(q);
      q.setFromAxisAngle(new T.Vector3(1, 0, 0), dy);
      box.quaternion.premultiply(q);
    },
    clear() {
      if (!root) return;
      root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach((m) => m.map && m.map.dispose());
      });
      root.parent.remove(root);
      root = box = null;
    },
  };
})();
