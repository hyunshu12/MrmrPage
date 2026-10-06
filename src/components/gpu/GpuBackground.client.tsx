'use client';

import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useEffect, useRef, useState } from 'react';
import type { SceneHandle } from './scene';

/**
 * 홈 배경의 WebGPU 레이어.
 *
 * 이 컴포넌트는 기존 CSS 그라디언트를 대체하지 않고 그 위에 얹힌다.
 * 그래서 GPU 를 못 쓰는 모든 경우(미지원·reduced-motion·디바이스 로스트·SSR)에
 * 캔버스를 걷어내기만 하면 지금까지의 화면이 그대로 남는다. 별도 폴백이 필요 없다.
 */

/** 모바일은 발열·배터리 때문에 프레임을 절반으로 묶는다. */
const MOBILE_FPS = 30;
const DESKTOP_FPS = 60;

function canRender(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('gpu' in navigator)) return false;
  // 움직임을 줄이라는 요청에는 감속이 아니라 완전 제외로 답한다.
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function GpuBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useScrollProgress();
  const [dismissed, setDismissed] = useState(false);

  /**
   * 씬의 시작과 정리를 한 줄로 세우는 체인.
   *
   * 씬 하나가 캔버스 컨텍스트를 configure 하고, 멈출 때 dispose 로 unconfigure 한다.
   * 캔버스 엘리먼트는 마운트 간에 재사용되므로 두 씬이 겹치면 먼저 시작한 씬의 뒤늦은
   * 정리가 나중 씬이 쓰고 있는 컨텍스트까지 해제해 버린다. 그러면 다음 프레임의
   * getCurrentTexture 가 "context is not configured" 로 던지고 루프가 죽어 캔버스가 빈 채로 남는다.
   * startScene 이 비동기라 정리 시점엔 핸들이 아직 없어서 동기적으로 막을 수가 없다.
   * 그래서 이전 정리가 끝난 뒤에만 다음 시작이 이어지도록 직렬화한다.
   * (Strict Mode 의 이중 마운트에서 매번 재현되고, 빠른 라우트 왕복에서도 같은 경합이 난다.)
   */
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    if (dismissed || !canRender()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let handle: SceneHandle | null = null;
    let cancelled = false;

    const coarse = window.matchMedia('(pointer: coarse)').matches;

    const started = chainRef.current
      .catch(() => undefined)
      .then(async () => {
        if (cancelled) return;
        // WebGPU 가 있는 브라우저만 vgpu 청크를 내려받는다.
        const { startScene } = await import('./scene');
        if (cancelled) return;

        const scene = await startScene(canvas, () => stateRef.current, {
          fps: coarse ? MOBILE_FPS : DESKTOP_FPS,
          intensity: 1,
          onFatal: () => setDismissed(true),
        });

        if (cancelled) {
          scene.stop();
          return;
        }
        handle = scene;
      })
      .catch(() => {
        // 어댑터 없음(VGPU-RING1-UNSUPPORTED), 셰이더 컴파일 실패 등.
        // 조용히 접는다. 배경은 CSS 그라디언트가 이미 그리고 있다.
        // 이미 정리된 뒤의 실패는 되살릴 필요가 없다.
        if (!cancelled) setDismissed(true);
      });

    chainRef.current = started;

    return () => {
      cancelled = true;
      // 시작이 끝난 뒤에 멈춘다. 이 정리가 끝나야 다음 씬이 시작할 수 있다.
      chainRef.current = started.then(() => {
        handle?.stop();
        handle = null;
      });
    };
  }, [dismissed, stateRef]);

  if (dismissed) return null;

  return (
    // 순수 장식 레이어다. 스크린 리더에서 숨기고(aria-hidden),
    // 포커스 순서에서도 빼서(tabIndex -1) 키보드 사용자의 탭 이동을 방해하지 않는다.
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
