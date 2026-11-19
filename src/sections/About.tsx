"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { SWIFT_APPS } from '../data/apps';
import { useCanvasLoop, type CanvasFrame } from '../hooks/useCanvasLoop';
import { useTheme, type Theme } from '../hooks/useTheme';
import {
  BRAIN_VIEW_X,
  BRAIN_VIEW_Y,
  CAMERA_DISTANCE,
  CHAPTER_FIGURE_X,
  createAboutFigure,
  createPointTraits,
  createRandom,
  getAnchoredAboutPhase,
  getCameraParallax,
  getCrumbleCloudPoint,
  getCrumbleDelay,
  getCrumbleWeights,
  getDustParallax,
  getFigureCenterX,
  getPointMix,
  getReformDelay,
  getScrollReveal,
  projectPoint,
  projectTetra,
  rotatePoint,
  SPHERE_RADIUS,
  TETRA_EDGES,
  type AboutFigure,
  type AboutFigureKind,
} from '../lib/aboutFigures';
import { getShowcaseScrollState } from '../lib/showcaseStory';
import { createPlanetPoints, projectPlanetPoints, type ProjectedPlanetPoint } from '../lib/planetPoints';
import { getSharedPlanet, setAboutPlanetProvider } from '../lib/sharedPlanet';
import { subscribeToScroll } from '../lib/scrollObserver';
import styles from './About.module.css';

interface AboutChapter {
  kind: AboutFigureKind;
  label: string;
  title: string;
  // 題名を折り返してよい区切り（つなげると title になる．語の途中では折り返さない）
  titleParts: string[];
  description: string;
}

const ABOUT_CHAPTERS: AboutChapter[] = [
  {
    kind: 'learn', label: 'LEARNING', title: '情報系の学生', titleParts: ['情報系の', '学生'],
    description: '大学で情報工学を学びながら，授業の枠を超えて日々新しい技術を吸収しています．',
  },
  {
    kind: 'apps', label: 'APP DEVELOPMENT', title: 'iOS / macOSアプリ開発', titleParts: ['iOS / macOS', 'アプリ開発'],
    description: `2025年6月から Swift / SwiftUI での個人開発を本格化し，iPhone・Mac 向けに${SWIFT_APPS.length}本のプロダクトを制作．企画から設計・実装・公開まで一貫して1人で手がけ，すべてのソースコードを GitHub に公開しています．`,
  },
  {
    kind: 'hardware', label: 'HARDWARE', title: '組込み・電子工作', titleParts: ['組込み・', '電子工作'],
    description: 'C / Arduino を使ったハードウェア寄りの開発も好きで，ソフトとハードの両面から物事を考えます．',
  },
  {
    kind: 'trust', label: 'GUIDING PRINCIPLE', title: '「Trust」を軸に', titleParts: ['「Trust」を', '軸に'],
    description: '「信頼されるソフトウェア」を目標に，使う人の体験を最優先した設計と丁寧な実装を心がけています．',
  },
];
const CHAPTER_COUNT = ABOUT_CHAPTERS.length;

// 点描の惑星の絵の中で，球の半径が枠の一辺に占める割合（lib/planetPoints.ts の projectPlanetPoints と同じ値）
const PLANET_RADIUS_SHARE = 0.43;
// 惑星は 520px より小さく表示すると点を大きく描く（dotPlanetCanvas の dotBoost）．その基準の大きさと，最も大きく描く倍率
const PLANET_BOOST_BASE_SIZE = 520;
const PLANET_BOOST_MAX = 1.5;

// 固定表示にする条件：広い画面で，動きを減らさない設定のとき．それ以外は，4 枚を並べた普通の表示
const PIN_QUERY = '(min-width: 1000px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)';

// ===== 図形の描き方 =====
// 図形は，小さな線の正四面体（三角錐）の集まりで描く．考え方は dala.craftedbygc.com の解析（線の三角錐の群れが形を変える）を参考にした．
// 色・形・文言は自前のもの（docs の解析結果を写していない）．
// 背景固定表示の図形：各章の水平中心位置（CHAPTER_FIGURE_X）と垂直中心・半分の大きさ（高さ・幅に対する割合の小さいほう）
const FIGURE_CENTER_Y = 0.5;
const FIGURE_HALF_BY_HEIGHT = 0.39;
const FIGURE_HALF_BY_WIDTH = 0.24;
// カード（普通の表示）の図形：枠に対する半分の大きさと，点の半径（px）の最小・最大
const STILL_FIGURE_HALF = 0.36;
const STILL_RADIUS_MIN = 0.5;
const STILL_RADIUS_MAX = 1;
// カードの図形を見る向き（左右へ回す角度．ラジアン．脳は BRAIN_VIEW_X / Y を共有）
const STILL_TILT = 0.5;
// テーマごとの図形配色（ライトの白背景では墨色基調＋濃い宝石色，ダークの黒背景では白基調＋発色のよい光色）
interface AboutLook {
  ink: string;
  brainGold: string;
  brainPurple: string;
  brainTeal: string;
  accents: readonly [string, string, string, string];
  frontAlpha: number;
  backAlpha: number;
  looseAlpha: number;
  nearAlpha: number;
  dimAlpha: number;
  auraAlpha: number;
  rimGlowAlpha: number;
  dustAlpha: number;
}

