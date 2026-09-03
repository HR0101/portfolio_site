"use client";

import { useEffect, useRef, useState } from 'react';

// 要素の可視判定に使うビューポート交差率のデフォルト値
const DEFAULT_THRESHOLD = 0.15;

// 要素が一度でもビューポートに入ったかどうかを判定するフック
export function useInView<T extends HTMLElement>(threshold: number = DEFAULT_THRESHOLD) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
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
  }, [threshold]);

  return { ref, isInView };
}
