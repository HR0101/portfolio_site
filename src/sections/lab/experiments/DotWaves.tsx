'use client';
import { useState } from 'react';
import { wavePoint } from '@/lib/lab/fields';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './DotWaves.module.css';
const LIMITS = { columns: 32, rows: 18, maxDpr: 1.5, maxFps: 40 };
export function DotWaves({ compact }: ExperimentProps) {
  const [speed, setSpeed] = useState(1);
  return <ExperimentFrame id="dot-waves" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    const pointer = input.active ? input : null;
    for (let y = 0; y < LIMITS.rows; y += 1) {
      for (let x = 0; x < LIMITS.columns; x += 1) {
        const point = wavePoint(0.05 + x / (LIMITS.columns - 1) * 0.9, 0.12 + y / (LIMITS.rows - 1) * 0.76, frame.timeMs * 0.0008 * speed, pointer);
        ctx.beginPath(); ctx.arc(point.x * frame.width, point.y * frame.height, point.radius * (compact ? 0.7 : 1), 0, Math.PI * 2); ctx.fill();
      }
    }
  }}><label>波の速さ<input aria-label="波の速さ" type="range" min="0.2" max="2" step="0.1" value={speed} onChange={event => setSpeed(Number(event.target.value))} /><output>{speed.toFixed(1)}×</output></label></ExperimentFrame>;
}
