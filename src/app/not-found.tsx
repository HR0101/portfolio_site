import Link from 'next/link';
import { Home, Compass } from 'lucide-react';

export const metadata = {
  title: 'ページが見つかりません',
};

// 存在しない URL を開いたときに表示するページ
export default function NotFound() {
  return (
    <section className="min-h-[70vh] flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-widest text-sky-700 dark:text-sky-400 uppercase">
          404 Not Found
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
          ページが見つかりません
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          お探しのページは移動または削除された可能性があります．
          トップページから，公開しているアプリをご覧ください．
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-sky-700 to-violet-700 shadow-soft hover:shadow-soft-lg transition-all duration-300"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            トップへ戻る
          </Link>
          <Link
            href="/#projects"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border border-soft dark:border-night-border text-slate-700 dark:text-slate-200 hover:border-sky-500 hover:text-sky-700 dark:hover:text-sky-400 transition-colors duration-300"
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            アプリ一覧を見る
          </Link>
        </div>
      </div>
    </section>
  );
}
