/**
 * 하프톤 셰이더 조각. 인트로와 히어로 프래그먼트 셰이더가 문자열로 이어 붙여 쓴다.
 *
 * "마크 공간": 원점이 로고 육각형 축 · 이미지 세로 중심이고, 단위 1 이 logo.png 가로 폭의 절반이다.
 * y 는 아래로 증가한다. 로고 모양은 public/intro/logo-sdf.png (scripts/intro/gen-logo-sdf.py) 에서 읽는다.
 */

/** 해시 · 이징 · 회전 · 선분 거리. */
export const GLSL_COMMON = `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float easeOut(float x) {
  x = clamp(x, 0.0, 1.0);
  return 1.0 - pow(1.0 - x, 3.0);
}

// 살짝 넘쳤다 돌아오는 이징. 잎이 펼쳐질 때 탄력을 준다.
float easeOutBack(float x) {
  x = clamp(x, 0.0, 1.0);
  float c = 1.4;
  return 1.0 + (c + 1.0) * pow(x - 1.0, 3.0) + c * pow(x - 1.0, 2.0);
}

vec2 rotate(vec2 v, float a) {
  float c = cos(a), s = sin(a);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
`;

/** 로고 거리장 텍스처(uSdf) 샘플링, 로고 그라데이션, 잎 다섯 장의 밑동·끝. */
export const GLSL_LOGO = `
uniform sampler2D uSdf;

// 로고 그라데이션. logo.png 의 세로 위·가운데·아래에서 뽑은 색이다.
const vec3 HEX_TOP = vec3(0.941, 0.882, 0.412);
const vec3 HEX_MID = vec3(0.620, 0.682, 0.431);
const vec3 HEX_BOT = vec3(0.267, 0.471, 0.467);
const float HEX_Y_TOP = -0.967;
const float HEX_Y_BOT = 0.968;

// 텍스처 인코딩. gen-logo-sdf.py 의 DOMAIN · RANGE 와 같아야 한다.
const float SDF_DOMAIN = 1.12;
const float SDF_RANGE = 0.25;

// 잎의 밑동(base)과 끝(tip). 성장은 밑동을 기준으로 커지고, 펼침은 밑동을 축으로 돈다.
const vec2 TOP_BASE = vec2(0.007, 0.325);
const vec2 TOP_TIP = vec2(0.028, -0.451);
const vec2 SIDE_L_BASE = vec2(-0.021, 0.617);
const vec2 SIDE_L_TIP = vec2(-0.592, 0.092);
const vec2 SIDE_R_BASE = vec2(0.03, 0.617);
const vec2 SIDE_R_TIP = vec2(0.6, 0.092);
const vec2 LOW_L_BASE = vec2(-0.04, 0.886);
const vec2 LOW_L_TIP = vec2(-0.594, 0.552);
const vec2 LOW_R_BASE = vec2(0.041, 0.886);
const vec2 LOW_R_TIP = vec2(0.594, 0.552);

// 아틀라스 한 칸(panel 0: 잎 R·G·B, panel 1: 육각형 R)에서 마크 좌표 q 의 부호 거리를 읽는다.
vec3 sdfAt(vec2 q, float panel) {
  if (any(greaterThan(abs(q), vec2(SDF_DOMAIN * 0.995)))) return vec3(SDF_RANGE);
  vec2 uv = q / SDF_DOMAIN * 0.5 + 0.5;
  // 선형 보간이 옆 칸으로 번지지 않게 가로를 반 텍셀 안쪽으로 묶는다.
  uv.x = (panel + clamp(uv.x, 0.5 / 256.0, 1.0 - 0.5 / 256.0)) * 0.5;
  vec3 t = texture(uSdf, uv).rgb;
  return (t * 255.0 - 128.0) / 127.0 * SDF_RANGE;
}

/**
 * 자라는 잎 하나의 거리. 화면 좌표를 거꾸로 되돌려(펼침 회전 → 크기) 로고 속 원래 자리에서 읽는다.
 * side: 같은 채널에 좌우 두 장이 들어 있어서, 원래 자리에서 반대편 잎을 읽지 않도록 막는다 (-1 왼쪽, 1 오른쪽).
 */
float leafDist(vec2 p, vec2 base, vec2 tip, float grow, float unfurl, int channel, float side) {
  if (grow <= 0.001) return 1e3;
  vec2 axis = tip - base;
  float turn = (atan(-1.0, 0.0) - atan(axis.y, axis.x)) * (1.0 - unfurl);
  vec2 rest = base + rotate((p - base) / grow, -turn);
  float d = sdfAt(rest, 0.0)[channel];
  if (side != 0.0) d = max(d, -side * rest.x);
  return d * grow;
}

vec3 hexGradient(float y) {
  return y < 0.0
    ? mix(HEX_TOP, HEX_MID, clamp((y - HEX_Y_TOP) / -HEX_Y_TOP, 0.0, 1.0))
    : mix(HEX_MID, HEX_BOT, clamp(y / HEX_Y_BOT, 0.0, 1.0));
}
`;
