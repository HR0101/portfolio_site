import { ArrowRight, ChevronDown } from 'lucide-react';
import { GitHubIcon } from '../components/icons/GitHubIcon';
import { siteConfig } from '../config/site';

// 登場アニメーションの遅延時間（ミリ秒）：上から順に段階表示する
const ENTER_DELAYS_MS = {
  badge: 0,
  title: 150,
  subtitle: 300,
  cta: 450,
};

export function Hero() {
  return (
    <section
      id="hero"
      data-testid="hero-section"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* 背景装飾：グリッドパターンと浮遊する光のオーブ */}
      <div className="absolute inset-0 bg-grid-pattern" aria-hidden="true" />
      <div
        className="absolute top-1/4 -left-32 w-96 h-96 bg-sky-500/20 dark:bg-sky-500/15 rounded-full blur-3xl animate-float-slow"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-500/20 dark:bg-indigo-500/15 rounded-full blur-3xl animate-float-slower"
        aria-hidden="true"
      />
      {/* グリッドを下端で自然にフェードアウトさせる */}
      <div
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-50 dark:from-night to-transparent"
        aria-hidden="true"
      />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* ステータスバッジ */}
        <p
          className="hero-enter inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-white/70 dark:bg-night-soft/70 border border-slate-200 dark:border-night-border text-slate-600 dark:text-slate-300 backdrop-blur-sm"
          style={{ animationDelay: `${ENTER_DELAYS_MS.badge}ms` }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          {siteConfig.role}
        </p>

        {/* キャッチコピー：「Trust（信頼）」を活動の軸に */}
        <h1
          className="hero-enter mt-8 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight"
          style={{ animationDelay: `${ENTER_DELAYS_MS.title}ms` }}
        >
          信頼を，
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-400">
            コード
          </span>
          で築く．
        </h1>

        <p
          className="hero-enter mt-6 text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
          style={{ animationDelay: `${ENTER_DELAYS_MS.subtitle}ms` }}
        >
          Trust, built into every line. —
          「信頼される技術」を軸に，iPhone・Mac 向けのアプリを中心に，
          使う人に寄り添うプロダクトを個人開発しています．
        </p>

        {/* CTA ボタン */}
        <div
          className="hero-enter mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{ animationDelay: `${ENTER_DELAYS_MS.cta}ms` }}
        >
          <a
            href="#projects"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all duration-300"
          >
            アプリを見る
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border border-slate-300 dark:border-night-border text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors duration-300"
          >
            <GitHubIcon className="w-4 h-4" />
            GitHub
          </a>
        </div>
      </div>

      {/* スクロールインジケーター */}
      <a
        href="#about"
        aria-label="次のセクションへスクロール"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-400 dark:text-slate-500 animate-bounce"
      >
        <ChevronDown className="w-6 h-6" />
      </a>
    </section>
  );
}