const ABOUT_LOOKS: Record<Theme, AboutLook> = {
  light: {
    ink: '#16161a',
    brainGold: '#d67e00',
    brainPurple: '#632ae0',
    brainTeal: '#08876a',
    accents: ['#a85d00', '#6938d8', '#0b8468', '#1466d6'],
    frontAlpha: 0.95,
    backAlpha: 0.16,
    looseAlpha: 0.72,
    nearAlpha: 0.52,
    dimAlpha: 0.4,
    auraAlpha: 0.08,
    rimGlowAlpha: 0.15,
    dustAlpha: 0.26,
  },
  dark: {
    ink: '#f7f4ee',
    brainGold: '#ffd02b',
    brainPurple: '#965eff',
    brainTeal: '#24d4ac',
    accents: ['#ffb829', '#9b6bff', '#24d4ac', '#6db2ff'],
    frontAlpha: 0.95,
    backAlpha: 0.13,
    looseAlpha: 0.84,
    nearAlpha: 0.66,
    dimAlpha: 0.34,
    auraAlpha: 0.11,
    rimGlowAlpha: 0.17,
    dustAlpha: 0.36,
  },
};
// 章の色でない粒の色の分け方：点ごとの性質（0〜1）がこの値までは白，その先は，ほかの章の色を順に使う
const INK_SHARE = 0.66;
// 三角錐の大きさ（中心から頂点まで．px）．点ごとの性質で最小〜最大にばらつく
const TETRA_SIZE_MIN = 3.4;
const TETRA_SIZE_MAX = 6.9;
// 向こう側の隠れ面の判定：脳は裏側の壁や反対半球の縁が手前に透けて筋にならないよう浅めの閾値で奥へ沈める
const BRAIN_BACK_LIMIT = 0.16;
// 縁の粒：面の向きが視線に対して横を向いている（輪郭にあたる）粒．法線の奥行き成分の大きさがこの値より小さければ縁とみなす
const RIM_LIMIT = 0.58;
const RIM_SIZE_SCALE = 1.04;
// 手前の面の粒：正面を向くほど大きく，縁へ向かって小さくなる（縁に近い粒の大きさの割合）
const FRONT_SIZE_MIN = 0.78;
// 向こう側を向いた面の粒は，小さく淡く描く（立体の裏が透けて見える）
const BACK_SIZE_SCALE = 0.64;
// 三角錐が回る速さ（ラジアン / ミリ秒）．点ごとの性質で 0.4〜1 倍
const TETRA_SPIN_SPEED = 0.0012;
// 三角錐の基準の向き（上向きの三角に見える角度．ラジアン）と，そこからの揺れ幅
const TETRA_BASE_SPIN = 0.785;
const TETRA_BASE_PITCH = -0.62;
const TETRA_WOBBLE = 0.45;
// 濃さと線の太さの段階：0 は手前の面と縁，1 は向こう側の面，2 は空間の中景，3 は脳幹や極遠景・極近景，4 は手前を通る大きな近景三角錐
const LEVEL_FRONT = 0;
const LEVEL_BACK = 1;
const LEVEL_LOOSE = 2;
const LEVEL_DIM = 3;
const LEVEL_NEAR = 4;
const LEVEL_WIDTHS = [1.14, 0.94, 1.32, 0.95, 2.25] as const;
const NEAR_CULL_Z = CAMERA_DISTANCE - 0.45;
const NEAR_GHOST_Z = CAMERA_DISTANCE - 0.72;
const MAX_TETRA_SIZE = 54;
const RIM_GLOW_WIDTH = 2.8;
// 3D 空間へ崩れ出たとみなす重みの下限
const LOOSE_FROM = 0.22;
// 止まっているときの，粒のわずかな漂い（図形の半分の大きさに対する割合）と速さ（ラジアン / ミリ秒）
const DRIFT_AMOUNT = 0.006;
const DRIFT_SPEED = 0.0011;
// 図形の板がゆっくり左右へ振れる角度（ラジアン）と速さ
const SWAY_ANGLE = 0.11;
// 立体を少し見上げる基準角度（ラジアン．縦方向には動かさず，脳の章も他章と同じ高さ基準を保つ）
const BASE_TILT_X = BRAIN_VIEW_X;
const SWAY_SPEED = 0.00036;
// カーソルへの追従の速さ（1 ミリ秒あたりの寄り）と，カーソルが粒を押しのける半径・強さ（px）
const POINTER_FOLLOW = 0.0052;
const REPEL_RADIUS = 130;
const REPEL_PUSH = 20;
// 図形の後ろの淡い光（章の色）：半径（半分の大きさに対する割合）
const AURA_RADIUS = 1.7;
// 面の全体に漂う三角錐：数，近景太線レイヤーの閾値，大きさ（px）の最小・最大，流れる速さ
const DUST_COUNT = 78;
const DUST_NEAR_DEPTH = 0.68;
const DUST_SIZE_MIN = 3;
const DUST_SIZE_MAX = 30;
const DUST_SPEED = 0.000012;
const DUST_SEED = 91;
// 粒が現れる元の，惑星の点の数（点描の惑星 DotPlanet と同じ並びを作る）
const PLANET_POINT_COUNT = 1800;
// 惑星の絵が薄れ切る，現れ具合（0〜1）．ここまでに粒が惑星の点と入れ替わる
const PLANET_FADE_UNTIL = 0.45;
// 現れ具合がこの値より小さい粒は，惑星の点と同じ丸い点として描く（その先は海を越えて立体へ集まる）
const DOT_UNTIL = 0.08;
const FULL_TURN = Math.PI * 2;

// 色（#rrggbb）に濃さを付けた rgb() の表記
function withAlpha(color: string, alpha: number): string {
  const value = Number.parseInt(color.slice(1), 16);
  return `rgb(${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255} / ${alpha})`;
}

// 線分（x1, y1, x2, y2 を並べた配列）を，1 回の線引きでまとめて描く
function strokeSegments(context: CanvasRenderingContext2D, segments: number[], color: string, alpha: number, width: number) {
  if (segments.length === 0) return;
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  for (let index = 0; index < segments.length; index += 4) {
    context.moveTo(segments[index], segments[index + 1]);
    context.lineTo(segments[index + 2], segments[index + 3]);
  }
  context.stroke();
}

// 三角錐 1 つの 6 本の辺を，線分の配列へ足す（corners は projectTetra の結果）
function pushTetra(segments: number[], corners: number[], x: number, y: number, size: number) {
  for (const [from, to] of TETRA_EDGES) {
    segments.push(x + corners[from * 2] * size, y + corners[from * 2 + 1] * size, x + corners[to * 2] * size, y + corners[to * 2 + 1] * size);
  }
}

// 見出しの下の一文．句ごとに分けて，読点で自然に折り返す
const ABOUT_STATEMENT: string[][] = [
  ['情報系の学生として，'],
  ['ソフトウェアから'],
  ['ハードウェアまで', '幅広い開発に', '取り組んでいます．'],
  ['つくるものすべてに', '共通する軸は', '「信頼」です．'],
];

function AboutStatement() {
  return <>
    {ABOUT_STATEMENT.map((chunks, segment) => chunks.map((text, index) => <span key={`${segment}-${index}`} className={styles.chunk}>{text}</span>))}
  </>;
}

const pad = (value: number) => String(value).padStart(2, '0');
const chapterStyle = (accent: string) => ({ '--about-accent': accent }) as CSSProperties;

// 点をまとめて描く（同じ色の点は 1 回の塗りにする）
function fillDots(context: CanvasRenderingContext2D, dots: number[], color: string) {
  if (dots.length === 0) return;
  context.fillStyle = color;
  context.beginPath();
  for (let index = 0; index < dots.length; index += 3) {
    context.moveTo(dots[index] + dots[index + 2], dots[index + 1]);
    context.arc(dots[index], dots[index + 1], dots[index + 2], 0, FULL_TURN);
  }
  context.fill();
}

