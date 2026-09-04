import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import { GitHubIcon } from '../components/icons/GitHubIcon';
import { FloatingAppIcons } from '../components/FloatingAppIcons';
import { MagneticButton } from '../components/MagneticButton';
import { TypingText } from '../components/TypingText';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { HoverBounceText } from '../components/HoverBounceText';
import { ScrollFadeOut } from '../components/ScrollFadeOut';
import { ParallaxLayer } from '../components/ParallaxLayer';
import { siteConfig } from '../config/site';
import { SWIFT_APPS } from '../data/apps';

// 登場アニメーションの遅延時間（ミリ秒）：上から順に段階表示する
const ENTER_DELAYS_MS = {
  badge: 0,
  title: 150,
  subtitle: 300,
  cta: 450,
  stats: 600,
};

// タイピング演出で順に流れるフレーズ
const TYPING_PHRASES = [
  'iPhone のアプリをつくっています．',
  'Mac の常駐アプリもつくっています．',
  '「あったらいいな」を，週末に形にします．',
  'ぜんぶ Swift / SwiftUI 製です．',
];

// Hero 下部に並べる実績カウンター
const HERO_STATS = [
  { value: SWIFT_APPS.length, suffix: '', label: 'プロダクト' },
  {
    value: SWIFT_APPS.reduce((total, app) => total + app.repositories.length, 0),
    suffix: '',
    label: '公開リポジトリ',
  },
  { value: 2, suffix: '', label: '対応プラットフォーム' },
];

export function Hero() {
  return (
    <section
      id="hero"
      data-testid="hero-section"
      className="relative min-h-screen min-h-svh py-24 flex items-center justify-center overflow-hidden"
    >
      {/* 背景装飾：グリッドパターンと浮遊する光のオーブ */}
      <div className="absolute inset-0 bg-grid-pattern" aria-hidden="true" />
      <ParallaxLayer
        className="absolute top-1/4 -left-32 w-96 h-96"
        distancePx={160}
        horizontalDistancePx={40}
      >
        <div
          className="w-full h-full bg-sky-500/20 dark:bg-sky-500/15 rounded-full blur-3xl animate-float-slow"
          aria-hidden="true"
        />
      </ParallaxLayer>
      <ParallaxLayer
        className="absolute bottom-1/4 -right-32 w-96 h-96"
        distancePx={-200}
        horizontalDistancePx={-50}
      >
        <div
          className="w-full h-full bg-indigo-500/20 dark:bg-indigo-500/15 rounded-full blur-3xl animate-float-slower"
          aria-hidden="true"
        />
      </ParallaxLayer>

      {/* ゆっくり回り続ける装飾リング */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] rounded-full border border-dashed border-sky-500/15 dark:border-sky-400/10 animate-spin-slow"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[26rem] h-[26rem] rounded-full border border-indigo-500/10 dark:border-indigo-400/10 animate-spin-slow"
        style={{ animationDirection: 'reverse', animationDuration: '18s' }}
        aria-hidden="true"
      />

      {/* 漂うアプリアイコン（スクロールで視差移動する） */}
      <FloatingAppIcons />

      {/* グリッドを下端で自然にフェードアウトさせる */}
      <div
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cream dark:from-night to-transparent"
        aria-hidden="true"
      />

      <ScrollFadeOut className="relative max-w-4xl mx-auto px-6 text-center">
        {/* ステータスバッジ */}
        <p
          className="hero-enter inline-flex items-center justify-center gap-2 max-w-full px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-white/70 dark:bg-night-soft/70 border border-soft dark:border-night-border text-slate-600 dark:text-slate-300 backdrop-blur-sm"
          style={{ animationDelay: `${ENTER_DELAYS_MS.badge}ms` }}
        >
          <span
            className="w-2 h-2 shrink-0 rounded-full bg-emerald-400 animate-pulse"
            aria-hidden="true"
          />
          <span className="min-w-0">{siteConfig.role}</span>
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400 animate-bob" aria-hidden="true" />
        </p>

        {/* キャッチコピー：「Trust（信頼）」を活動の軸に */}
        <h1
          className="hero-enter mt-8 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.25]"
          style={{ animationDelay: `${ENTER_DELAYS_MS.title}ms` }}
        >
          <HoverBounceText text="信頼を，" />
          <HoverBounceText
            text="コード"
            className="animate-gradient text-transparent bg-clip-text bg-gradient-to-r from-sky-700 via-cyan-700 to-violet-700 dark:from-sky-300 dark:via-cyan-300 dark:to-violet-300"
          />
          <HoverBounceText text="で築く．" />
        </h1>

        {/* タイピングで切り替わるサブコピー */}
        <p
          className="hero-enter mt-6 text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed min-h-[3.5rem]"
          style={{ animationDelay: `${ENTER_DELAYS_MS.subtitle}ms` }}
        >
          <span lang="en">Trust, built into every line.</span> —{' '}
          <TypingText
            phrases={TYPING_PHRASES}
            accessibleText="iPhone と Mac のアプリを Swift / SwiftUI で開発しています．"
            className="font-medium text-slate-800 dark:text-slate-200"
          />
        </p>

        {/* CTA ボタン */}
        <div
          className="hero-enter mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{ animationDelay: `${ENTER_DELAYS_MS.cta}ms` }}
        >
          <MagneticButton
            href="#projects"
            className="group relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white animate-gradient bg-gradient-to-r from-sky-700 via-violet-700 to-sky-700 shadow-soft hover:shadow-soft-lg"
          >
            <span className="shimmer-sweep absolute inset-0 overflow-hidden rounded-full" aria-hidden="true" />
            <span className="relative">アプリを見る</span>
            <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </MagneticButton>
          <MagneticButton
            href={siteConfig.githubUrl}
            isExternal
            ariaLabel="GitHub プロフィールを新しいタブで開く"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border border-soft dark:border-night-border text-slate-700 dark:text-slate-200 hover:border-sky-500 hover:text-sky-700 dark:hover:text-sky-400"
          >
            <GitHubIcon className="w-4 h-4 animate-wiggle" />
            GitHub
          </MagneticButton>
        </div>

        {/* 実績カウンター（画面内に入ると 0 から数え上がる） */}
        <dl
          className="hero-enter mt-14 flex items-center justify-center gap-8 sm:gap-14"
          style={{ animationDelay: `${ENTER_DELAYS_MS.stats}ms` }}
        >
          {HERO_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  className="block text-3xl md:text-4xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-sky-700 to-violet-700 dark:from-sky-300 dark:to-violet-300 tabular-nums"
                />
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </ScrollFadeOut>

      {/* スクロールインジケーター */}
      <a
        href="#about"
        aria-label="次のセクションへスクロール"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 dark:text-slate-400 animate-bounce hover:text-sky-700 dark:hover:text-sky-400 transition-colors"
      >
        <ChevronDown className="w-6 h-6" />
      </a>
    </section>
  );
}
