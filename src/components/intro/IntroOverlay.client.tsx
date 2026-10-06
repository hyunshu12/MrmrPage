'use client';

import { loadImage } from '@/components/halftone/gl';
import { useEffect, useRef, useState } from 'react';
import { type HalftoneFrame, createHalftoneRenderer } from './halftone-renderer';
import { LOGO_SDF_URL } from './intro-flag';

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
const MOVE_SECONDS = 0.55;
const WIPE_START = 0.35;
const WIPE_SECONDS = 0.75;
const OUTRO_SECONDS = 1.15;
const TAGLINE = 'PLANT US · RAISE EARTH';

type Mark = readonly [x: number, y: number, unit: number];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function introMark(): Mark {
  // 세로 화면(폰)에서는 짧은 변이 좁아 마크가 작아지므로 비율을 키운다. 점 격자가 거칠어지지 않게.
  const short = Math.min(window.innerWidth, window.innerHeight);
  const unit = Math.min(short * (window.innerWidth < window.innerHeight ? 0.27 : 0.2), 220);
  return [window.innerWidth / 2, window.innerHeight * 0.46, unit];
}

/**
 * 홈 히어로의 하프톤 마크 자리([data-hero-mark], components/hero). 상자 가로 폭의 절반이 마크 단위 1 이다.
 * 히어로 캔버스가 같은 상자·같은 점 간격으로 마크를 그리므로, 인트로의 로고가 그 위에 그대로 겹친다.
 */
function heroLogoMark(fallback: Mark): Mark {
  const rect = document.querySelector('[data-hero-mark]')?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.bottom < 0 || rect.top > window.innerHeight) return fallback;
  return [rect.left + rect.width / 2, rect.top + rect.height / 2, rect.width / 2];
}

function releasePage() {
  document.documentElement.removeAttribute('data-intro');
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
  const [fallback, setFallback] = useState(false);

  readyRef.current = ready;
  onDoneRef.current = onDone;

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
      let from: Mark = introMark();
      let to: Mark = from;

      const skip = (event: Event) => {
        if (event.type === 'wheel' || event.type === 'touchmove') event.preventDefault();
        speed = SKIP_SPEED;
      };
      const onResize = () => {
        renderer.resize();
        if (outroStart === null) from = introMark();
      };

      const frame = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        t += dt * (outroStart === null ? speed : 1);

        if (outroStart === null && t >= HOLD_AT && readyRef.current) {
          outroStart = t;
          to = heroLogoMark(from);
        }
        const o = outroStart === null ? 0 : t - outroStart;

        const move = easeInOut(o / MOVE_SECONDS);
        const mark: Mark = [lerp(from[0], to[0], move), lerp(from[1], to[1], move), lerp(from[2], to[2], move)];
        const maxRadius = Math.hypot(window.innerWidth, window.innerHeight);
        const wipe = o > WIPE_START ? easeInOut((o - WIPE_START) / WIPE_SECONDS) * maxRadius * 1.1 : 0;

        if (!released && o >= WIPE_START) {
          released = true;
          releasePage();
        }

        const state: HalftoneFrame = {
          time: t,
          // 로고가 히어로 자리로 줄어드는 동안 격자도 같이 줄인다. 카메라가 물러나는 것처럼 보이고,
          // 작아진 로고가 거칠어지지 않는다.
          cell: Math.max(Math.min(Math.max(from[2] / 21, 5), 12) * (mark[2] / from[2]), 3.5),
          mark,
          grow: easeInOut((t - 0.3) / 1.6),
          hex: easeInOut((t - 1.75) / 0.9),
          invert: easeInOut((t - 1.95) / 0.6),
          idle: easeOut(t / 0.5),
          ripple: t > 0.35 ? t - 0.35 : -1,
          wipe,
          markAlpha: 1 - easeOut((o - 0.55) / 0.45),
        };
        renderer.draw(state);
        // 첫 프레임이 그려질 때까지는 막이 배경을 대신 칠한다. 이후 구멍은 캔버스가 연다.
        if (rootRef.current) rootRef.current.style.backgroundColor = 'transparent';

        const tagline = taglineRef.current;
        if (tagline) {
          const shown = easeOut((t - 2.3) / 0.5) * (1 - easeOut(o / 0.25));
          tagline.style.opacity = String(shown);
          tagline.style.top = `${mark[1] + mark[2] * 1.15}px`;
        }

        if (o >= OUTRO_SECONDS) {
          releasePage();
          onDoneRef.current();
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      window.addEventListener('resize', onResize);
      window.addEventListener('pointerdown', skip);
      window.addEventListener('keydown', skip);
      window.addEventListener('wheel', skip, { passive: false });
      window.addEventListener('touchmove', skip, { passive: false });
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointerdown', skip);
        window.removeEventListener('keydown', skip);
        window.removeEventListener('wheel', skip);
        window.removeEventListener('touchmove', skip);
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
        if (!cancelled) stop = play(logoSdf);
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  // WebGL2 가 없으면 모션 없이 어두운 막만 걷어낸다.
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
        style={{ fontFamily: "'Crimson Text', serif" }}>
        {TAGLINE}
      </p>
    </div>
  );
}
