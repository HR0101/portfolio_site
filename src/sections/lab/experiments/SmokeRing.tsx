'use client';
import { smokePoint } from '@/lib/lab/fields';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './SmokeRing.module.css';
const LIMITS = { points: 600, layers: 4, maxDpr: 1.5, maxFps: 30 };
export function SmokeRing({ compact }: ExperimentProps) {
  return <ExperimentFrame id="smoke-ring" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    const size = Math.min(frame.width, frame.height);
    const center = input.active ? { x: 0.5 + (input.x - 0.5) * 0.35, y: 0.5 + (input.y - 0.5) * 0.35 } : { x: 0.5, y: 0.5 };
    for (let index = 0; index < LIMITS.points; index += 1) {
      const layer = index % LIMITS.layers;
      const point = smokePoint(Math.floor(index / LIMITS.layers), LIMITS.points / LIMITS.layers, frame.timeMs * 0.0006 + layer * 0.12, input.action % 2 ? 0.3 : 0.13, center);
      ctx.globalAlpha = 0.22 + layer * 0.14;
      ctx.beginPath(); ctx.arc(frame.width / 2 + (point.x - 0.5) * size, frame.height / 2 + (point.y - 0.5) * size, compact ? 0.9 : 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }} />;
}
