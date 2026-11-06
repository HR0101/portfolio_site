'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Minus, X } from 'lucide-react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import styles from './product.module.css';

// 利用者が触ったあと，自動の動きを止めておく時間（ミリ秒）
const MANUAL_HOLD_MS = 5000;

// 画面に見えている間だけ true になる（一度きりではなく，出入りに追従する）
function useVisibility<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setIsVisible(Boolean(entry?.isIntersecting)), { threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// 一定間隔で数を進める．止めたいときは run を false にする
function useTicker(run: boolean, intervalMs: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!run) {
      return;
    }
    const timer = window.setInterval(() => setTick((current) => current + 1), intervalMs);
    return () => window.clearInterval(timer);
  }, [run, intervalMs]);
  return [tick, setTick] as const;
}

// 触ったあとの一定時間だけ true になる印．自動の動きを一時的に譲らせるために使う
function useManualHold() {
  const [isHeld, setIsHeld] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  const hold = useCallback(() => {
    setIsHeld(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setIsHeld(false), MANUAL_HOLD_MS);
  }, []);

  return [isHeld, hold] as const;
}

/* ============ 1. 差分切り替え：同じ時計で走り，絵だけが入れ替わる ============ */

const VARIANTS = [
  { key: 'Q', name: '青', background: 'linear-gradient(135deg, #2b6cb0, #8a6ee0)' },
  { key: 'W', name: '桃', background: 'linear-gradient(135deg, #d53f8c, #ed8936)' },
  { key: 'E', name: '緑', background: 'linear-gradient(135deg, #2f855a, #2c9fb0)' },
] as const;
const VARIANT_SWITCH_MS = 1400;
const BEAT_COUNT = 8;

