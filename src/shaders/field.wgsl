// 저해상도 필드 패스.
//
// 흐름장(fbm)과 떠다니는 빛 무리(drift)는 둘 다 저주파라 픽셀마다 새로 풀 이유가 없다.
// 전체 해상도의 1/4 로 그린 뒤 본 패스에서 선형 보간으로 읽으면 화면상 차이가 없으면서
// 이 계산이 닿는 픽셀 수가 16분의 1이 된다. 이 셰이더가 전체 비용의 대부분이었다.
//
// 출력: R = crest(흐름 마루), G = activity(빛 무리)

import { Params } from "./lib/params.wgsl";
import { fbm } from "./lib/noise.wgsl";
import { spaceOf } from "./lib/space.wgsl";

@group(0) @binding(0) var<uniform> params: Params;

// 화면을 아주 느리게 떠다니는 빛 무리. 잎사귀 사이로 든 볕처럼 읽히게 한다.
// 가우시안이라 경계가 없다 — 원이 아니라 기척으로 보여야 한다.
fn drift(p: vec2f, center: vec2f, radius: f32) -> f32 {
  let d = length(p - center) / radius;
  return exp(-d * d * 2.2);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let s = spaceOf(params, uv);

  // ── 흐름장 ────────────────────────────────────────────────────────
  let flowSpeed = mix(0.055, 0.115, s.ease);
  let flow = fbm(s.g * 0.30 + vec2f(0.0, -params.time * flowSpeed));
  let crest = smoothstep(0.50, 0.78, flow);

  // ── 떠다니는 빛 무리 ──────────────────────────────────────────────
  // 주기가 서로 안 맞는 세 개를 겹쳐 반복 패턴이 눈에 띄지 않게 한다.
  // 진폭을 종횡비에 맞춰 세로 화면에서도 무리가 화면 밖으로 나가지 않는다.
  let t = params.time;
  let ax = s.aspect * 0.32;
  let ay = 0.30;
  let glow =
    drift(s.centered, vec2f(sin(t * 0.061) * ax, cos(t * 0.047) * ay), 0.42) * 0.55 +
    drift(s.centered, vec2f(cos(t * 0.043 + 2.1) * ax, sin(t * 0.055 + 1.3) * ay), 0.34) * 0.45 +
    drift(s.centered, vec2f(sin(t * 0.033 + 4.2) * ax, cos(t * 0.039 + 3.7) * ay), 0.52) * 0.38;
  // 격자가 빽빽해지는 아래쪽에서는 조금 물러난다.
  let activity = clamp(glow, 0.0, 1.0) * (1.0 - 0.35 * s.ease);

  return vec4f(crest, activity, 0.0, 1.0);
}
