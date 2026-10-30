'use client';

import { loadImage, visibleTimeout, watchResize } from '@/components/halftone/gl';
import { easeInOut, easeOut, heroCell, introCell, lerp } from '@/components/halftone/motion';
import { useEffect, useRef, useState } from 'react';
import { type HalftoneFrame, createHalftoneRenderer } from './halftone-renderer';
import { LOGO_SDF_URL, LOGO_SDF_WAIT_MS, setIntroOverlayMounted } from './intro-flag';

/**
 * 홈 첫 진입 인트로. 씨앗 → 새싹 → 로고로 자라는 하프톤 모션을 보여주고,
 * 데이터가 준비되면 로고가 히어로 로고 자리로 내려앉으며 화면이 열린다.
 *
 * 재생 여부는 layout 의 인라인 스크립트가 첫 페인트 전에 <html data-intro> 로 정한다
 * (홈 · 세션 첫 방문 · 움직임 줄이기 꺼짐). 이 속성이 있는 동안 스크롤과 히어로 등장
 * 애니메이션이 멈춰 있다가, 화면이 열리는 순간 함께 풀린다 (globals.css).
 */

/** 이 시점까지 자란 뒤에야 퇴장할 수 있다. 데이터가 더 늦으면 여기서 숨 쉬며 기다린다. */
const HOLD_AT = 2.9;
/** 클릭·키·휠로 건너뛰면 남은 성장을 이 배속으로 감는다. */
const SKIP_SPEED = 5;
// 퇴장: 로고가 히어로 자리로 옮겨 앉고(MOVE), 그 아래에서 화면이 점으로 번지며 열린다(WIPE).
const MOVE_SECONDS = 0.75;
const WIPE_START = 0.5;
const WIPE_SECONDS = 1.15;
const OUTRO_SECONDS = 1.75;
const TAGLINE = 'PLANT US · RAISE EARTH';

type Mark = readonly [x: number, y: number, unit: number];

function introMark(): Mark {
  // 세로 화면(폰)에서는 짧은 변이 좁아 마크가 작아지므로 비율을 키운다. 점 격자가 거칠어지지 않게.
  const short = Math.min(window.innerWidth, window.innerHeight);
  const unit = Math.min(short * (window.innerWidth < window.innerHeight ? 0.27 : 0.2), 220);
  return [window.innerWidth / 2, window.innerHeight * 0.46, unit];
}

/**
 * 홈 히어로의 하프톤 마크 자리([data-hero-mark], components/hero). 상자 가로 폭의 절반이 마크 단위 1 이다.
 * 히어로 캔버스가 같은 상자·같은 점 간격으로 마크를 그리므로, 인트로의 로고가 그 위에 그대로 겹친다.
 * 화면에 없으면 null.
 */
function heroLogoMark(): Mark | null {
  const rect = document.querySelector('[data-hero-mark]')?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.bottom < 0 || rect.top > window.innerHeight) return null;
  return [rect.left + rect.width / 2, rect.top + rect.height / 2, rect.width / 2];
}

/** 상단 바·섹션 점 등장 애니메이션(globals.css 의 chromeDrop 550+700ms, chromeFade 800+700ms)이 다 끝나는 시점. */
const CHROME_SETTLE_MS = 1600;

/** 페이지를 풀어 준다. data-intro-done 이 붙으면 상단 바와 섹션 점이 뒤늦게 내려앉는다 (globals.css). */
function releasePage() {
  const root = document.documentElement;
  if (!root.hasAttribute('data-intro')) return;
  root.removeAttribute('data-intro');
  root.setAttribute('data-intro-done', '');
  // 등장 애니메이션은 인트로 직후 한 번만 쓴다. 섹션 점은 홈에 들어올 때마다 새로 마운트되므로,
  // 속성을 남겨 두면 다른 페이지에 갔다 돌아올 때마다 다시 페이드인한다.
  window.setTimeout(() => root.removeAttribute('data-intro-done'), CHROME_SETTLE_MS);
}

interface IntroOverlayProps {
  /** 데이터·이미지 워밍업이 끝났는지. 끝나기 전에는 퇴장하지 않는다. */
  ready: boolean;
  onDone: () => void;
}

