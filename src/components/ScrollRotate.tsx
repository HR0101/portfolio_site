"use client";

import React from 'react';
import { useScrollLinked } from '../hooks/useScrollLinked';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface ScrollRotateProps {
  children: React.ReactNode;
  // スクロール全体で回す角度（度．負の値で逆回転）
  degrees?: number;
  className?: string;
}

// スクロール量に比例して中身を回転させるラッパー．
// 計測用（外側）と回転用（内側）を分け，回転が計測に影響しないようにしている．
export function ScrollRotate({ children, degrees = 90, className = '' }: ScrollRotateProps) {
  const { ref, progress } = useScrollLinked<HTMLDivElement>('leave');
  const prefersReducedMotion = usePrefersReducedMotion();
  const rotation = prefersReducedMotion ? 0 : progress * degrees;

  return (
    <div ref={ref} className={className}>
      <div
        className="w-full h-full will-change-transform"
        style={{ transform: `rotate(${rotation.toFixed(2)}deg)` }}
      >
        {children}
      </div>
    </div>
  );
}
