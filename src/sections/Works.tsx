"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Globe } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { Reveal } from '../components/Reveal';
import { SpotlightCard } from '../components/SpotlightCard';
import { ScrambleText } from '../components/ScrambleText';
import { WorkLinks } from '../components/WorkLinks';
import { RollTitle } from '../components/animations/RollTitle';
import { ScrollBend } from '../components/animations/ScrollBend';
import { CornerMarks } from '../components/animations/CornerMarks';
import { DotPillLink } from '../components/animations/DotPillLink';
import { FEATURES } from '../config/features';
import { useTimeExhibit } from '../hooks/useTimeExhibit';
import { useInView } from '../hooks/useInView';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { clamp, subscribeToScroll } from '../lib/scrollObserver';
import { staggerDelay } from '../lib/choreography';
import { getHubFrame, getHubInterruptedProgress, getHubMotionFrames, getHubPoint, getHubStationLabel, hubDestination, hubManualMoveMs, hubManualTimes, hubRepresentativePhase, hubResultLabels, hubRoutes } from '../lib/hubRoutes';
import styles from './Works.module.css';
import { ALL_WORKS, GAME_WORKS, GAMES_PATH, WEB_WORKS, type Work } from '../data/works';

const WORK_PARALLAX_PX = 12;
const WORK_COPY_DEPTH = -0.4;
const WORK_TAG_START_MS = 350;
const WORK_TAG_STEP_MS = 40;
// 画面の枠の四隅の印を始める遅れ．枠の起き上がり（640ms）が半ばに差しかかるころ，印が広がり始める
const WORK_MARKS_DELAY_MS = 200;

// 固定の検索例を説明する図．移動時間や現在位置は表現しない．
function HubConvergence() {
  const points = useRef<(SVGGElement | null)[]>([]);
  const currentProgress = useRef(1);
  const manualMotion = useRef<{ animations: Animation[]; from: number; to: number } | null>(null);
  const [instant, setInstant] = useState(false);
  const paintProgress = useCallback((progress: number) => {
    currentProgress.current = progress;
    hubRoutes.forEach((route, index) => {
      const point = getHubPoint(route, progress);
      const node = points.current[index];
      if (node) node.style.transform = `translate(${point.x}px, ${point.y}px)`;
    });
  }, []);
  const paint = useCallback((frame: ReturnType<typeof getHubFrame>) => {
    if (!manualMotion.current) paintProgress(frame.progress);
  }, [paintProgress]);
  const exhibit = useTimeExhibit(getHubFrame, hubManualTimes, hubRepresentativePhase, paint);
  const labels = ['出発', '移動', '集合'];

  const cancelMotion = useCallback(() => {
    const motion = manualMotion.current;
    if (!motion) return currentProgress.current;
    const animation = motion.animations[0];
    const timing = animation?.effect?.getComputedTiming();
    const progress = getHubInterruptedProgress(motion.from, motion.to, timing?.progress ?? (animation?.playState === 'finished' ? 1 : 0));
    motion.animations.forEach(animation => animation.cancel());
    manualMotion.current = null;
    paintProgress(progress);
    return progress;
  }, [paintProgress]);

  const selectPhase = (phase: number, keyboard: boolean) => {
    const from = cancelMotion();
    const immediate = keyboard || exhibit.reduced;
    setInstant(immediate);
    exhibit.select(phase);
    if (immediate) return;
    const to = getHubFrame(hubManualTimes[phase]).progress;
    const easing = getComputedStyle(exhibit.containerRef.current!).getPropertyValue('--site-ease').trim();
    const animations = hubRoutes.flatMap((route, index) => {
      const node = points.current[index];
      return node ? [node.animate(getHubMotionFrames(route, from, to), { duration: hubManualMoveMs, easing })] : [];
    });
    const motion = { animations, from, to };
    manualMotion.current = motion;
    void Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (manualMotion.current !== motion) return;
      manualMotion.current = null;
      paintProgress(to);
    }).catch(() => { /* 新しい入力や画面外への移動で取り消した． */ });
  };

  useEffect(() => {
    if (!exhibit.available || exhibit.reduced) cancelMotion();
  }, [exhibit.available, exhibit.reduced, cancelMotion]);

  useEffect(() => () => { manualMotion.current?.animations.forEach(animation => animation.cancel()); }, []);

  return (
    <div ref={exhibit.containerRef} className={styles.exhibit} data-testid="ekihub-route-exhibit" data-phase={exhibit.phase} data-instant={instant || exhibit.reduced} data-reduced={exhibit.reduced}>
      <p className={styles.title}>それぞれの駅から，集合候補へ．</p>
      <svg viewBox="0 0 376 252" className={styles.diagram} role="img" aria-label="東京・川崎・船橋から集合候補の新木場へ集まる説明図">
        {hubRoutes.map((route, index) => {
          const end = getHubPoint(route, 1);
          const label = getHubStationLabel(route);
          return <g key={route.name}>
            <path className={styles.route} d={`M ${route.start.x} ${route.start.y} Q ${route.control.x} ${route.control.y} ${hubDestination.x} ${hubDestination.y}`} />
            <circle className={styles.station} cx={route.start.x} cy={route.start.y} r="5" />
            <text x={label.x} y={label.y} textAnchor="middle">{route.name}</text>
            <g ref={node => { points.current[index] = node; }} style={{ transform: `translate(${end.x}px, ${end.y}px)` }} aria-hidden="true">
              <circle className={styles.traveller} r="5" />
            </g>
          </g>;
        })}
        <circle className={styles.resultRing} cx={hubDestination.x} cy={hubDestination.y} r="18" />
        <circle className={styles.destination} cx={hubDestination.x} cy={hubDestination.y} r="8" />
        <text className={styles.destinationName} x={hubResultLabels.name.x} y={hubResultLabels.name.y} textAnchor="middle">新木場</text>
        <text className={styles.candidateLabel} x={hubResultLabels.caption.x} y={hubResultLabels.caption.y} textAnchor="middle">集合候補駅</text>
      </svg>
      <div className={styles.controls}>
        <div role="group" aria-label="路線図の工程を選択">
          {labels.map((label, index) => <button type="button" key={label} className="press-effect" aria-pressed={exhibit.phase === index} onClick={event => selectPhase(index, event.detail === 0)}>{label}</button>)}
        </div>
        <button type="button" className="press-effect" aria-label="路線図の自動再生" aria-pressed={exhibit.requested && !exhibit.reduced} disabled={exhibit.reduced} onClick={event => { cancelMotion(); setInstant(event.detail === 0 || exhibit.reduced); exhibit.toggle(); }}>{exhibit.reduced ? '工程を選んで見る' : exhibit.requested ? '一時停止' : '再生'}</button>
      </div>
      <p className={styles.caption}>説明用に単純化した例です．実際の画面・データではありません．駅の組み合わせは掲載画面から抜粋し，線路や移動の速さは再現していません．ライブの利用者位置ではありません．</p>
    </div>
  );
}

