"use client";

import { useEffect, useState } from 'react';
import { useInView } from '../hooks/useInView';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// 解読中に表示するダミー文字
const SCRAMBLE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/-';
// 1文字あたりの更新間隔（ミリ秒）
const TICK_INTERVAL_MS = 38;
// 1文字が確定するまでに要するティック数
const TICKS_PER_CHARACTER = 2;

interface ScrambleTextProps {
  // 最終的に表示する文字列
  text: string;
  className?: string;
}

// 画面内に入ると，ランダムな文字から本来の文字へ順に「解読」されていく演出．
// 読み上げには最終的な文字列だけを伝える．
export function ScrambleText({ text, className = '' }: ScrambleTextProps) {
  const { ref, isInView } = useInView<HTMLSpanElement>();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (!isInView || prefersReducedMotion) {
      setDisplayText(text);
      return;
    }

    let tick = 0;
    const totalTicks = text.length * TICKS_PER_CHARACTER;

    const intervalId = window.setInterval(() => {
      tick += 1;
      // 左から順に確定していく
      const settledCount = Math.floor(tick / TICKS_PER_CHARACTER);

      setDisplayText(
        Array.from(text)
          .map((character, index) => {
            if (index < settledCount || character === ' ' || character === '.') {
              return character;
            }
            return SCRAMBLE_CHARACTERS[
              Math.floor(Math.random() * SCRAMBLE_CHARACTERS.length)
            ];
          })
          .join(''),
      );

      if (tick >= totalTicks) {
        window.clearInterval(intervalId);
        setDisplayText(text);
      }
    }, TICK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isInView, text, prefersReducedMotion]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">{displayText}</span>
    </span>
  );
}
