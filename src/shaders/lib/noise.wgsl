// 저해상도 필드 패스 전용 노이즈. 본 패스는 이 파일을 쓰지 않는다 —
// fbm 은 픽셀당 비용이 커서 전체 해상도에서 돌리면 안 된다.

// Hash without Sine. sin() 기반 해시는 GPU 별로 결과가 갈려서 쓰지 않는다.
export fn hash21(p: vec2f) -> f32 {
  var q = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

fn noise2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = hash21(i);
  let b = hash21(i + vec2f(1.0, 0.0));
  let c = hash21(i + vec2f(0.0, 1.0));
  let d = hash21(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 옥타브 3개. 4번째 옥타브는 진폭이 0.0625 라 뒤이어 걸리는
// smoothstep(0.50, 0.78) 을 지나면 사실상 사라진다 — 값은 못 바꾸고 비용만 낸다.
export fn fbm(p: vec2f) -> f32 {
  var acc = 0.0;
  var amp = 0.5;
  var q = p;
  for (var i = 0; i < 3; i++) {
    acc += amp * noise2(q);
    q = q * 2.02 + vec2f(1.7, 9.2);
    amp *= 0.5;
  }
  return acc;
}
