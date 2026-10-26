/* dev-maze.js — 배관 미로 (조종사 화면, 보기 'device')
 * 놋쇠 틀 안의 칸 판. 벽은 안 보이고 공(시작)·출구(소용돌이)·초록 고리 2개와 줄·칸 번호만 보인다.
 * 화살표로 넣은 길은 점선으로 미리 보인다(setPath). "출발"하면 공이 길을 따라 굴러가고(run),
 * 벽에 부딪히면 불꽃이 튀고 시작으로 돌아간다.
 */
(function () {
  'use strict';
  const JK = window.JK;
  const T = THREE;
  const TAU = Math.PI * 2;
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const SZ = 0.5; // 판 크기
  const STEP_MS = 140;

  let root = null,
    inst = null,
    tex = null,
    ball = null,
    path = [];
  const cellXY = (x, y) => {
    const cs = SZ / inst.N;
    return [-SZ / 2 + (x + 0.5) * cs, SZ / 2 - (y + 0.5) * cs];
  };

  // 판 그림: 칸, 번호, 초록 고리, 출구, 미리 보는 길
  function draw() {
    const cv = tex.image;
    const g = cv.getContext('2d');
    const px = cv.width,
      pad = 56,
      N = inst.N,
      cs = (px - pad - 12) / N;
    g.fillStyle = '#2f3b3a';
    g.fillRect(0, 0, px, px);
    g.fillStyle = '#f3d58a';
    g.font = '34px TMTitle, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < N; i++) {
      g.fillText(String(i + 1), pad + i * cs + cs / 2, pad / 2 + 2);
      g.fillText(String(i + 1), pad / 2, pad + i * cs + cs / 2);
    }
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        g.fillStyle = (x + y) % 2 ? '#3f8f8a' : '#46998f';
        g.fillRect(pad + x * cs + 2, pad + y * cs + 2, cs - 4, cs - 4);
      }
    const C = (x, y) => [pad + x * cs + cs / 2, pad + y * cs + cs / 2];
    for (const [x, y] of inst.maps[inst.answer].marks) {
      const [cx, cy] = C(x, y);
      g.strokeStyle = '#7dff9a';
      g.lineWidth = 9;
      g.beginPath();
      g.arc(cx, cy, cs * 0.3, 0, TAU);
      g.stroke();
    }
    // 출구: 보라 소용돌이
    const [ex, ey] = C(...inst.exit);
    const gr = g.createRadialGradient(ex, ey, 2, ex, ey, cs * 0.45);
    gr.addColorStop(0, '#fff6d8');
    gr.addColorStop(0.4, '#b8a4ff');
    gr.addColorStop(1, '#4a3f9a');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(ex, ey, cs * 0.42, 0, TAU);
    g.fill();
    g.fillStyle = '#fff';
    g.font = `${Math.round(cs * 0.28)}px TMTitle, serif`;
    g.fillText('출구', ex, ey + 2);
    // 넣은 길 (점선)
    let [x, y] = inst.start;
    g.strokeStyle = '#ffe27a';
    g.lineWidth = 8;
    g.setLineDash([14, 10]);
    g.beginPath();
    g.moveTo(...C(x, y));
    for (const d of path) {
      x += DIRS[d][0];
      y += DIRS[d][1];
      g.lineTo(...C(x, y));
    }
    g.stroke();
    g.setLineDash([]);
    tex.needsUpdate = true;
  }

  const Dv = (JK.Devices = JK.Devices || {});
  Dv.maze = {
    view: 'device',
    build(data) {
      this.clear();
      inst = data;
      path = [];
      const S = JK.Scene;
      const P = S.P;
      root = new T.Group();
      root.position.set(0, 0.07, 0);
      root.scale.setScalar(0.74);
      S.slot.add(root);
      const b = new JK.Builder();
      b.box(0, 0, -0.05, SZ + 0.12, SZ + 0.12, 0.08, P.brassDark, { front: P.brass });
      b.box(0, -SZ / 2 - 0.12, -0.12, SZ * 0.7, 0.12, 0.16, P.panelDark);
      // 네 귀퉁이 관(배관 느낌)
      for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        b.push().t((x * (SZ + 0.12)) / 2, (y * (SZ + 0.12)) / 2, 0);
        b.ball(0, 0, 0, 0.035, 1, P.copper);
        b.pop();
      }
      b.cylAB([-(SZ + 0.12) / 2, (SZ + 0.12) / 2, 0.0], [-(SZ + 0.12) / 2 - 0.1, (SZ + 0.12) / 2 + 0.1, -0.05], 0.022, 0.022, 10, S.P.copper);
      b.cylAB([(SZ + 0.12) / 2, -(SZ + 0.12) / 2, 0.0], [(SZ + 0.12) / 2 + 0.1, -(SZ + 0.12) / 2 - 0.1, -0.05], 0.022, 0.022, 10, S.P.copper);
      const frame = new T.Mesh(b.build(), S.MATD);
      frame.castShadow = frame.receiveShadow = true;
      root.add(frame);
      const cv = document.createElement('canvas');
      cv.width = cv.height = 768;
      tex = new T.CanvasTexture(cv);
      tex.colorSpace = T.SRGBColorSpace;
      tex.anisotropy = 4;
      draw();
      // 그림판은 번호 칸(왼쪽·위)까지 포함해 조금 크다: 칸 영역이 SZ 가 되게 맞춘다
      const full = (SZ * 768) / (768 - 56 - 12);
      const board = new T.Mesh(new T.PlaneGeometry(full, full), new T.MeshBasicMaterial({ map: tex }));
      const off = ((56 - 12) / 2 / 768) * full;
      board.position.set(-off, off, 0.0);
      root.add(board);
      ball = new T.Mesh(new T.SphereGeometry((SZ / inst.N) * 0.28, 16, 12), new T.MeshLambertMaterial({ color: '#ffd23a', emissive: new T.Color('#a06a00') }));
      ball.castShadow = true;
      root.add(ball);
      this.anim = null;
      this.place(...inst.start);
      if (!this.hooked) {
        this.hooked = true;
        S.frameHooks.push((t) => this.frame(t));
      }
    },
    place(x, y) {
      const [px, py] = cellXY(x, y);
      ball.position.set(px, py, 0.035);
    },
    setPath(p) {
      if (!root) return;
      path = p.slice();
      draw();
    },
    // 길 따라 굴리기. 돌려주는 값: 연출이 걸리는 시간(ms)
    run(p, ok) {
      if (!root) return 0;
      const map = inst.maps[inst.answer].open;
      let [x, y] = inst.start;
      const pts = [[x, y]];
      let hit = null;
      for (const d of p) {
        if (!map[y][x].includes(d)) {
          hit = d;
          break;
        }
        x += DIRS[d][0];
        y += DIRS[d][1];
        pts.push([x, y]);
      }
      this.anim = { pts, hit, t0: performance.now(), ok };
      return pts.length * STEP_MS + (ok ? 500 : 900);
    },
    frame(t) {
      if (!root) return;
      ball.rotation.z = -t * 2;
      const a = this.anim;
      if (!a) {
        ball.position.z = 0.035 + Math.sin(t * 3) * 0.004;
        return;
      }
      const k = (performance.now() - a.t0) / STEP_MS;
      const i = Math.min(Math.floor(k), a.pts.length - 1);
      const f = Math.min(1, k - i);
      const [x0, y0] = a.pts[i];
      const [x1, y1] = a.pts[Math.min(i + 1, a.pts.length - 1)];
      const [p0x, p0y] = cellXY(x0, y0),
        [p1x, p1y] = cellXY(x1, y1);
      ball.position.set(p0x + (p1x - p0x) * f, p0y + (p1y - p0y) * f, 0.035);
      if (k >= a.pts.length - 1) {
        const over = k - (a.pts.length - 1);
        if (a.hit) {
          // 벽에 쿵: 그쪽으로 살짝 튀었다가 시작으로
          const [dx, dy] = DIRS[a.hit];
          const bump = Math.sin(Math.min(1, over / 2) * Math.PI) * 0.025;
          ball.position.x += dx * bump;
          ball.position.y -= dy * bump;
          ball.material.emissive.set(over < 3 ? '#ff3020' : '#a06a00');
          if (over > 5) {
            this.anim = null;
            ball.material.emissive.set('#a06a00');
            this.place(...inst.start);
          }
        } else if (!a.ok && over > 4) {
          // 출구에서 안 멈춤: 시작으로
          this.anim = null;
          this.place(...inst.start);
        } else if (a.ok) ball.scale.setScalar(Math.max(0.01, 1 - over * 0.25)); // 출구로 쏙
      }
    },
    clear() {
      if (!root) return;
      root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach((m) => m.map && m.map.dispose());
      });
      root.parent.remove(root);
      root = ball = tex = inst = null;
      this.anim = null;
    },
  };
})();
