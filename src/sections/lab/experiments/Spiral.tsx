'use client';
import { spiralPoint } from '@/lib/lab/fields';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './Spiral.module.css';
const LIMITS = { points: 420, maxDpr: 1.5, maxFps: 40 };
export function Spiral({ compact }: ExperimentProps) {
  return <ExperimentFrame id="spiral" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    const time = frame.timeMs * 0.0003 * (input.action % 2 ? -1 : 1);
    for (let index = 0; index < LIMITS.points; index += 1) {
      const point = spiralPoint(index, LIMITS.points, time);
      ctx.globalAlpha = 0.25 + index / LIMITS.points * 0.75;
      ctx.beginPath(); ctx.arc(frame.width / 2 + (point.x - 0.5) * frame.width, frame.height / 2 + (point.y - 0.5) * frame.height, compact ? 1 : 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }} />;
}
