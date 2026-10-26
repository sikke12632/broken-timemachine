/* scene.js — 「고장 난 타임머신」 3D 장면 (mockup/js/scene.js 시안에서 자람)
 * 조선의 왕 엔진(toy.js·props.js·조선 모형)을 그대로 쓰고, 타임머신·인형·섬만 새로 쌓는다.
 * 보기: home(불시착) | lobby(우리 팀 무대) | device(조종판 장치 앞) | reader(기록관 구석)
 * 장치는 조종판 가운데 자리(S.slot)에 js/dev-*.js 가 올린다.
 */
(function () {
  'use strict';
  const JK = window.JK;
  const T = THREE;
  const col = JK.col;
  const M = JK.eraModels;
  const TAU = Math.PI * 2;
  const F = 0.75; // 조종실 바닥 높이

  const MATD = JK.toyMaterial({ side: T.DoubleSide });
  const GLOW = new T.MeshBasicMaterial({ vertexColors: true });

  const P = {
    teal: col('#3f8f8a'),
    tealDark: col('#2f6f6c'),
    brass: col('#e0ab48'),
    brassDark: col('#b07f2c'),
    copper: col('#c77443'),
    cream: col('#f3e5c8'),
    creamDark: col('#e6d2ac'),
    panel: col('#b47c50'),
    panelDark: col('#8a5a38'),
    plank: col('#cf955f'),
    plank2: col('#bf8452'),
    slate: col('#3c4a4b'),
    red: col('#d24f3e'),
    yellow: col('#f2c14e'),
    blue: col('#4f8fd0'),
    green: col('#5fb06a'),
    white: col('#fbf6ea'),
    ink: col('#2a1d16'),
  };

  /* ================= 작은 도구 ================= */
  // 옆으로 도는 회전체의 일부(a0~a1). 조각마다 색과 빼기를 고를 수 있다.
  function arcShell(b, prof, a0, a1, seg, colorFn, skipFn) {
    for (let j = 0; j < prof.length - 1; j++) {
      const [r0, y0] = prof[j],
        [r1, y1] = prof[j + 1];
      for (let i = 0; i < seg; i++) {
        const u0 = a0 + ((a1 - a0) * i) / seg,
          u1 = a0 + ((a1 - a0) * (i + 1)) / seg;
        const p00 = [Math.cos(u0) * r0, y0, Math.sin(u0) * r0],
          p01 = [Math.cos(u1) * r0, y0, Math.sin(u1) * r0],
          p10 = [Math.cos(u0) * r1, y1, Math.sin(u0) * r1],
          p11 = [Math.cos(u1) * r1, y1, Math.sin(u1) * r1];
        const um = (u0 + u1) / 2,
          rm = (r0 + r1) / 2,
          ym = (y0 + y1) / 2;
        const c = [Math.cos(um) * rm, ym, Math.sin(um) * rm];
        if (skipFn && skipFn(c)) continue;
        b.quad(p01, p00, p10, p11, colorFn(c, um, i, j));
      }
    }
  }
  // 고리(도넛): 지금 좌표의 z축이 고리 축
  function ring(b, R, rr, seg, seg2, color) {
    const P3 = (u, v) => [(R + rr * Math.cos(v)) * Math.cos(u), (R + rr * Math.cos(v)) * Math.sin(u), rr * Math.sin(v)];
    for (let i = 0; i < seg; i++)
      for (let j = 0; j < seg2; j++) {
        const u0 = (i / seg) * TAU,
          u1 = ((i + 1) / seg) * TAU,
          v0 = (j / seg2) * TAU,
          v1 = ((j + 1) / seg2) * TAU;
        b.quad(P3(u0, v0), P3(u1, v0), P3(u1, v1), P3(u0, v1), color);
      }
  }
  // 대롱: z0~z1, 반지름 R (z축)
  function tube(b, R, z0, z1, seg, color) {
    for (let i = 0; i < seg; i++) {
      const u0 = (i / seg) * TAU,
        u1 = ((i + 1) / seg) * TAU;
      const a = [Math.cos(u0) * R, Math.sin(u0) * R],
        c = [Math.cos(u1) * R, Math.sin(u1) * R];
      b.quad([a[0], a[1], z0], [c[0], c[1], z0], [c[0], c[1], z1], [a[0], a[1], z1], color);
    }
  }
  // 원판 (z축을 보는 납작한 원). colors가 배열이면 부채꼴마다 색
  function disc(b, R, z, seg, colors) {
    for (let i = 0; i < seg; i++) {
      const u0 = (i / seg) * TAU,
        u1 = ((i + 1) / seg) * TAU;
      const c = Array.isArray(colors) ? colors[Math.floor((i / seg) * colors.length)] : colors;
      b.tri([0, 0, z], [Math.cos(u0) * R, Math.sin(u0) * R, z], [Math.cos(u1) * R, Math.sin(u1) * R, z], c);
    }
  }
  // 공의 일부만(머리카락·모자 둥근 부분). keep(법선)이 참인 삼각형만
  function partBall(b, cx, cy, cz, r, detail, color, keep, sy) {
    const g = new T.IcosahedronGeometry(1, detail);
    const p = g.attributes.position;
    const s = sy || 1;
    for (let i = 0; i < p.count; i += 3) {
      const v = [0, 1, 2].map((k) => [p.getX(i + k), p.getY(i + k), p.getZ(i + k)]);
      const n = [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3, (v[0][2] + v[1][2] + v[2][2]) / 3];
      const l = Math.hypot(n[0], n[1], n[2]);
      if (!keep([n[0] / l, n[1] / l, n[2] / l])) continue;
      const q = v.map((a) => [cx + a[0] * r, cy + a[1] * r * s, cz + a[2] * r]);
      b.tri(q[0], q[1], q[2], color);
    }
    g.dispose();
  }
  // 톱니바퀴 (y축이 바퀴 축)
  function gear(b, R, h, teeth, color, top) {
    b.cyl(0, 0, 0, R, R, h, teeth * 2, color, { top: top || color, bottom: true });
    for (let i = 0; i < teeth; i++) {
      b.push().ry((i / teeth) * TAU).t(0, h / 2, R + R * 0.08);
      b.box(0, 0, 0, R * 0.2, h, R * 0.2, color, { top: top || color });
      b.pop();
    }
    b.cyl(0, h, 0, R * 0.25, R * 0.25, 0.01, 8, P.brassDark);
  }
  // 둥근 벽 위의 자리: 로컬 +z가 가운데를 본다
  function at(b, phi, r, y) {
    const x = Math.cos(phi) * r,
      z = Math.sin(phi) * r;
    return b.push().t(x, y || 0, z).ry(Math.atan2(-x, -z));
  }
  const deg = (d) => (d * Math.PI) / 180;
  // Builder의 지금 좌표를 그대로 갖는 빈 물체 (움직이는 바늘 등을 붙인다)
  function anchor(b, parent) {
    const o = new T.Object3D();
    b.m.decompose(o.position, o.quaternion, o.scale);
    parent.add(o);
    return o;
  }
  function mesh(geo, mat, cast, recv) {
    const m = new T.Mesh(geo, mat || MATD);
    m.castShadow = cast !== false;
    m.receiveShadow = recv !== false;
    return m;
  }

  /* ================= 타임머신 ================= */
  const CUT0 = deg(25),
    CUT1 = deg(155); // 앞쪽 잘라 낸 곳(인형의 집처럼 속이 보인다)
  const WIN = { y: 1.98, r: 0.6 }; // 뒤쪽 큰 창
  const SIDE_PORTS = [
    { phi: deg(-12), y: 2.3, r: 0.3 },
    { phi: deg(192), y: 2.25, r: 0.3 },
  ];

  function shellProfile() {
    const out = [];
    const N = 48;
    for (let k = 0; k <= N; k++) {
      const t = -Math.PI / 2 + (Math.PI * k) / N;
      const s = Math.sin(t),
        c = Math.cos(t);
      const r = 1.95 * Math.pow(Math.max(c, 0), 0.72);
      const y = 1.55 + (s < 0 ? 1.2 * s : 2.3 * s);
      out.push([r, y]);
    }
    out[0][0] = 0;
    out[N][0] = 0;
    return out;
  }
  function offsetProfile(prof, d) {
    return prof.map((p, j) => {
      const a = prof[Math.max(0, j - 1)],
        c = prof[Math.min(prof.length - 1, j + 1)];
      const tr = c[0] - a[0],
        ty = c[1] - a[1];
      const l = Math.hypot(tr, ty) || 1;
      return [Math.max(0, p[0] - (ty / l) * d), p[1] + (tr / l) * d];
    });
  }
  function rAt(prof, y) {
    for (let j = 0; j < prof.length - 1; j++) {
      const [r0, y0] = prof[j],
        [r1, y1] = prof[j + 1];
      if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
    }
    return 0;
  }

  function buildMachine(root, anim) {
    const outer = shellProfile();
    const inner = offsetProfile(outer, 0.1);
    const a0 = CUT1,
      a1 = CUT0 + TAU;
    const seg = 76;
    const inWin = (c, pad) => c[2] < 0 && Math.hypot(c[0], c[1] - WIN.y) < WIN.r + (pad || 0);
    const inSide = (c) =>
      SIDE_PORTS.some((s) => {
        const R = rAt(outer, s.y);
        return Math.hypot(c[0] - Math.cos(s.phi) * R, c[1] - s.y, c[2] - Math.sin(s.phi) * R) < s.r;
      });

    /* --- 껍데기 --- */
    const b = new JK.Builder();
    b.ao(0.3, 1.6, 0.72);
    arcShell(
      b,
      outer,
      a0,
      a1,
      seg,
      (c, u) => {
        const y = c[1];
        if (Math.abs(y - 1.55) < 0.1) return P.brass;
        if (y > 3.45) return P.copper;
        if (y < 0.9) return P.tealDark;
        // 세로 판자 이음매
        const k = ((u / deg(30)) % 1 + 1) % 1;
        return k < 0.05 ? P.tealDark : P.teal;
      },
      (c) => inWin(c) || inSide(c)
    );
    b.ao(0, 0, 1);
    arcShell(
      b,
      inner,
      a0,
      a1,
      seg,
      (c, u) => {
        const y = c[1];
        if (y < F) return P.panelDark;
        if (y < 1.38) return Math.abs(y - 1.33) < 0.05 ? P.panelDark : P.panel;
        const k = ((u / deg(30)) % 1 + 1) % 1;
        if (y > 2.0 && k < 0.06) return P.brassDark; // 천장 갈빗대
        return y > 3.2 ? P.creamDark : P.cream;
      },
      (c) => inWin(c) || inSide(c)
    );
    // 잘린 단면 (놋쇠 테두리)
    for (const a of [a0, a1]) {
      for (let j = 0; j < outer.length - 1; j++) {
        const o0 = outer[j],
          o1 = outer[j + 1],
          i0 = inner[j],
          i1 = inner[j + 1];
        const pt = (p) => [Math.cos(a) * p[0], p[1], Math.sin(a) * p[0]];
        b.quad(pt(o0), pt(o1), pt(i1), pt(i0), P.brass);
      }
    }
    // 바깥 띠와 리벳
    for (const y of [1.55, 0.92]) {
      const r = rAt(outer, y);
      for (let i = 0; i <= 40; i++) {
        const u = a0 + ((a1 - a0) * i) / 40;
        b.ball(Math.cos(u) * (r + 0.03), y, Math.sin(u) * (r + 0.03), 0.035, 0, P.brassDark);
      }
    }
    // 바닥 (나무 널빤지 + 둥근 깔개)
    const fr = rAt(inner, F) + 0.02;
    const NS = 40;
    for (let i = 0; i < NS; i++) {
      const u0 = (i / NS) * TAU,
        u1 = ((i + 1) / NS) * TAU;
      for (let k = 0; k < 4; k++) {
        const ra = (fr * k) / 4,
          rb = (fr * (k + 1)) / 4;
        const c = k % 2 ? P.plank : P.plank2;
        const q = (r, u) => [Math.cos(u) * r, F, Math.sin(u) * r];
        if (k === 0) b.tri([0, F, 0], q(rb, u1), q(rb, u0), c);
        else b.quad(q(ra, u0), q(ra, u1), q(rb, u1), q(rb, u0), c);
      }
    }
    b.push().t(0, F + 0.005, 0.15).rx(-Math.PI / 2);
    disc(b, 0.95, 0, 32, P.red);
    disc(b, 0.8, 0.003, 32, col('#e9b45a'));
    disc(b, 0.72, 0.006, 32, P.red);
    b.pop();
    // 바닥 앞 테두리(잘린 곳)
    b.cyl(0, F - 0.12, 0, fr, fr, 0.12, 40, P.brassDark, { noTop: true });
    // 다리 셋
    for (const phi of [deg(30), deg(150), deg(270)]) {
      const c = Math.cos(phi),
        s = Math.sin(phi);
      b.cylAB([c * 1.25, 0.55, s * 1.25], [c * 1.95, 0.04, s * 1.95], 0.07, 0.06, 7, P.brassDark);
      b.cyl(c * 1.95, 0, s * 1.95, 0.2, 0.17, 0.07, 10, P.brass);
    }
    // 앞 사다리
    for (const x of [-0.22, 0.22]) b.cylAB([x, F, fr - 0.05], [x, 0.0, fr + 0.75], 0.03, 0.03, 5, P.panelDark);
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      b.box(0, F * (1 - t), fr - 0.05 + 0.8 * t, 0.44, 0.03, 0.08, P.panel);
    }

    /* --- 뒤 큰 창 --- */
    const zo = -rAt(outer, WIN.y);
    b.push().t(0, WIN.y, 0);
    b.push().t(0, 0, zo - 0.02);
    ring(b, WIN.r + 0.05, 0.08, 32, 6, P.brass);
    for (let i = 0; i < 12; i++) {
      const u = (i / 12) * TAU;
      b.ball(Math.cos(u) * (WIN.r + 0.05), Math.sin(u) * (WIN.r + 0.05), 0.1, 0.03, 0, P.brassDark);
    }
    b.pop();
    b.push().t(0, 0, zo + 0.18);
    ring(b, WIN.r + 0.04, 0.07, 32, 6, P.brass);
    b.pop();
    tube(b, WIN.r, zo - 0.08, zo + 0.25, 32, P.brassDark);
    b.pop();
    /* --- 옆 둥근 창(빛나는 유리) --- */
    const gb = new JK.Builder();
    for (const s of SIDE_PORTS) {
      const R = rAt(outer, s.y);
      const x = Math.cos(s.phi) * R,
        z = Math.sin(s.phi) * R;
      b.push().t(x, s.y, z).ry(Math.atan2(x, z));
      ring(b, s.r + 0.03, 0.06, 24, 5, P.brass);
      b.push().t(0, 0, -0.16);
      ring(b, s.r + 0.02, 0.05, 24, 5, P.brass);
      b.pop();
      tube(b, s.r, -0.2, 0.04, 24, P.brassDark);
      b.pop();
      gb.push().t(x, s.y, z).ry(Math.atan2(x, z));
      disc(gb, s.r, -0.06, 20, col('#ffe2a0'));
      gb.pop();
    }

    /* --- 꼭대기: 톱니 왕관 + 시간 수정 + 안테나 --- */
    const top = outer[outer.length - 1][1];
    b.push().t(0, top - 0.12, 0);
    gear(b, 0.5, 0.18, 12, P.brass);
    for (let i = 0; i < 4; i++) {
      const u = (i / 4) * TAU + 0.4;
      b.cylAB([Math.cos(u) * 0.32, 0.18, Math.sin(u) * 0.32], [Math.cos(u) * 0.2, 0.85, Math.sin(u) * 0.2], 0.025, 0.025, 5, P.brassDark);
    }
    b.cyl(0, 0.85, 0, 0.28, 0.1, 0.12, 10, P.copper);
    b.cylAB([0.12, 0.95, 0], [0.22, 1.7, 0.05], 0.018, 0.012, 4, P.ink);
    b.pop();
    // 부러진 굴뚝(연기가 나온다)
    const pipeA = [Math.cos(deg(-30)) * 1.2, 3.35, Math.sin(deg(-30)) * 1.2];
    const pipeB = [Math.cos(deg(-30)) * 1.65, 3.75, Math.sin(deg(-30)) * 1.65];
    const pipeC = [Math.cos(deg(-38)) * 1.9, 3.95, Math.sin(deg(-38)) * 1.9];
    b.cylAB(pipeA, pipeB, 0.12, 0.12, 8, P.copper);
    b.cylAB(pipeB, pipeC, 0.12, 0.1, 8, P.copper);
    b.ball(pipeB[0], pipeB[1], pipeB[2], 0.13, 0, P.brassDark);
    anim.smokeAt = new T.Vector3(...pipeC);

    // 시간 수정 (빛)
    const crystal = new JK.Builder();
    crystal.ball(0, 0, 0, 0.2, 0, col('#ffd36a'), 1.6);
    const cry = mesh(crystal.build(), GLOW, false, false);
    cry.position.set(0, top - 0.12 + 0.5, 0);
    root.add(cry);
    anim.crystal = cry;
    // 안테나 전구 (깜빡임)
    const bulb = mesh(new T.IcosahedronGeometry(0.07, 1), new T.MeshBasicMaterial({ color: '#ff5a4a' }), false, false);
    bulb.position.set(0.22, top - 0.12 + 1.72, 0.05);
    root.add(bulb);
    anim.bulb = bulb;

    /* ================= 조종실 안 ================= */
    // 조종판: 뒤쪽 벽을 따라 휘어진 책상 (φ -130° ~ -50°)
    const deskR = 1.18;
    for (let d = -132; d < -48; d += 6) {
      at(b, deg(d + 3), deskR, F);
      b.ao(F, 0.6, 0.7);
      b.box(0, 0.27, 0, 0.142, 0.54, 0.36, P.panelDark, { top: P.panel });
      b.ao(0, 0, 1);
      b.push().t(0, 0.6, -0.01).rx(0.5);
      b.box(0, 0, 0, 0.145, 0.05, 0.44, P.slate);
      b.box(0, 0.0, 0.225, 0.145, 0.07, 0.02, P.brass);
      b.pop();
      b.pop();
    }
    // 조종판 위 물건 놓기: 판 위 로컬 좌표(위 = 판의 법선)
    const onPanel = (d, u) => at(b, deg(d), deskR, F).t(0, 0.63, -0.01).rx(0.5).t(0, 0, u || 0);
    // 단추 넷씩 두 묶음
    for (const d of [-106, -74]) {
      const cols = [P.red, P.yellow, P.blue, P.green];
      for (let k = 0; k < 4; k++) {
        onPanel(d + (k % 2 ? 4 : -4), (k < 2 ? -0.08 : 0.08));
        b.cyl(0, 0, 0, 0.05, 0.05, 0.03, 10, P.brassDark);
        b.pop();
        onPanel(d + (k % 2 ? 4 : -4), (k < 2 ? -0.08 : 0.08));
        const btn = anchor(b, root);
        const bm = mesh(new T.CylinderGeometry(0.036, 0.04, 0.05, 10), new T.MeshBasicMaterial({ color: cols[k].clone() }), false, false);
        bm.position.y = 0.045;
        btn.add(bm);
        (anim.buttons = anim.buttons || []).push({ m: bm, c: cols[k].clone(), ph: Math.random() * 6 });
        b.pop();
      }
    }
    // 암호 바퀴 세 개
    onPanel(-122, 0);
    for (let k = 0; k < 3; k++) {
      b.push().t(-0.07 + k * 0.07, 0.07, 0).rz(Math.PI / 2);
      const wc = [P.red, P.blue, P.green][k];
      for (let i = 0; i < 8; i++) {
        b.push().ry((i / 8) * TAU);
        b.box(0, 0, 0.068, 0.056, 0.054, 0.02, i % 2 ? P.white : wc);
        b.pop();
      }
      b.cyl(0, -0.028, 0, 0.07, 0.07, 0.056, 8, P.brassDark, { bottom: true });
      b.pop();
    }
    b.box(0, 0.02, 0, 0.26, 0.04, 0.16, P.brassDark);
    b.pop();
    // 큰 손잡이(레버)
    onPanel(-58, -0.02);
    b.box(0, 0.03, 0, 0.12, 0.06, 0.2, P.brassDark);
    b.cylAB([0, 0.05, 0], [0, 0.32, -0.1], 0.025, 0.02, 6, P.ink);
    b.ball(0, 0.34, -0.11, 0.055, 1, P.red);
    b.pop();
    // 벽 계기 둘 (바늘이 떨린다)
    for (const d of [-118, -62]) {
      at(b, deg(d), rAt(inner, 2.0) - 0.03, 2.0);
      b.push().rx(Math.PI / 2);
      b.cyl(0, -0.06, 0, 0.2, 0.2, 0.05, 20, P.brass, { top: P.brass });
      b.cyl(0, -0.01, 0, 0.17, 0.17, 0.04, 20, P.white, { top: P.white });
      for (let i = 0; i < 9; i++) {
        const u = deg(-135 + i * 33.75);
        b.box(Math.sin(u) * 0.13, 0.035, -Math.cos(u) * 0.13, 0.012, 0.01, 0.035, P.ink);
      }
      b.box(0.08, 0.034, -0.1, 0.05, 0.01, 0.02, P.red);
      b.pop();
      const g = anchor(b, root);
      const needle = new T.Group();
      const nb = new JK.Builder();
      nb.box(0, 0.11, 0, 0.018, 0.22, 0.012, P.red);
      nb.ball(0, 0, 0, 0.025, 0, P.ink);
      needle.add(mesh(nb.build(), MATD, false, false));
      needle.position.set(0, 0, 0.04);
      g.add(needle);
      (anim.needles = anim.needles || []).push({ n: needle, ph: Math.random() * 6 });
      b.pop();
    }

    // 기록관 자리: 책 받침대 + 책꽂이 (왼쪽 뒤)
    at(b, deg(-158), 1.02, F);
    b.cyl(0, 0, 0, 0.18, 0.12, 0.05, 8, P.panelDark);
    b.cyl(0, 0.05, 0, 0.04, 0.04, 0.5, 6, P.panelDark);
    b.push().t(0, 0.58, 0).rx(0.55);
    b.box(0, 0, 0, 0.4, 0.04, 0.3, P.panel);
    b.box(-0.095, 0.04, 0, 0.18, 0.03, 0.26, P.white);
    b.box(0.095, 0.04, 0, 0.18, 0.03, 0.26, P.white);
    for (let i = 0; i < 4; i++) {
      b.box(-0.095, 0.058, -0.08 + i * 0.05, 0.13, 0.004, 0.01, col('#9a8a78'));
      b.box(0.095, 0.058, -0.08 + i * 0.05, 0.13, 0.004, 0.01, col('#9a8a78'));
    }
    b.pop();
    b.pop();
    const rng = JK.rng(7);
    const bookCols = ['#c4574a', '#4f8fd0', '#e0ab48', '#5fb06a', '#8a5a9a', '#e88a5a'].map(col);
    for (const y of [1.62, 2.12]) {
      for (let d = -175; d < -140; d += 7) {
        at(b, deg(d + 3.5), rAt(inner, y) - 0.17, y);
        b.box(0, 0, 0, 0.17, 0.035, 0.24, P.panelDark);
        let x = -0.07;
        while (x < 0.07) {
          const w = 0.025 + rng() * 0.02,
            h = 0.14 + rng() * 0.08;
          b.box(x + w / 2, 0.02 + h / 2, -0.02, w * 0.9, h, 0.17, bookCols[Math.floor(rng() * bookCols.length)]);
          x += w;
        }
        b.pop();
      }
    }

    // 기술자 자리: 작업대 + 공구 상자 + 톱니 + 전선판 (오른쪽 뒤)
    at(b, deg(-22), 1.05, F);
    b.box(0, 0.25, 0, 0.5, 0.06, 0.3, P.panel);
    for (const x of [-0.21, 0.21]) b.box(x, 0.11, 0, 0.04, 0.22, 0.26, P.panelDark);
    b.box(-0.1, 0.36, 0.02, 0.2, 0.14, 0.13, P.red, { top: col('#e06a58') });
    b.cylAB([-0.17, 0.43, 0.02], [-0.03, 0.43, 0.02], 0.012, 0.012, 4, P.ink);
    b.push().t(0.13, 0.28, 0.03);
    gear(b, 0.07, 0.03, 8, P.brass);
    b.pop();
    b.push().t(0.13, 0.31, -0.05).rz(0.3);
    gear(b, 0.045, 0.025, 6, col('#9aa3a8'));
    b.pop();
    b.pop();
    // 전선판: 빨강·파랑·노랑 전선
    at(b, deg(-5), rAt(inner, 1.85) - 0.04, 1.85);
    b.box(0, 0, 0, 0.42, 0.5, 0.05, P.slate);
    b.box(0, 0, 0.03, 0.44, 0.52, 0.02, P.brassDark);
    b.box(0, 0, 0.035, 0.38, 0.46, 0.02, P.slate);
    const wires = [P.red, P.blue, P.yellow, P.green];
    for (let k = 0; k < 4; k++) {
      const x = -0.13 + k * 0.087;
      b.ball(x, 0.17, 0.06, 0.025, 0, P.brass);
      b.ball(x, -0.17, 0.06, 0.025, 0, P.brass);
      if (k === 2) {
        // 끊어진 노란 선 (불꽃이 튄다)
        b.cylAB([x, 0.17, 0.06], [x + 0.02, 0.03, 0.1], 0.013, 0.013, 5, wires[k]);
        b.cylAB([x, -0.17, 0.06], [x - 0.03, -0.06, 0.11], 0.013, 0.013, 5, wires[k]);
        anim.sparkAt = new T.Vector3(x + 0.02, 0.03, 0.1);
      } else {
        b.cylAB([x, 0.17, 0.06], [x + 0.02, 0, 0.1], 0.013, 0.013, 5, wires[k]);
        b.cylAB([x + 0.02, 0, 0.1], [x, -0.17, 0.06], 0.013, 0.013, 5, wires[k]);
      }
    }
    anim.sparkAnchor = anchor(b, root);
    b.pop();
    // 벽을 따라 도는 관 + 밸브
    {
      const y = 3.0;
      const r = rAt(inner, y) - 0.08;
      let prev = null;
      for (let d = -60; d <= 10; d += 10) {
        const p = [Math.cos(deg(d)) * r, y, Math.sin(deg(d)) * r];
        if (prev) b.cylAB(prev, p, 0.05, 0.05, 6, P.copper);
        prev = p;
      }
      at(b, deg(-35), r - 0.05, y);
      ring(b, 0.12, 0.02, 12, 4, P.red);
      b.box(0, 0, 0, 0.24, 0.02, 0.02, P.red);
      b.box(0, 0, 0, 0.02, 0.24, 0.02, P.red);
      b.pop();
    }

    // 탐험가 자리: 삼발이 망원경 (옆 창을 본다) + 배낭
    {
      const s = SIDE_PORTS[1];
      const R = rAt(inner, s.y);
      const ex = Math.cos(s.phi) * 0.8,
        ez = Math.sin(s.phi) * 0.8;
      for (let k = 0; k < 3; k++) {
        const u = (k / 3) * TAU + 0.3;
        b.cylAB([ex, F + 0.7, ez], [ex + Math.cos(u) * 0.22, F, ez + Math.sin(u) * 0.22], 0.015, 0.015, 4, P.panelDark);
      }
      const tgt = [Math.cos(s.phi) * R, s.y, Math.sin(s.phi) * R];
      const dir = new T.Vector3(tgt[0] - ex, tgt[1] - (F + 0.75), tgt[2] - ez).normalize();
      const a = [ex - dir.x * 0.25, F + 0.75 - dir.y * 0.25, ez - dir.z * 0.25];
      const c = [ex + dir.x * 0.4, F + 0.75 + dir.y * 0.4, ez + dir.z * 0.4];
      b.cylAB(a, c, 0.045, 0.07, 10, P.brass);
      b.ball(c[0], c[1], c[2], 0.07, 1, col('#bfe3f0'), 0.3);
    }
    at(b, deg(140), 1.1, F);
    b.box(0, 0.16, 0, 0.26, 0.32, 0.16, col('#7a8f4a'), { top: col('#8aa05a') });
    b.box(0, 0.2, 0.09, 0.18, 0.12, 0.03, col('#6a7f3a'));
    b.cyl(0, 0.34, 0, 0.06, 0.06, 0.04, 8, P.panel);
    b.pop();

    // 천장 등 (빛)
    b.cylAB([0, top - 0.2, 0], [0, 3.15, 0], 0.012, 0.012, 4, P.ink);
    b.cyl(0, 2.98, 0, 0.18, 0.04, 0.18, 12, P.brass, { bottom: true });

    const shell = mesh(b.build());
    root.add(shell);
    gb.ball(0, 2.95, 0, 0.08, 1, col('#ffe6a8'));
    root.add(mesh(gb.build(), GLOW, false, false));
    return { outer, inner };
  }

  /* ================= 인형 ================= */
  const WOOD = JK.WOOD;
  const HAIR = col('#3a2a20');
  // 조선의 왕 인형 몸(JK.dollBase)과 같은 얼굴 + 머리카락
  function hair(b, color, long) {
    partBall(b, 0, 1.0, 0, 0.213, 2, color || HAIR, (n) => n[1] > 0.28 || n[2] < -0.25 || (long && n[2] < 0.15 && n[1] < 0.3 && Math.abs(n[0]) > 0.55));
  }
  function goggles(b, y, z, tilt) {
    b.push().t(0, y, z).rx(tilt || 0);
    for (const sx of [-1, 1]) {
      b.push().t(sx * 0.075, 0, 0);
      ring(b, 0.05, 0.016, 12, 4, P.brass);
      disc(b, 0.045, -0.005, 10, col('#9fd6e8'));
      b.pop();
    }
    b.box(0, 0, -0.01, 0.06, 0.02, 0.02, P.brassDark);
    b.pop();
  }
  const ROLES = {
    pilot: {
      name: '조종사',
      cloth: '#d9573f',
      build(b) {
        hair(b);
        // 가죽 비행 모자 + 귀덮개 + 이마 위 고글
        partBall(b, 0, 1.01, -0.005, 0.226, 2, col('#8a5634'), (n) => n[1] > 0.22 || (n[2] < -0.2 && n[1] > -0.2));
        for (const sx of [-1, 1]) {
          b.push().t(sx * 0.2, 0.96, -0.01).s(0.45, 1, 0.8);
          b.ball(0, 0, 0, 0.09, 1, col('#7a4a2c'));
          b.pop();
        }
        goggles(b, 1.12, 0.17, -0.5);
        // 노란 목도리 꼬리
        b.cyl(0, 0.74, 0, 0.23, 0.2, 0.07, 16, P.yellow);
        b.push().t(0.13, 0.62, 0.17).rz(0.25);
        b.box(0, 0, 0, 0.08, 0.22, 0.03, P.yellow);
        b.pop();
      },
    },
    reader: {
      name: '기록관',
      cloth: '#3f7fa8',
      build(b) {
        hair(b, col('#2b1e18'), true);
        partBall(b, 0, 1.0, -0.17, 0.08, 1, col('#2b1e18'), () => true); // 뒤로 묶은 머리
        // 동그란 안경
        for (const sx of [-1, 1]) {
          b.push().t(sx * 0.068, 1.012, 0.2);
          ring(b, 0.045, 0.008, 14, 3, P.ink);
          b.pop();
        }
        b.box(0, 1.015, 0.2, 0.04, 0.008, 0.008, P.ink);
        // 큰 책을 품에
        b.push().t(0.0, 0.55, 0.33).rx(-0.35);
        b.box(0, 0, 0, 0.3, 0.22, 0.05, col('#b7884e'));
        b.box(0, 0, 0.027, 0.25, 0.18, 0.004, col('#f1e6c9'));
        b.box(0, 0.06, 0.03, 0.12, 0.02, 0.004, P.red);
        b.pop();
        // 깃펜
        b.push().t(0.2, 0.62, 0.3).rz(-0.5);
        b.box(0, 0.1, 0, 0.012, 0.22, 0.012, P.ink);
        b.push().t(0, 0.2, 0).s(0.5, 1.6, 0.25);
        b.ball(0, 0, 0, 0.05, 0, P.white);
        b.pop();
        b.pop();
      },
    },
    explorer: {
      name: '탐험가',
      cloth: '#5f9a55',
      build(b) {
        hair(b);
        // 탐험 모자: 둥근 꼭지 + 넓은 챙 + 띠
        const khaki = col('#d8c08a');
        b.cyl(0, 1.08, 0, 0.34, 0.32, 0.025, 20, khaki, { bottom: true });
        partBall(b, 0, 1.08, 0, 0.215, 2, khaki, (n) => n[1] > -0.05, 0.9);
        b.cyl(0, 1.1, 0, 0.217, 0.214, 0.05, 20, col('#8a5634'));
        // 망원경을 든 손
        b.cylAB([0.14, 0.5, 0.36], [0.22, 0.68, 0.33], 0.032, 0.036, 8, P.panelDark);
        b.cylAB([0.22, 0.68, 0.33], [0.32, 0.9, 0.29], 0.04, 0.05, 8, P.brassDark);
        b.cylAB([0.31, 0.88, 0.29], [0.33, 0.93, 0.285], 0.058, 0.058, 8, P.brass);
        // 어깨끈
        b.push().t(0, 0.5, 0).rz(0.55);
        b.cyl(0, -0.03, 0, 0.3, 0.3, 0.05, 16, col('#8a5634'), { noTop: true });
        b.pop();
      },
    },
    tech: {
      name: '기술자',
      cloth: '#e0a93a',
      build(b) {
        hair(b, col('#4a2f22'));
        // 빨간 두건 + 매듭
        partBall(b, 0, 1.0, 0, 0.222, 2, P.red, (n) => n[1] > 0.32 && n[1] < 0.62);
        b.ball(-0.12, 1.12, -0.17, 0.05, 0, P.red);
        b.push().t(-0.15, 1.08, -0.22).rz(0.6);
        b.box(0, 0, 0, 0.05, 0.12, 0.02, P.red);
        b.pop();
        // 큰 스패너
        const steel = col('#a9b1b6');
        b.push().t(-0.22, 0.6, 0.3).rz(0.35);
        b.box(0, 0.12, 0, 0.04, 0.32, 0.03, steel);
        b.push().t(0, 0.3, 0);
        ring(b, 0.055, 0.022, 10, 4, steel);
        b.pop();
        b.pop();
        // 공구 띠
        b.cyl(0, 0.3, 0, 0.345, 0.335, 0.07, 18, col('#7a4a2c'), { noTop: true });
        b.box(0.18, 0.27, 0.28, 0.1, 0.12, 0.05, col('#8a5634'));
      },
    },
  };
  JK.ROLES = ROLES;
  function makeDoll(key, seg) {
    const R = ROLES[key];
    const b = new JK.Builder();
    JK.dollBase(b, col(R.cloth), seg || 18);
    R.build(b);
    return b.build();
  }

  /* ================= 조선 섬 ================= */
  const ISLE_R = 10;
  const SKID = { ax: -0.8, az: -0.3, bx: -7.5, bz: 2.8 };
  function segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax,
      dz = bz - az;
    const t = JK.clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
    return Math.hypot(px - ax - dx * t, pz - az - dz * t);
  }
  const PATH = [
    [0, 2.6],
    [0.6, 5],
    [-0.4, 7.5],
    [0.3, 10.5],
  ];
  function pathDist(x, z) {
    let d = 99;
    for (let i = 0; i < PATH.length - 1; i++) d = Math.min(d, segDist(x, z, PATH[i][0], PATH[i][1], PATH[i + 1][0], PATH[i + 1][1]));
    d = Math.min(d, segDist(x, z, 0, -3.2, 0, -6));
    return d;
  }
  function groundH(x, z) {
    const r = Math.hypot(x, z);
    let h = (JK.fbm(x * 0.22 + 3, z * 0.22 + 1) - 0.5) * 0.5;
    h *= JK.smooth(2.6, 4.5, r);
    const sk = segDist(x, z, SKID.ax, SKID.az, SKID.bx, SKID.bz);
    h -= (1 - JK.smooth(0.3, 0.9, sk)) * 0.08;
    h += (1 - JK.smooth(0.8, 1.3, sk)) * JK.smooth(0.7, 0.9, sk) * 0.06;
    h -= JK.smooth(ISLE_R - 0.9, ISLE_R, r) * 0.35;
    return h;
  }
  function groundCol(x, z) {
    const n = JK.fbm(x * 0.35, z * 0.35);
    const c = col('#8cc06a').lerp(col('#a8cf78'), JK.smooth(0.45, 0.7, n)).lerp(col('#76ad59'), JK.smooth(0.5, 0.25, n));
    const pd = pathDist(x, z);
    c.lerp(col('#e2c996'), 1 - JK.smooth(0.45, 0.75, pd));
    const sk = segDist(x, z, SKID.ax, SKID.az, SKID.bx, SKID.bz);
    c.lerp(col('#a77a50'), (1 - JK.smooth(0.35, 0.95, sk)) * JK.smooth(SKID.bx - 0.5, SKID.bx + 2.5, x));
    if (Math.hypot(x, z) > ISLE_R - 0.5) c.lerp(col('#7fae5b'), 0.5);
    return c;
  }
  function buildIsland(root) {
    const b = new JK.Builder();
    const NR = 22,
      NS = 96;
    const ringR = (k) => ISLE_R * Math.pow(k / NR, 0.85);
    const pt = (k, i) => {
      const u = (i / NS) * TAU;
      const r = ringR(k);
      const x = Math.cos(u) * r,
        z = Math.sin(u) * r;
      return [x, groundH(x, z), z];
    };
    for (let k = 0; k < NR; k++)
      for (let i = 0; i < NS; i++) {
        const a = pt(k, i),
          c = pt(k, i + 1),
          d = pt(k + 1, i + 1),
          e = pt(k + 1, i);
        const cc = groundCol((a[0] + d[0]) / 2, (a[2] + d[2]) / 2);
        if (k === 0) b.tri([0, groundH(0, 0), 0], e, d, cc);
        else b.quad(a, e, d, c, cc);
      }
    // 아래 흙더미 (떠 있는 섬)
    const LAY = [
      [1.0, -0.35, '#86b864'],
      [0.97, -0.75, '#b98457'],
      [0.86, -1.6, '#a87449'],
      [0.66, -2.6, '#93633f'],
      [0.42, -3.6, '#7f5637'],
      [0.18, -4.5, '#6e4c33'],
      [0.0, -5.0, '#6e4c33'],
    ];
    const rr = (j, i) => {
      const u = (i / NS) * TAU;
      const w = j === 0 ? 1 : 0.88 + 0.24 * JK.noise2(Math.cos(u) * 3 + j * 1.7, Math.sin(u) * 3);
      return [Math.cos(u) * ISLE_R * LAY[j][0] * w, LAY[j][1] + (j ? (JK.noise2(i * 0.4, j) - 0.5) * 0.4 : 0), Math.sin(u) * ISLE_R * LAY[j][0] * w];
    };
    for (let j = 0; j < LAY.length - 1; j++)
      for (let i = 0; i < NS; i++) {
        const c = col(LAY[j][2]).lerp(col(LAY[j + 1][2]), 0.3).multiplyScalar(0.9 + 0.15 * JK.noise2(i * 0.7, j * 3));
        b.quad(rr(j, i), rr(j, i + 1), rr(j + 1, i + 1), rr(j + 1, i), c);
      }
    // 섬 둘레 위 테두리와 흙더미 이음
    for (let i = 0; i < NS; i++) {
      const a = pt(NR, i),
        c = pt(NR, i + 1);
      b.quad(a, c, rr(0, i + 1), rr(0, i), col('#7fae5b'));
    }
    // 미끄러진 자국의 흙덩이
    const rng = JK.rng(3);
    for (let i = 0; i < 16; i++) {
      const t = rng();
      const x = JK.lerp(SKID.ax, SKID.bx, t) + (rng() - 0.5) * 1.6,
        z = JK.lerp(SKID.az, SKID.bz, t) + (rng() - 0.5) * 1.6;
      b.ball(x, groundH(x, z) + 0.03, z, 0.07 + rng() * 0.07, 0, col('#9a6c45'), 0.6);
    }
    const m = mesh(b.build(), MATD, false, true);
    root.add(m);

    // 집: 기와집·초가
    const giwa = M.giwa(),
      choga = M.choga();
    const HOUSES = [
      [giwa, -4.6, -3.4, 0.5],
      [giwa, 4.3, -3.8, -0.4],
      [giwa, -2.8, -6.0, 0.15],
      [choga, 6.3, -0.4, -1.1],
      [choga, -6.6, -0.6, 1.2],
      [giwa, 2.9, -6.6, -0.1],
      [choga, -4.4, 4.6, 2.4],
    ];
    for (const [g, x, z, ry] of HOUSES) {
      const h = mesh(g, JK.MAT);
      h.position.set(x, groundH(x, z) - 0.02, z);
      h.rotation.y = ry;
      h.scale.setScalar(2.6);
      root.add(h);
    }
    // 경복궁 (멀리 뒤)
    const gy = M.gyeongbok();
    gy.computeBoundingBox();
    const bb = gy.boundingBox;
    const gk = 7.0 / (bb.max.x - bb.min.x);
    const gm = mesh(gy, JK.MAT);
    gm.scale.setScalar(gk);
    gm.position.set(0, groundH(0, -7.6) - 0.02, -7.3 - ((bb.max.z + bb.min.z) / 2) * gk);
    root.add(gm);
    // 나무
    const pine = JK.pineTree(),
      round = JK.roundTree(),
      bush = JK.bush();
    const spots = { pine: [], round: [], bush: [] };
    const trng = JK.rng(11);
    const ok = (x, z) => {
      if (Math.hypot(x, z) < 3.3) return false;
      if (pathDist(x, z) < 0.8) return false;
      if (segDist(x, z, SKID.ax, SKID.az, SKID.bx, SKID.bz) < 1.0) return false;
      if (Math.abs(x) < 4.2 && z < -5.2 && z > -9.6) return false;
      for (const [, hx, hz] of HOUSES) if (Math.hypot(x - hx, z - hz) < 1.9) return false;
      return true;
    };
    for (let i = 0; i < 260 && spots.pine.length + spots.round.length < 46; i++) {
      const u = trng() * TAU,
        r = 3 + Math.sqrt(trng()) * (ISLE_R - 3.6);
      const x = Math.cos(u) * r,
        z = Math.sin(u) * r;
      if (!ok(x, z)) continue;
      // 앞쪽(카메라 쪽)은 낮은 덤불만
      if (z > 1.5 && Math.abs(x) < 7.5) {
        spots.bush.push([x, z]);
        continue;
      }
      (trng() < 0.55 ? spots.pine : spots.round).push([x, z]);
    }
    for (let i = 0; i < 40; i++) {
      const u = trng() * TAU,
        r = 3.3 + trng() * 6;
      const x = Math.cos(u) * r,
        z = Math.sin(u) * r;
      if (ok(x, z)) spots.bush.push([x, z]);
    }
    const leaf = {
      pine: ['#3f7d4e', '#4a8a52', '#356f45'],
      round: ['#7bb35c', '#8fc066', '#6aa553'],
      bush: ['#6fa956', '#86bb62', '#5d9a4c'],
    };
    const geos = { pine, round, bush };
    const scl = { pine: 2.7, round: 2.5, bush: 2.4 };
    const dummy = new T.Object3D();
    for (const k of ['pine', 'round', 'bush']) {
      const list = spots[k];
      const im = new T.InstancedMesh(geos[k], JK.MAT, list.length);
      list.forEach(([x, z], i) => {
        dummy.position.set(x, groundH(x, z) - 0.03, z);
        dummy.rotation.y = trng() * TAU;
        dummy.scale.setScalar(scl[k] * (0.8 + trng() * 0.45));
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        im.setColorAt(i, col(leaf[k][i % 3]));
      });
      im.castShadow = true;
      im.userData.full = list.length;
      (S.trees = S.trees || []).push(im);
      im.receiveShadow = true;
      root.add(im);
    }
  }

  // 조선 사람들 (타임머신을 구경 왔다)
  function buildVillagers(root, labels) {
    const H = M.HATS;
    const PEOPLE = [
      { x: 2.7, z: 2.6, cloth: '#efe8d8', hat: 'gat', look: '!' },
      { x: 3.5, z: 1.6, cloth: '#e98f8f', hat: 'bun' },
      { x: -2.6, z: 3.0, cloth: '#b88a5b', hat: 'paeraengi', look: '?' },
      { x: -3.4, z: 2.0, cloth: '#f2ede2', hat: 'topknot' },
      { x: 1.6, z: 3.6, cloth: '#9cc9a8', hat: 'bun', kid: true },
    ];
    const out = [];
    for (const p of PEOPLE) {
      const b = new JK.Builder();
      JK.dollBase(b, col(p.cloth), 12);
      if (H[p.hat]) H[p.hat](b, { cloth: col(p.cloth), trim: col('#d8b64e') });
      const m = mesh(b.build(), JK.MAT);
      m.position.set(p.x, groundH(p.x, p.z), p.z);
      m.rotation.y = Math.atan2(-p.x, -p.z) + 0.35 * Math.sign(p.x);
      m.scale.setScalar(p.kid ? 0.62 : 0.85);
      root.add(m);
      out.push({ m, base: m.position.y, ph: Math.random() * 6 });
      if (p.look) {
        const el = document.createElement('div');
        el.className = 'bubble';
        el.textContent = p.look;
        labels.push({ el, obj: m, dy: p.kid ? 0.95 : 1.3, view: 'home' });
      }
    }
    return out;
  }

  /* ================= 하늘·구름 ================= */
  const skyVert = `varying vec3 vDir;
    void main(){ vDir = normalize( position ); vec4 p = modelViewMatrix * vec4( position, 1.0 ); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }`;
  const skyFrag = `uniform vec3 uTop, uHor, uBot, uSun, uSunCol, uInk; uniform float uTime; varying vec3 vDir;
    float h21( vec2 p ){ return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
    float vn( vec2 p ){ vec2 i = floor( p ), f = fract( p ); f = f*f*(3.0-2.0*f);
      return mix( mix( h21(i), h21(i+vec2(1,0)), f.x ), mix( h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x ), f.y ); }
    float fbm( vec2 p ){ return vn(p)*0.55 + vn(p*2.03+3.1)*0.3 + vn(p*4.1+7.7)*0.15; }
    void main(){
      vec3 d = normalize( vDir ); float e = d.y;
      vec3 c = e > 0.0 ? mix( uHor, uTop, pow( clamp( e, 0.0, 1.0 ), 0.55 ) ) : mix( uHor, uBot, pow( clamp( -e, 0.0, 1.0 ), 0.45 ) );
      float az = atan( d.z, d.x );
      vec2 q = vec2( az * 1.6, e * 4.0 ) + vec2( uTime * 0.004, 0.0 );
      c = mix( c, c * 0.9 + uInk * 0.05, smoothstep( 0.52, 0.78, fbm( q * 1.3 ) ) * 0.55 );
      float r1 = 0.035 + 0.075 * fbm( vec2( az * 2.2, 1.0 ) ) + 0.03 * vn( vec2( az * 9.0, 2.0 ) );
      float r2 = 0.015 + 0.05 * fbm( vec2( az * 3.4 + 4.0, 3.0 ) );
      c = mix( c, mix( uHor, uInk, 0.28 ), smoothstep( r1 + 0.004, r1 - 0.004, e ) * smoothstep( -0.12, 0.0, e ) );
      c = mix( c, mix( uHor, uInk, 0.45 ), smoothstep( r2 + 0.004, r2 - 0.004, e ) * smoothstep( -0.1, 0.0, e ) );
      float s = max( dot( d, normalize( uSun ) ), 0.0 );
      c += uSunCol * ( pow( s, 6.0 ) * 0.25 + pow( s, 90.0 ) * 0.6 );
      gl_FragColor = vec4( c, 1.0 );
      #include <colorspace_fragment>
    }`;
  function buildSky(scene, sunDir) {
    const sky = new T.Mesh(
      new T.SphereGeometry(400, 32, 16),
      new T.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: T.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: col('#7fb4e8') },
          uHor: { value: col('#fdeed2') },
          uBot: { value: col('#f2e6d6') },
          uSun: { value: sunDir.clone() },
          uSunCol: { value: col('#fff1d6') },
          uInk: { value: col('#3b4a66') },
          uTime: JK.U.uTime,
        },
      })
    );
    sky.renderOrder = 10;
    sky.frustumCulled = false;
    scene.add(sky);
  }
  function buildClouds(scene) {
    const geo = JK.cloudPuff();
    const mat = new T.MeshLambertMaterial({ color: '#ffffff', emissive: col('#f4e6d6'), emissiveIntensity: 0.55 });
    const rng = JK.rng(5);
    const list = [];
    for (let i = 0; i < 22; i++) {
      const u = rng() * TAU,
        r = 13 + rng() * 14;
      const m = new T.Mesh(geo, mat);
      m.position.set(Math.cos(u) * r, -5 + rng() * 6, Math.sin(u) * r);
      if (m.position.z > 6 && m.position.y > -2) m.position.y -= 4;
      m.scale.set(2 + rng() * 2.5, 1.2 + rng() * 1.2, 2 + rng() * 2);
      m.rotation.y = rng() * TAU;
      scene.add(m);
      list.push(m);
    }
    const isl = JK.islet();
    for (const [x, y, z, s] of [
      [-13, 1.5, -6, 1.6],
      [12, 3, -9, 1.2],
      [15, -1, 4, 1.0],
      [-11, -2.5, 8, 0.9],
    ]) {
      const m = new T.Mesh(isl, JK.MAT);
      m.position.set(x, y, z);
      m.scale.setScalar(s * 2);
      scene.add(m);
    }
    return list;
  }

  /* ================= 우리 팀 무대 ================= */
  const STAGE = new T.Vector3(60, 0, 0);
  function buildStage(scene, labels) {
    const g = new T.Group();
    g.position.copy(STAGE);
    scene.add(g);
    const b = new JK.Builder();
    b.ao(-0.4, 0.5, 0.7);
    b.cyl(0, -0.4, 0, 3.0, 3.1, 0.4, 48, P.panelDark, { top: P.plank });
    b.cyl(0, -0.02, 0, 3.05, 3.05, 0.05, 48, P.brass);
    b.cyl(0, -1.4, 0, 2.0, 3.0, 1.0, 48, col('#9a6a44'));
    b.cyl(0, -2.4, 0, 0.0, 2.0, 1.0, 48, col('#7f5637'));
    b.ao(0, 0, 1);
    const keys = ['pilot', 'reader', 'explorer', 'tech'];
    const disk = [P.red, P.blue, P.green, P.yellow];
    keys.forEach((k, i) => {
      const x = (i - 1.5) * 1.4;
      b.cyl(x, 0.03, 0.2, 0.45, 0.48, 0.1, 24, disk[i].clone().multiplyScalar(0.9), { top: disk[i] });
    });
    // 뒤 큰 톱니 (천천히 돈다)
    const gb = new JK.Builder();
    gb.push().rx(Math.PI / 2);
    gear(gb, 1.5, 0.2, 14, col('#c99a52'), col('#e2b866'));
    gb.pop();
    const gm = mesh(gb.build(), MATD, false, true);
    gm.position.set(-3.3, 1.5, -2.4);
    g.add(gm);
    const gb2 = new JK.Builder();
    gb2.push().rx(Math.PI / 2);
    gear(gb2, 0.95, 0.2, 10, col('#3f8f8a'), col('#58a8a0'));
    gb2.pop();
    const gm2 = mesh(gb2.build(), MATD, false, true);
    gm2.position.set(3.4, 1.9, -2.2);
    g.add(gm2);
    g.add(mesh(b.build()));
    const dolls = keys.map((k, i) => {
      const m = mesh(makeDoll(k, 24));
      m.position.set((i - 1.5) * 1.4, 0.08, 0.2);
      m.rotation.y = -((i - 1.5) * 0.12);
      g.add(m);
      const el = document.createElement('div');
      el.className = 'plate';
      el.innerHTML = '<b>' + ROLES[k].name + '</b><span>' + ROLES[k].say + '</span>';
      labels.push({ el, obj: m, dy: -0.12, view: 'lobby', below: true, key: k });
      return { m, k, ph: i * 1.3 };
    });
    return { dolls, gears: [gm, gm2] };
  }
  ROLES.pilot.say = '단추와 손잡이를 눌러요';
  ROLES.reader.say = '설명서를 읽어 줘요';
  ROLES.explorer.say = '창밖 단서를 찾아요';
  ROLES.tech.say = '부품과 전선을 살펴요';

  /* ================= 후처리 (조선의 왕과 같은 결) ================= */
  const quadVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`;
  const blurFrag = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main(){
      vec3 c = texture2D( tSrc, vUv ).rgb * 0.227027;
      c += texture2D( tSrc, vUv + uDir * 1.3846 ).rgb * 0.3162162;
      c += texture2D( tSrc, vUv - uDir * 1.3846 ).rgb * 0.3162162;
      c += texture2D( tSrc, vUv + uDir * 3.2308 ).rgb * 0.0702703;
      c += texture2D( tSrc, vUv - uDir * 3.2308 ).rgb * 0.0702703;
      gl_FragColor = vec4( c, 1.0 );
    }`;
  const compFrag = `uniform sampler2D tScene, tBlur; uniform vec2 uTexel; uniform float uTilt, uFocusY, uAspect;
    varying vec2 vUv;
    vec3 toS( vec3 c ){ return pow( max( c, 0.0 ), vec3( 1.0 / 2.2 ) ); }
    float lum( vec3 c ){ return dot( c, vec3( 0.299, 0.587, 0.114 ) ); }
    vec3 fxaa( vec2 uv ){
      vec3 rgbM = texture2D( tScene, uv ).rgb;
      vec3 rgbNW = texture2D( tScene, uv + vec2( -1.0, -1.0 ) * uTexel ).rgb;
      vec3 rgbNE = texture2D( tScene, uv + vec2( 1.0, -1.0 ) * uTexel ).rgb;
      vec3 rgbSW = texture2D( tScene, uv + vec2( -1.0, 1.0 ) * uTexel ).rgb;
      vec3 rgbSE = texture2D( tScene, uv + vec2( 1.0, 1.0 ) * uTexel ).rgb;
      vec3 L = vec3( 0.299, 0.587, 0.114 );
      float lNW = dot( sqrt( rgbNW ), L ), lNE = dot( sqrt( rgbNE ), L ), lSW = dot( sqrt( rgbSW ), L ), lSE = dot( sqrt( rgbSE ), L ), lM = dot( sqrt( rgbM ), L );
      float lMin = min( lM, min( min( lNW, lNE ), min( lSW, lSE ) ) );
      float lMax = max( lM, max( max( lNW, lNE ), max( lSW, lSE ) ) );
      if ( lMax - lMin < max( 0.04, lMax * 0.12 ) ) return rgbM;
      vec2 dir = vec2( -( ( lNW + lNE ) - ( lSW + lSE ) ), ( lNW + lSW ) - ( lNE + lSE ) );
      float red = max( ( lNW + lNE + lSW + lSE ) * 0.03125, 0.0078125 );
      float rcp = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + red );
      dir = clamp( dir * rcp, -8.0, 8.0 ) * uTexel;
      vec3 a = 0.5 * ( texture2D( tScene, uv + dir * ( 1.0 / 3.0 - 0.5 ) ).rgb + texture2D( tScene, uv + dir * ( 2.0 / 3.0 - 0.5 ) ).rgb );
      vec3 b = a * 0.5 + 0.25 * ( texture2D( tScene, uv - dir * 0.5 ).rgb + texture2D( tScene, uv + dir * 0.5 ).rgb );
      float lB = dot( sqrt( b ), L );
      return ( lB < lMin || lB > lMax ) ? a : b;
    }
    void main(){
      vec3 sharp = fxaa( vUv );
      vec3 blur = texture2D( tBlur, vUv ).rgb;
      float m = smoothstep( 0.18, 0.55, abs( vUv.y - uFocusY ) ) * uTilt;
      m = max( m, smoothstep( 0.5, 0.8, length( ( vUv - 0.5 ) * vec2( uAspect, 1.0 ) ) ) * uTilt * 0.7 );
      vec3 c = mix( sharp, blur, m );
      c += blur * smoothstep( 0.55, 1.2, lum( blur ) ) * 0.45;
      vec3 s = toS( c );
      s = mix( vec3( lum( s ) ), s, 1.08 );
      float v = smoothstep( 1.05, 0.35, length( ( vUv - 0.5 ) * vec2( 1.0, 0.9 ) ) );
      s *= mix( 0.86, 1.0, v );
      gl_FragColor = vec4( s, 1.0 );
    }`;
  function makeRT(w, h) {
    const rt = new T.WebGLRenderTarget(w, h, { depthBuffer: true, stencilBuffer: false });
    rt.texture.colorSpace = T.SRGBColorSpace;
    rt.texture.generateMipmaps = false;
    return rt;
  }

  /* ================= 시작 ================= */
  const S = (JK.Scene = {});
  S.init = function (canvas, view) {
    S.canvas = canvas;
    const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.info.autoReset = false;
    const scene = new T.Scene();
    scene.fog = new T.Fog(0xf3e3d3, 40, 120);
    const camera = new T.PerspectiveCamera(30, 1, 0.1, 600);

    const sunDir = new T.Vector3(0.45, 0.75, 0.48).normalize();
    scene.add(new T.HemisphereLight(0xd4e6ff, 0xe8dcbc, 1.05));
    const sun = new T.DirectionalLight(0xfff1d8, 2.5);
    sun.position.copy(sunDir).multiplyScalar(30);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 70 });
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    // 조종실 안 따뜻한 등불
    const lamp = new T.PointLight(0xffc98a, 5, 7, 1.4);
    lamp.position.set(0, 2.85, 0.1);
    scene.add(lamp);
    // 우리 팀 무대 조명
    const stageSun = new T.DirectionalLight(0xfff1d8, 1.6);
    stageSun.position.set(STAGE.x + 4, 8, 9);
    stageSun.target.position.copy(STAGE);
    stageSun.castShadow = true;
    Object.assign(stageSun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 });
    stageSun.shadow.mapSize.set(1024, 1024);
    stageSun.shadow.bias = -0.0008;
    scene.add(stageSun, stageSun.target);

    buildSky(scene, sunDir);
    const clouds = buildClouds(scene);
    const world = new T.Group();
    scene.add(world);
    buildIsland(world);
    const machine = new T.Group();
    world.add(machine);
    const anim = {};
    buildMachine(machine, anim);
    const labels = [];
    const villagers = buildVillagers(world, labels);
    // 조종실 안 네 인형
    const CREW = [
      { k: 'pilot', phi: -78, r: 0.62, face: 0.35 },
      { k: 'reader', phi: -150, r: 0.78, face: 0.55 },
      { k: 'tech', phi: -32, r: 0.78, face: -0.45 },
      { k: 'explorer', phi: 168, r: 0.62, face: 0.75 },
    ];
    const crew = CREW.map((c, i) => {
      const m = mesh(makeDoll(c.k, 16));
      m.position.set(Math.cos(deg(c.phi)) * c.r, F, Math.sin(deg(c.phi)) * c.r);
      m.rotation.y = c.face;
      m.scale.setScalar(0.82);
      machine.add(m);
      return { m, k: c.k, ph: i * 1.7 };
    });
    const stage = buildStage(scene, labels);
    // 장치 자리: 조종판 가운데, 창 아래
    const slot = new T.Group();
    slot.position.set(0, F + 0.97, -0.93);
    slot.rotation.x = -0.12;
    machine.add(slot);
    Object.assign(S, { scene, camera, renderer, machine, slot, crew, stage, labels, F, P, MATD, GLOW, ring, tube, disc, gear });
    S.frameHooks = [];

    // 연기와 불꽃
    const smokeMat = new T.MeshLambertMaterial({ color: '#f4efe8', emissive: col('#d9d0c6'), emissiveIntensity: 0.4, transparent: true, depthWrite: false });
    const smokeGeo = new T.IcosahedronGeometry(0.22, 1);
    const smoke = [];
    for (let i = 0; i < 6; i++) {
      const m = new T.Mesh(smokeGeo, smokeMat.clone());
      m.userData.t = i / 6;
      m.userData.dx = (Math.random() - 0.5) * 0.6;
      machine.add(m);
      smoke.push(m);
    }
    const sparkGeo = new T.BoxGeometry(0.025, 0.025, 0.025);
    const sparks = [];
    for (let i = 0; i < 14; i++) {
      const m = new T.Mesh(sparkGeo, new T.MeshBasicMaterial({ color: '#ffe27a' }));
      m.visible = false;
      anim.sparkAnchor.add(m);
      sparks.push({ m, v: new T.Vector3(), life: 0 });
    }

    /* --- 후처리 --- */
    const quadGeo = new T.BufferGeometry();
    quadGeo.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    quadGeo.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    const blurMat = new T.ShaderMaterial({ vertexShader: quadVert, fragmentShader: blurFrag, uniforms: { tSrc: { value: null }, uDir: { value: new T.Vector2() } }, depthTest: false, depthWrite: false });
    const compMat = new T.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: compFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: { tScene: { value: null }, tBlur: { value: null }, uTexel: { value: new T.Vector2() }, uTilt: { value: 1 }, uFocusY: { value: 0.5 }, uAspect: { value: 1 } },
    });
    const quad = new T.Mesh(quadGeo, blurMat);
    quad.frustumCulled = false;
    const qScene = new T.Scene();
    qScene.add(quad);
    const qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    let rt = null,
      rtA = null,
      rtB = null;
    function resize() {
      const pr = S.low ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(pr);
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      const w = Math.round(canvas.clientWidth * pr),
        h = Math.round(canvas.clientHeight * pr);
      [rt, rtA, rtB].forEach((r) => r && r.dispose());
      rt = makeRT(w, h);
      rtA = makeRT(Math.round(w / 3), Math.round(h / 3));
      rtB = makeRT(Math.round(w / 3), Math.round(h / 3));
      compMat.uniforms.uTexel.value.set(1 / w, 1 / h);
      compMat.uniforms.uAspect.value = w / h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    /* --- 보기(카메라) --- */
    const VIEWS = {
      home: { target: new T.Vector3(0, 1.75, 0.2), dist: 15.5, az: 0.5, el: 0.33, fov: 30, tilt: 1, drag: true, spin: 0.04 },
      lobby: { target: STAGE.clone().add(new T.Vector3(0, 0.75, 0)), dist: 10, az: 0, el: 0.2, fov: 30, tilt: 0, swing: 0.5 },
      device: { pos: new T.Vector3(0, F + 1.12, 0.32), look: new T.Vector3(0, F + 0.93, -0.93), fov: 40, tilt: 0, hide: 'all' },
      window: { pos: new T.Vector3(0, F + 1.26, -0.85), look: new T.Vector3(0, 2.02, -4.4), fov: 50, tilt: 0, hide: 'all' },
      tech: { pos: new T.Vector3(-0.4, F + 1.3, 0.3), look: new T.Vector3(1.2, F + 1.0, -0.55), fov: 55, tilt: 0, hide: 'all', fps: 8 },
      reader: { pos: new T.Vector3(0.35, F + 1.3, 0.2), look: new T.Vector3(-1.2, F + 1.1, -0.55), fov: 55, tilt: 0, hide: 'all', fps: 8 },
      crash: { target: new T.Vector3(0, 1.75, 0.2), dist: 15.5, az: 0.5, el: 0.33, fov: 30, tilt: 1, focusY: 0.5, drag: true },
      pilot: { pos: new T.Vector3(0.0, F + 1.28, 0.05), look: new T.Vector3(0, F + 0.8, -1.6), fov: 62, tilt: 0 },
      team: { target: STAGE.clone().add(new T.Vector3(0, 0.75, 0)), dist: 10, az: 0, el: 0.2, fov: 30, tilt: 0, drag: true, swing: 0.5 },
    };
    let cur = VIEWS[view] ? view : 'home';
    const drag = { az: 0, el: 0, on: false, x: 0, y: 0 };
    const ray = new T.Raycaster(),
      ndc = new T.Vector2();
    S.pickables = [];
    canvas.addEventListener('pointerdown', (e) => {
      if (S.pickables.length && S.onPick) {
        ndc.set((e.clientX / canvas.clientWidth) * 2 - 1, -(e.clientY / canvas.clientHeight) * 2 + 1);
        scene.updateMatrixWorld(); // 방금 만든 장치도 제자리에서 맞도록
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(S.pickables, false)[0];
        if (hit) S.onPick(hit.object.userData.pick);
      }
      drag.on = true;
      drag.x = e.clientX;
      drag.y = e.clientY;
    });
    window.addEventListener('pointerup', () => (drag.on = false));
    window.addEventListener('pointermove', (e) => {
      if (!drag.on || !VIEWS[cur].drag) return;
      drag.az -= (e.clientX - drag.x) * 0.006;
      drag.el = JK.clamp(drag.el + (e.clientY - drag.y) * 0.004, -0.25, 0.5);
      drag.x = e.clientX;
      drag.y = e.clientY;
    });
    S.setTeam = function (map) {
      // map: { 역할: '이름표 아래 글' | null(숨김) }
      for (const d of stage.dolls) d.m.visible = map[d.k] != null;
      for (const L of labels)
        if (L.key) {
          L.hidden = map[L.key] == null;
          if (!L.hidden) L.el.querySelector('span').textContent = map[L.key];
        }
    };
    S.setView = function (v) {
      cur = v;
      drag.az = 0;
      drag.el = 0;
      document.body.dataset.view = v;
    };
    S.setView(cur);

    const _v = new T.Vector3();
    function placeCamera(t) {
      const V = VIEWS[cur];
      camera.fov = V.fov;
      camera.updateProjectionMatrix();
      if (V.pos) {
        camera.position.copy(V.pos);
        if (S.shake > 0) {
          camera.position.x += (Math.random() - 0.5) * S.shake * 0.05;
          camera.position.y += (Math.random() - 0.5) * S.shake * 0.05;
          S.shake = Math.max(0, S.shake - 0.05);
        }
        camera.position.x += Math.sin(t * 0.4) * 0.03;
        camera.lookAt(V.look);
      } else {
        const az = V.az + drag.az + (V.swing ? Math.sin(t * 0.25) * 0.12 : 0) + (V.spin ? t * V.spin : 0);
        const el = JK.clamp(V.el + drag.el, 0.02, 1.2);
        camera.position.set(V.target.x + Math.sin(az) * Math.cos(el) * V.dist, V.target.y + Math.sin(el) * V.dist, V.target.z + Math.cos(az) * Math.cos(el) * V.dist);
        camera.lookAt(V.target);
      }
      compMat.uniforms.uTilt.value = V.tilt;
      compMat.uniforms.uFocusY.value = V.focusY || 0.5;
      // 조종사 눈으로 볼 때는 자기 인형을 숨긴다
      for (const c of crew) c.m.visible = !(V.hide === 'all' || V.hide === c.k || cur === 'pilot');
      S.frameHooks.forEach((f) => f(t));
    }

    function updateLabels() {
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      for (const L of labels) {
        const on = L.view === cur && !L.hidden;
        L.el.style.display = on ? '' : 'none';
        if (!on) continue;
        L.obj.getWorldPosition(_v);
        _v.y += L.dy * (L.obj.scale.y || 1);
        _v.project(camera);
        if (_v.z > 1) {
          L.el.style.display = 'none';
          continue;
        }
        L.el.style.transform = `translate(${((_v.x + 1) / 2) * w}px, ${((1 - _v.y) / 2) * h}px) translate(-50%, ${L.below ? '0' : '-100%'})`;
      }
    }
    for (const L of labels) document.getElementById('labels').appendChild(L.el);

    let last = performance.now(),
      t = 0,
      frames = 0,
      fpsT = 0;
    const smokeFrom = anim.smokeAt;
    function step(now) {
      requestAnimationFrame(step);
      const fpsCap = VIEWS[cur].fps;
      if (fpsCap && now - last < 1000 / fpsCap) return;
      if (document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      JK.U.uTime.value = t;
      // 움직이는 것들
      anim.crystal.rotation.y = t * 0.8;
      anim.crystal.position.y += Math.sin(t * 2) * 0.0015;
      anim.bulb.material.color.set(Math.sin(t * 5) > 0.2 ? '#ff5a4a' : '#5a2a26');
      for (const nd of anim.needles) nd.n.rotation.z = Math.sin(t * 9 + nd.ph) * 0.35 + Math.sin(t * 23 + nd.ph) * 0.15 - 0.4;
      for (const bt of anim.buttons) {
        const on = Math.sin(t * 2.2 + bt.ph) > 0.3;
        bt.m.material.color.copy(bt.c).multiplyScalar(on ? 1.15 : 0.55);
      }
      for (const s of smoke) {
        s.userData.t = (s.userData.t + dt * 0.2) % 1;
        const k = s.userData.t;
        s.position.set(smokeFrom.x + k * (0.9 + s.userData.dx), smokeFrom.y + k * 1.8, smokeFrom.z - k * 0.3 + s.userData.dx * k);
        s.scale.setScalar(0.5 + k * 2.2);
        s.material.opacity = Math.min(1, k * 6) * (1 - k) * 0.7;
      }
      // 끊어진 전선 불꽃: 가끔 확 튄다
      const burst = Math.sin(t * 1.7) > 0.85;
      for (const sp of sparks) {
        if (sp.life <= 0 && burst && Math.random() < 0.3) {
          sp.life = 0.3 + Math.random() * 0.3;
          sp.m.position.copy(anim.sparkAt);
          sp.v.set((Math.random() - 0.5) * 1.2, Math.random() * 1.0, 0.5 + Math.random() * 0.8);
          sp.m.visible = true;
        }
        if (sp.life > 0) {
          sp.life -= dt;
          sp.v.y -= 3 * dt;
          sp.m.position.addScaledVector(sp.v, dt);
          if (sp.life <= 0) sp.m.visible = false;
        }
      }
      for (const c of crew) c.m.position.y = F + Math.max(0, Math.sin(t * 2.4 + c.ph)) * 0.025;
      for (const v of villagers) v.m.position.y = v.base + Math.max(0, Math.sin(t * 3 + v.ph)) * 0.04;
      for (const d of stage.dolls) {
        d.m.position.y = 0.08 + Math.max(0, Math.sin(t * 2.4 + d.ph)) * 0.05;
        d.m.rotation.z = Math.sin(t * 1.2 + d.ph) * 0.03;
      }
      stage.gears[0].rotation.z = t * 0.12;
      stage.gears[1].rotation.z = -t * 0.24;
      for (const c of clouds) c.position.x += Math.sin(t * 0.05 + c.position.z) * 0.002;

      placeCamera(t);
      renderer.info.reset();
      if (S.low) {
        // 가벼운 모드: 흐림·빛 번짐 없이 바로 화면에
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        S.tris = renderer.info.render.triangles;
        updateLabels();
        watchSpeed(dt);
        return;
      }
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      S.tris = renderer.info.render.triangles;
      quad.material = blurMat;
      blurMat.uniforms.tSrc.value = rt.texture;
      blurMat.uniforms.uDir.value.set(1 / rtA.width, 0);
      renderer.setRenderTarget(rtA);
      renderer.render(qScene, qCam);
      blurMat.uniforms.tSrc.value = rtA.texture;
      blurMat.uniforms.uDir.value.set(0, 1 / rtA.height);
      renderer.setRenderTarget(rtB);
      renderer.render(qScene, qCam);
      compMat.uniforms.tScene.value = rt.texture;
      compMat.uniforms.tBlur.value = rtB.texture;
      quad.material = compMat;
      renderer.setRenderTarget(null);
      renderer.render(qScene, qCam);
      updateLabels();
      watchSpeed(dt);
      frames++;
      fpsT += dt;
      if (fpsT > 1) {
        S.fps = frames / fpsT;
        frames = 0;
        fpsT = 0;
      }
    }
    requestAnimationFrame(step);
    S.ready = true;

    /* --- 가벼운 모드 (디벗 같은 느린 기기) ---
     * 주소에 ?q=low 면 처음부터, 아니면 처음 몇 초 동안 재 보고 느리면(초당 24장 아래) 저절로 바꾼다.
     * 화질 낮춤(0.75배), 그림자 끔, 흐림·빛 번짐 끔, 나무 반으로. */
    S.setLow = function (on) {
      if (S.low === on) return;
      S.low = on;
      renderer.shadowMap.enabled = !on;
      scene.traverse((o) => o.material && [].concat(o.material).forEach((m) => (m.needsUpdate = true)));
      for (const im of S.trees || []) im.count = on ? Math.ceil(im.userData.full / 2) : im.userData.full;
      resize();
    };
    const q = new URLSearchParams(location.search).get('q');
    if (q === 'low') S.setLow(true);
    const speed = { n: 0, sum: 0, done: q === 'low' || q === 'high' };
    function watchSpeed(dt) {
      if (speed.done || document.hidden || VIEWS[cur].fps) return;
      speed.n++;
      if (speed.n <= 30) return; // 처음 몇 장은 준비하느라 느리다
      speed.sum += dt;
      if (speed.n >= 150) {
        speed.done = true;
        const fps = 120 / speed.sum;
        S.measuredFps = fps;
        if (fps < 24) S.setLow(true);
      }
    }
  };
})();
