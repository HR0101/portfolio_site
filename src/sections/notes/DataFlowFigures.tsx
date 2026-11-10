'use client';

import { useState } from 'react';
import { getNoteHookEvent, NOTE_HOOK_EVENTS } from '../../lib/notes/hookEvents';
import { FigureFrame } from './FigureFrame';
import styles from './figures.module.css';

const FLOW_NODES = ['CLI', 'ブリッジ', 'ソケット', '本体'] as const;
const FLOW_X_START = 72;
const FLOW_X_STEP = 152;

export function PrivacyFigure() {
  const [external, setExternal] = useState(false);
  return (
    <FigureFrame id="privacy" title="処理は，端末の境界を越える？" caption="既定の診断の説明図と，端末外に処理を置く場合の仮定です．実画面・通信の測定・任意のAI診断の詳細な再現ではありません．">
      <div className={styles.controls} role="group" aria-label="診断処理の場所を比べる">
        <button className="press-effect" type="button" aria-pressed={!external} onClick={() => setExternal(false)}>既定：端末内で完結</button>
        <button className="press-effect" type="button" aria-pressed={external} onClick={() => setExternal(true)}>比較：端末外へ出す場合</button>
      </div>
      <div className={styles.svgScroll} tabIndex={0} role="region" aria-label="処理場所の比較図．狭い画面では左右キーでスクロールできます">
        <svg viewBox="0 0 600 250" className={styles.flowSvg} role="img" aria-label={external ? '比較用の仮定：記事が端末外の処理へ出て，結果が端末へ戻る図' : '既定の診断：記事から要約・診断結果まで，処理が端末内に収まる図'}>
          <rect x="16" y="20" width="350" height="210" rx="24" className={styles.device} />
          <text x="40" y="52" className={styles.svgMuted}>端末の中</text>
          <rect x="40" y="90" width="92" height="58" rx="12" className={styles.node} />
          <text x="86" y="124" textAnchor="middle">保存した記事</text>
          <rect x="218" y="90" width="124" height="58" rx="12" className={styles.node} />
          <text x="280" y="124" textAnchor="middle">{external ? '返ってくる結果' : '要約・診断結果'}</text>
          <rect x="428" y="90" width="152" height="58" rx="12" className={external ? styles.activeNode : styles.node} />
          <text x="504" y="124" textAnchor="middle">端末外の処理</text>
          {external ? <>
            <path d="M132 100V72H504V88m-6-8 6 8 6-8 M504 150V180H280V150m-6 8 6-8 6 8" className={styles.arrow} />
            <text x="414" y="64" textAnchor="middle" className={styles.svgMuted}>境界を越える</text>
          </> : <>
            <path d="M138 118H210m-8-6 8 6-8 6" className={styles.arrow} />
            <text x="190" y="186" textAnchor="middle" className={styles.svgMuted}>ルールベースの診断</text>
            <path d="M386 96V142m-8-31 16 16m0-16-16 16" className={styles.blocked} />
          </>}
        </svg>
      </div>
      <p className={styles.status} role="status">{external ? '比較用の仮定：診断対象が端末の外へ出る流れです．' : '既定の診断：保存した記事の診断処理は，端末の外へ出ません．'}</p>
      <p className={styles.fine}>Tsumugi は，自分の API キーを登録して任意の AI 診断へ切り替える選択肢もあります．記事の取得などを含め，アプリ全体の通信がないという意味ではありません．</p>
    </FigureFrame>
  );
}

export function HookFigure() {
  const [eventName, setEventName] = useState('UserPromptSubmit');
  const event = getNoteHookEvent(eventName);
  return (
    <FigureFrame id="hooks" title="受け取った合図だけで，状態を変える" caption="既存の hook-flow.tsx をもとにした，手動で試す説明用の再現です．CLI への接続や文字の送信は行いません．">
      <div className={styles.controls} role="group" aria-label="Subghostのフックイベントを選ぶ">
        {NOTE_HOOK_EVENTS.map(item => <button className="press-effect" key={item.name} type="button" aria-pressed={eventName === item.name} onClick={() => setEventName(item.name)}>{item.name}</button>)}
      </div>
      <div className={styles.svgScroll} tabIndex={0} role="region" aria-label="フックの流れの図．狭い画面では左右キーでスクロールできます">
        <svg viewBox="0 0 600 154" className={styles.flowSvg} role="img" aria-label={`CLI，ブリッジ，ソケット，本体の順に${event.name}を伝え，${event.state}になる片方向の流れ`}>
          {FLOW_NODES.map((name, index) => {
            const x = FLOW_X_START + FLOW_X_STEP * index;
            return <g key={name}>
              <rect x={x - 54} y="48" width="108" height="60" rx="12" className={index === FLOW_NODES.length - 1 ? styles.activeNode : styles.node} />
              <text x={x} y="84" textAnchor="middle">{name}</text>
              {index < FLOW_NODES.length - 1 && <path d={`M${x + 60} 78h28m-8-6 8 6-8 6`} className={styles.arrow} />}
            </g>;
          })}
          <text x="300" y="26" textAnchor="middle" className={styles.svgMuted}>{event.name}</text>
          <text x="300" y="142" textAnchor="middle" className={styles.svgMuted}>CLIへの判断・文字入力の経路は持ちません</text>
        </svg>
      </div>
      <div className={styles.result} role="status" aria-atomic="true">
        <strong>{event.state}</strong>
        <p>{event.description}</p>
      </div>
      <p className={styles.fine}>ブリッジは subghost-bridge，ソケットは Unix domain socket です．返すのは空の応答 {'{}'} だけです．</p>
    </FigureFrame>
  );
}
