'use client';
import { useRef } from 'react';
import { rippleHeight, type Ripple } from '@/lib/lab/fields';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './RippleField.module.css';
const LIMITS = { columns: 40, rows: 24, ripples: 6, maxDpr: 1.5, maxFps: 30 };
export function RippleField({ compact }: ExperimentProps) {
  const ripples = useRef<Ripple[]>([{ x: 0.5, y: 0.5, born: 0 }]);
  const action = useRef(0);
  const lastAuto = useRef(0);
  return <ExperimentFrame id="ripple-field" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    const time = frame.timeMs * 0.001;
    if (action.current !== input.action || time - lastAuto.current > 4) {
      const manual = action.current !== input.action;
      ripples.current.push({ x: manual ? input.x : 0.5 + Math.sin(time) * 0.2, y: manual ? input.y : 0.5, born: time });
      ripples.current = ripples.current.slice(-LIMITS.ripples);
      action.current = input.action; lastAuto.current = time;
    }
    for (let y = 0; y < LIMITS.rows; y += 1) {
      for (let x = 0; x < LIMITS.columns; x += 1) {
        const px = (x + 0.5) / LIMITS.columns; const py = (y + 0.5) / LIMITS.rows;
        const wave = rippleHeight(px, py, time, ripples.current);
        ctx.globalAlpha = 0.2 + Math.min(0.8, Math.abs(wave));
        ctx.beginPath(); ctx.arc(px * frame.width, py * frame.height + wave * 5, Math.max(0.6, 1.3 + wave * 0.8), 0, Math.PI * 2); ctx.fill();
      }
    }
  }} />;
}
