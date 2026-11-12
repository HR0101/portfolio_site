import Link from 'next/link';
import { NOTES, NOTES_PATH } from '../data/notes';
import { sortNotes } from '../lib/notes/catalog';
import { NoteCard } from './notes/NoteCard';
import styles from './notes/notes.module.css';

const TEASER_COUNT = 3;

export function NotesTeaser() {
  const notes = sortNotes(NOTES).slice(0, TEASER_COUNT);
  return (
    <section id="notes" className={styles.teaser} aria-labelledby="notes-teaser-heading" data-testid="notes-teaser">
      <div className={styles.teaserHead}>
        <div><p className={styles.kicker}>作品の，もう一歩奥へ</p><h2 id="notes-teaser-heading">制作ノート</h2><p>1 つの判断を，1 つの記事にしています．図は触れます．</p></div>
        <Link href={`${NOTES_PATH}/`}>制作ノートをすべて読む <span aria-hidden="true">→</span></Link>
      </div>
      <div className={styles.teaserCards}>{notes.map(note => <NoteCard key={note.slug} note={note} />)}</div>
    </section>
  );
}
