'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './product.module.css';

// 実際の操作の開始時刻に合わせたチャプター（秒）。
const STEPS = [
  { time: 0, title: '経路と条件を選ぶ', text: '出発地と行き先を切り替え、出発・到着の条件を確認。次に乗れる便が、その場で変わります。' },
  { time: 17, title: '出発前に、知らせてもらう', text: '乗る便を選んで、5分前・10分前・15分前の通知へ。Live Activityの設定も、同じ画面から。' },
  { time: 29, title: '一日の便を見渡す', text: '時刻表へ切り替え、先の時間帯までスクロール。乗りたい便から、通知設定を開けます。' },
  { time: 44, title: '見た目を、自分の好みに', text: '時刻に合わせた背景やカードの濃さを調整。毎日使う画面を、読みやすく心地よく。' },
];
const DURATION = 56.4;

export function DemoScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetRef = useRef(0);
  const appliedRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [canScrub, setCanScrub] = useState(false);
  const [manual, setManual] = useState(false);
  const scrollMode = canScrub && !manual;

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 801px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setCanScrub(desktop.matches && !reduced.matches);
    update();
    desktop.addEventListener('change', update);
    reduced.addEventListener('change', update);
    return () => { desktop.removeEventListener('change', update); reduced.removeEventListener('change', update); };
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

  useEffect(() => {
    if (!scrollMode) return;
    const video = videoRef.current;
    video?.pause();
    let frame = 0;
    let current = appliedRef.current;
    const smooth = () => {
      current += (targetRef.current - current) * .2;
      const settled = Math.abs(targetRef.current - current) < .0006;
      if (settled) current = targetRef.current;
      seek(current);
      frame = settled ? 0 : requestAnimationFrame(smooth);
    };
    const update = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      const bounds = scene.getBoundingClientRect();
      const distance = bounds.height - window.innerHeight;
      targetRef.current = distance > 0 ? Math.min(1, Math.max(0, (64 - bounds.top) / distance)) : 0;
      if (!frame) frame = requestAnimationFrame(smooth);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [scrollMode, seek]);

  const jumpTo = (time: number) => {
    setShouldLoad(true);
    const value = time / DURATION;
    if (scrollMode && sceneRef.current) {
      const scene = sceneRef.current;
      window.scrollTo({ top: window.scrollY + scene.getBoundingClientRect().top - 64 + value * (scene.offsetHeight - window.innerHeight), behavior: 'smooth' });
    } else {
      videoRef.current?.pause();
      seek(value);
    }
  };
  const active = Math.max(0, STEPS.findLastIndex(step => step.time <= progress * DURATION + .1));

  return <div ref={sceneRef} className={`${styles.demoScene} ${canScrub ? styles.demoScroll : ''}`}>
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
        <div className={styles.videoFrame}>
          <video ref={videoRef} muted playsInline controls={!scrollMode} preload={shouldLoad ? 'auto' : 'none'}
            poster="/projects/bustimeapp-walkthrough-poster.webp" width={900} height={1956}
            aria-label="BusTimeAppの経路選択、通知、時刻表、設定の操作動画"
            onLoadedMetadata={() => seek(appliedRef.current)}
            onSeeked={() => { if (scrollMode) seek(appliedRef.current); }}
            onTimeUpdate={() => { if (!scrollMode && videoRef.current?.duration) { const value = videoRef.current.currentTime / videoRef.current.duration; appliedRef.current = value; setProgress(value); } }}>
            {shouldLoad && <source src="/projects/bustimeapp-walkthrough-1222.mp4" type="video/mp4" />}
          </video>
        </div>
        <div className={styles.scrubTrack} aria-hidden="true"><div className={styles.scrubBar} style={{ transform: `scaleX(${progress})` }} /></div>
        {canScrub && <button className={styles.demoPlayback} type="button" onClick={() => {
          setShouldLoad(true);
          setManual(!manual);
          if (!manual) void videoRef.current?.play().catch(() => undefined);
        }}>{manual ? 'スクロールで見る' : '動画として再生する'}<span aria-hidden="true"> {manual ? '↕' : '▶'}</span></button>}
        <figcaption>実際のアプリの操作映像。日時・便は撮影時のものです。</figcaption>
      </figure>
    </div>
  </div>;
}
