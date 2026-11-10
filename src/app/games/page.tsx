import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { SectionHeading } from '../../components/SectionHeading';
import { siteConfig } from '../../config/site';
import { GAME_WORKS, GAMES_PATH } from '../../data/works';
import { GamesGallery } from '../../sections/GamesGallery';

const title = 'ゲーム';
const description = `ブラウザで遊べるゲーム${GAME_WORKS.length}本を紹介します．ピッとマートと，ふしぎなどうぶつえん．インストールなしに，スマホからでも遊べます．`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: GAMES_PATH },
  openGraph: { title, description, url: GAMES_PATH, type: 'website' },
};

// ブラウザで遊べるゲームをまとめたページ（トップの Web サービスのセクションにあったものを，デザインはそのまま移した）
export default function GamesPage() {
  return (
    <div className="pt-28 md:pt-36 pb-20 md:pb-28" data-testid="games-page">
      <div className="max-w-6xl mx-auto px-6">
        <Link
          href="/#works"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-subtle dark:text-night-subtle hover:text-ink dark:hover:text-night-ink transition-colors"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Web サービスへ戻る
        </Link>
        <div className="mt-6">
          <SectionHeading
            label="Games"
            title="ブラウザで遊べるゲーム"
            description="アプリとは別に，ブラウザで遊べるゲームもつくっています．どちらもサブドメインで公開中で，インストールなしにスマホからでも遊べます．"
          />
        </div>
      </div>

      <GamesGallery />

      <div className="max-w-6xl mx-auto px-6 mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-soft dark:border-night-border pt-6 text-sm">
        <Link href="/#works" className="inline-flex min-h-11 items-center font-semibold text-ink dark:text-night-ink">
          トップの Web サービスへ戻る
        </Link>
        <a
          href={`${siteConfig.githubUrl}?tab=repositories`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-ink dark:text-night-ink"
        >
          GitHub のリポジトリ一覧 <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