function VariantDemo() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { ref, isVisible } = useVisibility<HTMLDivElement>();
  const [isHeld, hold] = useManualHold();
  const [tick, setTick] = useTicker(isVisible && !isHeld && !prefersReducedMotion, VARIANT_SWITCH_MS);
  const active = tick % VARIANTS.length;

  return (
    <div ref={ref} className={styles.demoBody}>
      <div className={styles.vdScreen} data-static={prefersReducedMotion}>
        {VARIANTS.map((variant, index) => (
          // 3枚とも同じ時計で動かし続け，見せる1枚だけを不透明にする（切り替えても継ぎ目がない）
          <div key={variant.key} className={styles.vdLayer} style={{ background: variant.background, opacity: index === active ? 1 : 0 }}>
            <i className={styles.vdBand} />
          </div>
        ))}
        <span className={styles.vdBadge}>{VARIANTS[active].key}・{VARIANTS[active].name}</span>
        <span className={styles.vdClock} />
      </div>
      <div className={styles.vdControls}>
        <div className={styles.vdChips} role="group" aria-label="差分を選ぶ">
          {VARIANTS.map((variant, index) => (
            <button
              key={variant.key}
              type="button"
              aria-pressed={index === active}
              onClick={() => {
                hold();
                setTick(index);
              }}
            >
              <kbd>{variant.key}</kbd>
              {variant.name}
            </button>
          ))}
        </div>
        <div className={styles.vdBeats} aria-hidden="true">
          {Array.from({ length: BEAT_COUNT }, (_, index) => (
            <i key={index} data-on={index === tick % BEAT_COUNT} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ 2. シーン抽出：候補を 1・2・3 のキーで仕分ける ============ */

type Verdict = 'pending' | 'adopted' | 'hold' | 'rejected';

const CANDIDATES = [
  { start: 9, width: 13 },
  { start: 40, width: 11 },
  { start: 68, width: 15 },
] as const;
// 台本．各段階での再生位置（%）・押されているキー・候補ごとの判定
const SCENE_SCRIPT: { head: number; key: number | null; verdicts: Verdict[] }[] = [
  { head: 2, key: null, verdicts: ['pending', 'pending', 'pending'] },
  { head: 12, key: null, verdicts: ['pending', 'pending', 'pending'] },
  { head: 14, key: 1, verdicts: ['adopted', 'pending', 'pending'] },
  { head: 43, key: null, verdicts: ['adopted', 'pending', 'pending'] },
  { head: 45, key: 2, verdicts: ['adopted', 'hold', 'pending'] },
  { head: 72, key: null, verdicts: ['adopted', 'hold', 'pending'] },
  { head: 74, key: 3, verdicts: ['adopted', 'hold', 'rejected'] },
  { head: 98, key: null, verdicts: ['adopted', 'hold', 'rejected'] },
];
const SCENE_STEP_MS = 1300;
const WAVE_BAR_COUNT = 44;
const VERDICT_LABEL: Record<Verdict, string> = { pending: '未判定', adopted: '採用', hold: '保留', rejected: '却下' };

function SceneDemo() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { ref, isVisible } = useVisibility<HTMLDivElement>();
  const [tick] = useTicker(isVisible && !prefersReducedMotion, SCENE_STEP_MS);
  // 動きを減らす設定では，判定が出そろった最後の場面を見せる
  const step = prefersReducedMotion ? SCENE_SCRIPT.length - 1 : tick % SCENE_SCRIPT.length;
  const scene = SCENE_SCRIPT[step];

  // 決まった高さの波形（乱数を使わないので，表示のたびに同じ形になる）
  const bars = useMemo(
    () => Array.from({ length: WAVE_BAR_COUNT }, (_, index) => 22 + Math.round(Math.abs(Math.sin(index * 0.9) * Math.cos(index * 0.37)) * 62)),
    [],
  );

  return (
    <div ref={ref} className={styles.demoBody}>
      <div className={styles.sdTimeline} aria-hidden="true">
        <div className={styles.sdWave}>
          {bars.map((height, index) => (
            <i key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
        {CANDIDATES.map((candidate, index) => (
          <span
            key={index}
            className={styles.sdCandidate}
            data-verdict={scene.verdicts[index]}
            style={{ left: `${candidate.start}%`, width: `${candidate.width}%` }}
          />
        ))}
        <span className={styles.sdHead} style={{ left: `${scene.head}%` }} />
      </div>

      <div className={styles.sdKeys} role="group" aria-label="判定のキー">
        {[
          { n: 1, label: '採用', icon: Check },
          { n: 2, label: '保留', icon: Minus },
          { n: 3, label: '却下', icon: X },
        ].map((entry) => (
          <span key={entry.n} className={styles.sdKey} data-pressed={scene.key === entry.n} data-n={entry.n}>
            <kbd>{entry.n}</kbd>
            <entry.icon size={13} aria-hidden="true" />
            {entry.label}
          </span>
        ))}
      </div>

      <ul className={styles.sdList} aria-label="候補の判定">
        {CANDIDATES.map((_, index) => (
          <li key={index} data-verdict={scene.verdicts[index]}>
            候補 {index + 1}
            <b>{VERDICT_LABEL[scene.verdicts[index]]}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============ 3. 10等分のサムネイル：押した場所へ頭出し ============ */

const SPLIT_COUNT = 10;
const SPLIT_DURATION_SEC = 75;
const SPLIT_SCAN_MS = 900;

// Web 版と同じ規則で，10等分の各時刻（秒）を決める．先頭は黒いことが多いので，1% の位置にする
const SPLIT_TIMES = Array.from({ length: SPLIT_COUNT }, (_, index) =>
  Math.floor(SPLIT_DURATION_SEC * (index === 0 ? 0.01 : index / SPLIT_COUNT)),
);

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

// 各時刻の絵．夕景が時間とともに暮れていくように，色を少しずつ変える
function splitBackground(index: number) {
  const hue = 36 - index * 3.4;
  const lightness = 62 - index * 3.2;
  return `linear-gradient(${150 + index * 9}deg, hsl(${hue} 90% ${lightness}%), hsl(${252 - index * 2} 38% ${34 - index * 1.2}%))`;
}

function SplitDemo() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { ref, isVisible } = useVisibility<HTMLDivElement>();
  const [isHeld, hold] = useManualHold();
  const [tick, setTick] = useTicker(isVisible && !isHeld && !prefersReducedMotion, SPLIT_SCAN_MS);
  const active = tick % SPLIT_COUNT;
  const seconds = SPLIT_TIMES[active];

  return (
    <div ref={ref} className={styles.demoBody}>
      <div className={styles.spScreen} style={{ background: splitBackground(active) }} aria-hidden="true">
        <span className={styles.spTime}>{formatTime(seconds)}</span>
        <span className={styles.spSeek}>
          <i style={{ width: `${(seconds / SPLIT_DURATION_SEC) * 100}%` }} />
        </span>
      </div>
      <div className={styles.spStrip} role="group" aria-label="10等分の位置">
        {SPLIT_TIMES.map((time, index) => (
          <button
            key={time}
            type="button"
            aria-pressed={index === active}
            aria-label={`${formatTime(time)} へ移動`}
            style={{ background: splitBackground(index) }}
            onMouseEnter={() => {
              hold();
              setTick(index);
            }}
            onClick={() => {
              hold();
              setTick(index);
            }}
          >
            <span aria-hidden="true">{formatTime(time)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============ 並べる ============ */

const DEMOS = [
  { id: 'variant', title: '差分切り替え', caption: '3本を同じ時計で走らせ，見せる1本だけを入れ替えます．押して選べます．', Demo: VariantDemo },
  { id: 'scene', title: 'シーン抽出', caption: '見どころの候補を，キー 1・2・3 で採用・保留・却下に仕分けます．', Demo: SceneDemo },
  { id: 'split', title: '10等分の頭出し', caption: '動画を10等分したサムネイルに触れると，その位置へ飛びます．', Demo: SplitDemo },
];

export function MiniDemos() {
  return (
    <div className={styles.demoGrid}>
      {DEMOS.map(({ id, title, caption, Demo }) => (
        <figure key={id} className={styles.demoCard}>
          <Demo />
          <figcaption>
            <strong>{title}</strong>
            {caption}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