// 実際の画面を，ブラウザの枠に収めて見せる．
// 枠は動かさず，ホバー（とフォーカス）では画面の中身（スクリーンショット）だけが枠の中でゆっくり寄る．
// data-motion-work：マウスのとき，カーソルが丸い「VIEW」の札になる（CursorRing）
function BrowserFrame({ work, priority = false }: { work: Work; priority?: boolean }) {
  return (
    <figure className={`works-browser ${styles.browser}`} data-morph-source>
      <div className="works-browser-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <p>{work.host}</p>
      </div>
      <Link href={work.detailHref ?? work.url} className={styles.screenLink} data-motion-work aria-label={`${work.name}の紹介を見る`}>
        <div className={styles.imageSettle}>
          <img
            className={styles.screenMedia}
            src={work.screenshotSrc}
            alt={work.screenshotAlt}
            width={Math.round(work.screenshotAspect * 1000)}
            height={1000}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        </div>
        <span className={styles.screenArrow} aria-hidden="true"><ArrowUpRight size={18} /></span>
      </Link>
    </figure>
  );
}

export function Works() {
  const ekihub = WEB_WORKS[0];
  const { ref: cardRef, isInView: cardVisible } = useInView<HTMLDivElement>();
  const { ref: diagramRef, isInView: diagramVisible } = useInView<HTMLDivElement>();
  const copyRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const card = cardRef.current;
    const copy = copyRef.current;
    const screen = screenRef.current;
    if (!card || !copy || !screen) return;
    const reset = () => {
      copy.style.removeProperty('--parallax');
      screen.style.removeProperty('--parallax');
    };
    if (reducedMotion) {
      reset();
      return;
    }
    // 視差は専用の外側だけに書く．画像のポインター追従とは変形を共有しない．
    const unsubscribe = subscribeToScroll(() => {
      const bounds = card.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      const progress = clamp((window.innerHeight - bounds.top) / (window.innerHeight + bounds.height));
      const parallax = (progress * 2 - 1) * WORK_PARALLAX_PX;
      copy.style.setProperty('--parallax', `${(parallax * WORK_COPY_DEPTH).toFixed(2)}px`);
      screen.style.setProperty('--parallax', `${parallax.toFixed(2)}px`);
    });
    return () => { unsubscribe(); reset(); };
  }, [cardRef, reducedMotion]);

  return (
    <section id="works" data-testid="works-section" className="scroll-mt-24 pt-24 md:pt-32 pb-16">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="04. Web Service"
          title="Web サービス"
          count={ALL_WORKS.length}
          size="display"
          description="Swift 以外でも，必要なものは Web でつくります．集合場所を決める Web サービスを紹介します．ブラウザで遊べるゲームは，別のページにまとめました．"
        />

        {/* Web サービス（EkiHub）：固定例の説明図と，起き上がる実画面 */}
        <SpotlightCard
          className="works-web-card rounded-3xl border border-soft dark:border-night-border bg-white dark:bg-night-soft shadow-soft overflow-hidden"
          color="rgb(47 211 181 / 0.14)"
        >
          <div ref={cardRef} className={`${styles.workScene} grid lg:grid-cols-[1fr_1.05fr] gap-10 p-7 md:p-12 items-center`} data-morph-scope data-work-visible={cardVisible}>
            {/* タイル：大きな角丸の画面を上に，文字は画面の下に置く（小さな分類の行 → 大きな題名）．
                広い画面では右側．見出し（題名）が本文より先に読まれるよう，DOM では先に置く */}
            <div ref={screenRef} className={`${styles.screenDepth} relative lg:order-2`}>
              <div className={`${styles.tile} relative z-10 mx-auto max-w-[340px]`} data-roll-host>
                <ScrollBend>
                  {/* 画面の枠の外側の四隅と辺に，細い「＋」の印．下辺中央のラベルは，枠の中に出ている語（ホスト名）だけ */}
                  <CornerMarks label={ekihub.host} delayMs={WORK_MARKS_DELAY_MS}>
                    <BrowserFrame work={ekihub} />
                  </CornerMarks>
                </ScrollBend>
                <div className={FEATURES.cornerMarks ? `${styles.tileCaption} ${styles.tileCaptionMarked}` : styles.tileCaption}>
                  <p className={styles.tileKind}>
                    <img src={ekihub.iconSrc} alt="" width={20} height={20} className={styles.tileIcon} />
                    <span>Web サービス</span>
                    <span>{ekihub.year}</span>
                    <span>{ekihub.host}</span>
                  </p>
                  <h3 className={styles.tileTitle}>
                    <RollTitle text={ekihub.name} />
                  </h3>
                </div>
              </div>
            </div>

            <div ref={copyRef} className={`${styles.copyDepth} lg:order-1`}>
              <p className={`${styles.label} inline-flex items-center gap-2 text-xs tracking-[0.2em] text-subtle dark:text-night-subtle`}>
                <Globe size={15} aria-hidden="true" />
                <ScrambleText text="WEB SERVICE" />
              </p>
              <p className={`${styles.headline} mt-6 text-xl md:text-2xl font-semibold leading-relaxed text-ink dark:text-night-ink`}>
                「どこで集まる？」に，
                <br />
                <span className={`works-ekihub-accent ${styles.accent}`}>移動時間の公平さ</span>で答える．
              </p>
              <p className={`${styles.description} mt-5 text-sm md:text-base leading-8 text-body dark:text-night-body`}>{ekihub.description}</p>
              <ul className={`${styles.tags} mt-6 flex flex-wrap gap-2`} aria-label="EkiHub の特徴">
                {ekihub.highlights.map((highlight, index) => (
                  <li key={highlight} style={{ '--work-delay': `${staggerDelay(index, { startMs: WORK_TAG_START_MS, stepMs: WORK_TAG_STEP_MS })}ms` } as CSSProperties} className="rounded-full bg-mist dark:bg-night px-3.5 py-1.5 text-xs font-semibold text-ink dark:text-night-ink">
                    {highlight}
                  </li>
                ))}
              </ul>
              <div className={`${styles.links} mt-8`}>
                <WorkLinks work={ekihub} />
              </div>
            </div>

            {/* 実画面の下に，横長の説明図（点が路線に沿って集合候補へ集まる）を 1 段で置く */}
            <div ref={diagramRef} className={`${styles.diagramEntrance} lg:col-span-2 lg:order-3`} data-diagram-visible={diagramVisible}>
              <HubConvergence />
            </div>
          </div>
        </SpotlightCard>

        {/* ゲームは別のページ（/games）へ．デザインはそのまま移してある */}
        <Reveal className={FEATURES.cornerMarks ? 'mt-6 flex justify-center' : 'mt-6'}>
          {FEATURES.cornerMarks ? (
            <DotPillLink href={GAMES_PATH} icon={<ArrowUpRight size={15} aria-hidden="true" />}>
              {`ブラウザで遊べるゲーム（${GAME_WORKS.length}本）を見る`}
            </DotPillLink>
          ) : (
            <Link
              href={GAMES_PATH}
              className={`${styles.gameLink} press-effect arrow-swap-host flex min-h-14 items-center justify-center gap-2 rounded-3xl border border-dashed border-soft dark:border-night-border px-5 py-3.5 text-center text-sm font-semibold text-ink dark:text-night-ink`}
              data-roll-host
            >
              <RollTitle text={`ブラウザで遊べるゲーム（${GAME_WORKS.length}本）を見る`} />
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  );
}
