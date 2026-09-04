"use client";

import React, { useCallback, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// 1回のクリックで飛ばす紙吹雪の枚数
const CONFETTI_COUNT = 18;
// 紙吹雪が消えるまでの時間（ミリ秒．CSS 側のアニメーション長と揃える）
const CONFETTI_LIFETIME_MS = 1100;

// 紙吹雪1片の状態
interface ConfettiPiece {
  id: number;
  emoji: string;
  offsetX: number;
  offsetY: number;
  rotate: number;
  delayMs: number;
}

// 飛び散る絵文字（サイトで扱っているアプリの世界観に合わせたもの）
const CONFETTI_EMOJIS = ['🍎', '📱', '💻', '⚡️', '🚀', '✨', '🛠️', '🎉'];

interface ConfettiButtonProps {
  children: React.ReactNode;
  className?: string;
  // クリック時に追加で実行したい処理（メニューを閉じる等）
  onClick?: () => void;
  ariaLabel?: string;
}

// クリックすると紙吹雪が舞う，遊び心のあるボタン（ロゴ用のイースターエッグ）
export function ConfettiButton({
  children,
  className = '',
  onClick,
  ariaLabel,
}: ConfettiButtonProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const nextIdRef = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleClick = useCallback(() => {
    onClick?.();

    if (prefersReducedMotion) {
      return;
    }

    // 中心から放射状に飛ぶよう，角度と距離をランダムに決める
    const newPieces: ConfettiPiece[] = Array.from({ length: CONFETTI_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 90;
      nextIdRef.current += 1;
      return {
        id: nextIdRef.current,
        emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
        offsetX: Math.cos(angle) * distance,
        offsetY: Math.sin(angle) * distance - 30,
        rotate: (Math.random() - 0.5) * 720,
        delayMs: Math.random() * 90,
      };
    });

    setPieces((previous) => [...previous, ...newPieces]);
    // 表示が終わった分は取り除き，DOM が増え続けないようにする
    const removalIds = new Set(newPieces.map((piece) => piece.id));
    window.setTimeout(() => {
      setPieces((previous) => previous.filter((piece) => !removalIds.has(piece.id)));
    }, CONFETTI_LIFETIME_MS + 150);
  }, [onClick, prefersReducedMotion]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={`relative ${className}`}
      data-testid="confetti-button"
    >
      {children}
      {/* 紙吹雪のレイヤー（クリックを妨げない） */}
      <span className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {pieces.map((piece) => (
          <span
            key={piece.id}
            className="confetti-piece absolute left-1/2 top-1/2 text-sm select-none"
            style={
              {
                '--confetti-x': `${piece.offsetX}px`,
                '--confetti-y': `${piece.offsetY}px`,
                '--confetti-rotate': `${piece.rotate}deg`,
                animationDelay: `${piece.delayMs}ms`,
              } as React.CSSProperties
            }
          >
            {piece.emoji}
          </span>
        ))}
      </span>
    </button>
  );
}
