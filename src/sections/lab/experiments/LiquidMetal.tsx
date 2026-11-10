'use client';
import { useRef } from 'react';
import { metalBrightness } from '@/lib/lab/fields';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './LiquidMetal.module.css';
const LIMITS = { stripes: 90, maskWidth: 640, maskHeight: 480, maxDpr: 1.5, maxFps: 30 };
export function LiquidMetal({ compact }: ExperimentProps) {
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  return <ExperimentFrame id="liquid-metal" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    // 文字だけの透明マスクを再利用し，ピクセル数にも上限を設けます．
    if (!maskRef.current) maskRef.current = document.createElement('canvas');
    const mask = maskRef.current;
    const scale = Math.min(1, LIMITS.maskWidth / frame.width, LIMITS.maskHeight / frame.height);
    const width = Math.max(1, Math.round(frame.width * scale));
    const height = Math.max(1, Math.round(frame.height * scale));
    if (mask.width !== width || mask.height !== height) { mask.width = width; mask.height = height; }
    const metal = mask.getContext('2d');
    if (!metal) return;
    metal.globalAlpha = 1;
    metal.globalCompositeOperation = 'source-over';
    metal.clearRect(0, 0, width, height);
    metal.font = `600 ${Math.min(width * 0.48, height * 0.7)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    metal.textAlign = 'center'; metal.textBaseline = 'middle';
    metal.fillStyle = input.ink; metal.fillText('RH', width / 2, height * 0.53);
    metal.globalCompositeOperation = 'source-atop';
    const step = width / LIMITS.stripes;
    for (let index = 0; index < LIMITS.stripes; index += 1) {
      metal.globalAlpha = metalBrightness(index, frame.timeMs, input.active ? input.x : 0, input.action % 2 === 1);
      metal.fillStyle = input.surface;
      metal.fillRect(index * step, 0, step + 1, height);
    }
    ctx.drawImage(mask, 0, 0, frame.width, frame.height);
  }} />;
}
