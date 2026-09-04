"use client";

import { useEffect, useState } from 'react';
import {
  Bus,
  Cast,
  Disc3,
  Dumbbell,
  Keyboard,
  LayoutDashboard,
  LockKeyhole,
  Map,
  Radar,
  Server,
  type LucideIcon,
} from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { subscribeToScroll } from '../lib/scrollObserver';

// 浮かせるアイコンの配置定義（位置は画面比率，サイズと動きは個別に指定）
interface FloatingIcon {
  icon: LucideIcon;
  // 画面左からの位置（%）
  left: number;
  // 画面上からの位置（%）
  top: number;
  sizeClassName: string;
  // 上下運動の周期をずらすための遅延（秒）
  delaySeconds: number;
  // スクロール量に対する移動係数（大きいほど手前に見える）
  parallaxFactor: number;
}

const FLOATING_ICONS: FloatingIcon[] = [
  { icon: Radar, left: 8, top: 22, sizeClassName: 'w-9 h-9', delaySeconds: 0, parallaxFactor: 0.18 },
  { icon: Bus, left: 17, top: 68, sizeClassName: 'w-7 h-7', delaySeconds: 1.2, parallaxFactor: 0.1 },
  { icon: Dumbbell, left: 27, top: 15, sizeClassName: 'w-6 h-6', delaySeconds: 2.1, parallaxFactor: 0.24 },
  { icon: Server, left: 84, top: 26, sizeClassName: 'w-8 h-8', delaySeconds: 0.6, parallaxFactor: 0.15 },
  { icon: LayoutDashboard, left: 90, top: 62, sizeClassName: 'w-7 h-7', delaySeconds: 1.8, parallaxFactor: 0.22 },
  { icon: Disc3, left: 74, top: 80, sizeClassName: 'w-6 h-6', delaySeconds: 2.6, parallaxFactor: 0.12 },
  { icon: Map, left: 12, top: 45, sizeClassName: 'w-6 h-6', delaySeconds: 3.1, parallaxFactor: 0.2 },
  { icon: Cast, left: 68, top: 12, sizeClassName: 'w-6 h-6', delaySeconds: 1.5, parallaxFactor: 0.16 },
  { icon: LockKeyhole, left: 33, top: 84, sizeClassName: 'w-6 h-6', delaySeconds: 0.9, parallaxFactor: 0.26 },
  { icon: Keyboard, left: 58, top: 88, sizeClassName: 'w-7 h-7', delaySeconds: 2.3, parallaxFactor: 0.14 },
];

// Hero の背景で漂う，アプリのアイコン群．
// スクロールに応じて視差移動し，奥行きを演出する．
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
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {FLOATING_ICONS.map((floatingIcon, index) => {
        const Icon = floatingIcon.icon;
        return (
          <div
            key={index}
            className="absolute animate-bob text-sky-400/30 dark:text-sky-300/20"
            style={{
              left: `${floatingIcon.left}%`,
              top: `${floatingIcon.top}%`,
              animationDelay: `${floatingIcon.delaySeconds}s`,
              transform: `translateY(${(-scrollY * floatingIcon.parallaxFactor).toFixed(1)}px)`,
            }}
          >
            <Icon className={floatingIcon.sizeClassName} />
          </div>
        );
      })}
    </div>
  );
}
