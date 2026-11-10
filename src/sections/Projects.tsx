"use client";

import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Laptop, Smartphone } from 'lucide-react';
import { RollingNumber } from '../components/RollingNumber';
import { ExplodedView, type ExplodedViewHandle } from '../components/animations/exploded/ExplodedView';
import { DotPillLink } from '../components/animations/DotPillLink';
import { GitHubIcon } from '../components/icons/GitHubIcon';
import { HoverShuffle } from '../components/HoverShuffle';
import { SectionHeading } from '../components/SectionHeading';
import { FEATURES } from '../config/features';
import { siteConfig } from '../config/site';
import { buildRepositoryUrl, OTHER_APPS, OTHER_APPS_PATH, PLATFORM_LABELS, SWIFT_APPS, WALL_APPS, type AppPlatform, type SwiftApp } from '../data/apps';
import { PUBLIC_REPOSITORY_NAMES } from '../data/publicRepos';
import type { Capability } from '../data/capabilities';
import { getAppMeta } from '../lib/appMeta';
import { findAppsByCapability } from '../lib/capabilities';
import { diagonalDelay, staggerDelay } from '../lib/choreography';
import {
  createWallLayout, getTileGrowth, getTileRect, getWallActive, getWallBlend, getWallPosition, getWallStops, isWallOverview,
  type WallLayout,
} from '../lib/appWall';
import { subscribeToScroll } from '../lib/scrollObserver';
import { getShowcaseChapterOffset, getShowcaseScrollState } from '../lib/showcaseStory';
import { getZoomTransform, type ZoomRect } from '../lib/zoomRegion';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useInView } from '../hooks/useInView';
import { BusRecording } from './BusRecording';
import { BrowseModeSwitch, CapabilityIndex, type AppBrowseMode } from './CapabilityIndex';
import styles from './Projects.module.css';

// Apps：アイコンの壁．
// アイコンの素材があるアプリ（WALL_APPS）を，最初は同じ大きさのアイコンの壁として見せる．スクロールすると壁がほどけ，1 本ずつ中央で大きな紹介パネルへ育つ．
// まだ見ていないアプリは右の山，見終えたアプリは左の山に，小さいまま並ぶ（位置の計算は lib/appWall.ts）．
// アイコンの素材がないアプリ（OTHER_APPS）は，別ページ（OTHER_APPS_PATH）で紹介する．
// 壁のアプリは常に DOM に置いてあり（検索・読み上げ・小さい画面にも残る），固定表示でないとき（小さい画面・動きを減らす設定）は，
// 同じ要素が普通のカードの一覧になる．

// 固定表示にする条件（自己紹介と同じ）
const PIN_QUERY = '(min-width: 1000px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)';
const BROWSE_MODE_KEY = 'apps-browse-mode';
// ナビゲーションの高さ（固定表示の上端）
const TOP = 64;
const TOTAL = WALL_APPS.length;
const STOPS = getWallStops(TOTAL);
// 紹介の中身を出す・隠す境目になる育ち具合．これを超えたタイルだけ，中身のリンクを操作できる
const OPEN_GROWTH = 0.45;
// タイルの角丸：一辺に対する割合と上限（px）．小さいときはアイコンの角丸，パネルのときはカードの角丸になる
const RADIUS_RATIO = 0.225;
const RADIUS_MIN = 10;
const RADIUS_MAX = 28;
// 一覧の名前が見え始める壁の濃さと，そこから見え切るまでの幅
const CAPTION_FROM = 0.35;
const CARD_COLUMNS = 3;
const MARKER_STEP_MS = 40;
// 実際の画面が縦長（iPhone）のアプリ．それ以外は横長の画面として並べる
const PHONE_SCREEN_APPS = new Set(['BusTimeApp', 'Tsumugi']);
const focusNumbers = ['①', '②', '③', '④'];
// 実画面の角丸（px）．携帯の画面は 20，それ以外は 12（Projects.module.css の .shot と同じ）
const PHONE_SHOT_RADIUS = 20;
const WIDE_SHOT_RADIUS = 12;
const emptyZoomRect: ZoomRect = { x: 0, y: 0, w: 0, h: 0 };

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
const pad = (value: number) => String(value).padStart(2, '0');

