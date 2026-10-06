/**
 * vgpu(WebGPU) 씬. React 밖의 명령형 영역이다.
 *
 * 이 모듈은 WebGPU 지원이 확인된 뒤에야 동적으로 import 된다 (GpuBackground 참고).
 * 미지원 브라우저는 vgpu 청크를 아예 내려받지 않는다.
 *
 * 두 패스로 그린다:
 *   1. field   전체 해상도의 1/4. 흐름장(fbm)과 빛 무리 — 저주파라 낮은 해상도로 충분하다.
 *   2. growth  전체 해상도. 격자·노드·연결선처럼 선명해야 하는 것만. field 를 샘플링해 쓴다.
 *
 * 비싼 계산이 닿는 픽셀 수를 16분의 1로 줄이는 게 이 구조의 목적이다.
 */

import fieldSource from '@/shaders/field.wgsl';
import growthSource from '@/shaders/growth-field.wgsl';
import { clock, effect, frameLoop, init, sampler, surface, target, uniforms } from 'vgpu';

export interface SceneState {
  /** 페이지 스크롤 진행도 0..1 */
  readonly scroll: number;
  /** 뷰포트 높이 / 문서 전체 높이. 셰이더가 CSS 그라디언트와 위치를 맞추는 데 쓴다. */
  readonly viewFrac: number;
}

export interface SceneOptions {
  readonly fps: number;
  readonly intensity: number;
  /** 디바이스 로스트 등 복구 불가 상황. 호출자가 캔버스를 걷어내고 CSS 폴백으로 돌아간다. */
  readonly onFatal: () => void;
}

export interface SceneHandle {
  stop(): void;
}

/** 스크롤 추종 속도. 값이 클수록 배경이 스크롤을 빠르게 따라간다. */
const SCROLL_FOLLOW_PER_SECOND = 6;
/**
 * 커서 추종 속도. 시정수 약 0.5초로, 반응이 커서를 한참 뒤따라온다.
 * 빠르게 붙으면 커서를 흔들 때마다 화면이 같이 튀어서 난잡해진다.
 */
const POINTER_FOLLOW_PER_SECOND = 2;
/** 커서가 들고 날 때 반응이 켜지고 꺼지는 속도. 느리게 차오르고 느리게 빠진다. */
const POINTER_FADE_PER_SECOND = 1.2;
/** 탭 전환 등으로 프레임이 크게 벌어졌을 때 보간이 튀지 않도록 잘라낸다. */
const MAX_DELTA_SECONDS = 0.1;

/** 필드 패스의 축소 배율. 4면 픽셀 수가 1/16 이 된다. */
const FIELD_DIVISOR = 4;
/** 성능이 모자랄 때 한 단계 더 줄인다. */
const FIELD_DIVISOR_REDUCED = 6;

/**
 * 프레임이 이 배수만큼 길어지면 느린 프레임으로 센다.
 * 1.7 은 60fps 목표에서 약 28ms — 한두 프레임 흘린 정도가 아니라 확실히 못 따라가는 상태다.
 */
const SLOW_FRAME_RATIO = 1.7;
/** 이만큼 연속으로 느리면 화질을 한 단계 낮춘다. 60fps 기준 약 1.5초. */
const SLOW_FRAMES_BEFORE_DOWNGRADE = 90;

