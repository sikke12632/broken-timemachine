/* icons.js — 캔버스에 그리는 작은 그림 (전개도 그림 6가지, 시대 기호 4가지)
 * 3D 상자 면과 기술자의 종이 전개도, 시대 다이얼 단추에 같은 그림을 쓴다.
 * JK.drawIcon(g, 이름, 가운데 x, 가운데 y, 크기)
 */
(function () {
  'use strict';
  const JK = window.JK;
  function star(g, x, y, r, k) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * (k || 0.45) : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  }
  const D = {
    sun(g, x, y, s) {
      g.fillStyle = '#f2a93b';
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        g.save();
        g.translate(x + Math.cos(a) * s * 0.36, y + Math.sin(a) * s * 0.36);
        g.rotate(a);
        g.fillRect(-s * 0.08, -s * 0.035, s * 0.16, s * 0.07);
        g.restore();
      }
      g.fillStyle = '#f7c948';
      g.beginPath();
      g.arc(x, y, s * 0.24, 0, Math.PI * 2);
      g.fill();
    },
    moon(g, x, y, s) {
      // 큰 동그라미에서 작은 동그라미를 뺀 초승달 (배경을 지우지 않는다)
      g.beginPath();
      g.arc(x, y, s * 0.32, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = '#e9c85a';
      g.beginPath();
      g.rect(x - s, y - s, s * 2, s * 2);
      g.arc(x + s * 0.16, y - s * 0.08, s * 0.28, 0, Math.PI * 2, true);
      g.fill('evenodd');
    },
    star(g, x, y, s) {
      g.fillStyle = '#f2c230';
      star(g, x, y, s * 0.38);
      g.fill();
      g.strokeStyle = '#c9922a';
      g.lineWidth = s * 0.03;
      g.stroke();
    },
    flower(g, x, y, s) {
      g.fillStyle = '#e87a9a';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        g.beginPath();
        g.arc(x + Math.cos(a) * s * 0.17, y + Math.sin(a) * s * 0.17, s * 0.14, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#f7d35a';
      g.beginPath();
      g.arc(x, y, s * 0.1, 0, Math.PI * 2);
      g.fill();
    },
    fish(g, x, y, s) {
      g.fillStyle = '#4f8fd0';
      g.beginPath();
      g.ellipse(x - s * 0.04, y, s * 0.28, s * 0.16, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(x + s * 0.2, y);
      g.lineTo(x + s * 0.4, y - s * 0.15);
      g.lineTo(x + s * 0.4, y + s * 0.15);
      g.closePath();
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(x - s * 0.18, y - s * 0.04, s * 0.045, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1d2a3a';
      g.beginPath();
      g.arc(x - s * 0.18, y - s * 0.04, s * 0.022, 0, Math.PI * 2);
      g.fill();
    },
    tree(g, x, y, s) {
      g.fillStyle = '#8a5634';
      g.fillRect(x - s * 0.05, y + s * 0.05, s * 0.1, s * 0.3);
      g.fillStyle = '#46a659';
      g.beginPath();
      g.moveTo(x, y - s * 0.38);
      g.lineTo(x + s * 0.28, y + s * 0.1);
      g.lineTo(x - s * 0.28, y + s * 0.1);
      g.closePath();
      g.fill();
    },
    cloud(g, x, y, s) {
      g.fillStyle = '#9fb4c8';
      for (const [dx, dy, r] of [[-0.16, 0.04, 0.15], [0.0, -0.06, 0.19], [0.17, 0.03, 0.15]]) {
        g.beginPath();
        g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
        g.fill();
      }
      g.fillRect(x - s * 0.3, y + s * 0.02, s * 0.6, s * 0.15);
    },
  };
  JK.drawIcon = function (g, name, x, y, s) {
    g.save();
    D[name](g, x, y, s);
    g.restore();
  };
  JK.iconURL = function (name, size, bg) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, size, size);
    }
    JK.drawIcon(g, name, size / 2, size / 2, size);
    return cv.toDataURL();
  };
  JK.starPath = star;
})();
