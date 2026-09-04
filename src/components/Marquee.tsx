"use client";

import React from 'react';

// 左右の端をなめらかに消すためのマスク（背景色に依存しない方法）
const EDGE_FADE_MASK =
  'linear-gradient(to right, transparent, black 6%, black 94%, transparent)';

interface MarqueeProps {
  // 流したい要素の配列（内部で2周ぶん複製して途切れなく見せる）
  items: string[];
  className?: string;
}

// 横方向に無限に流れる帯．ホバーすると一時停止する．
export function Marquee({ items, className = '' }: MarqueeProps) {
  // 半分ずらして繋げるため，同じ内容を2回並べる
  const loopedItems = [...items, ...items];

  return (
    <div
      className={`marquee-wrapper relative overflow-hidden ${className}`}
      style={{ maskImage: EDGE_FADE_MASK, WebkitMaskImage: EDGE_FADE_MASK }}
      data-testid="skills-marquee"
    >
      <div className="animate-marquee flex w-max gap-3 py-1">
        {loopedItems.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="shrink-0 px-4 py-2 text-sm rounded-full bg-white dark:bg-night-soft border border-soft dark:border-night-border text-slate-600 dark:text-slate-300 hover:border-sky-500 hover:text-sky-700 dark:hover:text-sky-400 transition-colors"
            // 複製した後半は読み上げ対象から外す
            aria-hidden={index >= items.length}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
