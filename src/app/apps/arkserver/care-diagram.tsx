'use client';

import { useState } from 'react';
import styles from './product.module.css';

const FLOWS = [
  ['接続を要求', 'PIN を照合', '一致した端末を通す'],
  ['家の Wi-Fi', 'Mac → iPhone', 'LAN 内で配信'],
  ['壊れた記録を検出', '壊れたファイルを退避', '3世代から正常な記録を復元'],
  ['1つ目が使用中', '2つ目の起動を検出', '2つ目は保存せず終了'],
  ['対象を選択', '削除方法を選択', '選んだ方法で処理'],
  ['容量を集計', 'リンク切れ・重複を確認', '確認して整理'],
  ['端末からアクセス', '認可の結果を記録', 'PIN は伏せて表示'],
  ['指定時刻に起動', '配信する', '指定時刻・無操作で停止'],
];

export function CareDiagram({ index }: { index: number }) {
  const [step, setStep] = useState(0);
  const [deletion, setDeletion] = useState('ゴミ箱へ');
  const steps = FLOWS[index];
  return <div className={styles.careDiagram}>
    {index === 2 && <div className={styles.backupCopies} aria-label="3世代のバックアップ"><span>世代 1</span><span>世代 2</span><span>世代 3</span></div>}
    {index === 3 && <div className={styles.backupCopies}><span>アプリ 1 · 使用中</span><span data-stopped={step === 2}>アプリ 2{step === 2 ? ' · 終了' : ''}</span></div>}
    <ol className={styles.careSteps}>{steps.map((label, i) => <li key={label} data-current={i === step} data-done={i < step}><span>{i + 1}</span>{index === 4 && i === 2 ? deletion : label}</li>)}</ol>
    {index === 4 && <div className={styles.deleteChoices} aria-label="図解の削除方法">{['ゴミ箱へ', '完全削除'].map(choice => <button key={choice} type="button" aria-pressed={deletion === choice} onClick={() => { setDeletion(choice); setStep(2); }}>{choice}</button>)}</div>}
    <button type="button" className={styles.diagramNext} onClick={() => setStep(current => (current + 1) % steps.length)}>{step === 2 ? 'もう一度見る' : '次の動きを見る'} <span aria-hidden="true">→</span></button>
  </div>;
}
