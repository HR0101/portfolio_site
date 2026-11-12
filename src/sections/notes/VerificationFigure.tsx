'use client';

import { useState } from 'react';
import { getVerificationStates, VERIFICATION_STEPS } from '../../lib/notes/verification';
import { FigureFrame } from './FigureFrame';
import styles from './figures.module.css';

const STEP_LABELS = { passed: '前段を通過', failed: 'ここで失敗', selected: '確認する段階', waiting: '後続・未実行' };

export function VerificationFigure() {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState(false);
  const states = getVerificationStates(selected, failed);
  const step = VERIFICATION_STEPS[selected];
  return (
    <FigureFrame id="verification" title="途中で失敗したら，どこで止まる？" caption="検証順序を試す説明用の図です．通過・失敗の表示は仮定であり，現在の CI の実行結果ではありません．コマンドは実行しません．">
      <ol className={styles.steps} aria-label="npm run checkの検証順序">
        {VERIFICATION_STEPS.map((item, index) => <li key={item.name} data-state={states[index]}>
          <button className="press-effect" type="button" aria-label={`${item.name}の確認内容を見る`} aria-pressed={selected === index} onClick={() => setSelected(index)}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><b>{item.name}</b><small>{STEP_LABELS[states[index]]}</small></button>
        </li>)}
      </ol>
      <div className={styles.controls} role="group" aria-label="検証が失敗する場合を比べる">
        <button className="press-effect" type="button" aria-pressed={!failed} onClick={() => setFailed(false)}>確認内容を見る</button>
        <button className="press-effect" type="button" aria-pressed={failed} onClick={() => setFailed(true)}>ここで失敗した場合</button>
      </div>
      <div className={styles.result} role="status" aria-atomic="true">
        <strong>{step.name}</strong><p>{step.checks}</p><code>{step.command}</code>
        <p>{failed ? `${step.name}で失敗すると，check はここで止まります．公開側も次の工程へ進めません．` : '前の段階が成功してから，この確認に進みます．'}</p>
      </div>
      <p className={styles.fine}>公開設定では，check に続いて静的書き出しと出力ファイルの検証も行います．出典：DEPLOY.md・package.json・.github/workflows/ci.yml．</p>
    </FigureFrame>
  );
}
