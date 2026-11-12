"use client";

// セクションの背景です．親に position:relative; isolation:isolate を指定し，本文を position:relative にします．
// 例：<AmbientMesh palette="blue" intensity={0.18} />．palette：mono／blue／violet／warm．
// intensity：0〜0.35（既定0.2），paused：統合側からの停止，testId：複数配置の識別用です．
import { useRef } from 'react';
import { AMBIENT_MAX_OPACITY, bounded, bufferSize, meshOrbit } from '../../lib/ambient/fields';
import { createAmbientBuffer, useAmbientCanvas, type AmbientDecorationProps } from './useAmbientCanvas';
import styles from './AmbientMesh.module.css';

export interface AmbientMeshProps extends AmbientDecorationProps {
  palette?: 'mono' | 'blue' | 'violet' | 'warm';
  intensity?: number;
}
const BLOB_COUNT = 4;

export function AmbientMesh({ palette = 'mono', intensity = 0.2, className = '', testId = 'ambient-mesh', paused }: AmbientMeshProps) {
  const buffer = useRef<ReturnType<typeof createAmbientBuffer>>(null);
  const { canvasRef } = useAmbientCanvas((context, frame, theme) => {
    buffer.current ??= createAmbientBuffer();
    const surface = buffer.current;
    if (!surface) return;
    const size = bufferSize(frame.width, frame.height);
    if (surface.canvas.width !== size.width || surface.canvas.height !== size.height) {
      surface.canvas.width = size.width;
      surface.canvas.height = size.height;
    }
    const paint = surface.context;
    paint.clearRect(0, 0, size.width, size.height);
    for (let index = 0; index < BLOB_COUNT; index += 1) {
      const orbit = meshOrbit(index, frame.timeMs);
      const x = orbit.x * size.width;
      const y = orbit.y * size.height;
      const radius = Math.max(size.width, size.height) * orbit.radius;
      const gradient = paint.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, index < 2 ? theme.colors[index] : theme.ink);
      gradient.addColorStop(1, 'transparent');
      paint.globalAlpha = index < 2 ? 0.7 : 0.22;
      paint.fillStyle = gradient;
      paint.fillRect(0, 0, size.width, size.height);
    }
    paint.globalAlpha = 1;
    context.imageSmoothingEnabled = true;
    context.drawImage(surface.canvas, 0, 0, frame.width, frame.height);
  }, { paused, themeKey: palette });

  return <canvas ref={canvasRef} aria-hidden="true" data-testid={testId} data-palette={palette} className={`${styles.mesh} ${styles[palette]} ${className}`} style={{ opacity: bounded(intensity, 0, AMBIENT_MAX_OPACITY) }} />;
}
