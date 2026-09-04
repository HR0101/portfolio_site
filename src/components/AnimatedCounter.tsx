"use client";

import { useCountUp } from '../hooks/useCountUp';
import { useInView } from '../hooks/useInView';

interface AnimatedCounterProps {
  // 数え上げの目標値
  value: number;
  // 数値の後ろに添える単位（例: "本"）
  suffix?: string;
  className?: string;
}

// 画面内に入ったタイミングで 0 から数え上がる数値表示
export function AnimatedCounter({ value, suffix = '', className = '' }: AnimatedCounterProps) {
  const { ref, isInView } = useInView<HTMLSpanElement>();
  const displayValue = useCountUp(value, isInView);

  return (
    <span ref={ref} className={className}>
      {displayValue}
      {suffix}
    </span>
  );
}
