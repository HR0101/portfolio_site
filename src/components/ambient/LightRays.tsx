"use client";

// Profile／Contact の見出しの背景です．親を position:relative; isolation:isolate にします．
// 例：<LightRays origin="left" count={6} />．origin：left／center／right または { x, y }（面の割合）．
// count：1〜12（既定6），paused：統合側からの停止，testId：複数配置の識別用です．
// 低コントラストの装飾であり，実際の照明や実測の再現ではありません．
import { useRef } from 'react';
import { bufferSize, rayCount, rayGeometry, type AmbientPoint } from '../../lib/ambient/fields';
import { createAmbientBuffer, useAmbientCanvas, type AmbientDecorationProps } from './useAmbientCanvas';
import styles from './LightRays.module.css';

export type LightOrigin = 'left' | 'center' | 'right' | AmbientPoint;
export interface LightRaysProps extends AmbientDecorationProps { origin?: LightOrigin; count?: number }
const ORIGINS = { left: { x: 0.15, y: -0.1 }, center: { x: 0.5, y: -0.1 }, right: { x: 0.85, y: -0.1 } };
const BUFFER_EDGE = 480;

export function LightRays({ origin = 'center', count = 6, className = '', testId = 'light-rays', paused }: LightRaysProps) {
  const buffer = useRef<ReturnType<typeof createAmbientBuffer>>(null);
  const source = typeof origin === 'string' ? ORIGINS[origin] : origin;
  const { canvasRef } = useAmbientCanvas((context, frame, theme) => {
    buffer.current ??= createAmbientBuffer();
    const surface = buffer.current;
    if (!surface) return;
    const size = bufferSize(frame.width, frame.height, BUFFER_EDGE);
    if (surface.canvas.width !== size.width || surface.canvas.height !== size.height) {
      surface.canvas.width = size.width;
      surface.canvas.height = size.height;
    }
    const paint = surface.context;
    paint.clearRect(0, 0, size.width, size.height);
    const fade = paint.createLinearGradient(0, 0, 0, size.height);
    fade.addColorStop(0, theme.ink);
    fade.addColorStop(1, 'transparent');
    paint.fillStyle = fade;
    for (let index = 0; index < rayCount(count); index += 1) {
      const ray = rayGeometry(index, frame.timeMs, source);
      const topX = ray.topX * size.width;
      const topY = ray.topY * size.height;
      const bottomX = ray.bottomX * size.width;
      const width = ray.width * size.width;
      // 外側の薄い帯と内側の細い帯で，ぼかしフィルターを使わず柔らかくします．
      for (let layer = 3; layer >= 1; layer -= 1) {
        paint.globalAlpha = ray.opacity / (layer * 3);
        paint.beginPath();
        paint.moveTo(topX - width * 0.12, topY);
        paint.lineTo(bottomX - width * layer, size.height);
        paint.lineTo(bottomX + width * layer, size.height);
        paint.lineTo(topX + width * 0.12, topY);
        paint.closePath();
        paint.fill();
      }
    }
    paint.globalAlpha = 1;
    context.drawImage(surface.canvas, 0, 0, frame.width, frame.height);
  }, { paused });

  return <canvas ref={canvasRef} aria-hidden="true" data-testid={testId} className={`${styles.rays} ${className}`} />;
}
