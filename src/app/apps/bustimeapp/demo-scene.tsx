'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FEATURES } from '../../../config/features';
import { subscribeToScroll } from '../../../lib/scrollObserver';
import {
  REEL_GROW_VIEWPORT_RATIO,
  getReelProgress,
  getReelState,
  getScrollForPlay,
  toReelTransform,
  type ReelSize,
} from '../../../lib/animations/growingReel';
import styles from './product.module.css';

// 実際の操作の開始時刻に合わせたチャプター（秒）。
const STEPS = [
  { time: 0, title: '経路と条件を選ぶ', text: '出発地と行き先を切り替え、出発・到着の条件を確認。次に乗れる便が、その場で変わります。' },
  { time: 17, title: '出発前に、知らせてもらう', text: '乗る便を選んで、5分前・10分前・15分前の通知へ。Live Activityの設定も、同じ画面から。' },
  { time: 29, title: '一日の便を見渡す', text: '時刻表へ切り替え、先の時間帯までスクロール。乗りたい便から、通知設定を開けます。' },
  { time: 44, title: '見た目を、自分の好みに', text: '時刻に合わせた背景やカードの濃さを調整。毎日使う画面を、読みやすく心地よく。' },
];
const DURATION = 56.4;
// 場面を固定する位置（サイトのナビゲーションの高さ）
const SCENE_PIN_TOP = 64;
// スクロールで動画を進める条件・動きを減らす設定・録画の枠が育つ条件（幅 1000px 以上かつ高さ 760px 以上）
const SCRUB_QUERY = '(min-width: 801px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const REEL_QUERY = '(min-width: 1000px) and (min-height: 760px)';
// 「動画として再生する」を押したとき，枠を大きな状態へ移す時間（product.module.css の --dur-slow と同じ）
const REEL_SETTLE_MS = 420;

// 直前に書いた枠のスタイル（同じ値を書き直さないための記録）
interface AppliedReelStyle {
  transform: string;
  radius: string;
  innerRadius: string;
  play: string;
}

