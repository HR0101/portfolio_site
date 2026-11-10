import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Laptop, Smartphone } from 'lucide-react';
import { GitHubIcon } from '../../../components/icons/GitHubIcon';
import { HoverShuffle } from '../../../components/HoverShuffle';
import { RollTitle } from '../../../components/animations/RollTitle';
import { ScrollBend } from '../../../components/animations/ScrollBend';
import { CornerMarks } from '../../../components/animations/CornerMarks';
import { CardEntrance } from './CardEntrance';
import { FEATURES } from '../../../config/features';
import { siteConfig } from '../../../config/site';
import { PUBLIC_REPOSITORY_NAMES } from '../../../data/publicRepos';
import { getAppMeta } from '../../../lib/appMeta';
import {
  buildRepositoryUrl,
  OTHER_APPS,
  OTHER_APPS_PATH,
  PLATFORM_LABELS,
  SWIFT_APPS,
  WALL_APPS,
  type AppPlatform,
  type SwiftApp,
} from '../../../data/apps';
import styles from './others.module.css';

const title = 'その他のアプリ';
const description = `トップのアプリ紹介に載せていない${OTHER_APPS.length}本のアプリを紹介します．Swift / SwiftUI で個人開発した iPhone・Mac アプリで，ソースコードはすべて GitHub で公開しています．`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: OTHER_APPS_PATH },
  openGraph: { title, description, url: OTHER_APPS_PATH, type: 'website' },
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

// 対応 OS のチップ
function PlatformChip({ platform }: { platform: AppPlatform }) {
  const showsPhone = platform === 'ios' || platform === 'both';
  const showsMac = platform === 'macos' || platform === 'both';
  return (
    <span className={styles.chip}>
      {showsPhone && <Smartphone size={13} aria-hidden="true" />}
      {showsMac && <Laptop size={13} aria-hidden="true" />}
      {PLATFORM_LABELS[platform]}
    </span>
  );
}

// アプリ 1 本分のタイル．大きな角丸の画面（アイコンの素材がないので，アプリごとのグラデーションに線画のアイコンを重ねる）を上に，
// 文字は画面に重ねず下に置く．小さな分類の行 → 大きな題名 → 説明の順．
// ホバー（とキーボードのフォーカス）で，題名の文字が回って入れ替わり，画面の中身だけが枠の中でゆっくり寄る．
function OtherAppCard({ app, index }: { app: SwiftApp; index: number }) {
  const meta = getAppMeta(app, PUBLIC_REPOSITORY_NAMES);
  const Icon = app.icon;
  const headingId = `other-app-${index}`;
  // 画面を押したときの行き先は，いちばん上の GitHub リポジトリ（下のリンクの行と同じ）
  const primaryUrl = buildRepositoryUrl(siteConfig.githubUsername, app.repositories[0].name);
  return (
    <article className={styles.tile} aria-labelledby={headingId} data-app-card={app.name} data-roll-host data-corner-host={FEATURES.cornerMarks ? '' : undefined}>
      {/* 見出しの元の文字列は，読み上げ・検索のために置く．見た目の題名は，下の RollTitle（aria-hidden） */}
      <h2 id={headingId} className={`sr-only ${styles.heading}`}>{app.name}</h2>
      <ScrollBend>
        {/* 画面の四隅と辺の「＋」の印は，数が多い（11 枚）ので常には出さず，タイルをホバー（とフォーカス）したときだけ，その 1 枚に出す */}
        <CornerMarks trigger="host">
          {/* 同じリンクが下のリンクの行にもあるので，この画面はキーボードと読み上げの順から外す（マウスの押下のみ）．
              data-motion-work：マウスのとき，カーソルが丸い「VIEW」の札になる（CursorRing） */}
          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={-1}
            aria-hidden="true"
            data-motion-work
            className={styles.screen}
          >
            <span className={styles.screenMedia}>
              <span className={`${styles.face} bg-linear-to-br ${app.gradient}`} />
              <Icon className={styles.screenIcon} aria-hidden="true" />
            </span>
            <span className={styles.index}>{pad(index + 1)}</span>
            <span className={styles.arrow}>
              <ArrowUpRight size={18} />
            </span>
          </a>
        </CornerMarks>
      </ScrollBend>
      <div className={styles.caption}>
        <div className={styles.meta} data-testid="app-meta" role="group" aria-label="作品メタ情報">
          <PlatformChip platform={app.platform} />
          <span className={styles.chip}>{meta.year}</span>
          <span className={styles.chip}>{meta.role}</span>
          {meta.sourceStatus && <span className={styles.chip}>{meta.sourceStatus}</span>}
        </div>
        <RollTitle text={app.name} visualOnly className={styles.title} />
        <p className={styles.tagline}>{app.tagline}</p>
        <p className={styles.desc}>{app.description}</p>
        <ul className={styles.tags} aria-label="使用技術">
          {app.tags.map(tag => (
            <li key={tag}>{/^[\x20-\x7e]+$/.test(tag) ? <HoverShuffle text={tag} /> : tag}</li>
          ))}
        </ul>
        <div className={styles.links}>
          {app.repositories.map(repository => (
            <a
              key={repository.name}
              href={buildRepositoryUrl(siteConfig.githubUsername, repository.name)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${repository.name}${repository.role ? `（${repository.role}）` : ''}を新しいタブで開く`}
              className={styles.link}
            >
              <GitHubIcon className={styles.linkIcon} />
              <span className="line-sweep">{repository.name}</span>
              {repository.role && <span className={styles.linkRole}>（{repository.role}）</span>}
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

// トップの Apps セクションに載せていない（アイコンの素材がない）アプリを，まとめて紹介するページ
export default function OtherAppsPage() {
  return (
    <div className={styles.page} lang="ja">
      <Link href="/#projects" className={styles.back}>
        <ArrowLeft size={15} aria-hidden="true" /> トップのアプリへ戻る
      </Link>
      <header className={styles.header}>
        <p className={styles.eyebrow} lang="en">More Apps</p>
        <h1>その他のアプリ</h1>
        <p className={styles.lead}>
          トップで紹介している主な{WALL_APPS.length}本のほかに，つくったアプリが{OTHER_APPS.length}本あります．
          アイコンはこれから整えるところですが，どれも自分が使いたくて始めたもので，ソースコードはすべて GitHub で公開しています．
          全部で{SWIFT_APPS.length}プロダクトです．
        </p>
      </header>

      <div className={styles.grid} data-testid="other-apps">
        {OTHER_APPS.map((app, index) => (
          <CardEntrance key={app.name} index={index}>
            <OtherAppCard app={app} index={index} />
          </CardEntrance>
        ))}
      </div>

      <footer className={styles.footer}>
        <Link href="/#projects">トップのアプリ紹介へ戻る</Link>
        <a href={`${siteConfig.githubUrl}?tab=repositories`} target="_blank" rel="noopener noreferrer">
          GitHub のリポジトリ一覧 <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
