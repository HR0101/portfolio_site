'use client';
import { useRef } from 'react';
import { flowAngle } from '@/lib/lab/fields';
import { mulberry32 } from '@/lib/lab/random';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './FlowField.module.css';
const LIMITS = { points: 140, trailLength: 10, maxDpr: 1, maxFps: 30 };
interface FlowPoint { x: number; y: number; trail: { x: number; y: number }[] }
export function FlowField({ compact }: ExperimentProps) {
  const particles = useRef<FlowPoint[] | null>(null);
  return <ExperimentFrame id="flow-field" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    if (!particles.current) {
      const random = mulberry32(1701);
      particles.current = Array.from({ length: LIMITS.points }, () => ({ x: random(), y: random(), trail: [] }));
    }
    for (const point of particles.current) {
      if (frame.deltaMs > 0) {
        const angle = flowAngle(point.x, point.y, frame.timeMs * 0.001, input.action % 2 ? -1 : 1, input.active ? input : null);
        const x = point.x + Math.cos(angle) * frame.deltaMs * 0.00007;
        const y = point.y + Math.sin(angle) * frame.deltaMs * 0.00007;
        if (x < 0 || x > 1 || y < 0 || y > 1) point.trail = [];
        point.x = (x + 1) % 1; point.y = (y + 1) % 1;
        point.trail.push({ x: point.x, y: point.y });
        if (point.trail.length > LIMITS.trailLength) point.trail.shift();
      }
      for (let index = 1; index < point.trail.length; index += 1) {
        const previous = point.trail[index - 1]; const next = point.trail[index];
        ctx.globalAlpha = index / LIMITS.trailLength * 0.55;
        ctx.beginPath(); ctx.moveTo(previous.x * frame.width, previous.y * frame.height); ctx.lineTo(next.x * frame.width, next.y * frame.height); ctx.stroke();
      }
      ctx.globalAlpha = 0.7;
      ctx.fillRect(point.x * frame.width, point.y * frame.height, compact ? 1 : 2, compact ? 1 : 2);
    }
  }} />;
}
