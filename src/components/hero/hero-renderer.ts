/**
 * 홈 히어로 하프톤 렌더러 (WebGL2).
 *
 * 인트로와 같은 셀 격자 위에 그린다. 인트로가 끝나며 내려앉은 로고가 같은 자리·같은 점 간격으로
 * 이어지도록, 마크 좌표와 셀 크기 규칙을 인트로와 맞춘다.
 *
 *   - 가운데: 로고 육각형. 안쪽 그림(잎 → 지구 → 비닐하우스 → 해)이 위에서 아래로 점 단위로 바뀐다.
 *     그림은 육각형을 파낸 음각이라 배경색으로 보인다 (로고의 흰 잎과 같은 방식).
 *   - 둘레: 스마트팜 픽토그램 여덟 개가 화면 가장자리에 걸쳐 떠 있다. 점 크기로 명암을 준다.
 */

import { createProgram, fitCanvas, uniformLocations, uploadDataTexture } from '@/components/halftone/gl';
import { GLSL_COMMON, GLSL_LOGO } from '@/components/halftone/glsl';

/** 안쪽 그림 순서. 셰이더의 innerShape 인덱스와 같다. */
export const INNER_SHAPES = ['leaves', 'globe', 'greenhouse', 'sun'] as const;

const FRAGMENT_SOURCE = `#version 300 es
precision highp float;

uniform vec2 uRes;      // 캔버스 크기 (디바이스 px)
uniform float uDpr;
uniform float uTime;    // 초
uniform float uCell;    // 셀 크기 (CSS px)
uniform vec3 uMark;     // 마크 중심 x, y (CSS px, y 아래로) · 마크 단위 1 의 CSS px
uniform vec3 uMorph;    // 이전 그림 · 다음 그림 · 진행 0..1
uniform vec2 uPointer;  // 커서 위치 -1..1. 픽토그램 시차에 쓴다
uniform float uEnter;   // 픽토그램 등장 0..1

out vec4 outColor;

${GLSL_COMMON}
${GLSL_LOGO}

const vec3 INK = vec3(0.224, 0.306, 0.145);       // #394e25
const vec3 INK_SOFT = vec3(0.408, 0.541, 0.275);  // #688a46

float sdVesica(vec2 p, float r, float d) {
  p = abs(p);
  float b = sqrt(r * r - d * d);
  return ((p.y - b) * d > p.x * b) ? length(p - vec2(0.0, b)) : length(p - vec2(-d, 0.0)) - r;
}

float sdBox(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

// y 가 위로 증가하는 좌표계 기준: 아래 원(r1) 과 높이 h 위의 원(r2) 을 잇는 물방울.
float sdUnevenCapsule(vec2 p, float r1, float r2, float h) {
  p.x = abs(p.x);
  float b = (r1 - r2) / h;
  float a = sqrt(1.0 - b * b);
  float k = dot(p, vec2(-b, a));
  if (k < 0.0) return length(p) - r1;
  if (k > a * h) return length(p - vec2(0.0, h)) - r2;
  return dot(p, vec2(a, b)) - r1;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// base 에서 ang 방향으로 뻗는 잎.
float sdLeaf(vec2 p, vec2 base, float len, float halfWidth, float ang) {
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 c = p - base - dir * len * 0.5;
  vec2 lp = vec2(dot(c, vec2(-dir.y, dir.x)), dot(c, dir));
  float L = len * 0.5;
  float w = halfWidth;
  return sdVesica(lp, 0.5 * (w + L * L / w), 0.5 * (L * L / w - w));
}

// ── 육각형 안쪽 그림 (마크 공간) ─────────────────────────────

float innerLeaves(vec2 p) {
  vec3 s = sdfAt(p, 0.0);
  return min(s.r, min(s.g, s.b));
}

// RAISE EARTH: 경선·위선이 있는 지구.
float innerGlobe(vec2 p) {
  vec2 q = p - vec2(0.0, 0.2);
  float R = 0.54;
  float w = 0.07;
  float inside = length(q) - R;
  float ring = abs(inside) - w;
  float equator = max(abs(q.y) - w, inside);
  float lat = max(abs(abs(q.y) - 0.3) - w * 0.8, inside);
  float meridian = max(abs(q.x) - w, inside);
  float ellipse = max(abs(length(q / vec2(0.5, 1.0)) - R) * 0.5 - w * 0.8, inside);
  return min(min(ring, equator), min(lat, min(meridian, ellipse)));
}

// 스마트팜: 비닐하우스 아치와 갈빗대, 그 안의 새싹.
float innerGreenhouse(vec2 p) {
  vec2 q = p - vec2(0.0, 0.0);
  vec2 c = vec2(0.0, 0.66);
  float R = 0.62;
  float w = 0.068;
  float upper = q.y - c.y;
  float arch = max(abs(length(q - c) - R) - w, upper);
  float ground = sdSegment(q, vec2(-0.66, c.y), vec2(0.66, c.y)) - w;
  float inArch = max(length(q - c) - R, upper);
  float ribs = max(abs(abs(q.x) - 0.38) - w * 0.7, inArch);
  float stem = sdSegment(q, vec2(0.0, c.y), vec2(0.0, c.y - 0.32)) - w * 0.7;
  float leafL = sdLeaf(q, vec2(0.0, c.y - 0.2), 0.36, 0.1, radians(-150.0));
  float leafR = sdLeaf(q, vec2(0.0, c.y - 0.3), 0.36, 0.1, radians(-30.0));
  return min(min(min(arch, ground), ribs), min(stem, min(leafL, leafR)));
}

// 햇빛.
float innerSun(vec2 p) {
  vec2 q = p - vec2(0.0, 0.22);
  float core = length(q) - 0.24;
  float sector = 6.2831853 / 8.0;
  float a = atan(q.y, q.x);
  vec2 r = rotate(q, -floor(a / sector + 0.5) * sector);
  float ray = sdSegment(r, vec2(0.37, 0.0), vec2(0.52, 0.0)) - 0.065;
  return min(core, ray);
}

float innerShape(float index, vec2 p) {
  if (index < 0.5) return innerLeaves(p);
  if (index < 1.5) return innerGlobe(p);
  if (index < 2.5) return innerGreenhouse(p);
  return innerSun(p);
}

// ── 둘레 픽토그램 (아이콘 공간, 반지름 약 1) ─────────────────

float iconSun(vec2 p) {
  float sector = 6.2831853 / 8.0;
  float a = atan(p.y, p.x);
  vec2 r = rotate(p, -floor(a / sector + 0.5) * sector);
  return min(length(p) - 0.42, sdSegment(r, vec2(0.6, 0.0), vec2(0.92, 0.0)) - 0.1);
}

float iconCloud(vec2 p) {
  float d = length(p - vec2(-0.45, 0.12)) - 0.4;
  d = smin(d, length(p - vec2(0.05, -0.14)) - 0.52, 0.12);
  d = smin(d, length(p - vec2(0.52, 0.16)) - 0.36, 0.12);
  return smin(d, sdBox(p - vec2(0.0, 0.3), vec2(0.82, 0.22), 0.2), 0.1);
}

float iconDrop(vec2 p) {
  return sdUnevenCapsule(vec2(p.x, 0.45 - p.y), 0.52, 0.04, 1.2);
}

float iconPlanet(vec2 p) {
  float body = length(p) - 0.6;
  vec2 r = rotate(p, -0.35);
  float ring = abs(length(r / vec2(1.0, 0.26)) - 1.0) * 0.26 - 0.04;
  // 고리가 몸통 뒤로 넘어가는 위쪽 절반은 가린다.
  if (r.y < 0.0) ring = max(ring, -(body - 0.05));
  return min(max(body, -(ring - 0.06)), ring);
}

float iconPot(vec2 p) {
  float pot = sdBox(p - vec2(0.0, 0.55), vec2(0.38 - (p.y - 0.55) * 0.18, 0.3), 0.06);
  float rim = sdBox(p - vec2(0.0, 0.24), vec2(0.48, 0.07), 0.04);
  float stem = sdSegment(p, vec2(0.0, 0.2), vec2(0.0, -0.25)) - 0.05;
  float leafL = sdLeaf(p, vec2(0.0, -0.05), 0.62, 0.17, radians(-155.0));
  float leafR = sdLeaf(p, vec2(0.0, -0.22), 0.66, 0.18, radians(-30.0));
  return min(min(pot, rim), min(stem, min(leafL, leafR)));
}

// 스마트팜 센서 칩.
float iconChip(vec2 p) {
  float body = sdBox(p, vec2(0.52), 0.1);
  float core = abs(sdBox(p, vec2(0.24), 0.05)) - 0.05;
  vec2 a = abs(p);
  vec2 s = a.x > a.y ? vec2(a.x, p.y) : vec2(a.y, p.x);
  float pinY = mod(s.y + 0.15, 0.3) - 0.15;
  float pins = abs(s.y) < 0.45 ? sdBox(vec2(s.x - 0.68, pinY), vec2(0.14, 0.05), 0.02) : 1e3;
  return min(max(body, -core), pins);
}

float iconLeaf(vec2 p) {
  float leaf = sdLeaf(p, vec2(-0.35, 0.65), 1.45, 0.36, radians(-60.0));
  float rib = sdSegment(p, vec2(-0.3, 0.55), vec2(0.28, -0.45)) - 0.035;
  return max(leaf, -rib);
}

float iconSeeds(vec2 p) {
  float d = length(p - vec2(-0.45, 0.2)) - 0.26;
  d = min(d, length(p - vec2(0.15, -0.3)) - 0.22);
  return min(d, length(p - vec2(0.5, 0.35)) - 0.3);
}

float iconShape(int i, vec2 p) {
  if (i == 0) return iconSun(p);
  if (i == 1) return iconCloud(p);
  if (i == 2) return iconDrop(p);
  if (i == 3) return iconPlanet(p);
  if (i == 4) return iconPot(p);
  if (i == 5) return iconChip(p);
  if (i == 6) return iconLeaf(p);
  return iconSeeds(p);
}

// x, y: 화면 비율 · z: 크기(짧은 변 비율) · w: 깊이(시차·진하기)
const int ICON_COUNT = 8;
const vec4 ICONS[8] = vec4[8](
  vec4(0.13, 0.24, 0.085, 0.6),
  vec4(0.85, 0.2, 0.1, 0.8),
  vec4(0.07, 0.6, 0.055, 0.45),
  vec4(0.03, 1.0, 0.26, 1.0),
  vec4(0.91, 0.76, 0.1, 0.75),
  vec4(1.0, 0.44, 0.09, 0.9),
  vec4(0.27, 0.84, 0.045, 0.5),
  vec4(0.7, 0.11, 0.035, 0.35)
);

void main() {
  vec2 vp = uRes / uDpr;
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 cellId = floor(px / uCell);
  vec2 cc = (cellId + 0.5) * uCell;
  vec2 lp = px - cc;
  float aa = 0.75 / uDpr;
  float n = hash(cellId);

  // ── 마크 ────────────────────────────────────────────────
  vec2 q = (cc - uMark.xy) / uMark.z;
  float h = 0.6 * uCell / uMark.z;
  float hexCov = smoothstep(h, -h, sdfAt(q, 1.0).r);

  float v = 0.0;
  vec3 ink = INK;
  float alpha = 1.0;

  if (hexCov > 0.0) {
    // 위에서 아래로 쓸어내리되 셀마다 조금씩 어긋나게 바꾼다 (점이 하나씩 뒤집히는 느낌).
    float sweep = clamp((q.y + 0.97) / 1.94, 0.0, 1.0);
    float threshold = mix(sweep, n, 0.35);
    float useNext = step(threshold, uMorph.z);
    float dInner = innerShape(mix(uMorph.x, uMorph.y, useNext), q);
    float innerCov = smoothstep(h, -h, dInner);
    // 경계를 막 넘은 셀은 잠깐 작게 찍혀 반짝인다.
    float flip = 1.0 - 0.6 * exp(-pow((uMorph.z - threshold) * 14.0, 2.0)) * step(0.001, uMorph.z) * step(uMorph.z, 0.999);
    float breathe = 0.92 + 0.08 * sin(uTime * 1.6 - length(q) * 5.0);
    v = hexCov * (1.0 - innerCov) * flip * breathe;
    ink = hexGradient(q.y);
  } else {
    // ── 둘레 픽토그램 ──────────────────────────────────────
    float shortSide = min(vp.x, vp.y);
    for (int i = 0; i < ICON_COUNT; i++) {
      vec4 icon = ICONS[i];
      float fi = float(i);
      float enter = easeOutBack(uEnter * 1.8 - fi * 0.1);
      if (enter <= 0.001) continue;
      float size = icon.z * shortSide * enter;
      vec2 center = icon.xy * vp
        + vec2(0.0, sin(uTime * 0.7 + fi * 1.7) * 0.012 * shortSide)
        + uPointer * icon.w * 16.0;
      vec2 local = (cc - center) / size;
      if (dot(local, local) > 2.6) continue;
      local = rotate(local, sin(uTime * 0.45 + fi) * 0.06);
      float hl = 0.6 * uCell / size;
      float d = iconShape(i, local);
      float cov = smoothstep(hl, -hl, d);
      // 왼쪽 위에서 빛을 받는다: 밝은 쪽은 점이 작고, 그늘과 가장자리는 점이 크다.
      float light = clamp(0.55 - dot(local, vec2(0.45, 0.55)) * 0.45, 0.0, 1.0);
      float rim = smoothstep(0.0, 0.18, -d);
      float shade = mix(1.0, 0.38, light * rim);
      float iv = cov * shade;
      if (iv > v) {
        v = iv;
        ink = mix(INK_SOFT, INK, icon.w);
        alpha = 0.55 + 0.4 * icon.w;
      }
    }
    // 드문드문 떠 있는 먼지 점.
    if (v <= 0.0 && hash(cellId + 7.31) > 0.9965) {
      v = 0.18 + 0.12 * sin(uTime * 1.3 + n * 40.0);
      ink = INK_SOFT;
      alpha = 0.5;
    }
  }

  float r = sqrt(clamp(v, 0.0, 1.0)) * 0.47 * uCell;
  float a = smoothstep(r + aa, r - aa, length(lp)) * alpha * step(0.001, v);
  outColor = vec4(ink * a, a);
}`;

