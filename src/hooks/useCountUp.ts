"use client";

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

// カウントアップの既定の所要時間（ミリ秒）
const DEFAULT_DURATION_MS = 1400;

// 終盤ほど緩やかに減速させるイージング
function easeOutCubic(ratio: number): number {
  return 1 - Math.pow(1 - ratio, 3);
}

// 0 から目標値までを滑らかに数え上げるフック．
// isActive が true になった時点でカウントを開始する．
export function useCountUp(
  targetValue: number,
  isActive: boolean,
  durationMs: number = DEFAULT_DURATION_MS,
): number {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    // アニメーション抑制時は即座に最終値を表示する
    if (prefersReducedMotion) {
      setDisplayValue(targetValue);
      return;
    }

    let animationFrameId = 0;
    const startedAt = performance.now();

    const step = (now: number) => {
      const elapsedRatio = Math.min((now - startedAt) / durationMs, 1);
      setDisplayValue(Math.round(targetValue * easeOutCubic(elapsedRatio)));
      if (elapsedRatio < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [targetValue, isActive, durationMs, prefersReducedMotion]);

  return displayValue;
}
