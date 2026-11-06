'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';

// 1画面を見せる時間（ミリ秒）．CSS の進行バーの長さ（--tour-interval）と必ずそろえる
export const TOUR_INTERVAL_MS = 6500;
// 画面のどれだけが見えていれば，自動で進めてよいか
const VISIBLE_THRESHOLD = 0.35;

// タブのツアーを，一定の間隔で自動で進めるフック．
// 次の場合は止まる: 画面の外にある／ホバー・フォーカス中／利用者が止めた／動きを減らす設定．
// タブやキーで自分から選んだときは，自動再生をやめる（ボタンで再開できる）．
export function useAutoTour(count: number) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  // 切り替えの向き．画面が右から入るか，左から入るかを決める
  const [direction, setDirection] = useState<1 | -1>(1);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isPlaying = autoEnabled && !isHolding && isVisible && !prefersReducedMotion;

  // 画面に見えている間だけ，自動で進める
  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(Boolean(entry?.isIntersecting)),
      { threshold: VISIBLE_THRESHOLD },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 次の画面へ進める．active が変わるたびに，タイマーを掛け直す
  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    const timer = window.setTimeout(() => {
      setDirection(1);
      setActive((current) => (current + 1) % count);
    }, TOUR_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [isPlaying, active, count]);

  // 利用者が選んだとき．向きは，いまの位置との前後で決める
  function select(next: number) {
    setDirection(next >= active ? 1 : -1);
    setActive(next);
    setAutoEnabled(false);
  }

  return {
    rootRef,
    active,
    direction,
    isPlaying,
    autoEnabled,
    canAutoPlay: !prefersReducedMotion,
    select,
    toggleAuto: () => setAutoEnabled((enabled) => !enabled),
    holdProps: {
      onMouseEnter: () => setIsHolding(true),
      onMouseLeave: () => setIsHolding(false),
      onFocus: () => setIsHolding(true),
      onBlur: () => setIsHolding(false),
    },
  };
}
