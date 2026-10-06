/**
 * 인트로 하프톤 렌더러 (WebGL2).
 *
 * 화면을 정사각 셀로 나누고, 셀마다 점 하나를 찍는다. 점의 크기는 셀 중심에서 잰 도형(SDF)의
 * 덮임 정도로 정한다. 도형은 로고를 그대로 옮긴 것이다:
 *   - 새싹: 씨앗 → 줄기 → 아래 잎 → 옆 잎 → 가운데 잎 순으로 자라고, 옆 잎은 줄기 쪽에서 펼쳐진다.
 *   - 육각형: 새싹 밑동에서 퍼지는 파동을 따라 채워지고, 새싹은 크림색(로고의 흰 잎)으로 바뀐다.
 *   - 퇴장: 로고 중심에서 배경이 점으로 부서지며 구멍이 열린다(하프톤 와이프).
 *
 * 로고 모양과 마크 공간 좌표계는 halftone/glsl.ts 를 따른다.
 */

import { createProgram, fitCanvas, uniformLocations, uploadDataTexture } from '@/components/halftone/gl';
import { GLSL_COMMON, GLSL_LOGO } from '@/components/halftone/glsl';

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

out vec4 outColor;

const vec3 BG = vec3(0.110, 0.165, 0.090);       // #1c2a17
const vec3 BG_GLOW = vec3(0.176, 0.251, 0.137);
const vec3 CREAM = vec3(1.0, 0.984, 0.886);      // #fffbe2
const vec3 LEAF = vec3(0.408, 0.541, 0.275);     // #688a46
const vec3 LIME = vec3(0.835, 0.902, 0.478);
${GLSL_COMMON}
${GLSL_LOGO}
// 씨앗은 아래 언덕 호의 꼭대기에 놓인다.
const vec2 SEED = vec2(0.0, 0.89);

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
  // 넓은 띠에서 점이 서서히 작아져, 어두운 화면이 밝은 화면으로 번지듯 열린다.
  float band = 6.0 * uCell;
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

/**
 * WebGL2 를 못 쓰거나 셰이더가 깨지면 null. 호출자는 인트로 없이 넘어간다.
 * logoSdf 는 LOGO_SDF_URL 을 디코드까지 마친 이미지다.
 */
export function createHalftoneRenderer(canvas: HTMLCanvasElement, logoSdf: TexImageSource): HalftoneRenderer | null {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return null;

  let program: WebGLProgram;
  try {
    program = createProgram(gl, FRAGMENT_SOURCE);
  } catch (error) {
    console.warn('[intro] shader unavailable:', error);
    return null;
  }

  const loc = uniformLocations(gl, program, UNIFORMS);
  const vao = gl.createVertexArray();
  const texture = uploadDataTexture(gl, logoSdf);
  let dpr = fitCanvas(gl, canvas);
  const resize = () => {
    dpr = fitCanvas(gl, canvas);
  };

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
