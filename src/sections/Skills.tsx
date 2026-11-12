"use client";

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Code2, Cpu, Globe2, Terminal } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { RollingNumber } from '../components/RollingNumber';
import { useTilt } from '../hooks/useTilt';
import { SWIFT_APPS } from '../data/apps';
import { siteConfig } from '../config/site';
import { SkillExamples, useSkillSelectionIndicator } from './SkillExamples';
import { SkillLab, type SkillLabId } from './skillLab/SkillLab';
import { FEATURES } from '../config/features';
import { useTimeExhibit } from '../hooks/useTimeExhibit';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { busPhaseStarts, busRepresentativePhase, getBusFrame } from '../lib/busProcess';
import styles from './Skills.module.css';

const SHOWCASE_APPS = ['Subghost', 'BusTimeApp', 'Tsumugi'].map((name) => SWIFT_APPS.find((app) => app.name === name)!);
const REPOSITORY_COUNT = SWIFT_APPS.reduce((total, app) => total + app.repositories.length, 0);
const PIPELINE_RESET_MS = 120;
const PIPELINE_SETTLE_MS = 440;
const CardEnteredContext = createContext(false);

function SkillCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { ref, handlers } = useTilt<HTMLDivElement>();
  const [entered, setEntered] = useState(false);
  const replayTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const card = ref.current;
    const reveal = card?.closest<HTMLElement>('.reveal');
    if (!card || !reveal) return;
    let disposed = false;
    let scheduled = false;
    let frame = 0;
    const begin = () => {
      if (scheduled || !reveal.classList.contains('reveal-visible')) return;
      scheduled = true;
      // Reveal の移動が着地してから，中身だけを動かす．共通の時間は複製しない．
      frame = requestAnimationFrame(() => {
        const arrival = reveal.getAnimations?.().filter(animation =>
          typeof CSSTransition !== 'undefined' && animation instanceof CSSTransition && animation.transitionProperty === 'transform') ?? [];
        void Promise.allSettled(arrival.map(animation => animation.finished)).then(() => {
          if (!disposed) setEntered(true);
        });
      });
    };
    const observer = new MutationObserver(begin);
    observer.observe(reveal, { attributes: true, attributeFilter: ['class'] });
    begin();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      replayTimers.current.forEach(clearTimeout);
    };
  }, [ref]);
  const replayPipeline = () => {
    const pipeline = ref.current?.querySelector<HTMLElement>('[data-pipeline]');
    if (!pipeline || !entered || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    replayTimers.current.forEach(clearTimeout);
    pipeline.dataset.replay = 'reset';
    replayTimers.current = [
      setTimeout(() => { pipeline.dataset.replay = 'play'; }, PIPELINE_RESET_MS),
      setTimeout(() => { pipeline.dataset.replay = 'settle'; }, PIPELINE_RESET_MS + PIPELINE_SETTLE_MS),
    ];
  };
  return <CardEnteredContext.Provider value={entered}>
    <div ref={ref} {...handlers} className={`${styles.card} ${className}`} data-entered={entered}
      onPointerEnter={event => {
        if (event.pointerType !== 'touch' && matchMedia('(hover: hover) and (pointer: fine)').matches) replayPipeline();
      }} onFocusCapture={replayPipeline}>{children}</div>
  </CardEnteredContext.Provider>;
}

function SkillCount({ value }: { value: number }) {
  const entered = useContext(CardEnteredContext);
  return <span className={styles.rollingCount}>
    <span className="sr-only">{value}</span>
    <span aria-hidden="true">{entered ? <RollingNumber value={value} /> : String(value).replace(/\d/g, '0')}</span>
  </span>;
}

const busComparisonScreens = [
  { id: 'timetable', label: '全時刻表を並べる', alt: 'BusTimeApp の全時刻表．47 便の時刻を並べる画面', position: '50% 56%' },
  { id: 'next-bus', label: '次の便だけ示す', alt: 'BusTimeApp の次の便の案内．つぎのバス あと 8 分と表示', position: '50% 42%' },
] as const;

// 同じ枠で実画面の見せ方を比較する．自動進行や実装の前後比較にはしない．
function BusComparison() {
  const [selected, setSelected] = useState('timetable');
  const [instant, setInstant] = useState(true);
  const reduced = usePrefersReducedMotion();
  const controlsRef = useSkillSelectionIndicator(selected);
  const frameId = 'bus-comparison-frame';
  return (
    <figure className={styles.comparison} data-testid="bus-comparison" data-instant={instant || reduced}>
      <p className={styles.comparisonTitle}>見せ方の比較</p>
      <p className={styles.comparisonLabels}>全時刻表（47 便）／次の便（あと 8 分）</p>
      <div id={frameId} className={styles.comparisonFrame}>
        {busComparisonScreens.map(screen => <img key={screen.id} src={`/projects/bustimeapp-screens/${screen.id}.webp`} alt={screen.alt} width={840} height={1826} loading="lazy" decoding="async" className={styles.comparisonImage} data-active={selected === screen.id} aria-hidden={selected !== screen.id} style={{ objectPosition: screen.position }} />)}
      </div>
      <div ref={controlsRef} className={`${styles.comparisonControls} ${styles.selectionControls}`} role="group" aria-label="BusTimeApp の見せ方を比較">
        {busComparisonScreens.map(screen => <button key={screen.id} type="button" className="press-effect" aria-pressed={selected === screen.id} aria-controls={frameId} onClick={event => {
          setInstant(event.detail === 0 || reduced);
          setSelected(screen.id);
        }}>{screen.label}</button>)}
      </div>
      <figcaption>どちらも実際のアプリ画面です．同じ時刻表から，いま乗れる便だけを選んで示します．日時・便は撮影時の例です．</figcaption>
    </figure>
  );
}

