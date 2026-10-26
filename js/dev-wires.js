/* dev-wires.js — 전선 상자 (조종사 화면의 3D 장치)
 * JK.Scene.slot 위에 놋쇠 상자를 올리고, 색 전선 N개를 왼쪽 꽂개에서 오른쪽 꽂개로 늘어뜨린다.
 * 선을 누르면 고른 표시(빛)가 나고, 뽑으면 오른쪽 꽂개가 빠져나온다.
 * 정답이 아니면 불꽃이 튀고 제자리로 다시 꽂힌다.
 */
(function () {
  'use strict';
  const JK = window.JK;
  const T = THREE;
  const col = JK.col;
  const W = 0.86,
    H = 0.58; // 상자 앞면 크기
  const XL = -0.29,
    XR = 0.29;

  let S, root, wires, lamp, fx, faceTex;

  function facePanel(N, serial) {
    // 앞면 그림: 번호, 기계 번호 판 (글자는 캔버스로 또렷하게)
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = Math.round((1024 * H) / W);
    const g = cv.getContext('2d');
    const k = cv.width / W;
    g.fillStyle = '#34413f';
    g.fillRect(0, 0, cv.width, cv.height);
    // 은은한 판 무늬
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 3;
    for (let x = -cv.height; x < cv.width; x += 46) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + cv.height, cv.height);
      g.stroke();
    }
    // 기계 번호 판
    const px = cv.width / 2,
      py = 70;
    g.fillStyle = '#e9d9b0';
    roundRect(g, px - 230, py - 46, 460, 92, 18);
    g.fill();
    g.fillStyle = '#5a3a28';
    g.font = '34px TMTitle, serif';
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    g.fillText('기계 번호', px - 40, py + 2);
    g.textAlign = 'left';
    g.font = '58px TMTitle, serif';
    g.fillStyle = '#2a1d16';
    g.fillText(serial.split('').join(' '), px - 18, py + 4);
    // 선 번호
    g.font = '40px TMTitle, serif';
    g.textAlign = 'center';
    for (let i = 0; i < N; i++) {
      const y = cv.height / 2 - wireY(i, N) * k;
      g.fillStyle = '#f3e3c0';
      g.beginPath();
      g.arc(46, y, 28, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2a1d16';
      g.fillText(String(i + 1), 46, y + 2);
    }
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function wireY(i, N) {
    const top = 0.1,
      bot = -0.24;
    return N === 1 ? 0 : top + ((bot - top) * i) / (N - 1);
  }

  function curveFor(w, pull) {
    // pull 0 꽂힘 ~ 1 빠짐: 오른쪽 끝이 앞으로 나와 늘어진다
    const y = w.y;
    const R = new T.Vector3(XR + pull * 0.06, y - pull * 0.1, 0.035 + pull * 0.3);
    return new T.CatmullRomCurve3([
      new T.Vector3(XL, y, 0.035),
      new T.Vector3(XL + 0.14, y - w.sag * 0.6 + w.wob, 0.07),
      new T.Vector3(0, y - w.sag + pull * -0.04, 0.085 + pull * 0.05),
      new T.Vector3(XR - 0.14, y - w.sag * 0.6 - w.wob, 0.07 + pull * 0.12),
      R,
    ]);
  }
  function plug(color) {
    const b = new JK.Builder();
    b.push().rx(Math.PI / 2);
    b.cyl(0, -0.03, 0, 0.026, 0.026, 0.035, 10, S.P.brass, { bottom: true });
    b.cyl(0, 0.005, 0, 0.03, 0.024, 0.04, 10, color);
    b.pop();
    return b.build();
  }

  const D = (JK.Devices = JK.Devices || {});
  D.wires = {
    view: 'device',
    // inst.round: { colors: ['red',...], serial: '2391' }, hex: 색 이름 → 색
    build(inst, hex) {
      const data = inst.round || inst;
      S = JK.Scene;
      this.clear();
      root = new T.Group();
      S.slot.add(root);
      const N = data.colors.length;
      const P = S.P;
      // 상자
      const b = new JK.Builder();
      b.ao(-H / 2 - 0.1, 0.25, 0.75);
      b.box(0, -0.03, -0.06, W + 0.08, H + 0.08, 0.1, P.brassDark, { front: P.brass });
      b.box(0, -H / 2 - 0.12, -0.12, W * 0.6, 0.14, 0.18, P.panelDark);
      b.ao(0, 0, 1);
      // 꽂개 줄 (왼쪽·오른쪽)
      for (const x of [XL, XR]) b.box(x, -0.07, 0.012, 0.07, 0.44, 0.03, col('#5a3a28'));
      for (let i = 0; i < N; i++)
        for (const x of [XL, XR]) {
          b.push().t(x, wireY(i, N), 0.03).rx(Math.PI / 2);
          b.cyl(0, 0, 0, 0.03, 0.03, 0.012, 10, P.brass);
          b.pop();
        }
      // 네 모서리 나사
      for (const [x, y] of [[-W / 2, H / 2 - 0.03], [W / 2, H / 2 - 0.03], [-W / 2, -H / 2 - 0.03], [W / 2, -H / 2 - 0.03]]) b.ball(x, y, 0.0, 0.022, 0, P.brassDark);
      const box = new T.Mesh(b.build(), S.MATD);
      box.castShadow = box.receiveShadow = true;
      root.add(box);
      faceTex = facePanel(N, data.serial);
      const face = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshLambertMaterial({ map: faceTex }));
      face.position.set(0, -0.03, -0.005);
      face.receiveShadow = true;
      root.add(face);
      // 위 상태등 (빨강 깜빡 → 고치면 초록)
      lamp = new T.Mesh(new T.SphereGeometry(0.04, 12, 8), new T.MeshBasicMaterial({ color: '#ff5a4a' }));
      lamp.position.set(W / 2 - 0.02, H / 2 + 0.03, 0.01);
      root.add(lamp);
      const lb = new JK.Builder();
      lb.cyl(W / 2 - 0.02, H / 2 - 0.0, 0.01, 0.05, 0.05, 0.02, 10, P.brassDark);
      root.add(new T.Mesh(lb.build(), S.MATD));
      // 전선
      const R = JK.rng(+data.serial + N * 7);
      wires = data.colors.map((c, i) => {
        const w = { i, c, y: wireY(i, N), sag: 0.04 + R() * 0.05, wob: (R() - 0.5) * 0.04, pull: 0, target: 0, sel: false };
        w.mat = new T.MeshLambertMaterial({ color: hex[c], emissive: new T.Color(0x000000) });
        w.mesh = new T.Mesh(new T.TubeGeometry(curveFor(w, 0), 40, 0.017, 8, false), w.mat);
        w.mesh.castShadow = true;
        w.hit = new T.Mesh(new T.TubeGeometry(curveFor(w, 0), 20, 0.05, 6, false), new T.MeshBasicMaterial({ visible: false }));
        w.hit.userData.pick = i;
        const pg = plug(col(hex[c]));
        w.plugL = new T.Mesh(pg, S.MATD);
        w.plugL.position.set(XL, w.y, 0.035);
        w.plugR = new T.Mesh(pg, S.MATD);
        root.add(w.mesh, w.hit, w.plugL, w.plugR);
        return w;
      });
      this.place();
      S.pickables = wires.map((w) => w.hit);
      // 불꽃
      fx = [];
      for (let k = 0; k < 18; k++) {
        const m = new T.Mesh(new T.BoxGeometry(0.012, 0.012, 0.012), new T.MeshBasicMaterial({ color: '#ffe27a' }));
        m.visible = false;
        root.add(m);
        fx.push({ m, v: new T.Vector3(), life: 0 });
      }
      this.solved = false;
      if (!this.hooked) {
        this.hooked = true;
        S.frameHooks.push((t) => this.frame(t));
      }
    },
    clear() {
      if (!root) return;
      root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      if (faceTex) faceTex.dispose();
      root.parent.remove(root);
      root = null;
      wires = null;
      JK.Scene.pickables = [];
    },
    place() {
      for (const w of wires) {
        const c = curveFor(w, w.pull);
        w.mesh.geometry.dispose();
        w.mesh.geometry = new T.TubeGeometry(c, 40, 0.017, 8, false);
        const end = c.getPoint(1);
        w.plugR.position.copy(end);
        w.plugR.rotation.x = -w.pull * 0.9;
      }
    },
    // 시험용: i번 선 가운데의 화면 좌표
    screenOf(i) {
      S.scene.updateMatrixWorld();
      const w = wires[i];
      const p = curveFor(w, w.pull).getPoint(0.5);
      w.mesh.parent.localToWorld(p);
      p.project(S.camera);
      return { x: ((p.x + 1) / 2) * S.canvas.clientWidth, y: ((1 - p.y) / 2) * S.canvas.clientHeight };
    },
    select(i) {
      if (!wires) return;
      for (const w of wires) w.sel = w.i === i;
    },
    // 뽑기: ok 면 빠진 채로, 아니면 불꽃 + 다시 꽂힘
    pull(i, ok) {
      const w = wires && wires[i];
      if (!w) return;
      w.target = 1;
      w.sel = false;
      setTimeout(() => {
        if (!wires || wires[i] !== w) return;
        if (ok) {
          this.solved = true;
          lamp.material.color.set('#5fe08a');
          this.burst(w.plugR.position, '#9ff0b0', 18);
        } else {
          this.burst(new T.Vector3(XR, w.y, 0.05), '#ffe27a', 18);
          S.shake = 1;
          setTimeout(() => (w.target = 0), 450);
        }
      }, 380);
    },
    burst(at, color, n) {
      for (const f of fx.slice(0, n)) {
        f.life = 0.4 + Math.random() * 0.35;
        f.m.position.copy(at);
        f.m.material.color.set(color);
        f.v.set((Math.random() - 0.5) * 1.1, Math.random() * 0.9, 0.3 + Math.random() * 0.6);
        f.m.visible = true;
      }
    },
    frame(t) {
      if (!wires) return;
      let moved = false;
      for (const w of wires) {
        if (Math.abs(w.pull - w.target) > 0.001) {
          w.pull += (w.target - w.pull) * 0.22;
          if (Math.abs(w.pull - w.target) < 0.01) w.pull = w.target;
          moved = true;
        }
        w.mat.emissive.setScalar(w.sel ? 0.25 + Math.sin(t * 8) * 0.12 : 0);
      }
      if (moved) this.place();
      if (!this.solved) lamp.material.color.set(Math.sin(t * 4) > 0 ? '#ff5a4a' : '#6a2a26');
      for (const f of fx) {
        if (f.life <= 0) continue;
        f.life -= 1 / 60;
        f.v.y -= 0.05;
        f.m.position.addScaledVector(f.v, 1 / 60);
        if (f.life <= 0) f.m.visible = false;
      }
    },
  };
})();
