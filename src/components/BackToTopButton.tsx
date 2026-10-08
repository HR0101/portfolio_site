"use client";

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { subscribeToScroll } from '../lib/scrollObserver';

// このスクロール量（ピクセル）を超えたらボタンを表示する
const SHOW_AFTER_SCROLL_PX = 600;

// 画面右下に現れる「先頭へ戻る」ボタン．
// 読了率を添えた、先頭へ戻るための静かな操作ボタン。
export function BackToTopButton() {
  const progress = useScrollProgress();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(
    () => subscribeToScroll(() => setIsVisible(window.scrollY > SHOW_AFTER_SCROLL_PX)),
    [],
  );

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  // 進捗を円周の描画に変換する（半径 18px の円）
  const circleCircumference = 2 * Math.PI * 18;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="ページ先頭へ戻る"
      tabIndex={isVisible ? 0 : -1}
      aria-hidden={!isVisible}
      data-testid="back-to-top"
      className={`fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-50 w-12 h-12 rounded-full bg-white dark:bg-night-soft border border-soft dark:border-night-border shadow-soft flex items-center justify-center transition-all duration-300 hover:scale-110 hover:border-ink dark:hover:border-night-ink ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      {/* 読了率を示す円形プログレス */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          strokeWidth="2"
          className="stroke-soft dark:stroke-night-border"
        />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-ink dark:stroke-night-ink"
          strokeDasharray={circleCircumference}
          strokeDashoffset={circleCircumference * (1 - progress)}
        />
      </svg>
      <ArrowUp
        className="relative w-4 h-4 text-ink dark:text-night-ink"
        aria-hidden="true"
      />
    </button>
  );
}