// 公開済みの説明から抜き出した判断の流れ．運行情報の取得・計算は行わない．
function BusProcess() {
  const exhibit = useTimeExhibit(getBusFrame, busPhaseStarts, busRepresentativePhase);
  const [instant, setInstant] = useState(false);
  const phases = ['入力', '判断', '結果'];
  const controlsRef = useSkillSelectionIndicator(exhibit.phase);
  return (
    <div ref={exhibit.containerRef} className={styles.process} data-testid="bus-process-exhibit" data-phase={exhibit.phase} data-instant={instant || exhibit.reduced}>
      <div className={styles.processCopy}>
        <p className={styles.processLabel}>BusTimeApp / 実装の展示</p>
        <h3>時刻表から，次に乗れる便へ．</h3>
        <p>曜日を調べ，時刻表を目で追う手間を減らすために，経路を選ぶところから設計しています．土日祝や当日の残り便，午前4時の運行日境界も判断に含めます．</p>
        <p>アプリ・通知・ウィジェットなどが同じ時刻表と経路判断を共有し，入口が変わっても判断の根拠をそろえています．</p>
        <Link href="/apps/bustimeapp" className={`${styles.processLink} press-effect`}>BusTimeApp の設計を見る <ArrowUpRight size={16} aria-hidden="true" /></Link>
        <BusComparison />
      </div>
      <figure className={styles.processFigure}>
        <ol className={styles.processFlow} aria-label="次の便を示すまでの工程">
          <li data-active={exhibit.phase === 0}><span>01 / 入力</span><strong>現在地・時間帯</strong><p>前回の行き先も手がかりに</p></li>
          <li data-active={exhibit.phase === 1}><span>02 / 判断</span><strong>運行日と残り便</strong><p>土日祝・午前4時の境界を考慮</p></li>
          <li data-active={exhibit.phase === 2}><span>03 / 結果</span><div className={styles.processResponse}><strong className={styles.processResult}>あと8分</strong><p>次に乗れる便を表示</p></div></li>
        </ol>
        <div className={styles.processControls}>
          <div ref={controlsRef} className={styles.selectionControls} role="group" aria-label="制作工程を選択">
            {phases.map((label, index) => <button key={label} type="button" className="press-effect" aria-pressed={exhibit.phase === index} onClick={event => { setInstant(event.detail === 0 || exhibit.reduced); exhibit.select(index); }}>{label}</button>)}
          </div>
          <button type="button" className="press-effect" aria-label="制作工程の自動再生" aria-pressed={exhibit.requested && !exhibit.reduced} disabled={exhibit.reduced} onClick={event => { setInstant(event.detail === 0 || exhibit.reduced); exhibit.toggle(); }}>{exhibit.reduced ? '工程を選んで見る' : exhibit.requested ? '一時停止' : '再生'}</button>
        </div>
        <figcaption>再現です．実際の画面・データではありません．「あと8分」は掲載画面から抜粋した固定例で，現在の運行情報ではありません．</figcaption>
      </figure>
    </div>
  );
}