export default function IntroOverlay({ ready, onDone }: IntroOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const readyRef = useRef(ready);
  const onDoneRef = useRef(onDone);
  /** 로고 텍스처를 받아 재생을 시작했거나 기다림을 포기했는지. 먼저 정해진 쪽만 따른다. */
  const settledRef = useRef(false);
  const [fallback, setFallback] = useState(false);

  readyRef.current = ready;
  onDoneRef.current = onDone;

  // 오버레이가 떠 있는 동안 무거운 초기화(WebGPU 배경)를 미룬다 (intro-flag 의 afterIntro).
  useEffect(() => {
    setIntroOverlayMounted(true);
    return () => setIntroOverlayMounted(false);
  }, []);

  // 막이 덮고 있는 동안 Tab 으로 보이지 않는 링크(아직 숨은 상단 바 등)에 포커스가 가지 않게 한다.
  useEffect(() => {
    const blockTab = (event: KeyboardEvent) => {
      if (event.key === 'Tab') event.preventDefault();
    };
    window.addEventListener('keydown', blockTab);
    return () => window.removeEventListener('keydown', blockTab);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const play = (logoSdf: HTMLImageElement): (() => void) | undefined => {
      // 캔버스는 마운트마다 새로 만든다. 정리할 때 컨텍스트를 끊으므로 같은 캔버스를 다시 쓰면
      // (Strict Mode 의 재마운트) 끊긴 컨텍스트를 받아 셰이더 생성이 실패한다.
      const canvas = document.createElement('canvas');
      canvas.className = 'absolute inset-0 h-full w-full';
      root.prepend(canvas);
      const renderer = createHalftoneRenderer(canvas, logoSdf);
      if (!renderer) {
        canvas.remove();
        setFallback(true);
        return undefined;
      }

      let raf = 0;
      let last = performance.now();
      let t = 0;
      let speed = 1;
      let outroStart: number | null = null;
      let released = false;
      let lost = false;
      let from: Mark = introMark();
      let to: Mark = from;
      // 내려앉을 히어로 마크의 점 간격. 히어로를 못 찾으면 null 이고 시작 간격을 그대로 쓴다.
      let landingCell: number | null = null;

      const skip = (event: Event) => {
        if (event.type === 'wheel' || event.type === 'touchmove') event.preventDefault();
        speed = SKIP_SPEED;
      };

      /** 지금 시각의 장면을 그린다. */
      const render = () => {
        const o = outroStart === null ? 0 : t - outroStart;
        const move = easeInOut(o / MOVE_SECONDS);
        const mark: Mark = [lerp(from[0], to[0], move), lerp(from[1], to[1], move), lerp(from[2], to[2], move)];
        const maxRadius = Math.hypot(window.innerWidth, window.innerHeight);
        const startCell = introCell(from[2]);

        const state: HalftoneFrame = {
          time: t,
          // 로고가 히어로 자리로 옮겨 앉는 동안 점 간격도 히어로의 간격으로 함께 옮겨 간다. 카메라가 물러나는
          // 것처럼 보이고, 착지 순간 히어로의 격자와 정확히 같아진다 (halftone/motion.ts).
          cell: lerp(startCell, landingCell ?? startCell, move),
          mark,
          grow: easeInOut((t - 0.3) / 1.6),
          hex: easeInOut((t - 1.75) / 0.9),
          invert: easeInOut((t - 1.95) / 0.6),
          idle: easeOut(t / 0.5),
          ripple: t > 0.35 ? t - 0.35 : -1,
          wipe: o > WIPE_START ? easeInOut((o - WIPE_START) / WIPE_SECONDS) * maxRadius * 1.1 : 0,
          markAlpha: 1 - easeOut((o - 0.8) / 0.6),
        };
        renderer.draw(state);
        // 첫 프레임이 그려질 때까지는 막이 배경을 대신 칠한다. 이후 구멍은 캔버스가 연다.
        root.style.backgroundColor = 'transparent';

        const tagline = taglineRef.current;
        if (tagline) {
          const shown = easeOut((t - 2.3) / 0.5) * (1 - easeOut(o / 0.35));
          tagline.style.opacity = String(shown);
          tagline.style.top = `${mark[1] + mark[2] * 1.15}px`;
        }
      };

      const onResize = () => {
        if (lost) return;
        renderer.resize();
        if (outroStart === null) {
          from = introMark();
        } else if (landingCell !== null) {
          // 와이프가 시작되며 스크롤바가 생기면 히어로 마크가 옆으로 옮겨 간다. 착지점을 다시 잰다.
          const hero = heroLogoMark();
          if (hero) {
            to = hero;
            landingCell = heroCell(hero[2]);
          }
        }
        // 크기가 바뀌면 백버퍼가 지워진다. 이번 페인트 전에 다시 그려 막이 비치지 않게 한다.
        render();
      };

      const frame = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        t += dt * (outroStart === null ? speed : 1);

        if (outroStart === null && t >= HOLD_AT && readyRef.current) {
          outroStart = t;
          const hero = heroLogoMark();
          to = hero ?? from;
          landingCell = hero ? heroCell(hero[2]) : null;
        }
        const o = outroStart === null ? 0 : t - outroStart;

        if (!released && o >= WIPE_START) {
          released = true;
          releasePage();
        }
        render();

        if (o >= OUTRO_SECONDS) {
          releasePage();
          onDoneRef.current();
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      const stopWatching = watchResize(canvas, onResize);

      // GPU 리셋 등으로 컨텍스트를 잃으면 캔버스가 투명해진다. 모션을 접고 폴백(막을 걷는 경로)으로 넘긴다.
      const onContextLost = () => {
        lost = true;
        cancelAnimationFrame(raf);
        // 아직 페이지를 덮고 있어야 할 때는 막의 배경색을 되살려 아래가 비치지 않게 한다.
        if (!released) root.style.backgroundColor = '';
        setFallback(true);
      };
      canvas.addEventListener('webglcontextlost', onContextLost);

      window.addEventListener('pointerdown', skip);
      window.addEventListener('keydown', skip);
      window.addEventListener('wheel', skip, { passive: false });
      window.addEventListener('touchmove', skip, { passive: false });
      return () => {
        cancelAnimationFrame(raf);
        stopWatching();
        window.removeEventListener('pointerdown', skip);
        window.removeEventListener('keydown', skip);
        window.removeEventListener('wheel', skip);
        window.removeEventListener('touchmove', skip);
        // dispose 가 컨텍스트를 일부러 끊으므로 그 전에 손실 처리를 뗀다.
        canvas.removeEventListener('webglcontextlost', onContextLost);
        renderer.dispose();
        canvas.remove();
      };
    };

    // 로고 거리장 텍스처를 디코드한 뒤에 시작한다. layout 의 인라인 스크립트가 미리 받아 두므로
    // 대개 캐시에서 바로 나온다. 그동안은 막(배경색)이 화면을 덮고 있다.
    let cancelled = false;
    let stop: (() => void) | undefined;
    loadImage(LOGO_SDF_URL)
      .then((logoSdf) => {
        if (cancelled || settledRef.current) return;
        settledRef.current = true;
        stop = play(logoSdf);
      })
      .catch(() => {
        if (cancelled || settledRef.current) return;
        settledRef.current = true;
        setFallback(true);
      });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  // 텍스처 요청이 멈추면 재생을 시작하지 못한 채 막만 남는다. 페이지가 준비된 뒤에도 안 오면 모션 없이 연다.
  // 탭이 보이는 동안만 잰다. 백그라운드 탭으로 열었을 때 아무도 못 본 채 인트로를 써 버리지 않게.
  useEffect(() => {
    if (!ready) return;
    return visibleTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      setFallback(true);
    }, LOGO_SDF_WAIT_MS);
  }, [ready]);

  // WebGL2 가 없거나 텍스처를 못 받으면 모션 없이 어두운 막만 걷어낸다.
  useEffect(() => {
    if (!fallback || !ready) return;
    releasePage();
    const timer = window.setTimeout(() => onDoneRef.current(), 450);
    return () => window.clearTimeout(timer);
  }, [fallback, ready]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] bg-muruk-green-night transition-opacity duration-500 ${
        fallback && ready ? 'opacity-0' : ''
      }`}>
      <p
        ref={taglineRef}
        className="absolute left-0 right-0 text-center text-xs font-semibold tracking-[0.4em] text-muruk-cream/80 opacity-0 sm:text-sm"
        style={{ fontFamily: 'var(--font-crimson), serif' }}>
        {TAGLINE}
      </p>
      {/* 모션 없이 데이터를 기다리는 동안에도 진행 중임을 보인다(다른 페이지 스플래시와 같은 막대). */}
      {fallback && !ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-1 w-24 overflow-hidden rounded-full bg-muruk-cream/15">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-muruk-cream/60" />
          </div>
        </div>
      )}
    </div>
  );
}
