"use client";

import React from 'react';
import { useInView } from '../hooks/useInView';

// 登場アニメーションの種類
export type RevealVariant = 'up' | 'left' | 'right' | 'scale' | 'blur' | 'flip';

// バリアント名と CSS クラスの対応（'up' は基本の .reveal だけで表現する）
const VARIANT_CLASS_NAMES: Record<RevealVariant, string> = {
  up: '',
  left: 'reveal-left',
  right: 'reveal-right',
  scale: 'reveal-scale',
  blur: 'reveal-blur',
  flip: 'reveal-flip',
};

// スクロールで画面内に入ったときに子要素をアニメーション表示するラッパー
interface RevealProps {
  children: React.ReactNode;
  // 表示開始までの遅延（ミリ秒）．カードの段階表示などに使用する
  delayMs?: number;
  // 登場の仕方（既定は下から上へのフェードイン）
  variant?: RevealVariant;
  className?: string;
}

export function Reveal({
  children,
  delayMs = 0,
  variant = 'up',
  className = '',
}: RevealProps) {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal ${VARIANT_CLASS_NAMES[variant]} ${
        isInView ? 'reveal-visible' : ''
      } ${className}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
