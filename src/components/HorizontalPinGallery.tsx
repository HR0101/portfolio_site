"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useScrollLinked } from '../hooks/useScrollLinked';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface HorizontalPinGalleryProps {
  // 横に並べるパネル
  panels: React.ReactNode[];
  // 読み上げ用のラベル
  label: string;
  className?: string;
}

// 画面を固定して横へ流す演出を使う最小の画面幅
const PIN_MIN_WIDTH_QUERY = '(min-width: 1024px)';

// 縦スクロールの量をそのまま横移動に置き換えるギャラリー．
// 大きな画面では区間の間だけ画面を固定し，パネルを横へ送る．
// 小さな画面と動きを減らす設定では，指で横にスワイプする普通の横並びになる．
export function HorizontalPinGallery({ panels, label, className = '' }: HorizontalPinGalleryProps) {
  const { ref: sectionRef, progress } = useScrollLinked<HTMLDivElement>('pin');
  const trackRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isWideScreen, setIsWideScreen] = useState(false);
  // パネル列の全幅から画面幅を引いた，横に送る距離
  const [travelDistance, setTravelDistance] = useState(0);

  const isPinned = isWideScreen && !prefersReducedMotion;

  // 画面幅の条件を監視する
  useEffect(() => {
    const mediaQuery = window.matchMedia(PIN_MIN_WIDTH_QUERY);
    const update = () => setIsWideScreen(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  // パネル列の幅が変わったら送る距離を測り直す
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !isPinned) {
      return;
    }
    const measure = () => setTravelDistance(Math.max(track.scrollWidth - window.innerWidth, 0));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isPinned, panels.length]);

  const activeIndex = Math.min(panels.length - 1, Math.round(progress * (panels.length - 1)));

  // 計測対象の外側の要素は，表示方式が切り替わっても同じものを使い続ける
  return (
    <div
      ref={sectionRef}
      className={`relative ${className}`}
      // 固定している間に横へ送る距離ぶんだけ，縦にも高さを確保する
      style={isPinned ? { height: `calc(100vh + ${travelDistance}px)` } : undefined}
    >
      {isPinned ? (
        <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center" role="region" aria-label={label}>
          <div
            ref={trackRef}
            className="flex gap-8 pl-[max(24px,calc((100vw-72rem)/2+24px))] pr-[8vw] will-change-transform"
            style={{ transform: `translate3d(${(-progress * travelDistance).toFixed(1)}px, 0, 0)` }}
          >
            {panels.map((panel, index) => (
              <div
                key={index}
                className="shrink-0 w-[min(80vw,1040px)] h-[min(72vh,620px)] transition-[opacity,transform] duration-500"
                style={{
                  opacity: index === activeIndex ? 1 : 0.65,
                  transform: index === activeIndex ? 'scale(1)' : 'scale(0.9)',
                }}
              >
                {panel}
              </div>
            ))}
          </div>

          {/* 進み具合（何枚目か）と横向きの進捗バー */}
          <div className="mt-10 mx-auto w-full max-w-6xl px-6 flex items-center gap-5" aria-hidden="true">
            <span className="font-mono text-xs tabular-nums text-subtle dark:text-night-subtle">
              {String(activeIndex + 1).padStart(2, '0')} / {String(panels.length).padStart(2, '0')}
            </span>
            <span className="relative h-px flex-1 bg-soft dark:bg-night-border overflow-hidden">
              <span
                className="absolute inset-y-0 left-0 bg-ink dark:bg-night-ink"
                style={{ width: `${(progress * 100).toFixed(2)}%` }}
              />
            </span>
            <span className="text-xs text-subtle dark:text-night-subtle">スクロールで横へ</span>
          </div>
        </div>
      ) : (
        <div
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory px-6 pb-6 [scrollbar-width:none]"
          role="region"
          aria-label={label}
          tabIndex={0}
        >
          {panels.map((panel, index) => (
            <div key={index} className="snap-center shrink-0 w-[86vw] max-w-[720px]">
              {panel}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
