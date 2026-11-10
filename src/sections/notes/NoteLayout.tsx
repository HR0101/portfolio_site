import Link from 'next/link';
import type { ReactNode } from 'react';
import { NOTES, NOTES_PATH, NOTES_REPOSITORY, type Note } from '../../data/notes';
import { getNoteReadingLinks } from '../../lib/notes/catalog';
import { NoteSection } from './NoteSection';
import { NoteToc } from './NoteToc';
import styles from './notes.module.css';

export function NoteLayout({ note, children }: { note: Note; children: ReactNode }) {
  const { previous, next } = getNoteReadingLinks(NOTES, note.slug);
  return (
    <div className={styles.page} data-testid={`note-${note.slug}`}>
      <nav className={styles.breadcrumbs} aria-label="制作ノートのパンくず"><Link href={`${NOTES_PATH}/`}>← 制作ノート</Link><Link href="/#profile">ホームへ戻る</Link></nav>
      <header className={styles.articleHead}>
        <p className={styles.kicker}>{note.product} / 制作ノート</p>
        <h1>{note.title}</h1>
        <p className={styles.lead}>{note.summary}</p>
        <div className={styles.articleMeta}><span>読了の目安 {note.readingMinutes}分</span><span>元資料の初出 <time dateTime={note.date}>{note.date}</time></span></div>
        <ul className={styles.tags} aria-label="記事のテーマ">{note.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
        <p className={styles.dateNote}>日付は元資料の追加日です．Git の履歴で確認しました．<br /><code>{note.dateSource}</code></p>
      </header>
      <div className={styles.articleGrid}>
        <NoteToc />
        <article className={styles.articleBody} aria-label={note.title}>
          {children}
          <NoteSection id="related" title="関連">
            <p>図で試した判断を，作品全体の画面や公開ソースとつなげて読めます．</p>
            <div className={styles.relatedLinks}>
              <Link className="press-effect" href={note.productHref}>{note.product === 'このサイト' ? 'このサイトを見る' : `${note.product}の作品ページへ`} <span aria-hidden="true">→</span></Link>
              <a href={note.repository}>公開リポジトリを見る <span aria-hidden="true">↗</span></a>
            </div>
          </NoteSection>
          <NoteSection id="sources" title="根拠">
            <p className={styles.sourceIntro}>本文は，このリポジトリにある次のコード・ページ・文書と照合しています．</p>
            <ul className={styles.sources}>{note.sources.map(source => <li key={source}><a href={`${NOTES_REPOSITORY}/blob/main/${source}`}><code>{source}</code></a></li>)}</ul>
          </NoteSection>
          <nav className={styles.readingLinks} aria-label="前後の制作ノート">
            {previous && <Link href={`${NOTES_PATH}/${previous.note.slug}/`}><span>前のノート</span><strong>{previous.note.title}</strong><small>{previous.reason}</small></Link>}
            {next && <Link href={`${NOTES_PATH}/${next.note.slug}/`}><span>次のノート <span aria-hidden="true">→</span></span><strong>{next.note.title}</strong><small>{next.reason}</small></Link>}
          </nav>
          <div className={styles.bottomLinks}><Link href={`${NOTES_PATH}/`}>制作ノートをすべて読む</Link><Link href={note.productHref}>{note.product === 'このサイト' ? 'ホームへ' : `${note.product}へ`} →</Link></div>
        </article>
      </div>
    </div>
  );
}
