"use client";

import { useEffect, useRef, useState } from 'react';
import { getRecordingPolicy, getRemainingRecordingHold, recordingHoldMs, type RecordingIntent } from '../lib/recordingPlayback';
import styles from './Projects.module.css';

const recordingSrc = '/projects/bustimeapp-demo-clean.mp4';
const recordingWidth = 1080;
const recordingHeight = 1920;
const visibilityThreshold = 0.15;

type Environment = { pinned: boolean; open: boolean; inView: boolean; hidden: boolean; reduced: boolean };
const initialEnvironment: Environment = { pinned: false, open: false, inView: false, hidden: true, reduced: true };

// 実際の操作録画．スクロールからは開閉だけを受け取り，再生位置は動画自身の時間で進む．
export function BusRecording({ poster, suspended = false }: { poster: string; suspended?: boolean }) {
  const surface = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdRemaining = useRef(recordingHoldMs);
  const [environment, setEnvironment] = useState(initialEnvironment);
  const [intent, setIntent] = useState<RecordingIntent>('auto');
  const [loaded, setLoaded] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [holding, setHolding] = useState(false);
  const [failed, setFailed] = useState(false);
  const policy = getRecordingPolicy({ ...environment, intent, suspended });
  const shouldPlay = policy.shouldPlay && !failed;

  useEffect(() => {
    const node = surface.current;
    const tile = node?.closest('[data-app-tile]');
    const track = node?.closest('[data-app-track]');
    if (!node || !tile || !track) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    let wasPinned = track.hasAttribute('data-pin');
    const update = () => {
      const next = {
        pinned: track.hasAttribute('data-pin'),
        open: tile.getAttribute('data-open') === 'true',
        inView,
        hidden: document.hidden,
        reduced: media.matches,
      };
      // 開閉・可視性の変化が来た時点で即停止し，デコードを続けない．
      const nextPolicy = getRecordingPolicy({ ...next, intent: 'auto' });
      if (!next.inView || next.hidden || nextPolicy.shouldReset) videoRef.current?.pause();
      if (wasPinned && !next.pinned) {
        videoRef.current?.pause();
        if (videoRef.current && videoRef.current.readyState > 0) videoRef.current.currentTime = 0;
        setHasFrame(false);
        setHolding(false);
        setIntent('pause');
      }
      wasPinned = next.pinned;
      setEnvironment(previous => Object.keys(next).every(key => previous[key as keyof Environment] === next[key as keyof Environment]) ? previous : next);
    };
    const visibility = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= visibilityThreshold);
      update();
    }, { threshold: [0, visibilityThreshold] });
    visibility.observe(node);
    const mutation = new MutationObserver(update);
    mutation.observe(tile, { attributes: true, attributeFilter: ['data-open'] });
    mutation.observe(track, { attributes: true, attributeFilter: ['data-pin'] });
    const onMotionChange = () => {
      if (media.matches) {
        videoRef.current?.pause();
        setIntent('pause');
        setHasFrame(false);
        setHolding(false);
        holdRemaining.current = recordingHoldMs;
        if (videoRef.current && videoRef.current.readyState > 0) videoRef.current.currentTime = 0;
      }
      update();
    };
    onMotionChange();
    document.addEventListener('visibilitychange', update);
    media.addEventListener('change', onMotionChange);
    return () => {
      visibility.disconnect();
      mutation.disconnect();
      document.removeEventListener('visibilitychange', update);
      media.removeEventListener('change', onMotionChange);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (policy.shouldReset) {
      video.pause();
      // 未読込の録画にはシークしない．閉じたパネルは必ずポスターへ戻す．
      if (video.readyState > 0) video.currentTime = 0;
      holdRemaining.current = recordingHoldMs;
      setHolding(false);
      setHasFrame(false);
      return;
    }
    if (!shouldPlay) { video.pause(); return; }
    if (!loaded) { setLoaded(true); return; }
    if (holding) {
      const started = performance.now();
      let completed = false;
      const timer = window.setTimeout(() => {
        completed = true;
        holdRemaining.current = recordingHoldMs;
        video.currentTime = 0;
        setHolding(false);
      }, holdRemaining.current);
      return () => {
        clearTimeout(timer);
        if (!completed) holdRemaining.current = getRemainingRecordingHold(holdRemaining.current, performance.now() - started);
      };
    }
    let cancelled = false;
    void video.play().catch(() => {
      if (cancelled) return;
      video.pause();
      setIntent('pause');
      setFailed(true);
    });
    return () => { cancelled = true; video.pause(); };
  }, [shouldPlay, policy.shouldReset, loaded, holding]);

  const toggle = () => {
    if (shouldPlay) {
      videoRef.current?.pause();
      setIntent('pause');
      return;
    }
    if (failed) {
      setFailed(false);
      videoRef.current?.load();
    }
    setIntent('play');
  };

  return (
    <>
      <span ref={surface} className={styles.recordingLayer} data-has-frame={hasFrame}>
        <video
          ref={videoRef}
          className={styles.recording}
          data-testid="bustime-recording"
          src={loaded ? recordingSrc : undefined}
          poster={poster}
          width={recordingWidth}
          height={recordingHeight}
          muted
          playsInline
          preload="none"
          aria-label="BusTimeApp の実際の操作録画．日時・便は撮影時のものです"
          onPlaying={() => setHasFrame(true)}
          onEnded={() => { holdRemaining.current = recordingHoldMs; setHolding(true); }}
          onError={() => { videoRef.current?.pause(); setFailed(true); setIntent('pause'); setHasFrame(false); }}
        />
      </span>
      <span className={styles.recordingControls}>
        <span>実際の操作録画</span>
        <button type="button" className="press-effect" aria-label="BusTimeApp の操作録画の再生" aria-pressed={shouldPlay} disabled={suspended} onClick={toggle}>
          {shouldPlay ? '一時停止' : failed ? '再試行' : '再生'}
        </button>
        {failed && <span role="status">再生できませんでした．</span>}
      </span>
    </>
  );
}
