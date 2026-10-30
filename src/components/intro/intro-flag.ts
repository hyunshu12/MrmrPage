/** 이 세션에서 인트로를 이미 봤는지. 홈으로 돌아올 때마다 다시 재생되지 않게 한다. */
const INTRO_SEEN_KEY = 'mrmr:intro-seen';

/** 로고 거리장 텍스처 (scripts/intro/gen-logo-sdf.py 가 만든다). */
export const LOGO_SDF_URL = '/intro/logo-sdf.png';

/**
 * 페이지가 준비된 뒤에도 로고 텍스처를 이만큼 더 못 받으면(요청이 멈춤) 기다리지 않는다.
 * 인트로는 모션 없이 막을 걷고, 히어로는 그동안 정적인 로고 이미지를 보이다가 텍스처가 오면 하프톤으로 바꾼다.
 * 탭이 숨어 있던 시간은 세지 않는다 (halftone/gl 의 visibleTimeout).
 */
export const LOGO_SDF_WAIT_MS = 1500;

/**
 * 첫 페인트 전에 도는 인라인 스크립트. 인트로를 재생할 조건이면 <html data-intro> 를 단다.
 * (홈 · 세션 첫 방문 · 움직임 줄이기 꺼짐) 재생할 거라면 로고 텍스처도 이때 받기 시작한다.
 *
 * React 가 뜬 뒤에 정하면 기본 스플래시(크림색)가 먼저 보였다가 어두운 인트로로 바뀌며 깜빡인다.
 */
export const INTRO_FLAG_SCRIPT = `(function(){try{if(location.pathname!=='/')return;if(sessionStorage.getItem('${INTRO_SEEN_KEY}'))return;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.documentElement.setAttribute('data-intro','');new Image().src='${LOGO_SDF_URL}';}catch(e){}})();`;

export function shouldPlayIntro(): boolean {
  return document.documentElement.hasAttribute('data-intro');
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // 저장소를 못 쓰면 다음에 한 번 더 보일 뿐이다.
  }
}

// data-intro 는 와이프가 시작될 때 먼저 떨어지므로, 오버레이가 아직 떠 있는지는 따로 센다.
let overlayMounted = false;
const afterIntroQueue = new Set<() => void>();

/** IntroOverlay 가 마운트·언마운트될 때 부른다. 내려가면 미뤄 둔 작업을 시작한다. */
export function setIntroOverlayMounted(mounted: boolean): void {
  overlayMounted = mounted;
  if (mounted) return;
  for (const run of [...afterIntroQueue]) run();
  afterIntroQueue.clear();
}

/**
 * 인트로(퇴장 와이프까지)가 끝난 뒤에 run 을 부른다. 인트로가 없거나 이미 끝났으면 바로 부른다.
 * 인트로 프레임과 경쟁하면 안 되는 무거운 초기화(WebGPU 배경)에 쓴다. 반환값은 취소 함수.
 */
export function afterIntro(run: () => void): () => void {
  if (!overlayMounted && !shouldPlayIntro()) {
    run();
    return () => {};
  }
  afterIntroQueue.add(run);
  return () => {
    afterIntroQueue.delete(run);
  };
}
