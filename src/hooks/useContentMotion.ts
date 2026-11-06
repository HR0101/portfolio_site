'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

// Replay a short, staggered transition when existing copy changes. The live
// region itself stays mounted, so assistive technology still sees the update.
export function useContentMotion<T extends HTMLElement>(key: string | number) {
  const ref = useRef<T>(null);
  const previous = useRef(key);
  const animations = useRef(new Set<Animation>());

  useLayoutEffect(() => {
    if (previous.current === key) return;
    previous.current = key;
    animations.current.forEach(animation => animation.cancel());
    animations.current.clear();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    Array.from(ref.current?.children ?? []).forEach((element, index) => {
      if (!(element instanceof HTMLElement) || !element.animate) return;
      const animation = element.animate(
        [{ opacity: 0.2, translate: '0 12px' }, { opacity: 1, translate: '0 0' }],
        { duration: 460, delay: Math.min(index, 4) * 45, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' },
      );
      animations.current.add(animation);
      const release = () => animations.current.delete(animation);
      animation.onfinish = release;
      animation.oncancel = release;
    });
  }, [key]);

  useEffect(() => {
    const active = animations.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cancel = () => { active.forEach(animation => animation.cancel()); active.clear(); };
    const onChange = () => { if (media.matches) cancel(); };
    media.addEventListener('change', onChange);
    return () => { cancel(); media.removeEventListener('change', onChange); };
  }, []);

  return ref;
}
