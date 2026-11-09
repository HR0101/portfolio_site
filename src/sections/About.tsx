"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type Ref } from 'react';
import { ArrowDown, Cpu, GraduationCap, HeartHandshake, Smartphone } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { SWIFT_APPS } from '../data/apps';
import { getFlipLight, getFlipPosition, getFlipPresence, getShowcaseChapterOffset, getShowcaseScrollState, getShuffledLabel } from '../lib/showcaseStory';
import {
  CARD_SLOTS, PLANET_ARC, clearTransit, createParticles, drawTransit, getCoreTrail, getListSlot, getTransit, parseHexColor,
  type Particle, type Point, type Rect, type Rgb, type TransitView,
} from '../lib/cardParticles';
import { getSharedPlanet, setAboutPlanetProvider } from '../lib/sharedPlanet';
import { subscribeToScroll } from '../lib/scrollObserver';
import styles from './About.module.css';

type AboutKind = 'learn' | 'apps' | 'hardware' | 'trust';
interface AboutCardData {
  icon: typeof GraduationCap;
  title: string;
  description: string;
  accent: string;
  kind: AboutKind;
  label: string;
}

const ABOUT_CARDS: AboutCardData[] = [
  {
    icon: GraduationCap,
    title: '情報系の学生',
    description: '大学で情報工学を学びながら，授業の枠を超えて日々新しい技術を吸収しています．',
    accent: '#7297c9', kind: 'learn', label: 'LEARNING',
  },
  {
    icon: Smartphone,
    title: 'iOS / macOSアプリ開発',
    description: `2025年6月から，Swift / SwiftUI で iPhone・Mac のアプリを${SWIFT_APPS.length}本つくり，ソースコードを公開しています．`,
    accent: '#9a86c5', kind: 'apps', label: 'APP DEVELOPMENT',
  },
  {
    icon: Cpu,
    title: '組込み・電子工作',
    description: 'C / Arduino を使ったハードウェア寄りの開発も好きで，ソフトとハードの両面から物事を考えます．',
    accent: '#69a797', kind: 'hardware', label: 'HARDWARE',
  },
  {
    icon: HeartHandshake,
    title: '「Trust」を軸に',
    description: '「信頼されるソフトウェア」を目標に，使う人の体験を最優先した設計と丁寧な実装を心がけています．',
    accent: '#c79479', kind: 'trust', label: 'GUIDING PRINCIPLE',
  },
];

// 惑星（ProductShowcase の点描の惑星と同じ要素）の大きさと，カードの右上の角からの余白（px）
const PLANET_SIZE = 220;
const PLANET_INSET = 26;

// 見出しの下の一文．カードと同じ数（4）の区切りに分け，k 番目の区切りが k 番目のカードへ向かって灯る
// （学生 → アプリ → ハードウェア → 信頼）．区切りの中は，文節ごとに左から順に灯る
const ABOUT_STATEMENT: string[][] = [
  ['情報系の学生として，'],
  ['ソフトウェアから'],
  ['ハードウェアまで', '幅広い開発に', '取り組んでいます．'],
  ['つくるものすべてに', '共通する軸は', '「信頼」です．'],
];

// 一文の表示．灯り具合は CSS 変数 --lit-k（About が固定表示のときだけ書く）から決まり，無ければ全文が灯った状態になる
function AboutStatement() {
  return <>
    {ABOUT_STATEMENT.map((chunks, segment) => chunks.map((text, index) => <span key={`${segment}-${index}`} className={styles.chunk}
      style={{ '--seg': `var(--lit-${segment}, 1)`, '--w': index, '--m': chunks.length } as CSSProperties}>{text}</span>))}
  </>;
}

