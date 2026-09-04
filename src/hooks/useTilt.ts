"use client";

import { useCallback, useRef } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

// 傾きの最大角度（度）．控えめにして，やわらかい動きにしている
const MAX_TILT_DEGREES = 4;

export interface TiltHandlers {
  onMouseMove: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
}

// マウス位置に応じてカードを3D的に傾けるフック．
// 角度と光沢の位置は CSS カスタムプロパティ経由で渡し，React の再描画を発生させない．
export function useTilt<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const element = ref.current;
      if (!element || prefersReducedMotion) {
        return;
      }

      const bounds = element.getBoundingClientRect();
      // カード中心を原点とした -0.5〜0.5 の相対位置
      const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;

      element.style.setProperty('--tilt-x', `${(-relativeY * MAX_TILT_DEGREES).toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${(relativeX * MAX_TILT_DEGREES).toFixed(2)}deg`);
      element.style.setProperty('--glare-x', `${((relativeX + 0.5) * 100).toFixed(1)}%`);
      element.style.setProperty('--glare-y', `${((relativeY + 0.5) * 100).toFixed(1)}%`);
    },
    [prefersReducedMotion],
  );

  const handleMouseLeave = useCallback(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    element.style.setProperty('--tilt-x', '0deg');
    element.style.setProperty('--tilt-y', '0deg');
  }, []);

  const handlers: TiltHandlers = {
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };

  return { ref, handlers };
}
