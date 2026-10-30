'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const navItems = [
  { href: '/', label: '홈' },
  { href: '/projects', label: '프로젝트' },
  { href: '/achievements', label: '업적' },
  { href: '/members', label: '멤버소개' },
  { href: '/faq', label: 'FAQ' },
];

const MOBILE_MENU_ID = 'mobile-menu';
// Tailwind md. 이 폭부터 데스크톱 메뉴가 보이고 모바일 토글·패널은 숨는다.
const DESKTOP_QUERY = '(min-width: 768px)';

export default function Header() {
  const pathname = usePathname();
  const isHeroOverlayPage = pathname === '/members' || pathname === '/projects' || pathname === '/achievements';
  const [hasPassedHero, setHasPassedHero] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isHeroZone = isHeroOverlayPage && !hasPassedHero;
  // 홈 첫 화면은 하프톤 그래픽이 차지한다. 바(배경·그림자) 없이 글자만 띄워 두고, 지나면 바가 생긴다.
  const isHome = pathname === '/';
  const isHomeHero = isHome && !hasPassedHero;
  const tracksHero = isHeroOverlayPage || isHome;

  // 페이지가 바뀌면(뒤로가기 포함) 메뉴를 닫는다. 렌더 중에 맞춰 새 페이지에 열린 패널이 한 프레임도 남지 않는다.
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  useEffect(() => {
    if (!tracksHero) {
      setHasPassedHero(false);
      return;
    }

    const updateState = () => {
      const heroBottomOffset = window.innerHeight - 120;
      setHasPassedHero(window.scrollY > heroBottomOffset);
    };

    updateState();
    window.addEventListener('scroll', updateState, { passive: true });
    window.addEventListener('resize', updateState);
    return () => {
      window.removeEventListener('scroll', updateState);
      window.removeEventListener('resize', updateState);
    };
  }, [tracksHero]);

  // 메뉴가 열린 동안만 스크롤을 잠근다. 닫히는 길이 무엇이든 cleanup 이 잠금을 푼다.
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    // 열린 채 md 이상으로 넓어지면(가로 회전 등) 토글이 사라져 닫을 수 없으므로 여기서 닫는다.
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsMobileMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMobileMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    desktop.addEventListener('change', onBreakpointChange);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener('change', onBreakpointChange);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // 현재 페이지는 색만이 아니라 밑줄로도 구분한다. 히어로 위에서는 흰 글자끼리라 색 차이가 거의 안 보인다.
  const activeLinkClass = isHeroZone
    ? 'text-white underline decoration-2 underline-offset-6 drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]'
    : 'text-muruk-green-deepest underline decoration-2 underline-offset-6';
  const inactiveLinkClass = isHeroZone
    ? 'text-white/85 hover:text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]'
    : 'text-muruk-green-text hover:text-muruk-green-deepest';

  return (
    // intro-chrome: 홈 인트로가 끝난 뒤 내려앉듯 나타난다 (globals.css).
    <header
      className={`intro-chrome fixed left-0 right-0 top-0 z-50 border-b transition-all duration-500 ${
        isHeroZone
          ? 'border-white/1 bg-white/1 shadow-[0_8px_22px_rgba(0,0,0,0.14)] backdrop-blur-md'
          : isHomeHero
            ? 'border-transparent bg-transparent shadow-none'
            : 'border-white/45 bg-white/32 shadow-[0_10px_24px_rgba(0,0,0,0.08)] backdrop-blur-md'
      }`}>
      <nav
        aria-label="주 메뉴"
        className="mx-auto flex max-w-[1920px] items-center justify-between px-4 py-3 sm:px-6 md:px-10 md:py-4 lg:px-16">
        {/* 무럭무럭 로고. 이미 홈이면 페이지가 바뀌지 않으므로 메뉴를 직접 닫는다. */}
        <Link href="/" onClick={closeMobileMenu} className="flex items-center">
          <Image
            src="/logo.png"
            alt="무럭무럭 로고"
            width={48}
            height={48}
            className={`h-10 w-10 object-contain sm:h-11 sm:w-11 md:h-12 md:w-12 ${isHeroZone ? 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]' : ''}`}
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden items-center gap-5 md:flex lg:gap-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`text-base font-semibold transition-colors lg:text-lg ${
                    isActive ? activeLinkClass : inactiveLinkClass
                  }`}>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Mobile menu button */}
        <button
          ref={menuButtonRef}
          type="button"
          aria-label={isMobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
          aria-expanded={isMobileMenuOpen}
          aria-controls={MOBILE_MENU_ID}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition md:hidden ${
            isHeroZone
              ? 'border-white/35 bg-black/20 text-white'
              : 'border-muruk-green-border/35 bg-white/70 text-muruk-green-darker'
          }`}>
          <span className="sr-only">모바일 메뉴</span>
          <svg
            aria-hidden="true"
            focusable="false"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>

      {isMobileMenuOpen && (
        <nav
          id={MOBILE_MENU_ID}
          aria-label="모바일 메뉴"
          className={`border-t px-4 pb-4 pt-2 md:hidden ${
            isHeroZone ? 'border-white/20 bg-black/35' : 'border-muruk-green-border/20 bg-white/90'
          }`}>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={closeMobileMenu}
                    className={`block rounded-xl px-3 py-2 text-base font-semibold transition-colors ${
                      isHeroZone
                        ? isActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/90 hover:bg-white/15 hover:text-white'
                        : isActive
                          ? 'bg-muruk-green-sage/15 text-muruk-green-deepest'
                          : 'text-muruk-green-text hover:bg-muruk-card-bg hover:text-muruk-green-deepest'
                    }`}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