export function Skills() {
  const [selectedLab, setSelectedLab] = useState<SkillLabId>('hardware');
  const openLab = (id: SkillLabId) => {
    setSelectedLab(id);
    document.getElementById(`skill-lab-tab-${id}`)?.focus({ preventScroll: true });
  };
  return (
    <section id="skills" data-testid="skills-section" className={`tinted scroll-mt-24 py-24 md:py-32 bg-mist dark:bg-night-soft/40 ${styles.section}`}>
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="02. Skills"
          title="アイデアを、動くものに。"
          description="Swift で日常のアプリを。TypeScript で Web の体験を。目的に合わせて技術を選び、ソフトウェアからハードウェアまで形にしています。"
        />
        <div className={styles.sectionLabel}><span>MY DEVELOPMENT TOOLKIT</span><span>技術と、それでつくったもの</span></div>
        <div className={styles.grid}>
          <Reveal className={styles.nativeSlot} cardDirection="left">
            <SkillCard className={styles.native}>
              <div className={styles.cardTop}><span className={styles.icon}><Code2 size={22} aria-hidden="true" /></span><span className={styles.category}>APP DEVELOPMENT</span><span className={styles.primaryBadge}>メインスキル</span></div>
              <h3>Swift <span>/ SwiftUI</span></h3>
              <p className={styles.description}>毎日使いたくなる、<br />iPhone と Mac のアプリを。</p>
              <div className={styles.nativeVisual}>
                <div className={styles.orbit} aria-hidden="true" />
                <span className={`${styles.platform} ${styles.ios}`}>iOS</span>
                <span className={`${styles.platform} ${styles.macos}`}>macOS</span>
                <div className={styles.appShelf}>
                  {SHOWCASE_APPS.map((app, index) => (
                    <Link key={app.name} href={app.detailHref!} className={`${styles.app} press-effect`} style={{ '--app-index': index } as CSSProperties} aria-label={`${app.name}の紹介を見る`}>
                      <span className={styles.appArrival}>
                        <Image src={app.imageSrc!} alt="" width={96} height={96} />
                        <span>{app.name}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              <dl className={styles.stats}>
                <div><dt>公開プロダクト</dt><dd><SkillCount value={SWIFT_APPS.length} /><span>Apps</span></dd></div>
                <div><dt>公開リポジトリ</dt><dd><SkillCount value={REPOSITORY_COUNT} /><span>Repositories</span></dd></div>
              </dl>
              <div className={styles.cardFooter}><span>SwiftUI / UIKit</span><Link href="#projects" className="press-effect">つくったアプリへ <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
            </SkillCard>
          </Reveal>
          <Reveal className={styles.webSlot} cardDirection="right" delayMs={80}>
            <SkillCard className={styles.web}>
              <div className={styles.webCopy}>
                <div className={styles.cardTop}><span className={styles.icon}><Globe2 size={21} aria-hidden="true" /></span><span className={styles.category}>WEB EXPERIENCE</span></div>
                <h3>TypeScript <span>/ Next.js</span></h3>
                <p className={styles.description}>ブラウザから、体験を届ける。</p>
                <p className={styles.evidence}>EkiHub・このポートフォリオサイト</p>
                <span className={styles.linkEntrance}><Link className={`${styles.textLink} press-effect`} href="#works">Web サービスへ <ArrowUpRight size={16} aria-hidden="true" /></Link></span>
              </div>
              <div className={styles.browserVisual} aria-hidden="true">
                <div className={styles.browserBar}><i /><i /><i /><span>localhost</span></div>
                <div className={styles.code}><span>&lt;<b>Idea</b></span><span>   language=<em>"TypeScript"</em></span><span>   framework=<em>"Next.js"</em></span><span>   /&gt;<i className={styles.caret} /></span></div>
                <div className={styles.browserPreview}><span /><span /><span /></div>
              </div>
            </SkillCard>
          </Reveal>
          <Reveal cardDirection="left" delayMs={150} tow={false}>
            <SkillCard className={styles.python}>
              <div className={styles.cardTop}><span className={styles.icon}><Terminal size={21} aria-hidden="true" /></span><span className={styles.category}>AUTOMATION</span></div>
              <h3>Python</h3>
              <p className={styles.description}>繰り返す作業に、仕組みを。</p>
              <div className={styles.pipeline} data-pipeline aria-hidden="true"><span><span>Data</span></span><i className={styles.dataLink}><i /></i><span><span>Script</span></span><i className={styles.dataLink}><i /></i><span><span>Done</span></span></div>
              <p className={styles.evidence}>データ処理・自動化・機械学習</p>
              <span className={styles.linkEntrance}><a className={`${styles.textLink} press-effect`} href={`${siteConfig.githubUrl}?tab=repositories&language=python`}>AeroPath / FraTerm など <ArrowUpRight size={15} aria-hidden="true" /></a></span>
              {FEATURES.skillLab && <a className={`${styles.labLink} press-effect`} href="#skill-lab" onClick={() => openLab('python')}>展示を見る <ArrowUpRight size={15} aria-hidden="true" /></a>}
            </SkillCard>
          </Reveal>
          <Reveal cardDirection="right" delayMs={220}>
            <SkillCard className={styles.hardware}>
              <div className={styles.cardTop}><span className={styles.icon}><Cpu size={21} aria-hidden="true" /></span><span className={styles.category}>HARDWARE</span></div>
              <h3>C <span>/ Arduino</span></h3>
              <p className={styles.description}>画面の先の、ものづくり。</p>
              <div className={styles.circuit} aria-hidden="true"><span /><span /><Cpu size={32} /><span /><span /></div>
              <p className={styles.evidence}>組込み開発・低レイヤプログラミング<br />電子工作・IoT プロトタイピング</p>
              {FEATURES.skillLab && <a className={`${styles.labLink} press-effect`} href="#skill-lab" onClick={() => openLab('hardware')}>展示を見る <ArrowUpRight size={15} aria-hidden="true" /></a>}
            </SkillCard>
          </Reveal>
        </div>
        <BusProcess />
        {FEATURES.skillLab && <SkillLab selected={selectedLab} onSelect={setSelectedLab} />}
        <Reveal delayMs={100}>
          <SkillExamples />
        </Reveal>
      </div>
    </section>
  );
}
