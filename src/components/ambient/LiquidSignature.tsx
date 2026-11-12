"use client";

// Contact 直前の署名です．例：<LiquidSignature height={160} />（120〜200px，既定160）．
// RH の輪郭は固定し，文字の内側だけに金属の縞を流します．既存ロゴ／ファビコンは変更しません．
// マウスの位置で縞の向きを少し変えます．paused：統合側からの停止，testId：識別用です．
import { useRef } from 'react';
import { bounded, bufferSize, metalStripe } from '../../lib/ambient/fields';
import { createAmbientBuffer, useAmbientCanvas, type AmbientDecorationProps } from './useAmbientCanvas';
import styles from './LiquidSignature.module.css';

export interface LiquidSignatureProps extends AmbientDecorationProps { height?: number }
const BUFFER_EDGE = 480;
const STRIPE_COUNT = 20;
const STRIPE_STEPS = 32;
const MONOGRAM = 'RH';
const MONOGRAM_HEIGHT_RATIO = 0.88;
const MONOGRAM_WIDTH_RATIO = 0.9;

export function LiquidSignature({ height = 160, className = '', testId = 'liquid-signature', paused }: LiquidSignatureProps) {
  const buffer = useRef<ReturnType<typeof createAmbientBuffer>>(null);
  const mask = useRef<ReturnType<typeof createAmbientBuffer>>(null);
  const maskKey = useRef('');
  const { canvasRef } = useAmbientCanvas((context, frame, theme, pointer) => {
    buffer.current ??= createAmbientBuffer();
    mask.current ??= createAmbientBuffer();
    const surface = buffer.current;
    const stencil = mask.current;
    if (!surface || !stencil) return;
    const size = bufferSize(frame.width, frame.height, BUFFER_EDGE);
    const key = `${size.width}:${size.height}:${theme.fontFamily}`;
    if (maskKey.current !== key) {
      surface.canvas.width = stencil.canvas.width = size.width;
      surface.canvas.height = stencil.canvas.height = size.height;
      const fontSize = size.height * MONOGRAM_HEIGHT_RATIO;
      stencil.context.font = `600 ${fontSize}px ${theme.fontFamily}`;
      const measuredWidth = stencil.context.measureText(MONOGRAM).width;
      const fit = Math.min(1, size.width * MONOGRAM_WIDTH_RATIO / Math.max(1, measuredWidth));
      stencil.context.font = `600 ${fontSize * fit}px ${theme.fontFamily}`;
      stencil.context.textAlign = 'center';
      stencil.context.textBaseline = 'middle';
      stencil.context.fillStyle = '#fff';
      stencil.context.fillText(MONOGRAM, size.width / 2, size.height / 2);
      maskKey.current = key;
    }
    const paint = surface.context;
    paint.clearRect(0, 0, size.width, size.height);
    paint.fillStyle = theme.ink;
    paint.fillRect(0, 0, size.width, size.height);
    // 各帯の縁をグラデーションにし，平らな縞ではなく細い反射にします．
    for (let index = -4; index < STRIPE_COUNT; index += 1) {
      paint.beginPath();
      for (let step = 0; step <= STRIPE_STEPS; step += 1) {
        const x = step / STRIPE_STEPS;
        const y = metalStripe(x, index, frame.timeMs, pointer);
        if (step === 0) paint.moveTo(x * size.width, y * size.height);
        else paint.lineTo(x * size.width, y * size.height);
      }
      const center = metalStripe(0.5, index, frame.timeMs, pointer) * size.height;
      const halfWidth = size.height * 0.04;
      const reflection = paint.createLinearGradient(0, center - halfWidth, 0, center + halfWidth);
      reflection.addColorStop(0, theme.ink);
      reflection.addColorStop(0.42, theme.surface);
      reflection.addColorStop(0.56, theme.ink);
      reflection.addColorStop(1, theme.ink);
      paint.strokeStyle = reflection;
      paint.lineWidth = halfWidth * 2;
      paint.stroke();
    }
    paint.globalCompositeOperation = 'destination-in';
    paint.drawImage(stencil.canvas, 0, 0);
    paint.globalCompositeOperation = 'source-over';
    context.drawImage(surface.canvas, 0, 0, frame.width, frame.height);
  }, { paused, pointer: true });

  return <div aria-hidden="true" data-testid={testId} className={`${styles.signature} ${className}`} style={{ height: bounded(height, 120, 200) }}>
    <canvas ref={canvasRef} className={styles.canvas} />
  </div>;
}
