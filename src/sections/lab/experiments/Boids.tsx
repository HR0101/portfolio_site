'use client';
import { useRef, useState } from 'react';
import { createBoids, stepBoids, MAX_BOIDS, type Boid } from '@/lib/lab/boids';
import { mulberry32 } from '@/lib/lab/random';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './Boids.module.css';
const LIMITS = { points: MAX_BOIDS, maxDpr: 1.5, maxFps: 30 };
export function Boids({ compact }: ExperimentProps) {
  const flock = useRef<Boid[] | null>(null);
  const [collected, setCollected] = useState(false);
  return <ExperimentFrame id="boids" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    if (!flock.current) flock.current = createBoids(mulberry32(1904));
    const target = collected ? { x: input.active ? input.x : 0.5, y: input.active ? input.y : 0.5 } : null;
    flock.current = stepBoids(flock.current, frame.deltaMs, target);
    flock.current.forEach(boid => {
      ctx.save(); ctx.translate(boid.x * frame.width, boid.y * frame.height);
      ctx.rotate(collected ? 0 : Math.atan2(boid.vy, boid.vx));
      ctx.globalAlpha = collected ? 0.88 : 0.6;
      ctx.fillRect(-3, -1, compact ? 4 : 7, compact ? 2 : 3); ctx.restore();
    });
  }}><button type="button" className="press-effect" aria-pressed={collected} onClick={() => setCollected(value => !value)}>{collected ? '散らす' : '集める'}</button></ExperimentFrame>;
}
