import type { Metadata } from 'next';
import Link from 'next/link';
import { NOTES_PATH } from '../../data/notes';
import { NotesIndex } from '../../sections/notes/NotesIndex';
import styles from '../../sections/notes/notes.module.css';

const title = '制作ノート';
const description = '1 つの判断を，1 つの記事にしています．図は触れます．';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${NOTES_PATH}/` },
  openGraph: { title, description, url: `${NOTES_PATH}/`, type: 'website' },
};

export default function NotesPage() {
  return (
    <div className={styles.page} data-testid="notes-page">
      <Link className={styles.backLink} href="/#profile">← ホームへ戻る</Link>
      <header className={styles.indexHead}>
        <p className={styles.kicker}>つくる途中の，具体的な判断</p>
        <h1>制作ノート</h1>
        <p className={styles.lead}>{description}</p>
        <p className={styles.indexIntro}>運行日を切り替える境界，データを置く場所，画面の裏の流れ．作品のコードや紹介ページで確かめたことを，小さな図と一緒に読み解きます．</p>
      </header>
      <NotesIndex />
    </div>
  );
}
