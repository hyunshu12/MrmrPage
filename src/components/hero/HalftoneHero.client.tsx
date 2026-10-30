'use client';

import { loadImage, visibleTimeout, watchResize } from '@/components/halftone/gl';
import { easeInOut, easeOut, heroCell } from '@/components/halftone/motion';
import { LOGO_SDF_URL, LOGO_SDF_WAIT_MS } from '@/components/intro/intro-flag';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { type HeroFrame, type HeroRenderer, INNER_SHAPES, createHeroRenderer } from './hero-renderer';

/** 인트로가 내려앉은 뒤 잎 그림을 보여주는 시간. 이후 그림이 바뀌기 시작한다. */
const FIRST_HOLD_SECONDS = 2.2;
const HOLD_SECONDS = 2.8;
const MORPH_SECONDS = 1.0;
const ENTER_SECONDS = 2.2;
/** 착지 직후 한 번, 이후 그림이 바뀔 때마다 성장 파동이 퍼진다. */
const LANDING_PULSE_AT = 0.15;
/** 마크가 위아래로 떠다니는 폭(마크 단위)과 커서 쪽으로 기우는 폭(px). */
const FLOAT_UNITS = 0.03;
const MARK_PARALLAX_PX = 6;
/**
 * 직전 프레임에서 이보다 빨리 돌아온 rAF 는 건너뛴다. 120Hz 이상 화면에서만 걸려 60fps 안팎으로 그리고,
 * 60~100Hz 화면은 지금처럼 매 프레임 그린다 (60fps 아래로는 내리지 않는다).
 */
const MIN_FRAME_MS = 9.2;

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

/** 마지막 성장 파동 이후 경과 시간. 착지 파동 전이면 -1. */
function pulseAt(t: number): number {
  if (t < FIRST_HOLD_SECONDS) return t >= LANDING_PULSE_AT ? t - LANDING_PULSE_AT : -1;
  const cycle = MORPH_SECONDS + HOLD_SECONDS;
  return (t - FIRST_HOLD_SECONDS) % cycle;
}

