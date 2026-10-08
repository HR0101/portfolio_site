"use client";

import { useScrollProgress } from '../hooks/useScrollProgress';

// ページ上端に表示するスクロール進捗バー
export function ScrollProgressBar() {
  const progress = useScrollProgress();

  return (
    <div
      className="fixed top-0 inset-x-0 z-[60] h-0.5 pointer-events-none"
      aria-hidden="true"
      data-testid="scroll-progress"
    >
      <div
        className="scroll-progress h-full w-full bg-ink dark:bg-night-ink"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
