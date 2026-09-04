"use client";

import { useScrollLinked } from '../hooks/useScrollLinked';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// 端をなめらかに消すマスク（背景色に依存しない）
const EDGE_FADE_MASK =
  'linear-gradient(to right, transparent, black 6%, black 94%, transparent)';

interface ScrollMarqueeProps {
  // 帯に並べる単語
  items: string[];
  // スクロール全体で流す距離（ピクセル．負の値で逆方向へ流れる）
  distancePx?: number;
  className?: string;
}

// スクロールした量だけ横に流れる帯．
// 自動では動かず，スクロール操作そのものが動きになる．
export function ScrollMarquee({ items, distancePx = 260, className = '' }: ScrollMarqueeProps) {
  const { ref, progress } = useScrollLinked<HTMLDivElement>('through');
  const prefersReducedMotion = usePrefersReducedMotion();

  // 中央で移動量 0 になるようにして，行き過ぎを防ぐ
  const translateX = prefersReducedMotion ? 0 : (progress - 0.5) * distancePx;
  // 同じ内容を2回並べ，端が途切れて見えないようにする
  const loopedItems = [...items, ...items];

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ maskImage: EDGE_FADE_MASK, WebkitMaskImage: EDGE_FADE_MASK }}
      aria-hidden="true"
      data-testid="scroll-marquee"
    >
      <div
        className="flex w-max gap-6 whitespace-nowrap will-change-transform"
        style={{ transform: `translate3d(${translateX.toFixed(1)}px, 0, 0)` }}
      >
        {loopedItems.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-300/70 dark:text-slate-700/60 select-none"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
