'use client';

import { useEffect, useRef } from 'react';
import { CARD_ENTRANCE_DURATION_MS, CARD_ENTRANCE_EASING, cardEntranceFrames, type CardDirection } from '../lib/cardMotion';

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
    const markedCards = new Set<HTMLElement>();
    // Mark cards before they intersect so a navigation snapshot can recognize
    // them even when the destination has not been visited yet.
    elements.forEach(element => {
      const siblings = (element.closest('ul') ?? element.parentElement)?.querySelectorAll('[data-product-enter]');
      const index = siblings ? Array.from(siblings).indexOf(element) : 0;
      const declared = element.dataset.productEnter;
      const variant = declared === 'left' || declared === 'right' || declared === 'heading'
        ? declared
        : element.matches('h1, h2, h3, p, span') ? '' : index % 2 === 0 ? 'left' : 'right';
      if (variant === 'left' || variant === 'right') {
        element.dataset.cardReveal = variant;
        markedCards.add(element);
      }
    });
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
          const siblings = (element.closest('ul') ?? element.parentElement)?.querySelectorAll('[data-product-enter]');
          const index = siblings ? Array.from(siblings).indexOf(element) : 0;
          const variant = element.dataset.cardReveal || element.dataset.productEnter || '';
          const isCard = variant === 'left' || variant === 'right';
          const from: Keyframe = variant === 'left'
            ? { opacity: 0.1, translate: '-32px 0' }
            : variant === 'right'
              ? { opacity: 0.1, translate: '32px 0' }
              : variant === 'heading'
                ? { opacity: 0.1, translate: '0 30px', clipPath: 'inset(0 0 100% 0)' }
                : { opacity: 0.15, translate: '0 38px', scale: '0.96' };
          const animation = element.animate(
            isCard ? cardEntranceFrames(variant as CardDirection, window.innerWidth <= 760) : [from, { opacity: 1, translate: '0 0', scale: '1', clipPath: 'inset(0)' }],
            { duration: isCard ? CARD_ENTRANCE_DURATION_MS : 950, delay: Math.min(index, 3) * (isCard ? 140 : 100), easing: isCard ? CARD_ENTRANCE_EASING : 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' },
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
      markedCards.forEach(element => { delete element.dataset.cardReveal; });
      motion.removeEventListener('change', configure);
    };
  }, []);

  return <span ref={marker} hidden aria-hidden="true" />;
}
