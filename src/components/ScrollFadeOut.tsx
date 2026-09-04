"use client";

import React from 'react';
import { useScrollLinked } from '../hooks/useScrollLinked';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// スクロールしきったときの各効果の最大値
const MAX_TRANSLATE_PX = 90;
const MAX_SCALE_REDUCTION = 0.1;
const MAX_BLUR_PX = 7;
// 透明になりきる進捗（1 未満にして，早めに消えるようにする）
const FADE_COMPLETION_PROGRESS = 0.85;

interface ScrollFadeOutProps {
  children: React.ReactNode;
  className?: string;
}

// スクロールして画面から離れるにつれ，中身が奥へ引いていく演出．
// 計測用の外側と，変形する内側を分けている（変形が計測に影響しないため）．
export function ScrollFadeOut({ children, className = '' }: ScrollFadeOutProps) {
  const { ref, progress } = useScrollLinked<HTMLDivElement>('leave');
  const prefersReducedMotion = usePrefersReducedMotion();
  const effectiveProgress = prefersReducedMotion ? 0 : progress;

  const opacity = Math.max(1 - effectiveProgress / FADE_COMPLETION_PROGRESS, 0);
  const translateY = effectiveProgress * MAX_TRANSLATE_PX;
  const scale = 1 - effectiveProgress * MAX_SCALE_REDUCTION;
  const blurPx = effectiveProgress * MAX_BLUR_PX;

  return (
    <div ref={ref} className={className}>
      <div
        className="will-change-transform"
        style={{
          opacity,
          transform: `translate3d(0, ${translateY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`,
          filter: `blur(${blurPx.toFixed(2)}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
