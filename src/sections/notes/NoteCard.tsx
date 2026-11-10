import Link from 'next/link';
import { NOTES_PATH, type Note } from '../../data/notes';
import styles from './notes.module.css';

function NoteMark({ figure }: { figure: Note['figure'] }) {
  return (
    <svg className={styles.cardMark} viewBox="0 0 240 96" fill="none" aria-hidden="true">
      {figure === 'planet' ? <>
        <path d="M16 48H224" stroke="currentColor" strokeOpacity=".2" />
        <circle cx="64" cy="48" r="26" fill="currentColor" />
        <path d="M46 40H80M42 48H84M48 56H80" stroke="var(--site-surface-soft)" strokeWidth="3" strokeDasharray="1 5" strokeLinecap="round" />
        <path d="M116 32V64M124 48H148M148 32V64M164 32V64M164 32H184M184 32V48H164M164 48L188 64" stroke="currentColor" strokeWidth="2" />
      </> : figure === 'operating-day' ? <>
        <circle cx="120" cy="48" r="32" stroke="currentColor" strokeWidth="1.5" />
        <path d="M120 24V48L142 60M64 48H24M216 48H176" stroke="currentColor" strokeWidth="2" />
      </> : figure === 'fairness' ? <>
        <path d="M24 28H138M24 48H194M24 68H162" stroke="currentColor" strokeWidth="8" />
        <path d="M138 16H194M138 12V20M194 12V20" stroke="currentColor" />
      </> : <>
        <rect x="20" y="28" width="48" height="40" rx="8" stroke="currentColor" />
        <rect x="96" y="28" width="48" height="40" rx="8" stroke="currentColor" />
        <rect x="172" y="28" width="48" height="40" rx="8" stroke="currentColor" />
        <path d="M74 48H90m-6-5 6 5-6 5M150 48H166m-6-5 6 5-6 5" stroke="currentColor" />
      </>}
    </svg>
  );
}

export function NoteCard({ note, featured = false }: { note: Note; featured?: boolean }) {
  return (
    <article className={styles.card} data-featured={featured} data-note-card={note.slug}>
      <Link className={styles.cardLink} href={`${NOTES_PATH}/${note.slug}/`}>
        <div className={styles.cardTop}><span>{note.product}</span><span>{note.readingMinutes}分で読む <span aria-hidden="true">↗</span></span></div>
        <NoteMark figure={note.figure} />
        <h2>{note.title}</h2>
        <p>{note.summary}</p>
        <ul className={styles.tags} aria-label="記事のテーマ">{note.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
        <span className={styles.cardDate}>元資料の初出 <time dateTime={note.date}>{note.date}</time></span>
      </Link>
    </article>
  );
}
