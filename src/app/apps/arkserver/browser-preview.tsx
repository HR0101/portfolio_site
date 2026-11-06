'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { Home, Clapperboard, Play, Library } from 'lucide-react';
import styles from './product.module.css';

const TABS = [Home, Clapperboard, Play, Library];
const LABELS = ['ホーム', 'ショート', '続きを見る', 'アルバム'];

// A local illustration: no requests to the user's LAN server.
export function BrowserPreview() {
  const [width, setWidth] = useState(1080);
  const drag = useRef<{ x: number; width: number; scale: number } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const compact = width <= 900;
  function start(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, width, scale: (host.current?.clientWidth ?? 1200) / 1200 };
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    setWidth(Math.round(Math.min(1200, Math.max(360, drag.current.width + (event.clientX - drag.current.x) / drag.current.scale))));
  }
  return <figure className={styles.resizeDemo}>
    <div className={styles.resizeControls}>
      <label htmlFor="browser-width">画面の幅 <output>{width}px</output></label>
      <input id="browser-width" type="range" min="360" max="1200" value={width} onChange={event => setWidth(Number(event.target.value))} aria-valuetext={`${width}px・${compact ? '下タブバー' : 'サイドレール'}`} />
      <div>{[390, 900, 1080].map(value => <button type="button" key={value} onClick={() => setWidth(value)} aria-pressed={width === value}>{value}px</button>)}</div>
    </div>
    <div ref={host} className={styles.resizeHost}>
      <div className={styles.resizeWindow} data-compact={compact} style={{ width: `${width / 12}%` }}>
        <div className={styles.resizeChrome}>● ● ● <span>マイライブラリ</span></div>
        <div className={styles.resizeBody}>
          <div className={styles.resizeNav} aria-label="ナビゲーション配置の見本">
            {TABS.map((Icon, index) => <span key={LABELS[index]}><Icon size={16} aria-hidden="true" /><span>{LABELS[index]}</span></span>)}
          </div>
          <div className={styles.resizeFeed}>
            <strong>ホーム</strong>
            <div className={styles.resizeThumbnail}><Play size={28} aria-hidden="true" /></div>
            <p>朝焼けのオーロラ</p>
            <div className={styles.resizeThumbnail} data-second><Play size={28} aria-hidden="true" /></div>
          </div>
        </div>
        <button type="button" className={styles.resizeHandle} aria-label="右端をドラッグして幅を変更（矢印キーでも操作できます）" onPointerDown={start} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setWidth(value => Math.max(360, Math.min(1200, value + (event.key === 'ArrowLeft' ? -20 : 20)))); }
        }}>↔</button>
      </div>
    </div>
    <figcaption>右端のハンドルを動かすと，900px以下でサイドレールが下タブバーに切り替わります．配置の変化を再現した図です．</figcaption>
  </figure>;
}