// 題名を 1 文字ずつの枠に分ける（読み上げ用の全文は別に置く）．折り返しは区切り（parts）の間だけ
function SplitTitle({ text, parts }: { text: string; parts: string[] }) {
  let order = 0;
  return <>
    <span className="sr-only">{text}</span>
    <span className={styles.titleLine} aria-hidden="true">
      {parts.map((part, partIndex) => <span key={partIndex} className={styles.titlePart}>
        {Array.from(part).map(character => {
          const index = order;
          order += 1;
          return character === ' '
            ? <span key={index} className={styles.space}> </span>
            : <span key={index} className={styles.charMask}><span className={styles.char} style={{ '--i': index } as CSSProperties}>{character}</span></span>;
        })}
      </span>)}
    </span>
  </>;
}

// 脳の tone（0〜1）から参考サイト配色（白・金・紫・ティール）の番号と，溝の奥（控えめに沈める粒）を判定する
const brainColorIndex = (tone: number) => (tone < 0.3 ? 0 : tone < 0.58 ? 1 : tone < 0.82 ? 2 : 3);
const isBrainSulcus = (tone: number) => tone < 0.1 || (tone >= 0.3 && tone < 0.4) || (tone >= 0.58 && tone < 0.66) || (tone >= 0.82 && tone < 0.88);

// 普通の表示（カード）に置く，動かない図形
function StillFigure({ figure, accent, kind, theme }: { figure: AboutFigure; accent: string; kind: AboutFigureKind; theme: Theme }) {
  const traits = useMemo(() => createPointTraits(), []);
  const look = ABOUT_LOOKS[theme];
  const draw = useCallback((context: CanvasRenderingContext2D, frame: CanvasFrame) => {
    const half = Math.min(frame.width, frame.height) * STILL_FIGURE_HALF;
    const buckets: [number[], number[], number[], number[]] = [[], [], [], []];
    const palette = kind === 'learn'
      ? [look.ink, look.brainGold, look.brainPurple, look.brainTeal]
      : [look.ink, accent, accent, accent];
    for (let index = 0; index < figure.points.length / 3; index += 1) {
      // 脳は横方向（BRAIN_VIEW_Y）だけ正面寄りへ回して左右の割れ目を見せる．他章は輪や板が読める角度に保つ
      const ty = kind === 'learn' ? BRAIN_VIEW_Y : STILL_TILT;
      const point = projectPoint(figure.points[index * 3], figure.points[index * 3 + 1], figure.points[index * 3 + 2], BASE_TILT_X, ty);
      const facing = projectPoint(figure.normals[index * 3], figure.normals[index * 3 + 1], figure.normals[index * 3 + 2], BASE_TILT_X, ty).depth;
      if (facing < (kind === 'learn' ? -BRAIN_BACK_LIMIT : -RIM_LIMIT)) continue;
      const inSulcus = kind === 'learn' && isBrainSulcus(figure.tones[index]);
      const radius = (STILL_RADIUS_MIN + (STILL_RADIUS_MAX - STILL_RADIUS_MIN) * traits.sizes[index]) * (inSulcus ? 0.55 : 1);
      const slot = kind === 'learn' ? brainColorIndex(figure.tones[index]) : (Math.abs(facing) < RIM_LIMIT ? 1 : 0);
      buckets[slot].push(frame.width / 2 + point.x * half, frame.height / 2 + point.y * half, radius);
    }
    buckets.forEach((dots, slot) => fillDots(context, dots, palette[slot]));
  }, [figure, traits, accent, kind, look]);
  // 時間で動かさない（テーマが変わったときも即座に描き直す）
  const { canvasRef, redraw } = useCanvasLoop({ draw, paused: true });
  useEffect(() => { redraw(); }, [draw, redraw]);
  return <canvas ref={canvasRef} className={styles.stillFigure} aria-hidden="true" />;
}

