'use client';
import { useRef } from 'react';
import { createStarSeeds, starPoint, MAX_STARS, type StarSeed } from '@/lib/lab/fields';
import { mulberry32 } from '@/lib/lab/random';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './Constellation.module.css';
const LIMITS = { points: MAX_STARS, maxDpr: 1.5, maxFps: 30, linkDistance: 0.22, pointerDistance: 0.32 };
export function Constellation({ compact }: ExperimentProps) {
  const stars = useRef<{ seed: number; points: StarSeed[] }>({ seed: -1, points: [] });
  return <ExperimentFrame id="constellation" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    if (stars.current.seed !== input.action) {
      const random = mulberry32(301 + input.action);
      stars.current = { seed: input.action, points: createStarSeeds(random, LIMITS.points) };
    }
    const points = stars.current.points.map(point => starPoint(point, frame.timeMs));
    const pointer = input.active ? input : { x: 0.5, y: 0.5 };
    points.forEach((point, index) => {
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(point.x * frame.width, point.y * frame.height, compact ? 1.2 : 2, 0, Math.PI * 2); ctx.fill();
      if (Math.hypot(point.x - pointer.x, point.y - pointer.y) > LIMITS.pointerDistance) return;
      for (let otherIndex = index + 1; otherIndex < points.length; otherIndex += 1) {
        const other = points[otherIndex];
        const distance = Math.hypot(point.x - other.x, point.y - other.y);
        if (distance > LIMITS.linkDistance || Math.hypot(other.x - pointer.x, other.y - pointer.y) > LIMITS.pointerDistance) continue;
        ctx.globalAlpha = (1 - distance / LIMITS.linkDistance) * 0.5;
        ctx.beginPath(); ctx.moveTo(point.x * frame.width, point.y * frame.height); ctx.lineTo(other.x * frame.width, other.y * frame.height); ctx.stroke();
      }
    });
  }} />;
}
