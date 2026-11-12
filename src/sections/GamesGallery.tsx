"use client";

import type React from 'react';
import { ArrowUpRight, Gamepad2 } from 'lucide-react';
import { SpotlightCard } from '../components/SpotlightCard';
import { HorizontalPinGallery } from '../components/HorizontalPinGallery';
import { Marquee } from '../components/Marquee';
import { ScrambleText } from '../components/ScrambleText';
import { SplitTextReveal } from '../components/SplitTextReveal';
import { WorkLinks } from '../components/WorkLinks';
import { RollTitle } from '../components/animations/RollTitle';
import { CornerMarkSet } from '../components/animations/CornerMarks';
import { GAME_WORKS, PITTO_MART_JOBS, type Work } from '../data/works';
import styles from './GamesGallery.module.css';

// ゲームのパネル1枚．
// 画面は枠を動かさず，ホバー（とフォーカス）では中身の画像だけが枠の中でゆっくり寄る．題名の文字は 1 文字ずつ回って入れ替わる．
// 合図は，内側の grid の data-roll-host（題名の回転は RollTitle.css，画像の寄りは GamesGallery.module.css）．
// data-motion-work：マウスのとき，カーソルが丸い「VIEW」の札になる（CursorRing）
function GamePanel({ work, children }: { work: Work; children?: React.ReactNode }) {
  const isPortrait = work.screenshotAspect < 1;

  return (
    <SpotlightCard
      className="works-game-panel h-full rounded-3xl border border-soft dark:border-night-border bg-white dark:bg-night-soft shadow-soft overflow-hidden"
      color={`${work.accent}29`}
    >
      <div className={`${styles.panel} grid h-full ${isPortrait ? 'lg:grid-cols-[0.75fr_1fr]' : 'lg:grid-cols-[1.15fr_1fr]'}`} data-roll-host>
        <a href={work.url} target="_blank" rel="noopener noreferrer" aria-label={`${work.name}を新しいタブであそぶ`} data-motion-work className={`${styles.shot} ${isPortrait ? styles.portrait : ''}`} style={{ '--work-accent': work.accent } as React.CSSProperties}>
          <img
            className={styles.media}
            src={work.screenshotSrc}
            alt={work.screenshotAlt}
            width={Math.round(work.screenshotAspect * 1000)}
            height={1000}
            loading="lazy"
            decoding="async"
          />
          <span className={styles.arrow} aria-hidden="true"><ArrowUpRight size={18} /></span>
          {/* 画面の四隅と辺の「＋」の印．パネルは親の overflow で外側が切れるので，画面の内側に置く．
              画面（スクリーンショット）に文字が写っていて，題名もすぐ横にあるので，ラベルは置かない */}
          <CornerMarkSet placement="inside" tone="overlay" divisions={isPortrait ? 2 : 4} />
        </a>
        <div className="p-7 lg:p-8 flex flex-col gap-3.5 min-h-0">
          <div className="flex items-center gap-3">
            <img src={work.iconSrc} alt="" width={40} height={40} className="w-10 h-10 rounded-xl" loading="lazy" />
            <div>
              <p className="text-[11px] tracking-[0.18em] text-subtle dark:text-night-subtle">{work.latinName}</p>
              <h3 className={`${styles.title} text-2xl md:text-3xl font-semibold tracking-tight text-ink dark:text-night-ink`}>
                <RollTitle text={work.name} />
              </h3>
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

// ブラウザで遊べるゲーム：大きな画面では画面を固定して横へ送る．下には，ピッとマートのお仕事が流れる帯
// （Works セクションにあったものを，デザインはそのまま /games のページへ移した）
export function GamesGallery() {
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
    <>
      <div className="mt-12 md:mt-16">
        <HorizontalPinGallery panels={panels} label="ブラウザで遊べるゲーム" />
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-10">
        <Marquee items={PITTO_MART_JOBS.map((item) => `${item.job}のお仕事｜${item.title}`)} />
      </div>
    </>
  );
}
