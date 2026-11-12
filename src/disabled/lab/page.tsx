import type { Metadata } from 'next';
import Link from 'next/link';
import { LAB_PATH } from '@/data/lab';
import { LabGallery } from '@/sections/lab/LabGallery';

const description = '製品とは別に，小さな実験を記録しています．点・粒子・物理・光を，画面内にあるあいだだけ動く展示で試せます．';
export const metadata: Metadata = {
  title: '実験室',
  description,
  alternates: { canonical: LAB_PATH },
  openGraph: { title: '実験室', description, url: LAB_PATH, type: 'website' },
};

export default function LabPage() {
  return (
    <div data-testid="lab-page" className="mx-auto max-w-7xl px-6 pb-24 pt-28 md:px-10 md:pt-36">
      <header className="mb-10 max-w-2xl">
        <Link href="/#profile" className="press-effect inline-flex min-h-11 items-center text-sm text-[var(--site-accent)]">← プロフィールへ戻る</Link>
        <h1 className="mb-5 mt-8 text-4xl font-semibold tracking-tight text-[var(--site-ink)] md:text-6xl">実験室</h1>
        <p className="text-base leading-8 text-[var(--site-muted)]">製品とは別に，小さな実験を記録しています．画面内にあるあいだだけ動きます．</p>
        <p className="mt-3 text-sm leading-7 text-[var(--site-muted)]">すべてこのサイトのために実装した試作です．面を触るか，フォーカスしてキーで遊べます．「一時停止」で止め，「動かす」で一歩ずつ確かめられます．</p>
      </header>
      <LabGallery />
      <Link href="/#profile" className="press-effect mt-12 inline-flex min-h-11 items-center text-sm text-[var(--site-accent)]">プロフィールへ戻る →</Link>
    </div>
  );
}
