'use client';

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import styles from './product.module.css';

// Coordinates refer to the original 840 × 525 screenshot.
const DASHBOARD = [
  { x: 58, y: 33, label: '開始・停止', detail: 'ここで配信を開始・停止します（画面は配信中）．' },
  { x: 35, y: 64, label: 'QR で接続', detail: 'スマホで QR を読み取って接続します．' },
  { x: 87, y: 37, label: 'PIN で認証', detail: '接続先の端末に6桁の PIN を入力します．' },
];

export function TourCallouts({ active, running }: { active: boolean; running: boolean }) {
  const [step, setStep] = useState(0);
  const [manual, setManual] = useState(false);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (!active || !running || manual || reduced) return;
    const timer = window.setInterval(() => setStep(current => (current + 1) % DASHBOARD.length), 1900);
    return () => window.clearInterval(timer);
  }, [active, running, manual, reduced]);
  return <>
    <div className={styles.callouts}>
      {DASHBOARD.map((point, index) => <button key={point.label} type="button" className={styles.callout} data-current={step === index} style={{ left: `${point.x}%`, top: `${point.y}%` }} aria-label={`${index + 1}. ${point.label}`} aria-pressed={step === index} onClick={() => { setStep(index); setManual(true); }}>
        {index + 1}<span>{point.label}</span>
      </button>)}
    </div>
    <p className={styles.calloutCaption}>{step + 1}. {DASHBOARD[step].detail}</p>
  </>;
}
