/* eras/joseon/models.js — 조선 시대팩 모형: 기와지붕 도구, 이름 붙은 건물, 집, 성벽, 모자·소품 (모두 코드로 만든 로우폴리)
 * 근거가 있는 이름 붙은 건물만 이름을 단다(CREDITS.md 「화면 속 이름의 근거」).
 * 나무·구름·새·바위는 장식이라 이름이 없다.
 */
(function () {
  'use strict';
  const JK = window.JK;
  const T = THREE;
  const col = JK.col;

  const C = (JK.PAL = {
    tile: col('#58616b'),
    tileHouse: col('#5e666f'),
    ridge: col('#e2ddd0'),
    ridgeDark: col('#3f464d'),
    eave: col('#2e3238'),
    soffit: col('#3f9079'),
    soffitRed: col('#b9443a'),
    band: col('#2f7f6f'),
    bandBlue: col('#2f5f8c'),
    column: col('#a83b2f'),
    door: col('#93402f'),
    paper: col('#efe2c2'),
    wallWhite: col('#efe8da'),
    wallRed: col('#b4664e'),
    stone: col('#d3ccbc'),
    stoneDark: col('#aaa293'),
    stoneWarm: col('#c9bda4'),
    wood: col('#8a5a3b'),
    woodDark: col('#5a3a28'),
    mud: col('#dcc59c'),
    straw: col('#d9bd78'),
    strawDark: col('#b0914f'),
    jar: col('#6a4030'),
    arch: col('#2a2522'),
    gateDoor: col('#8c3528'),
  });

  /* ================= 지붕 ================= */
  // b의 현재 원점 = 처마 높이의 지붕 가운데. 앞이 +z.
  // o: w,d(처마 반폭·반깊이) h(높이) r(용마루 반길이) type: hip(우진각)|gable(맞배)|paljak(팔작)
  //    lift(추녀 들림) out(안허리 내밀기) convex(초가처럼 둥글게) tiles(기와 골)
  function roof(b, o) {
    const W = o.w,
      D = o.d,
      H = o.h,
      L = o.lift || 0,
      O = o.out || 0,
      p = o.pow || 3;
    // 그림자용 낮은 모형(JK.shadowLod): 기와 골 칸을 줄인다. 모양(처마 선)은 같아 그림자 모양은 거의 같다
    const lod = JK.shadowLod ? 0.4 : 1;
    const nu = Math.max(2, Math.round((o.nu || 8) * lod)),
      nv = Math.max(1, Math.round((o.nv || 5) * lod));
    const type = o.type || 'hip';
    const r = type === 'gable' ? W : o.r !== undefined ? o.r : Math.max(0.04, W - D);
    const prof = o.convex ? (v) => 1 - Math.pow(1 - v, 1.9) : (v) => Math.pow(v, o.prof || 1.65);
    const rl = o.ridgeLift !== undefined ? o.ridgeLift : L * 0.45;
    const color = o.color || C.tile;
    const kindTile = o.tiles === false ? 0 : 1;
    const dens = o.dens || 7;
    const v1 = type === 'paljak' ? o.v1 || 0.5 : 1;
    const th = o.thick || Math.max(0.025, H * 0.12);
    const A = (u) => Math.pow(Math.abs(u), p);
    const Ef = (u) => [u * W + Math.sign(u) * O * A(u), L * A(u), D + O * A(u)];
    const Rf = (u) => [u * r, H + rl * Math.pow(Math.abs(u), 3), 0];
    const Es = (u) => [W + O * A(u), L * A(u), u * D + Math.sign(u) * O * A(u)];
    const Rs = () => [r, H + rl, 0];
    const P = (E, R, v) => [E[0] + (R[0] - E[0]) * v, E[1] + (R[1] - E[1]) * prof(v), E[2] + (R[2] - E[2]) * v];
    // 거울: mx,mz = ±1. 한 번 뒤집히면 감기 방향도 뒤집힌다.
    function face(Efn, Rfn, mx, mz, baseFlip, vA, vB, axis, upperGable) {
      const flip = baseFlip !== mx * mz < 0;
      for (let i = 0; i < nu; i++) {
        const u0 = -1 + (2 * i) / nu,
          u1 = -1 + (2 * (i + 1)) / nu;
        for (let j = 0; j < nv; j++) {
          const va = vA + ((vB - vA) * j) / nv,
            vb = vA + ((vB - vA) * (j + 1)) / nv;
          const g = (u, v) => {
            let q;
            if (upperGable) {
              // 팔작 위쪽 박공 부분: x는 v1 선 위치로 고정
              const B = P(Efn(u), Rfn(u), v1);
              const E = Efn(u),
                R = Rfn(u);
              q = [B[0], E[1] + (R[1] - E[1]) * prof(v), E[2] * (1 - v)];
            } else q = P(Efn(u), Rfn(u), v);
            return [q[0] * mx, q[1], q[2] * mz];
          };
          const a = g(u0, va),
            bb = g(u1, va),
            c = g(u1, vb),
            d = g(u0, vb);
          const fx = (q, v) => [(axis === 'x' ? q[0] : q[2]) * dens, v, kindTile];
          if (!flip) b.quad(a, bb, c, d, color, fx(a, va), fx(bb, va), fx(c, vb), fx(d, vb));
          else b.quad(a, d, c, bb, color, fx(a, va), fx(d, vb), fx(c, vb), fx(bb, va));
        }
      }
    }
    // 처마 끝 두께 띠와 처마 밑(단청)
    function fascia(Efn, mx, mz, baseFlip, isSide) {
      const flip = baseFlip !== mx * mz < 0;
      const k0 = [0, 0, 0];
      for (let i = 0; i < nu; i++) {
        const u0 = -1 + (2 * i) / nu,
          u1 = -1 + (2 * (i + 1)) / nu;
        const e0 = Efn(u0),
          e1 = Efn(u1);
        const m = (q) => [q[0] * mx, q[1], q[2] * mz];
        const E0 = m(e0),
          E1 = m(e1);
        const E0d = [E0[0], E0[1] - th, E0[2]],
          E1d = [E1[0], E1[1] - th, E1[2]];
        if (!flip) b.quad(E0d, E1d, E1, E0, C.eave, k0, k0, k0, k0);
        else b.quad(E0d, E0, E1, E1d, C.eave, k0, k0, k0, k0);
        if (o.soffit !== false) {
          const sx = (o.bw || W * 0.75) / W,
            sz = (o.bd || D * 0.75) / D;
          const I0 = [E0[0] * (isSide ? 1 : sx), -th * 1.6, E0[2] * (isSide ? 1 : sz)];
          const I1 = [E1[0] * (isSide ? 1 : sx), -th * 1.6, E1[2] * (isSide ? 1 : sz)];
          if (isSide) {
            I0[0] = E0[0] * sx;
            I1[0] = E1[0] * sx;
            I0[2] = E0[2] * sz;
            I1[2] = E1[2] * sz;
          }
          const sc = o.soffitColor || C.soffit;
          if (!flip) b.quad(E0d, I0, I1, E1d, sc, k0, k0, k0, k0);
          else b.quad(E0d, E1d, I1, I0, sc, k0, k0, k0, k0);
        }
      }
    }
    // 앞(+z) 뒤(-z)
    face(Ef, Rf, 1, 1, false, 0, v1, 'x');
    face(Ef, Rf, 1, -1, false, 0, v1, 'x');
    fascia(Ef, 1, 1, false, false);
    fascia(Ef, 1, -1, false, false);
    if (type === 'hip' || type === 'paljak') {
      face(Es, Rs, 1, 1, true, 0, v1, 'z');
      face(Es, Rs, -1, 1, true, 0, v1, 'z');
      fascia(Es, 1, 1, true, true);
      fascia(Es, -1, 1, true, true);
    }
    const ridgeC = o.ridgeColor || C.ridge;
    const rw = o.ridgeW || Math.max(0.03, H * 0.16);
    if (type === 'paljak') {
      face(Ef, Rf, 1, 1, false, v1, 1, 'x', true);
      face(Ef, Rf, 1, -1, false, v1, 1, 'x', true);
      // 박공(합각) 벽
      const steps = 4;
      for (const sx of [1, -1]) {
        const pts = [];
        for (let k = 0; k <= steps; k++) {
          const v = v1 + ((1 - v1) * k) / steps;
          const E = Ef(sx),
            R = Rf(sx);
          const B = P(E, R, v1);
          pts.push([B[0] * 0.97, E[1] + (R[1] - E[1]) * prof(v) - 0.004, E[2] * (1 - v)]);
        }
        const base = pts[0][1];
        const gc = o.gableColor || C.woodDark;
        for (let k = 0; k < steps; k++) {
          const a = pts[k],
            c2 = pts[k + 1];
          const a2 = [a[0], a[1], -a[2]],
            c3 = [c2[0], c2[1], -c2[2]];
          if (sx > 0) b.quad(a, a2, c3, c2, gc);
          else b.quad(a2, a, c2, c3, gc);
        }
        void base;
      }
    }
    if (type === 'gable') {
      // 맞배 옆 박공 벽(세모)
      const steps = 4;
      for (const sx of [1, -1]) {
        const pts = [];
        for (let k = 0; k <= steps; k++) {
          const v = k / steps;
          const E = Ef(sx * 0.999),
            R = Rf(sx * 0.999);
          const q = P(E, R, v);
          pts.push([sx * (o.bw || W * 0.9), q[1] - 0.004, q[2]]);
        }
        const gc = o.gableColor || C.woodDark;
        const bot = pts[0][1] - th * 1.6;
        for (let k = 0; k < steps; k++) {
          const a = pts[k],
            c2 = pts[k + 1];
          const a2 = [a[0], a[1], -a[2]],
            c3 = [c2[0], c2[1], -c2[2]];
          if (sx > 0) b.quad(a, a2, c3, c2, gc);
          else b.quad(a2, a, c2, c3, gc);
        }
        const f0 = [pts[0][0], bot, pts[0][2]],
          f1 = [pts[0][0], bot, -pts[0][2]];
        if (sx > 0) b.quad(f0, f1, [pts[0][0], pts[0][1], -pts[0][2]], pts[0], gc);
        else b.quad(f1, f0, pts[0], [pts[0][0], pts[0][1], -pts[0][2]], gc);
      }
    }
    // 용마루
    const rp = [];
    const rr = type === 'paljak' ? P(Ef(1), Rf(1), v1)[0] : r;
    for (let k = 0; k <= 6; k++) {
      const u = -1 + (2 * k) / 6;
      const y = H + rl * Math.pow(Math.abs(u), 3);
      rp.push([u * (rr + rw * 0.4), y - rw * 0.3, 0]);
    }
    b.bar(rp, rw * 1.1, rw * 0.9, ridgeC);
    if (o.chwidu) {
      for (const sx of [1, -1]) b.box(sx * (rr + rw * 0.3), H + rl + rw * 0.9, 0, rw * 0.9, rw * 1.6, rw * 1.0, C.ridgeDark);
    }
    // 추녀마루(대각선 마루)
    if (type === 'hip' || type === 'paljak') {
      for (const sx of [1, -1])
        for (const sz of [1, -1]) {
          const pts = [];
          for (let k = 0; k <= 5; k++) {
            const v = (v1 * k) / 5;
            const q = P(Ef(sx), Rf(sx), v);
            pts.push([q[0], q[1] - rw * 0.25, q[2] * sz]);
          }
          b.bar(pts, rw * 0.75, rw * 0.6, ridgeC);
          if (o.japsang) {
            // 잡상: 추녀마루 위 작은 토우 줄
            for (let k = 1; k <= o.japsang; k++) {
              const q = P(Ef(sx), Rf(sx), 0.08 + k * 0.07);
              b.box(q[0], q[1] + rw * 0.55, q[2] * sz, rw * 0.5, rw * 0.7, rw * 0.5, C.ridgeDark);
            }
          }
        }
    }
    return b;
  }
  JK.roof = roof;

  /* ================= 목조 몸체 ================= */
  // 원점 = 바닥 가운데. bw,bd 반폭, h 기둥 높이, nx,nz 칸 수
  function hall(b, o) {
    const bw = o.bw,
      bd = o.bd,
      h = o.h,
      nx = o.nx || 3,
      nz = o.nz || 2;
    const cr = o.colR || Math.min(bw, bd) * 0.07;
    const wallC = o.wall || C.door;
    // 벽 (조금 안쪽)
    b.box(0, h / 2, 0, bw * 2 - cr * 1.2, h, bd * 2 - cr * 1.2, wallC, { noBottom: true });
    // 칸마다 문살 판
    const panel = (x0, x1, z, nzSign) => {
      const y0 = h * 0.12,
        y1 = h * 0.8;
      const inset = 0.002 + bd - cr * 0.6;
      const a = [x0, y0, nzSign * inset],
        c = [x1, y1, nzSign * inset];
      const k = o.glow ? [0, 0, 2] : [0, 0, 0];
      if (nzSign > 0) b.quad([x0, y0, inset], [x1, y0, inset], [x1, y1, inset], [x0, y1, inset], o.paper || C.paper, k, k, k, k);
      else b.quad([x1, y0, -inset], [x0, y0, -inset], [x0, y1, -inset], [x1, y1, -inset], o.paper || C.paper, k, k, k, k);
      void a;
      void c;
      void z;
    };
    for (let i = 0; i < nx; i++) {
      const x0 = -bw + (2 * bw * i) / nx + cr * 1.4,
        x1 = -bw + (2 * bw * (i + 1)) / nx - cr * 1.4;
      if (!o.noFrontPanels) panel(x0, x1, 0, 1);
      if (o.backPanels) panel(x0, x1, 0, -1);
    }
    // 기둥
    const cols = [];
    for (let i = 0; i <= nx; i++) {
      cols.push([-bw + (2 * bw * i) / nx, bd]);
      cols.push([-bw + (2 * bw * i) / nx, -bd]);
    }
    for (let j = 1; j < nz; j++) {
      cols.push([-bw, -bd + (2 * bd * j) / nz]);
      cols.push([bw, -bd + (2 * bd * j) / nz]);
    }
    const cc = o.colColor || C.column;
    for (const [x, z] of cols) b.cyl(x, 0, z, cr, cr * 0.9, h, 6, cc, { noTop: true });
    // 창방(초록 띠)과 공포 띠(단청)
    const gh = o.bandH || h * 0.22;
    b.box(0, h + gh * 0.25, 0, bw * 2 + cr * 2, gh * 0.5, bd * 2 + cr * 2, C.band, { noBottom: false });
    b.box(0, h + gh * 0.75, 0, bw * 2 + cr * 3.2, gh * 0.5, bd * 2 + cr * 3.2, C.bandBlue, { top: C.band });
    // 공포 점(빨강)
    for (let i = 0; i <= nx; i++) {
      const x = -bw + (2 * bw * i) / nx;
      b.box(x, h + gh * 0.5, bd + cr * 1.65, cr * 1.6, gh * 0.55, 0.004, C.soffitRed);
      b.box(x, h + gh * 0.5, -bd - cr * 1.65, cr * 1.6, gh * 0.55, 0.004, C.soffitRed);
    }
    return h + gh;
  }
  JK.hall = hall;

  // 돌 기단 + 앞 계단
  function platform(b, w, d, h, opts) {
    opts = opts || {};
    const c = opts.color || C.stone;
    b.box(0, h / 2, 0, w, h, d, c, { top: opts.top || C.stoneWarm, noBottom: true });
    if (opts.steps) {
      const n = 3;
      for (let i = 0; i < n; i++) {
        const sh = (h * (i + 1)) / n;
        b.box(0, sh / 2, d / 2 + (h / n) * (n - i) * 0.9 - (h / n) * 0.45, opts.stepW || w * 0.28, sh, (h / n) * 0.9, C.stoneDark, { top: C.stone, noBottom: true });
      }
    }
  }

  // 아치(홍예) 무늬: 돌 벽 앞면에 어두운 굴 모양
  function archFace(b, x, y, z, w, h, nzSign, color) {
    const seg = 7;
    const r = w / 2;
    const yb = y + h - r;
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const a = Math.PI - (Math.PI * i) / seg;
      pts.push([x + Math.cos(a) * r, yb + Math.sin(a) * r]);
    }
    const zz = z;
    const cc = color || C.arch;
    for (let i = 0; i < seg; i++) {
      const p0 = pts[i],
        p1 = pts[i + 1];
      const A0 = [p0[0], y, zz],
        A1 = [p1[0], y, zz],
        B0 = [p0[0], p0[1], zz],
        B1 = [p1[0], p1[1], zz];
      if (nzSign > 0) b.quad(A0, A1, B1, B0, cc);
      else b.quad(A1, A0, B0, B1, cc);
    }
  }

  /* ================= 문루(성문 다락) ================= */
  // 2층 우진각 문루. 원점 = 석축 바닥 가운데. 앞 +z
  function gatePavilion(b, s, o) {
    o = o || {};
    // 석축
    const bw = 0.62 * s,
      bh = 0.42 * s,
      bd = 0.34 * s;
    b.ao(0, bh * 0.9, 0.7);
    b.box(0, bh / 2, 0, bw * 2, bh, bd * 2, C.stone, { top: C.stoneWarm, noBottom: true });
    // 돌 줄눈
    for (let k = 1; k < 4; k++) {
      const y = (bh * k) / 4;
      b.box(0, y, bd + 0.002, bw * 2, 0.006 * s, 0.003, C.stoneDark);
      b.box(0, y, -bd - 0.002, bw * 2, 0.006 * s, 0.003, C.stoneDark);
    }
    archFace(b, 0, 0, bd + 0.004, 0.3 * s, 0.32 * s, 1);
    archFace(b, 0, 0, -bd - 0.004, 0.3 * s, 0.32 * s, -1);
    // 붉은 문짝
    archFace(b, 0, 0, bd - 0.03 * s, 0.26 * s, 0.29 * s, 1, C.gateDoor);
    b.ao(0, 0, 1);
    // 1층
    b.push().t(0, bh, 0);
    let top = hall(b, { bw: 0.46 * s, bd: 0.22 * s, h: 0.2 * s, nx: 5, nz: 2, wall: C.door, noFrontPanels: false, backPanels: true });
    b.push().t(0, top, 0);
    roof(b, { type: 'hip', w: 0.62 * s, d: 0.36 * s, h: 0.13 * s, r: 0.36 * s, lift: 0.07 * s, out: 0.04 * s, nu: 8, nv: 3, dens: 30 / s, bw: 0.5 * s, bd: 0.25 * s, ridgeW: 0.02 * s, japsang: o.japsang ? 0 : 0 });
    b.pop();
    // 2층
    b.push().t(0, top + 0.06 * s, 0);
    const top2 = hall(b, { bw: 0.4 * s, bd: 0.17 * s, h: 0.15 * s, nx: 5, nz: 2, wall: C.door, backPanels: true });
    b.push().t(0, top2, 0);
    roof(b, { type: 'hip', w: 0.6 * s, d: 0.33 * s, h: 0.26 * s, r: 0.3 * s, lift: 0.1 * s, out: 0.05 * s, nu: 10, nv: 5, dens: 30 / s, bw: 0.44 * s, bd: 0.2 * s, chwidu: true, japsang: o.japsang || 0 });
    b.pop();
    b.pop();
    b.pop();
  }

  /* ================= 이름 붙은 건물 ================= */
  // 경복궁: 궁장, 광화문, 회랑, 근정전(중층 팔작), 뒤 전각
  function gyeongbokgung() {
    const b = new JK.Builder();
    const W = 2.3,
      D = 1.8;
    // 궁장(담)
    b.ao(0, 0.3, 0.68);
    const wallSeg = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const cx = (x0 + x1) / 2,
        cz = (z0 + z1) / 2;
      const ang = Math.atan2(z1 - z0, x1 - x0);
      b.push().t(cx, 0, cz).ry(-ang);
      b.box(0, 0.09, 0, len, 0.18, 0.12, C.stoneWarm, { noBottom: true });
      b.box(0, 0.24, 0, len, 0.12, 0.1, C.wallRed, { noBottom: true });
      b.push().t(0, 0.3, 0);
      roof(b, { type: 'gable', w: len / 2, d: 0.1, h: 0.05, lift: 0, nu: Math.max(2, Math.round(len * 3)), nv: 1, dens: 14, soffit: false, ridgeW: 0.02, color: C.tileHouse, ridgeColor: C.ridgeDark, gableColor: C.wallRed });
      b.pop();
      b.pop();
    };
    wallSeg(-W, D, -0.62, D);
    wallSeg(0.62, D, W, D);
    wallSeg(W, D, W, -D);
    wallSeg(W, -D, -W, -D);
    wallSeg(-W, -D, -W, D);
    // 광화문 (석축 세 홍예 + 2층 문루) — 정문
    b.push().t(0, 0, D);
    {
      const s = 1.0;
      const bw = 0.62,
        bh = 0.4,
        bd = 0.3;
      b.ao(0, bh * 0.9, 0.7);
      b.box(0, bh / 2, 0, bw * 2, bh, bd * 2, C.stone, { top: C.stoneWarm, noBottom: true });
      for (let k = 1; k < 4; k++) b.box(0, (bh * k) / 4, bd + 0.002, bw * 2, 0.006, 0.003, C.stoneDark);
      for (const ax of [-0.36, 0, 0.36]) {
        const aw = ax === 0 ? 0.24 : 0.19,
          ah = ax === 0 ? 0.3 : 0.25;
        archFace(b, ax, 0, bd + 0.004, aw, ah, 1);
        archFace(b, ax, 0, -bd - 0.004, aw, ah, -1);
      }
      b.ao(0, 0, 1);
      b.push().t(0, bh, 0);
      const top = hall(b, { bw: 0.44 * s, bd: 0.2 * s, h: 0.18, nx: 3, nz: 2, backPanels: true });
      b.push().t(0, top, 0);
      roof(b, { type: 'hip', w: 0.6, d: 0.33, h: 0.12, r: 0.34, lift: 0.07, out: 0.04, nu: 8, nv: 3, dens: 30, bw: 0.48, bd: 0.23, ridgeW: 0.02 });
      b.pop();
      b.push().t(0, top + 0.06, 0);
      const top2 = hall(b, { bw: 0.38, bd: 0.16, h: 0.14, nx: 3, nz: 2, backPanels: true });
      b.push().t(0, top2, 0);
      roof(b, { type: 'hip', w: 0.58, d: 0.31, h: 0.25, r: 0.3, lift: 0.1, out: 0.05, nu: 10, nv: 5, dens: 30, bw: 0.42, bd: 0.19, chwidu: true, japsang: 4 });
      b.pop();
      b.pop();
      b.pop();
    }
    b.pop();
    // 앞마당 박석 길
    b.ao(0, 0, 1);
    b.box(0, 0.012, 0.9, 0.36, 0.024, 1.6, C.stoneWarm, { noBottom: true });
    // 회랑(근정전 둘레 지붕 덮인 복도)
    const cx0 = -1.25,
      cx1 = 1.25,
      cz0 = -1.25,
      cz1 = 0.75;
    const corridor = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const cx = (x0 + x1) / 2,
        cz = (z0 + z1) / 2;
      const ang = Math.atan2(z1 - z0, x1 - x0);
      b.push().t(cx, 0, cz).ry(-ang);
      b.ao(0, 0.15, 0.72);
      b.box(0, 0.02, 0, len, 0.04, 0.2, C.stone, { noBottom: true });
      const n = Math.round(len / 0.22);
      for (let i = 0; i <= n; i++) {
        const x = -len / 2 + (len * i) / n;
        b.cyl(x, 0.04, 0.07, 0.014, 0.013, 0.16, 5, C.column, { noTop: true });
        b.cyl(x, 0.04, -0.07, 0.014, 0.013, 0.16, 5, C.column, { noTop: true });
      }
      b.box(0, 0.11, -0.07, len, 0.14, 0.012, C.wallRed);
      b.box(0, 0.205, 0, len, 0.03, 0.17, C.band);
      b.ao(0, 0, 1);
      b.push().t(0, 0.22, 0);
      roof(b, { type: 'gable', w: len / 2 + 0.02, d: 0.15, h: 0.08, lift: 0.0, nu: Math.max(3, Math.round(len * 3)), nv: 2, dens: 30, ridgeW: 0.02, bw: len / 2, bd: 0.08, soffit: false });
      b.pop();
      b.pop();
    };
    corridor(cx0, cz1, -0.3, cz1);
    corridor(0.3, cz1, cx1, cz1);
    corridor(cx1, cz1, cx1, cz0);
    corridor(cx1, cz0, cx0, cz0);
    corridor(cx0, cz0, cx0, cz1);
    // 근정문(회랑 앞 작은 문)
    b.push().t(0, 0, cz1);
    b.ao(0, 0.2, 0.72);
    platform(b, 0.62, 0.3, 0.05);
    b.push().t(0, 0.05, 0);
    let tg = hall(b, { bw: 0.24, bd: 0.1, h: 0.17, nx: 3, nz: 2, backPanels: true });
    b.ao(0, 0, 1);
    b.push().t(0, tg, 0);
    roof(b, { type: 'paljak', w: 0.36, d: 0.2, h: 0.17, r: 0.2, lift: 0.06, out: 0.03, nu: 8, nv: 4, dens: 30, bw: 0.26, bd: 0.12, v1: 0.55 });
    b.pop();
    b.pop();
    b.pop();
    // 근정전: 2단 월대 + 중층 팔작
    b.push().t(0, 0, -0.3);
    b.ao(0, 0.25, 0.7);
    platform(b, 1.7, 1.25, 0.08, { steps: true, stepW: 0.3 });
    b.push().t(0, 0.08, -0.05);
    platform(b, 1.36, 0.95, 0.08, { steps: true, stepW: 0.26 });
    // 월대 난간(흰 돌 낮은 띠)
    b.box(0, 0.11, 0.475, 1.36, 0.035, 0.02, C.wallWhite);
    b.box(-0.68, 0.11, 0, 0.02, 0.035, 0.95, C.wallWhite);
    b.box(0.68, 0.11, 0, 0.02, 0.035, 0.95, C.wallWhite);
    b.push().t(0, 0.08, -0.05);
    platform(b, 1.02, 0.66, 0.05, { color: C.stoneWarm });
    b.push().t(0, 0.05, 0);
    let t1 = hall(b, { bw: 0.44, bd: 0.26, h: 0.24, nx: 5, nz: 3, glow: true, backPanels: true, colR: 0.022 });
    b.ao(0, 0, 1);
    b.push().t(0, t1, 0);
    roof(b, { type: 'hip', w: 0.62, d: 0.42, h: 0.1, r: 0.42, lift: 0.07, out: 0.04, nu: 10, nv: 3, dens: 30, bw: 0.46, bd: 0.28, ridgeW: 0.02 });
    b.pop();
    b.push().t(0, t1 + 0.07, 0);
    let t2 = hall(b, { bw: 0.38, bd: 0.2, h: 0.13, nx: 5, nz: 2, backPanels: true, colR: 0.02 });
    b.push().t(0, t2, 0);
    roof(b, { type: 'paljak', w: 0.6, d: 0.38, h: 0.32, r: 0.32, lift: 0.12, out: 0.06, nu: 12, nv: 6, dens: 30, bw: 0.4, bd: 0.22, v1: 0.52, chwidu: true, japsang: 4 });
    b.pop();
    b.pop();
    b.pop();
    b.pop();
    b.pop();
    b.pop();
    // 뒤 전각
    b.push().t(0, 0, -1.55);
    b.ao(0, 0.2, 0.72);
    platform(b, 0.9, 0.45, 0.06, { steps: true });
    b.push().t(0, 0.06, 0);
    let t3 = hall(b, { bw: 0.36, bd: 0.15, h: 0.17, nx: 5, nz: 2, glow: true });
    b.ao(0, 0, 1);
    b.push().t(0, t3, 0);
    roof(b, { type: 'paljak', w: 0.5, d: 0.27, h: 0.2, r: 0.3, lift: 0.07, out: 0.04, nu: 10, nv: 4, dens: 30, bw: 0.38, bd: 0.17, v1: 0.55 });
    b.pop();
    b.pop();
    b.pop();
    return b.build();
  }

  // 종묘: 길고 낮은 정전(맞배) + 넓은 월대 + 담
  function jongmyo() {
    const b = new JK.Builder();
    b.ao(0, 0.25, 0.7);
    // 담
    const W = 1.55,
      D = 1.0;
    const seg = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      b.push().t((x0 + x1) / 2, 0, (z0 + z1) / 2).ry(-Math.atan2(z1 - z0, x1 - x0));
      b.box(0, 0.1, 0, len, 0.2, 0.08, C.wallRed, { noBottom: true });
      b.push().t(0, 0.2, 0);
      roof(b, { type: 'gable', w: len / 2, d: 0.07, h: 0.04, nu: Math.max(2, Math.round(len * 3)), nv: 1, dens: 14, soffit: false, ridgeW: 0.015, color: C.tileHouse, ridgeColor: C.ridgeDark, gableColor: C.wallRed });
      b.pop();
      b.pop();
    };
    seg(-W, D, -0.22, D);
    seg(0.22, D, W, D);
    seg(W, D, W, -D);
    seg(W, -D, -W, -D);
    seg(-W, -D, -W, D);
    // 남신문(작은 문)
    b.push().t(0, 0, D);
    b.box(0, 0.11, 0, 0.42, 0.22, 0.1, C.door, { noBottom: true });
    b.push().t(0, 0.22, 0);
    roof(b, { type: 'gable', w: 0.26, d: 0.12, h: 0.07, nu: 4, nv: 2, dens: 30, soffit: false, ridgeW: 0.02 });
    b.pop();
    b.pop();
    // 월대(넓은 돌 마당)
    b.push().t(0, 0, 0.05);
    platform(b, 2.6, 1.15, 0.07, { color: C.stoneWarm, top: C.stone });
    // 신로(가운데 길)
    b.box(0, 0.075, 0.3, 0.1, 0.012, 1.0, C.stoneDark);
    b.pop();
    // 정전
    b.push().t(0, 0.07, -0.42);
    platform(b, 2.5, 0.42, 0.06, { steps: true, stepW: 0.2 });
    b.push().t(0, 0.06, 0);
    const top = hall(b, { bw: 1.12, bd: 0.13, h: 0.22, nx: 11, nz: 2, wall: C.door, colR: 0.018, paper: col('#b65a45') });
    b.ao(0, 0, 1);
    b.push().t(0, top, 0);
    roof(b, { type: 'gable', w: 1.24, d: 0.26, h: 0.2, lift: 0.0, ridgeLift: 0.0, nu: 22, nv: 4, dens: 30, bw: 1.12, bd: 0.14, ridgeW: 0.026, gableColor: C.door });
    b.pop();
    b.pop();
    b.pop();
    return b.build();
  }

  // 숭례문: 석축 홍예 + 2층 우진각 문루 (앞 +z = 성 밖)
  function sungnyemun() {
    const b = new JK.Builder();
    gatePavilion(b, 1.0, { japsang: 4 });
    return b.build();
  }
  // 흥인지문: 2층 문루 + 바깥 옹성(반달 모양 성벽)
  function heunginjimun() {
    const b = new JK.Builder();
    gatePavilion(b, 0.92, { japsang: 3 });
    // 옹성
    b.ao(0, 0.3, 0.7);
    const R = 0.78,
      n = 12;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI,
        a1 = ((i + 1) / n) * Math.PI;
      const x0 = Math.cos(a0) * R,
        z0 = Math.sin(a0) * R * 0.85 + 0.25,
        x1 = Math.cos(a1) * R,
        z1 = Math.sin(a1) * R * 0.85 + 0.25;
      if (i === n / 2 - 1 || i === n / 2) continue; // 옹성 옆 트인 길
      const len = Math.hypot(x1 - x0, z1 - z0);
      b.push().t((x0 + x1) / 2, 0, (z0 + z1) / 2).ry(-Math.atan2(z1 - z0, x1 - x0));
      b.box(0, 0.16, 0, len + 0.01, 0.32, 0.14, C.stone, { top: C.stoneWarm, noBottom: true });
      b.box(-len * 0.25, 0.35, 0.05, len * 0.36, 0.06, 0.04, C.stoneDark);
      b.box(len * 0.25, 0.35, 0.05, len * 0.36, 0.06, 0.04, C.stoneDark);
      b.pop();
    }
    return b.build();
  }

  const M = (JK.eraModels = JK.eraModels || {});
  // 왕별 모형 파일(models-taejo.js 등)이 쓰는 도구
  JK.kit = { roof, hall, platform, archFace, gatePavilion, C };
  M.gyeongbok = gyeongbokgung;
  M.jongmyo = jongmyo;
  M.sungnye = sungnyemun;
  M.heungin = heunginjimun;

  /* ================= 성곽 한 마디 (인스턴싱) ================= */
  M.wallSegment = function () {
    const b = new JK.Builder();
    const L = 1.0,
      h = 0.34,
      t = 0.2;
    b.ao(-0.2, 0.45, 0.7);
    b.box(0, (h - 0.5) / 2 + 0.0, 0, L * 1.02, h + 0.5, t, C.stone, { top: C.stoneWarm, noBottom: true });
    // 돌 줄눈
    b.box(0, h * 0.35, t / 2 + 0.002, L, 0.012, 0.003, C.stoneDark);
    b.box(0, h * 0.7, t / 2 + 0.002, L, 0.012, 0.003, C.stoneDark);
    // 여장(바깥쪽 +z)
    for (let i = 0; i < 3; i++) {
      const x = -L / 2 + L / 6 + (L / 3) * i;
      b.box(x, h + 0.05, t / 2 - 0.03, L / 3 - 0.06, 0.1, 0.06, C.stone, { top: C.stoneWarm });
    }
    return b.build();
  };

  /* ================= 집 (인스턴싱) ================= */
  M.choga = function () {
    const b = new JK.Builder();
    b.ao(0, 0.3, 0.6);
    b.box(0, 0.025, 0, 0.66, 0.05, 0.38, C.stoneDark, { top: C.stoneWarm, noBottom: true });
    b.box(0, 0.05 + 0.13, 0, 0.58, 0.26, 0.3, C.mud, { noBottom: true });
    for (const x of [-0.29, 0.29]) for (const z of [-0.15, 0.15]) b.cyl(x, 0.05, z, 0.02, 0.02, 0.26, 4, C.wood, { noTop: true });
    // 문과 창
    b.quad([-0.17, 0.06, 0.152], [-0.05, 0.06, 0.152], [-0.05, 0.25, 0.152], [-0.17, 0.25, 0.152], C.woodDark);
    b.kind(2);
    b.quad([0.06, 0.13, 0.152], [0.2, 0.13, 0.152], [0.2, 0.24, 0.152], [0.06, 0.24, 0.152], C.paper);
    b.kind(0);
    b.ao(0, 0, 1);
    b.push().t(0, 0.31, 0);
    roof(b, { type: 'hip', w: 0.4, d: 0.27, h: 0.24, r: 0.14, lift: 0.0, ridgeLift: 0.0, convex: true, nu: 4, nv: 3, color: C.straw, tiles: false, thick: 0.05, soffit: false, ridgeColor: C.strawDark, ridgeW: 0.05 });
    b.pop();
    // 장독대
    b.ao(0, 0.12, 0.65);
    b.ball(0.38, 0.05, 0.08, 0.055, 0, C.jar, 0.9);
    b.ball(0.42, 0.04, -0.04, 0.045, 0, C.jar, 0.9);
    return b.build();
  };

  M.giwa = function () {
    const b = new JK.Builder();
    b.ao(0, 0.3, 0.62);
    b.box(0, 0.035, 0, 0.82, 0.07, 0.44, C.stoneDark, { top: C.stone, noBottom: true });
    b.box(0, 0.07 + 0.14, 0, 0.74, 0.28, 0.34, C.wallWhite, { noBottom: true });
    for (const x of [-0.37, -0.12, 0.12, 0.37]) for (const z of [-0.17, 0.17]) b.cyl(x, 0.07, z, 0.022, 0.022, 0.28, 4, C.woodDark, { noTop: true });
    b.box(0, 0.33, 0, 0.78, 0.04, 0.38, C.woodDark);
    b.kind(2);
    b.quad([-0.33, 0.12, 0.172], [-0.15, 0.12, 0.172], [-0.15, 0.29, 0.172], [-0.33, 0.29, 0.172], C.paper);
    b.quad([0.15, 0.12, 0.172], [0.33, 0.12, 0.172], [0.33, 0.29, 0.172], [0.15, 0.29, 0.172], C.paper);
    b.kind(0);
    b.quad([-0.08, 0.08, 0.172], [0.08, 0.08, 0.172], [0.08, 0.29, 0.172], [-0.08, 0.29, 0.172], C.wood);
    b.ao(0, 0, 1);
    b.push().t(0, 0.35, 0);
    roof(b, { type: 'paljak', w: 0.54, d: 0.33, h: 0.26, r: 0.3, lift: 0.07, out: 0.035, nu: 6, nv: 3, dens: 30, v1: 0.55, color: C.tileHouse, ridgeColor: C.ridgeDark, soffitColor: C.wood, bw: 0.4, bd: 0.19, ridgeW: 0.035 });
    b.pop();
    b.ao(0, 0.12, 0.65);
    b.ball(-0.48, 0.05, 0.1, 0.055, 0, C.jar, 0.9);
    b.ball(-0.5, 0.04, -0.03, 0.045, 0, C.jar, 0.9);
    b.ball(-0.42, 0.035, -0.12, 0.04, 0, C.jar, 0.9);
    return b.build();
  };

  /* ================= 걷는 인형 모자 (인스턴싱) ================= */
  // gat(갓) paeraengi(패랭이) topknot(상투+수건) bun(쪽머리)
  M.walkerHatKinds = ['gat', 'paeraengi', 'topknot', 'bun'];
  M.walkerHat = function (kind) {
    const b = new JK.Builder();
    if (kind === 'gat') {
      const k = col('#1f1f24');
      b.cyl(0, 1.1, 0, 0.36, 0.34, 0.02, 10, k, { bottom: true });
      b.cyl(0, 1.12, 0, 0.12, 0.11, 0.17, 8, k);
    } else if (kind === 'paeraengi') {
      const s = col('#c9a466');
      b.cyl(0, 1.08, 0, 0.33, 0.13, 0.12, 8, s, { bottom: true });
      b.cyl(0, 1.2, 0, 0.13, 0.11, 0.05, 8, s);
    } else if (kind === 'topknot') {
      const k = col('#2a2420');
      b.ball(0, 1.17, 0, 0.065, 0, k);
      b.cyl(0, 1.06, 0, 0.2, 0.2, 0.03, 8, col('#f2eee2'));
    } else {
      const k = col('#2a2420');
      b.ball(0, 1.0, -0.17, 0.09, 0, k);
      b.ball(0, 1.06, 0, 0.19, 1, k, 0.55);
    }
    return b.build();
  };
  // 걷는 사람: 모자별 비율과 옷 색
  M.walkerMix = [
    { hat: 'gat', p: 0.18, clothes: ['#d7e8e0', '#e9eef0', '#c9dcea', '#e7e1f0'] },
    { hat: 'paeraengi', p: 0.24, clothes: ['#a8774f', '#b88a5b', '#8f6a4a', '#c39a6a'] },
    { hat: 'topknot', p: 0.33, clothes: ['#efe8d8', '#e6dcc6', '#f2ede2', '#ddd2bb'] },
    { hat: 'bun', p: 0.25, clothes: ['#e98f8f', '#f2c86b', '#9cc9a8', '#efa3b8', '#f3e9d8'] },
  ];

  /* ================= 초상화 인형: 모자와 소품 ================= */
  // 인물 = { cloth, trim, hat, items[] } (eras/joseon/data/roles.js). 몸은 엔진의 JK.dollBase.
  const HATS = {
    // 익선관: 앞은 낮고 뒤는 높은 모자, 뒤에 위로 선 매미 날개 두 장
    ikseongwan(b) {
      const k = col('#1d1d23');
      b.push().t(0, 1.0, 0);
      b.cyl(0, 0.07, 0, 0.212, 0.205, 0.07, 20, k);
      b.ball(0, 0.13, 0.02, 0.19, 2, k, 0.55);
      b.cyl(0, 0.1, -0.07, 0.15, 0.13, 0.2, 18, k);
      b.ball(0, 0.3, -0.07, 0.13, 2, k, 0.45);
      for (const sx of [1, -1]) {
        b.push().t(sx * 0.085, 0.36, -0.17).rz(-sx * 0.35).rx(-0.2);
        b.s(0.85, 1.25, 0.12);
        b.ball(0, 0, 0, 0.085, 2, col('#26262e'));
        b.pop();
      }
      b.pop();
    },
    // 사모: 둥근 모자 + 옆으로 뻗은 납작한 날개
    samo(b) {
      const k = col('#1b1b20');
      b.push().t(0, 1.0, 0);
      b.cyl(0, 0.06, 0, 0.21, 0.2, 0.08, 18, k);
      b.ball(0, 0.15, -0.03, 0.16, 2, k, 0.8);
      for (const sx of [1, -1]) {
        b.push().t(sx * 0.27, 0.16, -0.1);
        b.s(1, 0.55, 0.12);
        b.ball(0, 0, 0, 0.13, 1, k);
        b.pop();
      }
      b.pop();
    },
    gat(b) {
      const k = col('#1c1c22');
      b.push().t(0, 1.0, 0);
      b.cyl(0, 0.14, 0, 0.4, 0.38, 0.018, 28, k, { bottom: true });
      b.cyl(0, 0.155, 0, 0.13, 0.12, 0.2, 16, k);
      b.box(0, 0.06, 0.17, 0.015, 0.16, 0.01, k);
      b.pop();
    },
    // 유생·선비의 유건(검은 두건)
    yugeon(b) {
      const k = col('#26252b');
      b.push().t(0, 1.0, 0);
      b.cyl(0, 0.05, 0, 0.21, 0.19, 0.16, 16, k);
      b.box(0, 0.27, -0.02, 0.3, 0.1, 0.2, k);
      b.pop();
    },
    paeraengi(b) {
      const straw = col('#c9a466');
      b.push().t(0, 1.0, 0);
      b.cyl(0, 0.12, 0, 0.36, 0.15, 0.12, 20, straw, { bottom: true });
      b.cyl(0, 0.24, 0, 0.15, 0.13, 0.05, 16, straw);
      b.pop();
    },
    towel(b) {
      const towel = col('#f6f2e8');
      b.push().t(0, 1.0, 0);
      b.cyl(0, 0.04, 0, 0.205, 0.205, 0.05, 18, towel);
      b.ball(0.2, 0.06, -0.06, 0.035, 1, towel);
      b.ball(0, 0.22, -0.02, 0.06, 1, col('#2a221d'));
      b.pop();
    },
    topknot(b) {
      b.ball(0, 1.22, -0.02, 0.06, 1, col('#2a221d'));
      b.cyl(0, 1.03, 0, 0.205, 0.205, 0.03, 18, col('#2a221d'));
    },
    // 아이: 땋은 머리와 붉은 댕기
    braid(b) {
      const k = col('#2a2420');
      b.ball(0, 1.04, -0.01, 0.205, 2, k, 0.6);
      b.cylAB([0, 0.98, -0.19], [0, 0.62, -0.27], 0.035, 0.03, 6, k);
      b.box(0, 0.6, -0.27, 0.06, 0.08, 0.02, col('#c0392b'));
    },
    bun(b) {
      const k = col('#2a2420');
      b.ball(0, 1.04, 0, 0.205, 2, k, 0.62);
      b.ball(0, 0.97, -0.2, 0.08, 1, k);
      b.box(0, 0.97, -0.2, 0.2, 0.02, 0.02, col('#d8b64e'));
    },
    // 투구(장수·군관, 설계서 7-3): 둥근 쇠 투구 + 꼭대기 장식 + 목을 가리는 드림
    helmet(b) {
      const iron = col('#3a3d44'),
        gold = col('#c99a2e');
      b.push().t(0, 1.0, 0);
      b.ball(0, 0.06, 0, 0.225, 2, iron, 0.75);
      b.cyl(0, 0.02, 0, 0.235, 0.235, 0.04, 20, gold);
      b.cyl(0, 0.22, 0, 0.03, 0.012, 0.16, 6, gold);
      b.ball(0, 0.38, 0, 0.03, 1, col('#c0392b'));
      // 드림: 뒤통수와 두 귀 옆만 가린다(얼굴은 열어 둠)
      const flap = col('#5a2a24');
      b.box(0, -0.08, -0.16, 0.42, 0.2, 0.1, flap);
      for (const sx of [1, -1]) b.box(sx * 0.215, -0.07, -0.05, 0.05, 0.18, 0.2, flap);
      b.pop();
    },
    // 털모자(이웃 나라 사람, 이름 없음 — 놀림감이 되지 않게 수수하게)
    furhat(b) {
      const fur = col('#7a5a3c');
      b.push().t(0, 1.0, 0);
      b.cyl(0, 0.03, 0, 0.24, 0.24, 0.12, 18, fur);
      b.ball(0, 0.12, 0, 0.2, 2, col('#5b4130'), 0.7);
      b.pop();
    },
    // 승려: 모자 없이 깎은 머리(살빛 둥근 머리 그대로) — 아무것도 얹지 않는다
    shaved() {},
  };
  const ITEMS = {
    // 곤룡포 보(가슴과 어깨의 금색 둥근 무늬)
    bo(b, R) {
      b.push().t(0, 0.62, 0.262).rx(Math.PI / 2 - 0.22);
      b.cyl(0, -0.004, 0, 0.1, 0.1, 0.014, 18, R.trim);
      b.cyl(0, 0.004, 0, 0.068, 0.068, 0.014, 16, col('#c9433a'));
      b.cyl(0, 0.01, 0, 0.03, 0.03, 0.012, 10, R.trim);
      b.pop();
      for (const sx of [1, -1]) {
        b.push().t(sx * 0.2, 0.72, 0.12).rz(-sx * 0.9).rx(0.5);
        b.cyl(0, 0, 0, 0.06, 0.06, 0.012, 14, R.trim);
        b.pop();
      }
    },
    okdae(b) {
      b.push().t(0, 0.4, 0.0).rx(0.1);
      b.cyl(0, 0, 0, 0.315, 0.315, 0.045, 20, col('#7a2a26'));
      for (let i = 0; i < 7; i++) {
        const a = Math.PI / 2 + (i - 3) * 0.3;
        b.ball(Math.cos(a) * 0.315, 0.022, Math.sin(a) * 0.315, 0.024, 1, col('#a8dcc8'));
      }
      b.pop();
    },
    // 단령 관복의 각대와 둥근 깃
    gakdae(b, R) {
      b.push().t(0, 0.4, 0).rx(0.15);
      b.cyl(0, 0, 0, 0.32, 0.32, 0.035, 20, R.trim);
      b.ball(0, 0.02, 0.32, 0.03, 0, col('#d8b64e'));
      b.pop();
      b.box(0, 0.72, 0.21, 0.24, 0.04, 0.04, R.cloth.clone().multiplyScalar(0.6));
    },
    hol(b) {
      b.push().t(0.02, 0.62, 0.32).rx(-0.25);
      b.box(0, 0, 0, 0.07, 0.32, 0.02, col('#efe6cf'));
      b.pop();
    },
    sejodae(b, R) {
      b.push().t(0, 0.56, 0.0).rx(0.1);
      b.cyl(0, 0, 0, 0.29, 0.29, 0.025, 20, R.trim);
      b.pop();
      b.box(0.06, 0.44, 0.31, 0.02, 0.2, 0.02, R.trim);
      b.box(0.1, 0.42, 0.3, 0.02, 0.18, 0.02, R.trim);
    },
    fan(b) {
      b.push().t(-0.1, 0.55, 0.33).rz(0.5);
      b.box(0, 0, 0, 0.04, 0.26, 0.025, col('#8a5a3b'));
      b.pop();
    },
    belt(b, R) {
      b.push().t(0, 0.62, 0).rx(0.05);
      b.cyl(0, 0, 0, 0.27, 0.27, 0.03, 20, R.trim);
      b.pop();
    },
    rice(b) {
      const rice = col('#e2b85a'),
        riceD = col('#b98d3a');
      b.push().t(0.24, 0.55, 0.28).rz(-0.35);
      b.cyl(0, -0.15, 0, 0.06, 0.07, 0.3, 8, riceD);
      b.box(0, 0.0, 0, 0.15, 0.02, 0.15, col('#7a5a2f'));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        b.push().t(Math.cos(a) * 0.04, 0.15, Math.sin(a) * 0.04).rz(Math.cos(a) * 0.6).rx(Math.sin(a) * 0.6);
        b.cyl(0, 0, 0, 0.02, 0.006, 0.17, 4, rice);
        b.pop();
      }
      b.pop();
    },
    cotton(b) {
      b.ball(0.2, 1.2, 0.08, 0.06, 1, col('#fbfaf6'));
      b.ball(-0.2, 1.2, 0.08, 0.06, 1, col('#fbfaf6'));
    },
    bundle(b) {
      b.box(0.12, 0.62, 0.25, 0.04, 0.3, 0.03, col('#3b4f7a'));
      b.box(-0.12, 0.62, 0.25, 0.04, 0.3, 0.03, col('#3b4f7a'));
      b.ball(0, 0.62, -0.3, 0.22, 1, col('#3b5384'), 0.85);
      b.ball(0, 0.78, -0.33, 0.06, 1, col('#2d3f66'));
    },
    broom(b) {
      b.cylAB([0.3, 0.2, 0.25], [0.18, 0.95, 0.3], 0.014, 0.014, 5, col('#8a5a3b'));
      b.cylAB([0.33, -0.02, 0.24], [0.3, 0.2, 0.25], 0.07, 0.025, 6, col('#c9a466'));
    },
    // 사관의 두루마리
    scroll(b) {
      b.push().t(0.0, 0.55, 0.36).rz(Math.PI / 2);
      b.cyl(0, -0.16, 0, 0.045, 0.045, 0.32, 10, col('#f3ead2'), { bottom: true });
      b.cyl(0, -0.19, 0, 0.02, 0.02, 0.38, 6, col('#8a5a3b'), { bottom: true });
      b.pop();
    },
    brush(b) {
      b.push().t(-0.17, 0.62, 0.33).rz(0.35);
      b.cyl(0, 0, 0, 0.012, 0.012, 0.22, 6, col('#7a5236'));
      b.cyl(0, 0.22, 0, 0.022, 0.0, 0.06, 6, col('#1e1e22'));
      b.pop();
    },
    // 갑옷: 가슴과 어깨에 작은 쇠 미늘(줄줄이)
    armor(b) {
      const plate = col('#4a4e58'),
        lace = col('#9a3d3a');
      for (let r = 0; r < 4; r++)
        for (let i = -3; i <= 3; i++) {
          const a = i * 0.28;
          b.box(Math.sin(a) * 0.3, 0.42 + r * 0.09, Math.cos(a) * 0.3, 0.07, 0.07, 0.015, r % 2 ? plate : lace);
        }
      for (const sx of [1, -1]) {
        b.push().t(sx * 0.27, 0.76, 0.02).rz(-sx * 0.6);
        b.box(0, 0, 0, 0.16, 0.05, 0.22, plate);
        b.pop();
      }
    },
    bow(b) {
      b.cylAB([-0.3, 0.3, -0.05], [-0.36, 0.62, 0.0], 0.012, 0.012, 4, col('#6a4030'));
      b.cylAB([-0.36, 0.62, 0.0], [-0.3, 0.94, -0.05], 0.012, 0.012, 4, col('#6a4030'));
      b.cylAB([-0.3, 0.3, -0.05], [-0.3, 0.94, -0.05], 0.004, 0.004, 3, col('#efe6cf'));
    },
    // 가사: 장삼 위에 한쪽 어깨로 걸친 붉은 천
    kasaya(b) {
      b.push().t(0, 0.6, 0.02).rz(0.55);
      b.box(0, 0, 0.26, 0.12, 0.62, 0.03, col('#a8382e'));
      b.box(0, 0, -0.26, 0.12, 0.62, 0.03, col('#a8382e'));
      b.pop();
    },
    beads(b) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        b.ball(Math.cos(a) * 0.09, 0.62 + Math.sin(a) * 0.12, 0.3, 0.018, 0, col('#5a3a28'));
      }
    },
    furcoat(b) {
      b.push().t(0, 0.72, 0).rx(0.05);
      b.cyl(0, 0, 0, 0.3, 0.3, 0.08, 16, col('#8a6a48'));
      b.pop();
      b.push().t(0, 0.36, 0);
      b.cyl(0, 0, 0, 0.33, 0.33, 0.06, 16, col('#8a6a48'));
      b.pop();
    },
    hammer(b) {
      b.cylAB([0.26, 0.38, 0.28], [0.3, 0.72, 0.3], 0.014, 0.014, 5, col('#8a5a3b'));
      b.box(0.3, 0.74, 0.3, 0.12, 0.06, 0.06, col('#5a5f68'));
    },
    book(b) {
      b.push().t(0.0, 0.52, 0.36).rx(-0.4);
      b.box(0, 0, 0, 0.24, 0.17, 0.04, col('#b7884e'));
      b.box(0, 0, 0.022, 0.2, 0.14, 0.004, col('#f1e6c9'));
      b.pop();
    },
  };
  M.HATS = HATS;
  M.ITEMS = ITEMS;
  M.portraitDoll = function (R) {
    const b = new JK.Builder();
    const look = { cloth: col(R.cloth), trim: col(R.trim || '#d8b64e') };
    JK.dollBase(b, look.cloth, 20);
    if (R.hat && HATS[R.hat]) HATS[R.hat](b, look);
    for (const it of R.items || []) if (ITEMS[it]) ITEMS[it](b, look);
    return b.build();
  };
})();
