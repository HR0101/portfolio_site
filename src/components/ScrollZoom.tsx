"use client";

import React from 'react';
import { useScrollLinked } from '../hooks/useScrollLinked';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface ScrollZoomProps {
  children: React.ReactNode;
  // 画面に入った瞬間の縮尺（1 で等倍）
  fromScale?: number;
  // 画面に入った瞬間の傾き（度）．奥から起き上がるように見せる
  fromTiltDeg?: number;
  className?: string;
}

// 画面に入るにつれて，奥から手前へ起き上がりながら等倍に近づく．
// 計測用の外側と変形用の内側を分け，自分の変形が計測値を揺らさないようにしている．
export function ScrollZoom({ children, fromScale = 0.86, fromTiltDeg = 14, className = '' }: ScrollZoomProps) {
  const { ref, progress } = useScrollLinked<HTMLDivElement>('enter');
  const prefersReducedMotion = usePrefersReducedMotion();

  // 終盤ほどゆっくり止まるように，3乗で減速させる
  const easedProgress = prefersReducedMotion ? 1 : 1 - Math.pow(1 - progress, 3);
  const scale = fromScale + (1 - fromScale) * easedProgress;
  const tilt = fromTiltDeg * (1 - easedProgress);

  return (
    <div ref={ref} className={className} style={{ perspective: '1400px' }}>
      <div
        className="w-full h-full will-change-transform"
        style={{
          transform: `rotateX(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
          transformOrigin: '50% 100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}
