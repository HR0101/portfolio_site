"use client";

import { useEffect, useState } from 'react';

// 視差効果を減らす設定のメディアクエリ
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// ユーザーがアニメーションの抑制を希望しているかを判定するフック．
// JavaScript で制御するアニメーション（チルト・追従など）の停止に使う．
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}
