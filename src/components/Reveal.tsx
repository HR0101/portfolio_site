"use client";

import React from 'react';
import { useInView } from '../hooks/useInView';

// スクロールで画面内に入ったときに子要素をフェードイン表示するラッパー
interface RevealProps {
  children: React.ReactNode;
  // 表示開始までの遅延（ミリ秒）．カードの段階表示などに使用する
  delayMs?: number;
  className?: string;
}

export function Reveal({ children, delayMs = 0, className = '' }: RevealProps) {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal ${isInView ? 'reveal-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
