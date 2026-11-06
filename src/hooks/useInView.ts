"use client";

import { useEffect, useRef, useState } from 'react';
import { subscribeToScroll } from '../lib/scrollObserver';

// 要素の可視判定に使うビューポート交差率のデフォルト値
const DEFAULT_THRESHOLD = 0.15;

// 要素が一度でもビューポートに入ったかどうかを判定するフック
export function useInView<T extends HTMLElement>(threshold: number = DEFAULT_THRESHOLD, verticalOnly = false) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    // A card transported from outside the viewport can be fully clipped on X.
    // Trigger it from its vertical position instead of waiting for an X
    // intersection that cannot happen until the animation has already begun.
    if (verticalOnly) {
      let reached = false;
      let unsubscribe = () => {};
      const update = () => {
        if (reached) return;
        const bounds = element.getBoundingClientRect();
        const visibleHeight = Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0);
        if (bounds.height > 0 && visibleHeight >= Math.min(bounds.height, window.innerHeight) * threshold) {
          reached = true;
          setIsInView(true);
          unsubscribe();
        }
      };
      unsubscribe = subscribeToScroll(update);
      if (reached) unsubscribe();
      return unsubscribe;
    }

    // IntersectionObserver 非対応環境ではアニメーション無しで即時表示する
    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting) {
          setIsInView(true);
          // 一度表示されたら監視を解除する（再アニメーションさせない）
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, verticalOnly]);

  return { ref, isInView };
}
