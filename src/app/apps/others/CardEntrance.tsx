"use client";

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { useInView } from '../../../hooks/useInView';
import { diagonalDelay } from '../../../lib/choreography';
import styles from './others.module.css';

// 登場は外側，ホバー・押下は内側のカードに分けて，互いの transform を保つ．
export function CardEntrance({ index, children }: { index: number; children: ReactNode }) {
  const { ref, isInView } = useInView<HTMLDivElement>();

  useEffect(() => {
    const node = ref.current;
    const grid = node?.parentElement;
    if (!node || !grid) return;
    const measure = () => {
      const columns = getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length;
      node.style.setProperty('--card-delay', `${diagonalDelay(index, columns)}ms`);
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(grid);
    return () => resize.disconnect();
  }, [index, ref]);

  return <div ref={ref} className={styles.cardEntrance} data-entered={isInView} style={{ '--card-delay': `${diagonalDelay(index, 1)}ms` } as CSSProperties}>{children}</div>;
}
