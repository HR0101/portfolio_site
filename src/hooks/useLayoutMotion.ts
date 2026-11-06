'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface Position { left: number; top: number; visible: boolean }

// Capture immediately before changing a list. Stable keys let retained items
// travel to their new positions without replacing their DOM or keyboard focus.
export function useLayoutMotion<T extends HTMLElement>({ enter = true } = {}) {
  const ref = useRef<T>(null);
  const previous = useRef<Map<string, Position> | null>(null);
  const animations = useRef(new Set<Animation>());

  const cancel = useCallback(() => {
    animations.current.forEach(animation => animation.cancel());
    animations.current.clear();
  }, []);

  const capture = useCallback(() => {
    const positions = new Map<string, Position>();
    ref.current?.querySelectorAll<HTMLElement>('[data-layout-key]').forEach(element => {
      const rect = element.getBoundingClientRect();
      positions.set(element.dataset.layoutKey!, {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        visible: rect.bottom > 0 && rect.top < window.innerHeight,
      });
    });
    previous.current = positions;
    cancel();
  }, [cancel]);

  useLayoutEffect(() => {
    const positions = previous.current;
    previous.current = null;
    if (!positions || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let entering = 0;
    ref.current?.querySelectorAll<HTMLElement>('[data-layout-key]').forEach(element => {
      if (!element.animate) return;
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const old = positions.get(element.dataset.layoutKey!);
      const dx = old ? old.left - rect.left - window.scrollX : 0;
      const dy = old ? old.top - rect.top - window.scrollY : 0;
      const moves = old?.visible && (Math.abs(dx) > 1 || Math.abs(dy) > 1);
      if (!moves && (old || !enter)) return;

      const animation = element.animate(
        moves
          ? [{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }]
          : [{ opacity: 0, translate: '0 22px' }, { opacity: 1, translate: '0 0' }],
        { duration: moves ? 540 : 440, delay: moves ? 0 : Math.min(entering++, 5) * 35,
          easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' },
      );
      animations.current.add(animation);
      const release = () => animations.current.delete(animation);
      animation.onfinish = release;
      animation.oncancel = release;
    });
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => { if (media.matches) cancel(); };
    media.addEventListener('change', onChange);
    return () => { cancel(); media.removeEventListener('change', onChange); };
  }, [cancel]);

  return { ref, capture };
}
