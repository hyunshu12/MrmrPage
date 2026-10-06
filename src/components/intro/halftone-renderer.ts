/**
 * 인트로 하프톤 렌더러 (WebGL2).
 *
 * 화면을 정사각 셀로 나누고, 셀마다 점 하나를 찍는다. 점의 크기는 셀 중심에서 잰 도형(SDF)의
 * 덮임 정도로 정한다. 도형은 로고를 그대로 옮긴 것이다:
 *   - 새싹: 씨앗 → 줄기 → 아래 잎 → 옆 잎 → 가운데 잎 순으로 자라고, 옆 잎은 줄기 쪽에서 펼쳐진다.
 *   - 육각형: 새싹 밑동에서 퍼지는 파동을 따라 채워지고, 새싹은 크림색(로고의 흰 잎)으로 바뀐다.
 *   - 퇴장: 로고 중심에서 배경이 점으로 부서지며 구멍이 열린다(하프톤 와이프).
 *
 * 모양은 public/logo.png 에서 뽑은 거리장 텍스처(public/intro/logo-sdf.png)에서 읽는다.
 * 잎의 휘어짐·비대칭·언덕 호까지 로고 그대로다. 텍스처는 scripts/intro/gen-logo-sdf.py 가 만든다.
 *
 * 좌표: "마크 공간" 은 원점이 육각형 축·이미지 세로 중심이고, 단위 1 이 logo.png 가로 폭의 절반이다.
 * y 는 아래로 증가한다. 잎의 밑동·끝 좌표도 같은 이미지에서 쟀다.
 */

const VERTEX_SOURCE = `#version 300 es
void main() {
  // 화면을 덮는 삼각형 하나. 버퍼 없이 정점 번호로 만든다.
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT_SOURCE = `#version 300 es
precision highp float;

uniform vec2 uRes;        // 캔버스 크기 (디바이스 px)
uniform float uDpr;
uniform float uTime;      // 초
uniform float uCell;      // 셀 크기 (CSS px)
uniform vec3 uMark;       // 마크 중심 x, y (CSS px, y 아래로) · 마크 단위 1 의 CSS px
uniform float uGrow;      // 새싹 성장 0..1
uniform float uHex;       // 육각형 채움 0..1
uniform float uInvert;    // 새싹 → 크림색 잎 0..1
uniform float uIdle;      // 배경 점 격자 0..1
uniform float uRipple;    // 씨앗 파동 경과 시간(초), 음수면 없음
uniform float uWipe;      // 퇴장 구멍 반지름 (CSS px)
uniform float uMarkAlpha; // 마크 불투명도
uniform sampler2D uSdf;   // 로고 거리장 아틀라스

out vec4 outColor;

const vec3 BG = vec3(0.110, 0.165, 0.090);       // #1c2a17
const vec3 BG_GLOW = vec3(0.176, 0.251, 0.137);
const vec3 CREAM = vec3(1.0, 0.984, 0.886);      // #fffbe2
const vec3 LEAF = vec3(0.408, 0.541, 0.275);     // #688a46
const vec3 LIME = vec3(0.835, 0.902, 0.478);
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
// 씨앗은 아래 언덕 호의 꼭대기에 놓인다.
const vec2 SEED = vec2(0.0, 0.89);

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

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdPlant(vec2 p) {
  float g = uGrow;
  // 씨앗과 줄기는 로고에 없다. 육각형이 생기면서 밀려나 사라진다 (반지름만 줄이면 점 한 줄이 남는다).
  float fade = uInvert * 0.15;
  float seedR = 0.075 * easeOut(g / 0.12);
  float stemT = easeOut((g - 0.08) / 0.4);
  float stemTop = mix(SEED.y, TOP_BASE.y, stemT);

  float dSeed = length(p - SEED) - seedR + fade;
  float dStem = stemT <= 0.0 ? 1e3 : sdSegment(p, SEED, vec2(0.0, stemTop)) - 0.025 + fade;

  float gLow = easeOutBack((g - 0.26) / 0.34);
  float gSide = easeOutBack((g - 0.42) / 0.36);
  float gTop = easeOutBack((g - 0.6) / 0.4);
  float uLow = easeOut((g - 0.26) / 0.4);
  float uSide = easeOut((g - 0.42) / 0.42);

  float dLeaves = leafDist(p, TOP_BASE, TOP_TIP, gTop, 1.0, 0, 0.0);
  dLeaves = min(dLeaves, leafDist(p, SIDE_L_BASE, SIDE_L_TIP, gSide, uSide, 1, -1.0));
  dLeaves = min(dLeaves, leafDist(p, SIDE_R_BASE, SIDE_R_TIP, gSide, uSide, 1, 1.0));
  dLeaves = min(dLeaves, leafDist(p, LOW_L_BASE, LOW_L_TIP, gLow, uLow, 2, -1.0));
  dLeaves = min(dLeaves, leafDist(p, LOW_R_BASE, LOW_R_TIP, gLow, uLow, 2, 1.0));

  return min(min(dSeed, dStem), dLeaves);
}

vec3 hexGradient(float y) {
  return y < 0.0
    ? mix(HEX_TOP, HEX_MID, clamp((y - HEX_Y_TOP) / -HEX_Y_TOP, 0.0, 1.0))
    : mix(HEX_MID, HEX_BOT, clamp(y / HEX_Y_BOT, 0.0, 1.0));
}

