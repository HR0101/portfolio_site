'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { MotionDisclosure } from '../../../components/MotionDisclosure';
import { MotionTabs } from '../../../components/MotionTabs';
import { useLayoutMotion } from '../../../hooks/useLayoutMotion';
import styles from './product.module.css';

export const DEMO_TITLES = ['時間ぴったり再生', 'マイチャンネル', '重複チェック', '1080p の軽量版'];

function DurationDemo() {
  const [minutes, setMinutes] = useState(10);
  return <>
    <div className={styles.durationDial} style={{ background: `conic-gradient(var(--teal-ink) ${minutes * 12}deg, var(--line) 0)` }}><b>{minutes}<small>分</small></b></div>
    <MotionTabs activeKey={minutes} className={styles.demoButtons} role="group" aria-label="合計再生時間">{[5, 10, 15, 30].map(value => <button key={value} type="button" aria-pressed={minutes === value} onClick={() => setMinutes(value)}>{value}分</button>)}</MotionTabs>
    <div className={styles.durationTrack} aria-hidden="true"><i style={{ width: `${minutes / 30 * 100}%` }} /></div>
    <p role="status">最後の区間を調整して，合計 {minutes} 分に．</p>
  </>;
}

function ChannelDemo() {
  const [channel, setChannel] = useState(0);
  const channels = ['オーロラ', 'ひろがる景色', '実験映像'];
  function change(delta: number) { setChannel(value => (value + delta + channels.length) % channels.length); }
  return <div tabIndex={0} className={styles.channelDemo} aria-label="チャンネルのデモ．上下キーで切り替え" onKeyDown={event => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); change(event.key === 'ArrowUp' ? 1 : -1); }
  }}>
    <div className={styles.demoTv} data-channel={channel}><strong key={channel}>CH {channel + 1}<br />{channels[channel]}</strong></div>
    <div className={styles.demoButtons}><button type="button" onClick={() => change(1)}>↑ 次</button><button type="button" onClick={() => change(-1)}>↓ 前</button></div>
    <p role="status">再生中：{channels[channel]}（上下キーでも切り替え）</p>
  </div>;
}

function DuplicateDemo() {
  const [sorted, setSorted] = useState(false);
  const { ref, capture } = useLayoutMotion<HTMLDivElement>();
  return <>
    <div ref={ref} className={styles.duplicateFiles} data-sorted={sorted}>
      <span data-layout-key="a">A.mp4 <b>◆</b></span><span data-layout-key="b">B.mp4 <b>●</b></span><span data-layout-key="copy">コピー.mp4 <b>◆</b></span>
    </div>
    <p role="status">{sorted ? 'A.mp4 と コピー.mp4 は，同じ中身．' : '名前が違っても，中身を比べます．'}</p>
    <button type="button" onClick={() => { capture(); setSorted(!sorted); }}>{sorted ? '並びを戻す' : '重複を仕分ける'}</button>
  </>;
}

function ProxyDemo() {
  const [progress, setProgress] = useState<number | null>(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (progress === null || progress >= 100) return;
    if (reduced) { setProgress(100); return; }
    const timer = window.setTimeout(() => setProgress(value => Math.min(100, (value ?? 0) + 20)), 220);
    return () => window.clearTimeout(timer);
  }, [progress, reduced]);
  return <>
    <div className={styles.proxyScreen} data-playing={progress === 100}>{progress === 100 ? '▶ 1080p を再生' : '元の動画 → 1080p'}</div>
    <progress max={100} value={progress ?? 0} aria-label="軽量版の変換進捗" />
    <p role="status">{progress === null ? '選んだときだけ軽量版を作成' : progress < 100 ? `変換中 ${progress}%` : '変換完了 → 再生へ'}</p>
    <button type="button" disabled={progress !== null && progress < 100} onClick={() => setProgress(reduced ? 100 : 0)}>{progress === 100 ? 'もう一度見る' : '軽量版を作る'}</button>
  </>;
}

export function FeatureDemo({ title, text, icon, hue }: { title: string; text: string; icon: ReactNode; hue: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return <div className={styles.featureDemo}>
    <div className={styles.moreTile} data-hue={hue} data-open={open}>
      <button type="button" className={styles.featureCardToggle} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={panelId} aria-label={`${title}のデモを${open ? '閉じる' : '開く'}`}>
        <span className={styles.featureCardIcon}>{icon}</span><strong>{title}</strong><span className={styles.featureCardAction}>{open ? 'デモを閉じる −' : 'デモを試す ↗'}</span>
      </button>
      <MotionDisclosure id={panelId} open={open}><div className={styles.featureBack}>
        {title === DEMO_TITLES[0] ? <DurationDemo /> : title === DEMO_TITLES[1] ? <ChannelDemo /> : title === DEMO_TITLES[2] ? <DuplicateDemo /> : <ProxyDemo />}
        <small>仕組みを再現した図</small>
      </div></MotionDisclosure>
    </div>
    <span className="sr-only">{text}</span>
  </div>;
}
