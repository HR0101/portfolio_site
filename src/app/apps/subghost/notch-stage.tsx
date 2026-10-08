'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { PixelGhost } from './pixel-ghost';
import styles from './product.module.css';

type NotchState = 'idle' | 'working' | 'done';

interface Step {
  state: NotchState;
  // ノッチを広げるかどうか
  open: boolean;
  title: string;
  label: string;
  // この段で受け取ったフックイベント（ログに積む）
  event?: string;
  // 完了通知を出すか
  banner?: boolean;
  // 次の段へ進むまでの時間（ミリ秒）
  hold: number;
}

const STEPS: Step[] = [
  { state: 'idle', open: false, title: '', label: '', hold: 1500 },
  {
    state: 'working',
    open: true,
    title: 'claude · ~/portfolio_site',
    label: 'Working',
    event: 'UserPromptSubmit',
    hold: 2100,
  },
  {
    state: 'working',
    open: true,
    title: 'claude · ~/portfolio_site',
    label: 'Working',
    event: 'PreToolUse',
    hold: 1900,
  },
  {
    state: 'working',
    open: true,
    title: 'claude · ~/portfolio_site',
    label: 'Working',
    event: 'PostToolUse',
    hold: 1900,
  },
  {
    state: 'done',
    open: true,
    title: 'claude · ~/portfolio_site',
    label: 'Done',
    event: 'Stop',
    banner: true,
    hold: 3600,
  },
  { state: 'done', open: false, title: '', label: '', hold: 2000 },
];

// 動きを止めている人に見せる段（完了して通知が出ている状態）
const STILL_INDEX = 4;

// ノッチを開いたときに並ぶセッション（一覧の見え方を示す例）
const SESSIONS = [
  { cli: 'claude', path: '~/portfolio_site', state: 'working' as const, label: 'Working', time: '12:04' },
  { cli: 'codex', path: '~/Create App/subghost', state: 'done' as const, label: 'Done', time: '11:58' },
  { cli: 'claude', path: '~/rinkou/handout', state: 'done' as const, label: 'Done', time: '11:31' },
];

interface NotchStageProps {
  // 'timeline' はフック受信から完了までを再生する．'panel' は一覧を開いた状態で静止する
  variant?: 'timeline' | 'panel';
  caption: string;
}

export function NotchStage({ variant = 'timeline', caption }: NotchStageProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isTimeline = variant === 'timeline';

  // 動きを抑える設定なら，最初から完了した状態で静止させる
  useEffect(() => {
    if (prefersReducedMotion) {
      setPlaying(false);
      setIndex(STILL_INDEX);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isTimeline || !playing) {
      return;
    }
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % STEPS.length),
      STEPS[index].hold,
    );
    return () => window.clearTimeout(timer);
  }, [index, playing, isTimeline]);

  const restart = useCallback(() => {
    setIndex(0);
    setPlaying(true);
  }, []);

  const step = isTimeline ? STEPS[index] : { state: 'working' as NotchState, open: true, title: 'claude · ~/portfolio_site', label: 'Working', hold: 0 };
  // これまでに受け取ったイベントを，ターミナル側のログとして積み上げる
  const receivedEvents = isTimeline
    ? STEPS.slice(0, index + 1).flatMap((item) =>
        item.event ? [{ event: item.event, state: item.state }] : [],
      )
    : [];

  return (
    <figure className={styles.stage}>
      <div className={styles.display}>
        <div className={styles.wallpaper} aria-hidden="true" />

        <div className={styles.menuBar} aria-hidden="true">
          <div>
            <span>Terminal</span>
            <span>File</span>
            <span>Edit</span>
          </div>
          <div>
            <span className={styles.menuGhost}>
              <PixelGhost size={11} idPrefix={`menu-${variant}`} />
            </span>
            <span>12:04</span>
          </div>
        </div>

        <div className={styles.notch} data-open={step.open} data-state={step.state}>
          <span className={styles.notchGhost}>
            <PixelGhost size={step.open ? 22 : 14} idPrefix={`notch-${variant}`} />
          </span>
          <span className={styles.notchBody}>
            <span className={styles.notchTitle}>{step.title || 'Subghost'}</span>
            <span className={styles.notchState} data-state={step.state}>
              <span className={styles.statusDot} />
              {step.label || '待機中'}
            </span>
          </span>
        </div>

        {variant === 'panel' && (
          <div className={styles.sessionPanel} data-visible="true">
            {SESSIONS.map((session) => (
              <div
                key={`${session.cli}-${session.path}`}
                className={styles.sessionRow}
                data-active={session.state === 'working'}
              >
                <span className={styles.sessionCli}>{session.cli}</span>
                <span className={styles.sessionPath}>{session.path}</span>
                <span className={styles.sessionMeta} data-state={session.state}>
                  <span className={styles.statusDot} />
                  {session.label}
                  <span className={styles.sessionTime}>{session.time}</span>
                </span>
              </div>
            ))}
            <div className={styles.panelHint}>
              <span>行からできるのは、そのターミナルへ移動することだけ</span>
              <span>⌥Space</span>
            </div>
          </div>
        )}

        <div className={styles.terminalWindow} aria-hidden="true">
          <div className={styles.terminalBar}>
            <i style={{ background: '#ff5f57' }} />
            <i style={{ background: '#febc2e' }} />
            <i style={{ background: '#28c840' }} />
            <span>portfolio_site — claude</span>
          </div>
          <div className={styles.terminalBody}>
            <div>$ claude</div>
            {isTimeline ? (
              receivedEvents.length === 0 ? (
                <div>&nbsp;</div>
              ) : (
                receivedEvents.slice(-3).map((item, position) => (
                  <div key={`${item.event}-${position}`}>
                    › hook <b>{item.event}</b> → {item.state === 'done' ? <em>Done</em> : 'Working'}
                  </div>
                ))
              )
            ) : (
              <div>
                › hook <b>PreToolUse</b> → Working
              </div>
            )}
          </div>
        </div>

        {isTimeline && (
          <>
            <div className={styles.banner} data-visible={Boolean(step.banner)}>
              <PixelGhost size={20} idPrefix="banner" />
              <span className={styles.bannerText}>
                <strong>Subghost</strong>
                <span>claude のタスクが完了しました</span>
              </span>
            </div>
          </>
        )}
      </div>

      {isTimeline && (
        <div className={styles.stageControls}>
          <button type="button" onClick={() => setPlaying((current) => !current)}>
            {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            {playing ? '一時停止' : '再生'}
          </button>
          <button type="button" onClick={restart}>
            <RotateCcw size={14} aria-hidden="true" />
            最初から
          </button>
        </div>
      )}

      <figcaption className={styles.stageCaption}>{caption}</figcaption>
    </figure>
  );
}
