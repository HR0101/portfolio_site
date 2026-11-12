'use client';
import { lissajousPoint } from '@/lib/lab/fields';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './Lissajous.module.css';
const LIMITS = { points: 480, maxDpr: 1.5, maxFps: 30 };
export function Lissajous({ compact }: ExperimentProps) {
  return <ExperimentFrame id="lissajous" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    const ratio = 2 + input.action % 4;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    for (let index = 0; index <= LIMITS.points; index += 1) {
      const point = lissajousPoint(index / LIMITS.points, frame.timeMs * 0.001, ratio);
      if (index === 0) ctx.moveTo(point.x * frame.width, point.y * frame.height); else ctx.lineTo(point.x * frame.width, point.y * frame.height);
    }
    ctx.stroke();
    const point = lissajousPoint((frame.timeMs % 8000) / 8000, frame.timeMs * 0.001, ratio);
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(point.x * frame.width, point.y * frame.height, 4, 0, Math.PI * 2); ctx.fill();
  }} />;
}
