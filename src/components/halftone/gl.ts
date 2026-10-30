/**
 * 하프톤 렌더러(인트로·히어로)가 같이 쓰는 WebGL2 뼈대.
 * 둘 다 화면을 덮는 삼각형 하나에 프래그먼트 셰이더만 다르다.
 */

const FULLSCREEN_VERTEX = `#version 300 es
void main() {
  // 화면을 덮는 삼각형 하나. 버퍼 없이 정점 번호로 만든다.
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

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

/** 셰이더가 깨지면 던진다. 호출자는 하프톤 없이 넘어간다. */
export function createProgram(gl: WebGL2RenderingContext, fragmentSource: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('createProgram failed');
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, FULLSCREEN_VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? '');
  return program;
}

export function uniformLocations<T extends string>(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  names: readonly T[],
): Record<T, WebGLUniformLocation | null> {
  return Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<
    T,
    WebGLUniformLocation | null
  >;
}

/** 거리값이 담긴 데이터 텍스처라 색 공간 변환·알파 곱셈 없이 바이트 그대로 올린다. */
export function uploadDataTexture(gl: WebGL2RenderingContext, image: TexImageSource): WebGLTexture | null {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

/** 캔버스 백버퍼를 CSS 크기 × DPR(최대 2)에 맞춘다. 반환값은 적용한 DPR. */
export function fitCanvas(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): number {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(canvas.clientWidth * dpr);
  const height = Math.round(canvas.clientHeight * dpr);
  // 크기를 다시 대입하면 백버퍼가 지워진다. 그대로면 건드리지 않는다.
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  gl.viewport(0, 0, width, height);
  return dpr;
}

/**
 * 요소 크기나 DPR 이 바뀌면 onChange 를 부른다. 반환값은 해제 함수.
 * window resize 만으로는 놓치는 경우가 있다: 인트로가 끝나며 스크롤바가 생겨 폭이 줄 때,
 * 창을 배율이 다른 모니터로 옮겨 DPR 만 바뀔 때.
 */
export function watchResize(target: Element, onChange: () => void): () => void {
  const observer = new ResizeObserver(() => onChange());
  observer.observe(target);

  let media: MediaQueryList | null = null;
  const onDprChange = () => {
    listenDpr();
    onChange();
  };
  // 지금 DPR 과 같은지를 묻는 쿼리라, 바뀌면 새 값으로 다시 건다.
  const listenDpr = () => {
    media?.removeEventListener('change', onDprChange);
    media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    media.addEventListener('change', onDprChange);
  };
  listenDpr();

  return () => {
    observer.disconnect();
    media?.removeEventListener('change', onDprChange);
  };
}

/**
 * 로고 거리장 텍스처를 디코드까지 마친 이미지로 받는다.
 * 숨은 탭에서는 디코드가 탭이 보일 때까지 끝나지 않는다(Chrome). 늦어지는지는 visibleTimeout 으로 잰다.
 */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

/**
 * 탭이 보이는 동안 ms 가 지나면 run 을 한 번 부른다. 반환값은 취소 함수.
 * 숨어 있던 시간은 세지 않고, 다시 보이면 처음부터 센다. 백그라운드 탭으로 열린 페이지가
 * 디코드를 기다리는 사이에 '멈췄다'고 판단하지 않게 한다.
 */
export function visibleTimeout(run: () => void, ms: number): () => void {
  let timer = 0;
  const cancel = () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', arm);
  };
  const arm = () => {
    window.clearTimeout(timer);
    if (document.hidden) return;
    timer = window.setTimeout(() => {
      cancel();
      run();
    }, ms);
  };
  document.addEventListener('visibilitychange', arm);
  arm();
  return cancel;
}
