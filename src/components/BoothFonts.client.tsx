'use client';

import { isBoothMode } from '@/lib/booth';
import { useEffect } from 'react';

const BOOTH_FONT_CSS_HREF = '/booth/fonts.css';
const LINK_ID = 'booth-fonts';

/**
 * 부스 모드일 때만 로컬 웹폰트 CSS 를 붙인다.
 *
 * Crimson Text 는 next/font 가 컴파일할 때 받아 같은 서버(/_next/static/media)에서 내려주므로
 * 서버가 한 번 컴파일된 뒤에는 네트워크가 없어도 나온다.
 * Pretendard 는 layout.tsx 가 jsdelivr 에서 링크로 받는다. 네트워크가 끊기면 조용히 실패하고
 * 시스템 폰트로 떨어지므로, 스냅샷으로 받아둔 로컬 사본을 같은 family 이름으로 얹어 원래 서체를 유지한다.
 * 렌더 트리에 아무 것도 그리지 않으며, 부스 모드가 아니면 완전히 무동작이다.
 */
export default function BoothFonts() {
  useEffect(() => {
    if (!isBoothMode()) return;
    if (document.getElementById(LINK_ID)) return;

    const link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    link.href = BOOTH_FONT_CSS_HREF;
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, []);

  return null;
}
