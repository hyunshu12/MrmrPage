'use client';

import { loadImage } from '@/components/halftone/gl';
import { LOGO_SDF_URL } from '@/components/intro/intro-flag';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { type HeroFrame, INNER_SHAPES, createHeroRenderer } from './hero-renderer';

/** 인트로가 내려앉은 뒤 잎 그림을 보여주는 시간. 이후 그림이 바뀌기 시작한다. */
const FIRST_HOLD_SECONDS = 4.2;
const HOLD_SECONDS = 3.4;
const MORPH_SECONDS = 1.2;
const ENTER_SECONDS = 1.4;

const easeOut = (x: number) => 1 - (1 - Math.min(Math.max(x, 0), 1)) ** 3;
const easeInOut = (x: number) => {
  const t = Math.min(Math.max(x, 0), 1);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};

/** 경과 시간 → [이전 그림, 다음 그림, 진행]. 바뀐 직후부터 HOLD 동안 머문다. */
function morphAt(t: number): HeroFrame['morph'] {
  if (t < FIRST_HOLD_SECONDS) return [0, 0, 0];
  const count = INNER_SHAPES.length;
  const cycle = MORPH_SECONDS + HOLD_SECONDS;
  const elapsed = t - FIRST_HOLD_SECONDS;
  const step = Math.floor(elapsed / cycle);
  const from = step % count;
  const to = (step + 1) % count;
  const progress = (elapsed - step * cycle) / MORPH_SECONDS;
  return progress >= 1 ? [to, to, 0] : [from, to, easeInOut(progress)];
}

interface MarkBox {
  x: number;
  y: number;
  unit: number;
}

/**
 * 홈 히어로의 하프톤 그래픽. 섹션을 꽉 채우는 장식 레이어다.
 *
 * 마크 자리는 CSS(.hero-mark)가 정한다. 캔버스와 인트로(IntroOverlay)가 둘 다 이 상자를 읽어서,
 * 인트로의 로고가 이 마크 위에 같은 크기·같은 점 격자로 정확히 내려앉는다.
 */
export default function HalftoneHero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const markEl = markRef.current;
    if (!root || !markEl) return;

    const measure = (): MarkBox => {
      const outer = root.getBoundingClientRect();
      const rect = markEl.getBoundingClientRect();
      return {
        x: rect.left - outer.left + rect.width / 2,
        y: rect.top - outer.top + rect.height / 2,
        unit: rect.width / 2,
      };
    };

    const play = (logoSdf: HTMLImageElement): (() => void) | undefined => {
      const canvas = document.createElement('canvas');
      canvas.className = 'absolute inset-0 h-full w-full';
      root.prepend(canvas);
      const renderer = createHeroRenderer(canvas, logoSdf);
      if (!renderer) {
        canvas.remove();
        setFallback(true);
        return undefined;
      }

      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const finePointer = window.matchMedia('(pointer: fine)').matches;
      const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
      let box = measure();
      let raf = 0;
      let last = 0;
      let t = 0;
      let visible = true;

      const draw = () =>
        renderer.draw({
          time: t,
          // 인트로가 내려앉을 때의 점 간격과 같다 (인트로: 시작 셀 ÷ 시작 단위 × 끝 단위).
          cell: Math.max(box.unit / 21, 3.5),
          mark: [box.x, box.y, box.unit],
          morph: still ? [0, 0, 0] : morphAt(t),
          pointer: [pointer.x, pointer.y],
          enter: still ? 1 : easeOut(t / ENTER_SECONDS),
        });

      const tick = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        // 인트로가 덮고 있는 동안은 시간을 멈춘다. 인트로가 내려앉는 순간 잎 그림이어야 하고,
        // 둘레 픽토그램은 화면이 열린 뒤에 튀어나와야 한다.
        if (!document.documentElement.hasAttribute('data-intro')) t += dt;
        const follow = 1 - Math.exp(-dt * 3);
        pointer.x += (pointer.targetX - pointer.x) * follow;
        pointer.y += (pointer.targetY - pointer.y) * follow;
        draw();
        raf = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
      };

      const resume = () => {
        if (still || raf || !visible || document.hidden) return;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      };

      // 화면 밖이거나 탭이 숨으면 그리지 않는다.
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        resume();
      });
      observer.observe(root);

      const onResize = () => {
        box = measure();
        renderer.resize();
        draw();
      };
      const onPointer = (event: PointerEvent) => {
        pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
      };

      draw();
      resume();
      window.addEventListener('resize', onResize);
      document.addEventListener('visibilitychange', resume);
      if (finePointer && !still) window.addEventListener('pointermove', onPointer, { passive: true });

      return () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', resume);
        window.removeEventListener('pointermove', onPointer);
        renderer.dispose();
        canvas.remove();
      };
    };

    let cancelled = false;
    let stop: (() => void) | undefined;
    loadImage(LOGO_SDF_URL)
      .then((image) => {
        if (!cancelled) stop = play(image);
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden="true" className="absolute inset-0">
      <div ref={markRef} data-hero-mark className="hero-mark">
        {/* WebGL2 를 못 쓰면 원래 로고를 같은 자리에 둔다. */}
        {fallback && <Image src="/logo.png" alt="" fill sizes="460px" className="object-contain" priority />}
      </div>
    </div>
  );
}
