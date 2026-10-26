import type { ReactNode } from 'react';
import Link from 'next/link';
import { siteConfig } from '../../../config/site';
import styles from './legal.module.css';

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.page} lang="ja">
      <div className={styles.container}>
        <Link className={styles.back} href="/apps/bustimeapp/">← BusTimeApp</Link>
        <header className={styles.header}>
          <p className={styles.eyebrow}>BusTimeApp · Legal</p>
          <h1>{title}</h1>
          <p>制定日・最終更新日：<time dateTime="2026-10-15">2026年10月15日</time></p>
        </header>
        <nav className={styles.nav} aria-label="規約・ポリシー">
          <Link href="/apps/bustimeapp/privacy/" aria-current={title === 'プライバシーポリシー' ? 'page' : undefined}>プライバシーポリシー</Link>
          <Link href="/apps/bustimeapp/terms/" aria-current={title === '利用規約' ? 'page' : undefined}>利用規約</Link>
        </nav>
        <article className={styles.article}>{children}</article>
        <footer className={styles.footer}>
          <p>運営者：{siteConfig.displayName}（HR0101）</p>
          <p>お問い合わせ：<a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></p>
          <Link href="/">ポートフォリオへ戻る</Link>
        </footer>
      </div>
    </div>
  );
}
