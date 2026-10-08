"use client";

import { useEffect, useState } from 'react';
import { useInView } from '../hooks/useInView';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// 桁ごとの回り出しをずらす時間（ミリ秒）
const DIGIT_DELAY_MS = 90;

interface RollingNumberProps {
  // 表示する数値
  value: number;
  className?: string;
}

// 桁ごとに 0〜9 を縦に並べ，該当の数字までスライドさせるカウンター．
// 画面内に入ったタイミングで回り始める．
export function RollingNumber({ value, className = '' }: RollingNumberProps) {
  const { ref, isInView } = useInView<HTMLSpanElement>();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (isInView) {
      setHasStarted(true);
    }
  }, [isInView]);

  const digits = String(value).split('');
  // アニメーション抑制時は最初から最終値を表示する
  const shouldRoll = hasStarted || prefersReducedMotion;

  return (
    <span ref={ref} className={className} aria-label={String(value)}>
      {digits.map((digit, index) => (
        <span key={index} className="digit-roll" aria-hidden="true">
          <span
            className="digit-roll-track"
            style={{
              transform: `translateY(-${shouldRoll ? Number(digit) : 0}em)`,
              transitionDelay: prefersReducedMotion ? '0ms' : `${index * DIGIT_DELAY_MS}ms`,
            }}
          >
            {Array.from({ length: 10 }, (_, candidate) => (
              <span key={candidate}>{candidate}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
