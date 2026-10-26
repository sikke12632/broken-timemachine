// 씨앗 난수 (모든 화면이 같은 씨앗으로 같은 퍼즐을 만든다)
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (R, a) => a[Math.floor(R() * a.length)];
export function shuffle(R, a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// 씨앗 섞기: 판 씨앗 + 단계 + 칸 → 장치 씨앗
export const mix = (...xs) => xs.reduce((h, x) => Math.imul(h ^ (x >>> 0), 2654435761) >>> 0, 0x9e3779b9) || 1;
