"use client";

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// リングが実際のカーソルに追いつく速さ（0〜1．小さいほど遅れて付いてくる）
const FOLLOW_EASING = 0.18;
// 通常時とホバー時の直径（ピクセル）
const BASE_SIZE_PX = 26;
const HOVER_SIZE_PX = 58;

// 押せるものを判定するためのセレクタ
const INTERACTIVE_SELECTOR = 'a, button, [role="tab"], input, textarea, summary';

// カーソルの少し後ろを付いてくる細いリング．
// リンクやカードの上では静かに広がり，触れる場所であることを示す．
export function CursorRing() {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || typeof window === 'undefined') {
      setIsEnabled(false);
      return;
    }

    // 指で操作する端末では表示しない
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    setIsEnabled(hasFinePointer);
    if (!hasFinePointer) {
      return;
    }

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let ringX = pointerX;
    let ringY = pointerY;
    let currentSize = BASE_SIZE_PX;
    let targetSize = BASE_SIZE_PX;
    let animationFrameId = 0;

    const render = () => {
      // 目標値へ少しずつ近づけることで，やわらかい遅れを作る
      ringX += (pointerX - ringX) * FOLLOW_EASING;
      ringY += (pointerY - ringY) * FOLLOW_EASING;
      currentSize += (targetSize - currentSize) * FOLLOW_EASING;

      const element = ringRef.current;
      if (element) {
        element.style.transform = `translate3d(${ringX - currentSize / 2}px, ${
          ringY - currentSize / 2
        }px, 0)`;
        element.style.width = `${currentSize}px`;
        element.style.height = `${currentSize}px`;
      }
      animationFrameId = window.requestAnimationFrame(render);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      // 押せる要素の上かどうかでリングの大きさを変える
      const target = event.target as HTMLElement | null;
      targetSize = target?.closest(INTERACTIVE_SELECTOR) ? HOVER_SIZE_PX : BASE_SIZE_PX;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div
      ref={ringRef}
      aria-hidden="true"
      className="fixed left-0 top-0 z-[65] rounded-full border border-ink/25 dark:border-night-ink/25 pointer-events-none mix-blend-multiply dark:mix-blend-screen"
      style={{ width: BASE_SIZE_PX, height: BASE_SIZE_PX }}
    />
  );
}
