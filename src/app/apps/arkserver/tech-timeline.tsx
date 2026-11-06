'use client';

import { useScrollLinked } from '../../../hooks/useScrollLinked';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import styles from './product.module.css';

export function TechTimeline({ items }: { items: string[][] }) {
  const { ref, progress } = useScrollLinked<HTMLDListElement>('fill');
  const reduced = usePrefersReducedMotion();
  const fill = reduced ? 1 : progress;
  return <dl ref={ref} className={`${styles.stackTable} ${styles.techTimeline}`}>
    <div className={styles.techLine} aria-hidden="true"><i style={{ transform: `scaleY(${fill})` }} /></div>
    {items.map(([area, technology, reason], index) => <div key={area} className={`${styles.stackRow} ${styles.techRow}`} data-lit={fill >= index / items.length}>
      <dt>{area}</dt><dd><b>{technology}</b><span>{reason}</span></dd>
    </div>)}
  </dl>;
}
