"use client";

import React from 'react';
import { useTilt } from '../hooks/useTilt';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  // 光沢（グレア）を重ねるかどうか
  withGlare?: boolean;
}

// マウス位置に応じて立体的に傾くカードのラッパー
export function TiltCard({ children, className = '', withGlare = true }: TiltCardProps) {
  const { ref, handlers } = useTilt<HTMLDivElement>();

  return (
    <div ref={ref} className={`tilt-card relative ${className}`} {...handlers}>
      {children}
      {withGlare && (
        <>
          {/* 傾きに沿って走る虹色の反射 */}
          <div
            className="tilt-card-holo absolute inset-0 rounded-3xl pointer-events-none"
            style={{ backgroundPosition: 'var(--glare-x, 50%) var(--glare-y, 50%)' }}
            aria-hidden="true"
          />
          <div
            className="tilt-card-glare absolute inset-0 rounded-3xl pointer-events-none"
            aria-hidden="true"
          />
        </>
      )}
    </div>
  );
}
