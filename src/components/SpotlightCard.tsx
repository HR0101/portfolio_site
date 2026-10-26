"use client";

import React, { useRef } from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  // 光の色（CSS の色）．カードごとの差し色に合わせる
  color?: string;
}

// カーソルの位置に淡い光だまりを追いかけさせるカード．
// 位置は CSS 変数を直接書き換えるだけなので，動かしても再描画は起きない．
export function SpotlightCard({ children, className = '', color = 'rgb(0 113 227 / 0.16)' }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card || event.pointerType === 'touch') {
      return;
    }
    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
    card.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
  };

  return (
    <div
      ref={cardRef}
      className={`spotlight-card ${className}`}
      style={{ '--spot-color': color } as React.CSSProperties}
      onPointerMove={handlePointerMove}
    >
      {children}
    </div>
  );
}
