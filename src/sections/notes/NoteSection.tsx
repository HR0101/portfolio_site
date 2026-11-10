import type { ReactNode } from 'react';
import styles from './notes.module.css';

export const NOTE_SECTIONS = [
  { id: 'problem', title: '課題' },
  { id: 'constraints', title: '制約' },
  { id: 'decision', title: '判断' },
  { id: 'figure', title: '図を試す' },
  { id: 'verified', title: '確かめたこと' },
  { id: 'related', title: '関連' },
  { id: 'sources', title: '根拠' },
] as const;

export function NoteSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className={styles.noteSection} aria-labelledby={`${id}-heading`} data-note-section>
      <h2 id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  );
}
