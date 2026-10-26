"use client";

import { useEffect, useRef } from 'react';
import { subscribeToScroll } from '../lib/scrollObserver';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface VelocityMarqueeProps {
  // 帯に流す語（白抜きと塗りを交互に並べる）
  words: string[];
  // スクロール1画面ぶんで横に動く距離（ピクセル）
  distancePerScreenPx?: number;
  // 右から左へ流すなら 1，逆なら -1
  direction?: 1 | -1;
  className?: string;
}

// 傾きの上限（度）と，速度を傾きへ変える係数
const MAX_SKEW_DEG = 12;
const SKEW_PER_PIXEL = 0.35;
// 傾きを 0 へ戻す速さ（1フレームごとに残す割合）
const SKEW_DECAY = 0.86;

// スクロール位置に合わせて大きな文字の帯が横に流れ，速く回すほど文字が傾く．
// 値は style を直接書き換えるので，スクロール中も再描画は起きない．
export function VelocityMarquee({ words, distancePerScreenPx = 420, direction = 1, className = '' }: VelocityMarqueeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track || prefersReducedMotion) {
      return;
    }

    let lastScrollY = window.scrollY;
    let skew = 0;
    let frameId = 0;

    const render = () => {
      const bounds = container.getBoundingClientRect();
      // 帯が画面の中央に来たときに移動量 0 になるよう，中央からの距離で動かす
      const offsetFromCenter = (bounds.top + bounds.height / 2 - window.innerHeight / 2) / window.innerHeight;
      const translateX = offsetFromCenter * distancePerScreenPx * direction;
      track.style.transform = `translate3d(${translateX.toFixed(1)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
    };

    // スクロールが止まったあとも，傾きだけはゆっくり 0 へ戻す
    const settle = () => {
      skew *= SKEW_DECAY;
      render();
      if (Math.abs(skew) > 0.05) {
        frameId = window.requestAnimationFrame(settle);
      } else {
        skew = 0;
        render();
        frameId = 0;
      }
    };

    const handleScroll = () => {
      const velocity = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      const targetSkew = Math.max(-MAX_SKEW_DEG, Math.min(MAX_SKEW_DEG, velocity * SKEW_PER_PIXEL * -direction));
      skew += (targetSkew - skew) * 0.4;
      render();
      if (frameId === 0) {
        frameId = window.requestAnimationFrame(settle);
      }
    };

    render();
    const unsubscribe = subscribeToScroll(handleScroll);
    return () => {
      unsubscribe();
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [direction, distancePerScreenPx, prefersReducedMotion]);

  // 横に動かしても途切れないよう，同じ並びを3回くり返す
  const repeatedWords = [...words, ...words, ...words];

  return (
    <div ref={containerRef} className={`velocity-marquee ${className}`} aria-hidden="true">
      <div ref={trackRef} className="velocity-marquee-track">
        {repeatedWords.map((word, index) => (
          <span key={`${word}-${index}`} className={index % 2 === 0 ? 'is-outline' : 'is-filled'}>
            {word}
            <i>✳︎</i>
          </span>
        ))}
      </div>
    </div>
  );
}