type MediaKind = 'phone' | 'wide' | 'icon';

function getMediaKind(app: SwiftApp): MediaKind {
  if (!app.screenshotSrc) return 'icon';
  return PHONE_SCREEN_APPS.has(app.name) ? 'phone' : 'wide';
}

// 対応 OS のチップ
function PlatformChip({ platform }: { platform: AppPlatform }) {
  const showsPhone = platform === 'ios' || platform === 'both';
  const showsMac = platform === 'macos' || platform === 'both';
  return (
    <span className={styles.chip}>
      {showsPhone && <Smartphone size={13} aria-hidden="true" />}
      {showsMac && <Laptop size={13} aria-hidden="true" />}
      {PLATFORM_LABELS[platform]}
    </span>
  );
}

// アプリのアイコン：公式アイコンがあればそれを，なければグラデーションに線画のアイコンを重ねる．親いっぱいに広がる
function AppGlyph({ app }: { app: SwiftApp }) {
  const Icon = app.icon;
  if (app.imageSrc) {
    return <img src={app.imageSrc} alt="" width={168} height={168} loading="lazy" decoding="async" className={styles.glyphImage} />;
  }
  return (
    <span className={`${styles.glyphFallback} bg-linear-to-br ${app.gradient}`}>
      <Icon aria-hidden="true" />
    </span>
  );
}

