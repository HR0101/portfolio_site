"use client";

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// 波紋が消えるまでの時間（ミリ秒．CSS のアニメーション長と揃える）
const RIPPLE_LIFETIME_MS = 700;

interface Ripple {
  id: number;
  x: number;
  y: number;
}

// クリックした場所から，水面のような波紋が静かに広がる演出．
// 画面全体を覆う軽いレイヤーなので，どの要素を押しても反応する．
export function ClickRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    let nextId = 0;
    const handlePointerDown = (event: PointerEvent) => {
      // マウス以外（指・ペン）では出さない
      if (event.pointerType !== 'mouse') {
        return;
      }
      nextId += 1;
      const ripple: Ripple = { id: nextId, x: event.clientX, y: event.clientY };
      setRipples((previous) => [...previous, ripple]);
      window.setTimeout(() => {
        setRipples((previous) => previous.filter((item) => item.id !== ripple.id));
      }, RIPPLE_LIFETIME_MS);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [prefersReducedMotion]);

  return (
    <div className="fixed inset-0 z-[64] pointer-events-none" aria-hidden="true">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="click-ripple absolute rounded-full border border-ink/25 dark:border-night-ink/25"
          style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }}
        />
      ))}
    </div>
  );
}