const PIN_QUERY = '(min-width: 1000px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)';
const TOP = 64;
const CARD_COUNT = ABOUT_CARDS.length;
// 粒子が枠の外へ散れるように，カードを置く場所の外側へ取る描画面の余白（px）
const PARTICLE_MARGIN = 180;
// 描画面の細かさの上限（高密度の画面でも粒子の描画が重くならないように）
const PIXEL_RATIO_CAP = 2;
// 粒子の大きさの基準にするカードの幅（px）
const REFERENCE_CARD_WIDTH = 560;
// 描画の色（章の色とは別に，粒子の一部に使う墨色）が読めなかったときの色
const FALLBACK_INK: Rgb = [29, 29, 31];

// 画面で使われている文字色（rgb(...) または color(srgb ...)）を 0〜255 の三つ組にする
function readInkColor(element: Element): Rgb {
  const value = getComputedStyle(element).color;
  const numbers = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!numbers || numbers.length < 3 || numbers.some(Number.isNaN)) return FALLBACK_INK;
  const factor = value.startsWith('color(') ? 255 : 1;
  return [Math.round(numbers[0] * factor), Math.round(numbers[1] * factor), Math.round(numbers[2] * factor)];
}

// カードの 1 枚．4 枚とも常に置いてあり（検索や読み上げにも残る），いま正面の 1 枚だけが見える
function AboutCard({ card, index, active, cardRef, labelRef }: {
  card: AboutCardData; index: number; active: boolean; cardRef: Ref<HTMLElement>; labelRef: Ref<HTMLSpanElement>;
}) {
  const Icon = card.icon;
  const slot = CARD_SLOTS[index];
  // 外側の枠（slot）が場所と影を持ち，内側のカードが消える・現れるときの切り抜き（mask）を受ける．
  // 影は枠のほうに付けて，切り抜きに合わせて影も一緒に消えるようにする
  return <div className={styles.slot} data-active={active}
    style={{ '--about-accent': card.accent, '--slot-x': slot.x, '--slot-y': slot.y } as CSSProperties}>
    <article ref={cardRef} className={styles.card} data-active={active} aria-hidden={!active}>
      <div className={styles.top}>
        <span className={styles.icon}><Icon size={26} aria-hidden="true" /></span>
      </div>
      <div className={styles.copy}>
        <span ref={labelRef} className={styles.label} aria-hidden="true">{card.label}</span>
        <h3>{card.title}</h3>
        <p>{card.description}</p>
      </div>
    </article>
  </div>;
}

// 測った寸法（カードの位置・惑星を置く位置・描画面の設定）．画面の大きさが変わるたびに測り直す
interface Layout {
  view: TransitView;
  rects: Rect[];
  // 各カードの右上の角に置く惑星の左上の位置（カードを置く場所 deck の左上から測る）
  planetSpots: Point[];
  ink: Rgb;
}

