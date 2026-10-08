"use client";

import { useEffect } from 'react';
import { RefreshCw, Home } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  // Next.js が渡す再試行用の関数
  reset: () => void;
}

// 想定外のエラーが起きたときに表示する画面．
// 真っ白な画面にせず，再試行の導線を残す．
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // 原因を追えるようにコンソールへ残す（本文には技術的詳細を出さない）
    console.error('画面の描画中にエラーが発生しました:', error);
  }, [error]);

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-widest text-subtle dark:text-night-subtle uppercase">
          Something went wrong
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
          問題が発生しました
        </h1>
        <p className="mt-4 text-subtle dark:text-night-subtle leading-relaxed">
          一時的な不具合の可能性があります．再読み込みをお試しください．
          解消しない場合は，お手数ですがメールでご連絡ください．
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="press-effect inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-accent-strong shadow-soft hover:shadow-soft-lg transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            もう一度読み込む
          </button>
          <a
            href="/"
            className="press-effect inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border border-soft dark:border-night-border text-ink dark:text-night-ink hover:border-ink dark:hover:border-night-ink hover:text-ink dark:hover:text-night-ink transition-colors duration-300"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            トップへ戻る
          </a>
        </div>
      </div>
    </section>
  );
}