export interface HeroFrame {
  time: number;
  cell: number;
  mark: readonly [x: number, y: number, unit: number];
  /** 이전 그림 · 다음 그림 · 진행 0..1 */
  morph: readonly [from: number, to: number, progress: number];
  pointer: readonly [x: number, y: number];
  enter: number;
}

export interface HeroRenderer {
  resize(): void;
  draw(frame: HeroFrame): void;
  dispose(): void;
}

const UNIFORMS = ['uRes', 'uDpr', 'uTime', 'uCell', 'uMark', 'uMorph', 'uPointer', 'uEnter', 'uSdf'] as const;

/** WebGL2 를 못 쓰거나 셰이더가 깨지면 null. 호출자는 정적 로고 이미지로 대신한다. */
export function createHeroRenderer(canvas: HTMLCanvasElement, logoSdf: TexImageSource): HeroRenderer | null {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return null;

  let program: WebGLProgram;
  try {
    program = createProgram(gl, FRAGMENT_SOURCE);
  } catch (error) {
    console.warn('[hero] shader unavailable:', error);
    return null;
  }

  const loc = uniformLocations(gl, program, UNIFORMS);
  const vao = gl.createVertexArray();
  const texture = uploadDataTexture(gl, logoSdf);
  let dpr = fitCanvas(gl, canvas);

  return {
    resize() {
      dpr = fitCanvas(gl, canvas);
    },
    draw(frame) {
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(loc.uRes, canvas.width, canvas.height);
      gl.uniform1f(loc.uDpr, dpr);
      gl.uniform1f(loc.uTime, frame.time);
      gl.uniform1f(loc.uCell, frame.cell);
      gl.uniform3f(loc.uMark, frame.mark[0], frame.mark[1], frame.mark[2]);
      gl.uniform3f(loc.uMorph, frame.morph[0], frame.morph[1], frame.morph[2]);
      gl.uniform2f(loc.uPointer, frame.pointer[0], frame.pointer[1]);
      gl.uniform1f(loc.uEnter, frame.enter);
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
