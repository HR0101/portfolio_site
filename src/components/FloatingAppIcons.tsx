"use client";

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { subscribeToScroll } from '../lib/scrollObserver';

// 浮かせるアプリアイコン1枚の定義
interface FloatingTile {
  // 実際のアプリアイコン画像
  src: string;
  // 画面左からの位置（%）
  left: number;
  // 画面上からの位置（%）
  top: number;
  // 一辺の長さ（ピクセル）
  sizePx: number;
  // 奥に見せるためのぼかし量（ピクセル．0 なら手前）
  blurPx: number;
  // 不透明度（奥ほど薄くする）
  opacity: number;
  // わずかな傾き（度）
  rotateDeg: number;
  // 上下運動の周期をずらす遅延（秒）
  delaySeconds: number;
  // スクロール量に対する移動係数（大きいほど手前に見える）
  parallaxFactor: number;
}

// 中央の見出しと重ならないよう，左右の端に寄せて配置する．
// 手前（大きく・くっきり）と奥（小さく・ぼかす）を混ぜて被写界深度を出す．
const FLOATING_TILES: FloatingTile[] = [
  {
    src: '/projects/subghost.webp',
    left: 7,
    top: 24,
    sizePx: 88,
    blurPx: 0,
    opacity: 0.92,
    rotateDeg: -8,
    delaySeconds: 0,
    parallaxFactor: 0.22,
  },
  {
    src: '/projects/bustimeapp.webp',
    left: 15,
    top: 66,
    sizePx: 62,
    blurPx: 1.1,
    opacity: 0.62,
    rotateDeg: 7,
    delaySeconds: 1.4,
    parallaxFactor: 0.11,
  },
  {
    src: '/projects/fomura.webp',
    left: 83,
    top: 20,
    sizePx: 70,
    blurPx: 0.8,
    opacity: 0.72,
    rotateDeg: 10,
    delaySeconds: 2.2,
    parallaxFactor: 0.16,
  },
  {
    src: '/projects/allserverformac.webp',
    left: 88,
    top: 58,
    sizePx: 94,
    blurPx: 0,
    opacity: 0.92,
    rotateDeg: -6,
    delaySeconds: 0.7,
    parallaxFactor: 0.26,
  },
  {
    src: '/projects/teledeck.webp',
    left: 74,
    top: 84,
    sizePx: 54,
    blurPx: 1.6,
    opacity: 0.5,
    rotateDeg: 13,
    delaySeconds: 3,
    parallaxFactor: 0.09,
  },
];

// Hero の背景に漂うアプリアイコン．
// 実際に公開しているアプリのアイコンを使い，奥行きと視差で立体感を出す．
export function FloatingAppIcons() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }
    return subscribeToScroll(() => setScrollY(window.scrollY));
  }, [prefersReducedMotion]);

  return (
    <div
      // 画面が狭いときは中央のコピーと干渉するため表示しない
      className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block"
      aria-hidden="true"
    >
      {FLOATING_TILES.map((tile) => (
        <div
          key={tile.src}
          className="absolute animate-bob will-change-transform"
          style={{
            left: `${tile.left}%`,
            top: `${tile.top}%`,
            animationDelay: `${tile.delaySeconds}s`,
            transform: `translate3d(-50%, ${(-scrollY * tile.parallaxFactor).toFixed(1)}px, 0)`,
          }}
        >
          <div
            style={{
              transform: `rotate(${tile.rotateDeg}deg)`,
              filter: tile.blurPx > 0 ? `blur(${tile.blurPx}px)` : undefined,
              opacity: tile.opacity,
            }}
          >
            <img
              src={tile.src}
              alt=""
              width={tile.sizePx}
              height={tile.sizePx}
              loading="eager"
              decoding="async"
              className="rounded-[22%] object-cover ring-1 ring-white/70 dark:ring-white/10 shadow-[0_22px_45px_-20px_rgb(49_58_75_/_0.5)]"
              style={{ width: `${tile.sizePx}px`, height: `${tile.sizePx}px` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