void main() {
  vec2 vp = uRes / uDpr;
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 cellId = floor(px / uCell);
  vec2 cc = (cellId + 0.5) * uCell;
  vec2 lp = px - cc;
  float aa = 0.75 / uDpr;

  vec2 q = (cc - uMark.xy) / uMark.z;
  float h = 0.6 * uCell / uMark.z;

  // ── 마크 ────────────────────────────────────────────────
  float dP = sdPlant(q);
  float plantCov = smoothstep(h, -h, dP);
  float waveR = uHex * 1.8;
  float hexOn = 1.0 - smoothstep(waveR - 0.22, waveR, length(q - vec2(0.0, 0.6)));
  float hexCov = smoothstep(h, -h, sdfAt(q, 1.0).r) * hexOn;
  float hexOnly = hexCov * (1.0 - plantCov * uInvert);

  vec3 sprout = mix(LEAF, LIME, clamp((SEED.y - q.y) / 1.3, 0.0, 1.0));
  vec3 plantCol = mix(sprout, CREAM, uInvert);
  bool hexWins = hexOnly > plantCov;
  float vMark = hexWins ? hexOnly : plantCov;
  vec3 cMark = hexWins ? hexGradient(q.y) : plantCol;

  // ── 배경 점 격자 ──────────────────────────────────────────
  float n = hash(cellId);
  float twinkle = 0.5 + 0.5 * sin(uTime * (0.7 + n * 1.3) + n * 6.2831);
  vec2 seedPx = uMark.xy + SEED * uMark.z;
  float dist = length(cc - seedPx);
  // 씨앗에서 퍼지는 파동. 폭과 속도를 마크 크기에 맞춰 화면 크기와 무관하게 같은 인상을 준다.
  float rip = uRipple < 0.0 ? 0.0
    : exp(-pow((dist - uRipple * uMark.z * 5.0) / (uMark.z * 0.28), 2.0)) * exp(-uRipple * 1.3);
  float vignette = 1.0 - 0.55 * smoothstep(0.25, 0.75, length((px - vp * 0.5) / max(vp.x, vp.y)));
  float vIdle = uIdle * (0.07 + 0.06 * twinkle) * vignette + rip * 0.35;
  float idleAlpha = uIdle * 0.22 + rip * 0.4;

  // ── 퇴장 구멍: 가장자리 셀은 점이 줄어들며 사라진다 ─────────
  float band = 2.5 * uCell;
  float keep = uWipe <= 0.0 ? 1.0 : smoothstep(uWipe - band, uWipe + band, length(cc - uMark.xy));

  vec3 bg = mix(BG_GLOW, BG, smoothstep(0.0, 0.7, length((px - uMark.xy) / max(vp.x, vp.y))));
  float rb = keep * uCell * 0.72;
  float bgMask = smoothstep(rb + aa, rb - aa, length(lp));

  bool showMark = vMark > 0.02;
  float v = showMark ? vMark : vIdle;
  float rInk = sqrt(clamp(v, 0.0, 1.0)) * 0.47 * uCell;
  float inkMask = smoothstep(rInk + aa, rInk - aa, length(lp));
  float inkA = showMark ? uMarkAlpha : idleAlpha * keep;
  vec3 inkCol = showMark ? cMark : CREAM;

  vec4 col = vec4(bg * bgMask, bgMask);
  float a = inkMask * inkA;
  outColor = col * (1.0 - a) + vec4(inkCol * a, a);
}`;

export interface HalftoneFrame {
  time: number;
  cell: number;
  mark: readonly [x: number, y: number, unit: number];
  grow: number;
  hex: number;
  invert: number;
  idle: number;
  ripple: number;
  wipe: number;
  markAlpha: number;
}

export interface HalftoneRenderer {
  resize(): void;
  draw(frame: HalftoneFrame): void;
  dispose(): void;
}

const UNIFORMS = [
  'uRes',
  'uDpr',
  'uTime',
  'uCell',
  'uMark',
  'uGrow',
  'uHex',
  'uInvert',
  'uIdle',
  'uRipple',
  'uWipe',
  'uMarkAlpha',
  'uSdf',
] as const;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('createShader failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader compile failed');
  }
  return shader;
}

/**
 * WebGL2 를 못 쓰거나 셰이더가 깨지면 null. 호출자는 인트로 없이 넘어간다.
 * logoSdf 는 LOGO_SDF_URL 을 디코드까지 마친 이미지다.
 */
export function createHalftoneRenderer(canvas: HTMLCanvasElement, logoSdf: TexImageSource): HalftoneRenderer | null {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return null;

  let program: WebGLProgram;
  try {
    const created = gl.createProgram();
    if (!created) return null;
    program = created;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? '');
  } catch (error) {
    console.warn('[intro] shader unavailable:', error);
    return null;
  }

  const loc = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<
    (typeof UNIFORMS)[number],
    WebGLUniformLocation | null
  >;
  const vao = gl.createVertexArray();
  let dpr = 1;

  // 거리값이 담긴 데이터 텍스처라 색 공간 변환·알파 곱셈 없이 바이트 그대로 올린다.
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, logoSdf);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();

  return {
    resize,
    draw(frame) {
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(loc.uRes, canvas.width, canvas.height);
      gl.uniform1f(loc.uDpr, dpr);
      gl.uniform1f(loc.uTime, frame.time);
      gl.uniform1f(loc.uCell, frame.cell);
      gl.uniform3f(loc.uMark, frame.mark[0], frame.mark[1], frame.mark[2]);
      gl.uniform1f(loc.uGrow, frame.grow);
      gl.uniform1f(loc.uHex, frame.hex);
      gl.uniform1f(loc.uInvert, frame.invert);
      gl.uniform1f(loc.uIdle, frame.idle);
      gl.uniform1f(loc.uRipple, frame.ripple);
      gl.uniform1f(loc.uWipe, frame.wipe);
      gl.uniform1f(loc.uMarkAlpha, frame.markAlpha);
      gl.uniform1i(loc.uSdf, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteProgram(program);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(texture);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