/** 인트로가 화면을 덮고 있는지 (components/intro). */
function introCovering(): boolean {
  return document.documentElement.hasAttribute('data-intro');
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
      const created = createHeroRenderer(canvas, logoSdf);
      if (!created) {
        canvas.remove();
        setFallback(true);
        return undefined;
      }
      let renderer: HeroRenderer = created;

      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const finePointer = window.matchMedia('(pointer: fine)').matches;
      // x, y: 화면 기준 -1..1 (시차) · px, py: 캔버스 기준 CSS px (점 부풀림) · on: 세기
      const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, px: 0, py: 0, on: 0, targetOn: 0 };
      let box = measure();
      let raf = 0;
      let last = 0;
      let t = 0;
      let visible = true;
      // 컨텍스트를 잃은 동안은 그리지 않고 정적인 로고 이미지가 대신한다.
      let lost = false;

      const draw = () => {
        if (lost) return;
        // 착지 순간엔 정확히 마크 상자 위에 있어야 하므로, 떠다님과 기울임은 0 에서 천천히 차오른다.
        const settle = still ? 0 : easeOut(t / 2);
        renderer.draw({
          time: t,
          // 인트로도 내려앉는 순간 이 점 간격이 된다 (halftone/motion.ts).
          cell: heroCell(box.unit),
          mark: [
            box.x + pointer.x * MARK_PARALLAX_PX * settle,
            box.y + Math.sin(t * 0.9) * box.unit * FLOAT_UNITS * settle,
            box.unit,
          ],
          morph: still ? [0, 0, 0] : morphAt(t),
          pointer: [pointer.x, pointer.y],
          enter: still ? 1 : easeOut(t / ENTER_SECONDS),
          pulse: still ? -1 : pulseAt(t),
          cursor: [pointer.px, pointer.py, pointer.on * settle],
        });
      };

      // 인트로가 덮고 있는 동안은 시간을 멈춘다. 인트로가 내려앉는 순간 잎 그림이어야 하고, 둘레 픽토그램은
      // 화면이 열린 뒤에 튀어나와야 한다. 그동안은 매 프레임이 같은 그림이라 한 장만 그려 두고 루프를 세운다.
      // 화면 밖이거나 탭이 숨어도 그리지 않는다.
      const canAnimate = () => !still && !lost && visible && !document.hidden && !introCovering();

      const tick = (now: number) => {
        raf = 0;
        if (!canAnimate()) return;
        raf = requestAnimationFrame(tick);
        if (now - last < MIN_FRAME_MS) return;
        const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
        last = now;
        t += dt;
        const follow = 1 - Math.exp(-dt * 3);
        pointer.x += (pointer.targetX - pointer.x) * follow;
        pointer.y += (pointer.targetY - pointer.y) * follow;
        pointer.on += (pointer.targetOn - pointer.on) * (1 - Math.exp(-dt * 5));
        draw();
      };

      const resume = () => {
        if (raf || !canAnimate()) return;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      };

      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        resume();
      });
      observer.observe(root);

      // 인트로가 화면을 여는 순간(data-intro 가 떨어질 때) 멈춰 둔 시간을 흘려보낸다.
      const introObserver = new MutationObserver(() => {
        if (introCovering()) return;
        introObserver.disconnect();
        // 루프를 세워 둔 사이 커서 추종도 멈춰 있었다. 계속 돌았다면 이미 따라가 있었을 자리로 맞춘다.
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
        pointer.on = pointer.targetOn;
        resume();
      });
      if (introCovering()) {
        introObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-intro'] });
      }

      const onResize = () => {
        box = measure();
        renderer.resize();
        draw();
      };
      const onPointer = (event: PointerEvent) => {
        pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
        const outer = root.getBoundingClientRect();
        pointer.px = event.clientX - outer.left;
        pointer.py = event.clientY - outer.top;
        pointer.targetOn = 1;
      };
      const onPointerLeave = () => {
        pointer.targetOn = 0;
      };

      // GPU 리셋·메모리 압박으로 컨텍스트를 잃으면 캔버스가 빈다. 복원될 때까지 정적인 로고를 보인다.
      const onContextLost = (event: Event) => {
        event.preventDefault(); // 브라우저가 컨텍스트를 되살리도록 허락한다.
        lost = true;
        cancelAnimationFrame(raf);
        raf = 0;
        setFallback(true);
      };
      const onContextRestored = () => {
        // 잃은 컨텍스트의 프로그램·텍스처는 모두 무효라 렌더러를 새로 만든다. 실패하면 로고를 그대로 둔다.
        const next = createHeroRenderer(canvas, logoSdf);
        if (!next) return;
        renderer = next;
        lost = false;
        setFallback(false);
        draw();
        resume();
      };
      canvas.addEventListener('webglcontextlost', onContextLost);
      canvas.addEventListener('webglcontextrestored', onContextRestored);

      draw();
      resume();
      const stopWatching = watchResize(root, onResize);
      document.addEventListener('visibilitychange', resume);
      if (finePointer && !still) {
        window.addEventListener('pointermove', onPointer, { passive: true });
        document.documentElement.addEventListener('pointerleave', onPointerLeave);
      }

      return () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
        introObserver.disconnect();
        stopWatching();
        document.removeEventListener('visibilitychange', resume);
        window.removeEventListener('pointermove', onPointer);
        document.documentElement.removeEventListener('pointerleave', onPointerLeave);
        // dispose 가 컨텍스트를 일부러 끊으므로 그 전에 손실 처리를 뗀다.
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
        renderer.dispose();
        canvas.remove();
      };
    };

    let cancelled = false;
    let stop: (() => void) | undefined;
    // 페이지가 준비된 뒤에 마운트되므로, 텍스처가 늦으면 마크 자리를 비워 두지 않고 그동안 로고를 보인다.
    // 늦게라도 오면 컨텍스트 복원 때처럼 하프톤으로 바꾼다.
    const cancelWait = visibleTimeout(() => setFallback(true), LOGO_SDF_WAIT_MS);
    loadImage(LOGO_SDF_URL)
      .then((image) => {
        cancelWait();
        if (cancelled) return;
        stop = play(image);
        // 렌더러를 못 만들면 play 가 스스로 로고로 돌린다.
        if (stop) setFallback(false);
      })
      .catch(() => {
        cancelWait();
        if (!cancelled) setFallback(true);
      });

    return () => {
      cancelled = true;
      cancelWait();
      stop?.();
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden="true" className="absolute inset-0">
      <div ref={markRef} data-hero-mark className="hero-mark">
        {/* WebGL2 를 못 쓰거나, 텍스처가 늦거나, 컨텍스트를 잃은 동안은 원래 로고를 같은 자리에 둔다. */}
        {fallback && <Image src="/logo.png" alt="" fill sizes="460px" className="object-contain" priority />}
      </div>
    </div>
  );
}
