"use client";

import { useScrollLinked } from '../hooks/useScrollLinked';
import { clamp } from '../lib/scrollObserver';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// 先読み分：進捗より少し先の語まで明るくして，読む速度に追従させる
const HIGHLIGHT_LEAD = 0.05;

interface ScrollHighlightTextProps {
  // 1語ずつ明るくしていく文字列（「/」で語を区切る）
  text: string;
  className?: string;
}

// スクロールに合わせて，文が先頭から1語ずつ明るくなっていく演出．
// 読み終わる頃にちょうど全部が点灯する．
export function ScrollHighlightText({ text, className = '' }: ScrollHighlightTextProps) {
  const { ref, progress } = useScrollLinked<HTMLParagraphElement>('read');
  const prefersReducedMotion = usePrefersReducedMotion();

  const words = text.split('/');
  // アニメーション抑制時は最初からすべて点灯させる
  const effectiveProgress = prefersReducedMotion ? 1 : progress;

  return (
    <p ref={ref} className={className} aria-label={words.join('')}>
      {words.map((word, index) => {
        const illumination = clamp((effectiveProgress + HIGHLIGHT_LEAD) * words.length - index);
        return (
          <span
            key={`${word}-${index}`}
            aria-hidden="true"
            className="text-ink dark:text-night-ink"
            style={{ opacity: 0.3 + illumination * 0.7 }}
          >
            {word}
          </span>
        );
      })}
    </p>
  );
}
