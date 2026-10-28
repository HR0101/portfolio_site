'use client';

import { useEffect, useRef } from 'react';

// 詳細ページの静的な見出しやカードを、一度だけスクロールに合わせて現す。
// 既存の Reveal や操作デモとは別の要素を動かし、JS 無効時も内容を隠さない。
export function ProductMotion() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = marker.current?.closest('article');
    if (!root || !('IntersectionObserver' in window)) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-product-enter]'));
    const completed = new WeakSet<Element>();
    const animations = new Set<Animation>();
    let observer: IntersectionObserver | undefined;

    const configure = () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      if (motion.matches) return;

      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || completed.has(entry.target)) return;
          completed.add(entry.target);
          observer?.unobserve(entry.target);
          const element = entry.target as HTMLElement;
          if (!element.animate) return;
          const siblings = element.parentElement?.querySelectorAll('[data-product-enter]');
          const index = siblings ? Array.from(siblings).indexOf(element) : 0;
          const animation = element.animate(
            [{ opacity: 0.15, translate: '0 50px', scale: '0.94' }, { opacity: 1, translate: '0 0', scale: '1' }],
            { duration: 950, delay: Math.min(index, 3) * 100, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
          animation.oncancel = () => animations.delete(animation);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
      elements.forEach((element) => { if (!completed.has(element)) observer?.observe(element); });
    };

    configure();
    motion.addEventListener('change', configure);
    return () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      motion.removeEventListener('change', configure);
    };
  }, []);

  return <span ref={marker} hidden aria-hidden="true" />;
}
