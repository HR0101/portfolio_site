"use client";

import React from 'react';
import { useScrollLinked } from '../hooks/useScrollLinked';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface ParallaxLayerProps {
  children: React.ReactNode;
  // スクロール全体で動かす距離（ピクセル．負の値で逆方向）
  distancePx?: number;
  // 横方向に動かす距離（ピクセル）
  horizontalDistancePx?: number;
  className?: string;
}

// スクロール量に比例して中身をずらし，奥行きを出すレイヤー．
// 位置の計測用（外側）と移動用（内側）で要素を分け，
// 自分自身の移動が計測結果に影響しないようにしている．
export function ParallaxLayer({
  children,
  distancePx = 80,
  horizontalDistancePx = 0,
  className = '',
}: ParallaxLayerProps) {
  const { ref, progress } = useScrollLinked<HTMLDivElement>('through');
  const prefersReducedMotion = usePrefersReducedMotion();

  // 進捗 0〜1 を -0.5〜0.5 に変換し，画面中央で移動量が 0 になるようにする
  const centeredProgress = progress - 0.5;
  const translateY = prefersReducedMotion ? 0 : centeredProgress * distancePx;
  const translateX = prefersReducedMotion ? 0 : centeredProgress * horizontalDistancePx;

  return (
    <div ref={ref} className={className}>
      <div
        className="w-full h-full will-change-transform"
        style={{
          transform: `translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
