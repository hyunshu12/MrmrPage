'use client';

import { type MutableRefObject, useEffect } from 'react';

const WHEEL_TRIGGER_THRESHOLD = 90;
const WHEEL_DECAY_MS = 320;
const LOCK_DURATION_MS = 700;
const MIN_VIEWPORT_WIDTH = 1024;

type SectionRefs = MutableRefObject<Array<HTMLElement | null>>;

export function useSnapScroll(sectionRefs: SectionRefs, onlyAtIndex0 = false): void {
  useEffect(() => {
    const shouldUseSnap = window.matchMedia('(pointer:fine)').matches && window.innerWidth >= MIN_VIEWPORT_WIDTH;
    if (!shouldUseSnap) return;

    const sections = sectionRefs.current.filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    let lock = false;
    let wheelDeltaAccum = 0;
    let wheelResetTimer: number | null = null;

    const findClosestSection = () => {
      const y = window.scrollY + window.innerHeight * 0.35;
      let closest = 0;
      let minDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < sections.length; i += 1) {
        const dist = Math.abs(sections[i].offsetTop - y);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      return closest;
    };

    const isInteractiveTarget = (event: Event) => {
      const target = event.target as HTMLElement | null;
      return target?.closest('a, button, input, textarea, select') !== null;
    };

    const transitionTo = (next: number) => {
      lock = true;
      sections[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        lock = false;
      }, LOCK_DURATION_MS);
    };

    const handleWheel = (event: WheelEvent) => {
      if (isInteractiveTarget(event)) return;
      if (onlyAtIndex0 && findClosestSection() > 0) return;
      if (Math.abs(event.deltaY) < 1.5) return;
      if (lock) {
        event.preventDefault();
        return;
      }

      const deltaUnit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const normalizedDelta = event.deltaY * deltaUnit;

      if (wheelResetTimer !== null) window.clearTimeout(wheelResetTimer);
      if (wheelDeltaAccum !== 0 && Math.sign(wheelDeltaAccum) !== Math.sign(normalizedDelta)) {
        wheelDeltaAccum = 0;
      }
      wheelDeltaAccum += normalizedDelta;
      wheelResetTimer = window.setTimeout(() => {
        wheelDeltaAccum = 0;
      }, WHEEL_DECAY_MS);

      if (Math.abs(wheelDeltaAccum) < WHEEL_TRIGGER_THRESHOLD) return;

      const current = findClosestSection();
      const direction = wheelDeltaAccum > 0 ? 1 : -1;
      const next = Math.min(Math.max(current + direction, 0), sections.length - 1);
      if (next === current) return;

      wheelDeltaAccum = 0;
      event.preventDefault();
      transitionTo(next);
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space'].includes(event.key)) return;
      if (onlyAtIndex0 && findClosestSection() > 0) return;
      if (lock) {
        event.preventDefault();
        return;
      }
      const current = findClosestSection();
      let next = current;
      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'Space') next = current + 1;
      if (event.key === 'ArrowUp' || event.key === 'PageUp') next = current - 1;
      next = Math.min(Math.max(next, 0), sections.length - 1);
      if (next === current) return;

      event.preventDefault();
      transitionTo(next);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeydown);
      if (wheelResetTimer !== null) window.clearTimeout(wheelResetTimer);
    };
  }, [sectionRefs, onlyAtIndex0]);
}
