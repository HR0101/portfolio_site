'use client';

import { useState } from 'react';
import { NOTES } from '../../data/notes';
import { sortNotes } from '../../lib/notes/catalog';
import { NoteCard } from './NoteCard';
import styles from './notes.module.css';

const ALL_TAG = 'すべて';
const ORDERED_NOTES = sortNotes(NOTES);
const TAGS = [...new Set(ORDERED_NOTES.flatMap(note => note.tags))];

export function NotesIndex() {
  const [tag, setTag] = useState(ALL_TAG);
  const notes = tag === ALL_TAG ? ORDERED_NOTES : ORDERED_NOTES.filter(note => note.tags.includes(tag));
  return (
    <>
      <div className={styles.filters} role="group" aria-label="制作ノートをタグで絞り込む">
        {[ALL_TAG, ...TAGS].map(item => <button className="press-effect" type="button" key={item} aria-pressed={tag === item} onClick={() => setTag(item)}>{item}</button>)}
      </div>
      <p className={styles.filterStatus} role="status">{tag === ALL_TAG ? 'すべてのノート' : `「${tag}」のノート`}・{notes.length}件</p>
      <div className={styles.cards}>{notes.map((note, index) => <NoteCard key={note.slug} note={note} featured={index === 0} />)}</div>
    </>
  );
}
