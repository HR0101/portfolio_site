"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './product.module.css';

// 説明の3ステップ．スクロールの進み具合に合わせて，見出しが順に主役になる
const STEPS = [
  {
    title: '経路を確認する',
    text: '提案された出発地と行き先を確認。逆方向への切り替えも、同じ画面から。',
  },
  {
    title: '便の時刻を読む',
    text: '出発・到着時刻を大きく表示。日付や検索時刻の条件も確認できます。',
  },
  {
    title: '必要なら、時刻表へ',
    text: 'ほかの便も見たいときはタブを切り替え。一覧から予定を考えられます。',
  },
];

// 実際の映像への追従の滑らかさ（0〜1．大きいほど即座に追いつく）
const SCRUB_EASING = 0.18;
// 映像の読み込みを始める距離（画面の何個ぶん手前から始めるか）
const PRELOAD_VIEWPORT_MARGIN = 1.5;

export function DemoScene() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // スクロールから求めた目標の再生位置（0〜1）
  const targetProgressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  // 求めた進み具合を，画面と映像に反映する
  const appliedProgressRef = useRef(0);
  const applyProgress = useCallback((value: number) => {
    appliedProgressRef.current = value;
    setProgress(value);
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      // 端に張り付かないよう，ごくわずかに内側で止める
      video.currentTime = Math.min(value * video.duration, video.duration - 0.05);
    }
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    let animationFrameId = 0;
    let current = 0;

    // 目標へ少しずつ近づける（急なスクロールでも映像がガタつかないようにする）
    const smooth = () => {
      const target = targetProgressRef.current;
      current += (target - current) * SCRUB_EASING;
      if (Math.abs(target - current) < 0.0008) {
        current = target;
        animationFrameId = 0;
        applyProgress(current);
        return;
      }
      applyProgress(current);
      animationFrameId = window.requestAnimationFrame(smooth);
    };

    const handleScroll = () => {
      const scene = sceneRef.current;
      if (!scene) {
        return;
      }
      const bounds = scene.getBoundingClientRect();

      // 画面に近づいたら映像の読み込みを始める（初期表示では読まない）
      if (bounds.top < window.innerHeight * PRELOAD_VIEWPORT_MARGIN) {
        setShouldLoadVideo(true);
      }

      // 貼り付いている間（要素の高さ − 画面1つぶん）を 0→1 に対応させる
      const scrollableHeight = bounds.height - window.innerHeight;
      const raw = scrollableHeight <= 0 ? 0 : -bounds.top / scrollableHeight;
      targetProgressRef.current = Math.min(Math.max(raw, 0), 1);

      // まず即座に反映し，そのうえで滑らかに追従させる．
      // これで requestAnimationFrame が動かない状況でも位置がずれない．
      current = targetProgressRef.current;
      applyProgress(current);
      if (animationFrameId === 0) {
        animationFrameId = window.requestAnimationFrame(smooth);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [applyProgress, prefersReducedMotion]);

  // 読み込みが終わった時点で，すでにスクロールしている分を映像へ反映する．
  // あわせて iOS 向けに一度だけ再生→停止し，シークできる状態にしておく．
  const handleMetadataLoaded = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video
      .play()
      .then(() => video.pause())
      .catch(() => undefined);
    applyProgress(appliedProgressRef.current);
  }, [applyProgress]);

  // いま説明しているステップ（動きを減らす設定では常に全部を同じ濃さで見せる）
  const activeStepIndex = prefersReducedMotion
    ? -1
    : Math.min(Math.floor(progress * STEPS.length), STEPS.length - 1);

  return (
    <div ref={sceneRef} className={styles.demoScene}>
      <div className={styles.demoSticky}>
        <div className={styles.demoCopy}>
          <p className={styles.eyebrow}>A CLOSER LOOK</p>
          <h2 id="bustime-demo-heading">
            開く。確かめる。
            <br />
            <span>さあ、出かけよう。</span>
          </h2>
          <p>スクロールすると、画面がそのぶんだけ進みます。</p>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className={index === activeStepIndex ? styles.stepActive : undefined}
              >
                <span>{`0${index + 1}`}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <figure className={styles.videoFigure}>
          <div className={styles.videoFrame}>
            {prefersReducedMotion ? (
              // 動きを減らす設定では，静止画だけを見せる
              <img
                src="/projects/bustimeapp-screens/home.png"
                alt="BusTimeAppのホーム画面"
                width={1080}
                height={1920}
              />
            ) : (
              <video
                ref={videoRef}
                muted
                playsInline
                preload="auto"
                poster="/projects/bustimeapp-screens/home.png"
                width={720}
                height={1280}
                aria-label="スクロールに合わせて進む、BusTimeAppのホームと時刻表の映像"
                onLoadedMetadata={handleMetadataLoaded}
              >
                {shouldLoadVideo && (
                  <source src="/projects/bustimeapp-demo-scroll.mp4" type="video/mp4" />
                )}
              </video>
            )}
          </div>
          {/* どこまで進んだかを示す細い線 */}
          <div className={styles.scrubTrack} aria-hidden="true">
            <div className={styles.scrubBar} style={{ transform: `scaleX(${progress})` }} />
          </div>
          <figcaption>掲載画面の日時・便は撮影時のものです。</figcaption>
        </figure>
      </div>
    </div>
  );
}
