'use client';
import { useRef } from 'react';
import { createCloth, stepCloth, CLOTH_MAX_POINTS, type Cloth as ClothModel } from '@/lib/lab/cloth';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './Cloth.module.css';
const LIMITS = { points: CLOTH_MAX_POINTS, maxDpr: 1.5, maxFps: 30 };
const GLYPH = ['11110010001', '10001010001', '10001010001', '11110011111', '10100010001', '10010010001', '10001010001'];
export function Cloth({ compact }: ExperimentProps) {
  const cloth = useRef<ClothModel | null>(null);
  return <ExperimentFrame id="cloth" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    if (!cloth.current) cloth.current = createCloth();
    cloth.current = stepCloth(cloth.current, frame.timeMs, frame.deltaMs, input.active ? input : null);
    const { points, columns, rows, links } = cloth.current;
    const moveTo = (index: number) => ctx.moveTo(points[index].x * frame.width, points[index].y * frame.height);
    const lineTo = (index: number) => ctx.lineTo(points[index].x * frame.width, points[index].y * frame.height);
    ctx.beginPath(); moveTo(0);
    for (let x = 1; x < columns; x += 1) lineTo(x);
    for (let y = 1; y < rows; y += 1) lineTo(y * columns + columns - 1);
    for (let x = columns - 2; x >= 0; x -= 1) lineTo((rows - 1) * columns + x);
    for (let y = rows - 2; y > 0; y -= 1) lineTo(y * columns);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = input.surface; ctx.fillStyle = input.surface;
    ctx.globalAlpha = 0.13;
    ctx.beginPath(); links.forEach(link => { moveTo(link.a); lineTo(link.b); }); ctx.stroke();
    ctx.globalAlpha = 0.95;
    GLYPH.forEach((row, y) => [...row].forEach((cell, x) => {
      if (cell !== '1') return;
      const index = (y + 4) * columns + x + 5;
      ctx.beginPath(); moveTo(index); lineTo(index + 1); lineTo(index + columns + 1); lineTo(index + columns); ctx.closePath(); ctx.fill();
    }));
    ctx.fillStyle = input.ink;
    for (let x = 0; x < columns; x += 3) {
      const point = points[x];
      ctx.beginPath(); ctx.arc(point.x * frame.width, point.y * frame.height - 5, 2, 0, Math.PI * 2); ctx.fill();
    }
  }} />;
}
