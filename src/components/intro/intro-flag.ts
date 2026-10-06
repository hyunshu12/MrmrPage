/** 이 세션에서 인트로를 이미 봤는지. 홈으로 돌아올 때마다 다시 재생되지 않게 한다. */
const INTRO_SEEN_KEY = 'mrmr:intro-seen';

/** 로고 거리장 텍스처 (scripts/intro/gen-logo-sdf.py 가 만든다). */
export const LOGO_SDF_URL = '/intro/logo-sdf.png';

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
