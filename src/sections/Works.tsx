"use client";

import type React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Globe, Gamepad2 } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { Reveal } from '../components/Reveal';
import { SpotlightCard } from '../components/SpotlightCard';
import { ScrollZoom } from '../components/ScrollZoom';
import { HorizontalPinGallery } from '../components/HorizontalPinGallery';
import { Marquee } from '../components/Marquee';
import { ScrambleText } from '../components/ScrambleText';
import { SplitTextReveal } from '../components/SplitTextReveal';
import { RollLabel } from '../components/RollLabel';
import { GitHubIcon } from '../components/icons/GitHubIcon';
import { useInView } from '../hooks/useInView';
import { siteConfig } from '../config/site';
import { buildRepositoryUrl } from '../data/apps';
import { GAME_WORKS, PITTO_MART_JOBS, WEB_WORKS, type Work } from '../data/works';

// 中心駅へ集まる線を描く装飾（各メンバーの駅 → 中心駅）
const HUB_MEMBERS = [
  { x: 40, y: 52, delayMs: 0 },
  { x: 312, y: 70, delayMs: 160 },
  { x: 92, y: 248, delayMs: 320 },
  { x: 290, y: 236, delayMs: 480 },
];
const HUB_CENTER = { x: 180, y: 150 };

function HubConvergence() {
  const { ref, isInView } = useInView<HTMLDivElement>(0.4);

  return (
    <div ref={ref} className={`hub-convergence ${isInView ? 'is-drawn' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 360 300" className="w-full h-full">
        {HUB_MEMBERS.map((member, index) => (
          <g key={index}>
            <path
              className="hub-route"
              d={`M${member.x} ${member.y} Q ${(member.x + HUB_CENTER.x) / 2 + (index % 2 === 0 ? 30 : -30)} ${(member.y + HUB_CENTER.y) / 2} ${HUB_CENTER.x} ${HUB_CENTER.y}`}
              pathLength={1}
              style={{ transitionDelay: `${member.delayMs}ms` }}
            />
            <circle className="hub-member" cx={member.x} cy={member.y} r="7" style={{ transitionDelay: `${member.delayMs}ms` }} />
            <text className="hub-member-label" x={member.x} y={member.y + 3.5} textAnchor="middle">
              {index + 1}
            </text>
          </g>
        ))}
        <circle className="hub-center-pulse" cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="22" />
        <circle className="hub-center-ring" cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="15" />
        <path className="hub-center-stem" d={`M${HUB_CENTER.x} ${HUB_CENTER.y + 16} v 22`} />
      </svg>
    </div>
  );
}

// 外部サイトと GitHub へのリンク一式
function WorkLinks({ work }: { work: Work }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {work.detailHref && (
        <Link
          href={work.detailHref}
          className="roll-label-host inline-flex items-center gap-2 rounded-full bg-ink dark:bg-night-ink text-white dark:text-night px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
        >
          <RollLabel text="紹介ページを見る" />
          <span aria-hidden="true">→</span>
        </Link>
      )}
      <a
        href={work.url}
        target="_blank"
        rel="noopener noreferrer"
        className="roll-label-host inline-flex items-center gap-1.5 rounded-full border border-soft dark:border-night-border bg-white dark:bg-night-soft px-5 py-2.5 text-sm font-semibold text-ink dark:text-night-ink transition-colors hover:border-ink dark:hover:border-night-ink"
      >
        <RollLabel text={work.kind === 'game' ? 'あそぶ' : work.host} />
        <ArrowUpRight size={15} aria-hidden="true" />
        <span className="sr-only">（新しいタブで開きます）</span>
      </a>
      {work.repository && (
        <a
          href={buildRepositoryUrl(siteConfig.githubUsername, work.repository)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2 py-2.5 text-sm text-subtle dark:text-night-subtle hover:text-ink dark:hover:text-night-ink transition-colors"
        >
          <GitHubIcon className="w-4 h-4" />
          ソースコード
          <span className="sr-only">（GitHub・新しいタブで開きます）</span>
        </a>
      )}
    </div>
  );
}

// 実際の画面を，ブラウザの枠に収めて見せる
function BrowserFrame({ work, priority = false }: { work: Work; priority?: boolean }) {
  return (
    <figure className="works-browser">
      <div className="works-browser-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <p>{work.host}</p>
      </div>
      <Link href={work.detailHref ?? work.url} className="motion-work-surface" data-motion-work aria-label={`${work.name}の紹介を見る`}>
      <img
        data-motion-parallax
        src={work.screenshotSrc}
        alt={work.screenshotAlt}
        width={Math.round(work.screenshotAspect * 1000)}
        height={1000}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
        <span className="motion-surface-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
      </Link>
    </figure>
  );
}

// ゲームのパネル1枚
function GamePanel({ work, children }: { work: Work; children?: React.ReactNode }) {
  const isPortrait = work.screenshotAspect < 1;

  return (
    <SpotlightCard
      className="works-game-panel h-full rounded-3xl border border-soft dark:border-night-border bg-white dark:bg-night-soft shadow-soft overflow-hidden"
      color={`${work.accent}29`}
    >
      <div className={`grid h-full ${isPortrait ? 'lg:grid-cols-[0.75fr_1fr]' : 'lg:grid-cols-[1.15fr_1fr]'}`}>
        <a href={work.url} target="_blank" rel="noopener noreferrer" aria-label={`${work.name}を新しいタブであそぶ`} data-motion-work className={`motion-work-surface works-game-shot ${isPortrait ? 'is-portrait' : ''}`} style={{ '--work-accent': work.accent } as React.CSSProperties}>
          <img
            data-motion-parallax
            src={work.screenshotSrc}
            alt={work.screenshotAlt}
            width={Math.round(work.screenshotAspect * 1000)}
            height={1000}
            loading="lazy"
            decoding="async"
          />
          <span className="motion-surface-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
        </a>
        <div className="p-7 lg:p-8 flex flex-col gap-3.5 min-h-0">
          <div className="flex items-center gap-3">
            <img src={work.iconSrc} alt="" width={40} height={40} className="w-10 h-10 rounded-xl" loading="lazy" />
            <div>
              <p className="text-[11px] tracking-[0.18em] text-subtle dark:text-night-subtle">{work.latinName}</p>
              <h3 className="text-xl md:text-2xl font-semibold text-ink dark:text-night-ink">{work.name}</h3>
            </div>
          </div>
          <p className="text-base font-semibold text-ink dark:text-night-ink leading-relaxed">{work.tagline}</p>
          <p className="text-sm leading-7 text-body dark:text-night-body">{work.description}</p>
          {work.notice && (
            <p className="self-start rounded-full bg-mist dark:bg-night px-3 py-1 text-xs text-subtle dark:text-night-subtle">
              {work.notice}
            </p>
          )}
          {children}
          <ul className="flex flex-wrap gap-2" aria-label="使用技術">
            {work.tags.map((tag) => (
              <li key={tag} className="rounded-full border border-soft dark:border-night-border px-3 py-1 text-xs text-subtle dark:text-night-subtle">
                {tag}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-2">
            <WorkLinks work={work} />
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}

// 横に流すギャラリーの最初の1枚（ゲームの導入）
function GamesIntroPanel() {
  return (
    <div className="works-games-intro h-full rounded-3xl p-9 md:p-12 flex flex-col justify-between gap-10">
      <div>
        <p className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-white/70">
          <Gamepad2 size={15} aria-hidden="true" />
          <ScrambleText text="GAMES" />
        </p>
        <h3 className="mt-5 text-4xl md:text-6xl font-semibold leading-[1.15] tracking-tight text-white">
          <SplitTextReveal text="遊べる，" />
          <br />
          <SplitTextReveal text="ちいさな世界．" />
        </h3>
        <p className="mt-6 max-w-md text-sm md:text-base leading-8 text-white/80">
          アプリとは別に，ブラウザで遊べるゲームもつくっています．どちらもサブドメインで公開中で，インストールなしにスマホからでも遊べます．
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-4 text-white">
        <div>
          <dt className="text-xs text-white/60">タイトル</dt>
          <dd className="mt-1 text-3xl font-semibold tabular-nums">{GAME_WORKS.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/60">ミニゲーム</dt>
          <dd className="mt-1 text-3xl font-semibold tabular-nums">{PITTO_MART_JOBS.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/60">エンディング</dt>
          <dd className="mt-1 text-3xl font-semibold tabular-nums">5</dd>
        </div>
      </dl>
    </div>
  );
}

export function Works() {
  const ekihub = WEB_WORKS[0];
  const [pittoMart, curiousZoo] = GAME_WORKS;

  const panels = [
    <GamesIntroPanel key="intro" />,
    <GamePanel key={pittoMart.id} work={pittoMart}>
      <ol className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-body dark:text-night-body" aria-label="ピッとマートのお仕事一覧">
        {PITTO_MART_JOBS.map((item, index) => (
          <li key={item.title} className="flex gap-2">
            <span className="font-mono tabular-nums text-subtle dark:text-night-subtle">{String(index + 1).padStart(2, '0')}</span>
            {item.title}
          </li>
        ))}
      </ol>
    </GamePanel>,
    <GamePanel key={curiousZoo.id} work={curiousZoo} />,
  ];

  return (
    <section id="works" data-testid="works-section" className="scroll-mt-24 pt-24 md:pt-32 pb-16">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="04. Web & Games"
          title="Web サービスとゲーム"
          description="Swift 以外でも，必要なものは Web でつくります．集合場所を決める Web サービスと，ブラウザで遊べる2つのゲームです．"
        />

        {/* Web サービス（EkiHub）：線が中心駅へ集まる装飾と，起き上がる実画面 */}
        <SpotlightCard
          className="works-web-card rounded-3xl border border-soft dark:border-night-border bg-white dark:bg-night-soft shadow-soft overflow-hidden"
          color="rgb(47 211 181 / 0.14)"
        >
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-10 p-7 md:p-12 items-center">
            <Reveal variant="left">
              <p className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-subtle dark:text-night-subtle">
                <Globe size={15} aria-hidden="true" />
                <ScrambleText text="WEB SERVICE" />
              </p>
              <div className="mt-5 flex items-center gap-3">
                <img src={ekihub.iconSrc} alt="" width={48} height={48} className="w-12 h-12 rounded-2xl" />
                <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink dark:text-night-ink">{ekihub.name}</h3>
              </div>
              <p className="mt-6 text-xl md:text-2xl font-semibold leading-relaxed text-ink dark:text-night-ink">
                「どこで集まる？」に，
                <br />
                <span className="works-ekihub-accent">移動時間の公平さ</span>で答える．
              </p>
              <p className="mt-5 text-sm md:text-base leading-8 text-body dark:text-night-body">{ekihub.description}</p>
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="EkiHub の特徴">
                {ekihub.highlights.map((highlight) => (
                  <li key={highlight} className="rounded-full bg-mist dark:bg-night px-3.5 py-1.5 text-xs font-semibold text-ink dark:text-night-ink">
                    {highlight}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <WorkLinks work={ekihub} />
              </div>
            </Reveal>

            <div className="relative">
              <div className="absolute -inset-x-10 -inset-y-14 -z-0 opacity-90">
                <HubConvergence />
              </div>
              <ScrollZoom className="relative z-10 mx-auto max-w-[340px]">
                <BrowserFrame work={ekihub} />
              </ScrollZoom>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* ゲーム：大きな画面では画面を固定して横へ送る */}
      <div className="mt-20 md:mt-28">
        <HorizontalPinGallery panels={panels} label="ブラウザで遊べるゲーム" />
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-10">
        <Marquee items={PITTO_MART_JOBS.map((item) => `${item.job}のお仕事｜${item.title}`)} />
      </div>
    </section>
  );
}
