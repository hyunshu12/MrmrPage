'use client';

import IntroOverlay from '@/components/intro/IntroOverlay.client';
import { markIntroSeen, shouldPlayIntro } from '@/components/intro/intro-flag';
import { CMS_QUERIES, bootPlanFor } from '@/lib/boot-plan';
import { imageRequestUrl } from '@/lib/image-loader';
import { SURFACE_SIZES } from '@/lib/image-sizes';
import { useQueryClient } from '@tanstack/react-query';
// preloadImage 의 new Image()(DOM) 와 이름이 겹치지 않게 NextImage 로 받는다.
import NextImage, { getImageProps } from 'next/image';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** 첫 방문에서 스플래시·인트로가 기다리는 최대 시간. 부트를 시작한 때부터 잰다. */
const BOOT_TIMEOUT_MS = 8000;
/** 화면이 열린 뒤 미리 받아 두는 CMS 이미지 수 상한. */
const MAX_WARM_IMAGES = 12;

/**
 * 화면의 <Image> 와 같은 srcset·sizes 로 이미지를 받아 둔다.
 * 후보 폭은 next/image 가 next.config 설정으로 만들고, 그중 무엇을 받을지는 브라우저가 실제 <img> 와 같은
 * 규칙으로 고른다(Chromium 은 DPR>1 에서 다른 브라우저와 고르는 법이 다르다). 그래서 기기와 상관없이
 * 페이지가 요청할 URL 과 같다.
 */
function preloadImage(src: string, sizes: string, fetchPriority: 'high' | 'low'): Promise<void> {
  return new Promise((resolve) => {
    try {
      const { props } = getImageProps({
        src,
        alt: '',
        fill: true,
        sizes,
        // 개발 모드의 LCP 경고 장부에 같은 URL 이 lazy 로 덮어써지지 않게 한다.
        loading: 'eager',
        loader: ({ src: url, width, quality }) => imageRequestUrl(url, width, quality),
      });
      const img = new Image();
      img.fetchPriority = fetchPriority;
      // sizes 를 srcset 보다 먼저 넣어야 처음부터 맞는 후보를 고른다.
      img.sizes = props.sizes ?? sizes;
      img.srcset = props.srcSet ?? props.src;
      img.decode().then(
        () => resolve(),
        () => resolve(),
      );
    } catch {
      resolve();
    }
  });
}

/** promise 가 끝나거나(실패 포함) ms 가 지나면 끝난다. */
function settleWithin(promise: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    const done = () => {
      window.clearTimeout(timer);
      resolve();
    };
    promise.then(done, done);
  });
}

/** 브라우저가 한가할 때 실행한다. requestIdleCallback 이 없으면(Safari) 잠시 뒤에. */
function whenIdle(run: () => void): void {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else {
    window.setTimeout(run, 300);
  }
}

function Splash() {
  return (
    // boot-splash: 인트로가 재생될 페이지에서는 CSS 가 이 막을 인트로 배경색으로 바꿔 깜빡임을 없앤다.
    <div
      aria-hidden="true"
      className="boot-splash fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-home">
      <div className="flex flex-col items-center gap-6">
        {/* 112~128px 로 그리므로 3022px 원본 대신 그 폭에 맞춘 사본을 받는다. */}
        <NextImage
          src="/logo.png"
          alt=""
          width={128}
          height={128}
          sizes="(min-width: 640px) 128px, 112px"
          loading="eager"
          className="float-slow h-28 w-28 object-contain sm:h-32 sm:w-32"
        />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muruk-green-lightest/40">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-muruk-green-primary/70" />
        </div>
      </div>
    </div>
  );
}

export default function AppBootGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // 부트는 전체 페이지 로드마다 한 번이다. 처음 연 경로만 보고, 이후 페이지 이동은 게이트와 상관없다.
  const pathname = usePathname();
  const bootPath = useRef(pathname);
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    setIntro(shouldPlayIntro());
  }, []);

  const finishIntro = useCallback(() => {
    markIntroSeen();
    setIntro(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const open = () => {
      if (!cancelled) setReady(true);
    };
    const plan = bootPlanFor(bootPath.current);

    // 이 라우트가 그리는 쿼리를 받는다. 저장해 둔 데이터가 있으면 그것으로 바로 열고,
    // staleTime 이 지난 것은 화면을 그대로 둔 채 뒤에서 다시 받는다.
    const firstVisit = plan.queries.some((query) => queryClient.getQueryData(query.queryKey) === undefined);
    const dataSettled = Promise.all(plan.queries.map((query) => query.load(queryClient)));

    let opened: Promise<void> = Promise.resolve();
    if (firstVisit) {
      // 첫 방문: 첫 화면의 데이터와 히어로만 기다린다. 시작부터 BOOT_TIMEOUT_MS 가 지나면 그냥 연다.
      const hero = plan.hero ? preloadImage(plan.hero, SURFACE_SIZES.hero, 'high') : undefined;
      opened = settleWithin(Promise.all([dataSettled, hero]), BOOT_TIMEOUT_MS);
      void opened.then(open);
    } else {
      open();
    }

    // 열린 뒤 한가할 때, 이 라우트에서 이어 보일 CMS 이미지 몇 장과 다른 라우트의 데이터를 받아 둔다.
    // 다른 라우트의 이미지는 받지 않는다.
    void Promise.all([opened, dataSettled]).then(() =>
      whenIdle(() => {
        if (cancelled) return;
        for (const image of plan.images(queryClient).slice(0, MAX_WARM_IMAGES)) {
          void preloadImage(image.src, image.sizes, 'low');
        }
        for (const query of CMS_QUERIES) {
          if (!plan.queries.includes(query)) void query.load(queryClient);
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  // 인트로는 페이지 위에 덮여 있다가 데이터가 준비되면 열리며 페이지를 드러낸다.
  return (
    <>
      {ready && children}
      {intro ? <IntroOverlay ready={ready} onDone={finishIntro} /> : !ready && <Splash />}
      {/* 스플래시·인트로는 aria-hidden 이라 보조기기에는 빈 화면이다. 기다리는 중임을 따로 알린다. */}
      {!ready && <output className="sr-only">페이지를 불러오는 중입니다.</output>}
    </>
  );
}
