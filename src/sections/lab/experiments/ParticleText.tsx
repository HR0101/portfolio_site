'use client';
import { useRef } from 'react';
import { sampleTextMask, textCycle, morphTextPoint, MAX_TEXT_POINTS, type TextPoint } from '@/lib/lab/textPoints';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './ParticleText.module.css';
const LIMITS = { points: MAX_TEXT_POINTS, maskWidth: 480, maskHeight: 180, maxDpr: 1.5, maxFps: 30 };
const WORDS = ['Trust', '信頼', 'RH'] as const;
export function ParticleText({ compact }: ExperimentProps) {
  const masks = useRef<TextPoint[][] | null>(null);
  return <ExperimentFrame id="particle-text" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    if (!masks.current) {
      const mask = document.createElement('canvas');
      mask.width = LIMITS.maskWidth; mask.height = LIMITS.maskHeight;
      const brush = mask.getContext('2d', { willReadFrequently: true });
      if (!brush) return;
      masks.current = WORDS.map(word => {
        brush.clearRect(0, 0, mask.width, mask.height);
        brush.fillStyle = '#fff';
        brush.font = '600 110px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
        brush.textAlign = 'center'; brush.textBaseline = 'middle';
        brush.fillText(word, mask.width / 2, mask.height / 2, mask.width * 0.88);
        return sampleTextMask(brush.getImageData(0, 0, mask.width, mask.height).data, mask.width, mask.height, 4, LIMITS.points);
      });
    }
    const phase = textCycle(frame.timeMs);
    const from = masks.current[phase.from]; const to = masks.current[phase.to];
    if (!from.length || !to.length) return;
    const count = Math.max(from.length, to.length);
    for (let index = 0; index < count; index += 1) {
      const point = morphTextPoint(from[index % from.length], to[index % to.length], phase.mix, input.active ? input : null, index);
      ctx.beginPath(); ctx.arc(point.x * frame.width, point.y * frame.height, compact ? 1 : 1.65, 0, Math.PI * 2); ctx.fill();
    }
  }} />;
}
