/* relics.js — 시대 다이얼의 유물 12가지 (코드로 쌓은 로우폴리, 높이 약 1)
 * 모양의 근거: 초등 사회 5-2 교과서 사진과 한국민족문화대백과사전 설명(game/CREDITS.md).
 * JK.Relics.geo(id) → 지오메트리, JK.Relics.thumb(id) → 기록관 안내서에 쓰는 작은 그림(dataURL)
 */
(function () {
  'use strict';
  const JK = window.JK;
  const T = THREE;
  const col = JK.col;
  const TAU = Math.PI * 2;

  const C = {
    stone: col('#a9a397'),
    stone2: col('#bdb6a8'),
    grass: col('#86b864'),
    bronze: col('#6f9a82'),
    bronze2: col('#557a66'),
    pot: col('#b07a52'),
    pot2: col('#8f5f3e'),
    gold: col('#e3b341'),
    gold2: col('#c9952e'),
    jade: col('#3fae7a'),
    celadon: col('#8dbfae'),
    celadon2: col('#7aae9c'),
    white: col('#f4efe2'),
    ink: col('#2e2a26'),
    wood: col('#b0824f'),
    wood2: col('#7e5634'),
    paper: col('#d9b979'),
    dark: col('#4e5656'),
    water: col('#6fb3c9'),
    red: col('#a8483a'),
  };
  // 둥근 받침(모든 유물 공통): 떠 있는 작은 땅
  function base(b, r) {
    b.cyl(0, -0.08, 0, r, r * 1.04, 0.08, 18, C.stone2, { top: C.grass });
    b.cyl(0, -0.3, 0, r * 0.3, r, 0.22, 18, col('#9a7350'));
  }
  // 앞뒤로 납작한 판 모양(칼날 등): 왼쪽 윤곽 pts [[반폭, y], …], 두께 t
  function blade(b, pts, t, color, ridge) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [w0, y0] = pts[i],
        [w1, y1] = pts[i + 1];
      for (const s of [1, -1]) {
        // 가운데 등줄(두꺼움) → 날(얇음)
        b.quad([0, y0, s * t], [s * w0, y0, 0], [s * w1, y1, 0], [0, y1, s * t], color);
        b.quad([0, y0, -s * t], [0, y1, -s * t], [s * w1, y1, 0], [s * w0, y0, 0], color);
      }
      if (ridge) b.box(0, (y0 + y1) / 2, 0, 0.012, y1 - y0, t * 2.2, ridge);
    }
  }

  const MAKE = {
    dolmen(b) {
      base(b, 0.62);
      b.ao(0, 0.6, 0.7);
      b.push().rz(0.04);
      b.box(-0.3, 0.27, 0, 0.12, 0.56, 0.5, C.stone);
      b.pop();
      b.box(0.3, 0.27, 0.02, 0.13, 0.56, 0.46, C.stone);
      b.ao(0, 0, 1);
      b.push().t(0, 0.62, 0).rz(-0.05).ry(0.1);
      b.box(0, 0, 0, 1.05, 0.13, 0.78, C.stone2, { top: col('#c8c2b4') });
      b.pop();
    },
    dagger(b) {
      base(b, 0.32);
      b.push().t(0, 0.02, 0).rz(0.18);
      // 손잡이(따로 끼우는 것) + 칼날: 아래가 볼록하고 가운데 돌기, 위로 갈수록 좁아짐
      b.cyl(0, 0, 0, 0.05, 0.045, 0.2, 8, C.wood2);
      b.box(0, 0.21, 0, 0.16, 0.03, 0.07, C.bronze2);
      blade(
        b,
        [
          [0.07, 0.22],
          [0.14, 0.34],
          [0.15, 0.44],
          [0.11, 0.52],
          [0.13, 0.56],
          [0.09, 0.66],
          [0.075, 0.82],
          [0.05, 0.94],
          [0.0, 1.02],
        ],
        0.03,
        C.bronze,
        C.bronze2
      );
      b.pop();
    },
    misong(b) {
      base(b, 0.42);
      const p = C.pot,
        q = C.pot2;
      b.lathe(
        [
          [0.0, 0.0, q],
          [0.13, 0.0, q],
          [0.24, 0.12, p],
          [0.31, 0.26, q],
          [0.3, 0.34, p],
          [0.24, 0.46, q],
          [0.15, 0.55, p],
          [0.13, 0.62, p],
          [0.17, 0.72, q],
          [0.15, 0.72, q],
        ],
        16
      );
      for (const s of [1, -1]) {
        b.push().t(s * 0.3, 0.33, 0).rz(s * 0.3);
        b.box(0, 0, 0, 0.1, 0.05, 0.08, q);
        b.pop();
      }
    },
    cheomseong(b) {
      base(b, 0.48);
      b.box(0, 0.04, 0, 0.62, 0.08, 0.62, C.stone);
      b.box(0, 0.11, 0, 0.56, 0.06, 0.56, C.stone2);
      // 돌을 한 단씩 쌓은 병 모양 몸통
      const prof = [];
      const N = 14;
      for (let i = 0; i <= N; i++) {
        const y = 0.14 + (i / N) * 0.74;
        const t = i / N;
        const r = 0.26 - 0.1 * t * t + (t < 0.3 ? 0.02 * (1 - t / 0.3) : 0);
        prof.push([r, y, i % 2 ? col('#d9ccb0') : col('#cbbd9f')]);
      }
      prof.push([0.13, 0.88, col('#cbbd9f')]);
      b.lathe(prof, 16);
      b.box(0, 0.46, 0.23, 0.1, 0.1, 0.06, C.ink); // 가운데 네모 창
      // 꼭대기 우물 정 모양 돌 틀
      for (const y of [0.9, 0.96])
        for (const s of [1, -1]) {
          b.box(s * 0.12, y, 0, 0.04, 0.05, 0.32, C.stone2);
          b.box(0, y + 0.03, s * 0.12, 0.32, 0.05, 0.04, C.stone2);
        }
    },
    crown(b) {
      base(b, 0.42);
      b.push().t(0, 0.1, 0);
      b.cyl(0, 0, 0, 0.3, 0.3, 0.1, 24, C.gold, { noTop: true });
      // 앞쪽 나뭇가지 모양 세움 장식 셋
      for (const a of [-0.9, 0, 0.9]) {
        b.push().ry(a).t(0, 0.08, 0.29);
        b.box(0, 0.32, 0, 0.04, 0.58, 0.015, C.gold);
        for (const y of [0.22, 0.38, 0.54]) {
          for (const s of [1, -1]) {
            b.box(s * 0.06, y, 0, 0.1, 0.03, 0.015, C.gold);
            b.box(s * 0.105, y + 0.05, 0, 0.03, 0.1, 0.015, C.gold);
          }
        }
        b.ball(0, 0.63, 0, 0.035, 0, C.gold2);
        // 초록 옥
        b.ball(0.06, 0.28, 0.02, 0.025, 0, C.jade);
        b.ball(-0.06, 0.44, 0.02, 0.025, 0, C.jade);
        b.pop();
      }
      // 뒤쪽 사슴뿔 모양 둘
      for (const s of [1, -1]) {
        b.push().ry(Math.PI + s * 0.7).t(0, 0.08, 0.29);
        b.cylAB([0, 0, 0], [0, 0.45, 0], 0.02, 0.018, 5, C.gold);
        b.cylAB([0, 0.2, 0], [s * 0.12, 0.36, 0], 0.015, 0.012, 5, C.gold);
        b.cylAB([0, 0.32, 0], [-s * 0.1, 0.48, 0], 0.015, 0.012, 5, C.gold);
        b.pop();
      }
      // 달개(작은 동그라미 장식)
      for (let i = 0; i < 24; i++) {
        const u = (i / 24) * TAU;
        b.ball(Math.cos(u) * 0.31, 0.05 + (i % 2) * 0.03, Math.sin(u) * 0.31, 0.018, 0, C.gold2);
      }
      // 늘어진 드리개
      for (const s of [1, -1]) {
        b.cylAB([s * 0.27, 0.0, 0.1], [s * 0.3, -0.05, 0.12], 0.012, 0.012, 4, C.gold);
        b.ball(s * 0.3, -0.06, 0.12, 0.03, 0, C.jade);
      }
      b.pop();
    },
    censer(b) {
      base(b, 0.36);
      const g = col('#c99a45'),
        g2 = col('#a87c34');
      // 받침(용이 몸을 튼 모양을 둥근 고리로)
      b.lathe([[0.0, 0.0, g2], [0.2, 0.0, g2], [0.2, 0.05, g], [0.12, 0.12, g2], [0.06, 0.2, g], [0.05, 0.3, g2], [0.0, 0.3, g2]], 14);
      b.push().t(0, 0.08, 0);
      for (let i = 0; i < 6; i++) {
        const u = (i / 6) * TAU;
        b.ball(Math.cos(u) * 0.12, 0.04 + (i % 2) * 0.05, Math.sin(u) * 0.12, 0.045, 0, g2);
      }
      b.pop();
      // 몸통(연꽃 그릇) + 뚜껑(겹겹 산)
      b.lathe([[0.04, 0.3, g], [0.2, 0.36, g], [0.27, 0.46, g2], [0.27, 0.5, g], [0.0, 0.5, g]], 16);
      b.lathe([[0.27, 0.5, g], [0.25, 0.6, g2], [0.18, 0.72, g], [0.08, 0.8, g2], [0.0, 0.82, g]], 16);
      const R = JK.rng(5);
      for (let k = 0; k < 18; k++) {
        const u = R() * TAU,
          h = 0.52 + R() * 0.22;
        const r = 0.27 * (1 - (h - 0.5) / 0.34) + 0.02;
        b.cyl(Math.cos(u) * r, h, Math.sin(u) * r, 0.05, 0.0, 0.08, 5, R() < 0.5 ? g : g2);
      }
      // 봉황
      b.push().t(0, 0.84, 0);
      b.ball(0, 0.06, 0, 0.06, 1, g, 1.2);
      b.ball(0.0, 0.16, 0.04, 0.03, 0, g);
      for (const s of [1, -1]) {
        b.push().t(s * 0.06, 0.08, -0.01).rz(s * 0.6);
        b.box(0, 0.06, 0, 0.03, 0.14, 0.08, g2);
        b.pop();
      }
      b.cylAB([0, 0.04, -0.05], [0, 0.0, -0.18], 0.02, 0.01, 4, g2);
      b.pop();
    },
    celadon(b) {
      base(b, 0.4);
      const c = C.celadon,
        c2 = C.celadon2;
      b.lathe(
        [
          [0.0, 0.0, c2],
          [0.17, 0.0, c2],
          [0.2, 0.08, c],
          [0.25, 0.3, c],
          [0.32, 0.58, c],
          [0.31, 0.68, c],
          [0.22, 0.8, c],
          [0.1, 0.86, c2],
          [0.08, 0.9, c],
          [0.11, 0.94, c],
          [0.09, 0.96, c2],
          [0.0, 0.96, c2],
        ],
        18
      );
      // 상감: 하얀 학과 검은 구름(작은 무늬로)
      const R = JK.rng(9);
      for (let k = 0; k < 16; k++) {
        const u = R() * TAU,
          y = 0.2 + R() * 0.5;
        const r = y < 0.58 ? 0.25 + ((y - 0.3) / 0.28) * 0.07 : 0.31;
        b.push().t(Math.cos(u) * (r + 0.005), y, Math.sin(u) * (r + 0.005)).ry(-u + Math.PI / 2);
        if (k % 3 === 2) b.box(0, 0, 0, 0.05, 0.015, 0.01, C.ink);
        else {
          b.box(0, 0, 0, 0.07, 0.02, 0.01, C.white);
          b.box(0.02, 0.02, 0, 0.012, 0.04, 0.01, C.white);
        }
        b.pop();
      }
    },
    tripitaka(b) {
      base(b, 0.5);
      b.push().t(0, 0.42, 0).rz(0.06);
      b.box(0, 0, 0, 0.82, 0.48, 0.06, C.wood);
      for (const s of [1, -1]) b.box(s * 0.44, 0, 0, 0.07, 0.56, 0.1, C.wood2);
      // 세로로 새긴 글자 줄
      for (let i = 0; i < 12; i++) {
        const x = -0.33 + i * 0.06;
        for (let j = 0; j < 7; j++) b.box(x, 0.18 - j * 0.058, 0.032, 0.035, 0.035, 0.008, C.wood2);
      }
      b.pop();
      b.box(0, 0.12, 0, 0.3, 0.1, 0.16, C.wood2);
    },
    jikji(b) {
      base(b, 0.44);
      b.push().t(-0.05, 0.35, 0).rz(0.08).rx(-0.15);
      b.box(0, 0, 0, 0.46, 0.62, 0.08, C.paper);
      b.box(0, 0, -0.045, 0.44, 0.6, 0.01, col('#efe2bf'));
      b.box(0.08, 0.12, 0.042, 0.1, 0.32, 0.005, C.white); // 제목 띠
      for (let i = 0; i < 5; i++) b.ball(-0.19, -0.26 + i * 0.13, 0.043, 0.012, 0, C.red); // 다섯 군데 꿰맨 실
      b.pop();
      // 금속 활자 몇 개
      for (let i = 0; i < 3; i++) b.box(0.28 + (i % 2) * 0.08, 0.05, 0.12 - i * 0.1, 0.07, 0.07, 0.07, col('#7f8a7c'), { top: col('#4e5a4c') });
    },
    sundial(b) {
      base(b, 0.44);
      const br = col('#6e5a3e'),
        br2 = col('#8a7450');
      // 다리 넷 + 받침 십자
      for (let i = 0; i < 4; i++) {
        const u = (i / 4) * TAU + Math.PI / 4;
        b.cylAB([Math.cos(u) * 0.3, 0.36, Math.sin(u) * 0.3], [Math.cos(u) * 0.34, 0.0, Math.sin(u) * 0.34], 0.03, 0.03, 6, br);
        b.ball(Math.cos(u) * 0.34, 0.02, Math.sin(u) * 0.34, 0.05, 0, br2);
      }
      b.box(0, 0.06, 0, 0.66, 0.04, 0.05, br);
      b.box(0, 0.06, 0, 0.05, 0.04, 0.66, br);
      // 오목한 솥 모양 그릇(안쪽은 밝게, 시각 줄)
      b.lathe([[0.36, 0.62, br2], [0.36, 0.58, br], [0.32, 0.46, br], [0.22, 0.36, br], [0.0, 0.32, br]], 20);
      b.lathe([[0.0, 0.36, br2], [0.2, 0.39, col('#cdb98a')], [0.3, 0.48, col('#cdb98a')], [0.34, 0.6, col('#d8c79b')], [0.36, 0.62, br2]], 20);
      for (let i = 0; i < 7; i++) {
        const u = -0.9 + i * 0.3;
        b.cylAB([Math.sin(u) * 0.12, 0.38, Math.cos(u) * 0.12 - 0.05], [Math.sin(u) * 0.32, 0.56, Math.cos(u) * 0.1], 0.006, 0.006, 3, col('#f2ead2'));
      }
      // 그림자 바늘(영침)
      b.cylAB([0, 0.62, -0.36], [0, 0.42, 0.0], 0.012, 0.01, 4, br);
    },
    raingauge(b) {
      base(b, 0.38);
      b.box(0, 0.16, 0, 0.42, 0.32, 0.42, C.stone2, { top: C.stone });
      b.box(0, 0.33, 0, 0.36, 0.03, 0.36, C.stone);
      const d = col('#4e5a5a');
      b.cyl(0, 0.34, 0, 0.12, 0.12, 0.58, 14, d, { noTop: true, bottom: true });
      for (const y of [0.52, 0.72]) b.cyl(0, y, 0, 0.13, 0.13, 0.03, 14, col('#6a7676'));
      b.cyl(0, 0.9, 0, 0.11, 0.11, 0.01, 14, col('#2a3434'));
    },
    turtleship(b) {
      b.cyl(0, -0.08, 0, 0.62, 0.66, 0.08, 20, C.water, { top: col('#8cc6d6') });
      b.push().t(0, 0.0, 0);
      // 배 몸통: 앞뒤가 좁아지는 상자
      const H = col('#8a5a3a'),
        H2 = col('#6e4429');
      const L = 0.52,
        W = 0.2;
      const pts = (y, w, l) => [[-l, y, 0], [-l * 0.8, y, w], [l * 0.8, y, w], [l, y, 0], [l * 0.8, y, -w], [-l * 0.8, y, -w]];
      const lo = pts(0.02, W * 0.7, L * 0.85),
        hi = pts(0.22, W, L);
      for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        b.quad(lo[i], lo[j], hi[j], hi[i], i % 3 === 0 ? H2 : H);
      }
      // 덮개(거북 등) + 뾰족한 쇠
      b.push().t(0, 0.22, 0).s(1, 0.75, 1);
      b.push().rz(Math.PI / 2);
      b.lathe([[0.0, -0.5, col('#5d6b62')], [0.2, -0.44, col('#5d6b62')], [0.22, 0.0, col('#6e7d70')], [0.2, 0.44, col('#5d6b62')], [0.0, 0.5, col('#5d6b62')]], 12);
      b.pop();
      b.pop();
      const R = JK.rng(3);
      for (let k = 0; k < 26; k++) {
        const x = -0.4 + R() * 0.8,
          u = (R() - 0.5) * 2.4;
        b.cyl(x, 0.22 + Math.cos(u) * 0.155, Math.sin(u) * 0.2, 0.012, 0.0, 0.05, 4, col('#d6d2c6'));
      }
      // 용머리
      b.push().t(L + 0.02, 0.26, 0);
      b.box(0, 0, 0, 0.12, 0.09, 0.1, H);
      b.ball(0.06, 0.03, 0, 0.06, 0, col('#c46a3e'));
      b.ball(0.1, 0.06, 0.03, 0.012, 0, C.ink);
      b.ball(0.1, 0.06, -0.03, 0.012, 0, C.ink);
      b.pop();
      // 노
      for (let i = 0; i < 5; i++)
        for (const s of [1, -1]) b.cylAB([-0.3 + i * 0.14, 0.1, s * 0.2], [-0.34 + i * 0.14, -0.06, s * 0.36], 0.01, 0.01, 3, H2);
      b.pop();
    },
  };

  const cache = {};
  const R = (JK.Relics = {
    ids: Object.keys(MAKE),
    geo(id) {
      if (!cache[id]) {
        const b = new JK.Builder();
        MAKE[id](b);
        cache[id] = b.build();
      }
      return cache[id];
    },
    mat: null,
    mesh(id) {
      R.mat = R.mat || JK.toyMaterial({ side: T.DoubleSide });
      const m = new T.Mesh(R.geo(id), R.mat);
      m.castShadow = true;
      return m;
    },
  });

  // 안내서 그림: 큰 장면의 렌더러를 빌려 작은 장면을 한 장씩 찍는다
  const thumbs = {};
  R.thumb = function (id) {
    if (thumbs[id]) return thumbs[id];
    const S = JK.Scene;
    const size = 192;
    const scene = new T.Scene();
    scene.background = new T.Color('#efe2c2');
    scene.add(new T.HemisphereLight(0xfff6e6, 0xcdb88c, 1.4));
    const sun = new T.DirectionalLight(0xffffff, 1.8);
    sun.position.set(2, 3, 3);
    scene.add(sun);
    const m = R.mesh(id);
    m.rotation.y = id === 'turtleship' ? -0.6 : 0.35;
    scene.add(m);
    const cam = new T.PerspectiveCamera(30, 1, 0.1, 20);
    cam.position.set(0, 1.05, 2.9);
    cam.lookAt(0, 0.38, 0);
    const rt = new T.WebGLRenderTarget(size, size, { samples: 4 });
    rt.texture.colorSpace = T.SRGBColorSpace;
    const r = S.renderer;
    const prev = r.getRenderTarget();
    r.setRenderTarget(rt);
    r.render(scene, cam);
    const px = new Uint8Array(size * size * 4);
    r.readRenderTargetPixels(rt, 0, 0, size, size, px);
    r.setRenderTarget(prev);
    rt.dispose();
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    const img = g.createImageData(size, size);
    // 렌더 타깃은 선형 색으로 나온다 → 화면 색(감마)으로 바꾸고 위아래를 뒤집는다
    const lut = new Uint8Array(256).map((_, v) => Math.round(255 * Math.pow(v / 255, 1 / 2.2)));
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size * 4; x++) {
        const v = px[(size - 1 - y) * size * 4 + x];
        img.data[y * size * 4 + x] = x % 4 === 3 ? 255 : lut[v];
      }
    g.putImageData(img, 0, 0);
    return (thumbs[id] = cv.toDataURL());
  };
})();