// 紹介パネルの中身（実際の画面または大きなアイコン，名前，説明，タグ，リンク）
function AppDetail({ app, index }: { app: SwiftApp; index: number }) {
  const meta = getAppMeta(app, PUBLIC_REPOSITORY_NAMES);
  const kind = getMediaKind(app);
  const headingId = `apps-wall-name-${index}`;
  const zoomId = `apps-wall-zoom-${index}`;
  const noteId = `${zoomId}-note`;
  const mediaRef = useRef<HTMLDivElement>(null);
  const shotRef = useRef<HTMLImageElement>(null);
  const focusButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const reduced = usePrefersReducedMotion();
  const explodedRef = useRef<ExplodedViewHandle>(null);
  const explodeButton = useRef<HTMLButtonElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [instant, setInstant] = useState(true);
  // 分解ビュー（見どころのあるアプリだけ）．状態は目標の真偽だけで，進みはばねが持つ
  const [exploded, setExploded] = useState(false);
  const [explodeKeyboard, setExplodeKeyboard] = useState(false);
  const [geometry, setGeometry] = useState({ image: emptyZoomRect, frame: emptyZoomRect });
  const area = app.focusAreas?.find(item => item.id === focusId);
  const zoom = getZoomTransform(geometry.image, geometry.frame, area?.region ?? null);
  const imageWidth = app.name === 'Tsumugi' ? 1206 : kind === 'phone' ? 840 : 1280;
  const imageHeight = app.name === 'Tsumugi' ? 2622 : kind === 'phone' ? 1826 : 960;
  const explodedEnabled = FEATURES.explodedView && Boolean(app.focusAreas) && Boolean(app.screenshotSrc);
  const explodedId = `apps-wall-exploded-${index}`;
  // 動きを減らす設定と，キーボードで始めた分解は，3D を使わず層を重ねて出すだけにする
  const explodedFlat = reduced || explodeKeyboard;

  // 元の contain 表示だけを測る．拡大層と共有要素の変形には測定を戻さない．
  useEffect(() => {
    const media = mediaRef.current;
    const shot = shotRef.current;
    if (!app.focusAreas || !media || !shot) return;
    const measure = () => {
      // 登場用ラッパーの scale を測定に含めず，拡大の元になる寸法を保つ．
      const frame = { width: media.clientWidth, height: media.clientHeight };
      const image = { width: shot.offsetWidth, height: shot.offsetHeight };
      const next = {
        image: { x: (frame.width - image.width) / 2, y: (frame.height - image.height) / 2, w: image.width, h: image.height },
        frame: { x: 0, y: 0, w: frame.width, h: frame.height },
      };
      setGeometry(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(media);
    resize.observe(shot);
    shot.addEventListener('load', measure);
    measure();
    return () => { resize.disconnect(); shot.removeEventListener('load', measure); };
  }, [app.focusAreas]);

  // 壁のパネルが閉じたら拡大も閉じる．一覧では見どころをそのまま操作できる．
  useEffect(() => {
    const tile = mediaRef.current?.closest('[data-app-tile]');
    const track = mediaRef.current?.closest('[data-app-track]');
    if (!app.focusAreas || !tile || !track) return;
    const update = () => {
      // 合図の脈動は最初の開放だけ．再訪しても，番号の段階表示だけを行う．
      if (track.hasAttribute('data-pin') && tile.getAttribute('data-open') === 'true' && !tile.hasAttribute('data-marker-seen')) {
        tile.setAttribute('data-marker-seen', '');
        tile.setAttribute('data-marker-cue', '');
      }
      if (!track.hasAttribute('data-pin')) tile.removeAttribute('data-marker-cue');
      if (track.hasAttribute('data-pin') && tile.getAttribute('data-open') !== 'true') {
        setInstant(true);
        setFocusId(null);
        // 閉じたパネルは，分解も戻しておく（開き直したとき，重なった姿から始まる）
        setExploded(false);
        explodedRef.current?.snapToRest();
      }
    };
    const observer = new MutationObserver(update);
    observer.observe(tile, { attributes: true, attributeFilter: ['data-open'] });
    observer.observe(track, { attributes: true, attributeFilter: ['data-pin'] });
    update();
    return () => observer.disconnect();
  }, [app.focusAreas]);

  const selectFocus = (id: string | null, keyboard: boolean) => {
    if (id === null && focusId) focusButtons.current[focusId]?.focus({ preventScroll: true });
    // 分解中に見どころを選んだら，分解を戻してから拡大する（2 つの表示は同時に出さない）
    if (exploded) setExploded(false);
    setInstant(keyboard || reduced);
    setFocusId(previous => previous === id ? null : id);
  };
  const toggleExploded = (keyboard: boolean) => {
    if (exploded) { setExploded(false); return; }
    // 拡大は解除してから分解する
    setInstant(keyboard || reduced);
    setFocusId(null);
    // 3D を使うかは分解を始めるときの操作で決め，戻すまで保つ（見ていない姿勢へ飛ばないように）
    setExplodeKeyboard(keyboard);
    setExploded(true);
  };
  // 実画面（と，見どころの番号の印）．分解ビューが有効なアプリでは，これが層 1 になる
  const shotFrame = app.screenshotSrc ? (
    <span className={styles.shotFrame} data-morph-source>
      <span className={styles.mediaEntrance}>
        <img
          ref={shotRef}
          src={app.screenshotSrc}
          alt={app.screenshotAlt ?? `${app.name}のアプリ画面`}
          width={imageWidth}
          height={imageHeight}
          loading="lazy"
          decoding="async"
          className={styles.shot}
        />
        {app.name === 'BusTimeApp' && <BusRecording poster={app.screenshotSrc} suspended={Boolean(area) || exploded} />}
      </span>
      {app.focusAreas?.map((item, position) => (
        <span key={item.id} className={styles.focusMarker} aria-hidden="true" style={{ '--marker-delay': `${staggerDelay(position, { stepMs: MARKER_STEP_MS })}ms`, left: geometry.image.x + geometry.image.w * (item.markerPosition?.x ?? item.region.x), top: geometry.image.y + geometry.image.h * (item.markerPosition?.y ?? item.region.y) } as CSSProperties}>
          <span aria-hidden="true" onAnimationEnd={event => {
            if (position === (app.focusAreas?.length ?? 0) - 1) event.currentTarget.closest('[data-app-tile]')?.removeAttribute('data-marker-cue');
          }}>{focusNumbers[position]}</span>
        </span>
      ))}
    </span>
  ) : null;
  return (
    <article className={styles.detail} data-media={kind} data-focusable={Boolean(app.focusAreas)} aria-labelledby={headingId} data-morph-scope onKeyDown={event => {
      if (event.key !== 'Escape') return;
      if (area) { event.preventDefault(); selectFocus(null, true); }
      else if (exploded) { event.preventDefault(); setExploded(false); explodeButton.current?.focus({ preventScroll: true }); }
    }} onClickCapture={event => {
      // 紹介ページへ移る直前に，傾きも分解も戻す（共有要素の変形が，重なった姿から始まるように）
      if (explodedEnabled && event.target instanceof Element && event.target.closest('a[href]')) {
        explodedRef.current?.snapToRest();
        setExploded(false);
      }
    }}>
      <div ref={mediaRef} className={styles.media} data-zoomed={Boolean(area)} data-exploded={exploded} data-instant={instant || reduced}>
        {shotFrame ? (
          explodedEnabled && app.focusAreas ? (
            <ExplodedView
              ref={explodedRef}
              id={explodedId}
              exploded={exploded}
              flat={explodedFlat}
              image={geometry.image}
              frame={geometry.frame}
              areas={app.focusAreas}
              numbers={focusNumbers}
              shotRadius={kind === 'phone' ? PHONE_SHOT_RADIUS : WIDE_SHOT_RADIUS}
            >
              {shotFrame}
            </ExplodedView>
          ) : shotFrame
        ) : (
          <span className={styles.bigGlyph} data-morph-source={app.imageSrc ? '' : undefined}>
            <span className={styles.glyphEntrance}><AppGlyph app={app} /></span>
          </span>
        )}
        {explodedEnabled && (
          <button ref={explodeButton} type="button" className={`${styles.explodeToggle} press-effect`} aria-pressed={exploded} aria-controls={explodedId} aria-label={`${app.name}の画面を分解して見る`} onClick={event => toggleExploded(event.detail === 0)}>分解</button>
        )}
        {app.focusAreas && app.screenshotSrc && (
          <div id={zoomId} className={styles.zoomLayer} data-active={Boolean(area)} role="img" aria-label={`${app.name}：${area?.label ?? '画面全体'}`} aria-describedby={noteId} aria-hidden={!area}>
            <img src={app.screenshotSrc} alt="" width={imageWidth} height={imageHeight} loading="lazy" decoding="async" className={styles.zoomImage} style={{ left: geometry.image.x, top: geometry.image.y, width: geometry.image.w, height: geometry.image.h, transform: `translate(${zoom.translateX}px, ${zoom.translateY}px) scale(${zoom.scale})` }} />
          </div>
        )}
      </div>
      <div className={styles.text}>
        <div className={styles.meta} data-testid="app-meta" role="group" tabIndex={0} aria-label="作品メタ情報">
          <PlatformChip platform={app.platform} />
          <span className={styles.chip}>{meta.year}</span>
          <span className={styles.chip}>{meta.role}</span>
          {meta.sourceStatus && <span className={styles.chip}>{meta.sourceStatus}</span>}
          <span className={styles.count} aria-hidden="true">{pad(index + 1)} / {pad(TOTAL)}</span>
        </div>
        <h3 id={headingId} className={styles.name} tabIndex={-1}>{app.name}</h3>
        <p className={styles.tagline}>{app.tagline}</p>
        <p className={styles.desc}>{app.description}</p>
        {app.name === 'BusTimeApp' && <p className={styles.recordingNote}>録画の日時・便は撮影時のものです．最後の画面を5秒間保って繰り返します．</p>}
        <ul className={styles.tags} aria-label="使用技術">
          {app.tags.map(tag => (
            <li key={tag}>{/^[\x20-\x7e]+$/.test(tag) ? <HoverShuffle text={tag} /> : tag}</li>
          ))}
        </ul>
        {app.focusAreas && (
          <div className={styles.focusControls} data-testid={`app-focus-${app.name}`}>
            <p className={styles.focusLabel}>見どころ <span>UI の細部を拡大して見る</span></p>
            <div className={styles.focusActions}>
              <div role="group" aria-label={`${app.name} の見どころ`}>
                {app.focusAreas.map((item, position) => <button key={item.id} ref={node => { focusButtons.current[item.id] = node; }} type="button" className="press-effect" aria-pressed={focusId === item.id} aria-controls={zoomId} onClick={event => selectFocus(item.id, event.detail === 0)}>{focusNumbers[position]} {item.label}</button>)}
              </div>
              {/* 戻るボタンは見どころのボタンと同じ列に置く．選んでも下の文章が押し下げられず，パネルの高さが変わらない． */}
              <button type="button" className={`${styles.focusReset} press-effect`} data-active={Boolean(area)} aria-hidden={!area} tabIndex={area ? 0 : -1} aria-controls={zoomId} onClick={event => selectFocus(null, event.detail === 0)}>全体に戻る</button>
            </div>
            <p id={noteId} className={styles.focusNote} role="status">
              <span className="sr-only">{area?.note ?? '番号を選ぶと，画面の細部を拡大できます．'}</span>
              <span aria-hidden="true" data-active={!area}>番号を選ぶと，画面の細部を拡大できます．</span>
              {app.focusAreas.map(item => <span key={item.id} aria-hidden="true" data-active={area?.id === item.id}>{item.note}</span>)}
            </p>
            <p className={styles.focusFootnote}>実際のアプリ画面です．日時・数値は撮影時の例です．</p>
          </div>
        )}
        <div className={styles.links}>
          {app.detailHref && (
            <Link href={app.detailHref} className={`${styles.link} ${styles.linkPrimary}`}>
              {app.name}のこだわりを見る <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          )}
          {app.repositories.map(repository => (
            <a
              key={repository.name}
              href={buildRepositoryUrl(siteConfig.githubUsername, repository.name)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${repository.name}${repository.role ? `（${repository.role}）` : ''}を新しいタブで開く`}
              className={styles.link}
            >
              <GitHubIcon className={styles.linkIcon} />
              <span className="line-sweep">{repository.name}</span>
              {repository.role && <span className={styles.linkRole}>（{repository.role}）</span>}
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

interface AppTileProps {
  app: SwiftApp;
  index: number;
  current: boolean;
  matches?: boolean;
  register: (index: number, node: HTMLLIElement | null) => void;
  onSelect: (index: number) => void;
}

// 壁の 1 つのタイル．小さいときはアイコンだけ，育つとアイコンが薄れて紹介パネルの中身が現れる．
// 位置・大きさ・育ち具合（--g）は，固定表示のときだけ Projects が直接書く（再描画は起こさない）
const AppTile = memo(function AppTile({ app, index, current, matches, register, onSelect }: AppTileProps) {
  const { ref, isInView } = useInView<HTMLLIElement>();
  return (
    <li
      ref={node => { ref.current = node; register(index, node); }}
      className={styles.tile}
      data-entered={isInView}
      style={{ '--card-delay': `${diagonalDelay(index, CARD_COLUMNS)}ms` } as CSSProperties}
      data-app-tile={app.name}
      data-featured={app.featured}
      data-shot={Boolean(app.screenshotSrc)}
      data-open="false"
      data-capability-match={matches}
    >
      {/* 小さいあいだ（アイコンが面に置かれているあいだ）だけ，製品の影が敷かれる．育ってカードになると，影は消えて細い線だけになる */}
      <span className={styles.shadow} aria-hidden="true" />
      <div className={styles.face}>
        <span className={styles.iconLayer} aria-hidden="true"><AppGlyph app={app} /></span>
        <AppDetail app={app} index={index} />
        {/* 小さいタイルを押すと，そのアプリまでスクロールする（固定表示のときだけ出る） */}
        <button
          type="button"
          data-app-select
          className={styles.select}
          aria-label={`${app.name}を大きく見る`}
          aria-current={current ? 'true' : undefined}
          onClick={() => onSelect(index)}
        />
      </div>
      <span className={styles.caption} aria-hidden="true">{app.name}</span>
    </li>
  );
});

export function Projects() {
  const [view, setView] = useState({ active: 0, overview: true });
  const [mode, setMode] = useState<AppBrowseMode>('sequence');
  const [canPin, setCanPin] = useState(false);
  const [capability, setCapability] = useState<Capability | null>(null);
  const alignAfterModeChange = useRef(false);
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const slots = useRef<HTMLDivElement>(null);
  const progressLine = useRef<HTMLSpanElement>(null);
  const tiles = useRef<(HTMLLIElement | null)[]>([]);
  const slotNodes = useRef<(HTMLSpanElement | null)[]>([]);
  const layout = useRef<WallLayout | null>(null);
  const pinned = useRef(false);
  const lastPosition = useRef(0);
  const lastProgress = useRef(0);
  const opened = useRef<boolean[]>([]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(BROWSE_MODE_KEY);
      if (saved === 'sequence' || saved === 'list') setMode(saved);
    } catch {
      // 保存できないブラウザでも，このページ内の切替は使える．
    }
  }, []);

  const changeMode = (next: AppBrowseMode) => {
    if (mode === next) return;
    alignAfterModeChange.current = true;
    setMode(next);
    try { sessionStorage.setItem(BROWSE_MODE_KEY, next); } catch {
      // 保存に失敗しても現在の選択を優先する．
    }
  };

  const register = useCallback((index: number, node: HTMLLIElement | null) => { tiles.current[index] = node; }, []);

  // 固定表示でなくなったとき，タイルへ書いた寸法を取り除く（普通のカードの一覧へ戻す）
  const clearInline = useCallback(() => {
    tiles.current.forEach(tile => {
      if (!tile) return;
      for (const property of ['transform', 'width', 'height', 'z-index', '--g', '--r']) tile.style.removeProperty(property);
      tile.setAttribute('data-open', 'false');
      tile.removeAttribute('data-small');
    });
    opened.current = [];
    const area = field.current;
    if (area) for (const property of ['--panel-w', '--panel-h', '--cap']) area.style.removeProperty(property);
    slots.current?.style.removeProperty('opacity');
  }, []);

  // 壁の広さを測って，一覧・山・パネルの位置を求め直す（固定表示のときだけ）
  const measure = useCallback(() => {
    const area = field.current;
    if (!area || !pinned.current) { layout.current = null; return; }
    const width = area.clientWidth, height = area.clientHeight;
    if (width === 0 || height === 0) { layout.current = null; return; }
    const next = createWallLayout(width, height, TOTAL);
    layout.current = next;
    area.style.setProperty('--panel-w', `${next.panel.w.toFixed(1)}px`);
    area.style.setProperty('--panel-h', `${next.panel.h.toFixed(1)}px`);
    // 山の席の枠（まだ誰も居ない席が，うっすら見える）
    slotNodes.current.forEach((node, position) => {
      if (!node) return;
      const rect = position < TOTAL - 1 ? next.right[position + 1] : next.left[position - (TOTAL - 1)];
      node.style.width = `${rect.w}px`;
      node.style.height = `${rect.h}px`;
      node.style.transform = `translate3d(${rect.x.toFixed(1)}px, ${rect.y.toFixed(1)}px, 0)`;
      node.style.borderRadius = `${clamp(rect.w * RADIUS_RATIO, RADIUS_MIN, RADIUS_MAX).toFixed(1)}px`;
    });
  }, []);

  // 停止位置 q（0〜TOTAL+1）を反映する．タイルの位置・大きさ・育ち具合はすべて q から計算して直接書き，再描画は先頭のアプリが変わるときだけ起こす
  const paint = useCallback((position: number, progress: number) => {
    lastPosition.current = position;
    lastProgress.current = progress;
    const info = layout.current, area = field.current;
    if (!info || !area || !pinned.current) return;
    const blend = getWallBlend(position, TOTAL);
    area.style.setProperty('--cap', clamp((blend - CAPTION_FROM) / (1 - CAPTION_FROM)).toFixed(3));
    if (slots.current) slots.current.style.opacity = (1 - blend).toFixed(3);
    tiles.current.forEach((tile, index) => {
      if (!tile) return;
      const rect = getTileRect(info, index, position, TOTAL);
      const growth = getTileGrowth(info, rect);
      const radius = clamp(Math.min(rect.w, rect.h) * RADIUS_RATIO, RADIUS_MIN, RADIUS_MAX);
      tile.style.transform = `translate3d(${rect.x.toFixed(1)}px, ${rect.y.toFixed(1)}px, 0)`;
      tile.style.width = `${rect.w.toFixed(1)}px`;
      tile.style.height = `${rect.h.toFixed(1)}px`;
      // 大きいものほど手前（パネルへ育つものが，山のタイルの上を通る）
      tile.style.zIndex = String(Math.round(growth * 100));
      tile.style.setProperty('--g', growth.toFixed(3));
      tile.style.setProperty('--r', `${radius.toFixed(1)}px`);
      const open = growth > OPEN_GROWTH;
      if (opened.current[index] !== open) {
        opened.current[index] = open;
        tile.setAttribute('data-open', open ? 'true' : 'false');
      }
      tile.toggleAttribute('data-small', growth < 0.04);
    });
    if (progressLine.current) progressLine.current.style.transform = `scaleX(${progress.toFixed(4)})`;
    const active = getWallActive(position, TOTAL);
    const overview = isWallOverview(position, TOTAL);
    setView(previous => (previous.active === active && previous.overview === overview ? previous : { active, overview }));
  }, []);

  useEffect(() => {
    const runway = track.current, viewport = stage.current, area = field.current;
    if (!runway || !viewport || !area) return;
    const media = matchMedia(PIN_QUERY);
    let unsubscribe = () => {};
    let frame = 0;
    const scrollPaint = () => {
      if (!pinned.current) return;
      const bounds = runway.getBoundingClientRect();
      const state = getShowcaseScrollState(bounds.top, bounds.height, viewport.offsetHeight, TOP, STOPS);
      paint(getWallPosition(state.progress, TOTAL), state.progress);
    };
    const remeasure = () => { measure(); scrollPaint(); };
    const configure = () => {
      unsubscribe();
      setCanPin(media.matches);
      pinned.current = media.matches && mode === 'sequence';
      runway.toggleAttribute('data-pin', pinned.current);
      if (pinned.current) unsubscribe = subscribeToScroll(scrollPaint);
      else { unsubscribe = () => {}; layout.current = null; clearInline(); }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        remeasure();
        if (alignAfterModeChange.current) {
          alignAfterModeChange.current = false;
          section.current?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        }
      });
    };
    configure();
    const resize = new ResizeObserver(remeasure);
    resize.observe(area);
    media.addEventListener('change', configure);
    window.addEventListener('pageshow', scrollPaint);
    return () => {
      unsubscribe(); resize.disconnect();
      cancelAnimationFrame(frame);
      media.removeEventListener('change', configure); window.removeEventListener('pageshow', scrollPaint);
      pinned.current = false;
      runway.removeAttribute('data-pin');
      clearInline();
    };
  }, [clearInline, measure, paint, mode]);

  // 小さいタイルを押すと，そのアプリの停止位置までスクロールする（間のアプリも順に見せる）
  const select = useCallback((index: number) => {
    const runway = track.current, viewport = stage.current;
    if (!pinned.current || !runway || !viewport) return;
    const bounds = runway.getBoundingClientRect();
    const offset = getShowcaseChapterOffset(index + 1, STOPS, bounds.height - viewport.offsetHeight);
    window.scrollTo({ top: window.scrollY + bounds.top - TOP + offset, behavior: 'smooth' });
  }, []);

  const { active, overview } = view;
  const effectiveMode = canPin ? mode : 'list';
  const matchedApps = capability ? findAppsByCapability(SWIFT_APPS, capability) : null;
  const selectCapabilityApp = (app: SwiftApp) => {
    const tile = tiles.current[WALL_APPS.indexOf(app)];
    if (!tile) return;
    if (pinned.current) {
      const button = tile.querySelector<HTMLButtonElement>('[data-app-select]');
      button?.focus({ preventScroll: true });
      button?.click();
    } else {
      tile.querySelector<HTMLHeadingElement>('h3')?.focus({ preventScroll: true });
      tile.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  };

  return (
    <section ref={section} id="projects" data-testid="projects-section" data-scroll-actor className={styles.section}>
      <div ref={track} data-app-track className={styles.track} style={{ '--stops': STOPS } as CSSProperties}>
        <div ref={stage} className={styles.stage}>
          <div className={styles.heading}>
            <SectionHeading
              label="03. Apps"
              title="つくったアプリ"
              count={SWIFT_APPS.length}
              size="display"
              description={`Swift / SwiftUI で個人開発した iPhone・Mac アプリです．全${SWIFT_APPS.length}プロダクトのうち，アイコンのある主な${TOTAL}本をここで，残り${OTHER_APPS.length}本は別ページで紹介します．`}
            />
          </div>

          <div className={styles.browseTools}>
            {canPin && <BrowseModeSwitch mode={mode} onChange={changeMode} />}
            <CapabilityIndex mode={effectiveMode} activeId={capability?.id ?? null} onChange={setCapability} onSelectApp={selectCapabilityApp} />
          </div>

          <div ref={field} className={styles.field}>
            {/* 山の席の枠（まだ誰も居ない席が，うっすら見える．固定表示のときだけ） */}
            <div ref={slots} className={styles.slots} aria-hidden="true">
              {Array.from({ length: (TOTAL - 1) * 2 }, (_, position) => (
                <span key={position} ref={node => { slotNodes.current[position] = node; }} className={styles.slot} />
              ))}
            </div>
            <ul id="apps-wall" className={styles.wall} data-testid="apps-wall" aria-label={`つくったアプリ（${TOTAL}本）`}>
              {WALL_APPS.map((app, index) => (
                <AppTile key={app.name} app={app} index={index} current={!overview && active === index} matches={effectiveMode === 'list' && matchedApps ? matchedApps.includes(app) : undefined} register={register} onSelect={select} />
              ))}
            </ul>
          </div>

          {/* 固定表示でないとき（普通のカード一覧）は，一覧の下から別ページへ誘う．固定表示のときは，下のフッターに出す */}
          <p className={FEATURES.cornerMarks ? `${styles.moreBlock} ${styles.moreBlockPill}` : styles.moreBlock}>
            {FEATURES.cornerMarks ? (
              <DotPillLink href={OTHER_APPS_PATH} icon={<ArrowUpRight size={15} aria-hidden="true" />}>
                <span className={styles.pillPhrase}>ほかにも{OTHER_APPS.length}本つくっています．</span><span className={styles.pillPhrase}>その他のアプリを見る</span>
              </DotPillLink>
            ) : (
              <Link href={OTHER_APPS_PATH} className={styles.moreLink}>
                ほかにも{OTHER_APPS.length}本つくっています．その他のアプリを見る <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            )}
          </p>

          <p className="sr-only" role="status" aria-live="polite">
            {effectiveMode === 'list' || overview ? `${TOTAL}本のアプリの一覧` : `${active + 1} / ${TOTAL}：${WALL_APPS[active].name}`}
          </p>
          <footer className={styles.footer}>
            <span className={styles.scrollHint}><ArrowDown size={13} aria-hidden="true" /> スクロールで 1 本ずつ大きくなります</span>
            <span className={styles.counter} aria-hidden="true">
              <span hidden={!overview}>ALL {TOTAL}</span>
              <span hidden={overview}>{active + 1 < 10 ? '0' : ''}<RollingNumber value={active + 1} /> / {pad(TOTAL)}</span>
            </span>
            <span className={styles.progress} aria-hidden="true"><span ref={progressLine} /></span>
            <span className={styles.footerLinks}>
              {FEATURES.cornerMarks ? (
                <DotPillLink href={OTHER_APPS_PATH} size="sm" icon={<ArrowUpRight size={14} aria-hidden="true" />}>
                  その他のアプリ {OTHER_APPS.length} 本
                </DotPillLink>
              ) : (
                <Link href={OTHER_APPS_PATH} className={styles.next}>その他のアプリ {OTHER_APPS.length} 本 <ArrowUpRight size={14} aria-hidden="true" /></Link>
              )}
              <a href="#works" className={styles.next}>Web サービスへ <ArrowDown size={14} aria-hidden="true" /></a>
            </span>
          </footer>
        </div>
      </div>

    </section>
  );
}
