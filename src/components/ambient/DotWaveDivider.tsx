"use client";

// 章の境界に置く点の帯です．例：<DotWaveDivider seed="skills-apps" variant="swell" height={120} />
// seed：数値／文字列，height：80〜160px，tone：ink／accent，density：0.25〜2（既定1）．
// variant：swell／ripple／rain．paused：統合側からの停止，testId：複数配置の識別用です．
import { useMemo, useRef } from 'react';
import { bounded, createDotGrid, seedNumber, wavePoint, type AmbientSeed, type FieldDot, type WaveVariant } from '../../lib/ambient/fields';
import { useAmbientCanvas, type AmbientDecorationProps } from './useAmbientCanvas';
import styles from './DotWaveDivider.module.css';

export interface DotWaveDividerProps extends AmbientDecorationProps {
  seed?: AmbientSeed;
  height?: number;
  tone?: 'ink' | 'accent';
  density?: number;
  variant?: WaveVariant;
}

export function DotWaveDivider({ seed = 1, height = 120, tone = 'ink', density = 1, variant = 'swell', className = '', testId = 'dot-wave-divider', paused }: DotWaveDividerProps) {
  // 長い文字列 seed のハッシュを点ごと・フレームごとに計算し直しません．
  const numericSeed = useMemo(() => seedNumber(seed), [seed]);
  const grid = useRef<{ key: string; points: FieldDot[] }>({ key: '', points: [] });
  const { canvasRef } = useAmbientCanvas((context, frame, theme, pointer) => {
    const key = JSON.stringify([frame.width, frame.height, density, numericSeed]);
    if (grid.current.key !== key) grid.current = { key, points: createDotGrid(frame.width, frame.height, density, numericSeed) };
    context.fillStyle = tone === 'accent' ? theme.accent : theme.ink;
    for (const dot of grid.current.points) {
      const point = wavePoint(dot, frame.timeMs, variant, numericSeed, pointer);
      context.globalAlpha = point.opacity;
      context.beginPath();
      context.arc(point.x * frame.width, point.y * frame.height, point.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }, { paused, pointer: true });

  return <div aria-hidden="true" data-testid={testId} data-variant={variant} className={`${styles.band} ${className}`} style={{ height: bounded(height, 80, 160) }}>
    <canvas ref={canvasRef} className={styles.canvas} />
  </div>;
}
