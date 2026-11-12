"use client";

import React from 'react';
import { useInView } from '../hooks/useInView';
import { revealDelay } from '../lib/motionFoundation';

// 登場アニメーションの種類
export type RevealVariant = 'up' | 'left' | 'right' | 'scale' | 'blur' | 'flip' | 'scene';

// バリアント名と CSS クラスの対応（'up' は基本の .reveal だけで表現する）
const VARIANT_CLASS_NAMES: Record<RevealVariant, string> = {
  up: '',
  left: 'reveal-left',
  right: 'reveal-right',
  scale: 'reveal-scale',
  blur: 'reveal-blur',
  flip: 'reveal-flip',
  scene: 'reveal-scene',
};

// スクロールで画面内に入ったときに子要素をアニメーション表示するラッパー
interface RevealProps {
  children: React.ReactNode;
  // 表示開始までの遅延（ミリ秒）．カードの段階表示などに使用する
  delayMs?: number;
  // 登場の仕方（既定は下から上へのフェードイン）
  variant?: RevealVariant;
  className?: string;
  style?: React.CSSProperties;
  layoutKey?: string;
  cardDirection?: 'left' | 'right';
  // カードが画面の外から入るとき，来た側へ伸びる光の筋を出すか（既定は出す）．
  // 隣のカードの上を横切ってしまう配置（中央の列など）では false にする
  tow?: boolean;
}

export function Reveal({
  children,
  delayMs = 0,
  variant = 'up',
  className = '',
  style,
  layoutKey,
  cardDirection,
  tow = true,
}: RevealProps) {
  const { ref, isInView } = useInView<HTMLDivElement>(0.15, Boolean(cardDirection));
  const delay = `${revealDelay(delayMs, Boolean(cardDirection))}ms`;

  return (
    <div
      ref={ref}
      data-layout-key={layoutKey}
      data-card-reveal={cardDirection}
      data-card-tow={cardDirection && !tow ? 'off' : undefined}
      className={`reveal ${VARIANT_CLASS_NAMES[variant]} ${
        isInView ? 'reveal-visible' : ''
      } ${className}`}
      // 光の筋（::before）の動き出しをカードの遅延にそろえる（animation-delay: inherit で受け取る）
      style={{ ...style, transitionDelay: delay, animationDelay: cardDirection ? delay : undefined }}
    >
      {children}
    </div>
  );
}
