'use client';

import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import styles from './product.module.css';

// 空の弧の高さ（px）．境界線の位置に合わせて，太陽と月が弧を描いて入れ替わる
const ARC_HEIGHT_PX = 54;

// 明るい外観（夜明け）と暗い外観（夜）を，境界線で比べる．
// 境界線を動かすと，空の太陽と月も，弧にそって動く（左端が夜明け，右端が夜）．
export function AppearanceWipe() {
  const [position, setPosition] = useState(50);
  // 0（夜明け）〜 1（夜）．境界線が右へ行くほど，明るい外観が広く見える
  const time = 1 - position / 100;
  const bodyY = -Math.sin(Math.PI * time) * ARC_HEIGHT_PX;
  // 弧の中ほど（時刻 0.5）で，太陽から月へ入れ替わる
  const sunOpacity = Math.min(1, Math.max(0, 1 - (time - 0.4) / 0.2));

  return <figure className={styles.wipe}>
    <div className={styles.skyArc} aria-hidden="true">
      <svg viewBox="0 0 600 80" preserveAspectRatio="none">
        <path d="M0 76 Q300 -34 600 76" />
      </svg>
      <span className={styles.skyLabelLeft}>明るい外観</span>
      <span className={styles.skyLabelRight}>暗い外観</span>
      <span className={styles.skyBody} style={{ left: `${time * 100}%`, transform: `translate(-50%, ${bodyY.toFixed(1)}px)` }}>
        <Sun className={styles.skySun} size={26} style={{ opacity: sunOpacity }} />
        <Moon className={styles.skyMoon} size={24} style={{ opacity: 1 - sunOpacity }} />
      </span>
    </div>
    <div className={styles.wipeStage}>
      <img src="/projects/arkserver-screens/library.webp" alt="暗い外観のライブラリ" width={840} height={525} loading="lazy" />
      <img className={styles.wipeLight} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} src="/projects/arkserver-screens/library-light.webp" alt="明るい外観の同じライブラリ" width={840} height={525} loading="lazy" />
      <span className={styles.wipeDivider} style={{ left: `${position}%` }} aria-hidden="true"><b>↔</b></span>
      <input className={styles.wipeInput} type="range" min={0} max={100} value={position} onChange={event => setPosition(Number(event.target.value))} aria-label="明るい外観の表示割合" aria-valuetext={`明るい外観 ${position}%`} />
    </div>
    <figcaption>明るい外観 ← 境界をドラッグして比較 → 暗い外観</figcaption>
  </figure>;
}
