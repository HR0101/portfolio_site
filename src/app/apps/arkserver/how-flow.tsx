'use client';

import { useEffect, useRef, useState } from 'react';
import { KeyRound, Lock, LockOpen, Radar, Send, Wifi } from 'lucide-react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { Waves } from './waves';
import styles from './product.module.css';

// 3つの段階．各段階をこの時間ずつ見せて，順にくり返す（ミリ秒）
const STEP_MS = 3000;
const PIN_DIGITS = 6;
// 配信の段階で，Mac から iPhone へ流れるサムネイルの数
const PACKET_COUNT = 4;

const STEPS = [
  { icon: Radar, tag: '自動検出', label: 'Mac を探す', note: 'Bonjour で，同じ Wi‑Fi の Mac を自動で探します．IP アドレスの入力は不要です．' },
  { icon: KeyRound, tag: 'PIN 認証', label: 'PIN で接続', note: '6桁の PIN で，本人だけを通します．アクセスの記録も残ります．' },
  { icon: Send, tag: 'HTTP 配信', label: '動画と写真を見る', note: 'サムネイルと動画を，HTTP で配ります．' },
] as const;

// Mac から iPhone へ，発見→認証→配信が流れていくようすを，順にくり返して見せる図．
// 画面に入っている間だけ進み，動きを減らす設定では最後の状態で止める．
export function HowFlow() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setIsVisible(Boolean(entry?.isIntersecting)), { threshold: 0.3 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || prefersReducedMotion) {
      return;
    }
    const timer = window.setInterval(() => setStep((current) => (current + 1) % STEPS.length), STEP_MS);
    return () => window.clearInterval(timer);
  }, [isVisible, prefersReducedMotion]);

  // 動きを減らす設定では，いちばん情報の多い最後の段階を見せる
  const shownStep = prefersReducedMotion ? STEPS.length - 1 : step;

  return (
    <div ref={rootRef} className={styles.flowStage} data-step={shownStep}>
      <div className={styles.flowScene} aria-hidden="true">
        {/* 左: Mac */}
        <div className={styles.flowDevice}>
          <span className={styles.flowMac}>
            <img src="/projects/arkserver.svg" alt="" width={72} height={72} />
            <i className={styles.flowLed} />
          </span>
          <b>配信する Mac：Ark Server</b>
          <ul className={styles.flowChips}>
            <li>HTTP の配信サーバー</li>
            <li>ブラウザ用の画面</li>
            <li>サムネイルの自動生成</li>
          </ul>
        </div>

        {/* 中: Wi‑Fi の道すじ．段階ごとに，波紋・鍵・サムネイルが現れる */}
        <div className={styles.flowTrack}>
          <span className={styles.flowWifi}>
            <Wifi size={18} />
            同じ Wi‑Fi
          </span>
          <Waves />
          <span className={styles.flowRail} />

          <span className={`${styles.flowRing} ${styles.flowRingA}`} />
          <span className={`${styles.flowRing} ${styles.flowRingB}`} />
          <span className={`${styles.flowRing} ${styles.flowRingC}`} />

          <span className={styles.flowPin}>
            <span className={styles.flowLock}>
              <Lock size={16} className={styles.flowLockClosed} />
              <LockOpen size={16} className={styles.flowLockOpen} />
            </span>
            {Array.from({ length: PIN_DIGITS }, (_, index) => (
              <i key={index} style={{ ['--d' as string]: index }} />
            ))}
          </span>

          {Array.from({ length: PACKET_COUNT }, (_, index) => (
            <span key={index} className={styles.flowPacket} style={{ ['--p' as string]: index }} />
          ))}
        </div>

        {/* 右: iPhone */}
        <div className={styles.flowDevice}>
          <span className={styles.flowPhone}>
            <i className={styles.flowNotch} />
            <span className={styles.flowFound}>Mac Media Server</span>
            <span className={styles.flowTiles}>
              {Array.from({ length: PACKET_COUNT }, (_, index) => (
                <i key={index} style={{ ['--p' as string]: index }} />
              ))}
            </span>
          </span>
          <b>見る端末：VideoPlayer／ブラウザ</b>
          <ul className={styles.flowChips}>
            <li>iPhone の専用アプリ</li>
            <li>スマホ・Mac のブラウザ</li>
          </ul>
        </div>
      </div>

      {/* 段階の目印．いま進んでいる段階が光り，下の線が伸びる */}
      <ol className={styles.flowSteps}>
        {STEPS.map((item, index) => (
          <li key={item.label} data-active={index === shownStep} data-done={index < shownStep}>
            <span className={styles.flowStepIcon}>
              <item.icon size={18} aria-hidden="true" />
            </span>
            <span>
              <strong>
                <em aria-hidden="true">{String(index + 1).padStart(2, '0')}</em>
                {item.label}
                <span className={styles.flowTag}>{item.tag}</span>
              </strong>
              <small>{item.note}</small>
            </span>
            {index === shownStep && !prefersReducedMotion && <i className={styles.flowStepBar} aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </div>
  );
}