export function About() {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const deck = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const progressLine = useRef<HTMLSpanElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const layout = useRef<Layout | null>(null);
  const particles = useRef<Particle[] | null>(null);
  const position = useRef(0);
  const drawn = useRef(false);
  const activeIndex = useRef(0);
  const pinned = useRef(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // カードの位置・核の位置・描画面を測る（固定表示のときだけ）
  const measure = useCallback(() => {
    const field = deck.current, surface = canvas.current;
    if (!field || !surface || !pinned.current) { layout.current = null; return; }
    const fieldBox = field.getBoundingClientRect();
    const boxes = cards.current.map(card => card?.getBoundingClientRect());
    if (boxes.some(box => !box) || fieldBox.width === 0) { layout.current = null; return; }
    const rects = boxes.map(box => ({ x: box!.left - fieldBox.left, y: box!.top - fieldBox.top, w: box!.width, h: box!.height }));
    // 惑星は各カードの右上の角に置く
    const planetSpots = rects.map(rect => ({ x: rect.x + rect.w - PLANET_INSET - PLANET_SIZE, y: rect.y + PLANET_INSET }));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_CAP);
    const width = fieldBox.width + PARTICLE_MARGIN * 2, height = fieldBox.height + PARTICLE_MARGIN * 2;
    surface.width = Math.round(width * pixelRatio); surface.height = Math.round(height * pixelRatio);
    surface.style.width = `${width}px`; surface.style.height = `${height}px`;
    surface.style.left = `${-PARTICLE_MARGIN}px`; surface.style.top = `${-PARTICLE_MARGIN}px`;
    layout.current = {
      view: {
        width, height, pixelRatio, origin: { x: PARTICLE_MARGIN, y: PARTICLE_MARGIN },
        scale: rects[0].w / REFERENCE_CARD_WIDTH,
      },
      rects, planetSpots, ink: readInkColor(field),
    };
    drawn.current = false;
  }, []);

  // 粒子を描く．カードが正面にあるあいだは何も描かない
  const paint = useCallback((value: number) => {
    const context = canvas.current?.getContext('2d');
    const info = layout.current;
    if (!context || !info) return;
    const transit = getTransit(value, CARD_COUNT);
    if (!transit) {
      if (drawn.current) { clearTransit(context, info.view); drawn.current = false; }
      return;
    }
    particles.current ??= createParticles();
    drawTransit(
      context, particles.current, info.rects[transit.from], info.rects[transit.to],
      transit.progress, 1 - getFlipPresence(value), info.view,
      { from: parseHexColor(ABOUT_CARDS[transit.from].accent), to: parseHexColor(ABOUT_CARDS[transit.to].accent), ink: info.ink },
    );
    drawn.current = true;
  }, []);

  // 惑星の位置．惑星は ProductShowcase の点描の惑星と同じ 1 つの要素で，アプリ紹介から飛んできて，ここで引き継がれる．
  // 自己紹介の固定表示が始まってからは，カードの右上の角に置き，カードが粒子になるあいだも消さずに，
  // 次のカードの右上の角へ弧を描いて運ぶ（それまでの位置は ProductShowcase が決める）
  const placePlanet = useCallback((value: number) => {
    const planet = getSharedPlanet();
    const runway = track.current, field = deck.current, info = layout.current;
    const viewport = stage.current;
    if (!planet || !runway || !field || !info || !viewport) return;
    const bounds = runway.getBoundingClientRect();
    // 固定表示のあいだだけ預かる．始まる前は ProductShowcase，終わったあとは PlanetTail（ページの最後まで残す）が動かす
    const pastEnd = bounds.top - TOP + (bounds.height - viewport.offsetHeight) < -0.5;
    if (bounds.top > TOP + 0.5 || pastEnd) return;
    const transit = getTransit(value, CARD_COUNT);
    const index = Math.min(CARD_COUNT - 1, Math.max(0, Math.round(value)));
    const spot = transit
      ? getCoreTrail(info.planetSpots[transit.from], info.planetSpots[transit.to], transit.progress, PLANET_ARC * info.view.scale)
      : info.planetSpots[index];
    const fieldBox = field.getBoundingClientRect();
    planet.setDetail(0);
    planet.setTone(0);
    planet.setHeroVisibility(0);
    planet.setAutoRotate(true);
    planet.setFrame({ left: fieldBox.left + spot.x, top: fieldBox.top + spot.y, size: PLANET_SIZE });
  }, []);

  // カードの位置（0〜3 の実数）と進捗を反映する．
  // カードの濃さ・一文の灯り・ラベル・粒子は，どれも同じ位置から計算して直接書き，再描画は選択中の項目が変わるときだけ起こす
  const apply = useCallback((value: number, progress: number) => {
    const index = Math.min(CARD_COUNT - 1, Math.max(0, Math.round(value)));
    const presence = getFlipPresence(value);
    position.current = value;
    activeIndex.current = index;
    if (progressLine.current) progressLine.current.style.transform = `scaleX(${progress})`;
    deck.current?.style.setProperty('--card-presence', presence.toFixed(3));
    // 崩れていくカードは左から先に消え，再形成されるカードは左から先に現れる（粒子の動き出しと同じ向き）．
    // 切り抜きの向きは，次へ離れていくとき（位置が整数より大きい）は右から，戻ってくるときは左から数える
    deck.current?.style.setProperty('--mask-dir', value > index ? '270deg' : '90deg');
    // 項目の一覧（情報系の学生 …）は，カードと反対側に立ち，カードの高さに合わせて動く．固定表示のときだけ
    const listSlot = getListSlot(value);
    if (pinned.current) {
      body.current?.style.setProperty('--list-x', listSlot.x.toFixed(4));
      body.current?.style.setProperty('--list-y', listSlot.y.toFixed(4));
    } else {
      body.current?.style.removeProperty('--list-x');
      body.current?.style.removeProperty('--list-y');
    }
    // 一文の灯り．固定表示のときだけスクロールに連動させ，そうでなければ全文を灯した状態にする
    ABOUT_STATEMENT.forEach((_, segment) => {
      if (pinned.current) stage.current?.style.setProperty(`--lit-${segment}`, getFlipLight(value, segment).toFixed(3));
      else stage.current?.style.removeProperty(`--lit-${segment}`);
    });
    // 小さな英字ラベル：カードが粒子になるほど文字が並べ替わり，カードが戻ると左から順に元へ戻る
    ABOUT_CARDS.forEach((card, cardIndex) => {
      const label = labels.current[cardIndex];
      if (label) label.textContent = cardIndex === index && pinned.current ? getShuffledLabel(card.label, presence) : card.label;
    });
    if (pinned.current) { paint(value); placePlanet(value); }
    setActive(previous => (previous === index ? previous : index));
  }, [paint, placePlanet]);

  useEffect(() => {
    const runway = track.current, viewport = stage.current, field = deck.current;
    if (!runway || !viewport || !field) return;
    const media = matchMedia(PIN_QUERY);
    let unsubscribe = () => {};
    const remeasure = () => { measure(); paint(position.current); if (pinned.current) placePlanet(position.current); };
    const scrollMeasure = () => {
      if (!pinned.current) return;
      const bounds = runway.getBoundingClientRect();
      const state = getShowcaseScrollState(bounds.top, bounds.height, viewport.offsetHeight, TOP, CARD_COUNT);
      apply(getFlipPosition(state.progress, CARD_COUNT), state.progress);
    };
    const configure = () => {
      unsubscribe(); pinned.current = media.matches;
      runway.toggleAttribute('data-pin', media.matches);
      if (media.matches) unsubscribe = subscribeToScroll(scrollMeasure);
      else { unsubscribe = () => {}; layout.current = null; apply(activeIndex.current, (activeIndex.current + 1) / CARD_COUNT); }
      requestAnimationFrame(remeasure);
    };
    configure();
    const resize = new ResizeObserver(() => { remeasure(); scrollMeasure(); });
    resize.observe(runway); resize.observe(viewport); resize.observe(field);
    // テーマの切り替えで文字の色（墨色の粒子）が変わるので測り直す
    const theme = new MutationObserver(remeasure);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    media.addEventListener('change', configure);
    window.addEventListener('pageshow', scrollMeasure);
    return () => {
      unsubscribe(); resize.disconnect(); theme.disconnect();
      media.removeEventListener('change', configure); window.removeEventListener('pageshow', scrollMeasure);
    };
  }, [apply, measure, paint, placePlanet]);

  // ProductShowcase へ，惑星の着地点（最初のカードの右上の角）と，自己紹介の固定表示が始まるスクロール位置を伝える．
  // 小画面・動きを減らす設定（固定表示でないとき）は伝えない．その場合，惑星はアプリ紹介と一緒に画面から出ていく
  useEffect(() => {
    setAboutPlanetProvider(() => {
      const runway = track.current, field = deck.current, info = layout.current;
      if (!pinned.current || !runway || !field || !info) return null;
      const bounds = runway.getBoundingClientRect();
      const fieldBox = field.getBoundingClientRect();
      const spot = info.planetSpots[0];
      const last = info.planetSpots[CARD_COUNT - 1];
      const startScroll = window.scrollY + bounds.top - TOP;
      const endScroll = startScroll + (bounds.height - (stage.current?.offsetHeight ?? 0));
      // 固定表示が終わるときの枠：終わったあとは，カードが上へ流れる分だけ戻して求める（固定表示のあいだは動かない）
      const shift = Math.max(0, window.scrollY - endScroll);
      return {
        left: fieldBox.left + spot.x, top: fieldBox.top + spot.y, size: PLANET_SIZE,
        startScroll, owns: bounds.top <= TOP + 0.5, endScroll,
        finalLeft: fieldBox.left + last.x, finalTop: fieldBox.top + shift + last.y,
      };
    });
    return () => setAboutPlanetProvider(null);
  }, []);

  function select(index: number) {
    const runway = track.current, viewport = stage.current;
    if (pinned.current && runway && viewport) {
      // 固定表示の間は，その章の位置までスクロールして，間のカードも順に粒子になって見せる（選択はスクロールに追従する）
      const bounds = runway.getBoundingClientRect();
      const offset = getShowcaseChapterOffset(index, CARD_COUNT, bounds.height - viewport.offsetHeight);
      window.scrollTo({ top: window.scrollY + bounds.top - TOP + offset, behavior: 'smooth' });
      return;
    }
    apply(index, (index + .5) / CARD_COUNT);
  }
  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowRight': case 'ArrowDown': next = (index + 1) % CARD_COUNT; break;
      case 'ArrowLeft': case 'ArrowUp': next = (index - 1 + CARD_COUNT) % CARD_COUNT; break;
      case 'Home': next = 0; break;
      case 'End': next = CARD_COUNT - 1; break;
      default: return;
    }
    event.preventDefault(); select(next); buttons.current[next]?.focus({ preventScroll: true });
  }

  return <section id="about" data-testid="about-section" data-scroll-actor className={styles.section}>
    <div ref={track} className={styles.track}>
      <div ref={stage} className={styles.stage}>
        <div className={styles.heading}>
          <SectionHeading label="01. About Me" title="自己紹介" descriptionContent={<AboutStatement />} />
        </div>
        <div ref={body} className={styles.body}>
          <div className={styles.chapters} role="tablist" aria-label="自己紹介の項目を選択">
            {ABOUT_CARDS.map((card, index) => <button key={card.kind} ref={node => { buttons.current[index] = node; }}
              type="button" role="tab" id={`about-step-${index}`} aria-selected={active === index}
              aria-controls="about-active-panel" tabIndex={active === index ? 0 : -1}
              onClick={() => select(index)} onKeyDown={event => handleKey(event, index)}>
              <span className={styles.chapterNumber}>0{index + 1}</span><span>{card.title}</span>
            </button>)}
          </div>
          <div ref={deck} className={styles.cardStack} id="about-active-panel" role="tabpanel" aria-labelledby={`about-step-${active}`}>
            {ABOUT_CARDS.map((card, index) => <AboutCard key={card.kind} card={card} index={index} active={active === index}
              cardRef={node => { cards.current[index] = node; }} labelRef={node => { labels.current[index] = node; }} />)}
            <canvas ref={canvas} className={styles.particles} aria-hidden="true" />
          </div>
        </div>
        <footer className={styles.footer}>
          <span className={styles.scrollHint}><ArrowDown size={13} aria-hidden="true" /> スクロールでカードが粒子になって次へ</span>
          <span className={styles.selectHint}>項目を選んで自己紹介を見る</span>
          <span className={styles.progress} aria-hidden="true"><span ref={progressLine} /></span>
          <a href="#skills">使っている技術へ <ArrowDown size={14} aria-hidden="true" /></a>
        </footer>
      </div>
    </div>
  </section>;
}
