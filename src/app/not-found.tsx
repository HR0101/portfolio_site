import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Home, Compass } from 'lucide-react';
import { TypingTerminal, type TerminalLine } from '../components/TypingTerminal';

export const metadata = {
  title: 'ページが見つかりません',
};

// 数字のリールに並べる，止まるまでに通過する数字（最後が止まる数字）
const CODE_REELS = [
  [7, 2, 9, 5, 1, 8, 3, 6, 4],
  [3, 8, 1, 6, 9, 2, 7, 5, 4, 1, 0],
  [5, 9, 2, 7, 1, 6, 8, 3, 0, 2, 7, 4],
];

// 存在しないページを開こうとして失敗し，サイトの中身を確かめ直すやりとり（zsh の実際の出力にそろえる）
const TERMINAL_LINES: TerminalLine[] = [
  {
    command: 'cd ./this-page',
    output: ['cd: no such file or directory: ./this-page'],
  },
  {
    command: 'ls ~/HR0101',
    output: ['about    apps     contact  github   skills   works'],
  },
];

// 存在しない URL を開いたときに表示するページ
export default function NotFound() {
  return (
    <section className="not-found min-h-[78vh] flex items-center justify-center px-6 pt-32 pb-24">
      <div className="max-w-xl w-full text-center">
        {/* 404 の各桁がスロットのリールのように回って止まる */}
        <p className="not-found-code" aria-hidden="true">
          {CODE_REELS.map((reel, reelIndex) => (
            <span
              key={reelIndex}
              className="not-found-reel"
              style={{ '--reel-length': reel.length, '--reel-index': reelIndex } as CSSProperties}
            >
              <span className="not-found-reel-track">
                {reel.map((digit, digitIndex) => (
                  <span key={digitIndex}>{digit}</span>
                ))}
              </span>
            </span>
          ))}
          {/* 迷子を探して針が揺れる方位磁針 */}
          <span className="not-found-compass">
            <Compass strokeWidth={1.5} />
          </span>
        </p>
        <p className="hero-enter text-sm font-semibold tracking-widest text-subtle dark:text-night-subtle uppercase" style={{ animationDelay: '0.5s' }}>
          404 Not Found
        </p>
        <h1 className="hero-enter mt-4 text-3xl md:text-4xl font-semibold tracking-tight" style={{ animationDelay: '0.6s' }}>
          ページが見つかりません
        </h1>
        <p className="hero-enter mt-4 text-subtle dark:text-night-subtle leading-relaxed" style={{ animationDelay: '0.7s' }}>
          お探しのページは移動または削除された可能性があります．
          トップページから，公開しているアプリをご覧ください．
        </p>
        <div className="hero-enter mt-8 text-left" style={{ animationDelay: '0.8s' }}>
          <TypingTerminal
            lines={TERMINAL_LINES}
            prompt="~/HR0101 %"
            accessibleText="ターミナルで存在しないページへ移動しようとして失敗し，サイトにある項目を一覧する様子の演出です．"
            className="not-found-terminal"
          />
        </div>
        <div className="hero-enter mt-8 flex flex-col sm:flex-row items-center justify-center gap-3" style={{ animationDelay: '0.9s' }}>
          <Link
            href="/"
            className="press-effect inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-accent-strong shadow-soft hover:shadow-soft-lg transition-all duration-300"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            トップへ戻る
          </Link>
          <Link
            href="/#projects"
            className="press-effect inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border border-soft dark:border-night-border text-ink dark:text-night-ink hover:border-ink dark:hover:border-night-ink hover:text-ink dark:hover:text-night-ink transition-colors duration-300"
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            アプリ一覧を見る
          </Link>
        </div>
      </div>
    </section>
  );
}
