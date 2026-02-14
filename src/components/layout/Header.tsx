'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', label: '홈' },
  { href: '/projects', label: '프로젝트' },
  { href: '/achievements', label: '업적' },
  { href: '/members', label: '멤버소개' },
  { href: '/faq', label: 'FAQ' },
];

export default function Header() {
  const pathname = usePathname();
  const isHeroOverlayPage = pathname === '/members' || pathname === '/projects' || pathname === '/achievements';
  const [hasPassedHero, setHasPassedHero] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isHeroZone = isHeroOverlayPage && !hasPassedHero;

  useEffect(() => {
    if (!isHeroOverlayPage) {
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
  }, [isHeroOverlayPage]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const activeLinkClass = isHeroZone
    ? 'text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]'
    : 'text-muruk-green-darker';
  const inactiveLinkClass = isHeroZone
    ? 'text-white/85 hover:text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]'
    : 'text-muruk-green-text/70 hover:text-muruk-green-darker';

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-md transition-all ${
        isHeroZone
          ? 'border-white/1 bg-white/1 shadow-[0_8px_22px_rgba(0,0,0,0.14)]'
          : 'border-white/45 bg-white/32 shadow-[0_10px_24px_rgba(0,0,0,0.08)]'
      }`}
    >
      <nav className="mx-auto flex max-w-[1920px] items-center justify-between px-4 py-3 sm:px-6 md:px-10 md:py-4 lg:px-16">
        {/* 무럭무럭 로고 */}
        <Link href="/" className="flex items-center">
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
                  className={`text-base font-semibold transition-colors lg:text-lg ${
                    isActive ? activeLinkClass : inactiveLinkClass
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Mobile menu button */}
        <button
          type="button"
          aria-label={isMobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition md:hidden ${
            isHeroZone
              ? 'border-white/35 bg-black/20 text-white'
              : 'border-muruk-green-border/35 bg-white/70 text-muruk-green-darker'
          }`}
        >
          <span className="sr-only">모바일 메뉴</span>
          <svg aria-hidden="true" focusable="false" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>

      {isMobileMenuOpen && (
        <div
          className={`border-t px-4 pb-4 pt-2 md:hidden ${
            isHeroZone
              ? 'border-white/20 bg-black/35'
              : 'border-muruk-green-border/20 bg-white/90'
          }`}
        >
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block rounded-xl px-3 py-2 text-base font-semibold transition-colors ${
                      isHeroZone
                        ? isActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/90 hover:bg-white/15 hover:text-white'
                        : isActive
                          ? 'bg-muruk-green-sage/15 text-muruk-green-darker'
                          : 'text-muruk-green-text/80 hover:bg-muruk-card-bg hover:text-muruk-green-darker'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}
