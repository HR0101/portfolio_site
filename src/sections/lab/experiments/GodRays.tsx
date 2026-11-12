'use client';
import { rayShape } from '@/lib/lab/fields';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './GodRays.module.css';
const LIMITS = { rays: 64, maxDpr: 1.5, maxFps: 24 };
export function GodRays({ compact }: ExperimentProps) {
  return <ExperimentFrame id="god-rays" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    const sourceX = (input.active ? input.x : 0.5) * frame.width;
    const sourceY = (input.active ? input.y : 0.04) * frame.height;
    const length = Math.hypot(frame.width, frame.height) * 2;
    for (let index = 0; index < LIMITS.rays; index += 1) {
      const ray = rayShape(index, LIMITS.rays, frame.timeMs, input.action % 2 === 1);
      ctx.globalAlpha = ray.alpha;
      ctx.beginPath(); ctx.moveTo(sourceX, sourceY);
      ctx.lineTo(sourceX + ray.start.x * length, sourceY + ray.start.y * length);
      ctx.lineTo(sourceX + ray.end.x * length, sourceY + ray.end.y * length);
      ctx.closePath(); ctx.fill();
    }
  }} />;
}