export function DemoScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetRef = useRef(0);
  const appliedRef = useRef(0);
  // 枠が育ち切ったときのレイアウト上の寸法（ResizeObserver で保つ．transform の影響を受けない）
  const frameSizeRef = useRef<ReelSize>({ width: 0, height: 0 });
  const appliedReelRef = useRef<AppliedReelStyle>({ transform: '', radius: '', innerRadius: '', play: '' });
  const [progress, setProgress] = useState(0);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [canScrub, setCanScrub] = useState(false);
  const [canGrow, setCanGrow] = useState(false);
  const [manual, setManual] = useState(false);
  const scrollMode = canScrub && !manual;
  // 録画の枠がスクロールで育つ場面（スイッチが false のとき・小さい画面・動きを減らす設定では今の場面のまま）
  const growing = FEATURES.growingReel && canGrow;

  useEffect(() => {
    const desktop = window.matchMedia(SCRUB_QUERY);
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY);
    const reel = window.matchMedia(REEL_QUERY);
    const update = () => {
      const scrubbable = desktop.matches && !reduced.matches;
      setCanScrub(scrubbable);
      setCanGrow(scrubbable && reel.matches);
    };
    update();
    desktop.addEventListener('change', update);
    reduced.addEventListener('change', update);
    reel.addEventListener('change', update);
    return () => {
      desktop.removeEventListener('change', update);
      reduced.removeEventListener('change', update);
      reel.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '100% 0px' });
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  const seek = useCallback((value: number) => {
    appliedRef.current = value;
    setProgress(value);
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) {
      const time = Math.min(value * video.duration, video.duration - .05);
      // 前のシークが完了してから次を送る。デコード待ちの積み重なりを防ぐ。
      if (!video.seeking && Math.abs(video.currentTime - time) > .035) video.currentTime = time;
    }
  }, []);

  // 枠が育つ場面をやめるとき（画面が小さくなった・動きを減らす設定にした）は，書いた変形を取り除く
  useLayoutEffect(() => {
    if (!growing) return;
    const frame = frameRef.current;
    const applied = appliedReelRef.current;
    return () => {
      if (frame) {
        frame.style.removeProperty('transform');
        frame.style.removeProperty('--reel-radius');
        frame.style.removeProperty('--reel-inner-radius');
        frame.style.removeProperty('--reel-play');
        frame.removeAttribute('data-settle');
      }
      applied.transform = '';
      applied.radius = '';
      applied.innerRadius = '';
      applied.play = '';
    };
  }, [growing]);

  // スクロールの量を，動画の再生位置（と，枠が育つ進み）へ割り当てる。リスナーは共有のスクロール監視を使う。
  // 測るのは動かさない外側の場面（sceneRef）で，transform を書くのは内側の枠（frameRef）だけ。
  useLayoutEffect(() => {
    // 動画を進めることも，枠を育てることもないとき（手動で再生中の小さな画面など）は，スクロールを見ない
    if (!scrollMode && !growing) return;
    const scene = sceneRef.current;
    if (!scene) return;
    const video = videoRef.current;
    if (scrollMode) video?.pause();
    let frame = 0;
    let current = appliedRef.current;
    const smooth = () => {
      current += (targetRef.current - current) * .2;
      const settled = Math.abs(targetRef.current - current) < .0006;
      if (settled) current = targetRef.current;
      seek(current);
      frame = settled ? 0 : requestAnimationFrame(smooth);
    };

    // 枠の位置・大きさ・角丸・再生の表示を書く（値が変わったときだけ）
    const applyReel = (growProgress: number, playProgress: number) => {
      const element = frameRef.current;
      if (!element) return;
      const state = getReelState({ grow: growProgress, play: playProgress, frame: frameSizeRef.current });
      const next: AppliedReelStyle = {
        transform: toReelTransform(state),
        radius: `${state.borderRadius.toFixed(2)}px`,
        innerRadius: `${state.innerRadius.toFixed(2)}px`,
        play: state.playOpacity.toFixed(3),
      };
      const applied = appliedReelRef.current;
      if (next.transform !== applied.transform) element.style.transform = next.transform;
      if (next.radius !== applied.radius) element.style.setProperty('--reel-radius', next.radius);
      if (next.innerRadius !== applied.innerRadius) element.style.setProperty('--reel-inner-radius', next.innerRadius);
      if (next.play !== applied.play) element.style.setProperty('--reel-play', next.play);
      Object.assign(applied, next);
    };

    const update = () => {
      const bounds = scene.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const growDistance = growing ? viewportHeight * REEL_GROW_VIEWPORT_RATIO : 0;
      const playDistance = bounds.height - viewportHeight - growDistance;
      const reel = getReelProgress(SCENE_PIN_TOP - bounds.top, growDistance, playDistance);
      // 手動で再生しているあいだは，枠は大きな状態に保つ
      if (growing) applyReel(manual ? 1 : reel.grow, reel.play);
      if (scrollMode) {
        targetRef.current = reel.play;
        if (!frame) frame = requestAnimationFrame(smooth);
      }
    };

    // 枠の寸法は ResizeObserver で保つ（測る対象は変形の外側の slot）
    let resizeObserver: ResizeObserver | undefined;
    const slot = slotRef.current;
    if (growing && slot) {
      frameSizeRef.current = { width: slot.offsetWidth, height: slot.offsetHeight };
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(entries => {
          const box = entries[0]?.contentRect;
          if (!box) return;
          frameSizeRef.current = { width: box.width, height: box.height };
          update();
        });
        resizeObserver.observe(slot);
      }
    }

    const unsubscribe = subscribeToScroll(update);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      unsubscribe();
    };
  }, [scrollMode, growing, manual, seek]);

  const jumpTo = (time: number) => {
    setShouldLoad(true);
    const value = time / DURATION;
    if (scrollMode && sceneRef.current) {
      const scene = sceneRef.current;
      const viewportHeight = window.innerHeight;
      const growDistance = growing ? viewportHeight * REEL_GROW_VIEWPORT_RATIO : 0;
      const playDistance = scene.offsetHeight - viewportHeight - growDistance;
      const scrollInto = getScrollForPlay(value, growDistance, playDistance);
      window.scrollTo({ top: window.scrollY + scene.getBoundingClientRect().top - SCENE_PIN_TOP + scrollInto, behavior: 'smooth' });
    } else {
      videoRef.current?.pause();
      seek(value);
    }
  };
  const active = Math.max(0, STEPS.findLastIndex(step => step.time <= progress * DURATION + .1));

  // 「動画として再生する」「スクロールで見る」を押したとき，枠の大きさが切り替わる動きを滑らかにする
  const settleFrame = () => {
    const element = frameRef.current;
    if (!element || !growing) return;
    element.dataset.settle = 'true';
    window.setTimeout(() => element.removeAttribute('data-settle'), REEL_SETTLE_MS + 40);
  };

  const frameNode = <div ref={frameRef} className={styles.videoFrame}>
    <video ref={videoRef} muted playsInline controls={!scrollMode} preload={shouldLoad ? 'auto' : 'none'}
      poster="/projects/bustimeapp-walkthrough-poster.webp" width={900} height={1956}
      aria-label="BusTimeAppの経路選択、通知、時刻表、設定の操作動画"
      onLoadedMetadata={() => seek(appliedRef.current)}
      onSeeked={() => { if (scrollMode) seek(appliedRef.current); }}
      onTimeUpdate={() => { if (!scrollMode && videoRef.current?.duration) { const value = videoRef.current.currentTime / videoRef.current.duration; appliedRef.current = value; setProgress(value); } }}>
      {shouldLoad && <source src="/projects/bustimeapp-walkthrough-1222.mp4" type="video/mp4" />}
    </video>
    {growing && scrollMode && <div className={styles.reelPlay} aria-hidden="true">
      <span className={styles.reelPlayIcon}>
        <svg viewBox="0 0 24 24" width="24" height="24" focusable="false"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
      </span>
      <span className={styles.reelPlayLabel}>スクロールで見る</span>
    </div>}
  </div>;

  return <div ref={sceneRef} className={`${styles.demoScene} ${canScrub ? styles.demoScroll : ''} ${growing ? styles.demoGrow : ''}`}>
    <div className={styles.demoSticky}>
      <div className={styles.demoCopy}>
        <p className={styles.eyebrow}>A CLOSER LOOK</p>
        <h2 id="bustime-demo-heading">いつもの操作を。<br /><span>そのまま、目の前で。</span></h2>
        <p>{scrollMode ? 'スクロールで、使い心地をたどろう。気になる場面へも、すぐに。' : '動画で、使い心地をたどろう。気になる場面を選んで見られます。'}</p>
        <ol className={styles.steps} aria-label="操作動画のチャプター">
          {STEPS.map((step, index) => <li key={step.title} className={index === active ? styles.stepActive : undefined}>
            <button type="button" onClick={() => jumpTo(step.time)} aria-current={index === active ? 'step' : undefined}>
              <span>{`0${index + 1}`}</span><div><h3>{step.title}</h3><p>{step.text}</p></div>
            </button>
          </li>)}
        </ol>
      </div>
      <figure className={styles.videoFigure}>
        {FEATURES.growingReel ? <div ref={slotRef} className={styles.videoSlot}>{frameNode}</div> : frameNode}
        <div className={styles.scrubTrack} aria-hidden="true"><div className={styles.scrubBar} style={{ transform: `scaleX(${progress})` }} /></div>
        {canScrub && <button className={styles.demoPlayback} type="button" onClick={() => {
          setShouldLoad(true);
          settleFrame();
          setManual(!manual);
          if (!manual) void videoRef.current?.play().catch(() => undefined);
        }}>{manual ? 'スクロールで見る' : '動画として再生する'}<span aria-hidden="true"> {manual ? '↕' : '▶'}</span></button>}
        <figcaption>実際のアプリの操作映像。日時・便は撮影時のものです。</figcaption>
      </figure>
    </div>
  </div>;
}