export async function startScene(
  canvas: HTMLCanvasElement,
  readState: () => SceneState,
  opts: SceneOptions,
): Promise<SceneHandle> {
  const gpu = await init();
  const view = surface(gpu, canvas, { dpr: [1, 1.5] });
  const time = clock(gpu);

  const initial = readState();
  let smoothScroll = initial.scroll;
  let lastViewFrac = initial.viewFrac;

  // 두 셰이더가 같은 uniform 버퍼를 공유한다. set() 한 번이 양쪽에 다 닿는다.
  const params = uniforms(gpu, {
    time: 0,
    scroll: initial.scroll,
    viewFrac: initial.viewFrac,
    width: view.size[0],
    height: view.size[1],
    intensity: opts.intensity,
    pointerX: 0.5,
    pointerY: 0.5,
    pointerStrength: 0,
  });

  let divisor = FIELD_DIVISOR;
  const fieldSize = (): [number, number] => [
    Math.max(1, Math.ceil(view.size[0] / divisor)),
    Math.max(1, Math.ceil(view.size[1] / divisor)),
  ];

  // rgba16float: crest/activity 는 부드러운 0..1 값이라 8비트로 받으면 계단이 보인다.
  const fieldTarget = target(gpu, { size: fieldSize(), format: 'rgba16float' });

  const fieldEffect = effect(gpu, fieldSource, { set: { params } });
  const growthEffect = effect(gpu, growthSource, {
    set: {
      params,
      field: fieldTarget,
      // 1/4 해상도를 끌어올려 읽으므로 선형 보간이 필수다. nearest 면 블록이 드러난다.
      fieldSampler: sampler(gpu, { minFilter: 'linear', magFilter: 'linear' }),
    },
  });

  // 해상도는 리사이즈 때만 쓴다. set() 은 변경 감지를 하지 않으므로
  // 매 프레임 쓰지 않고 실제로 바뀔 때만 쓴다.
  const releaseResize = view.onResize(({ width, height }) => {
    params.set({ width, height });
    fieldTarget.resize(fieldSize());
  });

  // 포인터는 렌더 전용 입력이라 React state 를 거치지 않는다.
  // 마우스/트랙패드에서만 반응한다. 터치에서는 커서가 없으므로 strength 가 0 으로 남는다.
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const pointerTarget = { x: 0.5, y: 0.5, strength: 0 };
  const pointerSmooth = { x: 0.5, y: 0.5, strength: 0 };

  const handlePointerMove = (event: PointerEvent) => {
    pointerTarget.x = event.clientX / window.innerWidth;
    pointerTarget.y = event.clientY / window.innerHeight;
    pointerTarget.strength = 1;
  };
  const handlePointerOut = () => {
    pointerTarget.strength = 0;
  };

  if (finePointer) {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerOut);
    window.addEventListener('blur', handlePointerOut);
  }

  let stopped = false;
  let loop: { stop(): void } | null = null;
  let fps = opts.fps;
  let downgraded = false;
  let slowStreak = 0;

  const startLoop = () => {
    if (stopped || loop) return;
    const budget = 1 / fps;

    loop = frameLoop(
      gpu,
      (frame) => {
        const state = readState();
        const dt = Math.min(time.deltaTime, MAX_DELTA_SECONDS);

        // ── 적응형 화질 ──────────────────────────────────────────────
        // 어떤 기기인지 미리 알 수 없으니, 못 따라가는 게 확인되면 스스로 내려간다.
        // 한 번만 내려가고 다시 올리지 않는다 — 오르내리며 진동하는 편이 더 거슬린다.
        if (!downgraded && time.frameCount > 30) {
          slowStreak = time.deltaTime > budget * SLOW_FRAME_RATIO ? slowStreak + 1 : 0;
          if (slowStreak >= SLOW_FRAMES_BEFORE_DOWNGRADE) {
            downgraded = true;
            divisor = FIELD_DIVISOR_REDUCED;
            fieldTarget.resize(fieldSize());
            if (fps > 30) {
              fps = 30;
              // 프레임 예산 자체를 바꾸려면 루프를 다시 걸어야 한다.
              queueMicrotask(() => {
                if (stopped) return;
                stopLoop();
                startLoop();
              });
            }
          }
        }

        // ── 상태 보간 ────────────────────────────────────────────────
        smoothScroll += (state.scroll - smoothScroll) * (1 - Math.exp(-dt * SCROLL_FOLLOW_PER_SECOND));

        const pointerFollow = 1 - Math.exp(-dt * POINTER_FOLLOW_PER_SECOND);
        pointerSmooth.x += (pointerTarget.x - pointerSmooth.x) * pointerFollow;
        pointerSmooth.y += (pointerTarget.y - pointerSmooth.y) * pointerFollow;
        pointerSmooth.strength +=
          (pointerTarget.strength - pointerSmooth.strength) * (1 - Math.exp(-dt * POINTER_FADE_PER_SECOND));

        params.set({
          time: time.time,
          scroll: smoothScroll,
          pointerX: pointerSmooth.x,
          pointerY: pointerSmooth.y,
          pointerStrength: pointerSmooth.strength,
        });
        // viewFrac 은 문서 높이가 바뀔 때만 움직인다. 매 프레임 쓸 이유가 없다.
        if (state.viewFrac !== lastViewFrac) {
          lastViewFrac = state.viewFrac;
          params.set({ viewFrac: state.viewFrac });
        }

        // 두 패스, 커맨드 인코더 하나, submit 한 번.
        frame.pass(fieldTarget, fieldEffect);
        frame.pass(view, growthEffect);
      },
      { fps },
    );
  };

  const stopLoop = () => {
    loop?.stop();
    loop = null;
  };

  // 백그라운드 탭에서는 렌더를 완전히 멈춘다.
  const handleVisibility = () => {
    if (document.hidden) stopLoop();
    else startLoop();
  };
  document.addEventListener('visibilitychange', handleVisibility);

  const releaseError = gpu.onError(() => {
    // 디바이스 로스트를 포함한 모든 GPU 에러는 복구를 시도하지 않는다.
    // 조용히 접고 CSS 그라디언트로 돌아가는 편이 깨진 화면보다 낫다.
    opts.onFatal();
  });

  // 파이프라인을 미리 컴파일한다. 이걸 안 하면 첫 프레임에서 컴파일이 일어나
  // 등장하는 순간에 딱 한 번 크게 끊긴다 — 가장 눈에 띄는 자리다.
  // Surface 는 frame() 밖에서 넘길 수 없으므로(VGPU-SURFACE-NOT-IN-FRAME) 시그니처로 준다.
  await Promise.all([fieldEffect.compile(fieldTarget), growthEffect.compile({ colors: [view.format] })]).catch(() => {
    // 프리웜 실패는 치명적이지 않다. 첫 프레임에 지연 컴파일되고,
    // 진짜 문제라면 gpu.onError 가 잡는다.
  });

  if (stopped) {
    gpu.dispose();
    return { stop() {} };
  }

  startLoop();

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      stopLoop();
      document.removeEventListener('visibilitychange', handleVisibility);
      if (finePointer) {
        window.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerleave', handlePointerOut);
        window.removeEventListener('blur', handlePointerOut);
      }
      releaseError();
      releaseResize();
      gpu.dispose();
    },
  };
}
