'use client';

import { useState } from 'react';
import { SCREEN_DIR, SCREENSHOT_WIDTH, MAC_SCREENSHOT_HEIGHT } from './screen-assets';
import styles from './product.module.css';

// 同じライブラリの明るい外観と暗い外観を，境界線で比較する．
export function AppearanceWipe() {
  const [position, setPosition] = useState(50);

  return <figure className={styles.wipe}>
    <div className={styles.wipeStage}>
      <img src={`${SCREEN_DIR}/library.webp`} alt="暗い外観のライブラリ" width={SCREENSHOT_WIDTH} height={MAC_SCREENSHOT_HEIGHT} loading="lazy" />
      <img className={styles.wipeLight} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} src={`${SCREEN_DIR}/library-light.webp`} alt="明るい外観の同じライブラリ" width={SCREENSHOT_WIDTH} height={MAC_SCREENSHOT_HEIGHT} loading="lazy" />
      <span className={styles.wipeDivider} style={{ left: `${position}%` }} aria-hidden="true"><b>↔</b></span>
      <input className={styles.wipeInput} type="range" min={0} max={100} value={position} onChange={event => setPosition(Number(event.target.value))} aria-label="明るい外観の表示割合" aria-valuetext={`明るい外観 ${position}%`} />
    </div>
    <figcaption>明るい外観 ← 境界をドラッグして比較 → 暗い外観</figcaption>
  </figure>;
}
