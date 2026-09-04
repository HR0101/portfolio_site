"use client";

import { useEffect, useState } from 'react';
import { Rocket } from 'lucide-react';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { subscribeToScroll } from '../lib/scrollObserver';

// このスクロール量（ピクセル）を超えたらボタンを表示する
const SHOW_AFTER_SCROLL_PX = 600;
// ロケットが飛び去る演出の時間（ミリ秒）
const LAUNCH_DURATION_MS = 420;

// 画面右下に現れる「先頭へ戻る」ボタン．
// 押すとロケットが飛び上がってからページ先頭へ戻る．
export function BackToTopButton() {
  const progress = useScrollProgress();
  const [isVisible, setIsVisible] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(
    () => subscribeToScroll(() => setIsVisible(window.scrollY > SHOW_AFTER_SCROLL_PX)),
    [],
  );

  const handleClick = () => {
    setIsLaunching(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => setIsLaunching(false), LAUNCH_DURATION_MS);
  };

  // 進捗を円周の描画に変換する（半径 18px の円）
  const circleCircumference = 2 * Math.PI * 18;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="ページ先頭へ戻る"
      data-testid="back-to-top"
      className={`fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-50 w-12 h-12 rounded-full bg-white dark:bg-night-soft border border-soft dark:border-night-border shadow-soft flex items-center justify-center transition-all duration-300 hover:scale-110 hover:border-sky-400 ${
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
          className="stroke-sky-500"
          strokeDasharray={circleCircumference}
          strokeDashoffset={circleCircumference * (1 - progress)}
        />
      </svg>
      <Rocket
        className={`relative w-5 h-5 text-sky-700 dark:text-sky-400 transition-all duration-300 ${
          isLaunching ? '-translate-y-8 opacity-0' : 'translate-y-0 opacity-100'
        }`}
        aria-hidden="true"
      />
    </button>
  );
}
