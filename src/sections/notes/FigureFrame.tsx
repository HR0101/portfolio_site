import type { ReactNode } from 'react';
import styles from './figures.module.css';

export function FigureFrame({ id, title, caption, children }: {
  id: string;
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className={styles.figure} aria-labelledby={`${id}-title`} data-testid={`notes-figure-${id}`}>
      <div className={styles.head}>
        <span>触れる図</span>
        <h3 id={`${id}-title`}>{title}</h3>
        <p>ボタンや入力を操作すると切り替わります．自動では進みません．</p>
      </div>
      {children}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