export function About() {
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const look = ABOUT_LOOKS[theme];
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const copies = useRef<(HTMLElement | null)[]>([]);
  const anchorsRef = useRef<number[]>([]);
  const pinnedRef = useRef(false);
  // 惑星の濃さを，いま自己紹介が決めているか
  const owningPlanet = useRef(false);
  const progressRef = useRef(0);
  // カーソルの位置（舞台の座標 px と画面中央基準の正規化座標 -1〜+1）．target は実際の位置，current はなめらかに追う位置
  const pointer = useRef({
    targetX: 0, targetY: 0, currentX: 0, currentY: 0,
    targetNx: 0, targetNy: 0, currentNx: 0, currentNy: 0,
    active: false, strength: 0,
  });

  const figures = useMemo(() => ABOUT_CHAPTERS.map(chapter => createAboutFigure(chapter.kind)), []);
  const traits = useMemo(() => createPointTraits(), []);

  // 惑星の位置．惑星は ProductShowcase の点描の惑星と同じ 1 つの要素で，アプリ紹介から飛んできて，ここで引き継がれる．
  // 着地点は，指定された水平中心位置にある立体（球）とちょうど重なる場所と大きさ（入口は右，出口は左）
  // （それまでは ProductShowcase，終わったあとは PlanetTail が動かす）
  const getPlanetSpotForX = useCallback((centerRatioX: number) => {
    const width = document.documentElement.clientWidth;
    const height = stage.current?.offsetHeight || window.innerHeight;
    const half = Math.min(height * FIGURE_HALF_BY_HEIGHT, width * FIGURE_HALF_BY_WIDTH);
    const size = half * SPHERE_RADIUS / PLANET_RADIUS_SHARE;
    return { left: width * centerRatioX - size / 2, top: height * FIGURE_CENTER_Y - size / 2, size };
  }, []);
  const measureAnchors = useCallback(() => {
    const runway = track.current, viewport = stage.current;
    if (!pinnedRef.current || !runway || !viewport) { anchorsRef.current = []; return; }
    const trackRect = runway.getBoundingClientRect();
    const viewportHeight = viewport.offsetHeight || window.innerHeight;
    const travel = Math.max(1, runway.offsetHeight - viewportHeight);
    const anchors = copies.current
      .map((copy) => {
        if (!copy) return Number.NaN;
        const box = copy.getBoundingClientRect();
        const centerInTrack = (box.top - trackRect.top) + box.height / 2;
        return Math.min(0.95, Math.max(0.05, (centerInTrack - viewportHeight / 2) / travel));
      })
      .filter((value) => Number.isFinite(value));
    anchorsRef.current = anchors.length === CHAPTER_COUNT ? anchors : [];
  }, []);
  const placePlanet = useCallback(() => {
    const planet = getSharedPlanet();
    const runway = track.current, viewport = stage.current;
    if (!planet || !runway || !viewport) return;
    const bounds = runway.getBoundingClientRect();
    const pastEnd = bounds.top + (bounds.height - viewport.offsetHeight) < -0.5;
    if (bounds.top > 0.5 || pastEnd) {
      // 固定表示の外へ出たら，惑星の絵を元の濃さへ戻す（1 度だけ．そのあとは ProductShowcase・PlanetTail が決める）
      if (owningPlanet.current) { planet.setOpacity(1); owningPlanet.current = false; }
      return;
    }
    owningPlanet.current = true;
    // 粒が惑星の点から現れるにつれて，惑星の絵は薄れる．ライト表示では背景になじむ色合いを保ち，抜ける際だけ PlanetTail の暗い球へ継ぐ
    const { emerge } = getAnchoredAboutPhase(progressRef.current, anchorsRef.current);
    const fadeShare = emerge / PLANET_FADE_UNTIL;
    const spot = getPlanetSpotForX(progressRef.current > 0.5 ? CHAPTER_FIGURE_X[CHAPTER_COUNT - 1] : CHAPTER_FIGURE_X[0]);
    planet.setOpacity(1 - Math.min(1, fadeShare));
    planet.setDetail(0);
    planet.setTone(themeRef.current === 'dark' ? 0 : progressRef.current > 0.5 ? Math.min(1, Math.max(0, fadeShare)) : 1);
    planet.setHeroVisibility(0);
    planet.setAutoRotate(true);
    planet.setFrame(spot);
  }, [getPlanetSpotForX]);

  // スクロールの進み（0〜1）を，各章の出現位置 CSS 変数へ直接書く（再描画は，主役の章が変わるときだけ）．図形は canvas の描画が同じ進みを読む
  const apply = useCallback((progress: number) => {
    if (anchorsRef.current.length !== CHAPTER_COUNT) measureAnchors();
    const { state } = getAnchoredAboutPhase(progress, anchorsRef.current);
    const viewportHeight = stage.current?.offsetHeight || window.innerHeight;
    copies.current.forEach((copy) => {
      if (!copy) return;
      const reveal = getScrollReveal(copy.getBoundingClientRect().top, viewportHeight);
      copy.style.setProperty('--r', reveal.toFixed(3));
      copy.style.setProperty('--side', '1');
    });
    setActive(previous => (previous === state.active ? previous : state.active));
    placePlanet();
  }, [measureAnchors, placePlanet]);

  // 固定表示をやめたとき，直接書いた値を消す（普通の表示は CSS だけで決まる）
  const clearInline = useCallback(() => {
    copies.current.forEach(copy => {
      copy?.style.removeProperty('--r');
      copy?.style.removeProperty('--side');
    });
  }, []);

  useEffect(() => {
    const runway = track.current, viewport = stage.current;
    if (!runway || !viewport) return;
    const media = matchMedia(PIN_QUERY);
    let unsubscribe = () => {};
    const scrollMeasure = () => {
      if (!pinnedRef.current) return;
      const bounds = runway.getBoundingClientRect();
      const state = getShowcaseScrollState(bounds.top, bounds.height, viewport.offsetHeight, 0, CHAPTER_COUNT);
      progressRef.current = state.progress;
      apply(state.progress);
    };
    const handleResize = () => {
      measureAnchors();
      scrollMeasure();
    };
    const configure = () => {
      unsubscribe();
      pinnedRef.current = media.matches;
      setPinned(media.matches);
      runway.toggleAttribute('data-pin', media.matches);
      if (media.matches) {
        measureAnchors();
        unsubscribe = subscribeToScroll(scrollMeasure);
      } else {
        anchorsRef.current = [];
        unsubscribe = () => {};
        clearInline();
      }
    };
    configure();
    const resize = new ResizeObserver(handleResize);
    resize.observe(runway); resize.observe(viewport);
    media.addEventListener('change', configure);
    window.addEventListener('pageshow', handleResize);
    return () => {
      unsubscribe(); resize.disconnect();
      media.removeEventListener('change', configure); window.removeEventListener('pageshow', handleResize);
    };
  }, [apply, clearInline, measureAnchors]);

  // 固定表示に切り替わった直後は，固定表示用の要素がまだ無いので，作られたあとにもう一度計測して反映する
  useEffect(() => { if (pinned) { measureAnchors(); apply(progressRef.current); } }, [pinned, measureAnchors, apply]);
  // テーマ切替時にも惑星の色合いを更新する
  useEffect(() => { if (owningPlanet.current) placePlanet(); }, [theme, placePlanet]);

  // ProductShowcase へ，惑星の着地点（右半分の脳の位置）と，自己紹介の固定表示が始まる・終わるスクロール位置・出口枠（最終章の左位置）を伝える．
  // 小画面・動きを減らす設定（固定表示でないとき）は伝えない．その場合，惑星はアプリ紹介と一緒に画面から出ていく
  useEffect(() => {
    setAboutPlanetProvider(() => {
      const runway = track.current, viewport = stage.current;
      if (!pinnedRef.current || !runway || !viewport) return null;
      const bounds = runway.getBoundingClientRect();
      const startSpot = getPlanetSpotForX(CHAPTER_FIGURE_X[0]);
      const endSpot = getPlanetSpotForX(CHAPTER_FIGURE_X[CHAPTER_COUNT - 1]);
      const startScroll = window.scrollY + bounds.top;
      const endScroll = startScroll + (bounds.height - viewport.offsetHeight);
      return { ...startSpot, startScroll, owns: bounds.top <= 0.5, endScroll, finalLeft: endSpot.left, finalTop: endSpot.top };
    });
    return () => setAboutPlanetProvider(null);
  }, [getPlanetSpotForX]);

  // 面の全体に漂う三角錐（位置 0〜1・奥行き 0〜1・大きさ 0〜1・色の番号・回り始めの角度）．奥行きに応じて大きさと視差を決める
  const dust = useMemo(() => {
    const random = createRandom(DUST_SEED);
    return Array.from({ length: DUST_COUNT }, () => {
      const depth = random();
      const size = Math.min(1, Math.max(0, (depth ** 2.2) * 0.84 + random() * 0.16));
      return {
        x: random(),
        y: random(),
        depth,
        size,
        color: Math.floor(random() * CHAPTER_COUNT),
        spin: random() * FULL_TURN,
      };
    });
  }, []);
  // 描くたびに使い回す入れ物（色 × 濃さの段階ごとの線分，輪郭のにじみ用線分，遠景・近景の浮遊三角，点の座標，三角錐の頂点）
  const scratch = useRef({
    segments: Array.from({ length: (CHAPTER_COUNT + 1) * LEVEL_WIDTHS.length }, () => [] as number[]),
    glowSegments: Array.from({ length: CHAPTER_COUNT + 1 }, () => [] as number[]),
    dust: Array.from({ length: CHAPTER_COUNT + 1 }, () => [] as number[]),
    dustNear: Array.from({ length: CHAPTER_COUNT + 1 }, () => [] as number[]),
    corners: [] as number[],
    // 惑星の点のままの粒（x, y, 半径, 濃さ）
    dots: [] as number[],
  });
  // 惑星の点（DotPlanet と同じ並び）と，粒が出てくる点の番号（陸の点を先に使う．陸は明るく，惑星の形が読める）
  const planetSource = useMemo(() => {
    const points = createPlanetPoints(PLANET_POINT_COUNT, 0);
    const land = points.map((point, index) => (point.land ? index : -1)).filter(index => index >= 0);
    return { points, order: land.length > 0 ? land : points.map((_, index) => index) };
  }, []);
  const planetProjected = useRef<ProjectedPlanetPoint[]>([]);

  // 図形を描く：いまの進みから「元の図形 → 広大な 3D 拡散空間 → 星雲状に先の図形」の途中の位置を単一カメラ空間で求め，遠近投影して置く．
  // 粒は回り続ける線の三角錐で，章の切り替え時は上半分を残したまま下側から山なりに崩れ広がり，次の立体へ星雲のように集まる
  const draw = useCallback((context: CanvasRenderingContext2D, frame: CanvasFrame) => {
    const { emerge, state } = getAnchoredAboutPhase(progressRef.current, anchorsRef.current);
    const figureX = getFigureCenterX(state);
    const useTo = state.mix >= 0.5;
    const activeChapter = useTo ? state.to : state.from;
    const accent = look.accents[activeChapter];
    const brainPaletteActive = activeChapter === 0 || (state.from === 0 && state.mix <= 0.55);
    // 色の番号：0 は文字基調色，1〜 はテーマに応じた章の色（脳の章では金・紫・ティールを使う）
    const palette = [
      look.ink,
      brainPaletteActive ? look.brainGold : look.accents[0],
      brainPaletteActive ? look.brainPurple : look.accents[1],
      brainPaletteActive ? look.brainTeal : look.accents[2],
      look.accents[3],
    ];
    const levelAlphas = [look.frontAlpha, look.backAlpha, look.looseAlpha, look.dimAlpha, look.nearAlpha];
    const { segments, glowSegments, dust: dustSegments, dustNear, corners, dots } = scratch.current;
    dots.length = 0;
    // 粒が現れる元：いまの惑星の点の位置（惑星の絵と同じ向きで作り，入口・出口の立体側の座標へ置く）
    const emerging = emerge < 1;
    const planet = emerging ? getSharedPlanet() : null;
    let planetLeft = 0, planetTop = 0, planetBoost = 1;
    if (planet) {
      const view = planet.getView();
      const spot = getPlanetSpotForX(progressRef.current > 0.5 ? CHAPTER_FIGURE_X[CHAPTER_COUNT - 1] : CHAPTER_FIGURE_X[0]);
      const surface = context.canvas.getBoundingClientRect();
      projectPlanetPoints(planetSource.points, view.progress, spot.size, spot.size, planetProjected.current, view.rotation, 0);
      planetLeft = spot.left - surface.left; planetTop = spot.top - surface.top;
      // 惑星の絵と同じ大きさの点にする（小さく表示するときほど，点を大きく描いている）
      planetBoost = Math.min(PLANET_BOOST_MAX, Math.max(1, 1 + (PLANET_BOOST_BASE_SIZE - spot.size) / PLANET_BOOST_BASE_SIZE));
    }
    for (const list of segments) list.length = 0;
    for (const list of glowSegments) list.length = 0;
    for (const list of dustSegments) list.length = 0;
    for (const list of dustNear) list.length = 0;

    const cursor = pointer.current;
    const follow = Math.min(1, frame.deltaMs * POINTER_FOLLOW);
    cursor.currentX += (cursor.targetX - cursor.currentX) * follow;
    cursor.currentY += (cursor.targetY - cursor.currentY) * follow;
    const goalNx = cursor.active ? cursor.targetNx : 0;
    const goalNy = cursor.active ? cursor.targetNy : 0;
    cursor.currentNx += (goalNx - cursor.currentNx) * follow;
    cursor.currentNy += (goalNy - cursor.currentNy) * follow;
    cursor.strength += ((cursor.active ? 1 : 0) - cursor.strength) * follow;
    const camera = getCameraParallax(cursor.currentNx, cursor.currentNy);

    const panX = camera.panX * frame.width * emerge;
    const panY = camera.panY * frame.height * emerge;
    const centerX = frame.width * figureX + panX, centerY = frame.height * FIGURE_CENTER_Y + panY;
    const half = Math.min(frame.height * FIGURE_HALF_BY_HEIGHT, frame.width * FIGURE_HALF_BY_WIDTH);
    const fromCenterX = frame.width * CHAPTER_FIGURE_X[state.from] + panX;
    const toCenterX = frame.width * CHAPTER_FIGURE_X[state.to] + panX;
    const seaCenterX = frame.width * 0.5 + panX;
    const fromOffsetX = (fromCenterX - seaCenterX) / Math.max(1, half);
    const toOffsetX = (toCenterX - seaCenterX) / Math.max(1, half);
    const aspectSpan = frame.width / Math.max(1, 2 * half);
    const timeSec = frame.timeMs * 0.001;
    const sway = Math.sin(frame.timeMs * SWAY_SPEED) * SWAY_ANGLE;
    // マウスによる 3D カメラのわずかなオービットを立体・拡散空間・背景三角で共有する
    const fromTiltY = (state.from === 0 ? BRAIN_VIEW_Y : 0) + sway + camera.yaw;
    const toTiltY = (state.to === 0 ? BRAIN_VIEW_Y : 0) + sway + camera.yaw;
    const tiltX = BASE_TILT_X + camera.pitch;
    const seaTiltX = camera.pitch * 0.85;
    const seaTiltY = camera.yaw * 0.85;

    // 図形の後ろの淡い光（脳は下側の金と前頭側の紫をうっすら重ね，他章は章の色を敷く）
    if (activeChapter === 0) {
      const goldAura = context.createRadialGradient(centerX + half * 0.04, centerY + half * 0.14, 0, centerX + half * 0.04, centerY + half * 0.14, half * AURA_RADIUS);
      goldAura.addColorStop(0, withAlpha(look.brainGold, look.auraAlpha));
      goldAura.addColorStop(1, withAlpha(look.brainGold, 0));
      context.fillStyle = goldAura;
      context.fillRect(0, 0, frame.width, frame.height);
      const purpleAura = context.createRadialGradient(centerX - half * 0.25, centerY - half * 0.08, 0, centerX - half * 0.25, centerY - half * 0.08, half * AURA_RADIUS * 0.85);
      purpleAura.addColorStop(0, withAlpha(look.brainPurple, look.auraAlpha * 0.65));
      purpleAura.addColorStop(1, withAlpha(look.brainPurple, 0));
      context.fillStyle = purpleAura;
      context.fillRect(0, 0, frame.width, frame.height);
    } else {
      const aura = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, half * AURA_RADIUS);
      aura.addColorStop(0, withAlpha(accent, look.auraAlpha));
      aura.addColorStop(1, withAlpha(accent, 0));
      context.fillStyle = aura;
      context.fillRect(0, 0, frame.width, frame.height);
    }

    context.lineJoin = 'round';
    // 面の全体に漂う三角錐：マウスの向きと奥行き（depth）に応じた視差で動き，遠景細線・近景太線の 2 層で描く
    const dustVisibility = progressRef.current < 0.5 ? 0.35 + 0.65 * emerge : emerge;
    if (dustVisibility > 0.001) {
      const wrapDust = (value: number) => (((value + 0.12) % 1.24) + 1.24) % 1.24 - 0.12;
      for (const mote of dust) {
        const offset = getDustParallax(cursor.currentNx, cursor.currentNy, mote.depth);
        const flow = mote.y - frame.timeMs * DUST_SPEED * (0.4 + mote.depth) - progressRef.current * 0.35 * mote.depth;
        const mx = wrapDust(mote.x + offset.x) * frame.width;
        const my = wrapDust(flow + offset.y) * frame.height;
        const size = DUST_SIZE_MIN + (DUST_SIZE_MAX - DUST_SIZE_MIN) * mote.size;
        const angleFactor = 1.1 + mote.depth * 1.4;
        projectTetra(
          mote.spin + frame.timeMs * TETRA_SPIN_SPEED * 0.4 + camera.yaw * angleFactor,
          mote.spin * 0.7 + frame.timeMs * TETRA_SPIN_SPEED * 0.25 + camera.pitch * angleFactor,
          corners,
        );
        const target = mote.depth > DUST_NEAR_DEPTH ? dustNear[mote.color] : dustSegments[mote.color];
        pushTetra(target, corners, mx, my, size);
      }
      dustSegments.forEach((list, color) => strokeSegments(context, list, palette[color], look.dustAlpha * 0.9 * dustVisibility, 1.1));
      dustNear.forEach((list, color) => strokeSegments(context, list, palette[color], look.dustAlpha * 1.15 * dustVisibility, 2.0));
    }
    // 入口・出口の境界外（emerge = 0）では DotPlanet 本体が不透明度 1 で単独表示されるため，二重描画しない
    if (emerge <= 0.001) return;

    const from = figures[state.from], to = figures[state.to];
    const emergeTargetFigure = progressRef.current > 0.5 ? figures[CHAPTER_COUNT - 1] : figures[0];
    const total = from.points.length / 3;
    for (let index = 0; index < total; index += 1) {
      const trait = traits.sizes[index];
      const base = index * 3;
      const phase = traits.phases[index] + frame.timeMs * DRIFT_SPEED;
      const driftX = Math.cos(phase) * DRIFT_AMOUNT;
      const driftY = Math.sin(phase * 1.3) * DRIFT_AMOUNT;

      let wFrom = 1, wSea = 0, wTo = 0;
      let camX = 0, camY = 0, camZ = 0, scale = 1, facing = 0;
      let x = 0, y = 0;

      if (state.mix <= 0) {
        const rot = rotatePoint(from.points[base] + driftX, from.points[base + 1] + driftY, from.points[base + 2], tiltX, fromTiltY);
        facing = rotatePoint(from.normals[base], from.normals[base + 1], from.normals[base + 2], tiltX, fromTiltY).z;
        const baseScale = CAMERA_DISTANCE / Math.max(CAMERA_DISTANCE * 0.25, CAMERA_DISTANCE - rot.z);
        camX = rot.x + fromOffsetX / baseScale;
        camY = rot.y;
        camZ = rot.z;
        scale = baseScale;
        x = seaCenterX + camX * scale * half;
        y = centerY + camY * scale * half;
      } else {
        const fromDelay = getCrumbleDelay(from.points[base + 1], traits.delays[index], from.points[base]);
        const toDelay = getReformDelay(to.points[base + 1], traits.delays[index], to.points[base]);
        ({ from: wFrom, sea: wSea, to: wTo } = getCrumbleWeights(state.mix, fromDelay, toDelay));

        let fromCamX = 0, fromCamY = 0, fromCamZ = 0, fromFacing = 0;
        if (wFrom > 0) {
          const rotFrom = rotatePoint(from.points[base] + driftX, from.points[base + 1] + driftY, from.points[base + 2], tiltX, fromTiltY);
          fromFacing = rotatePoint(from.normals[base], from.normals[base + 1], from.normals[base + 2], tiltX, fromTiltY).z;
          const fromScale = CAMERA_DISTANCE / Math.max(CAMERA_DISTANCE * 0.25, CAMERA_DISTANCE - rotFrom.z);
          fromCamX = rotFrom.x + fromOffsetX / fromScale;
          fromCamY = rotFrom.y;
          fromCamZ = rotFrom.z;
        }

        let toCamX = 0, toCamY = 0, toCamZ = 0, toFacing = 0;
        if (wTo > 0) {
          const rotTo = rotatePoint(to.points[base] + driftX, to.points[base + 1] + driftY, to.points[base + 2], tiltX, toTiltY);
          toFacing = rotatePoint(to.normals[base], to.normals[base + 1], to.normals[base + 2], tiltX, toTiltY).z;
          const toScale = CAMERA_DISTANCE / Math.max(CAMERA_DISTANCE * 0.25, CAMERA_DISTANCE - rotTo.z);
          toCamX = rotTo.x + toOffsetX / toScale;
          toCamY = rotTo.y;
          toCamZ = rotTo.z;
        }

        let cloudX = 0, cloudY = 0, cloudZ = 0;
        if (wSea > 0) {
          const cloud = getCrumbleCloudPoint(from.points[base], from.points[base + 1], traits.phases[index], trait, traits.depths[index], timeSec, aspectSpan);
          const cloudRot = rotatePoint(cloud.x, cloud.y, cloud.z, seaTiltX, seaTiltY);
          cloudX = cloudRot.x;
          cloudY = cloudRot.y;
          cloudZ = cloudRot.z;
        }

        const dissolved = 1 - wFrom;
        const peeling = wFrom > 0 && wSea > 0;
        const peelBell = peeling ? Math.sin(Math.PI * dissolved) : 0;
        const skyLiftRaw = wFrom > 0 ? Math.min(1, Math.max(0, (dissolved - 0.42) / 0.53)) : 1;
        const skyLift = skyLiftRaw * skyLiftRaw * (3 - 2 * skyLiftRaw);
        const effCloudY = peeling && cloudY < fromCamY
          ? (fromCamY + 0.55) + (cloudY - (fromCamY + 0.55)) * skyLift
          : cloudY;
        const flankDir = from.points[base] >= 0 ? 1 : -1;
        const peelX = flankDir * peelBell * 0.62;
        const peelY = peelBell * 0.48;
        const peelZ = peelBell * 0.42;

        camX = fromCamX * wFrom + cloudX * wSea + toCamX * wTo + peelX;
        camY = fromCamY * wFrom + effCloudY * wSea + toCamY * wTo + peelY;
        camZ = fromCamZ * wFrom + cloudZ * wSea + toCamZ * wTo + peelZ;

        if (camZ >= NEAR_CULL_Z) continue;
        scale = CAMERA_DISTANCE / Math.max(CAMERA_DISTANCE * 0.16, CAMERA_DISTANCE - camZ);
        x = seaCenterX + camX * scale * half;
        y = centerY + camY * scale * half;
        facing = fromFacing * wFrom + 0.85 * wSea + toFacing * wTo;
      }

      // 惑星の点との出入りも，同じ広大な 3D 空間を経由して下側から崩れ・星雲状に凝縮する
      let grown = 1;
      let emergeCloud = 0;
      if (planet) {
        const delayRaw = progressRef.current > 0.5
          ? 1 - getCrumbleDelay(emergeTargetFigure.points[base + 1], traits.delays[index], emergeTargetFigure.points[base])
          : getReformDelay(emergeTargetFigure.points[base + 1], traits.delays[index], emergeTargetFigure.points[base]);
        grown = getPointMix(emerge, delayRaw);
        const source = planetProjected.current[planetSource.order[index % planetSource.order.length]];
        const startX = planetLeft + source.x, startY = planetTop + source.y;
        const planetCamX = (startX - seaCenterX) / Math.max(1, half);
        const planetCamY = (startY - centerY) / Math.max(1, half);
        const lerpX = planetCamX + (camX - planetCamX) * grown;
        const lerpY = planetCamY + (camY - planetCamY) * grown;
        const lerpZ = camZ * grown;
        emergeCloud = Math.sin(Math.PI * grown) * 0.78;
        if (emergeCloud > 0.001) {
          const cloud = getCrumbleCloudPoint(emergeTargetFigure.points[base], emergeTargetFigure.points[base + 1], traits.phases[index] + 1.1, trait, traits.depths[index], timeSec, aspectSpan);
          const cloudRot = rotatePoint(cloud.x, cloud.y, cloud.z, seaTiltX, seaTiltY);
          camX = lerpX * (1 - emergeCloud) + cloudRot.x * emergeCloud;
          camY = lerpY * (1 - emergeCloud) + cloudRot.y * emergeCloud;
          camZ = lerpZ * (1 - emergeCloud) + cloudRot.z * emergeCloud;
          if (camZ >= NEAR_CULL_Z) continue;
          scale = CAMERA_DISTANCE / Math.max(CAMERA_DISTANCE * 0.16, CAMERA_DISTANCE - camZ);
          x = seaCenterX + camX * scale * half;
          y = centerY + camY * scale * half;
        } else {
          camX = lerpX;
          camY = lerpY;
          camZ = lerpZ;
          scale = CAMERA_DISTANCE / Math.max(CAMERA_DISTANCE * 0.25, CAMERA_DISTANCE - camZ);
          x = seaCenterX + camX * scale * half;
          y = centerY + camY * scale * half;
        }
        if (grown < DOT_UNTIL) {
          // まだ惑星の点：同じ大きさ・濃さの丸い点（三角錐へ育ち始めるまで）
          dots.push(x, y, source.radius * planetBoost, Math.min(1, source.alpha + grown / DOT_UNTIL));
          continue;
        }
      }

      if (cursor.strength > 0.01) {
        const dx = x - cursor.currentX, dy = y - cursor.currentY;
        const distance = Math.hypot(dx, dy);
        if (distance < REPEL_RADIUS && distance > 0.001) {
          const push = (1 - distance / REPEL_RADIUS) ** 2 * REPEL_PUSH * cursor.strength;
          x += dx / distance * push; y += dy / distance * push;
        }
      }

      // 空間への広がり度合い：章間と惑星の出し入れの両方を合わせる
      const cloudAmount = Math.min(1, wSea + emergeCloud);
      const pointUseTo = state.mix > 0.45 + traits.delays[index] * 0.10;
      const pointChapter = pointUseTo ? state.to : state.from;
      const tone = (pointUseTo ? to : from).tones[index];
      const onIntactBrain = pointChapter === 0 && cloudAmount < 0.15 && (state.from === 0 ? wFrom > 0.75 : wTo > 0.75);
      const isStem = onIntactBrain && from.points[base + 1] > 0.66 && from.points[base] > -0.06 && from.points[base] < 0.25;
      const inSulcus = onIntactBrain && !isStem && isBrainSulcus(tone);
      const isRim = pointChapter === 0
        ? facing >= -BRAIN_BACK_LIMIT && Math.abs(facing) < RIM_LIMIT
        : Math.abs(facing) < RIM_LIMIT;
      // 色：脳では白・金・紫・ティールの 4 色を部位の分布で出し，他章は輪郭を章の色で揃える
      const color = pointChapter === 0
        ? brainColorIndex(tone)
        : isRim
          ? pointChapter + 1
          : tone < INK_SHARE ? 0 : 1 + (pointChapter + 1 + Math.min(CHAPTER_COUNT - 2, Math.floor((tone - INK_SHARE) / (1 - INK_SHARE) * (CHAPTER_COUNT - 1)))) % CHAPTER_COUNT;
      const backLimit = pointChapter === 0 ? BRAIN_BACK_LIMIT : RIM_LIMIT;
      const level = cloudAmount > LOOSE_FROM
        ? (camZ > NEAR_GHOST_Z || camZ < -1.1 ? LEVEL_DIM : camZ > 1.25 ? LEVEL_NEAR : LEVEL_LOOSE)
        : isStem
          ? (from.points[base + 1] > 0.78 ? LEVEL_BACK : LEVEL_DIM)
          : facing < -backLimit
            ? LEVEL_BACK
            : inSulcus
              ? LEVEL_DIM
              : LEVEL_FRONT;
      const nearBoost = cloudAmount * (0.14 + 0.56 * Math.max(0, camZ / 2.6));
      const rawSize = (TETRA_SIZE_MIN + (TETRA_SIZE_MAX - TETRA_SIZE_MIN) * trait) * scale
        * (cloudAmount > LOOSE_FROM
          ? 1
          : isRim
            ? RIM_SIZE_SCALE
            : level === LEVEL_BACK
              ? BACK_SIZE_SCALE
              : FRONT_SIZE_MIN + (1 - FRONT_SIZE_MIN) * Math.min(1, facing))
        * (inSulcus ? 0.7 : 1)
        * (1 + nearBoost)
        * (0.55 + 0.45 * grown);
      const size = Math.min(MAX_TETRA_SIZE, rawSize);
      const margin = size * 1.5 + 8;
      if (x < -margin || x > frame.width + margin || y < -margin || y > frame.height + margin) continue;

      const speed = TETRA_SPIN_SPEED * (0.4 + 0.6 * traits.delays[index]);
      const tumble = cloudAmount * (traits.phases[index] * 2.4 + frame.timeMs * speed * 1.6);
      // 立体上はそろった向きのまま小さく揺らし，空間へ広がった粒は自由に回転させる
      projectTetra(
        TETRA_BASE_SPIN + Math.sin(traits.phases[index] + frame.timeMs * speed) * TETRA_WOBBLE + tumble,
        TETRA_BASE_PITCH + Math.cos(traits.phases[index] * 1.7 + frame.timeMs * speed * 0.6) * TETRA_WOBBLE + tumble * 0.65,
        corners,
      );
      pushTetra(segments[color * LEVEL_WIDTHS.length + level], corners, x, y, size);
      if (onIntactBrain && isRim && !isStem && color > 0 && level === LEVEL_FRONT) {
        pushTetra(glowSegments[color], corners, x, y, size);
      }
    }
    glowSegments.forEach((list, color) => strokeSegments(context, list, palette[color], look.rimGlowAlpha, RIM_GLOW_WIDTH));
    segments.forEach((list, slot) => {
      const stageIndex = slot % LEVEL_WIDTHS.length;
      strokeSegments(context, list, palette[Math.floor(slot / LEVEL_WIDTHS.length)], levelAlphas[stageIndex], LEVEL_WIDTHS[stageIndex]);
    });
    // 惑星の点のままの粒（丸い点）
    context.fillStyle = look.ink;
    for (let index = 0; index < dots.length; index += 4) {
      context.globalAlpha = dots[index + 3];
      context.beginPath();
      context.arc(dots[index], dots[index + 1], dots[index + 2], 0, FULL_TURN);
      context.fill();
    }
    context.globalAlpha = 1;
  }, [figures, traits, dust, planetSource, getPlanetSpotForX, look]);
  const { canvasRef, redraw } = useCanvasLoop({ draw, paused: !pinned });
  useEffect(() => { redraw(); }, [draw, redraw]);

  // カーソルの位置を覚える（背景固定表示のときだけ．画面全体で追従し，視点オービット・背景三角の視差・点の回避を連動させる）
  useEffect(() => {
    const surface = canvasRef.current;
    if (!pinned || !surface || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const state = pointer.current;
    const move = (event: PointerEvent) => {
      const vw = Math.max(1, window.innerWidth);
      const vh = Math.max(1, window.innerHeight);
      state.targetNx = (event.clientX / vw) * 2 - 1;
      state.targetNy = (event.clientY / vh) * 2 - 1;
      // 粒の反発は背景 canvas の座標で計算するため，ローカル座標も覚える
      const bounds = surface.getBoundingClientRect();
      state.targetX = event.clientX - bounds.left;
      state.targetY = event.clientY - bounds.top;
      if (!state.active) { state.currentX = state.targetX; state.currentY = state.targetY; }
      state.active = true;
    };
    const leave = () => {
      state.active = false;
      state.targetNx = 0;
      state.targetNy = 0;
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
      state.active = false;
    };
  }, [pinned, canvasRef]);

  return <section id="about" data-testid="about-section" data-scroll-actor className={styles.section}>
    <div ref={track} className={styles.track}>
      {/* 背景の点図形舞台（PC ではセクション全高の stage 内で sticky に背後に留まり，抜け際に下の節へ被らない）*/}
      <div className={styles.stage} aria-hidden="true">
        <div ref={stage} className={styles.backdrop}>
          <canvas ref={canvasRef} className={styles.figure} aria-hidden="true" />
        </div>
      </div>
      {/* 見出しと 4 つの章（PC では背景 canvas の上を左→右→左→右と交互に縦スクロールする）*/}
      <div className={styles.flow}>
        <div className={styles.intro}>
          <SectionHeading label="01. About Me" title="自己紹介" descriptionContent={<AboutStatement />} />
        </div>
        <div className={styles.chapters}>
          {ABOUT_CHAPTERS.map((chapter, index) => <article key={chapter.kind} ref={node => { copies.current[index] = node; }} className={styles.chapter}
            data-align={index % 2 === 1 ? 'right' : 'left'} data-active={active === index} style={chapterStyle(look.accents[index])}>
            {pinned ? null : <StillFigure figure={figures[index]} accent={look.accents[index]} kind={chapter.kind} theme={theme} />}
            <div className={styles.copy}>
              <h3 className={styles.title}><SplitTitle text={chapter.title} parts={chapter.titleParts} /></h3>
              <p className={styles.meta} aria-hidden="true">
                <span className={styles.count}>{pad(index + 1)} / {pad(CHAPTER_COUNT)}</span>
                <span className={styles.label}>{chapter.label}</span>
              </p>
              <p className={styles.description}>{chapter.description}</p>
              {/* 丸いボタン（背景固定表示のときは結びの章の文章の下へ置く）：ホバーで，下から楕円の面がせり上がって塗り替わる */}
              {pinned && index === CHAPTER_COUNT - 1 ? <a href="#skills" className={`${styles.cta} press-effect`}>
                <span className={styles.ctaFill} aria-hidden="true" />
                <span className={styles.ctaLabel}>使っている技術へ <ArrowDown size={14} aria-hidden="true" /></span>
              </a> : null}
            </div>
          </article>)}
        </div>
        <div className={styles.footer} style={chapterStyle(look.accents[active])}>
          {/* 普通の表示のときの，次の章への丸いボタン */}
          <a href="#skills" className={`${styles.cta} press-effect`}>
            <span className={styles.ctaFill} aria-hidden="true" />
            <span className={styles.ctaLabel}>使っている技術へ <ArrowDown size={14} aria-hidden="true" /></span>
          </a>
        </div>
      </div>
    </div>
  </section>;
}
