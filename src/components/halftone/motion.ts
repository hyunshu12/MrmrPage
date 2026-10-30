/**
 * 인트로와 히어로가 같이 쓰는 이징과 점 간격 규칙.
 * 인트로의 로고가 히어로 마크 위에 같은 격자로 내려앉으려면 두 쪽이 같은 식을 써야 한다.
 */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
export const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 히어로 마크의 점 간격(CSS px). unit 은 마크 단위 1 의 CSS px 다. 인트로도 착지 순간 이 간격이 된다. */
export function heroCell(unit: number): number {
  return Math.max(unit / 21, 3.5);
}

/** 인트로가 처음 그리는 점 간격. 아주 작거나 큰 화면에서도 점이 너무 잘거나 굵지 않게 묶는다. */
export function introCell(unit: number): number {
  return Math.min(Math.max(unit / 21, 5), 12);
}
