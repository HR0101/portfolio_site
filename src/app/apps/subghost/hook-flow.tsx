'use client';

import { useState } from 'react';
import { ArrowRight, Terminal, Share2, Plug, MonitorDot } from 'lucide-react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import styles from './product.module.css';

interface HookEvent {
  name: string;
  state: 'working' | 'done';
  description: string;
}

// 監視のために登録しているイベントと，そこから決まる状態
const EVENTS: HookEvent[] = [
  {
    name: 'SessionStart',
    state: 'done',
    description: 'セッションが立ち上がった直後。まだ何も始まっていないので Done から始めます。',
  },
  {
    name: 'UserPromptSubmit',
    state: 'working',
    description: '指示が送られた合図。ここから Working に入り、終了イベントが来るまで保ちます。',
  },
  {
    name: 'PreToolUse',
    state: 'working',
    description: 'ツールを呼び出す直前。作業が進んでいる証拠として Working を続けます。',
  },
  {
    name: 'PermissionRequest',
    state: 'working',
    description: '承認待ち。Subghost は可否を答えず、空の応答だけを返して CLI 本来の画面に委ねます。',
  },
  {
    name: 'Stop',
    state: 'done',
    description: 'タスクの終了。ここで Done に変わり、通知とサウンドが鳴ります。',
  },
  {
    name: 'SessionEnd',
    state: 'done',
    description: 'セッションの終了。Done にしたうえで、60秒後に一覧から静かに消します。',
  },
];

// 流れを構成する4つの地点
const NODES = [
  { icon: Terminal, title: 'Claude Code / Codex CLI', note: 'フックを実行する' },
  { icon: Share2, title: 'subghost-bridge', note: '/bin/sh · 上限1秒' },
  { icon: Plug, title: 'Unix domain socket', note: '~/.subghost/run' },
  { icon: MonitorDot, title: 'Subghost', note: 'HookServer → 状態更新' },
];

export function HookFlow() {
  const [activeIndex, setActiveIndex] = useState(1);
  // 同じイベントを押し直したときも，チップの流れを頭から再生する
  const [runId, setRunId] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const active = EVENTS[activeIndex];

  return (
    <div className={styles.flow}>
      <div className={styles.eventChips} role="group" aria-label="フックイベントを選ぶ">
        {EVENTS.map((event, index) => (
          <button
            key={event.name}
            type="button"
            aria-pressed={index === activeIndex}
            onClick={() => {
              setActiveIndex(index);
              setRunId((current) => current + 1);
            }}
          >
            {event.name}
          </button>
        ))}
      </div>

      <div className={styles.flowDiagram}>
        <div className={styles.flowTrack} aria-hidden="true">
          <span
            key={prefersReducedMotion ? 'still' : `${active.name}-${runId}`}
            className={styles.flowChip}
            data-still={prefersReducedMotion}
            data-state={active.state}
          >
            {active.name}
          </span>
        </div>

        <ol className={styles.flowNodes}>
          {NODES.map(({ icon: Icon, title, note }, index) => (
            <li key={title}>
              <div className={styles.flowNode}>
                <Icon size={19} aria-hidden="true" />
                <strong>{title}</strong>
                <span>{note}</span>
              </div>
              {index < NODES.length - 1 && (
                <ArrowRight className={styles.flowArrow} size={17} aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>

        <p className={styles.flowReturn}>
          <span aria-hidden="true">←</span> 返すのは空の応答（<code>{'{}'}</code>）だけ。判断も入力も戻しません。
        </p>
      </div>

      <div className={styles.flowResult} aria-live="polite">
        <span className={styles.badge} data-state={active.state}>
          <span className={styles.statusDot} />
          {active.state === 'working' ? 'Working' : 'Done'}
        </span>
        <p>{active.description}</p>
      </div>
    </div>
  );
}
