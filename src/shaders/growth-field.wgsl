// 무럭무럭 홈 배경 — 자라나는 센서 격자 (본 패스)
//
// 세 레이어를 합성한다:
//   1. 베이스 그라디언트  기존 CSS .bg-gradient-home 을 그대로 재현한다.
//   2. 육각 격자 노드      로고의 육각형 배지에서 따온 삼각 격자의 교점.
//   3. 흐름·빛 무리        field.wgsl 이 1/4 해상도로 미리 그려 둔 것을 읽어 쓴다.
//
// scroll(0..1) 이 성장 단계를 정한다: 씨앗 → 발아 → 성장 → 무성.
// 모든 매핑은 단조 증가라, 위로 되감으면 역재생될 뿐 튀지 않는다.
//
// 이 패스는 전체 해상도에서 돈다. 그래서 fbm 을 부르지 않는다 — 저주파 성분은
// 전부 field 텍스처에 들어 있고 여기서는 격자처럼 선명해야 하는 것만 그린다.

import { Params } from "./lib/params.wgsl";
import { hash21 } from "./lib/noise.wgsl";
import { spaceOf } from "./lib/space.wgsl";

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var field: texture_2d<f32>;
@group(0) @binding(2) var fieldSampler: sampler;

// 브랜드 팔레트. 캔버스 포맷이 non-sRGB 라 감마 변환 없이 sRGB 값을 그대로 쓴다.
const CREAM = vec3f(1.0, 0.98431, 0.88627); // #fffbe2
const LIGHTEST = vec3f(0.89804, 0.94118, 0.75294); // #e5f0c0
const LIGHT = vec3f(0.62745, 0.78824, 0.63529); // #a0c9a2
const NODE = vec3f(0.40784, 0.54118, 0.27451); // #688a46 green-primary
const SPARK = vec3f(1.0, 0.99216, 0.89020); // #fffde3 cream-light

const TAU = 6.2831853;
const ROW = 1.7320508; // sqrt(3) — 삼각 격자의 행 간격

struct Node {
  off: vec2f, // 가장 가까운 노드까지의 벡터
  id: vec2f,  // 그 노드의 고유 좌표 (노드별 난수 시드)
}

// 삼각 격자 = 간격 1인 두 사각 격자를 반 칸 어긋나게 겹친 것.
// 두 후보 중 가까운 쪽이 답이다.
fn nearestNode(p: vec2f) -> Node {
  let s = vec2f(1.0, ROW);
  let half = s * 0.5;

  let idA = round(p / s);
  let offA = p - idA * s;

  let idB = round((p - half) / s);
  let offB = p - (idB * s + half);

  var n: Node;
  if (dot(offA, offA) <= dot(offB, offB)) {
    n.off = offA;
    n.id = idA;
  } else {
    n.off = offB;
    n.id = idB + vec2f(0.5, 0.5);
  }
  return n;
}

// 노드를 지나 방향 d 로 뻗는 짧은 연결선. |d| == 1 이라 외적이 곧 수직 거리다.
fn linkOne(off: vec2f, d: vec2f, w: f32) -> f32 {
  let perp = abs(off.x * d.y - off.y * d.x);
  let along = abs(dot(off, d));
  let line = 1.0 - smoothstep(0.0, w, perp);
  let seg = 1.0 - smoothstep(0.40, 0.52, along);
  return line * seg;
}

// 삼각 격자의 이웃 방향은 세 개뿐이다 (나머지 셋은 반대 방향이라 같은 선을 공유한다).
fn linkField(off: vec2f, w: f32) -> f32 {
  var acc = linkOne(off, vec2f(1.0, 0.0), w);
  acc = max(acc, linkOne(off, vec2f(0.5, 0.8660254), w));
  acc = max(acc, linkOne(off, vec2f(-0.5, 0.8660254), w));
  return acc;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let s = spaceOf(params, uv);

  // ── 1. 저해상도 필드 ──────────────────────────────────────────────
  // 텍스처 페치 한 번이 fbm 3옥타브 + 가우시안 3개를 대신한다.
  let f = textureSampleLevel(field, fieldSampler, uv, 0.0);
  let crest = f.r;
  let activity = f.g;

  // ── 2. 베이스 그라디언트 ──────────────────────────────────────────
  // fixed 캔버스는 뷰포트 높이뿐이라, 페이지 전체 길이 기준 위치를 직접 계산해서
  // CSS(0% cream → 50% lightest → 100% light)와 픽셀 단위로 맞춘다.
  // 이래야 GPU 가 꺼졌을 때 폴백으로 떨어져도 화면이 튀지 않는다.
  let pageT = clamp(params.scroll * (1.0 - params.viewFrac) + uv.y * params.viewFrac, 0.0, 1.0);
  var col = mix(CREAM, LIGHTEST, clamp(pageT * 2.0, 0.0, 1.0));
  col = mix(col, LIGHT, clamp((pageT - 0.5) * 2.0, 0.0, 1.0));

  // ── 3. 노드 ───────────────────────────────────────────────────────
  let n = nearestNode(s.g);
  let seed = hash21(n.id * 7.13 + 1.7);
  let seed2 = hash21(n.id * 3.71 - 5.2);

  // 격자를 노드마다 살짝 흐트러뜨린다. 완벽한 규칙성은 유기물이 아니라 기계로 읽힌다.
  // 흔들림이 작아서 육각 구조는 그대로 읽히고, 연결선은 조금씩 어긋나며 이어진다.
  let off = n.off - (vec2f(seed, seed2) - 0.5) * 0.34;

  // 맥동 주기는 노드마다 4~11초. 히어로에서 화면이 멈춰 보이지 않을 만큼은 움직인다.
  let pulse = 0.5 + 0.5 * sin(params.time * (0.55 + seed * 0.8) + seed * TAU);
  let radius = mix(0.055, 0.085, s.ease) * (0.68 + 0.64 * seed) * (1.0 + 0.35 * activity + 0.16 * s.wake);
  let core = 1.0 - smoothstep(radius * 0.55, radius, length(off));
  let nodeAlpha = core * (0.26 + 0.40 * pulse + 0.75 * crest + 0.55 * activity + 0.50 * s.wake);

  // 히어로(ease 0)에서도 커서 근처에서는 연결망이 드러난다.
  let link =
    linkField(off, mix(0.012, 0.022, s.ease)) *
    (0.12 + 0.88 * s.ease + 0.34 * s.wake) *
    (0.30 + 0.70 * crest + 0.45 * activity);

  // ── 4. 가독성 마스크 ──────────────────────────────────────────────
  // 비네트의 반대. 텍스트가 놓이는 화면 중앙을 잠재운다.
  // 커서를 가져다 댄 자리에서는 일부만 풀어 준다 — 글을 가리지 않으면서 반응은 보이게.
  let calm = mix(0.22, 1.0, smoothstep(0.10, 0.62, length(s.centered)));

  // ── 5. 합성 ───────────────────────────────────────────────────────
  let amp = params.intensity * mix(calm, 1.0, s.wake * 0.38);
  col = mix(col, NODE, link * 0.14 * amp);
  col = mix(col, NODE, nodeAlpha * 0.30 * amp);
  col = mix(col, SPARK, core * crest * 0.40 * amp);

  // 빛 무리가 지나가는 자리를 아주 옅게 덥힌다. 무리 자체는 보이지 않고 기척만 남는다.
  col = mix(col, SPARK, activity * 0.085 * params.intensity);

  // 8비트 그라디언트 밴딩 제거용 디더.
  col += (hash21(uv * vec2f(params.width, params.height)) - 0.5) / 255.0;

  return vec4f(col, 1.0);
}
