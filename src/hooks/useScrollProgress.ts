"use client";

import { useEffect, useState } from 'react';
import { clamp, subscribeToScroll } from '../lib/scrollObserver';

// ページ全体のスクロール進捗（0〜1）を返すフック．
// 監視は scrollObserver に集約しているため，リスナーは全体で1本だけになる．
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const measureProgress = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      // ページがビューポートに収まる場合は進捗を 0 とみなす
      if (scrollableHeight <= 0) {
        setProgress(0);
        return;
      }
      setProgress(clamp(window.scrollY / scrollableHeight));
    };

    return subscribeToScroll(measureProgress);
  }, []);

  return progress;
}
