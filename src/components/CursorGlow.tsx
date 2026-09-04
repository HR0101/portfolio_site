"use client";

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// ポインタに追従する淡いスポットライト．
// タッチ操作の端末とアニメーション抑制時は表示しない．
export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || typeof window === 'undefined') {
      setIsEnabled(false);
      return;
    }

    // マウスなどの精密なポインタを持つ端末でのみ有効にする
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    setIsEnabled(hasFinePointer);
    if (!hasFinePointer) {
      return;
    }

    let animationFrameId = 0;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;

    const applyPosition = () => {
      animationFrameId = 0;
      const element = glowRef.current;
      if (element) {
        element.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (animationFrameId === 0) {
        animationFrameId = window.requestAnimationFrame(applyPosition);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [prefersReducedMotion]);

  if (!isEnabled) {
    return null;
  }

  return <div ref={glowRef} className="cursor-glow" aria-hidden="true" />;
}
