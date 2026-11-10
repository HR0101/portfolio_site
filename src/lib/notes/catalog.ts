interface NoteReference {
  slug: string;
  date: string;
  product?: string;
  tags: readonly string[];
}

// 同日の記事は元の編集順を保ちます．呼び出し元の配列は変更しません．
export function sortNotes<T extends NoteReference>(notes: readonly T[]): T[] {
  return [...notes].sort((a, b) => b.date.localeCompare(a.date));
}

export function getNoteRelationship(a: NoteReference, b: NoteReference) {
  if (a.product && a.product === b.product) return `同じ作品：${a.product}`;
  const sharedTags = a.tags.filter(tag => b.tags.includes(tag));
  return sharedTags.length ? `同じテーマ：${sharedTags.join('・')}` : '別の判断も読む';
}

export function getNoteReadingLinks<T extends NoteReference>(notes: readonly T[], slug: string) {
  const ordered = sortNotes(notes);
  const index = ordered.findIndex(note => note.slug === slug);
  if (index < 0) return { previous: undefined, next: undefined };
  const current = ordered[index];
  const previous = ordered[index - 1];
  const candidates = ordered.filter(note => note.slug !== slug && note.slug !== previous?.slug);
  const sameProductWeight = 100;
  const score = (note: T) => (current.product && current.product === note.product ? sameProductWeight : 0)
    + current.tags.filter(tag => note.tags.includes(tag)).length;
  const next = candidates.sort((a, b) => score(b) - score(a))[0];
  return {
    previous: previous ? { note: previous, reason: getNoteRelationship(current, previous) } : undefined,
    next: next ? { note: next, reason: getNoteRelationship(current, next) } : undefined,
  };
}
