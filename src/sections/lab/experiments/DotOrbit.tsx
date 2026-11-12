'use client';
import { orbitPoint } from '@/lib/lab/fields';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './DotOrbit.module.css';
const LIMITS = { columns: 14, rows: 10, maxDpr: 1.5, maxFps: 30 };
export function DotOrbit({ compact }: ExperimentProps) {
  return <ExperimentFrame id="dot-orbit" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    for (let y = 0; y < LIMITS.rows; y += 1) {
      for (let x = 0; x < LIMITS.columns; x += 1) {
        const cx = (x + 0.5) / LIMITS.columns;
        const cy = (y + 0.5) / LIMITS.rows;
        ctx.globalAlpha = 0.12;
        ctx.beginPath(); ctx.arc(cx * frame.width, cy * frame.height, 1, 0, Math.PI * 2); ctx.fill();
        const point = orbitPoint(cx, cy, frame.timeMs * 0.001, input.active ? input : null, input.action % 2 ? 1.5 : 1);
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(point.x * frame.width, point.y * frame.height, compact ? 1.7 : 2.6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }} />;
}
