"use client";

// 見出しの横に添える章番号と点の記号です．例：<SectionOrnament section="skills" />．
// section：about／skills／apps／works／github／profile／contact．chapter：番号の上書き（任意）．
// paused：統合側からの停止，testId：既定は section-ornament-{section} です．
// GitHub の草は固定の装飾で，実際の活動数を示しません．番号を含め全体が読み上げ対象外です．
import { useMemo } from 'react';
import { ORNAMENT_CHAPTERS, ornamentOffset, ornamentPoints, type OrnamentSection } from '../../lib/ambient/ornaments';
import { useAmbientCanvas, type AmbientDecorationProps } from './useAmbientCanvas';
import styles from './SectionOrnament.module.css';

export interface SectionOrnamentProps extends AmbientDecorationProps {
  section: OrnamentSection;
  chapter?: string;
}
const DOT_RADIUS = 1.1;
const TAU = Math.PI * 2;

export function SectionOrnament({ section, chapter, className = '', testId = `section-ornament-${section}`, paused }: SectionOrnamentProps) {
  const points = useMemo(() => ornamentPoints(section), [section]);
  const { canvasRef } = useAmbientCanvas((context, frame, theme, pointer) => {
    context.fillStyle = theme.ink;
    for (const dot of points) {
      const offset = ornamentOffset(dot.x, dot.y, pointer.x, pointer.y, pointer.strength);
      context.globalAlpha = dot.opacity;
      context.beginPath();
      context.arc((dot.x + offset.x) * frame.width, (dot.y + offset.y) * frame.height, DOT_RADIUS, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
  }, { paused, pointer: true });

  return <span aria-hidden="true" data-testid={testId} data-section={section} className={`${styles.ornament} ${className}`}>
    <span className={styles.chapter}>{chapter ?? ORNAMENT_CHAPTERS[section]}</span>
    <canvas ref={canvasRef} className={styles.canvas} />
  </span>;
}
